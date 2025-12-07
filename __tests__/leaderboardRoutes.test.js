import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tmpRoot = path.join(__dirname, '..', 'tmp-data');

let app;
let store;
let activeServer;
let serverModule;
let realWss;

async function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

async function apiRequest(pathname, options = {}) {
  const server = await startServer();
  activeServer = server;
  const { port } = server.address();
  const url = `http://localhost:${port}${pathname}`;
  try {
    return await fetch(url, options);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    activeServer = null;
  }
}

before(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
  process.env.DATA_DIR = tmpRoot;
  process.env.NODE_ENV = 'test';
  process.env.LEADERBOARD_API_KEY = 'test-key';

  serverModule = await import('../server.js');
  const storeModule = await import('../data/store.js');
  await storeModule.storeReady;

  app = serverModule.app;
  store = storeModule;
  realWss = serverModule.server?.wss;
});

beforeEach(async () => {
  if (store?.resetStoreForTest) {
    await store.resetStoreForTest();
  }
  if (serverModule?.resetAbuseControls) {
    serverModule.resetAbuseControls();
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
  if (realWss?.close) {
    await new Promise((resolve) => realWss.close(resolve));
  }
});

test('clamps and sanitizes leaderboard entries', async () => {
  const response = await apiRequest('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-key' },
    body: JSON.stringify({
      publicKey: '   Player123   ',
      level: 9999,
      bestScore: 9_999_999_999,
      stats: {
        kills: 20_000_000,
        wavesSurvived: 5,
      },
    }),
  });

  assert.strictEqual(response.status, 200);
  const payload = await response.json();
  assert.deepStrictEqual(payload, { ok: true });

  const [entry] = await store.getTopLeaderboard(1);
  assert.deepStrictEqual(entry, {
    publicKey: 'Player123',
    level: 500,
    bestScore: 1_000_000_000,
    stats: {
      kills: 10_000_000,
      wavesSurvived: 5,
    },
  });
});

test('rejects invalid stats and broadcasts errors', async () => {
  const messages = [];
  const fakeClient = { readyState: 1, send: (msg) => messages.push(msg) };
  serverModule.server.wss = { clients: new Set([fakeClient]) };

  const response = await apiRequest('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-key' },
    body: JSON.stringify({
      publicKey: 'Player123',
      level: 1,
      bestScore: 10,
      stats: { deaths: -5, accuracy: Number.NaN },
    }),
  });

  assert.strictEqual(response.status, 400);
  const payload = await response.json();
  assert.strictEqual(payload.error, 'invalid_entry');
  assert.ok(Array.isArray(payload.details));
  assert.ok(messages.some((msg) => msg.includes('leaderboard_error')));
});

test('enforces API key and rate limits abuse', async () => {
  const unauthorized = await apiRequest('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: 'Anon', level: 1, bestScore: 1, stats: {} }),
  });

  assert.strictEqual(unauthorized.status, 401);

  let lastStatus = 0;
  for (let i = 0; i < 12; i += 1) {
    const res = await apiRequest('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-key' },
      body: JSON.stringify({ publicKey: `Player-${i}`, level: 1, bestScore: 1, stats: {} }),
    });
    lastStatus = res.status;
    if (res.status === 429) break;
  }

  assert.strictEqual(lastStatus, 429);
});
