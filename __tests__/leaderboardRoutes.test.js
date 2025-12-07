import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tmpRoot = path.join(__dirname, '..', 'tmp-data');

let store;
let server;
let activeServer;

async function startServer() {
    if (activeServer) return activeServer;
    await new Promise((resolve) => setImmediate(resolve));
    activeServer = await new Promise((resolve, reject) => {
        server.listen(0, () => resolve(server));
        server.once('error', reject);
    });
    return activeServer;
}

async function apiRequest(pathname, options = {}) {
    const runningServer = await startServer();
    const { port } = runningServer.address();
    const url = `http://localhost:${port}${pathname}`;
    return fetch(url, options);
}

before(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
    process.env.DATA_DIR = tmpRoot;
    process.env.NODE_ENV = 'test';

    const serverModule = await import('../server.js');
    const storeModule = await import('../data/store.js');
    await storeModule.storeReady;

    server = serverModule.server;
    store = storeModule;
});

beforeEach(async () => {
    if (store?.resetStoreForTest) {
        await store.resetStoreForTest();
    }
});

afterEach(async () => {
    if (activeServer) {
        await new Promise((resolve) => activeServer.close(resolve));
        activeServer = null;
    }
});

after(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
});

test('rejects invalid leaderboard payloads', async () => {
    const response = await apiRequest('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json',
    });

    assert.strictEqual(response.status, 400);
    const payload = await response.text();
    assert.match(payload, /SyntaxError/i);

    const leaderboard = await store.getTopLeaderboard();
    assert.deepStrictEqual(leaderboard, []);
});

test('sanitizes entries and returns sorted leaderboard top results', async () => {
    await apiRequest('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            publicKey: '   first-player   ',
            level: 5.9,
            bestScore: 1200.7,
            stats: { accuracy: 0.9 },
        }),
    });

    await apiRequest('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            publicKey: '',
            level: -2,
            bestScore: -10,
            stats: { ignored: true },
        }),
    });

    await apiRequest('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            publicKey: 'second-player',
            level: 5,
            bestScore: 1500,
        }),
    });

    const response = await apiRequest('/api/leaderboard/top');
    assert.strictEqual(response.status, 200);
    const leaderboard = await response.json();

    assert.deepStrictEqual(leaderboard, [
        {
            publicKey: 'first-player',
            level: 5,
            bestScore: 1200,
            stats: { accuracy: 0.9 },
        },
        {
            publicKey: 'second-player',
            level: 5,
            bestScore: 1500,
            stats: {},
        },
        {
            publicKey: 'Unknown Player',
            level: 0,
            bestScore: 0,
            stats: { ignored: true },
        },
    ].sort((a, b) => b.level - a.level || b.bestScore - a.bestScore));

    assert.ok(leaderboard[0].bestScore >= leaderboard[1].bestScore);
});

test('emits leaderboard updates over websocket when entries are posted', async () => {
    const runningServer = await startServer();
    const { port } = runningServer.address();

    const ws = new WebSocket(`ws://localhost:${port}/api/realtime`);

    const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('No leaderboard_update received')), 2000);
        ws.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'leaderboard_update') {
                clearTimeout(timeout);
                resolve(data);
            }
        });
        ws.on('error', reject);
    });

    await new Promise((resolve) => ws.once('open', resolve));

    const response = await fetch(`http://localhost:${port}/api/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: 'socket-player', level: 2, bestScore: 300 }),
    });
    assert.strictEqual(response.status, 200);

    const message = await messagePromise;
    assert.strictEqual(message.type, 'leaderboard_update');
    const entry = message.entries.find((item) => item.publicKey === 'socket-player');
    assert.ok(entry);
    assert.strictEqual(entry.level, 2);
    assert.strictEqual(entry.bestScore, 300);

    ws.terminate();
});
