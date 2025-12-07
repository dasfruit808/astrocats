import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tmpRoot = path.join(__dirname, '..', 'tmp-data', 'store-config');

async function loadStoreWithCap(capValue) {
  await fs.rm(tmpRoot, { recursive: true, force: true });
  process.env.DATA_DIR = tmpRoot;
  process.env.NODE_ENV = 'test';

  if (capValue === undefined) {
    delete process.env.LEADERBOARD_MAX_ENTRIES;
  } else {
    process.env.LEADERBOARD_MAX_ENTRIES = String(capValue);
  }

  const moduleUrl = new URL(`../data/store.js?cap=${Math.random()}`, import.meta.url);
  const storeModule = await import(moduleUrl.href);
  await storeModule.storeReady;
  return storeModule;
}

after(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

test('defaults to the maximum cap when no env override is set', async () => {
  const store = await loadStoreWithCap(undefined);
  assert.equal(store.leaderboardMaxEntries, 500);
});

test('respects custom caps within the allowed range', async () => {
  const store = await loadStoreWithCap(25);

  for (let i = 0; i < 30; i += 1) {
    await store.upsertLeaderboardEntry({
      publicKey: `player-${i}`,
      level: i,
      bestScore: i,
      stats: {},
    });
  }

  const entries = await store.getTopLeaderboard();
  assert.equal(store.leaderboardMaxEntries, 25);
  assert.equal(entries.length, 25);
});

test('clamps environment caps to the documented bounds', async () => {
  const lowStore = await loadStoreWithCap(0);
  assert.equal(lowStore.leaderboardMaxEntries, 1);

  await lowStore.upsertLeaderboardEntry({ publicKey: 'low-one', level: 2, bestScore: 2, stats: {} });
  await lowStore.upsertLeaderboardEntry({ publicKey: 'low-two', level: 1, bestScore: 1, stats: {} });
  const lowEntries = await lowStore.getTopLeaderboard();
  assert.equal(lowEntries.length, 1);

  const highStore = await loadStoreWithCap(999);
  assert.equal(highStore.leaderboardMaxEntries, 500);
});
