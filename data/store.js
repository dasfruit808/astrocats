import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leaderboardFile = path.join(__dirname, 'leaderboard.json');
const profilesFile = path.join(__dirname, 'profiles.json');

const MIN_LEADERBOARD_CAP = 100;
const MAX_LEADERBOARD_CAP = 500;
const leaderboardMaxEntries = Math.max(
    MIN_LEADERBOARD_CAP,
    Math.min(
        MAX_LEADERBOARD_CAP,
        Number.isFinite(Number(process.env.LEADERBOARD_MAX_ENTRIES))
            ? Number(process.env.LEADERBOARD_MAX_ENTRIES)
            : MAX_LEADERBOARD_CAP,
    ),
);

let leaderboardEntries = new Map();
let profiles = new Map();

function compareLeaderboardEntries(a, b) {
    if (b.level !== a.level) return b.level - a.level;
    return b.bestScore - a.bestScore;
}

function sortLeaderboardEntries() {
    return Array.from(leaderboardEntries.values()).sort(compareLeaderboardEntries);
}

function trimLeaderboardEntries(sortedEntries) {
    return sortedEntries.slice(0, leaderboardMaxEntries);
}

function refreshLeaderboardCache(sortedEntries) {
    leaderboardEntries = new Map(sortedEntries.map((entry) => [entry.publicKey, entry]));
}

async function ensureDataDir() {
    await mkdir(__dirname, { recursive: true });
}

async function loadJsonArray(filePath, description) {
    try {
        const raw = await readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            console.warn(`[data] Invalid ${description} format; expected array.`);
            return [];
        }
        return parsed;
    } catch (error) {
        const message = error.code === 'ENOENT'
            ? `[data] No existing ${description} file found. Starting with empty data.`
            : `[data] Failed to load ${description}; starting with empty data.`;
        console.warn(message, error);
        return [];
    }
}

async function loadLeaderboard() {
    const entries = await loadJsonArray(leaderboardFile, 'leaderboard');
    const map = new Map();
    for (const entry of entries) {
        if (entry && typeof entry.publicKey === 'string') {
            map.set(entry.publicKey, entry);
        }
    }
    return map;
}

async function loadProfiles() {
    const entries = await loadJsonArray(profilesFile, 'profiles');
    const map = new Map();
    for (const entry of entries) {
        if (entry && typeof entry.owner === 'string') {
            map.set(entry.owner, entry.profile ?? {});
        }
    }
    return map;
}

async function saveJsonArray(filePath, data, description) {
    try {
        await ensureDataDir();
        const serialized = JSON.stringify(data, null, 2);
        await writeFile(filePath, serialized, 'utf8');
    } catch (error) {
        console.warn(`[data] Failed to persist ${description}.`, error);
    }
}

async function persistLeaderboard() {
    const entries = Array.from(leaderboardEntries.values());
    await saveJsonArray(leaderboardFile, entries, 'leaderboard');
}

async function persistProfiles() {
    const entries = Array.from(profiles.entries()).map(([owner, profile]) => ({ owner, profile }));
    await saveJsonArray(profilesFile, entries, 'profiles');
}

async function loadStore() {
    await ensureDataDir();
    leaderboardEntries = await loadLeaderboard();
    const trimmed = trimLeaderboardEntries(sortLeaderboardEntries());
    refreshLeaderboardCache(trimmed);
    profiles = await loadProfiles();
}

export const storeReady = loadStore();

export function getSortedLeaderboardSnapshot(limit) {
    const sorted = trimLeaderboardEntries(sortLeaderboardEntries());
    if (leaderboardEntries.size > sorted.length) {
        refreshLeaderboardCache(sorted);
    }
    return Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
}

export async function getTopLeaderboard(limit = 50) {
    await storeReady;
    return getSortedLeaderboardSnapshot(limit);
}

export async function upsertLeaderboardEntry(entry) {
    await storeReady;
    leaderboardEntries.set(entry.publicKey, entry);
    const sorted = trimLeaderboardEntries(sortLeaderboardEntries());
    refreshLeaderboardCache(sorted);
    await persistLeaderboard();
}

export async function getProfile(owner) {
    await storeReady;
    return profiles.get(owner);
}

export async function saveProfile(owner, profile) {
    await storeReady;
    profiles.set(owner, profile || {});
    await persistProfiles();
}
