import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import {
    getProfile,
    getSortedLeaderboardSnapshot,
    getTopLeaderboard,
    saveProfile,
    storeReady,
    upsertLeaderboardEntry,
} from './data/store.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PROFILE_SCHEMA = {
    name: {
        type: 'string',
        maxLength: 12,
        pattern: /^[A-Za-z0-9 _-]*$/,
        required: false,
        trim: true,
    },
    title: {
        type: 'string',
        maxLength: 12,
        required: false,
        trim: true,
    },
    avatar: {
        type: 'string',
        maxLength: 1024,
        required: false,
        trim: true,
        validator: (value) => {
            if (!value) return true;
            if (value.startsWith('data:')) return value.length <= 4096;
            try {
                const url = new URL(value);
                return ['http:', 'https:'].includes(url.protocol);
            } catch (error) {
                return false;
            }
        }
    },
    bio: {
        type: 'string',
        maxLength: 280,
        required: false,
        trim: true,
    },
};

const PROFILE_METADATA_SCHEMA = {
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    lastNameChangeAt: { type: 'number' },
    summary: { type: 'string', maxLength: 512, trim: true },
    history: { type: 'array' },
};

function sanitizeString(value, maxLength, shouldTrim = false) {
    if (typeof value !== 'string') return null;
    const working = shouldTrim ? value.trim() : value;
    if (maxLength && working.length > maxLength) {
        return working.slice(0, maxLength);
    }
    return working;
}

function sanitizeNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function sanitizeHistory(historyEntries) {
    if (!Array.isArray(historyEntries)) return [];
    return historyEntries.slice(0, 10).map((entry) => {
        const sanitized = {};
        if (typeof entry !== 'object' || entry === null) return sanitized;

        const name = sanitizeString(entry.name, PROFILE_SCHEMA.name.maxLength, true);
        if (name !== null && PROFILE_SCHEMA.name.pattern.test(name)) sanitized.name = name;

        const title = sanitizeString(entry.title, PROFILE_SCHEMA.title.maxLength, true);
        if (title !== null) sanitized.title = title;

        const avatar = sanitizeString(entry.avatar, PROFILE_SCHEMA.avatar.maxLength, true);
        if (avatar !== null && PROFILE_SCHEMA.avatar.validator(avatar)) sanitized.avatar = avatar;

        const bio = sanitizeString(entry.bio, PROFILE_SCHEMA.bio.maxLength, true);
        if (bio !== null) sanitized.bio = bio;

        const updatedAt = sanitizeNumber(entry.updatedAt);
        if (updatedAt) sanitized.updatedAt = updatedAt;

        return sanitized;
    });
}

export function validateProfileInput(body) {
    const errors = [];
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { ok: false, errors: ['Profile payload must be an object.'] };
    }

    const sanitized = {};

    for (const [field, rules] of Object.entries(PROFILE_SCHEMA)) {
        if (typeof body[field] === 'undefined') continue;
        const value = body[field];
        if (typeof value !== rules.type) {
            errors.push(`${field} must be a ${rules.type}.`);
            continue;
        }

        const sanitizedValue = sanitizeString(value, rules.maxLength, rules.trim);
        if (rules.pattern && sanitizedValue && !rules.pattern.test(sanitizedValue)) {
            errors.push(`${field} contains invalid characters.`);
            continue;
        }
        if (rules.validator && sanitizedValue !== null && !rules.validator(sanitizedValue)) {
            errors.push(`${field} is invalid.`);
            continue;
        }
        sanitized[field] = sanitizedValue ?? '';
    }

    const metadata = body.metadata;
    if (typeof metadata !== 'undefined') {
        if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
            errors.push('metadata must be an object.');
        } else {
            const sanitizedMetadata = {};
            for (const [field, rules] of Object.entries(PROFILE_METADATA_SCHEMA)) {
                if (typeof metadata[field] === 'undefined') continue;
                const value = metadata[field];
                if (rules.type === 'string') {
                    const str = sanitizeString(value, rules.maxLength, rules.trim);
                    if (str !== null) sanitizedMetadata[field] = str;
                } else if (rules.type === 'number') {
                    sanitizedMetadata[field] = sanitizeNumber(value);
                } else if (rules.type === 'array' && Array.isArray(value)) {
                    sanitizedMetadata[field] = sanitizeHistory(value);
                }
            }
            if (Object.keys(sanitizedMetadata).length) {
                sanitized.metadata = sanitizedMetadata;
            }
        }
    }

    if (errors.length) {
        return { ok: false, errors };
    }
    return { ok: true, profile: sanitized };
}

function sanitizeEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const publicKey = typeof entry.publicKey === 'string' && entry.publicKey.trim()
        ? entry.publicKey.trim()
        : 'Unknown Player';

    const level = Number.isFinite(entry.level) ? Math.max(0, Math.floor(entry.level)) : 0;
    const bestScore = Number.isFinite(entry.bestScore) ? Math.max(0, Math.floor(entry.bestScore)) : 0;
    const stats = entry.stats && typeof entry.stats === 'object' ? { ...entry.stats } : {};
    return { publicKey, level, bestScore, stats };
}

function broadcastLeaderboard(wss, snapshot) {
    if (!wss || wss.clients.size === 0) return;
    const payload = JSON.stringify({ type: 'leaderboard_update', entries: snapshot || [] });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(payload);
        }
    });
}

app.get('/api/leaderboard/top', async (req, res) => {
    await storeReady;
    const sorted = await getTopLeaderboard(50);
    res.json(sorted);
});

app.post('/api/leaderboard', async (req, res) => {
    const sanitized = sanitizeEntry(req.body);
    if (!sanitized) {
        res.status(400).json({ error: 'invalid_entry' });
        return;
    }

    await upsertLeaderboardEntry(sanitized);
    const snapshot = getSortedLeaderboardSnapshot();
    broadcastLeaderboard(server.wss, snapshot);
    res.json({ ok: true });
});

app.put('/api/profile/:owner', async (req, res) => {
    const owner = req.params.owner;
    if (!owner) {
        res.status(400).json({ error: 'missing_owner' });
        return;
    }

    const validation = validateProfileInput(req.body);
    if (!validation.ok) {
        res.status(400).json({ error: 'invalid_profile', details: validation.errors });
        return;
    }

    await saveProfile(owner, validation.profile);
    res.json({ ok: true });
});

app.get('/api/profile/:owner', async (req, res) => {
    const owner = req.params.owner;
    if (!owner) {
        res.status(404).json({ error: 'not_found' });
        return;
    }

    const profile = await getProfile(owner);
    if (!profile) {
        res.status(404).json({ error: 'not_found' });
        return;
    }
    res.json(profile);
});

await storeReady;

const server = http.createServer(app);
server.wss = new WebSocketServer({ server, path: '/api/realtime' });
server.wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }));
    const snapshot = getSortedLeaderboardSnapshot();
    if (snapshot.length && socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'leaderboard_update', entries: snapshot }));
    }
});

const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    server.listen(port, () => {
        console.log(`Astrocats MMO backend listening on http://localhost:${port}`);
    });
}

export { app, server };
