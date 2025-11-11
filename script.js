/**
 * Retro XP Anime Invaders - script.js (DEFINITIVE FINAL VERSION)
 * FIX: CRITICAL EXECUTION FIX - Implemented placeholder logic for loadAndDisplayLeaderboard
 * to resolve the startup failure and ensured all functions are properly ordered.
 * ----------------------------------------------------------------------------------
 */

// Canvas setup
const canvas = document.getElementById('canvas');
let ctx = null;

// Offscreen canvas setup
const gameCanvas = document.createElement('canvas');
gameCanvas.width = 800;
gameCanvas.height = 600;
const gameCtx = gameCanvas.getContext('2d');

// UI elements 
const scoreEl = document.getElementById('score');
const creditsEl = document.getElementById('credits');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const dashCooldownEl = document.getElementById('dash-cooldown');
const dashBarEl = document.getElementById('dash-bar');
const dragDrop = document.getElementById('drag-drop');
const joystick = document.getElementById('joystick');
const knob = document.getElementById('knob');
const startMenuEl = document.getElementById('start-menu');
const hubEl = document.getElementById('hub');
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
const statusClockEl = document.getElementById('status-clock');


// Runtime & timing helpers
const TARGET_FPS = 60;
const FRAME_TIME = 1 / TARGET_FPS;
const FRAME_MS = 1000 / TARGET_FPS;

let lastFrameTimestamp = null;
let deltaTime = FRAME_TIME;
let deltaMultiplier = 1;

// Wallet & Blockchain
let walletPublicKey = null;
let hasAstroCatNFT = false;

function createDefaultQuests() {
    return [
        { id: 'playRounds', desc: 'Play 3 Rounds', target: 3, progress: 0, reward: { type: 'credits', amount: 50 }, completed: false },
        { id: 'defeatBoss', desc: 'Defeat 1 Boss', target: 1, progress: 0, reward: { type: 'xpBonus', amount: 100 }, completed: false },
        { id: 'achieveCombo', desc: 'Achieve Combo 5', target: 5, progress: 0, reward: { type: 'levelPoint', amount: 1 }, completed: false },
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
        levelPoints: 0,
        stats: {
            attack: 0,
            defense: 0,
            agility: 0,
            luck: 0
        },
        daily: {
            lastLogin: 0,
            claimedLogin: false,
            quests: createDefaultQuests()
        }
    };
}

let playerData = createBasePlayerData();
const ASTRO_CAT_COLLECTION_MINT = 'AstroCatMintAddress'; 
let gl;
let program;
let vertexBuffer;
let texture;

// Game state & Constants
let gameRunning = false; let gamePaused = true; 
let score = 0; let credits = 0; let level = 1; let lives = 3;
let playerImg = null; let enemyImg = null; let assetsLoaded = false;
let powerups = [];
let rapidFire = false; let shieldActive = false; let spreadActive = false;
let homingActive = false; let pierceActive = false; let ultraDashActive = false;
let enemyWave = []; let enemySpawnTimer = 0; let currentWaveConfig = null;
let bossActive = false; let boss = null; let dashActive = false; let dashDirection = null;
const DASH_COOLDOWN_DURATION = 2000; 
let dashCooldown = 0;
let tail = []; let particles = [];
let chargeStartTime = 0; let isCharging = false;
const COMBO_WINDOW = 5000; const COMBO_THRESHOLD = 3;
let killStreak = 0; let lastKillTime = 0;
let powerupTimeouts = [];
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

const STAR_COUNT = 120;
const starField = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * gameCanvas.width,
    y: Math.random() * gameCanvas.height,
    speed: 40 + Math.random() * 80,
    size: Math.random() * 2 + 1,
    twinkle: Math.random() * Math.PI * 2
}));

// LEVELING CONSTANTS
const BASE_XP_TO_LEVEL = 100;
const XP_MULTIPLIER = 1.15;
const MAX_PLAYER_LEVEL = 50;

const waveConfigs = [
    { level: 1, type: 'basic', speed: 2, count: 10, theme: 'Scouts' },
    { level: 2, type: 'basic', speed: 2.5, count: 12, theme: 'Patrol' },
    { level: 3, type: 'mecha', speed: 3.5, count: 15, theme: 'Mecha Swarm', dive: true },
    { level: 4, type: 'mecha', speed: 3, count: 18, theme: 'Divers' },
    { level: 5, type: 'boss', speed: 1, count: 1, theme: 'Kaiju Boss', hp: 50, split: true, mirrorDash: true }
];

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

const SPRITE_DIRECTORY = 'assets/sprites/';

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
        return;
    }
    const fallbackSrc = getSpriteFallback(meta);
    if (fallbackSrc) {
        const fallbackImage = new Image();
        fallbackImage.isFallback = true;
        fallbackImage.src = fallbackSrc;
        spriteImageCache[meta.id] = fallbackImage;
        playerImg = fallbackImage;
    } else {
        playerImg = null;
    }

    if (meta.fileName) {
        const assetImage = new Image();
        assetImage.src = `${SPRITE_DIRECTORY}${meta.fileName}`;
        assetImage.onload = () => {
            assetImage.isFallback = false;
            spriteImageCache[meta.id] = assetImage;
            if (playerData.activeSpriteId === meta.id) {
                playerImg = assetImage;
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

const player = {
    x: 50, y: gameCanvas.height / 2, width: 50, height: 50, speed: 5, dx: 0, dy: 0,
    damageMultiplier: 1, defenseRating: 0, luckRating: 0, critChance: 0, critMultiplier: 2.0
};

let projectiles = []; let enemies = [];

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
        const attackStat = playerData?.stats?.attack ?? 0;
        const widthScale = 1 + attackStat * 0.1;
        proj.width = proj.baseWidth * widthScale;
        proj.height = proj.baseHeight;
        proj.scaledForAttack = true;
    }
}
const keys = {}; let joystickActive = false; let joystickDelta = { x: 0, y: 0 };
let joystickSmoothed = { x: 0, y: 0 };
const JOYSTICK_SMOOTHING = 0.15;
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

function resetKeyState() {
    Object.keys(keys).forEach(code => {
        keys[code] = false;
    });
    isCharging = false;
    chargeStartTime = 0;
    dashDirection = null;
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
        scaledForAttack: false
    };
    projectiles.push(projectile);
}

function triggerDash(directionKey) {
    const now = Date.now();
    const agilityCooldownReduction = playerData.stats.agility * 50;
    const baseDuration = Math.max(500, DASH_COOLDOWN_DURATION - agilityCooldownReduction);
    const finalCooldown = ultraDashActive ? baseDuration / 2 : baseDuration;
    if (dashActive || dashCooldown > now || gamePaused) return;

    dashActive = true;
    dashCooldown = now + finalCooldown;
    dashDirection = directionKey;
    setTimeout(() => {
        dashActive = false;
        dashDirection = null;
    }, Math.max(150, Math.min(DASH_DURATION, finalCooldown / 3)));

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
    const agilityBonus = playerData.stats.agility * 15;
    const baseInterval = rapidFire ? RAPID_SHOT_INTERVAL : BASE_SHOT_INTERVAL;
    const finalInterval = Math.max(80, baseInterval - agilityBonus);

    if (chargeLevel === 0 && now - lastShotTime < finalInterval) {
        return;
    }
    lastShotTime = now;

    const attackStat = playerData.stats.attack || 0;
    const baseDamage = 1 + attackStat;
    const damageMultiplier = 1 + chargeLevel * 2;
    const projectileDamage = baseDamage * damageMultiplier * (player.damageMultiplier || 1);
    const projectileSpeed = 12 + chargeLevel * 6;
    const isBeam = chargeLevel >= 0.95;
    const pierceHits = pierceActive || isBeam ? 3 + Math.floor(chargeLevel * 2) : 1;

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
            targetY: nearest ? nearest.y : null
        });
    } else {
        const baseConfig = {
            width: 10 + chargeLevel * 4,
            height: 4 + chargeLevel * 2,
            speed: projectileSpeed,
            damage: projectileDamage,
            hits: pierceHits,
            targetX: nearest ? nearest.x : null,
            targetY: nearest ? nearest.y : null
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

function handleKeyDown(event) {
    const { code } = event;
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
    speed: { color: '#ff9f1c', letter: 'S' },
    rapid: { color: '#ffe066', letter: 'R' },
    shield: { color: '#4dabf7', letter: 'D' },
    life: { color: '#fa5252', letter: '♥' },
    spread: { color: '#845ef7', letter: 'W' },
    homing: { color: '#3bc9db', letter: 'H' },
    pierce: { color: '#e64980', letter: 'P' },
    ultra_dash: { color: '#ffd43b', letter: 'U' },
    default: { color: '#ffffff', letter: '?' }
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
    const levelText = `Level: ${playerData.level} (XP: ${playerData.currentXP}/${getXPForNextLevel(playerData.level)})`;
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
        
        const rewardText = quest.reward.type === 'credits' ? `+${quest.reward.amount} Cr` :
                           quest.reward.type === 'xpBonus' ? `+${quest.reward.amount} XP` :
                           `+${quest.reward.amount} Stat Point`;

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

function updateHubUI() {
    // This helper MUST be defined early as it's called immediately by loadPlayerData and checkNFT
    if (!walletPublicKey) return;
    if (walletAddressEl) walletAddressEl.textContent = walletPublicKey.slice(0, 8) + '...';
    if (gamesPlayedEl) gamesPlayedEl.textContent = playerData.gamesPlayed;
    if (winsEl) winsEl.textContent = playerData.wins; 
    if (lossesEl) lossesEl.textContent = playerData.losses;
    if (bestScoreEl) bestScoreEl.textContent = playerData.bestScore;
    if (hubCreditsEl) hubCreditsEl.textContent = playerData.credits;
    if (statLevelHubEl) statLevelHubEl.textContent = playerData.level;
    if (statLevelOverlayEl) statLevelOverlayEl.textContent = playerData.level;
    if (statPointsEl) statPointsEl.textContent = playerData.levelPoints;
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
}

// --------------------------------------------------------------------
// CORE OVERLAY & GAME FLOW HELPERS
// --------------------------------------------------------------------

function hideAllOverlays() {
    [startMenuEl, hubEl, shopEl, statAllocationEl].forEach(el => {
        if (el) {
            el.style.display = 'none';
        }
    });
}

function showStartMenu() {
    gameRunning = false;
    gamePaused = true;
    hideAllOverlays();
    if (startMenuEl) startMenuEl.style.display = 'flex';
    updateUI();
    updateHubUI();
}

function showHub() {
    gameRunning = false;
    gamePaused = true;
    hideAllOverlays();
    if (hubEl) hubEl.style.display = 'flex';
    updateUI();
    updateHubUI();
    loadAndDisplayLeaderboard();
}

function startGame(isNewSession = true) {
    hideAllOverlays();

    gameRunning = true;
    gamePaused = false;
    bossActive = false;
    boss = null;
    dashActive = false;

    lives = 3;
    score = 0;
    level = 1;
    enemies = [];
    projectiles = [];
    powerups = [];
    enemyWave = [];
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

    powerupTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    powerupTimeouts = [];

    resetKeyState();
    lastShotTime = 0;

    if (typeof playerData.credits === 'number') {
        credits = playerData.credits;
        uiCache.credits = null;
        uiCache.shopCredits = null;
    }

    if (isNewSession) {
        playerData.gamesPlayed = (playerData.gamesPlayed || 0) + 1;
    }

    startNewRound(isNewSession);
    updateUI();
    updateHubUI();
    savePlayerData();
    loadAndDisplayLeaderboard();
}

function startNewRound(initialLoad = false) {
    gameRunning = true;
    gamePaused = false;
    hideAllOverlays();

    bossActive = false;
    boss = null;
    dashActive = false;
    enemySpawnTimer = 0;
    enemyWave = [];

    projectiles = [];
    enemies = [];
    powerups = [];
    tail = [];
    particles = [];

    killStreak = 0;
    lastKillTime = 0;
    uiCache.combo = null;

    powerupTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    powerupTimeouts = [];

    rapidFire = false;
    shieldActive = false;
    spreadActive = false;
    homingActive = false;
    pierceActive = false;
    ultraDashActive = false;

    player.x = 50;
    player.y = gameCanvas.height / 2;
    chargeStartTime = 0;
    isCharging = false;
    dashCooldown = 0;

    lastShotTime = 0;

    currentShopOptions = [];
    renderShopOptions();

    setupNextWave();

    if (!initialLoad) {
        const playQuest = playerData.daily?.quests?.find(q => q.id === 'playRounds');
        if (playQuest && !playQuest.completed) {
            playQuest.progress = Math.min(playQuest.target, playQuest.progress + 1);
        }
    }

    const spawnInterval = Math.max(20, 60 - score / 10) * FRAME_TIME;
    enemySpawnTimer = spawnInterval;
    spawnEnemy();
    enemySpawnTimer = 0;

    updateQuestsUI();
    updateUI();
    savePlayerData();
    loadAndDisplayLeaderboard();
}

function openShop() {
    gameRunning = false;
    gamePaused = true;
    hideAllOverlays();
    if (shopEl) shopEl.style.display = 'flex';
    renderShopOptions();
    updateUI();
    updateHubUI();
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
    const agilityCooldownReduction = playerData.stats.agility * 50; 
    const currentDashDuration = Math.max(500, DASH_COOLDOWN_DURATION - agilityCooldownReduction); 
    const finalDashDuration = ultraDashActive ? currentDashDuration / 2 : currentDashDuration;


    if (dashCooldown > now) {
        if (dashCooldownEl) dashCooldownEl.style.display = 'block';
        const progress = Math.max(0, (now - (dashCooldown - finalDashDuration)) / finalDashDuration); 
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
    const { color, letter } = visuals;
    gameCtx.fillStyle = color; gameCtx.fillRect(x, y, w, h);
    gameCtx.fillStyle = '#000000'; gameCtx.font = 'bold 12px "MS PGothic", monospace';
    gameCtx.textAlign = 'center'; gameCtx.textBaseline = 'middle';
    gameCtx.fillText(letter, x + w / 2, y + h / 2);
    gameCtx.textAlign = 'start'; gameCtx.textBaseline = 'alphabetic';
}

function drawImageOrProcedural(img, x, y, w, h, isPlayer = false, extra = {}) {
    if (img) { gameCtx.drawImage(img, x, y, w, h); } 
    else {
        if (isPlayer) drawPlayer(x, y, w, h, extra.chargeLevel || 0);
        else drawEnemy(x, y, w, h, extra.variant || 'basic', extra.hp || 1);
    }
}

function applyPowerup(type) {
    let timeoutId;

    switch (type) {
        case 'speed':
            player.speed *= 1.5; timeoutId = setTimeout(() => { player.speed /= 1.5; }, 5000); powerupTimeouts.push(timeoutId); break;
        case 'rapid':
            rapidFire = true; timeoutId = setTimeout(() => { rapidFire = false; }, 10000); powerupTimeouts.push(timeoutId); break;
        case 'shield':
            const shieldDuration = 5000 + (player.defenseRating * 1000); 
            shieldActive = true; timeoutId = setTimeout(() => { shieldActive = false; }, shieldDuration); powerupTimeouts.push(timeoutId); break;
        case 'life':
            lives++;
            uiCache.lives = null;
            if (livesEl) livesEl.textContent = `Lives: ${lives}`;
            break;
        case 'spread':
            spreadActive = true; timeoutId = setTimeout(() => { spreadActive = false; }, 8000); powerupTimeouts.push(timeoutId); break;
        case 'homing':
            homingActive = true; timeoutId = setTimeout(() => { homingActive = false; }, 6000); powerupTimeouts.push(timeoutId); break;
        case 'pierce':
            pierceActive = true; timeoutId = setTimeout(() => { pierceActive = false; }, 10000); powerupTimeouts.push(timeoutId); break;
        case 'ultra_dash':
            ultraDashActive = true; timeoutId = setTimeout(() => { ultraDashActive = false; }, 30000); powerupTimeouts.push(timeoutId); break;
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

// Drag-drop handlers
if (dragDrop) {
    dragDrop.addEventListener('dragover', (e) => { e.preventDefault(); dragDrop.classList.add('dragover'); });
    dragDrop.addEventListener('dragleave', () => { dragDrop.classList.remove('dragover'); });
    dragDrop.addEventListener('drop', (e) => {
        e.preventDefault(); dragDrop.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        if (file.name.toLowerCase().includes('player')) { playerImg = img; } 
                        else if (file.name.toLowerCase().includes('enemy')) { enemyImg = img; }
                        assetsLoaded = true;
                        if (dragDrop) dragDrop.style.display = 'none';
                        startGame(true);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

// --- LEADERBOARD & STORAGE ---

function saveLocalLeaderboard(currentData) {
    let leaderboard = JSON.parse(localStorage.getItem('astro_invaders_leaderboard') || '[]');

    leaderboard = leaderboard.filter(entry => entry.publicKey !== walletPublicKey);

    const newEntry = {
        publicKey: walletPublicKey,
        level: currentData.level,
        bestScore: currentData.bestScore,
        stats: currentData.stats 
    };

    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => {
        if (b.level !== a.level) { return b.level - a.level; }
        return b.bestScore - a.bestScore;
    });

    leaderboard = leaderboard.slice(0, 10);
    localStorage.setItem('astro_invaders_leaderboard', JSON.stringify(leaderboard));
}

function loadAndDisplayLeaderboard() {
    if (!leaderboardEl) return;

    const stored = JSON.parse(localStorage.getItem('astro_invaders_leaderboard') || '[]');
    const leaderboard = Array.isArray(stored) ? [...stored] : [];

    leaderboardEl.innerHTML = '';

    if (!leaderboard.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No leaderboard data yet.';
        leaderboardEl.appendChild(emptyMessage);
        return;
    }

    leaderboard.sort((a, b) => {
        if (b.level !== a.level) { return b.level - a.level; }
        return (b.bestScore || 0) - (a.bestScore || 0);
    });

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

    leaderboard.slice(0, 10).forEach((entry, index) => {
        const rowEl = document.createElement('li');
        rowEl.className = 'leaderboard-row';

        const publicKey = entry.publicKey || 'Unknown Player';
        const snippet = publicKey.length > 8
            ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
            : publicKey;

        const levelText = typeof entry.level === 'number' ? entry.level : 0;
        const scoreText = typeof entry.bestScore === 'number' ? entry.bestScore : 0;

        rowEl.innerHTML = `
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-wallet">${snippet}</span>
            <span class="leaderboard-level">Lv.${levelText}</span>
            <span class="leaderboard-score">${scoreText}</span>
        `;

        listEl.appendChild(rowEl);
    });

    leaderboardEl.appendChild(listEl);
}

function savePlayerData() {
    if (walletPublicKey && hasAstroCatNFT) {
        localStorage.setItem(`astro_invaders_${walletPublicKey}`, JSON.stringify(playerData));
        saveLocalLeaderboard(playerData);
        loadAndDisplayLeaderboard();
    }
}


function loadPlayerData() {
    if (walletPublicKey && hasAstroCatNFT) {
        const saved = localStorage.getItem(`astro_invaders_${walletPublicKey}`);
        if (saved) {
            const loadedData = JSON.parse(saved);
            const base = createBasePlayerData();
            playerData = { ...base, ...loadedData };
            playerData.stats = { ...base.stats, ...(loadedData.stats || {}) };

            // Ensure daily object exists and merge quest structure
            const dailyFallback = base.daily;
            playerData.daily = { ...dailyFallback, ...(loadedData.daily || {}) };
            if (!Array.isArray(playerData.daily.quests) || playerData.daily.quests.length !== 3) {
                playerData.daily.quests = createDefaultQuests();
            }
        } else {
            playerData = createBasePlayerData();
        }
        ensureSpriteProgression();
        setActiveSprite(playerData.activeSpriteId, { skipSave: true, skipUI: true });
        updateHubUI();
    }
}


// --- STATS AND XP LOGIC ---

function getXPForNextLevel(currentLevel) {
    if (currentLevel >= MAX_PLAYER_LEVEL) return Infinity;
    return Math.floor(BASE_XP_TO_LEVEL * Math.pow(XP_MULTIPLIER, currentLevel - 1));
}

function applyStatEffects() {
    const stats = playerData.stats;
    
    player.speed = 5 + (stats.agility * 0.5); 
    player.damageMultiplier = 1 + (stats.attack * 0.2); 
    player.defenseRating = stats.defense; 
    player.luckRating = stats.luck;
    player.critChance = stats.luck * 0.01; 

    level = playerData.level;
}

function gainXP(amount) {
    if (playerData.level >= MAX_PLAYER_LEVEL) return;

    playerData.currentXP += amount;

    let requiredXP = getXPForNextLevel(playerData.level);

    while (playerData.currentXP >= requiredXP) {
        playerData.level++;
        playerData.levelPoints += 3;
        playerData.currentXP -= requiredXP;
        
        showAnnounce(waveAnnounceEl, `LEVEL UP! Lv.${playerData.level}! (+3 Points)`);
        
        requiredXP = getXPForNextLevel(playerData.level);
        
        if (playerData.level >= MAX_PLAYER_LEVEL) {
            playerData.level = MAX_PLAYER_LEVEL;
            playerData.currentXP = 0;
            break;
        }
    }
    updateUI();
    savePlayerData();
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
    if (playerData.levelPoints === 0 && playerData.level > 1) {
        showHub(); return;
    }
    gamePaused = true;
    hideAllOverlays();
    if (statAllocationEl) statAllocationEl.style.display = 'flex';

    if (statLevelOverlayEl) statLevelOverlayEl.textContent = playerData.level;
    if (statPointsEl) statPointsEl.textContent = playerData.levelPoints;
    if (statOptionsEl) statOptionsEl.innerHTML = '';

    const stats = playerData.stats;
    const statNames = {
        attack: 'Attack (Damage/Bullet Size)',
        defense: 'Defense (Shield Time/Durability)',
        agility: 'Agility (Movement Speed)',
        luck: 'Luck (Crit Chance/Drops)'
    };

    for (const key in stats) {
        const div = document.createElement('div');
        div.className = 'stat-entry';
        div.innerHTML = `
            <p>${statNames[key]}: <span id="stat-${key}">${stats[key]}</span></p>
            <button onclick="allocateStat('${key}')" ${playerData.levelPoints > 0 ? '' : 'disabled'}>+</button>
        `;
        if (statOptionsEl) statOptionsEl.appendChild(div);
    }
}

function allocateStat(statKey) {
    if (playerData.levelPoints > 0) {
        playerData.stats[statKey]++;
        playerData.levelPoints--;
        
        applyStatEffects();
        
        const statEl = document.getElementById(`stat-${statKey}`);
        if (statEl) statEl.textContent = playerData.stats[statKey];
        if (statPointsEl) statPointsEl.textContent = playerData.levelPoints;
        
        if (playerData.levelPoints === 0 && statOptionsEl) {
            statOptionsEl.querySelectorAll('button').forEach(btn => btn.disabled = true);
        }
        
        updateUI(); 
        savePlayerData();
    }
}

// --- DAILY LOGIN AND QUEST SYSTEM ---

function checkDailyLogin() {
    const now = Date.now();

    if (!Array.isArray(playerData.daily.quests) || playerData.daily.quests.length === 0) {
        playerData.daily.quests = createDefaultQuests();
    }

    if (now - playerData.daily.lastLogin >= DAILY_INTERVAL_MS) {
        // Reset daily state
        playerData.daily.claimedLogin = false;
        playerData.daily.quests.forEach(q => {
            q.progress = 0;
            q.completed = false;
        });
        
        playerData.daily.lastLogin = now; 
        savePlayerData();
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
            gainXP(quest.reward.amount);
            rewardMsg = `+${quest.reward.amount} XP`;
        } else if (quest.reward.type === 'levelPoint') {
            playerData.levelPoints += quest.reward.amount;
            rewardMsg = `+${quest.reward.amount} Stat Point`;
        }
        
        playerData.credits = credits;
        quest.completed = true;
        
        showAnnounce(document.getElementById('hub-announcement') || document.getElementById('wave-announce'), `Quest Complete! ${rewardMsg}`);
        
        savePlayerData();
        updateUI();
        updateQuestsUI(); 
        showHub(); 
    }
}

// --- WALLET AND WEB3 FUNCTIONS ---

async function connectWallet() {
    const provider = window.phantom?.solana;

    if (!provider) { alert('Phantom Wallet not found. Please install it.'); return; }

    try {
        const resp = await provider.connect();
        walletPublicKey = resp.publicKey.toString();
        
        if (walletStatusEl) walletStatusEl.textContent = `Connected: ${walletPublicKey.slice(0, 8)}...`;
        if (connectBtn) connectBtn.textContent = 'Disconnect'; 
        if (connectBtn) connectBtn.onclick = disconnectWallet;
        
        if (typeof solanaWeb3 === 'undefined' || typeof Metaplex === 'undefined') {
            console.error('Solana Web3 libraries failed to load.');
            if (nftStatusEl) nftStatusEl.textContent = 'NFT Status: Check Failed (No Libraries)';
        } else { await checkNFT(walletPublicKey); }

        loadPlayerData(); showHub();
    } catch (err) {
        console.error('Wallet connect error:', err);
        if (walletStatusEl) walletStatusEl.textContent = 'Connection Rejected/Failed';
    }
}

function disconnectWallet() {
    if (hasAstroCatNFT) { savePlayerData(); }
    walletPublicKey = null; hasAstroCatNFT = false;
    if (walletStatusEl) walletStatusEl.textContent = 'Not Connected';
    if (nftStatusEl) nftStatusEl.textContent = 'Not Detected';
    if (connectBtn) connectBtn.textContent = 'Connect Phantom Wallet';
    if (connectBtn) connectBtn.onclick = connectWallet;

    playerData = createBasePlayerData();
    initializeSpriteSystem();

    showStartMenu();
}

async function checkNFT(publicKey) {
    try {
        if (typeof solanaWeb3 === 'undefined' || typeof Metaplex === 'undefined') { if (nftStatusEl) nftStatusEl.textContent = 'NFT Check Failed (Libraries Missing)'; return; }

        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
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
    } catch (err) {
        console.error('NFT check error:', err);
        if (nftStatusEl) nftStatusEl.textContent = 'NFT Check Failed'; 
        if (playBtn) playBtn.disabled = false; 
    }
}

// --- GAME LOOP FUNCTIONS (These call the logic functions above) ---

function updateEnemies() {
    if (hitStopDuration > 0) return;
    const now = Date.now();
    if (bossActive && boss) { updateBossAI(now, deltaMultiplier); }

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
        enemy.y = Math.max(0, Math.min(gameCanvas.height - enemy.height, enemy.y));
        if (enemy.x < -enemy.width) { enemies.splice(i, 1); continue; }

        let tailHit = false;
        for (let t = 1; t < tail.length; t++) {
            const seg = { x: tail[t].x, y: tail[t].y, width: player.width * 0.8, height: player.height * 0.8 };
            if (rectOverlap(enemy, seg)) { tailHit = true; break; }
        }
        if (tailHit) {
            lives--;
            uiCache.lives = null;
            if (livesEl) livesEl.textContent = `Lives: ${lives}`;
            enemies.splice(i, 1);
            if (lives <= 0) {
                gameRunning = false;
                playerData.losses++;
                savePlayerData();
                setTimeout(() => alert(`Game Over! Level: ${level} Score: ${score}\nReload to play again.`), 100);
            }
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
                lives--;
                uiCache.lives = null;
                enemies.splice(i, 1);
                if (lives <= 0) {
                    gameRunning = false;
                    playerData.losses++;
                    savePlayerData();
                    setTimeout(() => alert(`Game Over! Level: ${level} Score: ${score}\nReload to play again.`), 100);
                }
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
                    const xpReward = 5 + level * 2 + (enemy.variant === 'boss' ? 50 : 0);
                    gainXP(xpReward);
                    
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
                    
                    if (killStreak >= COMBO_THRESHOLD) { player.speed *= 1.2; setTimeout(() => { player.speed /= 1.2; }, 3000); }
    
                    if (enemy === boss) {
                        enemies.splice(e, 1);
                        bossActive = false;
                        if (boss.split) {
                            for (let j = 0; j < 3; j++) {
                                enemies.push({
                                    x: boss.x,
                                    y: boss.y + j * 40 - 40,
                                    width: 30,
                                    height: 30,
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
                        
                        // --- DAILY QUEST: DEFEAT BOSS TRACKING ---
                        const defeatBossQuest = playerData.daily.quests.find(q => q.id === 'defeatBoss');
                        if (defeatBossQuest && !defeatBossQuest.completed) {
                            defeatBossQuest.progress = Math.min(defeatBossQuest.target, defeatBossQuest.progress + 1);
                            savePlayerData();
                        }
                        // -----------------------------------------
                        
                    } else {
                        if (Math.random() < 0.2 + (player.luckRating * 0.01)) {
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

    const dashMultiplier = dashActive ? 3 : 1;
    if (dashActive && dashDirection && Math.abs(inputX) < 0.01 && Math.abs(inputY) < 0.01) {
        const vector = DASH_VECTORS[dashDirection];
        if (vector) {
            inputX = vector.x;
            inputY = vector.y;
        }
    }
    player.dx = inputX * player.speed * dashMultiplier;
    player.dy = inputY * player.speed * dashMultiplier;

    player.x += player.dx * deltaMultiplier;
    player.y += player.dy * deltaMultiplier;
    player.x = Math.max(0, Math.min(gameCanvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(gameCanvas.height - player.height, player.y));

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
    if (bossActive || gamePaused || hitStopDuration > 0) return;
    enemySpawnTimer += deltaTime;
    const spawnInterval = Math.max(20, 60 - score / 10) * FRAME_TIME;
    if (enemySpawnTimer > spawnInterval) {
        enemySpawnTimer = 0;
        if (enemyWave.length > 0) {
            const y = enemyWave.shift();
            const diveStrength = currentWaveConfig.dive ? 35 : 0;
            const enemy = {
                x: gameCanvas.width,
                y,
                width: 50,
                height: 50,
                speed: currentWaveConfig.speed,
                dy: (Math.random() - 0.5) * (currentWaveConfig.dive ? 4 : 2),
                variant: currentWaveConfig.type,
                hp: currentWaveConfig.type === 'mecha' ? 2 : 1,
                diveStrength,
                divePhase: Math.random() * Math.PI * 2
            }; enemies.push(enemy);
        } else if (enemies.length === 0) {
            credits += Math.floor(score / 10) + (level * 10);
            uiCache.credits = null;
            playerData.credits = credits;
            if (score > playerData.bestScore) { playerData.bestScore = score; }
            if (lives > 0) { playerData.wins++; } else { playerData.losses++; }
            savePlayerData();
            gameRunning = false; showHub();
        }
    }
}

function setupNextWave() {
    currentWaveConfig = waveConfigs.find(config => config.level === level) || waveConfigs[waveConfigs.length - 1];
    const waveSize = currentWaveConfig.count; enemyWave = [];
    for (let i = 0; i < waveSize; i++) {
        enemyWave.push(Math.random() * (gameCanvas.height - 100) + 50);
    }
    showAnnounce(waveAnnounceEl, `${currentWaveConfig.theme} Wave ${level}!`);
    if (currentWaveConfig.type === 'boss') {
        bossActive = true; showAnnounce(bossAnnounceEl, 'Boss Incoming!'); spawnBoss();
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
    boss.y = Math.max(0, Math.min(gameCanvas.height - boss.height, boss.y));
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
        gameCtx.fillStyle = proj.isBeam ? '#ff00ff' : '#ffff00';
        gameCtx.fillRect(proj.x, proj.y, proj.width, proj.height);
    });

    enemies.forEach(enemy => {
        const extra = bossActive && enemy === boss ? { variant: 'boss', hp: boss.hp / boss.maxHp * 5 + 1 } : { variant: enemy.variant };
        drawImageOrProcedural(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height, false, extra);
    });

    gameCtx.save();
    if (shieldActive) { gameCtx.shadowColor = '#00ffff'; gameCtx.shadowBlur = 15; } 
    else if (dashActive) { gameCtx.shadowColor = '#ffff00'; gameCtx.shadowBlur = 20; } 
    else if (isCharging) {
        const chargeLevel = Math.min(1, (Date.now() - chargeStartTime) / 1500);
        drawImageOrProcedural(playerImg, player.x, player.y, player.width, player.height, true, { chargeLevel });
    } else { drawImageOrProcedural(playerImg, player.x, player.y, player.width, player.height, true); }
    gameCtx.restore();

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
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(gameCanvas, 0, 0, canvas.width, canvas.height); return;
    }
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
window.allocateStat = allocateStat;
window.claimQuestReward = claimQuestReward;
window.hideAllOverlays = hideAllOverlays;

// --- CRITICAL FIX: Ensure Initialization Runs After DOM Load ---
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', resetKeyState);

window.onload = function() {
    initWebGL();
    initializeSpriteSystem();
    showStartMenu();

    if (dragDrop) {
        const dragDropButton = dragDrop.querySelector('button');
        if (dragDropButton) {
            dragDropButton.onclick = () => {
                startGame(true);
            };
        }
    }

    gameLoop();
};