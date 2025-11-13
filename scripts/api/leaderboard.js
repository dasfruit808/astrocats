(function (global) {
    const STORAGE_KEY = 'astro_invaders_leaderboard_queue';

    function resolveApiBaseUrl() {
        const configured = typeof global.ASTROCATS_LEADERBOARD_API_BASE_URL === 'string'
            ? global.ASTROCATS_LEADERBOARD_API_BASE_URL.trim()
            : '';

        if (configured) {
            return configured;
        }

        const location = global.location;
        if (!location || typeof location !== 'object') {
            return '';
        }

        const hostname = (location.hostname || '').toLowerCase();
        const isLocalhost = hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname === '0.0.0.0'
            || hostname === '[::1]';

        return isLocalhost ? '/api/leaderboard' : '';
    }

    function normalizeBaseUrl(url) {
        if (typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (!trimmed) return '';
        return trimmed.replace(/\/$/, '');
    }

    const API_BASE_URL = normalizeBaseUrl(resolveApiBaseUrl());
    const REMOTE_ENABLED = Boolean(API_BASE_URL);
    const TOP_ENDPOINT = REMOTE_ENABLED ? `${API_BASE_URL}/top` : null;
    const SUBMIT_ENDPOINT = REMOTE_ENABLED ? API_BASE_URL : null;

    function safeNumber(value, fallback = 0) {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }

    function sanitizeEntry(entry) {
        if (!entry || typeof entry !== 'object') return null;

        const publicKey = typeof entry.publicKey === 'string' && entry.publicKey.trim()
            ? entry.publicKey.trim()
            : 'Unknown Player';

        const level = Math.max(0, safeNumber(entry.level));
        const bestScore = Math.max(0, safeNumber(entry.bestScore));
        const stats = entry.stats && typeof entry.stats === 'object'
            ? { ...entry.stats }
            : {};

        return { publicKey, level, bestScore, stats };
    }

    function loadQueue() {
        try {
            const stored = global.localStorage.getItem(STORAGE_KEY);
            const parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Leaderboard queue load failed:', error);
            return [];
        }
    }

    function saveQueue(queue) {
        try {
            if (!queue.length) {
                global.localStorage.removeItem(STORAGE_KEY);
            } else {
                global.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
            }
        } catch (error) {
            console.error('Leaderboard queue save failed:', error);
        }
    }

    function enqueue(entry) {
        const queue = loadQueue();
        queue.push(entry);
        saveQueue(queue);
    }

    async function flushQueue() {
        if (!REMOTE_ENABLED) {
            return;
        }

        if (typeof fetch !== 'function') return;
        if (typeof navigator !== 'undefined' && navigator && 'onLine' in navigator && !navigator.onLine) {
            return;
        }

        const queue = loadQueue();
        if (!queue.length) return;

        const remaining = [];
        for (const entry of queue) {
            try {
                const response = await fetch(SUBMIT_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry)
                });

                if (!response.ok) {
                    throw new Error(`Unexpected status: ${response.status}`);
                }
            } catch (error) {
                console.warn('Failed to submit queued leaderboard entry, preserving for retry:', error);
                remaining.push(entry);
            }
        }

        saveQueue(remaining);
    }

    async function postEntry(entry) {
        const sanitized = sanitizeEntry(entry);
        if (!sanitized) return { ok: false, error: 'invalid_entry' };

        if (!REMOTE_ENABLED) {
            return { ok: false, disabled: true };
        }

        if (typeof fetch !== 'function') {
            enqueue(sanitized);
            return { ok: false, error: 'fetch_unavailable' };
        }

        if (typeof navigator !== 'undefined' && navigator && 'onLine' in navigator && !navigator.onLine) {
            enqueue(sanitized);
            return { ok: false, offline: true };
        }

        try {
            const response = await fetch(SUBMIT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sanitized)
            });

            if (!response.ok) {
                throw new Error(`Unexpected status: ${response.status}`);
            }

            await flushQueue();
            return { ok: true };
        } catch (error) {
            console.warn('Leaderboard submission failed, queueing for retry:', error);
            enqueue(sanitized);
            return { ok: false, error: error.message };
        }
    }

    async function fetchTopEntries() {
        if (!REMOTE_ENABLED) {
            return [];
        }

        if (typeof fetch !== 'function') {
            throw new Error('fetch_unavailable');
        }

        const response = await fetch(TOP_ENDPOINT, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Unexpected status: ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload)) {
            throw new Error('invalid_response');
        }

        return payload
            .map(sanitizeEntry)
            .filter(Boolean)
            .sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                return b.bestScore - a.bestScore;
            })
            .slice(0, 10);
    }

    const api = {
        postEntry,
        fetchTopEntries,
        flushQueue,
        sanitizeEntry,
        config: {
            remoteEnabled: REMOTE_ENABLED,
            baseUrl: API_BASE_URL
        }
    };

    global.LeaderboardAPI = api;

    if (global.addEventListener) {
        global.addEventListener('online', () => {
            flushQueue().catch((error) => {
                console.warn('Failed to flush leaderboard queue after reconnect:', error);
            });
        });
    }
})(typeof window !== 'undefined' ? window : this);
