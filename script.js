/**
 * Retro XP Anime Invaders - script.js (DEFINITIVE FINAL VERSION)
 * FIX: CRITICAL EXECUTION FIX - Implemented placeholder logic for loadAndDisplayLeaderboard
 * to resolve the startup failure and ensured all functions are properly ordered.
 * ----------------------------------------------------------------------------------
 */

// Canvas setup
const canvas = document.getElementById('canvas');
let ctx = null;
let gl;
let program;
let vertexBuffer;
let texture;

const BASE_CANVAS_WIDTH = 1280;
const BASE_CANVAS_HEIGHT = 720;
const MAX_DEVICE_PIXEL_RATIO = 2.5;

// Offscreen canvas setup
const gameCanvas = document.createElement('canvas');
gameCanvas.width = BASE_CANVAS_WIDTH;
gameCanvas.height = BASE_CANVAS_HEIGHT;
const gameCtx = gameCanvas.getContext('2d');

function configureCanvasResolution() {
    if (!canvas) return;
    const dpr = Math.min(MAX_DEVICE_PIXEL_RATIO, window.devicePixelRatio || 1);
    const desiredWidth = Math.round(BASE_CANVAS_WIDTH * dpr);
    const desiredHeight = Math.round(BASE_CANVAS_HEIGHT * dpr);

    if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
        canvas.width = desiredWidth;
        canvas.height = desiredHeight;
        if (gl) {
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    }
}

configureCanvasResolution();
window.addEventListener('resize', configureCanvasResolution);
window.addEventListener('orientationchange', configureCanvasResolution);

// UI elements 
const scoreEl = document.getElementById('score');
const creditsEl = document.getElementById('credits');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const dashCooldownEl = document.getElementById('dash-cooldown');
const dashBarEl = document.getElementById('dash-bar');
const joystick = document.getElementById('joystick');
const knob = document.getElementById('knob');
const touchControlsContainer = document.getElementById('touch-controls');
const fireButton = document.getElementById('fire-button');
const startMenuEl = document.getElementById('start-menu');
const hubEl = document.getElementById('hub');
const storageWarningEl = document.getElementById('storage-warning');
const shopEl = document.getElementById('shop');
const shopCreditsEl = document.getElementById('shop-credits');
const shopOptionsEl = document.getElementById('shop-options');
const walletStatusEl = document.getElementById('wallet-status');
const nftStatusEl = document.getElementById('nft-status');
const playBtn = document.getElementById('play-btn');
const connectBtn = document.getElementById('connect-wallet');
const walletAddressEl = document.getElementById('wallet-address');
const gamesPlayedEl = document.getElementById('games-played');
const winsEl = document.getElementById('wins');
const lossesEl = document.getElementById('losses');
const bestScoreEl = document.getElementById('best-score');
const hubCreditsEl = document.getElementById('hub-credits');
const itemsEl = document.getElementById('items');
const activeSpriteEl = document.getElementById('active-sprite');
const ownedSpritesEl = document.getElementById('owned-sprites');
const leaderboardEl = document.getElementById('leaderboard');
const waveAnnounceEl = document.getElementById('wave-announce');
const bossAnnounceEl = document.getElementById('boss-announce');
// STAT UI ELEMENTS
const statAllocationEl = document.getElementById('stat-allocation');
const statLevelHubEl = document.getElementById('stat-level-hub');
const statLevelOverlayEl = document.getElementById('stat-level-overlay');
const statPointsEl = document.getElementById('stat-points');
const statOptionsEl = document.getElementById('stat-options');
const openStatAllocationBtn = document.getElementById('open-stat-allocation');
const statusClockEl = document.getElementById('status-clock');
const openProfileBtn = document.getElementById('open-profile-modal');
const profileModalEl = document.getElementById('profile-modal');
const closeProfileBtn = document.getElementById('close-profile-modal');
const cancelProfileBtn = document.getElementById('cancel-profile');
const profileForm = document.getElementById('profile-form');
const profileNameInput = document.getElementById('profile-name');
const profileTitleInput = document.getElementById('profile-title');
const profileAvatarInput = document.getElementById('profile-avatar');
const profileBioInput = document.getElementById('profile-bio');
const profileErrorEl = document.getElementById('profile-error');
const pilotAvatarEl = document.getElementById('pilot-avatar');
const pilotNameDisplayEl = document.getElementById('pilot-name-display');
const pilotTitleDisplayEl = document.getElementById('pilot-title-display');
const pilotBioDisplayEl = document.getElementById('pilot-bio-display');
const pilotNameStatEl = document.getElementById('pilot-name-stat');
const pilotTitleStatEl = document.getElementById('pilot-title-stat');
const pilotNameStatsPanelEl = document.getElementById('pilot-name-stats-panel');
const pilotTitleStatsPanelEl = document.getElementById('pilot-title-stats-panel');
const windowShowDesktopBtn = document.getElementById('window-show-desktop');
const windowOpenHubBtn = document.getElementById('window-open-hub');
const windowBackToStartBtn = document.getElementById('window-back-to-start');
const startMenuCloseBtn = document.getElementById('start-menu-close');
const hubCloseBtn = document.getElementById('hub-close');
const hubOpenShopBtn = document.getElementById('hub-open-shop');
const hubPlayNextBtn = document.getElementById('hub-play-next');
const hubBackMenuBtn = document.getElementById('hub-back-menu');
const shopCloseBtn = document.getElementById('shop-close');
const shopSkipBtn = document.getElementById('shop-skip');
const shopRollBasicBtn = document.getElementById('shop-roll-basic');
const shopRollPremiumBtn = document.getElementById('shop-roll-premium');
const taskbarStartBtn = document.getElementById('taskbar-start');
const taskbarOpenHubBtn = document.getElementById('taskbar-open-hub');
const taskbarOpenShopBtn = document.getElementById('taskbar-open-shop');
const statCloseBtn = document.getElementById('stat-close');
const statReturnHubBtn = document.getElementById('stat-return-hub');
const focusPauseOverlayEl = document.getElementById('focus-pause-overlay');
const focusPauseTitleEl = document.getElementById('focus-pause-title');
const focusPauseMessageEl = document.getElementById('focus-pause-message');
const focusPauseResumeBtn = document.getElementById('focus-pause-resume');
const statusValueEl = document.querySelector('.xp-status-value');
const statusTipEl = document.querySelector('.xp-status-tip');
const DEFAULT_STATUS_VALUE_TEXT = statusValueEl ? statusValueEl.textContent : '';
const DEFAULT_STATUS_TIP_TEXT = statusTipEl ? statusTipEl.textContent : '';

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), [tabindex]:not([tabindex='-1'])";
const focusTrapStates = new Map();
let hasInitialized = false;
let touchControlsEnabled = false;
let joystickEventsBound = false;
let fireButtonEventsBound = false;
let joystickPointerId = null;
let joystickInputType = null;
let pointerCapabilityQuery = null;

function bindButtonClick(element, handler, { preventDefault = true } = {}) {
    const target = typeof element === 'string' ? document.getElementById(element) : element;
    if (!target || typeof handler !== 'function') return;
    target.addEventListener('click', (event) => {
        if (preventDefault) {
            event.preventDefault();
        }
        if (target.disabled) return;
        handler(event);
    });
}

function hideOverlaysAndResumeGame() {
    resumeGameFromFocusLoss({ triggeredByUser: true });
    hideAllOverlays();
    if (gameRunning) {
        gamePaused = false;
    }
}

function initializeUIEvents() {
    bindButtonClick(playBtn, () => startGame(true));
    bindButtonClick(connectBtn, () => {
        if (walletPublicKey) {
            disconnectWallet();
        } else {
            connectWallet();
        }
    });

    bindButtonClick(windowOpenHubBtn, showHub);
    bindButtonClick(windowBackToStartBtn, showStartMenu);
    bindButtonClick(windowShowDesktopBtn, hideOverlaysAndResumeGame);
    bindButtonClick(startMenuCloseBtn, hideOverlaysAndResumeGame);

    bindButtonClick(hubCloseBtn, showStartMenu);
    bindButtonClick(hubOpenShopBtn, openShop);
    bindButtonClick(hubPlayNextBtn, () => startGame(true));
    bindButtonClick(hubBackMenuBtn, showStartMenu);

    bindButtonClick(shopCloseBtn, showHub);
    bindButtonClick(shopSkipBtn, skipShop);
    bindButtonClick(shopRollBasicBtn, () => rollUpgrade('basic'));
    bindButtonClick(shopRollPremiumBtn, () => rollUpgrade('premium'));

    bindButtonClick(taskbarStartBtn, showStartMenu);
    bindButtonClick(taskbarOpenHubBtn, showHub);
    bindButtonClick(taskbarOpenShopBtn, openShop);

    bindButtonClick(openStatAllocationBtn, showStatAllocation);
    bindButtonClick(statCloseBtn, showHub);
    bindButtonClick(statReturnHubBtn, showHub);
    bindButtonClick(focusPauseResumeBtn, () => resumeGameFromFocusLoss({ triggeredByUser: true }));
}

function detectTouchSupport() {
    if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return true;
    if (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) return true;
    if ('ontouchstart' in window) return true;
    try {
        const coarseQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
        if (coarseQuery?.matches) {
            pointerCapabilityQuery = coarseQuery;
            return true;
        }
        if (!pointerCapabilityQuery && coarseQuery) {
            pointerCapabilityQuery = coarseQuery;
        }
    } catch (error) {
        // Ignore matchMedia errors; fallback to other detection methods.
    }
    return false;
}

function configureTouchControls(forceTouch = null) {
    const supportsTouch = typeof forceTouch === 'boolean' ? forceTouch : detectTouchSupport();
    touchControlsEnabled = supportsTouch;

    if (supportsTouch) {
        document.body.classList.add('touch-supported');
        if (touchControlsContainer) {
            touchControlsContainer.style.display = 'flex';
            touchControlsContainer.setAttribute('aria-hidden', 'false');
        }
        setupJoystickControls();
        setupFireButtonControls();
    } else {
        document.body.classList.remove('touch-supported');
        if (touchControlsContainer) {
            touchControlsContainer.style.display = 'none';
            touchControlsContainer.setAttribute('aria-hidden', 'true');
        }
        resetJoystickState();
        if (isCharging) {
            releaseCharge();
        }
    }

    if (fireButton) {
        fireButton.classList.remove('active');
        fireButton.tabIndex = supportsTouch ? 0 : -1;
        if (!supportsTouch && typeof fireButton.blur === 'function') {
            fireButton.blur();
        }
    }
}

function monitorPointerCapabilityChanges() {
    if (!window.matchMedia) return;
    try {
        if (!pointerCapabilityQuery) {
            pointerCapabilityQuery = window.matchMedia('(pointer: coarse)');
        }
        if (!pointerCapabilityQuery) return;
        const listener = (event) => configureTouchControls(event.matches);
        if (typeof pointerCapabilityQuery.addEventListener === 'function') {
            pointerCapabilityQuery.addEventListener('change', listener);
        } else if (typeof pointerCapabilityQuery.addListener === 'function') {
            pointerCapabilityQuery.addListener(listener);
        }
    } catch (error) {
        pointerCapabilityQuery = null;
    }
}

function setupJoystickControls() {
    if (!joystick || !knob || joystickEventsBound) return;

    const startOptions = { passive: false };
    joystick.addEventListener('pointerdown', handleJoystickStart);
    knob.addEventListener('pointerdown', handleJoystickStart);
    joystick.addEventListener('touchstart', handleJoystickStart, startOptions);
    knob.addEventListener('touchstart', handleJoystickStart, startOptions);

    window.addEventListener('pointermove', handleJoystickMove);
    window.addEventListener('pointerup', handleJoystickEnd);
    window.addEventListener('pointercancel', handleJoystickEnd);
    window.addEventListener('touchmove', handleJoystickMove, { passive: false });
    window.addEventListener('touchend', handleJoystickEnd, { passive: false });
    window.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

    joystickEventsBound = true;
}

function setupFireButtonControls() {
    if (!fireButton || fireButtonEventsBound) return;

    const startPress = (event) => {
        if (!touchControlsEnabled) return;
        event.preventDefault();
        fireButton.classList.add('active');
        if (typeof event.pointerId === 'number' && typeof fireButton.setPointerCapture === 'function') {
            try {
                fireButton.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore pointer capture errors.
            }
        }
        startCharge();
    };

    const endPress = (event) => {
        if (!touchControlsEnabled) return;
        event.preventDefault();
        fireButton.classList.remove('active');
        if (typeof event.pointerId === 'number' && typeof fireButton.releasePointerCapture === 'function') {
            try {
                fireButton.releasePointerCapture(event.pointerId);
            } catch (error) {
                // Ignore release errors.
            }
        }
        releaseCharge();
    };

    fireButton.addEventListener('pointerdown', startPress);
    fireButton.addEventListener('pointerup', endPress);
    fireButton.addEventListener('pointercancel', endPress);
    fireButton.addEventListener('pointerleave', endPress);
    fireButton.addEventListener('touchstart', startPress, { passive: false });
    fireButton.addEventListener('touchend', endPress, { passive: false });
    fireButton.addEventListener('touchcancel', endPress, { passive: false });
    fireButton.addEventListener('contextmenu', (event) => event.preventDefault());
    fireButton.addEventListener('click', (event) => {
        if (touchControlsEnabled) {
            event.preventDefault();
        }
    });

    fireButtonEventsBound = true;
}

function handleJoystickStart(event) {
    if (!touchControlsEnabled || !joystick || !knob) return;
    const isTouchEvent = event.type.startsWith('touch');
    if (!isTouchEvent && event.pointerType === 'mouse' && event.button !== 0) {
        return;
    }
    if (joystickActive) {
        event.preventDefault();
        return;
    }

    event.preventDefault();
    joystickActive = true;
    joystick.classList.add('active');

    if (isTouchEvent) {
        const touch = event.changedTouches?.[0];
        joystickInputType = 'touch';
        joystickPointerId = touch ? touch.identifier : null;
    } else {
        joystickInputType = 'pointer';
        joystickPointerId = event.pointerId;
        if (typeof knob.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
            try {
                knob.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore pointer capture errors.
            }
        }
    }

    const position = getEventPosition(event);
    if (position) {
        updateJoystickFromPosition(position.x, position.y);
    }
}

function handleJoystickMove(event) {
    if (!touchControlsEnabled || !joystickActive) return;

    if (event.type === 'pointermove') {
        if (event.pointerId !== joystickPointerId) {
            return;
        }
    } else if ((event.type === 'touchmove') && joystickPointerId !== null) {
        const touches = Array.from(event.touches || []);
        if (!touches.some(touch => touch.identifier === joystickPointerId)) {
            return;
        }
    }

    const position = getEventPosition(event);
    if (!position) return;

    event.preventDefault();
    updateJoystickFromPosition(position.x, position.y);
}

function handleJoystickEnd(event) {
    if (!joystickActive) return;

    if (event.type === 'pointerup' || event.type === 'pointercancel') {
        if (event.pointerId !== joystickPointerId) {
            return;
        }
    } else if ((event.type === 'touchend' || event.type === 'touchcancel') && joystickPointerId !== null) {
        const touches = Array.from(event.changedTouches || []);
        if (!touches.some(touch => touch.identifier === joystickPointerId)) {
            return;
        }
    }

    event.preventDefault();
    resetJoystickState();
}

function getEventPosition(event) {
    if (event.type.startsWith('touch')) {
        const touchList = event.touches && event.touches.length
            ? Array.from(event.touches)
            : Array.from(event.changedTouches || []);
        if (!touchList.length) return null;
        let touch = null;
        if (joystickPointerId !== null) {
            touch = touchList.find(t => t.identifier === joystickPointerId) || null;
        }
        if (!touch) {
            touch = touchList[0];
        }
        return touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        return { x: event.clientX, y: event.clientY };
    }
    return null;
}

function updateJoystickFromPosition(clientX, clientY) {
    if (!joystick || !knob) return;
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = Math.max(1, rect.width / 2);
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const clampedX = Math.max(-maxDistance, Math.min(maxDistance, dx));
    const clampedY = Math.max(-maxDistance, Math.min(maxDistance, dy));

    const normalizedX = Math.max(-1, Math.min(1, clampedX / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, clampedY / maxDistance));

    joystickDelta.x = normalizedX;
    joystickDelta.y = normalizedY;

    knob.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
}

function resetJoystickState() {
    const activePointerId = joystickPointerId;
    const inputType = joystickInputType;
    joystickActive = false;
    joystickDelta.x = 0;
    joystickDelta.y = 0;
    joystickPointerId = null;
    joystickInputType = null;

    if (joystick) {
        joystick.classList.remove('active');
    }

    if (knob) {
        knob.style.transform = '';
        if (inputType === 'pointer' && activePointerId !== null && typeof knob.releasePointerCapture === 'function') {
            try {
                knob.releasePointerCapture(activePointerId);
            } catch (error) {
                // Ignore release errors.
            }
        }
    }
}

function isFocusableElement(element) {
    if (!element) return false;
    if (element.disabled) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.tagName === 'INPUT' && element.type === 'hidden') return false;

    const tabIndexAttr = element.getAttribute('tabindex');
    if (tabIndexAttr !== null && Number(tabIndexAttr) < 0) return false;

    const style = window.getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return false;

    if (element.offsetParent === null && element.getClientRects().length === 0) return false;

    return true;
}

function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isFocusableElement);
}

function activateFocusTrap(modalEl, options = {}) {
    if (!modalEl) return;

    const existingState = focusTrapStates.get(modalEl);
    if (existingState) {
        modalEl.removeEventListener('keydown', existingState.keydownHandler);
        focusTrapStates.delete(modalEl);
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const state = {
        previouslyFocused,
        keydownHandler: null,
        tabIndexChanged: false
    };

    const keydownHandler = (event) => {
        if (event.key !== 'Tab') return;
        event.stopPropagation();

        const focusableElements = getFocusableElements(modalEl);
        if (focusableElements.length === 0) {
            if (options.fallbackToModal !== false) {
                if (!modalEl.hasAttribute('tabindex')) {
                    modalEl.setAttribute('tabindex', '-1');
                    state.tabIndexChanged = true;
                }
                modalEl.focus();
            }
            event.preventDefault();
            return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        const active = document.activeElement;

        if (event.shiftKey) {
            if (!modalEl.contains(active) || active === first) {
                event.preventDefault();
                last.focus();
            }
        } else {
            if (!modalEl.contains(active) || active === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };

    state.keydownHandler = keydownHandler;
    modalEl.addEventListener('keydown', keydownHandler);

    let focusTarget = options.initialFocus || null;
    if (focusTarget && !modalEl.contains(focusTarget)) {
        focusTarget = null;
    }
    if (focusTarget && !isFocusableElement(focusTarget)) {
        focusTarget = null;
    }

    if (!focusTarget) {
        const focusableElements = getFocusableElements(modalEl);
        if (focusableElements.length > 0) {
            focusTarget = focusableElements[0];
        }
    }

    if (!focusTarget && options.fallbackToModal !== false) {
        const hadTabIndex = modalEl.hasAttribute('tabindex');
        if (!hadTabIndex) {
            modalEl.setAttribute('tabindex', '-1');
            state.tabIndexChanged = true;
        }
        focusTarget = modalEl;
    }

    focusTrapStates.set(modalEl, state);

    if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
    }
}

function deactivateFocusTrap(modalEl, { restoreFocus = true } = {}) {
    if (!modalEl) return;

    const state = focusTrapStates.get(modalEl);
    if (!state) return;

    modalEl.removeEventListener('keydown', state.keydownHandler);

    if (state.tabIndexChanged) {
        modalEl.removeAttribute('tabindex');
    }

    focusTrapStates.delete(modalEl);

    if (restoreFocus && state.previouslyFocused && typeof state.previouslyFocused.focus === 'function') {
        const target = state.previouslyFocused;
        if (document.contains(target) && isFocusableElement(target)) {
            target.focus();
        }
    }
}

function findFirstContentControl(container) {
    if (!container) return null;
    return container.querySelector(".xp-window-content button, .xp-window-content [href], .xp-window-content input, .xp-window-content select, .xp-window-content textarea, .xp-window-content [tabindex]:not([tabindex='-1'])");
}


const PLAYER_BASE_SIZE = 96;
const PLAYER_MIN_SIZE = 64;
const PLAYER_MAX_SIZE = 132;
const PLAYFIELD_PADDING_X = 20;
const PLAYFIELD_PADDING_Y = 36;
const ENEMY_BASE_SIZE = 88;
const ENEMY_MIN_SIZE = 56;
const ENEMY_MAX_SIZE = 128;

let playerSpriteDimensions = {
    width: PLAYER_BASE_SIZE,
    height: Math.round(PLAYER_BASE_SIZE * 0.85)
};

let enemySpriteDimensions = {
    width: ENEMY_BASE_SIZE,
    height: ENEMY_BASE_SIZE
};

let projectiles = [];
let enemies = [];

function computeSpriteDimensions(img, baseSize, minSize, maxSize) {
    if (!img) {
        return { width: baseSize, height: baseSize };
    }

    const naturalWidth = img.naturalWidth || img.width || baseSize;
    const naturalHeight = img.naturalHeight || img.height || baseSize;
    if (!naturalWidth || !naturalHeight) {
        return { width: baseSize, height: baseSize };
    }

    const dominant = Math.max(naturalWidth, naturalHeight);
    let scale = baseSize / dominant;
    let width = Math.round(naturalWidth * scale);
    let height = Math.round(naturalHeight * scale);

    const ensureMin = Math.min(width, height);
    if (ensureMin < minSize) {
        const minScale = minSize / ensureMin;
        width = Math.round(width * minScale);
        height = Math.round(height * minScale);
    }

    const ensureMax = Math.max(width, height);
    if (ensureMax > maxSize) {
        const maxScale = maxSize / ensureMax;
        width = Math.round(width * maxScale);
        height = Math.round(height * maxScale);
    }

    return { width, height };
}

function clampWithinPadding(position, size, maxSize, padding) {
    const safePadding = Math.max(0, padding);
    const min = safePadding;
    const max = maxSize - size - safePadding;

    if (max <= min) {
        const fallbackMax = Math.max(0, maxSize - size);
        return Math.max(0, Math.min(fallbackMax, position));
    }

    return Math.max(min, Math.min(max, position));
}

function clampPlayerToPlayfield() {
    player.x = clampWithinPadding(player.x, player.width, gameCanvas.width, PLAYFIELD_PADDING_X);
    player.y = clampWithinPadding(player.y, player.height, gameCanvas.height, PLAYFIELD_PADDING_Y);
}

function whenImageReady(image, callback) {
    if (!image || typeof callback !== 'function') return;
    if (image.complete && image.naturalWidth) {
        callback(image);
        return;
    }

    const handler = () => {
        image.removeEventListener('load', handler);
        callback(image);
    };

    image.addEventListener('load', handler);
}

function isImageReady(image) {
    return Boolean(image && image.complete && image.naturalWidth && image.naturalHeight);
}

function loadProjectileAssets() {
    Object.entries(PROJECTILE_ASSETS).forEach(([key, src]) => {
        if (!src) return;
        const img = new Image();
        img.onload = () => {
            projectileImageCache[key] = img;
        };
        img.onerror = () => {
            delete projectileImageCache[key];
        };
        projectileImageCache[key] = img;
        img.src = src;
    });
}

function loadPowerupAssets() {
    const sources = new Set(Object.values(POWERUP_ASSETS));
    sources.forEach(src => {
        if (!src) return;
        if (powerupImageCache[src] && isImageReady(powerupImageCache[src])) {
            return;
        }
        const img = new Image();
        img.onload = () => {
            powerupImageCache[src] = img;
        };
        img.onerror = () => {
            delete powerupImageCache[src];
        };
        powerupImageCache[src] = img;
        img.src = src;
    });
}

function initializeVisualAssets() {
    loadProjectileAssets();
    loadPowerupAssets();
}

function updatePlayerSpriteMetrics(img) {
    const dims = computeSpriteDimensions(img, PLAYER_BASE_SIZE, PLAYER_MIN_SIZE, PLAYER_MAX_SIZE);
    playerSpriteDimensions = dims;
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    player.width = dims.width;
    player.height = dims.height;
    player.x = clampWithinPadding(centerX - player.width / 2, player.width, gameCanvas.width, PLAYFIELD_PADDING_X);
    player.y = clampWithinPadding(centerY - player.height / 2, player.height, gameCanvas.height, PLAYFIELD_PADDING_Y);
}

function updateEnemySpriteMetrics(img, applyToExisting = false) {
    const dims = computeSpriteDimensions(img, ENEMY_BASE_SIZE, ENEMY_MIN_SIZE, ENEMY_MAX_SIZE);
    enemySpriteDimensions = dims;
    if (applyToExisting) {
        enemies.forEach(enemy => {
            if (enemy === boss) return;
            const centerX = enemy.x + enemy.width / 2;
            const centerY = enemy.y + enemy.height / 2;
            enemy.width = dims.width;
            enemy.height = dims.height;
            enemy.x = Math.max(0, Math.min(centerX - enemy.width / 2, gameCanvas.width - enemy.width));
            enemy.y = clampWithinPadding(centerY - enemy.height / 2, enemy.height, gameCanvas.height, PLAYFIELD_PADDING_Y);
        });
    }
}


// Runtime & timing helpers
const TARGET_FPS = 60;
const FRAME_TIME = 1 / TARGET_FPS;
const FRAME_MS = 1000 / TARGET_FPS;

let lastFrameTimestamp = null;
let deltaTime = FRAME_TIME;
let deltaMultiplier = 1;

// Wallet & Blockchain
let walletPublicKey = null;
let walletProvider = null;
let hasAstroCatNFT = false;
let solanaConnection = null;

const SOLANA_RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.public.blastapi.io',
    'https://solana-api.projectserum.com'
].filter(Boolean);

const SOLANA_WEB3_SOURCES = [
    'https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js',
    'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.95.3/lib/index.iife.min.js'
];

const METAPLEX_JS_SOURCES = [
    'https://unpkg.com/@metaplex-foundation/js@0.20.1/dist/js/index.js',
    'https://cdn.jsdelivr.net/npm/@metaplex-foundation/js@0.20.1/dist/js/index.js'
];

let solanaEndpointIndex = 0;
let solanaLibraryLoadPromise = null;

const PROGRESS_MEMO_PREFIX = 'ASTRO_INVADERS_PROGRESS:';
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const MEMO_MAX_BYTES = 566;
const CHAIN_SYNC_THROTTLE_MS = 60 * 1000;

let pendingChainSnapshot = null;
let chainSyncTimeoutId = null;
let lastChainSyncTime = 0;

function createDefaultQuests() {
    return [
        { id: 'playRounds', desc: 'Launch 3 Flights', target: 3, progress: 0, reward: { type: 'credits', amount: 50 }, completed: false },
        { id: 'defeatBoss', desc: 'Reach Threat Level 5', target: 1, progress: 0, reward: { type: 'xpBonus', amount: 100 }, completed: false },
        { id: 'achieveCombo', desc: 'Achieve Combo 5', target: 5, progress: 0, reward: { type: 'specializationPoint', amount: 1 }, completed: false },
    ];
}

const DEFAULT_SPRITE_ID = 'astro-pioneer';

function createBasePlayerData() {
    return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        bestScore: 0,
        credits: 0,
        items: [],
        ownedSprites: [DEFAULT_SPRITE_ID],
        activeSpriteId: DEFAULT_SPRITE_ID,
        level: 1,
        currentXP: 0,
        restedXP: 0,
        specializationPoints: 0,
        stats: {
            strength: 0,
            speed: 0,
            vitality: 0,
            focus: 0
        },
        unlockedNodes: [],
        daily: {
            lastLogin: 0,
            claimedLogin: false,
            quests: createDefaultQuests()
        },
        profile: {
            name: '',
            title: '',
            avatar: '',
            bio: ''
        }
    };
}

let playerData = createBasePlayerData();
const ASTRO_CAT_COLLECTION_MINT = 'AstroCatMintAddress';

// Game state & Constants
let gameRunning = false; let gamePaused = true;
const FOCUS_LOSS_STATUS_TEXT = 'Paused · Window inactive';
const FOCUS_LOSS_TIP_TEXT = 'Click Resume or refocus to continue the mission.';
let focusPauseActive = false;
let focusPauseShouldAutoResume = false;
let focusPauseWasRunning = false;
let focusPauseAllowResume = false;
let focusResumeHandled = false;
let focusPausePreviousStatus = DEFAULT_STATUS_VALUE_TEXT;
let focusPausePreviousTip = DEFAULT_STATUS_TIP_TEXT;
const focusResumeEffects = [];
const MAX_LIVES = 3;
let score = 0; let credits = 0; let level = 1; let lives = MAX_LIVES; let pendingLifeDamage = 0;
let playerImg = null; let enemyImg = null; let assetsLoaded = false;
const projectileImageCache = {};
const powerupImageCache = {};
let powerups = [];
let rapidFire = false; let shieldActive = false; let spreadActive = false;
let homingActive = false; let pierceActive = false; let ultraDashActive = false;
let enemySpawnTimer = 0;
let bossActive = false; let boss = null; let dashActive = false; let dashDirection = null;
let dashEndTime = 0; let dashDurationMs = 0; let dashVector = { x: 1, y: 0 };
let lastMovementInput = { x: 1, y: 0 };
let flightTimeSeconds = 0;
let difficultyFactor = 1;

const BASE_SPAWN_INTERVAL = 1.35; // seconds
const MIN_SPAWN_INTERVAL = 0.25; // seconds
const DIFFICULTY_TIME_SCALE = 32; // seconds to add roughly +1 difficulty
const SCORE_DIFFICULTY_SCALE = 600; // score points required for +1 difficulty
const MAX_DIFFICULTY_FACTOR = 12;
const DASH_COOLDOWN_DURATION = 2000; 
let dashCooldown = 0;
let tail = []; let particles = [];
let chargeStartTime = 0; let isCharging = false;
const COMBO_WINDOW = 5000; const COMBO_THRESHOLD = 3;
let killStreak = 0; let lastKillTime = 0;
let powerupTimeouts = [];
const activeSpeedBuffs = new Map();
let speedModifierSequence = 0;
let screenShakeDuration = 0; let hitStopDuration = 0;
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastClockUpdate = 0;

const uiCache = {
    score: null,
    credits: null,
    lives: null,
    levelText: null,
    combo: null,
    shopCredits: null
};

const STAR_COUNT = 220;
const starField = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * gameCanvas.width,
    y: Math.random() * gameCanvas.height,
    speed: 40 + Math.random() * 80,
    size: Math.random() * 2 + 1,
    twinkle: Math.random() * Math.PI * 2
}));

// LEVELING CONSTANTS
const BASE_XP_TO_LEVEL = 150;
const XP_MULTIPLIER = 1.2;
const MAX_PLAYER_LEVEL = 50;

const XP_CURVE_SEGMENTS = [
    { minLevel: 1, maxLevel: 10, base: BASE_XP_TO_LEVEL, growth: 1.3, bonus: 0 },
    { minLevel: 11, maxLevel: 25, base: BASE_XP_TO_LEVEL * 6, growth: 1.25, bonus: 400 },
    { minLevel: 26, maxLevel: 40, base: BASE_XP_TO_LEVEL * 13, growth: 1.3, bonus: 1000 },
    { minLevel: 41, maxLevel: MAX_PLAYER_LEVEL, base: BASE_XP_TO_LEVEL * 20, growth: 1.38, bonus: 2000 }
];

const LEVEL_BASELINE_STATS = { strength: 3, speed: 2, vitality: 3, focus: 1 };
const LEVEL_STAT_TIERS = [
    { maxLevel: 10, perLevel: { strength: 0.8, speed: 0.6, vitality: 0.9, focus: 0.45 } },
    { maxLevel: 25, perLevel: { strength: 1.05, speed: 0.85, vitality: 1.1, focus: 0.6 } },
    { maxLevel: 40, perLevel: { strength: 1.3, speed: 1.05, vitality: 1.35, focus: 0.75 } },
    { maxLevel: Infinity, perLevel: { strength: 1.55, speed: 1.25, vitality: 1.55, focus: 0.9 } }
];

const STAT_SOFT_CAPS = { strength: 52, speed: 46, vitality: 58, focus: 42 };

const RESTED_XP_RATE_PER_DAY = 0.6;
const RESTED_XP_CAP_MULTIPLIER = 5;
const RESTED_XP_MAX_DAYS = 7;
const DEFAULT_PILOT_AVATAR = 'https://placehold.co/80x80?text=Pilot';

if (openProfileBtn) openProfileBtn.addEventListener('click', showProfileModal);
if (closeProfileBtn) closeProfileBtn.addEventListener('click', hideProfileModal);
if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', hideProfileModal);
if (profileForm) profileForm.addEventListener('submit', handleProfileFormSubmit);

function updateDifficultyProgress(elapsedSeconds) {
    if (!gameRunning || gamePaused) return;

    flightTimeSeconds += elapsedSeconds;
    const timeComponent = flightTimeSeconds / DIFFICULTY_TIME_SCALE;
    const scoreComponent = score / SCORE_DIFFICULTY_SCALE;
    const rawFactor = 1 + timeComponent + scoreComponent;
    const clampedFactor = Math.max(1, Math.min(MAX_DIFFICULTY_FACTOR, rawFactor));

    difficultyFactor = clampedFactor;
    const nextLevel = Math.max(1, Math.floor(clampedFactor));
    if (nextLevel !== level) {
        level = nextLevel;
        showAnnounce(waveAnnounceEl, `Threat Level ${level}!`);

        if (playerData && playerData.daily && Array.isArray(playerData.daily.quests)) {
            const reachThreatQuest = playerData.daily.quests.find(q => q.id === 'defeatBoss');
            if (reachThreatQuest && !reachThreatQuest.completed && reachThreatQuest.progress < reachThreatQuest.target && nextLevel >= 5) {
                reachThreatQuest.progress = reachThreatQuest.target;
                updateQuestsUI();
            }
        }
    }
}

function getSpawnIntervalSeconds() {
    const scaled = BASE_SPAWN_INTERVAL / Math.max(1, difficultyFactor);
    return Math.max(MIN_SPAWN_INTERVAL, scaled);
}

function buildEnemyTemplate() {
    const baseSpeed = 2.1 + difficultyFactor * 0.45;
    const baseHp = 1 + Math.floor(Math.max(0, difficultyFactor - 1) * 0.75);
    const aggressiveChance = Math.min(0.85, Math.max(0, (difficultyFactor - 1) * 0.12));
    const useMecha = Math.random() < aggressiveChance;

    const diveStrength = useMecha
        ? 18 + difficultyFactor * 4
        : (difficultyFactor > 4 ? 10 + difficultyFactor * 2 : 0);

    return {
        variant: useMecha ? 'mecha' : 'scout',
        speed: baseSpeed * (0.88 + Math.random() * 0.3),
        hp: Math.max(1, baseHp + (useMecha ? 1 : 0)),
        diveStrength,
        verticalVariance: useMecha ? 4 + Math.random() * 3 : 2 + Math.random() * 2
    };
}

const upgradePools = {
    common: ['speed', 'rapid'], rare: ['spread', 'homing'],
    epic: ['pierce', 'shield'], legendary: ['ultra_dash']
};

const SHOP_ROLL_CONFIG = {
    basic: { cost: 50, rolls: 3, rarityWeights: { common: 0.7, rare: 0.3 } },
    premium: { cost: 200, rolls: 3, rarityWeights: { rare: 0.5, epic: 0.35, legendary: 0.15 } }
};

const SHOP_RARITY_COSTS = { common: 75, rare: 125, epic: 200, legendary: 350 };

const UPGRADE_DETAILS = {
    speed: { name: 'Speed Boost', description: 'Increase ship movement speed for a short duration.' },
    rapid: { name: 'Rapid Fire', description: 'Temporarily enhances fire rate for blazing barrages.' },
    shield: { name: 'Shield Matrix', description: 'Gain a protective barrier that blocks the next hit.' },
    life: { name: 'Extra Life', description: 'Earn an additional life to stay in the fight longer.' },
    spread: { name: 'Spread Shot', description: 'Fire multiple shots in a cone to cover more space.' },
    homing: { name: 'Homing Lasers', description: 'Shots curve toward enemies for guaranteed hits.' },
    pierce: { name: 'Piercing Rounds', description: 'Bullets pass through enemies, damaging multiple targets.' },
    ultra_dash: { name: 'Ultra Dash', description: 'Reduce dash cooldown dramatically for rapid repositioning.' }
};

const CORE_STATS = ['strength', 'speed', 'vitality', 'focus'];

const skillTree = {
    strength: {
        label: 'Strength Specialization',
        description: 'Channel raw reactor power to amplify offensive output and crushing barrages.',
        mastery: {
            id: 'strength_mastery',
            name: 'Starbreaker Commander',
            description: 'Unlock every Strength node to unleash unstoppable ordnance.',
            bonuses: {
                stats: { strength: 1 },
                perks: { damageMultiplier: 0.12, critMultiplierBonus: 0.25, extraPierce: 1 }
            }
        },
        nodes: [
            {
                id: 'strength_core',
                name: 'Power Calibrators',
                description: '+1 Strength. Unlocks the heavy ordnance path.',
                cost: 1,
                prerequisites: [],
                bonuses: {
                    stats: { strength: 1 },
                    perks: { damageMultiplier: 0.08 }
                },
                children: [
                    {
                        id: 'strength_overdrive',
                        name: 'Siege Overdrive',
                        description: '+1 Strength and +12% weapon damage with bonus pierce.',
                        cost: 1,
                        prerequisites: ['strength_core'],
                        bonuses: {
                            stats: { strength: 1 },
                            perks: { damageMultiplier: 0.12, extraPierce: 1 }
                        },
                        children: [
                            {
                                id: 'strength_plasma_forge',
                                name: 'Plasma Colossus',
                                description: '+1 Strength, projectiles grow by 25% and gain +1 pierce.',
                                cost: 1,
                                prerequisites: ['strength_overdrive'],
                                bonuses: {
                                    stats: { strength: 1 },
                                    perks: { projectileSize: 0.25, extraPierce: 1, damageMultiplier: 0.18, critMultiplierBonus: 0.35 }
                                },
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]
    },
    vitality: {
        label: 'Vitality Specialization',
        description: 'Fortify hull plating, shields, and emergency systems for long sorties.',
        mastery: {
            id: 'vitality_mastery',
            name: 'Celestial Bulwark',
            description: 'Complete the Vitality tree to unlock elite safeguarding protocols.',
            bonuses: {
                stats: { vitality: 1 },
                perks: { damageReduction: 0.12, shieldDurationBonus: 800, guardChance: 0.15 }
            }
        },
        nodes: [
            {
                id: 'vitality_core',
                name: 'Reinforced Bioframe',
                description: '+1 Vitality. Grants sturdier base shielding.',
                cost: 1,
                prerequisites: [],
                bonuses: {
                    stats: { vitality: 1 },
                    perks: { shieldDurationBonus: 300, damageReduction: 0.04 }
                },
                children: [
                    {
                        id: 'vitality_bastion',
                        name: 'Adaptive Bastion',
                        description: '+1 Vitality and shields last 0.6s longer with guard chance.',
                        cost: 1,
                        prerequisites: ['vitality_core'],
                        bonuses: {
                            stats: { vitality: 1 },
                            perks: { shieldDurationBonus: 600, damageReduction: 0.07, guardChance: 0.1 }
                        },
                        children: [
                            {
                                id: 'vitality_guardian',
                                name: 'Guardian Ward',
                                description: '+1 Vitality and 18% chance to negate a hit.',
                                cost: 1,
                                prerequisites: ['vitality_bastion'],
                                bonuses: {
                                    stats: { vitality: 1 },
                                    perks: { guardChance: 0.18, damageReduction: 0.1, shieldDurationBonus: 900 }
                                },
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]
    },
    speed: {
        label: 'Speed Specialization',
        description: 'Increase mobility, fire cadence, and dash responsiveness.',
        mastery: {
            id: 'speed_mastery',
            name: 'Slipstream Virtuoso',
            description: 'Unlock every Speed node to master evasive maneuvers.',
            bonuses: {
                stats: { speed: 1 },
                perks: { movementSpeed: 0.12, fireRateBonus: 0.08, evasionBonus: 0.1, dashCooldownMultiplier: -0.2 }
            }
        },
        nodes: [
            {
                id: 'speed_core',
                name: 'Thruster Tuning',
                description: '+1 Speed and +12% dash cooldown recovery.',
                cost: 1,
                prerequisites: [],
                bonuses: {
                    stats: { speed: 1 },
                    perks: { dashCooldownMultiplier: -0.12, evasionBonus: 0.02, movementSpeed: 0.05 }
                },
                children: [
                    {
                        id: 'speed_afterburn',
                        name: 'Afterburn Channels',
                        description: '+1 Speed, +7% fire rate, and faster dashes.',
                        cost: 1,
                        prerequisites: ['speed_core'],
                        bonuses: {
                            stats: { speed: 1 },
                            perks: { fireRateBonus: 0.07, dashCooldownMultiplier: -0.18, movementSpeed: 0.07 }
                        },
                        children: [
                            {
                                id: 'speed_slipstream',
                                name: 'Quantum Slipstream',
                                description: '+1 Speed, +10% fire rate, and +15% dash recovery.',
                                cost: 1,
                                prerequisites: ['speed_afterburn'],
                                bonuses: {
                                    stats: { speed: 1 },
                                    perks: { fireRateBonus: 0.1, dashCooldownMultiplier: -0.25, movementSpeed: 0.12, evasionBonus: 0.05 }
                                },
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]
    },
    focus: {
        label: 'Focus Specialization',
        description: 'Maximize crits, loot drops, and cosmic prosperity.',
        mastery: {
            id: 'focus_mastery',
            name: 'Fate Weaver',
            description: 'Master Focus to bend probability to your will.',
            bonuses: {
                stats: { focus: 1 },
                perks: { critChanceBonus: 0.06, xpBonus: 0.08, creditBonus: 0.08, dropChanceBonus: 0.08 }
            }
        },
        nodes: [
            {
                id: 'focus_core',
                name: 'Lucky Glyphs',
                description: '+1 Focus and +3% critical chance.',
                cost: 1,
                prerequisites: [],
                bonuses: {
                    stats: { focus: 1 },
                    perks: { critChanceBonus: 0.03, dropChanceBonus: 0.03 }
                },
                children: [
                    {
                        id: 'focus_hawkeye',
                        name: 'Hawkeye Sensors',
                        description: '+1 Focus and +4% crit chance.',
                        cost: 1,
                        prerequisites: ['focus_core'],
                        bonuses: {
                            stats: { focus: 1 },
                            perks: { critChanceBonus: 0.04, xpBonus: 0.03, creditBonus: 0.03 }
                        },
                        children: [
                            {
                                id: 'focus_destiny',
                                name: 'Destiny Engine',
                                description: '+1 Focus with improved rewards and crits.',
                                cost: 1,
                                prerequisites: ['focus_hawkeye'],
                                bonuses: {
                                    stats: { focus: 1 },
                                    perks: { critChanceBonus: 0.05, dropChanceBonus: 0.04, xpBonus: 0.05, creditBonus: 0.05 }
                                },
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

const LEGACY_STAT_KEY_MAP = {
    attack: 'strength',
    defense: 'vitality',
    agility: 'speed',
    luck: 'focus'
};

const LEGACY_NODE_ID_MAP = {
    attack_mastery: 'strength_mastery',
    attack_core: 'strength_core',
    attack_overdrive: 'strength_overdrive',
    attack_plasma_forge: 'strength_plasma_forge',
    defense_mastery: 'vitality_mastery',
    defense_core: 'vitality_core',
    defense_barrier: 'vitality_bastion',
    defense_guardian: 'vitality_guardian',
    agility_mastery: 'speed_mastery',
    agility_core: 'speed_core',
    agility_afterburn: 'speed_afterburn',
    agility_quantum: 'speed_slipstream',
    luck_mastery: 'focus_mastery',
    luck_core: 'focus_core',
    luck_hawkeye: 'focus_hawkeye',
    luck_destiny: 'focus_destiny'
};

const skillNodeIndex = {};
const branchNodeIds = {};

function registerSkillNode(node, branchKey, parentId = null) {
    const normalizedNode = node;
    if (!Array.isArray(normalizedNode.prerequisites)) {
        normalizedNode.prerequisites = [];
    }
    if (parentId && !normalizedNode.prerequisites.includes(parentId)) {
        normalizedNode.prerequisites = [...normalizedNode.prerequisites, parentId];
    }
    normalizedNode.branch = branchKey;
    normalizedNode.children = Array.isArray(normalizedNode.children) ? normalizedNode.children : [];
    normalizedNode.cost = typeof normalizedNode.cost === 'number' ? normalizedNode.cost : 1;
    skillNodeIndex[normalizedNode.id] = normalizedNode;
    if (!branchNodeIds[branchKey]) {
        branchNodeIds[branchKey] = [];
    }
    if (!branchNodeIds[branchKey].includes(normalizedNode.id)) {
        branchNodeIds[branchKey].push(normalizedNode.id);
    }
    normalizedNode.children.forEach(child => registerSkillNode(child, branchKey, normalizedNode.id));
}

Object.entries(skillTree).forEach(([branchKey, branch]) => {
    (branch.nodes || []).forEach(node => registerSkillNode(node, branchKey));
});

let cachedTotalStats = CORE_STATS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
let cachedPerks = {};
let cachedMasteries = {};
let cachedLevelBaseStats = CORE_STATS.reduce((acc, key) => ({ ...acc, [key]: LEVEL_BASELINE_STATS[key] || 0 }), {});

const STAT_DISPLAY_NAMES = {
    strength: 'Strength (Damage & Projectile Power)',
    speed: 'Speed (Movement & Dash)',
    vitality: 'Vitality (Shields & Sustain)',
    focus: 'Focus (Crits & Rewards)'
};

function getBaseStatsForLevel(level) {
    const safeLevel = Math.max(1, Math.floor(level || 1));
    const totals = CORE_STATS.reduce((acc, key) => {
        acc[key] = LEVEL_BASELINE_STATS[key] || 0;
        return acc;
    }, {});

    if (safeLevel <= 1) {
        CORE_STATS.forEach(stat => {
            totals[stat] = Math.floor(totals[stat]);
        });
        return totals;
    }

    for (let lvl = 2; lvl <= safeLevel; lvl++) {
        const tier = LEVEL_STAT_TIERS.find(entry => lvl <= entry.maxLevel) || LEVEL_STAT_TIERS[LEVEL_STAT_TIERS.length - 1];
        CORE_STATS.forEach(stat => {
            const gain = tier?.perLevel?.[stat] || 0;
            totals[stat] += gain;
        });
    }

    CORE_STATS.forEach(stat => {
        totals[stat] = Math.floor(totals[stat]);
    });

    return totals;
}

function recomputeSpecializationTotals() {
    const totals = CORE_STATS.reduce((acc, key) => {
        const baseInvested = playerData?.stats?.[key] || 0;
        const levelBase = getBaseStatsForLevel(playerData?.level || 1)[key] || 0;
        acc[key] = baseInvested + levelBase;
        return acc;
    }, {});

    const perks = {};
    const unlocked = Array.isArray(playerData?.unlockedNodes) ? playerData.unlockedNodes : [];

    const levelBaseSnapshot = getBaseStatsForLevel(playerData?.level || 1);

    unlocked.forEach(nodeId => {
        const node = skillNodeIndex[nodeId];
        if (!node || !node.bonuses) return;
        if (node.bonuses.stats) {
            Object.entries(node.bonuses.stats).forEach(([key, value]) => {
                if (!CORE_STATS.includes(key)) return;
                totals[key] = (totals[key] || 0) + value;
            });
        }
        if (node.bonuses.perks) {
            Object.entries(node.bonuses.perks).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    perks[key] = (perks[key] || 0) + value;
                }
            });
        }
    });

    const masteries = {};
    Object.entries(skillTree).forEach(([branchKey, branch]) => {
        if (!branch) return;
        const nodeIds = branchNodeIds[branchKey] || [];
        if (!nodeIds.length) {
            masteries[branchKey] = false;
            return;
        }

        const unlockedCount = nodeIds.filter(id => unlocked.includes(id)).length;
        const required = branch.mastery?.requiredUnlocked || nodeIds.length;
        const hasMastery = unlockedCount >= required;
        masteries[branchKey] = hasMastery;

        if (hasMastery && branch.mastery?.bonuses) {
            if (branch.mastery.bonuses.stats) {
                Object.entries(branch.mastery.bonuses.stats).forEach(([stat, value]) => {
                    if (!CORE_STATS.includes(stat)) return;
                    totals[stat] = (totals[stat] || 0) + value;
                });
            }
            if (branch.mastery.bonuses.perks) {
                Object.entries(branch.mastery.bonuses.perks).forEach(([key, value]) => {
                    if (typeof value === 'number') {
                        perks[key] = (perks[key] || 0) + value;
                    }
                });
            }
        }
    });

    Object.entries(STAT_SOFT_CAPS).forEach(([stat, cap]) => {
        const current = totals[stat] || 0;
        if (current > cap) {
            const overflow = current - cap;
            totals[stat] = cap + Math.sqrt(Math.max(0, overflow));
        }
    });

    cachedTotalStats = totals;
    cachedPerks = perks;
    cachedMasteries = masteries;
    cachedLevelBaseStats = levelBaseSnapshot;
    return { totals, perks, masteries, levelBase: levelBaseSnapshot };
}

function getTotalStats() {
    return { ...cachedTotalStats };
}

function getSpecializationPerks() {
    return { ...cachedPerks };
}

function getActiveMasteries() {
    return { ...cachedMasteries };
}

function getCachedLevelBaseStats() {
    return { ...cachedLevelBaseStats };
}

function isNodeUnlocked(nodeId) {
    return Array.isArray(playerData?.unlockedNodes) && playerData.unlockedNodes.includes(nodeId);
}

function prerequisitesMet(node) {
    if (!node) return false;
    const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
    return prereqs.every(prereqId => isNodeUnlocked(prereqId));
}

function canUnlockNode(node) {
    if (!node || isNodeUnlocked(node.id)) return false;
    const cost = node.cost ?? 1;
    const hasPoints = typeof playerData?.specializationPoints === 'number' && playerData.specializationPoints >= cost;
    return hasPoints && prerequisitesMet(node);
}

function unlockSpecializationNode(nodeId) {
    const node = skillNodeIndex[nodeId];
    if (!node || !canUnlockNode(node)) return;

    playerData.specializationPoints -= node.cost;
    if (!Array.isArray(playerData.unlockedNodes)) {
        playerData.unlockedNodes = [];
    }
    if (!playerData.unlockedNodes.includes(nodeId)) {
        playerData.unlockedNodes.push(nodeId);
    }

    applyStatEffects();

    if (statPointsEl) statPointsEl.textContent = playerData.specializationPoints;
    renderSkillTree();
    updateUI();
    savePlayerData();
}

function formatNodeBonuses(node) {
    const parts = [];
    if (node.bonuses?.stats) {
        Object.entries(node.bonuses.stats).forEach(([key, value]) => {
            if (!CORE_STATS.includes(key)) return;
            const label = STAT_DISPLAY_NAMES[key] || key;
            const amount = value >= 0 ? `+${value}` : value;
            parts.push(`${label}: ${amount}`);
        });
    }
    if (node.bonuses?.perks) {
        Object.entries(node.bonuses.perks).forEach(([key, value]) => {
            if (typeof value !== 'number') return;
            const percentKeys = new Set([
                'damageMultiplier',
                'fireRateBonus',
                'movementSpeed',
                'dashCooldownMultiplier',
                'critChanceBonus',
                'dropChanceBonus',
                'damageReduction',
                'evasionBonus',
                'xpBonus',
                'creditBonus'
            ]);
            const perkLabels = {
                damageMultiplier: 'Damage Bonus',
                fireRateBonus: 'Fire Rate',
                movementSpeed: 'Movement Speed',
                dashCooldownMultiplier: 'Dash Cooldown',
                critChanceBonus: 'Crit Chance',
                dropChanceBonus: 'Drop Chance',
                damageReduction: 'Damage Reduction',
                evasionBonus: 'Evasion',
                xpBonus: 'XP Gain',
                creditBonus: 'Credit Gain'
            };
            if (percentKeys.has(key)) {
                const label = perkLabels[key] || key.replace(/([A-Z])/g, ' $1');
                parts.push(`${label}: ${(value * 100).toFixed(0)}%`);
            } else if (key === 'shieldDurationBonus') {
                parts.push('Shield Duration +' + value + 'ms');
            } else if (key === 'critMultiplierBonus') {
                parts.push('Crit Multiplier +' + value.toFixed(2));
            } else if (key === 'extraPierce') {
                parts.push('Pierce +' + value);
            } else if (key === 'projectileSize') {
                parts.push('Projectile Size +' + Math.round(value * 100) + '%');
            } else if (key === 'guardChance') {
                parts.push('Guard Chance ' + Math.round(value * 100) + '%');
            }
        });
    }
    return parts.join(' • ');
}

function createSkillNodeElement(node, depth = 0) {
    const container = document.createElement('div');
    container.className = `skill-node depth-${depth}`;

    const unlocked = isNodeUnlocked(node.id);
    const prerequisitesSatisfied = prerequisitesMet(node);

    if (unlocked) container.classList.add('unlocked');
    if (!prerequisitesSatisfied && !unlocked) container.classList.add('locked');

    const header = document.createElement('div');
    header.className = 'skill-node-header';

    const button = document.createElement('button');
    button.textContent = unlocked ? `${node.name} ✓` : `${node.name} (-${node.cost})`;
    button.disabled = unlocked || !canUnlockNode(node);
    if (!unlocked) {
        button.addEventListener('click', () => unlockSpecializationNode(node.id));
        if (!prerequisitesSatisfied) {
            button.title = 'Unlock prerequisite nodes first';
        } else if ((playerData.specializationPoints || 0) < node.cost) {
            button.title = 'Not enough specialization points';
        }
    } else {
        button.title = 'Specialization unlocked';
    }

    const description = document.createElement('p');
    description.className = 'skill-node-description';
    description.textContent = node.description;

    const bonusesText = formatNodeBonuses(node);
    const bonusesEl = document.createElement('p');
    bonusesEl.className = 'skill-node-bonuses';
    bonusesEl.textContent = bonusesText;

    const requirementEl = document.createElement('p');
    requirementEl.className = 'skill-node-requirements';
    if (node.prerequisites && node.prerequisites.length) {
        const names = node.prerequisites
            .map(id => skillNodeIndex[id]?.name)
            .filter(Boolean)
            .join(', ');
        requirementEl.textContent = `Requires: ${names}`;
    } else {
        requirementEl.textContent = 'Requires: None';
    }

    header.appendChild(button);
    container.appendChild(header);
    container.appendChild(description);
    if (bonusesText) container.appendChild(bonusesEl);
    container.appendChild(requirementEl);

    if (Array.isArray(node.children) && node.children.length) {
        const childrenWrapper = document.createElement('div');
        childrenWrapper.className = 'skill-node-children';
        node.children.forEach(child => {
            childrenWrapper.appendChild(createSkillNodeElement(child, depth + 1));
        });
        container.appendChild(childrenWrapper);
    }

    return container;
}

function renderSkillTree() {
    if (!statOptionsEl) return;

    if (!Array.isArray(playerData.unlockedNodes)) {
        playerData.unlockedNodes = [];
    }

    statOptionsEl.innerHTML = '';
    if (statPointsEl) statPointsEl.textContent = playerData.specializationPoints;

    const { totals, masteries, levelBase } = recomputeSpecializationTotals();
    const summaryWrapper = document.createElement('div');
    summaryWrapper.className = 'skill-summary';
    const formatStat = value => {
        if (!Number.isFinite(value)) return '0';
        const rounded = Math.round(value);
        return Math.abs(value - rounded) < 0.01 ? String(rounded) : value.toFixed(1);
    };

    CORE_STATS.forEach(key => {
        const total = totals[key] || 0;
        const baseInvested = playerData.stats?.[key] || 0;
        const levelContribution = levelBase?.[key] || 0;
        const specializationBonus = total - baseInvested - levelContribution;
        const statLine = document.createElement('div');
        statLine.className = 'skill-summary-line';
        const breakdown = [`Invested ${formatStat(baseInvested)}`, `Level ${formatStat(levelContribution)}`];
        if (Math.abs(specializationBonus) > 0.01) {
            breakdown.push(`Tree ${formatStat(specializationBonus)}`);
        }
        statLine.textContent = `${STAT_DISPLAY_NAMES[key]}: ${formatStat(total)} (${breakdown.join(' + ')})`;
        summaryWrapper.appendChild(statLine);
    });

    const masterySummary = document.createElement('div');
    masterySummary.className = 'skill-masteries';
    const activeMasteries = Object.entries(skillTree)
        .filter(([branchKey]) => masteries?.[branchKey])
        .map(([branchKey, branch]) => branch.mastery?.name || branch.label);
    if (activeMasteries.length) {
        masterySummary.textContent = `Active Masteries: ${activeMasteries.join(', ')}`;
    } else {
        masterySummary.textContent = 'No masteries active yet. Unlock every node in a branch to activate its mastery bonus.';
    }
    summaryWrapper.appendChild(masterySummary);

    statOptionsEl.appendChild(summaryWrapper);

    const unlockedNodes = Array.isArray(playerData.unlockedNodes) ? playerData.unlockedNodes : [];

    Object.entries(skillTree).forEach(([branchKey, branch]) => {
        const branchEl = document.createElement('div');
        branchEl.className = 'skill-branch';

        const title = document.createElement('h4');
        title.textContent = branch.label;
        branchEl.appendChild(title);

        if (branch.description) {
            const desc = document.createElement('p');
            desc.className = 'skill-branch-description';
            desc.textContent = branch.description;
            branchEl.appendChild(desc);
        }

        const nodesContainer = document.createElement('div');
        nodesContainer.className = 'skill-node-container';
        (branch.nodes || []).forEach(node => {
            nodesContainer.appendChild(createSkillNodeElement(node));
        });

        branchEl.appendChild(nodesContainer);
        if (branch.mastery) {
            const masteryInfo = document.createElement('p');
            masteryInfo.className = `skill-branch-mastery ${masteries?.[branchKey] ? 'active' : 'inactive'}`;
            const nodeIds = branchNodeIds[branchKey] || [];
            const unlockedCount = nodeIds.filter(id => unlockedNodes.includes(id)).length;
            const required = branch.mastery.requiredUnlocked || nodeIds.length;
            if (masteries?.[branchKey]) {
                masteryInfo.textContent = `Mastery Active: ${branch.mastery.name} — ${branch.mastery.description}`;
            } else {
                masteryInfo.textContent = `Mastery Progress ${unlockedCount}/${required}: ${branch.mastery.description}`;
            }
            branchEl.appendChild(masteryInfo);
        }
        statOptionsEl.appendChild(branchEl);
    });

    if (playerData.specializationPoints <= 0) {
        const hint = document.createElement('p');
        hint.className = 'skill-hint';
        hint.textContent = 'Earn more specialization points by leveling up or completing quests to unlock additional nodes.';
        statOptionsEl.appendChild(hint);
    }
}

const SPRITE_DIRECTORY = 'assets/sprites/';
const PROJECTILE_ASSETS = {
    bolt: 'assets/projectiles/plasma-bolt.svg',
    beam: 'assets/projectiles/plasma-beam.svg'
};

const POWERUP_ASSETS = {
    speed: 'assets/powerups/speed-thruster.svg',
    rapid: 'assets/powerups/rapid-cascade.svg',
    shield: 'assets/powerups/arc-shield.svg',
    life: 'assets/powerups/life-heart.svg',
    spread: 'assets/powerups/spread-array.svg',
    homing: 'assets/powerups/homing-orb.svg',
    pierce: 'assets/powerups/pierce-spike.svg',
    ultra_dash: 'assets/powerups/ultra-dash.svg',
    default: 'assets/powerups/mystery-core.svg'
};

const SPACECRAFT_CATALOG = [
    {
        id: 'astro-pioneer',
        name: 'Astro Pioneer',
        description: 'Reliable starter craft that every pilot begins with.',
        cost: 0,
        rarity: 'starter',
        fileName: 'astro-pioneer.png',
        fallbackColors: { primary: '#6ff0ff', secondary: '#ffffff', accent: '#ff8bff' }
    },
    {
        id: 'nova-striker',
        name: 'Nova Striker',
        description: 'Aggressive strike craft with blazing exhaust trails.',
        cost: 350,
        rarity: 'rare',
        fileName: 'nova-striker.png',
        fallbackColors: { primary: '#ff6b6b', secondary: '#ffd166', accent: '#ffe66d' }
    },
    {
        id: 'lunar-shadow',
        name: 'Lunar Shadow',
        description: 'Stealthy interceptor that leaves a prismatic shimmer.',
        cost: 550,
        rarity: 'legendary',
        fileName: 'lunar-shadow.png',
        fallbackColors: { primary: '#9c6bff', secondary: '#e6e7ff', accent: '#6bf1ff' }
    }
];

const SPRITE_RARITY_LABELS = {
    starter: 'Starter',
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary'
};

const spriteImageCache = {};

function createSpriteFallback(colors = {}) {
    const { primary = '#6ff0ff', secondary = '#ffffff', accent = '#ff8bff' } = colors;
    const size = 64;
    const canvasSprite = document.createElement('canvas');
    canvasSprite.width = size;
    canvasSprite.height = size;
    const ctx2d = canvasSprite.getContext('2d');

    ctx2d.clearRect(0, 0, size, size);

    ctx2d.fillStyle = secondary;
    ctx2d.beginPath();
    ctx2d.moveTo(size * 0.5, size * 0.1);
    ctx2d.lineTo(size * 0.7, size * 0.35);
    ctx2d.lineTo(size * 0.3, size * 0.35);
    ctx2d.closePath();
    ctx2d.fill();

    ctx2d.fillStyle = primary;
    ctx2d.beginPath();
    ctx2d.moveTo(size * 0.5, size * 0.12);
    ctx2d.lineTo(size * 0.88, size * 0.55);
    ctx2d.lineTo(size * 0.5, size * 0.92);
    ctx2d.lineTo(size * 0.12, size * 0.55);
    ctx2d.closePath();
    ctx2d.fill();

    ctx2d.fillStyle = accent;
    ctx2d.beginPath();
    ctx2d.ellipse(size * 0.5, size * 0.48, size * 0.16, size * 0.2, 0, 0, Math.PI * 2);
    ctx2d.fill();

    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(size * 0.47, size * 0.25, size * 0.06, size * 0.18);

    ctx2d.fillStyle = '#ffd166';
    ctx2d.fillRect(size * 0.38, size * 0.82, size * 0.08, size * 0.12);
    ctx2d.fillRect(size * 0.54, size * 0.82, size * 0.08, size * 0.12);

    return canvasSprite.toDataURL('image/png');
}

function getSpriteMeta(spriteId) {
    return SPACECRAFT_CATALOG.find(sprite => sprite.id === spriteId) || SPACECRAFT_CATALOG[0];
}

function getSpriteDisplayName(spriteId) {
    const meta = getSpriteMeta(spriteId);
    return meta ? meta.name : spriteId;
}

function getSpriteFallback(meta) {
    if (!meta) return null;
    if (!meta.fallbackDataUrl) {
        meta.fallbackDataUrl = createSpriteFallback(meta.fallbackColors || {});
    }
    return meta.fallbackDataUrl;
}

function ensureSpriteProgression() {
    if (!Array.isArray(playerData.ownedSprites)) {
        playerData.ownedSprites = [DEFAULT_SPRITE_ID];
    }
    if (!playerData.ownedSprites.includes(DEFAULT_SPRITE_ID)) {
        playerData.ownedSprites.unshift(DEFAULT_SPRITE_ID);
    }
    if (!playerData.activeSpriteId || !playerData.ownedSprites.includes(playerData.activeSpriteId)) {
        playerData.activeSpriteId = DEFAULT_SPRITE_ID;
    }
}

function applySpriteImage(meta) {
    if (!meta) return;
    const cached = spriteImageCache[meta.id];
    if (cached && !cached.isFallback) {
        playerImg = cached;
        whenImageReady(cached, (img) => {
            updatePlayerSpriteMetrics(img);
            updateTailLength();
        });
        return;
    }
    const fallbackSrc = getSpriteFallback(meta);
    if (fallbackSrc) {
        const fallbackImage = new Image();
        fallbackImage.isFallback = true;
        fallbackImage.onload = () => {
            spriteImageCache[meta.id] = fallbackImage;
            if (playerData.activeSpriteId === meta.id) {
                playerImg = fallbackImage;
                updatePlayerSpriteMetrics(fallbackImage);
                updateTailLength();
            }
        };
        fallbackImage.src = fallbackSrc;
        spriteImageCache[meta.id] = fallbackImage;
        playerImg = fallbackImage;
    } else {
        playerImg = null;
        updatePlayerSpriteMetrics(null);
    }

    if (meta.fileName) {
        const assetImage = new Image();
        assetImage.src = `${SPRITE_DIRECTORY}${meta.fileName}`;
        assetImage.onload = () => {
            assetImage.isFallback = false;
            spriteImageCache[meta.id] = assetImage;
            if (playerData.activeSpriteId === meta.id) {
                playerImg = assetImage;
                updatePlayerSpriteMetrics(assetImage);
                updateTailLength();
            }
        };
        assetImage.onerror = () => {
            spriteImageCache[meta.id] = spriteImageCache[meta.id] || playerImg;
        };
    }
}

function setActiveSprite(spriteId, options = {}) {
    const { skipSave = false, skipUI = false } = options;
    ensureSpriteProgression();
    const meta = getSpriteMeta(spriteId);
    playerData.activeSpriteId = meta.id;
    if (!playerData.ownedSprites.includes(meta.id)) {
        playerData.ownedSprites.push(meta.id);
    }
    applySpriteImage(meta);
    if (!skipUI) {
        updateHubUI();
    }
    if (!skipSave) {
        savePlayerData();
    }
}

function initializeSpriteSystem() {
    ensureSpriteProgression();
    setActiveSprite(playerData.activeSpriteId, { skipSave: true });
}

let currentShopOptions = [];

const DASH_WINDOW = 300; const DASH_DURATION = 500;
const DASH_SPEED_MULTIPLIER = 2.6;
const DASH_CONTROL_BLEND = 0.6;
const DASH_EASING_POWER = 0.5;
const DASH_ACCELERATION_MULTIPLIER = 2.2;

const player = {
    x: Math.round(BASE_CANVAS_WIDTH * 0.08),
    y: gameCanvas.height / 2 - playerSpriteDimensions.height / 2,
    width: playerSpriteDimensions.width,
    height: playerSpriteDimensions.height,
    speed: 8,
    baseSpeed: 8,
    dx: 0,
    dy: 0,
    damageMultiplier: 1, vitalityRating: 0, focusRating: 0, critChance: 0, critMultiplier: 2.0,
    maxHP: 120,
    currentHP: 120,
    damageReduction: 0,
    evasionChance: 0,
    xpGainMultiplier: 1,
    creditGainMultiplier: 1,
    specialPerks: {
        dashCooldownFactor: 1,
        fireRateBonus: 0,
        movementSpeed: 1,
        projectileSize: 0,
        extraPierce: 0,
        shieldDurationBonus: 0,
        guardChance: 0,
        dropChanceBonus: 0,
        damageReduction: 0,
        evasionBonus: 0,
        xpBonus: 0,
        creditBonus: 0
    }
};

applyStatEffects();
clampPlayerToPlayfield();

function prepareProjectile(proj) {
    if (!proj || typeof proj !== 'object') return;

    if (proj.baseDamage === undefined) {
        const numericDamage = typeof proj.damage === 'number' && !Number.isNaN(proj.damage)
            ? proj.damage
            : 1;
        proj.baseDamage = numericDamage;
    }

    if (proj.baseWidth === undefined) {
        const numericWidth = typeof proj.width === 'number' && proj.width > 0 ? proj.width : 8;
        proj.baseWidth = numericWidth;
    }

    if (proj.baseHeight === undefined) {
        const numericHeight = typeof proj.height === 'number' && proj.height > 0 ? proj.height : 4;
        proj.baseHeight = numericHeight;
    }

    if (!proj.isBeam && !proj.scaledForAttack) {
        const stats = getTotalStats();
        const perks = player.specialPerks || {};
        const strengthStat = stats.strength ?? 0;
        const widthScale = 1 + strengthStat * 0.1 + (perks.projectileSize || 0);
        proj.width = proj.baseWidth * widthScale;
        proj.height = proj.baseHeight;
        proj.scaledForAttack = true;
    }

    if (!proj.spriteKey) {
        proj.spriteKey = proj.isBeam ? 'beam' : 'bolt';
    }
}
const keys = {}; let joystickActive = false; let joystickDelta = { x: 0, y: 0 };
let joystickSmoothed = { x: 0, y: 0 };
const JOYSTICK_SMOOTHING = 0.15;
const PLAYER_ACCELERATION = 12;
const PLAYER_FRICTION = 0.86;
const lastKeyTime = {};

// Keyboard shooting helpers
let lastShotTime = 0;
const BASE_SHOT_INTERVAL = 250; // in ms
const RAPID_SHOT_INTERVAL = 120;
const DASH_VECTORS = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }
};

function getActiveSpeedMultiplier() {
    if (!activeSpeedBuffs.size) return 1;
    let total = 1;
    activeSpeedBuffs.forEach(multiplier => {
        if (typeof multiplier === 'number' && Number.isFinite(multiplier)) {
            total *= multiplier;
        }
    });
    return total;
}

function getCurrentPlayerSpeed() {
    const base = typeof player.baseSpeed === 'number' && Number.isFinite(player.baseSpeed)
        ? player.baseSpeed
        : (typeof player.speed === 'number' && Number.isFinite(player.speed) ? player.speed : 6);
    const finalSpeed = base * getActiveSpeedMultiplier();
    player.speed = finalSpeed;
    return finalSpeed;
}

function registerSpeedModifier(multiplier, duration, source = 'modifier') {
    if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) {
        return null;
    }

    const modifierId = `${source}_${Date.now()}_${speedModifierSequence++}`;
    activeSpeedBuffs.set(modifierId, multiplier);
    getCurrentPlayerSpeed();

    if (typeof duration !== 'number' || duration <= 0) {
        return { modifierId, timeoutEntry: null };
    }

    const timeoutEntry = {
        id: null,
        cleanup: () => {
            activeSpeedBuffs.delete(modifierId);
            getCurrentPlayerSpeed();
        }
    };

    const timeoutId = setTimeout(() => {
        timeoutEntry.cleanup();
        powerupTimeouts = powerupTimeouts.filter(entry => entry !== timeoutEntry);
    }, duration);

    timeoutEntry.id = timeoutId;
    powerupTimeouts.push(timeoutEntry);

    return { modifierId, timeoutEntry };
}

function clearSpeedModifiers() {
    if (activeSpeedBuffs.size === 0) {
        getCurrentPlayerSpeed();
        return;
    }
    activeSpeedBuffs.clear();
    getCurrentPlayerSpeed();
}

function resetKeyState() {
    Object.keys(keys).forEach(code => {
        keys[code] = false;
    });
    isCharging = false;
    chargeStartTime = 0;
    dashDirection = null;
    dashActive = false;
    dashEndTime = 0;
    dashDurationMs = 0;
}

function findNearestEnemy() {
    if (!enemies.length) return null;
    let nearest = null;
    let nearestDist = Infinity;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    enemies.forEach(enemy => {
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const dist = Math.hypot(enemyCenterX - playerCenterX, enemyCenterY - playerCenterY);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = { enemy, x: enemyCenterX, y: enemyCenterY };
        }
    });
    return nearest;
}

function spawnProjectile(config = {}) {
    const projectile = {
        x: player.x + player.width - 4,
        y: player.y + player.height / 2 - (config.height || 4) / 2,
        width: config.width || 10,
        height: config.height || 4,
        speed: config.speed || 12,
        dy: config.dy || 0,
        damage: config.damage ?? 1,
        hits: config.hits ?? 1,
        isBeam: Boolean(config.isBeam),
        targetX: config.targetX ?? null,
        targetY: config.targetY ?? null,
        scaledForAttack: false,
        spriteKey: config.spriteKey || (config.isBeam ? 'beam' : 'bolt')
    };
    projectiles.push(projectile);
}

function triggerDash(directionKey) {
    const now = Date.now();
    const stats = getTotalStats();
    const perks = player.specialPerks || {};
    const speedCooldownReduction = (stats.speed || 0) * 55;
    const baseDuration = Math.max(450, DASH_COOLDOWN_DURATION - speedCooldownReduction);
    const perkAdjusted = baseDuration * (perks.dashCooldownFactor || 1);
    const finalCooldown = ultraDashActive ? perkAdjusted / 2 : perkAdjusted;
    if (dashActive || dashCooldown > now || gamePaused) return;

    dashActive = true;
    dashCooldown = now + finalCooldown;
    dashDirection = directionKey;

    const keyVector = DASH_VECTORS[directionKey];
    let vector = keyVector || lastMovementInput;
    const magnitude = Math.hypot(vector?.x || 0, vector?.y || 0);
    if (!vector || magnitude === 0) {
        vector = lastMovementInput.x !== 0 || lastMovementInput.y !== 0 ? lastMovementInput : { x: 1, y: 0 };
    }
    const normalizedMag = Math.hypot(vector.x, vector.y) || 1;
    dashVector = { x: vector.x / normalizedMag, y: vector.y / normalizedMag };
    lastMovementInput = { ...dashVector };

    dashDurationMs = Math.max(150, Math.min(DASH_DURATION, finalCooldown / 3));
    dashEndTime = now + dashDurationMs;

    emitParticles(player.x, player.y, 6, true);
}

function maybeTriggerDash(code) {
    const now = Date.now();
    const previous = lastKeyTime[code] || 0;
    lastKeyTime[code] = now;
    if (now - previous <= DASH_WINDOW) {
        triggerDash(code);
    }
}

function startCharge() {
    if (!gameRunning || gamePaused || isCharging) return;
    isCharging = true;
    chargeStartTime = Date.now();
}

function releaseCharge() {
    if (!isCharging) return;
    const now = Date.now();
    const heldFor = now - chargeStartTime;
    isCharging = false;
    chargeStartTime = 0;
    fireShot(Math.min(1, heldFor / 1500));
}

function fireShot(chargeLevel = 0) {
    if (!gameRunning || gamePaused) return;
    const now = Date.now();
    const stats = getTotalStats();
    const perks = player.specialPerks || {};
    const speedBonus = (stats.speed || 0) * 18;
    const baseInterval = rapidFire ? RAPID_SHOT_INTERVAL : BASE_SHOT_INTERVAL;
    const fireRateFactor = Math.max(0.3, 1 - (perks.fireRateBonus || 0));
    const finalInterval = Math.max(70, (baseInterval - speedBonus) * fireRateFactor);

    if (chargeLevel === 0 && now - lastShotTime < finalInterval) {
        return;
    }
    lastShotTime = now;

    const strengthStat = stats.strength || 0;
    const baseDamage = 1 + strengthStat;
    const damageMultiplier = 1 + chargeLevel * 2;
    const projectileDamage = baseDamage * damageMultiplier * (player.damageMultiplier || 1);
    const projectileSpeed = 12 + chargeLevel * 6;
    const isBeam = chargeLevel >= 0.95;
    const extraPierce = perks.extraPierce || 0;
    const pierceHits = pierceActive || isBeam ? 3 + Math.floor(chargeLevel * 2) + extraPierce : 1 + extraPierce;

    const nearest = homingActive ? findNearestEnemy() : null;

    const projectilesToSpawn = [];

    if (isBeam) {
        projectilesToSpawn.push({
            width: 30,
            height: player.height,
            speed: projectileSpeed,
            damage: projectileDamage * 0.5,
            hits: pierceHits,
            isBeam: true,
            targetX: nearest ? nearest.x : null,
            targetY: nearest ? nearest.y : null,
            spriteKey: 'beam'
        });
    } else {
        const baseConfig = {
            width: 10 + chargeLevel * 4,
            height: 4 + chargeLevel * 2,
            speed: projectileSpeed,
            damage: projectileDamage,
            hits: pierceHits,
            targetX: nearest ? nearest.x : null,
            targetY: nearest ? nearest.y : null,
            spriteKey: 'bolt'
        };

        projectilesToSpawn.push({ ...baseConfig, dy: 0 });

        if (spreadActive) {
            projectilesToSpawn.push({ ...baseConfig, dy: -3 - chargeLevel * 2 });
            projectilesToSpawn.push({ ...baseConfig, dy: 3 + chargeLevel * 2 });
        }
    }

    projectilesToSpawn.forEach(spawnProjectile);
    emitParticles(player.x, player.y, isBeam ? 12 : 4, false, chargeLevel > 0);
}

function isElementVisible(element) {
    if (!element) return false;
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        return window.getComputedStyle(element).display !== 'none';
    }
    return element.style ? element.style.display !== 'none' : false;
}

function handleKeyDown(event) {
    const { code } = event;

    if (code === 'Escape') {
        const overlayHandlers = [
            { element: profileModalEl, handler: hideProfileModal },
            { element: shopEl, handler: skipShop },
            { element: hubEl, handler: showStartMenu },
            { element: startMenuEl, handler: hideAllOverlays }
        ];

        for (const { element, handler } of overlayHandlers) {
            if (isElementVisible(element)) {
                event.preventDefault();
                handler();
                return;
            }
        }

        return;
    }

    if (code === 'KeyK') {
        event.preventDefault();
        if (isElementVisible(statAllocationEl)) {
            showHub();
        } else if (walletPublicKey && (isElementVisible(hubEl) || !gameRunning)) {
            showStatAllocation();
        }
        return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        event.preventDefault();
    }

    keys[code] = true;

    if (event.repeat) {
        return;
    }

    if (!gameRunning || gamePaused) {
        return;
    }

    if (code === 'Space') {
        startCharge();
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(code)) {
        const canonical = code.startsWith('Key')
            ? ({ KeyA: 'ArrowLeft', KeyD: 'ArrowRight', KeyW: 'ArrowUp', KeyS: 'ArrowDown' }[code] || code)
            : code;
        maybeTriggerDash(canonical);
    }
}

function handleKeyUp(event) {
    const { code } = event;
    keys[code] = false;

    if (code === 'Space') {
        event.preventDefault();
        releaseCharge();
    }
}

const POWERUP_VISUALS = {
    speed: { color: '#ff9f1c', letter: 'S', asset: POWERUP_ASSETS.speed, glowColor: '#ffb347' },
    rapid: { color: '#ffe066', letter: 'R', asset: POWERUP_ASSETS.rapid, glowColor: '#ffd479' },
    shield: { color: '#4dabf7', letter: 'D', asset: POWERUP_ASSETS.shield, glowColor: '#7dd3ff' },
    life: { color: '#fa5252', letter: '♥', asset: POWERUP_ASSETS.life, glowColor: '#ff8ea1' },
    spread: { color: '#845ef7', letter: 'W', asset: POWERUP_ASSETS.spread, glowColor: '#b59aff' },
    homing: { color: '#3bc9db', letter: 'H', asset: POWERUP_ASSETS.homing, glowColor: '#79f2ff' },
    pierce: { color: '#e64980', letter: 'P', asset: POWERUP_ASSETS.pierce, glowColor: '#ff85b8' },
    ultra_dash: { color: '#ffd43b', letter: 'U', asset: POWERUP_ASSETS.ultra_dash, glowColor: '#ffe380' },
    default: { color: '#ffffff', letter: '?', asset: POWERUP_ASSETS.default, glowColor: '#9fa9ff' }
};

const framesToMs = (frames) => frames * FRAME_MS;

// ====================================================================
// SECTION A: CORE UTILITY AND UI UPDATE FUNCTIONS (DEFINED FIRST)
// ====================================================================

function rectOverlap(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

function updateTailLength() {
    const targetLength = Math.min(20, Math.floor(score / 100) + 1);
    while (tail.length > targetLength) { tail.pop(); }
}

function emitParticles(x, y, count = 3, isDash = false, isCharge = false) {
    const emitCount = (isDash ? 5 : count) + (isCharge ? 2 : 0) + (killStreak >= COMBO_THRESHOLD ? 3 : 0);
    for (let i = 0; i < emitCount; i++) {
        if (particles.length < 200) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() - 0.5) * (isDash ? 4 : isCharge ? 3 : 2);
            const baseLife = framesToMs(isCharge ? 50 : 30);
            particles.push({
                x: x + player.width / 2,
                y: y + player.height / 2,
                vx: Math.cos(angle) * speed - player.dx * 0.5,
                vy: Math.sin(angle) * speed - player.dy * 0.5,
                life: baseLife,
                maxLife: baseLife,
                size: Math.random() * 4 + 2,
                color: isDash ? '#ffff00' : isCharge ? '#ff00ff' : `hsl(${Math.random() * 60 + 100}, 100%, 50%)`
            });
        }
    }
}

function updateParticles() {
    const damping = Math.pow(0.98, deltaMultiplier);
    const elapsedMs = deltaTime * 1000;
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * deltaMultiplier;
        p.y += p.vy * deltaMultiplier;
        p.life -= elapsedMs;
        p.vx *= damping;
        p.vy *= damping;
        if (p.life <= 0) { particles.splice(i, 1); }
    }
}

function drawParticles() {
    particles.forEach(p => {
        const alpha = Math.max(0, p.life / p.maxLife);
        gameCtx.save();
        gameCtx.globalAlpha = alpha;
        gameCtx.fillStyle = p.color;
        gameCtx.beginPath();
        gameCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.restore();
    });
}

function updateStarfield() {
    starField.forEach(star => {
        star.x -= star.speed * deltaTime;
        if (star.x < -star.size) {
            star.x = gameCanvas.width + star.size;
            star.y = Math.random() * gameCanvas.height;
            star.twinkle = Math.random() * Math.PI * 2;
        }
        star.twinkle += deltaTime * 2;
    });
}

function updateUI() {
    if (scoreEl && uiCache.score !== score) {
        uiCache.score = score;
        scoreEl.textContent = `Score: ${score}`;
    }
    if (creditsEl && uiCache.credits !== credits) {
        uiCache.credits = credits;
        creditsEl.textContent = `Credits: ${credits}`;
    }
    if (livesEl && uiCache.lives !== lives) {
        uiCache.lives = lives;
        livesEl.textContent = `Lives: ${lives}`;
    }
    const nextLevelXP = getXPForNextLevel(playerData.level);
    const xpPortion = nextLevelXP === Infinity ? 'MAX' : `${playerData.currentXP}/${nextLevelXP}`;
    const restedText = playerData.restedXP > 0 ? ` | Rested ${Math.floor(playerData.restedXP)}` : '';
    const levelText = nextLevelXP === Infinity
        ? `Level: ${playerData.level} (MAX)${restedText}`
        : `Level: ${playerData.level} (XP: ${xpPortion}${restedText})`;
    if (levelEl && uiCache.levelText !== levelText) {
        uiCache.levelText = levelText;
        levelEl.textContent = levelText;
    }
    if (comboEl && uiCache.combo !== killStreak) {
        uiCache.combo = killStreak;
        comboEl.textContent = `Combo: ${killStreak}`;
    }
    if (shopCreditsEl && uiCache.shopCredits !== credits) {
        uiCache.shopCredits = credits;
        shopCreditsEl.textContent = credits;
    }
    if (statusClockEl) {
        const now = Date.now();
        if (now - lastClockUpdate >= 1000) {
            lastClockUpdate = now;
            const formatted = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            statusClockEl.textContent = formatted;
        }
    }
}

function updateQuestsUI() {
    const questsEl = document.getElementById('daily-quests');
    if (!questsEl) return;
    
    const staticTitle = questsEl.querySelector('h4') || document.createElement('h4');
    staticTitle.textContent = 'Daily Missions';
    questsEl.innerHTML = '';
    questsEl.appendChild(staticTitle);
    
    playerData.daily.quests.forEach(quest => {
        let statusText = '';
        if (quest.completed) {
            statusText = '✅ Claimed';
        } else if (quest.progress >= quest.target) {
            statusText = `Ready to Claim!`;
        } else {
            statusText = `Progress: ${quest.progress}/${quest.target}`;
        }
        
        let rewardText;
        if (quest.reward.type === 'credits') {
            rewardText = `+${quest.reward.amount} Cr`;
        } else if (quest.reward.type === 'xpBonus') {
            rewardText = `+${quest.reward.amount} XP`;
        } else if (quest.reward.type === 'specializationPoint' || quest.reward.type === 'levelPoint') {
            const suffix = quest.reward.amount === 1 ? 'Spec Point' : 'Spec Points';
            rewardText = `+${quest.reward.amount} ${suffix}`;
        } else {
            rewardText = 'Special Reward';
        }

        const div = document.createElement('div');
        div.className = `quest-entry ${quest.completed ? 'completed' : (quest.progress >= quest.target ? 'ready-to-claim' : '')}`;
        div.innerHTML = `
            <p>${quest.desc}</p>
            <p class="reward-text">Reward: ${rewardText}</p>
            <p class="status-text">${statusText}</p>
            <button onclick="claimQuestReward('${quest.id}')" ${quest.completed || quest.progress < quest.target ? 'disabled' : ''}>Claim</button>
        `;
        questsEl.appendChild(div);
    });
}

function updateGuestStatTooltip(pointsAvailableOverride) {
    if (!openStatAllocationBtn) return;

    if (walletPublicKey) {
        openStatAllocationBtn.removeAttribute('title');
        return;
    }

    const resolvedPoints = typeof pointsAvailableOverride === 'number'
        ? pointsAvailableOverride
        : (() => {
            const baseData = (typeof playerData === 'object' && playerData) ? playerData : {};
            const numericPoints = Number(baseData.specializationPoints);
            return Number.isFinite(numericPoints) ? Math.max(0, numericPoints) : 0;
        })();

    if (guestStorageAvailable) {
        openStatAllocationBtn.title = resolvedPoints > 0
            ? "Allocate specialization points (progress stored locally)."
            : "View your specialization tree (progress stored locally).";
    } else {
        openStatAllocationBtn.title = resolvedPoints > 0
            ? "Allocate specialization points (local storage unavailable; progress resets after refresh)."
            : "View your specialization tree (local storage unavailable; progress resets after refresh).";
    }
}

function updateHubUI() {
    // This helper MUST be defined early as it's called immediately by loadPlayerData and checkNFT
    const profile = playerData.profile || {};
    const nameText = profile.name && profile.name.trim() ? profile.name.trim() : 'Rookie Pilot';
    const titleText = profile.title && profile.title.trim() ? profile.title.trim() : 'Cadet';
    const bioText = profile.bio && profile.bio.trim() ? profile.bio.trim() : 'Set your pilot bio to share your legend.';
    const avatarCandidate = profile.avatar && profile.avatar.trim() ? profile.avatar.trim() : '';
    const isAvatarValid = avatarCandidate && (/^https?:\/\//i.test(avatarCandidate) || avatarCandidate.startsWith('data:'));
    const avatarSrc = isAvatarValid ? avatarCandidate : DEFAULT_PILOT_AVATAR;

    if (openProfileBtn) openProfileBtn.textContent = profile.name && profile.name.trim() ? 'Edit Pilot' : 'Create Pilot';
    if (pilotNameDisplayEl) pilotNameDisplayEl.textContent = nameText;
    if (pilotTitleDisplayEl) pilotTitleDisplayEl.textContent = titleText;
    if (pilotBioDisplayEl) pilotBioDisplayEl.textContent = bioText;
    if (pilotAvatarEl) {
        pilotAvatarEl.src = avatarSrc;
        pilotAvatarEl.alt = `${nameText} avatar`;
    }
    if (pilotNameStatEl) pilotNameStatEl.textContent = nameText;
    if (pilotTitleStatEl) pilotTitleStatEl.textContent = titleText;
    if (pilotNameStatsPanelEl) pilotNameStatsPanelEl.textContent = nameText;
    if (pilotTitleStatsPanelEl) pilotTitleStatsPanelEl.textContent = titleText;

    if (openStatAllocationBtn) {
        const numericPoints = Number(playerData.specializationPoints);
        const pointsAvailable = Number.isFinite(numericPoints) ? Math.max(0, numericPoints) : 0;
        const label = pointsAvailable > 0
            ? `Allocate Stat Points (${pointsAvailable})`
            : 'View Specialization Tree';
        openStatAllocationBtn.textContent = label;
        openStatAllocationBtn.classList.toggle('stat-button-ready', pointsAvailable > 0);
        openStatAllocationBtn.disabled = false;
        openStatAllocationBtn.removeAttribute('aria-disabled');

        updateGuestStatTooltip(pointsAvailable);
    }

    if (!walletPublicKey) return;
    if (walletAddressEl) walletAddressEl.textContent = walletPublicKey.slice(0, 8) + '...';
    if (gamesPlayedEl) gamesPlayedEl.textContent = playerData.gamesPlayed;
    if (winsEl) winsEl.textContent = playerData.wins;
    if (lossesEl) lossesEl.textContent = playerData.losses;
    if (bestScoreEl) bestScoreEl.textContent = playerData.bestScore;
    if (hubCreditsEl) hubCreditsEl.textContent = playerData.credits;
    if (statLevelHubEl) statLevelHubEl.textContent = playerData.level;
    if (statLevelOverlayEl) statLevelOverlayEl.textContent = playerData.level;
    if (statPointsEl) statPointsEl.textContent = playerData.specializationPoints;
    if (itemsEl) itemsEl.textContent = playerData.items.length ? playerData.items.join(', ') : 'None';
    ensureSpriteProgression();
    if (activeSpriteEl) activeSpriteEl.textContent = getSpriteDisplayName(playerData.activeSpriteId);
    if (ownedSpritesEl) {
        const names = playerData.ownedSprites.map(getSpriteDisplayName);
        ownedSpritesEl.textContent = names.length ? names.join(', ') : 'None';
    }
    credits = playerData.credits;
    updateUI();
    updateQuestsUI();
    loadAndDisplayLeaderboard();

    if (statAllocationEl && statAllocationEl.style.display !== 'none') {
        renderSkillTree();
    }
}

// --------------------------------------------------------------------
// CORE OVERLAY & GAME FLOW HELPERS
// --------------------------------------------------------------------

function hideAllOverlays() {
    const focusOverlayWasVisible = !!(focusPauseOverlayEl && focusPauseOverlayEl.style.display !== 'none');
    [startMenuEl, hubEl, shopEl, statAllocationEl, profileModalEl, focusPauseOverlayEl].forEach(el => {
        if (!el) return;
        el.style.display = 'none';
        if (el === focusPauseOverlayEl) {
            deactivateFocusTrap(el, { restoreFocus: false });
        } else {
            deactivateFocusTrap(el);
        }
    });
    if (focusOverlayWasVisible) {
        focusPauseActive = false;
        focusPauseShouldAutoResume = false;
        focusPauseWasRunning = false;
        focusPauseAllowResume = false;
        focusResumeEffects.length = 0;
        focusResumeHandled = false;
        focusPausePreviousStatus = DEFAULT_STATUS_VALUE_TEXT;
        focusPausePreviousTip = DEFAULT_STATUS_TIP_TEXT;
        if (statusValueEl) statusValueEl.textContent = DEFAULT_STATUS_VALUE_TEXT;
        if (statusTipEl) statusTipEl.textContent = DEFAULT_STATUS_TIP_TEXT;
    }
    if (profileErrorEl) profileErrorEl.textContent = '';
}

function populateProfileForm() {
    if (!profileForm) return;
    const profile = playerData.profile || {};
    if (profileNameInput) profileNameInput.value = profile.name || '';
    if (profileTitleInput) profileTitleInput.value = profile.title || '';
    if (profileAvatarInput) profileAvatarInput.value = profile.avatar || '';
    if (profileBioInput) profileBioInput.value = profile.bio || '';
    if (profileErrorEl) profileErrorEl.textContent = '';
}

function showProfileModal() {
    if (!profileModalEl) return;
    populateProfileForm();
    profileModalEl.style.display = 'block';
    const firstFormControl = profileForm ? profileForm.querySelector("input, select, textarea, button, [tabindex]:not([tabindex='-1'])") : null;
    activateFocusTrap(profileModalEl, { initialFocus: firstFormControl });
}

// Queue callbacks (audio replays, particle effects, etc.) so that they execute
// a single time when the game regains focus.
function queueFocusResumeEffect(effect) {
    if (typeof effect !== 'function') return;
    if (!focusPauseActive || focusResumeHandled) {
        try {
            effect();
        } catch (error) {
            console.error('Failed to process immediate focus resume effect', error);
        }
        return;
    }
    focusResumeEffects.push(effect);
}

function runFocusResumeEffects() {
    if (!focusResumeEffects.length) return;
    const pending = focusResumeEffects.splice(0, focusResumeEffects.length);
    pending.forEach(effect => {
        try {
            effect();
        } catch (error) {
            console.error('Failed to process focus resume effect', error);
        }
    });
}

function pauseGameForFocusLoss(reason = 'blur') {
    if (!gameRunning && !focusPauseActive) return;

    const wasRunning = gameRunning && !gamePaused;
    if (!wasRunning && !focusPauseActive) return;

    if (focusPauseActive) {
        focusPauseShouldAutoResume = focusPauseShouldAutoResume || wasRunning;
        return;
    }

    focusPauseActive = true;
    focusPauseShouldAutoResume = wasRunning;
    focusPauseWasRunning = wasRunning;
    focusResumeHandled = false;
    focusPauseAllowResume = false;
    focusResumeEffects.length = 0;

    focusPausePreviousStatus = statusValueEl ? statusValueEl.textContent : DEFAULT_STATUS_VALUE_TEXT;
    focusPausePreviousTip = statusTipEl ? statusTipEl.textContent : DEFAULT_STATUS_TIP_TEXT;

    if (wasRunning) {
        gamePaused = true;
    }

    if (statusValueEl) statusValueEl.textContent = FOCUS_LOSS_STATUS_TEXT;
    if (statusTipEl) statusTipEl.textContent = FOCUS_LOSS_TIP_TEXT;

    if (focusPauseTitleEl) {
        focusPauseTitleEl.textContent = reason === 'hidden' ? 'Paused · Tab Hidden' : 'Paused · Focus Lost';
    }

    if (focusPauseMessageEl) {
        const message = reason === 'hidden'
            ? 'The game paused because this tab is hidden or running in the background.'
            : 'The game paused because the window lost focus.';
        focusPauseMessageEl.textContent = `${message} Resume when you\'re ready.`;
    }

    if (focusPauseOverlayEl) {
        focusPauseOverlayEl.style.display = 'flex';
        const initialFocus = findFirstContentControl(focusPauseOverlayEl) || focusPauseOverlayEl;
        activateFocusTrap(focusPauseOverlayEl, { initialFocus, fallbackToModal: true });
    }

    queueFocusResumeEffect(() => {
        if (statusValueEl) statusValueEl.textContent = focusPausePreviousStatus || DEFAULT_STATUS_VALUE_TEXT;
        if (statusTipEl) statusTipEl.textContent = focusPausePreviousTip || DEFAULT_STATUS_TIP_TEXT;
    });

    queueFocusResumeEffect(() => {
        if (focusPauseOverlayEl) {
            focusPauseOverlayEl.style.display = 'none';
            deactivateFocusTrap(focusPauseOverlayEl, { restoreFocus: false });
        }
    });

    queueFocusResumeEffect(() => {
        if (focusPauseAllowResume && focusPauseWasRunning && gameRunning) {
            gamePaused = false;
        }
    });
}

function resumeGameFromFocusLoss({ auto = false, triggeredByUser = false } = {}) {
    if (!focusPauseActive) return;
    if (focusResumeHandled) return;
    if (auto && !focusPauseShouldAutoResume) return;

    focusResumeHandled = true;
    focusPauseAllowResume = triggeredByUser || focusPauseShouldAutoResume;

    runFocusResumeEffects();

    focusPauseActive = false;
    focusPauseShouldAutoResume = false;
    focusPauseWasRunning = false;
    focusPauseAllowResume = false;
    focusPausePreviousStatus = DEFAULT_STATUS_VALUE_TEXT;
    focusPausePreviousTip = DEFAULT_STATUS_TIP_TEXT;
    focusResumeEffects.length = 0;
}

function handleDocumentVisibilityChange() {
    if (document.hidden) {
        pauseGameForFocusLoss('hidden');
    } else {
        resumeGameFromFocusLoss({ auto: true });
    }
}

function handleWindowBlur() {
    if (document.hidden) return;
    pauseGameForFocusLoss('blur');
}

function hideProfileModal() {
    if (!profileModalEl) return;
    profileModalEl.style.display = 'none';
    deactivateFocusTrap(profileModalEl);
    if (profileErrorEl) profileErrorEl.textContent = '';
}

function handleProfileFormSubmit(event) {
    if (event) event.preventDefault();
    if (!profileForm) return;

    const name = profileNameInput ? profileNameInput.value.trim() : '';
    const title = profileTitleInput ? profileTitleInput.value.trim() : '';
    const avatar = profileAvatarInput ? profileAvatarInput.value.trim() : '';
    const bio = profileBioInput ? profileBioInput.value.trim() : '';

    let error = '';
    if (!name) {
        error = 'Pilot name is required.';
    } else if (name.length > 40) {
        error = 'Pilot name must be 40 characters or fewer.';
    } else if (title.length > 60) {
        error = 'Title must be 60 characters or fewer.';
    } else if (avatar && !/^https?:\/\//i.test(avatar) && !avatar.startsWith('data:')) {
        error = 'Avatar must be a valid URL or data URI.';
    } else if (bio.length > 280) {
        error = 'Bio must be 280 characters or fewer.';
    }

    if (error) {
        if (profileErrorEl) profileErrorEl.textContent = error;
        return;
    }

    playerData.profile = {
        name,
        title,
        avatar,
        bio
    };

    updateHubUI();
    savePlayerData();
    hideProfileModal();
}

function showStartMenu() {
    gameRunning = false;
    gamePaused = true;
    hideAllOverlays();
    if (startMenuEl) {
        startMenuEl.style.display = 'flex';
    }
    updateUI();
    updateHubUI();
    if (startMenuEl) {
        const initialFocus = findFirstContentControl(startMenuEl);
        activateFocusTrap(startMenuEl, { initialFocus });
    }
    if (playBtn && playBtn.dataset.walletLocked === 'true') {
        playBtn.disabled = false;
    }
}

function showHub() {
    gameRunning = false;
    gamePaused = true;
    hideAllOverlays();
    if (hubEl) {
        hubEl.style.display = 'flex';
    }
    updateUI();
    updateHubUI();
    loadAndDisplayLeaderboard();
    if (hubEl) {
        const initialFocus = findFirstContentControl(hubEl);
        activateFocusTrap(hubEl, { initialFocus });
    }
}

function startGame(isNewSession = true) {
    hideAllOverlays();

    gameRunning = true;
    gamePaused = false;
    bossActive = false;
    boss = null;
    dashActive = false;

    lives = MAX_LIVES;
    score = 0;
    level = 1;
    pendingLifeDamage = 0;
    enemies = [];
    projectiles = [];
    powerups = [];
    tail = [];
    particles = [];

    rapidFire = false;
    shieldActive = false;
    spreadActive = false;
    homingActive = false;
    pierceActive = false;
    ultraDashActive = false;

    killStreak = 0;
    lastKillTime = 0;
    uiCache.score = null;
    uiCache.lives = null;
    uiCache.combo = null;

    powerupTimeouts.forEach(entry => {
        if (!entry && entry !== 0) return;
        if (entry && typeof entry === 'object' && typeof entry.cleanup === 'function') {
            if (entry.id) clearTimeout(entry.id);
            entry.cleanup();
        } else {
            clearTimeout(entry);
        }
    });
    powerupTimeouts = [];
    clearSpeedModifiers();

    resetKeyState();
    lastShotTime = 0;

    flightTimeSeconds = 0;
    difficultyFactor = 1;
    enemySpawnTimer = 0;
    chargeStartTime = 0;
    isCharging = false;
    dashCooldown = 0;

    player.x = Math.round(BASE_CANVAS_WIDTH * 0.08);
    player.y = gameCanvas.height / 2 - player.height / 2;
    clampPlayerToPlayfield();

    if (typeof playerData.credits === 'number') {
        credits = playerData.credits;
        uiCache.credits = null;
        uiCache.shopCredits = null;
    }

    if (isNewSession) {
        playerData.gamesPlayed = (playerData.gamesPlayed || 0) + 1;
    }

    currentShopOptions = [];
    renderShopOptions();

    const playQuest = playerData.daily?.quests?.find(q => q.id === 'playRounds');
    if (playQuest && !playQuest.completed) {
        playQuest.progress = Math.min(playQuest.target, playQuest.progress + 1);
    }

    const spawnInterval = getSpawnIntervalSeconds();
    enemySpawnTimer = spawnInterval;
    spawnEnemy();
    enemySpawnTimer = 0;

    updateQuestsUI();
    updateUI();
    updateHubUI();
    savePlayerData();
    loadAndDisplayLeaderboard();
}

function openShop() {
    gameRunning = false;
    gamePaused = true;
    hideAllOverlays();
    if (shopEl) {
        shopEl.style.display = 'flex';
    }
    renderShopOptions();
    updateUI();
    updateHubUI();
    if (shopEl) {
        const initialFocus = findFirstContentControl(shopEl);
        activateFocusTrap(shopEl, { initialFocus });
    }
}

function rollUpgrade(tier) {
    const config = SHOP_ROLL_CONFIG[tier];
    if (!config) return;
    if (credits < config.cost) { return; }

    credits -= config.cost;
    playerData.credits = credits;
    uiCache.credits = null;
    uiCache.shopCredits = null;

    currentShopOptions = [];
    for (let i = 0; i < config.rolls; i++) {
        const rarity = pickRarity(config.rarityWeights);
        const pool = upgradePools[rarity] || [];
        if (pool.length === 0) continue;
        const type = pool[Math.floor(Math.random() * pool.length)];
        const detail = UPGRADE_DETAILS[type] || { name: type, description: 'Temporary boost.' };
        currentShopOptions.push({
            id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type,
            rarity,
            cost: SHOP_RARITY_COSTS[rarity] || SHOP_RARITY_COSTS.common,
            label: detail.name,
            description: detail.description
        });
    }

    renderShopOptions();
    updateUI();
    updateHubUI();
    savePlayerData();
    loadAndDisplayLeaderboard();
}

function skipShop() {
    currentShopOptions = [];
    renderShopOptions();
    showHub();
}

function handleGameOver() {
    if (!gameRunning) return;

    gameRunning = false;
    gamePaused = true;
    bossActive = false;
    boss = null;
    dashActive = false;

    const rewardCredits = Math.max(0, Math.floor(score / 5) + level * 10);
    const creditBonus = Math.max(0, player.specialPerks?.creditBonus || 0);
    const creditMultiplier = Math.max(0.5, (player.creditGainMultiplier || 1) * (1 + creditBonus));
    const adjustedCredits = Math.max(0, Math.floor(rewardCredits * creditMultiplier));
    if (adjustedCredits > 0) {
        credits += adjustedCredits;
        uiCache.credits = null;
    }

    playerData.credits = credits;
    if (score > playerData.bestScore) {
        playerData.bestScore = score;
        playerData.wins = (playerData.wins || 0) + 1;
    } else {
        playerData.losses = (playerData.losses || 0) + 1;
    }

    savePlayerData();
    updateUI();
    updateHubUI();
    updateQuestsUI();

    const hubAnnouncementEl = document.getElementById('hub-announcement') || waveAnnounceEl;
    if (adjustedCredits > 0) {
        const bonusText = creditMultiplier !== 1 ? ` (x${creditMultiplier.toFixed(2)} bonus)` : '';
        showAnnounce(hubAnnouncementEl, `Flight complete! Salvaged +${adjustedCredits} Credits${bonusText}.`);
    } else {
        showAnnounce(hubAnnouncementEl, 'Flight complete! Ready for the next sortie.');
    }

    showHub();
}

function purchaseUpgrade(optionId) {
    const optionIndex = currentShopOptions.findIndex(option => option.id === optionId);
    if (optionIndex === -1) return;

    const option = currentShopOptions[optionIndex];
    if (credits < option.cost) return;

    credits -= option.cost;
    playerData.credits = credits;
    uiCache.credits = null;
    uiCache.shopCredits = null;

    currentShopOptions.splice(optionIndex, 1);
    playerData.items.push(option.type);
    applyPowerup(option.type);

    renderShopOptions();
    updateUI();
    updateHubUI();
    savePlayerData();
    loadAndDisplayLeaderboard();
}

function purchaseSprite(spriteId) {
    const meta = getSpriteMeta(spriteId);
    if (!meta) return;

    ensureSpriteProgression();
    const owned = playerData.ownedSprites.includes(meta.id);

    if (!owned) {
        if (credits < meta.cost) return;

        credits -= meta.cost;
        playerData.credits = credits;
        uiCache.credits = null;
        uiCache.shopCredits = null;
        playerData.ownedSprites.push(meta.id);
    }

    setActiveSprite(meta.id, { skipSave: true, skipUI: true });

    renderShopOptions();
    updateUI();
    updateHubUI();
    savePlayerData();
    loadAndDisplayLeaderboard();
}

// ====================================================================
// SECTION B: GAMEPLAY CORE LOGIC (Functions defined here call functions from Section A)
// ====================================================================

function updateDashCooldown() {
    const now = Date.now();
    const stats = getTotalStats();
    const perks = player.specialPerks || {};
    const speedCooldownReduction = (stats.speed || 0) * 55;
    const baseDuration = Math.max(450, DASH_COOLDOWN_DURATION - speedCooldownReduction);
    const perkAdjusted = baseDuration * (perks.dashCooldownFactor || 1);
    const finalDashDuration = ultraDashActive ? perkAdjusted / 2 : perkAdjusted;


    if (dashCooldown > now) {
        if (dashCooldownEl) dashCooldownEl.style.display = 'block';
        const dashWindow = finalDashDuration || 1;
        const progress = Math.max(0, (now - (dashCooldown - dashWindow)) / dashWindow);
        if (dashBarEl) dashBarEl.style.width = `${progress * 100}%`;
        if (dashCooldownEl) dashCooldownEl.classList.remove('ready');
    } else {
        if (dashCooldownEl) dashCooldownEl.style.display = 'none';
        if (dashCooldownEl) dashCooldownEl.classList.add('ready');
    }
}

function drawPlayer(x, y, w, h, chargeLevel = 0) {
    gameCtx.save();
    if (chargeLevel > 0) {
        gameCtx.shadowColor = '#ff00ff'; gameCtx.shadowBlur = 10 + chargeLevel * 20;
    }
    gameCtx.fillStyle = '#00ff00';
    gameCtx.fillRect(x + w/4, y + h/4, w/2, h/2);
    gameCtx.fillStyle = '#ffff00';
    gameCtx.fillRect(x, y + h/4, w/4, h/4);
    gameCtx.fillRect(x + 3*w/4, y + h/4, w/4, h/4);
    gameCtx.fillStyle = '#ff0000';
    gameCtx.fillRect(x + w/2 - 5, y + h/4 - 5, 10, 10);
    gameCtx.restore();
}

function drawEnemy(x, y, w, h, variant = 'basic', hp = 1) {
    gameCtx.save();
    if (hp > 1) { gameCtx.shadowColor = '#ff0000'; gameCtx.shadowBlur = 10 * hp; }
    if (variant === 'mecha') {
        gameCtx.fillStyle = '#888888'; gameCtx.fillRect(x, y, w, h);
        gameCtx.fillStyle = '#ffff00'; gameCtx.fillRect(x + 10, y + 10, 20, 10); 
    } else {
        gameCtx.fillStyle = '#ff00ff'; gameCtx.fillRect(x, y, w, h);
        gameCtx.fillStyle = '#00ffff'; gameCtx.fillRect(x + 5, y + 5, 10, 10);
        gameCtx.fillRect(x + w - 15, y + 5, 10, 10);
        gameCtx.fillStyle = '#ff0000'; gameCtx.fillRect(x + w - 10, y + h / 2, 10, 5);
    }
    gameCtx.restore();
}

function drawTail() {
    tail.forEach((segment, index) => {
        const alpha = (index / tail.length) * 0.8 + 0.2;
        gameCtx.save();
        gameCtx.globalAlpha = alpha;
        gameCtx.fillStyle = '#00ff00';
        const size = player.width * (1 - index / tail.length * 0.5);
        gameCtx.fillRect(segment.x, segment.y, size, size);
        gameCtx.restore();
    });
}

function drawPowerup(x, y, w, h, visuals) {
    const { color, letter, asset, glowColor } = visuals;
    const assetImage = asset ? powerupImageCache[asset] : null;

    if (isImageReady(assetImage)) {
        gameCtx.save();
        if (glowColor) {
            gameCtx.shadowColor = glowColor;
            gameCtx.shadowBlur = Math.max(w, h) * 0.5;
        }
        gameCtx.drawImage(assetImage, x, y, w, h);
        gameCtx.restore();
        return;
    }

    gameCtx.fillStyle = color;
    gameCtx.fillRect(x, y, w, h);
    gameCtx.fillStyle = '#000000';
    gameCtx.font = 'bold 12px "MS PGothic", monospace';
    gameCtx.textAlign = 'center';
    gameCtx.textBaseline = 'middle';
    gameCtx.fillText(letter, x + w / 2, y + h / 2);
    gameCtx.textAlign = 'start';
    gameCtx.textBaseline = 'alphabetic';
}

function drawImageOrProcedural(img, x, y, w, h, isPlayer = false, extra = {}) {
    const {
        glowColor,
        glowBlur,
        chargeLevel = 0,
        variant = 'basic',
        hp = 1,
        applyGlow
    } = extra;

    const usingCustomPlayerSprite = Boolean(isPlayer && img && img.isFallback === false);
    const allowGlow = applyGlow !== undefined ? applyGlow : !usingCustomPlayerSprite;

    let glowApplied = false;
    if (glowColor && allowGlow) {
        gameCtx.save();
        gameCtx.shadowColor = glowColor;
        if (typeof glowBlur === 'number') {
            gameCtx.shadowBlur = glowBlur;
        }
        glowApplied = true;
    }

    if (img) {
        gameCtx.drawImage(img, x, y, w, h);
    } else if (isPlayer) {
        drawPlayer(x, y, w, h, chargeLevel);
    } else {
        drawEnemy(x, y, w, h, variant, hp);
    }

    if (glowApplied) {
        gameCtx.restore();
    }
}

function applyPowerup(type) {
    let timeoutHandle = null;

    switch (type) {
        case 'speed':
            registerSpeedModifier(1.35, 4000, 'powerup_speed');
            break;
        case 'rapid':
            rapidFire = true;
            timeoutHandle = setTimeout(() => { rapidFire = false; }, 7000);
            break;
        case 'shield':
            const shieldDuration = 4000 + (player.vitalityRating * 800) + (player.specialPerks?.shieldDurationBonus || 0);
            shieldActive = true;
            timeoutHandle = setTimeout(() => { shieldActive = false; }, shieldDuration);
            break;
        case 'life':
            if (lives < MAX_LIVES) {
                lives = Math.min(MAX_LIVES, lives + 1);
                uiCache.lives = null;
                if (livesEl) livesEl.textContent = `Lives: ${lives}`;
            }
            break;
        case 'spread':
            spreadActive = true;
            timeoutHandle = setTimeout(() => { spreadActive = false; }, 6000);
            break;
        case 'homing':
            homingActive = true;
            timeoutHandle = setTimeout(() => { homingActive = false; }, 4500);
            break;
        case 'pierce':
            pierceActive = true;
            timeoutHandle = setTimeout(() => { pierceActive = false; }, 7000);
            break;
        case 'ultra_dash':
            ultraDashActive = true;
            timeoutHandle = setTimeout(() => { ultraDashActive = false; }, 20000);
            break;
    }

    if (timeoutHandle !== null && timeoutHandle !== undefined) {
        powerupTimeouts.push(timeoutHandle);
    }

    if (Math.random() < 0.5) {
        const heart = document.createElement('div');
        heart.className = 'gacha-heart'; heart.innerHTML = '💖';
        heart.style.position = 'absolute';
        if (canvas && document.getElementById('game-container')) {
             heart.style.left = (player.x + canvas.offsetLeft + player.width / 2) + 'px';
             heart.style.top = (player.y + canvas.offsetTop + player.height / 2) + 'px';
             heart.style.zIndex = '15';
             document.getElementById('game-container').appendChild(heart);
             setTimeout(() => heart.remove(), 3000);
        }
    }
    if (type === 'ultra_dash') playerData.items.push(type);
}

function showAnnounce(el, text) {
    if (el) el.textContent = text; 
    if (el) el.style.display = 'block';
    if (el) setTimeout(() => { el.style.display = 'none'; }, 2000);
}

// --- LEADERBOARD & STORAGE ---

function sanitizeLeaderboardEntry(entry) {
    if (typeof window !== 'undefined' && window.LeaderboardAPI?.sanitizeEntry) {
        try {
            return window.LeaderboardAPI.sanitizeEntry(entry);
        } catch (error) {
            console.warn('Failed to sanitize leaderboard entry via API helper:', error);
        }
    }

    if (!entry || typeof entry !== 'object') {
        return null;
    }

    const publicKey = typeof entry.publicKey === 'string' && entry.publicKey.trim()
        ? entry.publicKey.trim()
        : 'Unknown Player';

    const normalizeNumber = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return 0;
        }
        return Math.max(0, Math.floor(parsed));
    };

    const level = normalizeNumber(entry.level);
    const bestScore = normalizeNumber(entry.bestScore);
    const stats = entry.stats && typeof entry.stats === 'object' ? { ...entry.stats } : {};

    return { publicKey, level, bestScore, stats };
}

const GUEST_PROFILE_STORAGE_KEY = 'astro_invaders_guest';
const LEADERBOARD_STORAGE_KEY = 'astro_invaders_leaderboard';
const STORAGE_WARNING_MESSAGE = 'Progress may not be saved: storage unavailable.';

function showStorageWarning(message = STORAGE_WARNING_MESSAGE) {
    if (!storageWarningEl) return;
    storageWarningEl.textContent = message;
    storageWarningEl.hidden = false;
}

function hideStorageWarning() {
    if (!storageWarningEl) return;
    storageWarningEl.hidden = true;
}

function readLeaderboardSafely() {
    if (typeof localStorage === 'undefined') {
        console.warn('Local storage is not available; leaderboard cannot be loaded.');
        showStorageWarning();
        return [];
    }

    try {
        const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map(sanitizeLeaderboardEntry)
            .filter(Boolean);
    } catch (error) {
        console.warn('Failed to read leaderboard from local storage.', error);
        if (error && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) {
            showStorageWarning();
        }
        return [];
    }
}

function writeLeaderboardSafely(entries) {
    if (typeof localStorage === 'undefined') {
        console.warn('Local storage is not available; leaderboard cannot be saved.');
        showStorageWarning();
        return false;
    }

    try {
        const sanitized = Array.isArray(entries)
            ? entries.map(sanitizeLeaderboardEntry).filter(Boolean)
            : [];
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sanitized));
        hideStorageWarning();
        return true;
    } catch (error) {
        console.warn('Failed to write leaderboard to local storage.', error);
        showStorageWarning();
        return false;
    }
}

function saveLocalLeaderboard(currentData) {
    const sanitizedEntry = sanitizeLeaderboardEntry({
        publicKey: walletPublicKey,
        level: currentData.level,
        bestScore: currentData.bestScore,
        stats: currentData.stats
    });

    if (!sanitizedEntry) {
        return;
    }

    const leaderboard = readLeaderboardSafely().filter(entry => entry.publicKey !== sanitizedEntry.publicKey);

    leaderboard.push(sanitizedEntry);
    leaderboard.sort((a, b) => {
        if (b.level !== a.level) { return b.level - a.level; }
        return b.bestScore - a.bestScore;
    });

    const trimmedLeaderboard = leaderboard.slice(0, 10);
    writeLeaderboardSafely(trimmedLeaderboard);

    if (typeof window !== 'undefined' && window.LeaderboardAPI?.postEntry) {
        window.LeaderboardAPI.postEntry(sanitizedEntry).catch((error) => {
            console.warn('Failed to submit leaderboard entry to API:', error);
        });
    }
}

async function loadAndDisplayLeaderboard() {
    if (!leaderboardEl) return;

    leaderboardEl.innerHTML = '';
    const loadingMessage = document.createElement('p');
    loadingMessage.textContent = 'Loading leaderboard...';
    leaderboardEl.appendChild(loadingMessage);

    try {
        const entryMap = new Map();

        const registerEntry = (entry) => {
            const sanitized = sanitizeLeaderboardEntry(entry);
            if (!sanitized) {
                return;
            }

            const hasStableKey = sanitized.publicKey && sanitized.publicKey !== 'Unknown Player';
            const key = hasStableKey
                ? sanitized.publicKey
                : `${sanitized.publicKey}-${sanitized.bestScore}-${sanitized.level}`;

            const existing = entryMap.get(key);
            if (!existing
                || sanitized.bestScore > existing.bestScore
                || (sanitized.bestScore === existing.bestScore && sanitized.level > existing.level)) {
                entryMap.set(key, sanitized);
            }
        };

        readLeaderboardSafely().forEach(registerEntry);

        if (typeof window !== 'undefined' && window.LeaderboardAPI?.flushQueue) {
            try {
                await window.LeaderboardAPI.flushQueue();
            } catch (error) {
                console.warn('Failed to flush queued leaderboard entries:', error);
            }
        }

        if (typeof window !== 'undefined' && window.LeaderboardAPI?.fetchTopEntries) {
            try {
                const remoteEntries = await window.LeaderboardAPI.fetchTopEntries();
                remoteEntries.forEach(registerEntry);
            } catch (error) {
                console.warn('Failed to load remote leaderboard entries:', error);
            }
        }

        const leaderboard = Array.from(entryMap.values());
        leaderboard.sort((a, b) => {
            if (b.level !== a.level) { return b.level - a.level; }
            return b.bestScore - a.bestScore;
        });

        leaderboardEl.innerHTML = '';

        if (!leaderboard.length) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'No leaderboard data yet.';
            leaderboardEl.appendChild(emptyMessage);
            return;
        }

        const headerEl = document.createElement('div');
        headerEl.className = 'leaderboard-header';
        headerEl.innerHTML = `
            <span class="leaderboard-rank">Rank</span>
            <span class="leaderboard-wallet">Wallet</span>
            <span class="leaderboard-level">Level</span>
            <span class="leaderboard-score">Best Score</span>
        `;
        leaderboardEl.appendChild(headerEl);

        const listEl = document.createElement('ol');
        listEl.className = 'leaderboard-list';

        const fragment = document.createDocumentFragment();

        leaderboard.slice(0, 10).forEach((entry, index) => {
            const rowEl = document.createElement('li');
            rowEl.className = 'leaderboard-row';

            const publicKey = entry.publicKey || 'Unknown Player';
            const snippet = publicKey.length > 10
                ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
                : publicKey;

            rowEl.innerHTML = `
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-wallet">${snippet}</span>
                <span class="leaderboard-level">Lv.${entry.level}</span>
                <span class="leaderboard-score">${entry.bestScore}</span>
            `;

            fragment.appendChild(rowEl);
        });

        listEl.appendChild(fragment);
        leaderboardEl.appendChild(listEl);
    } catch (error) {
        console.error('Failed to render leaderboard:', error);
        leaderboardEl.innerHTML = '';
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Unable to load leaderboard right now.';
        leaderboardEl.appendChild(errorMessage);
    }
}

function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error('Missing script source.'));
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.crossOrigin = 'anonymous';

        const cleanup = () => {
            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);
        };

        const handleLoad = () => {
            cleanup();
            resolve();
        };

        const handleError = (event) => {
            cleanup();
            const isErrorEvent = typeof ErrorEvent !== 'undefined' && event instanceof ErrorEvent;
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(isErrorEvent ? event.error || event : event);
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
        document.head.appendChild(script);
    });
}

async function ensureSolanaLibrariesLoaded() {
    if (typeof solanaWeb3 !== 'undefined' && typeof Metaplex !== 'undefined') {
        return true;
    }

    if (!solanaLibraryLoadPromise) {
        solanaLibraryLoadPromise = (async () => {
            const ensureLibrary = async (sources, validator) => {
                if (validator()) return true;

                for (const src of sources) {
                    try {
                        await loadExternalScript(src);
                        if (validator()) {
                            return true;
                        }
                    } catch (err) {
                        console.warn(`Failed to load external script: ${src}`, err);
                    }
                }

                return validator();
            };

            if (typeof solanaWeb3 === 'undefined') {
                await ensureLibrary(SOLANA_WEB3_SOURCES, () => typeof solanaWeb3 !== 'undefined');
            }

            if (typeof Metaplex === 'undefined') {
                await ensureLibrary(METAPLEX_JS_SOURCES, () => typeof Metaplex !== 'undefined');
            }

            return typeof solanaWeb3 !== 'undefined' && typeof Metaplex !== 'undefined';
        })();
    }

    try {
        const loaded = await solanaLibraryLoadPromise;
        solanaLibraryLoadPromise = null;
        return loaded;
    } catch (err) {
        console.error('Unexpected error while loading Solana libraries:', err);
        solanaLibraryLoadPromise = null;
        return false;
    }
}

function getCurrentSolanaEndpoint() {
    if (SOLANA_RPC_ENDPOINTS.length > 0) {
        return SOLANA_RPC_ENDPOINTS[solanaEndpointIndex % SOLANA_RPC_ENDPOINTS.length];
    }

    if (typeof solanaWeb3 !== 'undefined' && typeof solanaWeb3.clusterApiUrl === 'function') {
        return solanaWeb3.clusterApiUrl('mainnet-beta');
    }

    return null;
}

function advanceSolanaEndpoint(reason) {
    if (SOLANA_RPC_ENDPOINTS.length === 0) {
        return;
    }

    const failedEndpoint = getCurrentSolanaEndpoint();
    if (failedEndpoint) {
        console.warn(`Solana RPC endpoint failed (${failedEndpoint}).`, reason);
    }

    solanaEndpointIndex = (solanaEndpointIndex + 1) % SOLANA_RPC_ENDPOINTS.length;
    solanaConnection = null;

    if (SOLANA_RPC_ENDPOINTS.length > 1) {
        const nextEndpoint = getCurrentSolanaEndpoint();
        if (nextEndpoint && nextEndpoint !== failedEndpoint) {
            console.info(`Switching to fallback Solana RPC endpoint: ${nextEndpoint}`);
        }
    }
}

function handleSolanaRpcError(err) {
    if (!err) return;

    const responseStatus = err && typeof err === 'object' && typeof err.response === 'object'
        && typeof err.response?.status === 'number'
        ? err.response.status
        : null;
    const status = typeof err.status === 'number' ? err.status : responseStatus;
    const code = typeof err.code === 'number' ? err.code : status;
    const message = typeof err.message === 'string' ? err.message : String(err);

    const forbidden = code === 403
        || message.includes('403')
        || message.toLowerCase().includes('forbidden');
    const networkIssue = message.includes('Failed to fetch') || message.includes('NetworkError');

    if (forbidden || networkIssue) {
        advanceSolanaEndpoint(err);
    }
}

function getSolanaConnection() {
    if (typeof solanaWeb3 === 'undefined') return null;

    if (!solanaConnection) {
        const attempted = new Set();

        while (!solanaConnection) {
            const endpoint = getCurrentSolanaEndpoint();
            if (!endpoint || attempted.has(endpoint)) {
                break;
            }

            attempted.add(endpoint);

            try {
                solanaConnection = new solanaWeb3.Connection(endpoint, 'confirmed');
            } catch (err) {
                console.error('Failed to initialize Solana connection:', err);
                advanceSolanaEndpoint(err);
            }
        }
    }

    return solanaConnection;
}

function sanitizePlayerDataForChain(data) {
    if (!data) return null;

    const base = createBasePlayerData();
    const snapshot = {
        version: 1,
        timestamp: Date.now(),
        gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : base.gamesPlayed,
        wins: typeof data.wins === 'number' ? data.wins : base.wins,
        losses: typeof data.losses === 'number' ? data.losses : base.losses,
        bestScore: typeof data.bestScore === 'number' ? data.bestScore : base.bestScore,
        credits: typeof data.credits === 'number' ? data.credits : base.credits,
        items: Array.isArray(data.items) ? data.items.slice(0, 32) : base.items,
        ownedSprites: Array.isArray(data.ownedSprites) ? data.ownedSprites.slice(0, 32) : base.ownedSprites,
        activeSpriteId: data.activeSpriteId || base.activeSpriteId,
        level: typeof data.level === 'number' ? data.level : base.level,
        currentXP: typeof data.currentXP === 'number' ? data.currentXP : base.currentXP,
        specializationPoints: typeof data.specializationPoints === 'number' ? data.specializationPoints : base.specializationPoints,
        stats: { ...base.stats, ...(data.stats || {}) },
        unlockedNodes: Array.isArray(data.unlockedNodes) ? data.unlockedNodes.slice(0, 128) : base.unlockedNodes,
        daily: data.daily ? { ...data.daily } : base.daily,
        profile: data.profile ? { ...data.profile } : base.profile
    };

    if (snapshot.daily && Array.isArray(snapshot.daily.quests)) {
        snapshot.daily.quests = snapshot.daily.quests.slice(0, 3).map(quest => ({ ...quest }));
    }

    return snapshot;
}

function encodeSnapshotForChain(snapshot) {
    if (!snapshot) return null;

    try {
        const memoText = `${PROGRESS_MEMO_PREFIX}${JSON.stringify(snapshot)}`;
        const byteLength = new TextEncoder().encode(memoText).length;

        if (byteLength > MEMO_MAX_BYTES) {
            console.warn('On-chain progress payload too large for memo; skipping sync.');
            return null;
        }

        return memoText;
    } catch (err) {
        console.error('Failed to encode snapshot for chain sync:', err);
        return null;
    }
}

async function syncProgressToChain(snapshot) {
    if (!snapshot) return false;

    const librariesReady = await ensureSolanaLibrariesLoaded();
    if (!librariesReady) {
        console.error('Solana libraries unavailable; cannot sync progress on-chain.');
        return false;
    }

    if (!walletPublicKey || !walletProvider) {
        console.warn('Wallet not connected; cannot sync progress on-chain.');
        return false;
    }

    const connection = getSolanaConnection();
    if (!connection) return false;

    const memoText = encodeSnapshotForChain(snapshot);
    if (!memoText) return false;

    try {
        const memoInstruction = new solanaWeb3.TransactionInstruction({
            keys: [],
            programId: new solanaWeb3.PublicKey(MEMO_PROGRAM_ID),
            data: new TextEncoder().encode(memoText)
        });

        const transaction = new solanaWeb3.Transaction().add(memoInstruction);
        transaction.feePayer = new solanaWeb3.PublicKey(walletPublicKey);

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;

        let signature = null;

        if (typeof walletProvider.signAndSendTransaction === 'function') {
            const result = await walletProvider.signAndSendTransaction(transaction);
            if (result) {
                signature = typeof result === 'string' ? result : result.signature;
            }
        } else if (typeof walletProvider.signTransaction === 'function') {
            const signedTx = await walletProvider.signTransaction(transaction);
            signature = await connection.sendRawTransaction(signedTx.serialize());
        } else {
            console.warn('Wallet provider does not support transaction signing; cannot sync progress on-chain.');
            return false;
        }

        if (!signature) {
            console.warn('No signature returned from wallet; skipping on-chain confirmation.');
            return false;
        }

        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
        console.log('Progress synced on-chain:', signature);
        return true;
    } catch (err) {
        console.error('Failed to sync progress on-chain:', err);
        handleSolanaRpcError(err);
        return false;
    }
}

function queueOnChainSync(snapshot) {
    if (!snapshot || !walletPublicKey) return;

    try {
        pendingChainSnapshot = JSON.parse(JSON.stringify(snapshot));
    } catch (err) {
        console.error('Failed to clone snapshot for chain sync:', err);
        return;
    }

    if (chainSyncTimeoutId) {
        return;
    }

    const now = Date.now();
    const elapsed = now - lastChainSyncTime;
    const delay = Math.max(0, CHAIN_SYNC_THROTTLE_MS - elapsed);

    chainSyncTimeoutId = setTimeout(async () => {
        chainSyncTimeoutId = null;

        if (!pendingChainSnapshot) {
            return;
        }

        const snapshotToSync = pendingChainSnapshot;
        pendingChainSnapshot = null;

        const success = await syncProgressToChain(snapshotToSync);
        if (success) {
            lastChainSyncTime = Date.now();
        } else if (walletPublicKey) {
            queueOnChainSync(snapshotToSync);
        }

        if (pendingChainSnapshot) {
            queueOnChainSync(pendingChainSnapshot);
        }
    }, delay);
}

async function fetchLatestOnChainSnapshot(publicKey) {
    const librariesReady = await ensureSolanaLibrariesLoaded();
    if (!librariesReady) return null;

    const maxAttempts = Math.max(1, SOLANA_RPC_ENDPOINTS.length || 1);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const connection = getSolanaConnection();
        if (!connection) break;

        try {
            const ownerKey = new solanaWeb3.PublicKey(publicKey);
            const signatures = await connection.getSignaturesForAddress(ownerKey, { limit: 25 });

            for (const signatureInfo of signatures) {
                try {
                    const parsedTx = await connection.getParsedTransaction(signatureInfo.signature, {
                        maxSupportedTransactionVersion: 0,
                        commitment: 'confirmed'
                    });

                    if (!parsedTx) continue;

                    const instructions = parsedTx.transaction?.message?.instructions || [];
                    for (const instruction of instructions) {
                        const programId = typeof instruction.programId === 'string'
                            ? instruction.programId
                            : instruction.programId?.toString?.();
                        const programMatch = instruction.program === 'spl-memo'
                            || programId === MEMO_PROGRAM_ID;

                        if (!programMatch) continue;

                        const memoText = typeof instruction.parsed === 'string'
                            ? instruction.parsed
                            : (instruction.parsed && typeof instruction.parsed === 'object' ? instruction.parsed.text : null);

                        if (!memoText || !memoText.startsWith(PROGRESS_MEMO_PREFIX)) continue;

                        const payload = memoText.slice(PROGRESS_MEMO_PREFIX.length);
                        try {
                            return JSON.parse(payload);
                        } catch (parseErr) {
                            console.warn('Failed to parse on-chain progress payload:', parseErr);
                        }
                    }
                } catch (txErr) {
                    console.error('Error reading on-chain progress transaction:', txErr);
                    handleSolanaRpcError(txErr);
                }
            }
        } catch (err) {
            console.error('Failed to fetch on-chain progress for wallet:', err);
            handleSolanaRpcError(err);
        }

        if (solanaConnection) {
            break;
        }
    }

    return null;
}

function savePlayerData() {
    if (!walletPublicKey) {
        if (typeof localStorage === 'undefined') {
            guestStorageAvailable = false;
            showStorageWarning();
            updateGuestStatTooltip();
            return;
        }

        try {
            localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(playerData));
            if (!guestStorageAvailable) {
                guestStorageAvailable = true;
                updateGuestStatTooltip();
            }
            hideStorageWarning();
        } catch (err) {
            guestStorageAvailable = false;
            console.error('Failed to save guest player data:', err);
            showStorageWarning();
            updateGuestStatTooltip();
        }

        return;
    }

    try {
        localStorage.setItem(`astro_invaders_${walletPublicKey}`, JSON.stringify(playerData));
        hideStorageWarning();
    } catch (err) {
        console.error('Failed to save local player data:', err);
        showStorageWarning();
    }

    saveLocalLeaderboard(playerData);
    loadAndDisplayLeaderboard();

    const snapshot = sanitizePlayerDataForChain(playerData);
    queueOnChainSync(snapshot);
}


async function loadPlayerData() {
    let loadedData = null;

    if (!walletPublicKey) {
        guestStorageAvailable = false;

        if (typeof localStorage === 'undefined') {
            showStorageWarning();
        } else {
            try {
                const saved = localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
                guestStorageAvailable = true;
                hideStorageWarning();
                if (saved) {
                    try {
                        loadedData = JSON.parse(saved);
                    } catch (err) {
                        console.error('Failed to parse guest player data:', err);
                    }
                }
            } catch (err) {
                guestStorageAvailable = false;
                console.error('Failed to access guest player data:', err);
                showStorageWarning();
            }
        }
    } else {
        guestStorageAvailable = false;

        try {
            loadedData = await fetchLatestOnChainSnapshot(walletPublicKey);
        } catch (err) {
            console.error('On-chain progress load failed:', err);
        }

        if (!loadedData) {
            if (typeof localStorage === 'undefined') {
                showStorageWarning();
            } else {
                try {
                    const saved = localStorage.getItem(`astro_invaders_${walletPublicKey}`);
                    if (saved) {
                        try {
                            loadedData = JSON.parse(saved);
                        } catch (err) {
                            console.error('Failed to parse local player data:', err);
                        }
                    }
                    hideStorageWarning();
                } catch (err) {
                    console.error('Failed to access local player data:', err);
                    showStorageWarning();
                }
            }
        }
    }

    const base = createBasePlayerData();

    if (loadedData) {
        playerData = { ...base, ...loadedData };

        const incomingStats = loadedData.stats && typeof loadedData.stats === 'object'
            ? loadedData.stats
            : {};
        const normalizedStats = { ...base.stats };
        Object.entries(incomingStats).forEach(([key, value]) => {
            const mappedKey = LEGACY_STAT_KEY_MAP[key] || key;
            if (!CORE_STATS.includes(mappedKey)) return;
            if (typeof value !== 'number' || Number.isNaN(value)) return;
            normalizedStats[mappedKey] = value;
        });
        playerData.stats = normalizedStats;

        if (typeof loadedData.specializationPoints === 'number') {
            playerData.specializationPoints = loadedData.specializationPoints;
        } else if (typeof loadedData.levelPoints === 'number') {
            playerData.specializationPoints = loadedData.levelPoints;
        }

        if ('levelPoints' in playerData) {
            delete playerData.levelPoints;
        }

        if ('timestamp' in playerData) {
            delete playerData.timestamp;
        }
        if ('version' in playerData) {
            delete playerData.version;
        }

        const rawUnlocked = Array.isArray(loadedData.unlockedNodes)
            ? loadedData.unlockedNodes
            : [];
        const normalizedUnlocked = rawUnlocked
            .map(id => LEGACY_NODE_ID_MAP[id] || id)
            .filter(id => skillNodeIndex[id]);
        playerData.unlockedNodes = Array.from(new Set(normalizedUnlocked));

        const dailyFallback = base.daily;
        playerData.daily = { ...dailyFallback, ...(loadedData.daily || {}) };
        if (!Array.isArray(playerData.daily.quests) || playerData.daily.quests.length !== 3) {
            playerData.daily.quests = createDefaultQuests();
        }

        playerData.profile = { ...base.profile, ...(loadedData.profile || {}) };
    } else {
        playerData = base;
    }

    ensureSpriteProgression();
    setActiveSprite(playerData.activeSpriteId, { skipSave: true, skipUI: true });
    applyStatEffects();
    updateHubUI();
}


// --- STATS AND XP LOGIC ---

function getXPForNextLevel(currentLevel) {
    if (currentLevel >= MAX_PLAYER_LEVEL) return Infinity;
    const targetLevel = currentLevel + 1;
    const segment = XP_CURVE_SEGMENTS.find(entry => targetLevel >= entry.minLevel && targetLevel <= entry.maxLevel)
        || XP_CURVE_SEGMENTS[XP_CURVE_SEGMENTS.length - 1];
    const relative = Math.max(0, currentLevel - (segment.minLevel - 1));
    const requirement = Math.floor(segment.base * Math.pow(segment.growth, relative) + segment.bonus);
    return Math.max(100, requirement);
}

function applyStatEffects() {
    const { totals, perks, masteries } = recomputeSpecializationTotals();

    const speedStat = totals.speed || 0;
    const strengthStat = totals.strength || 0;
    const vitalityStat = totals.vitality || 0;
    const focusStat = totals.focus || 0;

    const movementModifier = (perks.movementSpeed || 0) + (masteries.speed ? 0.12 : 0);
    const baseSpeed = 6.5 + (speedStat * 0.65);
    player.baseSpeed = baseSpeed * (1 + movementModifier);
    getCurrentPlayerSpeed();

    const damageMultiplierBonus = 1 + (perks.damageMultiplier || 0);
    const masteryDamageBonus = masteries.strength ? 1.12 : 1;
    player.damageMultiplier = (1 + (strengthStat * 0.2)) * damageMultiplierBonus * masteryDamageBonus;

    player.vitalityRating = vitalityStat;
    player.focusRating = focusStat;

    const baseCritChance = Math.min(0.55, focusStat * 0.012);
    const masteryCritChance = masteries.focus ? 0.06 : 0;
    player.critChance = Math.min(0.75, baseCritChance + (perks.critChanceBonus || 0) + masteryCritChance);

    const baseCritMultiplier = 2.0 + (strengthStat * 0.035);
    const masteryCritMultiplier = masteries.strength ? 0.25 : 0;
    player.critMultiplier = baseCritMultiplier + (perks.critMultiplierBonus || 0) + masteryCritMultiplier;

    const baseDamageReduction = Math.min(0.7, vitalityStat * 0.017);
    const masteryDamageReduction = masteries.vitality ? 0.08 : 0;
    const totalDamageReduction = Math.min(0.85, baseDamageReduction + (perks.damageReduction || 0) + masteryDamageReduction);

    const baseGuardChance = Math.min(0.35, vitalityStat * 0.012);
    const masteryGuardBonus = masteries.vitality ? 0.15 : 0;
    const guardChance = Math.min(0.95, baseGuardChance + (perks.guardChance || 0) + masteryGuardBonus);

    const dashCooldownModifier = (perks.dashCooldownMultiplier || 0) + (masteries.speed ? -0.2 : 0);
    const fireRateBonus = Math.max(0, (perks.fireRateBonus || 0) + (masteries.speed ? 0.08 : 0));
    const projectileSize = (perks.projectileSize || 0) + (masteries.strength ? 0.08 : 0);
    const extraPierce = Math.max(0, Math.round((perks.extraPierce || 0) + (masteries.strength ? 1 : 0)));

    const baseShieldDuration = vitalityStat * 70;
    const masteryShieldBonus = masteries.vitality ? 500 : 0;
    const shieldDurationBonus = Math.max(0, (perks.shieldDurationBonus || 0) + baseShieldDuration + masteryShieldBonus);

    const dropChanceBonus = Math.max(0, (perks.dropChanceBonus || 0) + (masteries.focus ? 0.08 : 0));
    const evasionBase = Math.min(0.35, speedStat * 0.005);
    const evasionMastery = masteries.speed ? 0.1 : 0;
    const evasionChance = Math.min(0.5, evasionBase + (perks.evasionBonus || 0) + evasionMastery);

    const baseXpMultiplier = Math.min(0.7, focusStat * 0.005);
    const xpBonusPerks = Math.max(0, (perks.xpBonus || 0) + (masteries.focus ? 0.08 : 0));
    const baseCreditMultiplier = Math.min(0.5, focusStat * 0.004);
    const creditBonusPerks = Math.max(0, (perks.creditBonus || 0) + (masteries.focus ? 0.08 : 0));

    const baseMaxHP = 140 + (playerData.level * 16);
    player.maxHP = Math.floor(baseMaxHP + vitalityStat * 15 + (masteries.vitality ? 50 : 0));
    if (typeof player.currentHP !== 'number' || Number.isNaN(player.currentHP)) {
        player.currentHP = player.maxHP;
    } else {
        player.currentHP = Math.min(player.currentHP, player.maxHP);
    }

    player.damageReduction = totalDamageReduction;
    player.evasionChance = evasionChance;
    player.xpGainMultiplier = Math.max(0.1, 1 + baseXpMultiplier);
    player.creditGainMultiplier = Math.max(0.1, 1 + baseCreditMultiplier);

    player.specialPerks = {
        dashCooldownFactor: Math.max(0.2, 1 + dashCooldownModifier),
        fireRateBonus,
        movementSpeed: 1 + movementModifier,
        projectileSize,
        extraPierce,
        shieldDurationBonus,
        guardChance,
        dropChanceBonus,
        damageReduction: totalDamageReduction,
        evasionBonus: evasionChance,
        xpBonus: xpBonusPerks,
        creditBonus: creditBonusPerks
    };

    level = playerData.level;
}

function gainXP(amount, options = {}) {
    if (playerData.level >= MAX_PLAYER_LEVEL) return 0;

    const {
        difficulty = 1,
        applyRested = true,
        applyMultipliers = true,
        bonusMultiplier = 1
    } = options;

    let finalAmount = Math.max(0, amount);
    if (applyMultipliers && finalAmount > 0) {
        const statMultiplier = Math.max(0.1, player.xpGainMultiplier || 1);
        const perkBonus = 1 + Math.max(0, player.specialPerks?.xpBonus || 0);
        const difficultyBonus = difficulty > 1 ? (1 + Math.min(2, (difficulty - 1) * 0.08)) : 1;
        finalAmount *= statMultiplier * perkBonus * difficultyBonus * bonusMultiplier;
    } else if (bonusMultiplier !== 1) {
        finalAmount *= bonusMultiplier;
    }

    finalAmount = Math.floor(finalAmount);

    let restedBonus = 0;
    if (applyRested && playerData.restedXP > 0 && finalAmount > 0) {
        restedBonus = Math.min(playerData.restedXP, finalAmount);
        playerData.restedXP = Math.max(0, playerData.restedXP - restedBonus);
        finalAmount += restedBonus;
    }

    playerData.currentXP += finalAmount;

    let levelsGained = 0;
    let requiredXP = getXPForNextLevel(playerData.level);

    while (playerData.currentXP >= requiredXP) {
        playerData.currentXP -= requiredXP;
        playerData.level++;
        levelsGained++;
        playerData.specializationPoints += 3;
        requiredXP = getXPForNextLevel(playerData.level);

        if (playerData.level >= MAX_PLAYER_LEVEL) {
            playerData.level = MAX_PLAYER_LEVEL;
            playerData.currentXP = 0;
            break;
        }
    }

    if (levelsGained > 0) {
        showAnnounce(waveAnnounceEl, `LEVEL UP! Lv.${playerData.level}! (+${levelsGained * 3} Spec Points)`);
        applyStatEffects();
    }

    if (statPointsEl) statPointsEl.textContent = playerData.specializationPoints;
    if (statAllocationEl && statAllocationEl.style.display !== 'none') {
        renderSkillTree();
    }
    updateUI();
    savePlayerData();

    return finalAmount;
}

function applyLifeDamage(amount) {
    if (!Number.isFinite(amount) || amount <= 0 || lives <= 0) return 0;
    pendingLifeDamage += amount;
    let livesLost = 0;
    while (pendingLifeDamage >= 1 && lives > 0) {
        pendingLifeDamage -= 1;
        lives--;
        livesLost++;
    }
    if (livesLost > 0) {
        uiCache.lives = null;
        if (livesEl) livesEl.textContent = `Lives: ${lives}`;
        if (lives <= 0) {
            lives = 0;
            handleGameOver();
        }
    }
    return livesLost;
}

function resolveIncomingDamage(baseDamage, options = {}) {
    const { announce = true } = options || {};
    const guardChance = player.specialPerks?.guardChance || 0;
    if (guardChance > 0 && Math.random() < guardChance) {
        if (announce) {
            showAnnounce(waveAnnounceEl, 'Guardian Protocol absorbed the hit!');
        }
        return { prevented: true, reason: 'guard', livesLost: 0 };
    }

    const evasionChance = player.evasionChance || player.specialPerks?.evasionBonus || 0;
    if (evasionChance > 0 && Math.random() < evasionChance) {
        if (announce) {
            showAnnounce(waveAnnounceEl, 'Evasive Maneuver! Attack dodged.');
        }
        return { prevented: true, reason: 'evasion', livesLost: 0 };
    }

    const mitigation = Math.min(0.85, Math.max(0, player.damageReduction || player.specialPerks?.damageReduction || 0));
    const mitigatedDamage = Math.max(0, baseDamage * (1 - mitigation));
    const livesLost = applyLifeDamage(mitigatedDamage);

    return { prevented: livesLost === 0 && mitigatedDamage < baseDamage, reason: livesLost ? 'damage' : 'mitigated', livesLost, mitigatedDamage };
}

function getRestedXPCap(level = playerData.level) {
    const effectiveLevel = Math.min(level, MAX_PLAYER_LEVEL - 1);
    const requirement = getXPForNextLevel(effectiveLevel);
    if (!Number.isFinite(requirement) || requirement <= 0) return 0;
    return Math.floor(requirement * RESTED_XP_CAP_MULTIPLIER);
}

function grantRestedXP(days = 1) {
    if (!Number.isFinite(days) || days <= 0) return 0;
    if (playerData.level >= MAX_PLAYER_LEVEL) return 0;
    const xpTarget = getXPForNextLevel(playerData.level);
    if (!Number.isFinite(xpTarget) || xpTarget <= 0) return 0;
    const perDay = Math.floor(xpTarget * RESTED_XP_RATE_PER_DAY);
    const totalGrant = Math.max(0, Math.floor(perDay * days));
    if (totalGrant <= 0) return 0;

    const cap = getRestedXPCap(playerData.level);
    const previous = playerData.restedXP || 0;
    const newTotal = Math.min(cap, previous + totalGrant);
    playerData.restedXP = newTotal;
    return newTotal - previous;
}

function renderShopOptions() {
    if (!shopOptionsEl) return;

    shopOptionsEl.innerHTML = '';
    ensureSpriteProgression();

    const rollContainer = document.createElement('div');
    rollContainer.className = 'shop-roll-container';

    const basicRoll = document.createElement('button');
    basicRoll.textContent = 'Basic Roll (50 Credits)';
    basicRoll.disabled = credits < SHOP_ROLL_CONFIG.basic.cost;
    basicRoll.onclick = () => rollUpgrade('basic');
    rollContainer.appendChild(basicRoll);

    const premiumRoll = document.createElement('button');
    premiumRoll.textContent = 'Premium Roll (200 Credits)';
    premiumRoll.disabled = credits < SHOP_ROLL_CONFIG.premium.cost;
    premiumRoll.onclick = () => rollUpgrade('premium');
    rollContainer.appendChild(premiumRoll);

    shopOptionsEl.appendChild(rollContainer);

    if (currentShopOptions.length === 0) {
        const hint = document.createElement('p');
        hint.className = 'shop-hint';
        hint.textContent = 'Roll to reveal upgrades and claim a power boost for the next battle.';
        shopOptionsEl.appendChild(hint);
    }

    if (currentShopOptions.length > 0) {
        const list = document.createElement('div');
        list.className = 'shop-option-list';

        currentShopOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = `shop-option ${option.rarity}`;

            const title = document.createElement('h4');
            title.textContent = `${option.label} [${option.rarity.toUpperCase()}]`;
            optionEl.appendChild(title);

            const description = document.createElement('p');
            description.textContent = option.description;
            optionEl.appendChild(description);

            const costLabel = document.createElement('p');
            costLabel.className = 'shop-cost';
            costLabel.textContent = `Cost: ${option.cost} Credits`;
            optionEl.appendChild(costLabel);

            const purchaseBtn = document.createElement('button');
            purchaseBtn.textContent = 'Purchase';
            purchaseBtn.disabled = credits < option.cost;
            purchaseBtn.onclick = () => purchaseUpgrade(option.id);
            optionEl.appendChild(purchaseBtn);

            list.appendChild(optionEl);
        });

        shopOptionsEl.appendChild(list);
    }

    const spriteSection = document.createElement('div');
    spriteSection.className = 'shop-section sprite-section';

    const spriteHeader = document.createElement('h3');
    spriteHeader.textContent = 'Spacecraft Hangar';
    spriteSection.appendChild(spriteHeader);

    const spriteHint = document.createElement('p');
    spriteHint.className = 'shop-hint';
    spriteHint.textContent = 'Equip your current ship or purchase new sprites using PNGs from assets/sprites/.';
    spriteSection.appendChild(spriteHint);

    const spriteList = document.createElement('div');
    spriteList.className = 'shop-sprite-grid';

    SPACECRAFT_CATALOG.forEach(sprite => {
        const owned = playerData.ownedSprites.includes(sprite.id);
        const active = playerData.activeSpriteId === sprite.id;

        const card = document.createElement('div');
        card.className = `shop-sprite-card ${sprite.rarity}`;

        const preview = document.createElement('img');
        preview.className = 'shop-sprite-preview';
        preview.alt = `${sprite.name} preview`;
        const fallback = getSpriteFallback(sprite);
        preview.src = `${SPRITE_DIRECTORY}${sprite.fileName}`;
        preview.onerror = () => {
            preview.onerror = null;
            if (fallback) preview.src = fallback;
        };
        preview.loading = 'lazy';
        card.appendChild(preview);

        const info = document.createElement('div');
        info.className = 'shop-sprite-info';

        const title = document.createElement('h4');
        const rarityLabel = SPRITE_RARITY_LABELS[sprite.rarity] || 'Cosmetic';
        title.textContent = `${sprite.name} [${rarityLabel.toUpperCase()}]`;
        info.appendChild(title);

        const description = document.createElement('p');
        description.textContent = sprite.description;
        info.appendChild(description);

        const costLabel = document.createElement('p');
        costLabel.className = 'shop-cost';
        costLabel.textContent = sprite.cost > 0 ? `Cost: ${sprite.cost} Credits` : 'Starter Craft (Free)';
        info.appendChild(costLabel);

        card.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'shop-sprite-actions';

        const status = document.createElement('span');
        status.className = 'shop-sprite-status';
        status.textContent = owned ? (active ? 'Equipped' : 'Owned') : (SPRITE_RARITY_LABELS[sprite.rarity] || 'Cosmetic');
        actions.appendChild(status);

        const actionBtn = document.createElement('button');
        if (owned) {
            actionBtn.textContent = active ? 'Equipped' : 'Equip';
            actionBtn.disabled = active;
        } else {
            actionBtn.textContent = 'Purchase';
            actionBtn.disabled = credits < sprite.cost;
        }
        actionBtn.onclick = () => purchaseSprite(sprite.id);
        actions.appendChild(actionBtn);

        card.appendChild(actions);
        spriteList.appendChild(card);
    });

    spriteSection.appendChild(spriteList);
    shopOptionsEl.appendChild(spriteSection);
}

function pickRarity(weights) {
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * totalWeight;

    for (const [rarity, weight] of entries) {
        roll -= weight;
        if (roll <= 0) {
            return rarity;
        }
    }

    return entries[entries.length - 1][0];
}

function showStatAllocation() {
    gamePaused = true;
    hideAllOverlays();
    if (statAllocationEl) {
        statAllocationEl.style.display = 'flex';
    }

    if (statLevelOverlayEl) statLevelOverlayEl.textContent = playerData.level;
    if (statPointsEl) statPointsEl.textContent = playerData.specializationPoints;

    renderSkillTree();
    if (statAllocationEl) {
        const initialFocus = findFirstContentControl(statAllocationEl);
        activateFocusTrap(statAllocationEl, { initialFocus });
    }
}

// --- DAILY LOGIN AND QUEST SYSTEM ---

function checkDailyLogin() {
    const now = Date.now();

    if (!Array.isArray(playerData.daily.quests) || playerData.daily.quests.length === 0) {
        playerData.daily.quests = createDefaultQuests();
    }

    if (!playerData.daily.lastLogin) {
        playerData.daily.lastLogin = now;
    }

    const elapsed = now - playerData.daily.lastLogin;

    if (elapsed >= DAILY_INTERVAL_MS) {
        // Reset daily state
        playerData.daily.claimedLogin = false;
        playerData.daily.quests.forEach(q => {
            q.progress = 0;
            q.completed = false;
        });

        const daysElapsed = Math.min(RESTED_XP_MAX_DAYS, Math.max(1, Math.floor(elapsed / DAILY_INTERVAL_MS)));
        const restedEarned = grantRestedXP(daysElapsed);
        if (restedEarned > 0) {
            showAnnounce(document.getElementById('hub-announcement') || document.getElementById('wave-announce'), `Rest Bonus stored: +${restedEarned} XP`);
        }

        playerData.daily.lastLogin = now;
        savePlayerData();
        updateUI();
    }

    // Grant Daily Login Reward
    if (!playerData.daily.claimedLogin) {
        credits += 25; 
        playerData.credits = credits;
        playerData.daily.claimedLogin = true;
        
        showAnnounce(document.getElementById('hub-announcement') || document.getElementById('wave-announce'), 'Daily Login Bonus: +25 Credits!');
        savePlayerData();
        updateUI();
    }
}

function claimQuestReward(questId) {
    const quest = playerData.daily.quests.find(q => q.id === questId);
    if (quest && quest.progress >= quest.target && !quest.completed) {
        let rewardMsg = '';
        if (quest.reward.type === 'credits') {
            credits += quest.reward.amount;
            rewardMsg = `+${quest.reward.amount} Credits`;
        } else if (quest.reward.type === 'xpBonus') {
            const gainedXP = gainXP(quest.reward.amount, { source: 'quest', difficulty: 1, applyRested: true });
            rewardMsg = `+${gainedXP} XP`;
        } else if (quest.reward.type === 'specializationPoint' || quest.reward.type === 'levelPoint') {
            playerData.specializationPoints += quest.reward.amount;
            const suffix = quest.reward.amount === 1 ? 'Spec Point' : 'Spec Points';
            rewardMsg = `+${quest.reward.amount} ${suffix}`;
        }

        playerData.credits = credits;
        quest.completed = true;

        showAnnounce(document.getElementById('hub-announcement') || document.getElementById('wave-announce'), `Quest Complete! ${rewardMsg}`);

        savePlayerData();
        updateUI();
        updateQuestsUI();
        if (statPointsEl) statPointsEl.textContent = playerData.specializationPoints;
        if (statAllocationEl && statAllocationEl.style.display !== 'none') {
            renderSkillTree();
        }
        showHub();
    }
}

// --- WALLET AND WEB3 FUNCTIONS ---

const PHANTOM_GUIDE_CARD_ID = 'phantom-guide-card';

function openPhantomInstallGuide() {
    if (walletStatusEl) {
        walletStatusEl.textContent = 'Phantom Wallet not detected. Use the Player Hub guide to install it.';
    }

    if (playBtn) {
        playBtn.dataset.walletLocked = 'true';
        playBtn.disabled = true;
    }

    if (hubEl) {
        const hubContent = hubEl.querySelector('.xp-window-content');
        if (hubContent) {
            let guideCard = document.getElementById(PHANTOM_GUIDE_CARD_ID);
            if (!guideCard) {
                guideCard = document.createElement('div');
                guideCard.id = PHANTOM_GUIDE_CARD_ID;
                guideCard.className = 'xp-card phantom-guide-card';
                guideCard.setAttribute('role', 'alert');
                guideCard.setAttribute('tabindex', '-1');
                guideCard.innerHTML = `
                    <h3>Phantom Wallet Required</h3>
                    <p>Install the <a href="https://phantom.app/download" target="_blank" rel="noopener noreferrer">Phantom Wallet</a> browser extension to sync your Astrocat progress and access on-chain rewards.</p>
                    <p>After installation, refresh this cabinet or press <strong>Connect Phantom Wallet</strong> again to link your pilot.</p>
                `;
                hubContent.prepend(guideCard);
            } else {
                guideCard.style.display = '';
            }

            requestAnimationFrame(() => {
                const focusTarget = guideCard.querySelector('a') || guideCard;
                if (focusTarget && typeof focusTarget.focus === 'function') {
                    focusTarget.focus();
                }
            });
        }
    }

    showHub();
}

function clearPhantomInstallGuide({ resetStatus = false } = {}) {
    const guideCard = document.getElementById(PHANTOM_GUIDE_CARD_ID);
    if (guideCard) {
        guideCard.remove();
    }

    if (playBtn && playBtn.dataset.walletLocked === 'true') {
        playBtn.disabled = false;
        delete playBtn.dataset.walletLocked;
    }

    if (resetStatus && walletStatusEl && !walletPublicKey) {
        walletStatusEl.textContent = 'Phantom Wallet detected. Connect to sync your progress.';
    }
}

async function connectWallet() {
    const provider = window.phantom?.solana;

    if (!provider) { openPhantomInstallGuide(); return; }

    clearPhantomInstallGuide({ resetStatus: true });
    if (walletStatusEl) walletStatusEl.textContent = 'Connecting to Phantom...';

    try {
        const resp = await provider.connect();
        walletPublicKey = resp.publicKey.toString();
        walletProvider = provider;

        pendingChainSnapshot = null;
        if (chainSyncTimeoutId) {
            clearTimeout(chainSyncTimeoutId);
            chainSyncTimeoutId = null;
        }

        if (walletStatusEl) walletStatusEl.textContent = `Connected: ${walletPublicKey.slice(0, 8)}...`;
        if (connectBtn) connectBtn.textContent = 'Disconnect';

        const librariesReady = await ensureSolanaLibrariesLoaded();
        if (!librariesReady) {
            console.error('Solana Web3 libraries failed to load.');
            if (nftStatusEl) nftStatusEl.textContent = 'NFT Status: Check Failed (No Libraries)';
        } else { await checkNFT(walletPublicKey); }

        await loadPlayerData();
        showHub();
    } catch (err) {
        console.error('Wallet connect error:', err);
        if (walletStatusEl) walletStatusEl.textContent = 'Connection Rejected/Failed';
    }
}

async function disconnectWallet() {
    if (walletPublicKey) {
        savePlayerData();
        if (chainSyncTimeoutId) {
            clearTimeout(chainSyncTimeoutId);
            chainSyncTimeoutId = null;
        }
        if (pendingChainSnapshot) {
            await syncProgressToChain(pendingChainSnapshot);
            pendingChainSnapshot = null;
        }
    }

    walletPublicKey = null;
    walletProvider = null;
    hasAstroCatNFT = false;
    pendingChainSnapshot = null;
    solanaConnection = null;

    if (walletStatusEl) walletStatusEl.textContent = 'Not Connected';
    if (nftStatusEl) nftStatusEl.textContent = 'Not Detected';
    if (connectBtn) connectBtn.textContent = 'Connect Phantom Wallet';

    playerData = createBasePlayerData();
    initializeSpriteSystem();

    showStartMenu();
}

async function checkNFT(publicKey) {
    const librariesReady = await ensureSolanaLibrariesLoaded();
    if (!librariesReady) { if (nftStatusEl) nftStatusEl.textContent = 'NFT Check Failed (Libraries Missing)'; return; }

    const maxAttempts = Math.max(1, SOLANA_RPC_ENDPOINTS.length || 1);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const connection = getSolanaConnection();
        if (!connection) break;

        try {
            const metaplex = Metaplex.make(connection);
            const nfts = await metaplex.nfts().findAllByOwner({ owner: new solanaWeb3.PublicKey(publicKey) }).run();
            hasAstroCatNFT = nfts.some(nft => nft.collection?.key.toString() === ASTRO_CAT_COLLECTION_MINT);
            if (nftStatusEl) nftStatusEl.textContent = `NFT Status: ${hasAstroCatNFT ? 'Detected! Persistent Account' : 'Not Detected (Volatile Session)'}`;

            if (playBtn) playBtn.disabled = false;

            if (hasAstroCatNFT && !playerData.gamesPlayed) {
                playerData = createBasePlayerData();
                initializeSpriteSystem();
                savePlayerData();
            }
            return;
        } catch (err) {
            console.error('NFT check error:', err);
            handleSolanaRpcError(err);
        }

        if (solanaConnection) {
            break;
        }
    }

    hasAstroCatNFT = false;
    if (nftStatusEl) nftStatusEl.textContent = 'NFT Check Failed';
    if (playBtn) playBtn.disabled = false;
}

// --- GAME LOOP FUNCTIONS (These call the logic functions above) ---

function updateEnemies() {
    if (hitStopDuration > 0) return;
    const now = Date.now();
    if (bossActive && boss) { updateBossAI(now, deltaMultiplier); }

    const handlePlayerDamage = (baseDamage) => resolveIncomingDamage(baseDamage, { announce: true });

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (bossActive && enemy !== boss && enemy.variant !== 'mecha') continue;

        const horizontalSpeed = enemy.speed || 0;
        const verticalSpeed = enemy.dy || 0;
        enemy.x -= horizontalSpeed * deltaMultiplier;
        enemy.y += verticalSpeed * deltaMultiplier;
        if (enemy.diveStrength) {
            enemy.divePhase = (enemy.divePhase || 0) + deltaTime * 3;
            enemy.y += Math.sin(enemy.divePhase) * enemy.diveStrength * deltaTime;
        }
        enemy.y = clampWithinPadding(enemy.y, enemy.height, gameCanvas.height, PLAYFIELD_PADDING_Y);
        if (enemy.x < -enemy.width) { enemies.splice(i, 1); continue; }

        let tailHit = false;
        for (let t = 1; t < tail.length; t++) {
            const seg = { x: tail[t].x, y: tail[t].y, width: player.width * 0.8, height: player.height * 0.8 };
            if (rectOverlap(enemy, seg)) { tailHit = true; break; }
        }
        if (tailHit) {
            const result = handlePlayerDamage(1);
            if (result.prevented && result.reason === 'mitigated' && result.mitigatedDamage > 0 && lives > 0) {
                showAnnounce(waveAnnounceEl, 'Armor dampened the tail strike!');
            }
            enemies.splice(i, 1);
            continue;
        }

        if (rectOverlap(player, enemy)) {
            if (shieldActive) {
                score += 10 * (enemy.hp || 1);
                uiCache.score = null;
                updateTailLength();
                enemies.splice(i, 1);
                shieldActive = false;
            } else {
                const result = handlePlayerDamage(1);
                if (result.prevented && result.reason === 'mitigated' && result.mitigatedDamage > 0 && lives > 0) {
                    showAnnounce(waveAnnounceEl, 'Plating absorbed most of the impact!');
                }
                enemies.splice(i, 1);
            }
            continue;
        }
    }

    for (let p = projectiles.length - 1; p >= 0; p--) {
        const proj = projectiles[p]; let hitsThisFrame = 0;
        prepareProjectile(proj);
        for (let e = enemies.length - 1; e >= 0 && hitsThisFrame < proj.hits; e--) {
            const enemy = enemies[e];
            if (rectOverlap(proj, enemy)) {
                let damage = proj.baseDamage ?? proj.damage ?? 1;
                let isCrit = false;

                if (Math.random() < player.critChance) {
                    damage *= player.critMultiplier;
                    isCrit = true;
                }

                let finalDamage = damage * (player.damageMultiplier || 1);
                if (proj.isBeam) {
                    finalDamage = Math.max(0.05, Math.round(finalDamage * 100) / 100);
                } else {
                    finalDamage = Math.max(0, finalDamage);
                }

                if (enemy === boss) {
                    hitStopDuration = framesToMs(5);
                    screenShakeDuration = framesToMs(20);
                }

                emitParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, isCrit ? 6 : 3);
                enemy.hp = (enemy.hp || 1) - finalDamage;

                if (enemy.hp <= 0) {
                    const streakBonus = killStreak >= COMBO_THRESHOLD ? 20 : 10;
                    score += streakBonus + (enemy.variant === 'mecha' ? 10 : 0) + (enemy.variant === 'boss' ? 100 : 0);
                    uiCache.score = null;

                    // XP GAIN
                    const baseXP = 3 + level * 1.5;
                    const difficultyBonus = Math.max(1, Math.floor(difficultyFactor));
                    const bossBonus = enemy.variant === 'boss' ? 40 : 0;
                    const xpReward = Math.round(baseXP + difficultyBonus + bossBonus);
                    gainXP(xpReward, { source: enemy.variant === 'boss' ? 'boss' : 'combat', difficulty: difficultyFactor });
                    
                    const killTime = Date.now();
                    if (killTime - lastKillTime < COMBO_WINDOW) { killStreak++; } else { killStreak = 1; }
                    lastKillTime = killTime;
                    uiCache.combo = null;
                    
                    // --- DAILY QUEST: ACHIEVE COMBO 5 TRACKING ---
                    const comboQuest = playerData.daily.quests.find(q => q.id === 'achieveCombo');
                    if (comboQuest && !comboQuest.completed && killStreak >= comboQuest.target && comboQuest.progress < comboQuest.target) {
                        comboQuest.progress = comboQuest.target; 
                        savePlayerData();
                    }
                    // ---------------------------------------------
                    
                    if (killStreak >= COMBO_THRESHOLD) { registerSpeedModifier(1.2, 3000, 'combo_streak'); }
    
                    if (enemy === boss) {
                        enemies.splice(e, 1);
                        bossActive = false;
                        if (boss.split) {
                            const shardSize = {
                                width: Math.max(ENEMY_MIN_SIZE * 0.75, Math.round(enemySpriteDimensions.width * 0.6)),
                                height: Math.max(ENEMY_MIN_SIZE * 0.75, Math.round(enemySpriteDimensions.height * 0.6))
                            };
                            for (let j = 0; j < 3; j++) {
                                enemies.push({
                                    x: boss.x,
                                    y: boss.y + j * 40 - 40,
                                    width: shardSize.width,
                                    height: shardSize.height,
                                    speed: 4,
                                    dy: (Math.random() - 0.5) * 2,
                                    variant: 'mecha',
                                    hp: 1,
                                    diveStrength: 0,
                                    divePhase: 0
                                });
                            }
                        }
                        showAnnounce(waveAnnounceEl, 'Boss Defeated!');
                        
                    } else {
                        const dropChance = Math.min(0.95, 0.2 + (player.focusRating * 0.01) + (player.specialPerks?.dropChanceBonus || 0));
                        if (Math.random() < dropChance) {
                            const puTypes = ['speed', 'rapid', 'shield', 'life', 'spread', 'homing', 'pierce'];
                            const puType = puTypes[Math.floor(Math.random() * puTypes.length)];
                            powerups.push({ x: enemy.x + enemy.width / 2 - 10, y: enemy.y + enemy.height / 2 - 10, type: puType, width: 20, height: 20 });
                        } enemies.splice(e, 1);
                    }
                }
                hitsThisFrame++;
                updateTailLength();
            }
        }
        if (hitsThisFrame > 0) { proj.hits -= hitsThisFrame; if (proj.hits <= 0) { projectiles.splice(p, 1); } }
    }
    if (Date.now() - lastKillTime > COMBO_WINDOW) {
        if (killStreak !== 0) {
            killStreak = 0;
            uiCache.combo = null;
        }
    }
}

function updatePlayer() {
    if (gamePaused || hitStopDuration > 0) return;

    const now = Date.now();
    if (dashActive && now >= dashEndTime) {
        dashActive = false;
        dashDirection = null;
        dashDurationMs = 0;
    }

    let inputX = 0;
    let inputY = 0;

    if (keys['ArrowLeft'] || keys['KeyA']) inputX -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) inputX += 1;
    if (keys['ArrowUp'] || keys['KeyW']) inputY -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) inputY += 1;

    if (joystickActive) {
        const smoothingFactor = Math.min(1, deltaMultiplier * JOYSTICK_SMOOTHING * TARGET_FPS);
        joystickSmoothed.x += (joystickDelta.x - joystickSmoothed.x) * smoothingFactor;
        joystickSmoothed.y += (joystickDelta.y - joystickSmoothed.y) * smoothingFactor;
        inputX += joystickSmoothed.x;
        inputY += joystickSmoothed.y;
    } else {
        joystickSmoothed.x += (0 - joystickSmoothed.x) * 0.2;
        joystickSmoothed.y += (0 - joystickSmoothed.y) * 0.2;
    }

    const magnitude = Math.hypot(inputX, inputY);
    if (magnitude > 1) {
        inputX /= magnitude;
        inputY /= magnitude;
    }

    if (magnitude > 0.01) {
        lastMovementInput = { x: inputX, y: inputY };
    }

    if (dashActive && Math.abs(inputX) < 0.01 && Math.abs(inputY) < 0.01) {
        inputX = dashVector.x;
        inputY = dashVector.y;
    }
    const playerSpeed = getCurrentPlayerSpeed();
    const targetDX = inputX * playerSpeed;
    const targetDY = inputY * playerSpeed;

    if (dashActive) {
        const dashTimeRemaining = Math.max(0, dashEndTime - now);
        const dashRatio = dashDurationMs > 0 ? Math.max(0, Math.min(1, dashTimeRemaining / dashDurationMs)) : 0;
        const dashSpeedScale = 1 + (DASH_SPEED_MULTIPLIER - 1) * Math.pow(dashRatio, DASH_EASING_POWER);
        const dashDX = dashVector.x * playerSpeed * dashSpeedScale;
        const dashDY = dashVector.y * playerSpeed * dashSpeedScale;
        const blendedDX = dashDX * (1 - DASH_CONTROL_BLEND) + targetDX * DASH_CONTROL_BLEND;
        const blendedDY = dashDY * (1 - DASH_CONTROL_BLEND) + targetDY * DASH_CONTROL_BLEND;
        const accelFactor = Math.min(1, deltaMultiplier * ((PLAYER_ACCELERATION * DASH_ACCELERATION_MULTIPLIER) / TARGET_FPS));
        player.dx += (blendedDX - player.dx) * accelFactor;
        player.dy += (blendedDY - player.dy) * accelFactor;
    } else {
        const accelFactor = Math.min(1, deltaMultiplier * (PLAYER_ACCELERATION / TARGET_FPS));
        player.dx += (targetDX - player.dx) * accelFactor;
        player.dy += (targetDY - player.dy) * accelFactor;

        if (Math.abs(inputX) < 0.01 && Math.abs(inputY) < 0.01) {
            const friction = Math.pow(PLAYER_FRICTION, deltaMultiplier);
            player.dx *= friction;
            player.dy *= friction;
            if (Math.abs(player.dx) < 0.02) player.dx = 0;
            if (Math.abs(player.dy) < 0.02) player.dy = 0;
        }
    }

    player.x += player.dx * deltaMultiplier;
    player.y += player.dy * deltaMultiplier;
    clampPlayerToPlayfield();

    if ((Math.abs(player.dx) > 0.01 || Math.abs(player.dy) > 0.01) && gameRunning) {
        emitParticles(player.x, player.y, 2, dashActive);
    }

    const newHead = { x: player.x, y: player.y };
    tail.unshift(newHead);
    updateTailLength();
}

function updateProjectiles() {
    if (hitStopDuration > 0) return;
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        prepareProjectile(proj);
        if (homingActive && proj.targetX !== null && !proj.isBeam) {
            const dx = proj.targetX - proj.x; const dy = proj.targetY - proj.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                const angle = Math.atan2(dy, dx);
                const adjustStep = (proj.speed || 0) * deltaMultiplier * 0.1;
                proj.x += Math.cos(angle) * adjustStep;
                proj.y += Math.sin(angle) * adjustStep;
            }
            proj.x += (proj.speed || 0) * deltaMultiplier;
        } else {
            proj.x += (proj.speed || 0) * deltaMultiplier;
        }
        if (proj.dy) {
            proj.y += proj.dy * deltaMultiplier;
        }
        if (proj.x > gameCanvas.width || proj.hits <= 0) { projectiles.splice(i, 1); }
    }
}

function updatePowerups() {
    if (hitStopDuration > 0) return;
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i]; pu.x -= 1.5 * deltaMultiplier;
        if (pu.x < -pu.width) { powerups.splice(i, 1); continue; }
        if (rectOverlap(player, pu)) { applyPowerup(pu.type); powerups.splice(i, 1); }
    }
}

function spawnEnemy() {
    if (!gameRunning || bossActive || gamePaused || hitStopDuration > 0) return;

    enemySpawnTimer += deltaTime;
    const spawnInterval = getSpawnIntervalSeconds();

    if (enemySpawnTimer >= spawnInterval) {
        enemySpawnTimer = 0;
        const template = buildEnemyTemplate();

        let minY = PLAYFIELD_PADDING_Y;
        let maxY = gameCanvas.height - enemySpriteDimensions.height - PLAYFIELD_PADDING_Y;
        if (maxY <= minY) {
            minY = 0;
            maxY = Math.max(0, gameCanvas.height - enemySpriteDimensions.height);
        }
        const spawnRange = Math.max(0, maxY - minY);
        const spawnY = spawnRange > 0 ? minY + Math.random() * spawnRange : minY;

        enemies.push({
            x: gameCanvas.width,
            y: spawnY,
            width: enemySpriteDimensions.width,
            height: enemySpriteDimensions.height,
            speed: template.speed,
            dy: (Math.random() - 0.5) * template.verticalVariance,
            variant: template.variant,
            hp: template.hp,
            diveStrength: template.diveStrength,
            divePhase: Math.random() * Math.PI * 2
        });
    }
}

function updateBossAI(now, deltaStep) {
    if (!boss || !boss.mirrorDash) return;
    if (!boss.lastDash) { boss.lastDash = now; }
    const dashChance = 0.01 * (deltaStep || 1);
    if (now - boss.lastDash > 2000 && Math.random() < dashChance) {
        const dx = player.x - boss.x; const dy = player.y - boss.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            boss.dx = (dx / dist) * boss.speed * 2;
            boss.dy = (dy / dist) * boss.speed * 2;
            setTimeout(() => { boss.dx = 0; boss.dy = 0; }, 500);
            boss.lastDash = now;
        }
    }
    const moveX = typeof boss.dx === 'number' && boss.dx !== 0 ? boss.dx : -boss.speed;
    const moveY = typeof boss.dy === 'number' ? boss.dy : 0;
    boss.x += moveX * (deltaStep || 1);
    boss.y += moveY * (deltaStep || 1);
    boss.y = clampWithinPadding(boss.y, boss.height, gameCanvas.height, PLAYFIELD_PADDING_Y);
}

// --- RENDERING & WEBGL FUNCTIONS ---

function renderGameScene() {
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    gameCtx.save();
    starField.forEach(star => {
        const brightness = (Math.sin(star.twinkle) + 1) * 0.25 + 0.5;
        gameCtx.globalAlpha = brightness;
        gameCtx.fillStyle = '#ffffff';
        gameCtx.fillRect(star.x, star.y, star.size, star.size);
    });
    gameCtx.restore();

    drawParticles(); drawTail();
    powerups.forEach(pu => {
        const visuals = POWERUP_VISUALS[pu.type] || POWERUP_VISUALS.default;
        drawPowerup(pu.x, pu.y, pu.width, pu.height, visuals);
    });

    projectiles.forEach(proj => {
        const spriteKey = proj.spriteKey || (proj.isBeam ? 'beam' : 'bolt');
        const projectileSprite = projectileImageCache[spriteKey];

        if (isImageReady(projectileSprite)) {
            gameCtx.save();
            const width = proj.width;
            const height = proj.height;
            const centerX = proj.x + width / 2;
            const centerY = proj.y + height / 2;
            gameCtx.translate(centerX, centerY);

            if (!proj.isBeam) {
                const angle = Math.atan2(proj.dy || 0, Math.max(0.001, proj.speed || 0.001));
                gameCtx.rotate(angle);
                gameCtx.shadowColor = '#ffe066';
                gameCtx.shadowBlur = Math.max(width, height);
            } else {
                gameCtx.shadowColor = '#ff82ff';
                gameCtx.shadowBlur = Math.max(width, height) * 0.6;
                gameCtx.globalAlpha = 0.95;
            }

            gameCtx.drawImage(projectileSprite, -width / 2, -height / 2, width, height);
            gameCtx.restore();
        } else {
            gameCtx.fillStyle = proj.isBeam ? '#ff00ff' : '#ffff00';
            gameCtx.fillRect(proj.x, proj.y, proj.width, proj.height);
        }
    });

    enemies.forEach(enemy => {
        const extra = bossActive && enemy === boss ? { variant: 'boss', hp: boss.hp / boss.maxHp * 5 + 1 } : { variant: enemy.variant };
        drawImageOrProcedural(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height, false, extra);
    });

    if (shieldActive) {
        drawImageOrProcedural(
            playerImg,
            player.x,
            player.y,
            player.width,
            player.height,
            true,
            { glowColor: '#00ffff', glowBlur: 15 }
        );
    } else if (dashActive) {
        drawImageOrProcedural(
            playerImg,
            player.x,
            player.y,
            player.width,
            player.height,
            true,
            { glowColor: '#ffff00', glowBlur: 20 }
        );
    } else if (isCharging) {
        const chargeLevel = Math.min(1, (Date.now() - chargeStartTime) / 1500);
        drawImageOrProcedural(
            playerImg,
            player.x,
            player.y,
            player.width,
            player.height,
            true,
            { chargeLevel }
        );
    } else {
        drawImageOrProcedural(playerImg, player.x, player.y, player.width, player.height, true);
    }

    gameCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < gameCanvas.height; i += 3) { gameCtx.fillRect(0, i, gameCanvas.width, 1); }
}

function compileShader(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader ${type} error:`, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initWebGL() {
    configureCanvasResolution();
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        console.warn('WebGL not supported, falling back to 2D');
        if (!ctx) {
            ctx = canvas.getContext('2d');
        }
        return false;
    }

    const vsSource = `attribute vec2 a_position; varying vec2 v_texCoord; void main() { gl_Position = vec4(a_position, 0.0, 1.0); v_texCoord = (a_position + 1.0) / 2.0; }`;
    const fsSource = `
        precision mediump float; varying vec2 v_texCoord; uniform sampler2D u_texture; uniform vec2 u_resolution; uniform float u_curvature;
        void main() {
            vec2 coord = v_texCoord; vec2 center = vec2(0.5, 0.5); vec2 delta = coord - center;
            float dist = length(delta); float curvatureFactor = 1.0 + u_curvature * dist * dist;
            vec2 warpedCoord = center + delta / curvatureFactor; warpedCoord = clamp(warpedCoord, 0.0, 1.0);
            vec4 color = texture2D(u_texture, warpedCoord);
            float scanline = sin(warpedCoord.y * u_resolution.y * 0.016) * 0.05; color.rgb *= (1.0 - abs(scanline));
            float vignette = 1.0 - length(delta) * 1.5; vignette = clamp(vignette, 0.0, 1.0); color.rgb *= vignette;
            color.rgb += color.rgb * 0.2 * vignette;
            gl_FragColor = color;
        }
    `;

    const vertexShader = compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return false;

    program = gl.createProgram(); gl.attachShader(program, vertexShader); gl.attachShader(program, fragmentShader); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error('Program link error:', gl.getProgramInfoLog(program)); return false; }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    vertexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_curvature'), 0.3);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc); gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    return true;
}

function renderWithShader() {
    if (!gl || !program) {
        if (!ctx) {
            ctx = canvas.getContext('2d');
        }
        configureCanvasResolution();
        ctx.imageSmoothingEnabled = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(gameCanvas, 0, 0, canvas.width, canvas.height);
        return;
    }
    configureCanvasResolution();
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gameCanvas);
    gl.clear(gl.COLOR_BUFFER_BIT); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// --- MAIN GAME LOOP ---
function render() {
    if (hitStopDuration <= 0) {
        if (screenShakeDuration > 0) {
            const intensity = Math.min(1, screenShakeDuration / framesToMs(20));
            const offsetX = (Math.random() * 5 - 2.5) * intensity;
            const offsetY = (Math.random() * 5 - 2.5) * intensity;
            if (canvas) canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        } else {
            if (canvas) canvas.style.transform = 'translate(0, 0)';
        }
    }

    renderGameScene();
    renderWithShader();
}

function gameLoop(timestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (lastFrameTimestamp === null) {
        lastFrameTimestamp = timestamp;
    }

    const rawDelta = (timestamp - lastFrameTimestamp) / 1000;
    lastFrameTimestamp = timestamp;
    deltaTime = Math.min(rawDelta > 0 ? rawDelta : FRAME_TIME, 0.1);
    deltaMultiplier = Math.max(0.25, Math.min(deltaTime / FRAME_TIME, 3));

    const elapsedMs = deltaTime * 1000;
    if (hitStopDuration > 0) {
        hitStopDuration = Math.max(0, hitStopDuration - elapsedMs);
    }
    if (screenShakeDuration > 0) {
        screenShakeDuration = Math.max(0, screenShakeDuration - elapsedMs);
    }

    updateDifficultyProgress(deltaTime);
    updateStarfield();

    if (hitStopDuration === 0) {
        updateParticles();
        if (gameRunning && !gamePaused) {
            updatePlayer();
            updateProjectiles();
            if (!bossActive) spawnEnemy();
            updateEnemies();
            updatePowerups();
        }
    }

    updateDashCooldown();

    render();
    updateUI();
    requestAnimationFrame(gameLoop);
}

// Expose functions globally for HTML
window.startGame = startGame;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.showStartMenu = showStartMenu;
window.showHub = showHub;
window.openShop = openShop;
window.rollUpgrade = rollUpgrade;
window.skipShop = skipShop;
window.purchaseUpgrade = purchaseUpgrade;
window.purchaseSprite = purchaseSprite;
window.claimQuestReward = claimQuestReward;
window.hideAllOverlays = hideAllOverlays;
window.showStatAllocation = showStatAllocation;
window.resumeGameFromFocusLoss = resumeGameFromFocusLoss;
window.queueFocusResumeEffect = queueFocusResumeEffect;

function handlePhantomAvailability() {
    if (window.phantom?.solana) {
        clearPhantomInstallGuide({ resetStatus: true });
    }
}

window.addEventListener('phantom#initialized', handlePhantomAvailability);
window.addEventListener('solana#initialized', handlePhantomAvailability);

if (window.phantom?.solana) {
    handlePhantomAvailability();
}

// --- CRITICAL FIX: Ensure Initialization Runs After DOM Load ---
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
document.addEventListener('visibilitychange', handleDocumentVisibilityChange);
window.addEventListener('blur', handleWindowBlur);
window.addEventListener('focus', () => resumeGameFromFocusLoss({ auto: true }));
window.addEventListener('blur', resetKeyState);

function initializeApp() {
    if (hasInitialized) {
        return;
    }

    if (!canvas) {
        console.error('Unable to initialize Astro Invaders: canvas element not found.');
        return;
    }

    hasInitialized = true;

    initializeVisualAssets();
    const webglReady = initWebGL();
    if (!webglReady && !ctx) {
        ctx = canvas.getContext('2d');
    }
    initializeSpriteSystem();
    initializeUIEvents();
    configureTouchControls();
    monitorPointerCapabilityChanges();
    showStartMenu();
    loadAndDisplayLeaderboard();

    gameLoop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
    initializeApp();
}
