import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const leaderboardEntries = new Map();
const profiles = new Map();

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

function broadcastLeaderboard(wss) {
    if (!wss || wss.clients.size === 0) return;
    const payload = JSON.stringify({ type: 'leaderboard_update' });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(payload);
        }
    });
}

app.get('/api/leaderboard/top', (req, res) => {
    const sorted = Array.from(leaderboardEntries.values())
        .sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            return b.bestScore - a.bestScore;
        })
        .slice(0, 50);
    res.json(sorted);
});

app.post('/api/leaderboard', (req, res) => {
    const sanitized = sanitizeEntry(req.body);
    if (!sanitized) {
        res.status(400).json({ error: 'invalid_entry' });
        return;
    }

    leaderboardEntries.set(sanitized.publicKey, sanitized);
    broadcastLeaderboard(server.wss);
    res.json({ ok: true });
});

app.put('/api/profile/:owner', (req, res) => {
    const owner = req.params.owner;
    if (!owner) {
        res.status(400).json({ error: 'missing_owner' });
        return;
    }
    profiles.set(owner, req.body || {});
    res.json({ ok: true });
});

app.get('/api/profile/:owner', (req, res) => {
    const owner = req.params.owner;
    if (!owner || !profiles.has(owner)) {
        res.status(404).json({ error: 'not_found' });
        return;
    }
    res.json(profiles.get(owner));
});

const server = http.createServer(app);
server.wss = new WebSocketServer({ server, path: '/api/realtime' });
server.wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Astrocats MMO backend listening on http://localhost:${port}`);
});
