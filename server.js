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

const LEADERBOARD_LIMITS = {
    maxLevel: 500,
    maxBestScore: 1_000_000_000,
    maxStatValue: 10_000_000,
    maxStatEntries: 50,
    publicKeyMaxLength: 256,
};

const rateLimitState = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const OWNER_RULES = {
    maxLength: 64,
    pattern: /^[A-Za-z0-9_-]+$/,
};

function enforceRateLimit(identifier) {
    if (!identifier) return { allowed: true };

    const now = Date.now();
    const current = rateLimitState.get(identifier) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

    if (now > current.resetAt) {
        rateLimitState.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true };
    }

    if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, resetAt: current.resetAt };
    }

    current.count += 1;
    rateLimitState.set(identifier, current);
    return { allowed: true };
}

function clampNumber(value, { max = Number.MAX_SAFE_INTEGER, min = 0, rejectBelowMin = false } = {}) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    if (rejectBelowMin && parsed < min) return null;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function validateOwner(rawOwner) {
    if (typeof rawOwner !== 'string') {
        return { ok: false, error: 'owner_required' };
    }
    const owner = rawOwner.trim();
    if (!owner) {
        return { ok: false, error: 'owner_required' };
    }
    if (owner.length > OWNER_RULES.maxLength) {
        return { ok: false, error: 'owner_too_long' };
    }
    if (!OWNER_RULES.pattern.test(owner)) {
        return { ok: false, error: 'owner_invalid_chars' };
    }
    return { ok: true, owner };
}

function validateLeaderboardEntry(entry) {
    const errors = [];

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return { ok: false, errors: ['Entry payload must be an object.'] };
    }

    const sanitized = {};
    const publicKey = typeof entry.publicKey === 'string' ? entry.publicKey.trim() : '';
    sanitized.publicKey = publicKey
        ? publicKey.slice(0, LEADERBOARD_LIMITS.publicKeyMaxLength)
        : 'Unknown Player';

    const level = clampNumber(entry.level, { min: 0, max: LEADERBOARD_LIMITS.maxLevel });
    if (level === null) {
        errors.push('level must be a finite number.');
    } else {
        sanitized.level = level;
    }

    const bestScore = clampNumber(entry.bestScore, { min: 0, max: LEADERBOARD_LIMITS.maxBestScore });
    if (bestScore === null) {
        errors.push('bestScore must be a finite number.');
    } else {
        sanitized.bestScore = bestScore;
    }

    if (typeof entry.stats === 'undefined') {
        sanitized.stats = {};
    } else if (entry.stats && typeof entry.stats === 'object' && !Array.isArray(entry.stats)) {
        const statEntries = Object.entries(entry.stats).slice(0, LEADERBOARD_LIMITS.maxStatEntries);
        sanitized.stats = {};

        for (const [key, value] of statEntries) {
            const statValue = clampNumber(value, {
                min: 0,
                max: LEADERBOARD_LIMITS.maxStatValue,
                rejectBelowMin: true,
            });
            if (statValue === null) {
                errors.push(`stats.${key} must be a non-negative finite number.`);
                continue;
            }
            sanitized.stats[key] = statValue;
        }
    } else {
        errors.push('stats must be an object of numeric values.');
    }

    if (errors.length) {
        return { ok: false, errors };
    }

    return { ok: true, entry: sanitized };
}

function broadcastPayload(wss, payload) {
    if (!wss || wss.clients.size === 0) return;
    const message = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

function broadcastLeaderboard(wss, snapshot) {
    broadcastPayload(wss, { type: 'leaderboard_update', entries: snapshot || [] });
}

function broadcastValidationError(wss, details) {
    broadcastPayload(wss, { type: 'leaderboard_error', ...details });
}

export function resetAbuseControls() {
    rateLimitState.clear();
}

app.get('/api/leaderboard/top', async (req, res) => {
    await storeReady;
    const sorted = await getTopLeaderboard(50);
    res.json(sorted);
});

app.post('/api/leaderboard', async (req, res) => {
    const apiKey = process.env.LEADERBOARD_API_KEY;
    if (apiKey && req.header('x-api-key') !== apiKey) {
        broadcastValidationError(server.wss, { error: 'unauthorized' });
        res.status(401).json({ error: 'unauthorized' });
        return;
    }

    const rateResult = enforceRateLimit(req.ip);
    if (!rateResult.allowed) {
        broadcastValidationError(server.wss, { error: 'rate_limited', resetAt: rateResult.resetAt });
        res.status(429).json({ error: 'rate_limited', resetAt: rateResult.resetAt });
        return;
    }

    const validation = validateLeaderboardEntry(req.body);
    if (!validation.ok) {
        broadcastValidationError(server.wss, { error: 'invalid_entry', details: validation.errors });
        res.status(400).json({ error: 'invalid_entry', details: validation.errors });
        return;
    }

    await upsertLeaderboardEntry(validation.entry);
    const snapshot = getSortedLeaderboardSnapshot();
    broadcastLeaderboard(server.wss, snapshot);
    res.json({ ok: true });
});

app.put('/api/profile/:owner', async (req, res) => {
    const ownerValidation = validateOwner(req.params.owner);
    if (!ownerValidation.ok) {
        res.status(400).json({ error: 'invalid_owner' });
        return;
    }
    const owner = ownerValidation.owner;

    const validation = validateProfileInput(req.body);
    if (!validation.ok) {
        res.status(400).json({ error: 'invalid_profile', details: validation.errors });
        return;
    }

    await saveProfile(owner, validation.profile);
    res.json({ ok: true });
});

app.get('/api/profile/:owner', async (req, res) => {
    const ownerValidation = validateOwner(req.params.owner);
    if (!ownerValidation.ok) {
        res.status(400).json({ error: 'invalid_owner' });
        return;
    }
    const owner = ownerValidation.owner;

    const profile = await getProfile(owner);
    if (!profile) {
        res.status(404).json({ error: 'not_found' });
        return;
    }
    res.json(profile);
});

await storeReady;

const server = http.createServer(app);
if (process.env.NODE_ENV !== 'test') {
    server.wss = new WebSocketServer({ server, path: '/api/realtime' });
    server.wss.on('connection', (socket) => {
        socket.send(JSON.stringify({ type: 'connected' }));
        const snapshot = getSortedLeaderboardSnapshot();
        if (snapshot.length && socket.readyState === 1) {
            socket.send(JSON.stringify({ type: 'leaderboard_update', entries: snapshot }));
        }
    });
} else {
    server.wss = { clients: new Set() };
}

const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    server.listen(port, () => {
        console.log(`Astrocats MMO backend listening on http://localhost:${port}`);
    });
}

export { app, server };
