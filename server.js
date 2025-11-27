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
    await saveProfile(owner, req.body || {});
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
server.listen(port, () => {
    console.log(`Astrocats MMO backend listening on http://localhost:${port}`);
});
