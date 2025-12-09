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
const apiKey = 'profile-key';

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
  process.env.LEADERBOARD_API_KEY = apiKey;
  process.env.PROFILE_API_KEY = apiKey;

  const serverModule = await import('../server.js');
  const storeModule = await import('../data/store.js');
  await storeModule.storeReady;

  app = serverModule.app;
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

test('accepts and sanitizes valid profile payloads', async () => {
  const response = await apiRequest('/api/profile/test-owner', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      name: '  Nova  ',
      title: 'Star Commander',
      avatar: 'https://example.com/avatar.png',
      bio: ' A pilot bio that should be trimmed. ',
      metadata: {
        createdAt: 123,
        updatedAt: 456,
        summary: 'Short summary that should be trimmed to the allowed length.',
        history: [
          {
            name: 'Old Name',
            title: 'Pilot',
            avatar: 'https://example.com/old.png',
            bio: 'Previous bio',
            updatedAt: 1,
          },
          {
            name: 'Ignored',
          },
        ],
        lastNameChangeAt: 789,
        extra: 'noop',
      },
      extraField: 'drop-me',
    }),
  });

  assert.strictEqual(response.status, 200);
  const payload = await response.json();
  assert.deepStrictEqual(payload, { ok: true });

  const storedProfile = await store.getProfile('test-owner');
  assert.deepStrictEqual(storedProfile, {
    name: 'Nova',
    title: 'Star Command',
    avatar: 'https://example.com/avatar.png',
    bio: 'A pilot bio that should be trimmed.',
    metadata: {
      createdAt: 123,
      updatedAt: 456,
      summary: 'Short summary that should be trimmed to the allowed length.',
      history: [
        {
          name: 'Old Name',
          title: 'Pilot',
          avatar: 'https://example.com/old.png',
          bio: 'Previous bio',
          updatedAt: 1,
        },
        {
          name: 'Ignored',
        },
      ],
      lastNameChangeAt: 789,
    },
  });
});

test('rejects invalid profile payloads', async () => {
  const response = await apiRequest('/api/profile/test-owner', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      name: 'Nova!',
      avatar: 'ftp://example.com/avatar.png',
      metadata: 'not-an-object',
    }),
  });

  assert.strictEqual(response.status, 400);
  const payload = await response.json();
  assert.strictEqual(payload.error, 'invalid_profile');
  assert.ok(Array.isArray(payload.details));
  assert.ok(payload.details.length > 0);

  const storedProfile = await store.getProfile('test-owner');
  assert.strictEqual(storedProfile, undefined);
});

test('rejects invalid owners for profile routes', async () => {
  const invalidOwners = [
    '   ',
    'owner with spaces',
    'owner!',
    'a'.repeat(65),
  ];

  for (const owner of invalidOwners) {
    const encodedOwner = encodeURIComponent(owner);

    const putResponse = await apiRequest(`/api/profile/${encodedOwner}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ name: 'Nova' }),
    });

    assert.strictEqual(putResponse.status, 400);
    const putPayload = await putResponse.json();
    assert.strictEqual(putPayload.error, 'invalid_owner');

    const getResponse = await apiRequest(`/api/profile/${encodedOwner}`, {
      headers: { 'x-api-key': apiKey },
    });
    assert.strictEqual(getResponse.status, 400);
    const getPayload = await getResponse.json();
    assert.strictEqual(getPayload.error, 'invalid_owner');

    const storedProfile = await store.getProfile(owner.trim());
    assert.strictEqual(storedProfile, undefined);
  }
});
