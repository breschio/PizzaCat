import { DEBUG_MODE, updateDebugPanel, drawTrickZoneBoundary, createDebugControls } from './debug.js';
import { 
    performTrick,
    applyTrickAnimation,
    drawTrickEffect,
    updateTrickZone,
    activateTrickZone,
    showTrickToast,
    isInTrickZone,
    TRICK_COOLDOWN,
    isPerformingTrick,
    currentTrickName,
    trickStartTime
} from './tricks.js';
import { spawnGameObject, updateSpawnRates, Fish, Mouse, Catnip } from './gameObjects.js';
import { mediaPlayer } from './mediaPlayer.js';
import GameOverManager from './src/gameOver.js';

// Initialize managers and instances
const gameOverManager = new GameOverManager();
const mediaPlayerInstance = mediaPlayer.getInstance();

// Game configuration and state
const domElements = {
    canvas: null,
    startButton: null,
    startScreenButton: null,
    stopButton: null,
    gameContainer: null,
    scoreElement: null,
    healthBarFill: null,
    healthText: null,
    levelElement: null
};

const gameState = {
    gameLoopRunning: false,
    lastTime: 0,
    isMobile: false,
    isGameRunning: false,
    isGameOver: false,
    isPaused: false,
    lastGameState: null,
    score: 0,
    isFirstScoreUpdate: true,
    catHealth: 100,
    currentLevel: 1,
    lastLevelPoints: 0,
    hasUserInteracted: false,
    // Catnip mode state
    catnipModeActive: false,
    catnipModeEndTime: 0,
    catnipModeDuration: 10000, // 10 seconds
    catnipScoreMultiplier: 2,
    catnipSpeedBoost: 1.5,
    catnipCatScale: 0.85
};

// Game object dimensions and states
const CAT_WIDTH = 300;
const CAT_HEIGHT = 300;
const CAT_SCALE = 0.6;

let catX = 0;
let catY = 0;
let catVelocityX = 0;
let catVelocityY = 0;
let catFacingRight = true;
let gameObjects = [];

// Movement constants
const BASE_CAT_SPEED = 6;
const catAcceleration = 0.3;
const catDeceleration = 0.97;
const VERTICAL_SPEED = 6;

// Input state
const keys = {};

// Touch control state
const touchState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    maxDistance: 100 // Increased for better control without visual feedback
};

// Asset configuration
const ASSETS = {
    images: {
        cat: './assets/pizza-cat.png',
        catSunny: './assets/pizza-cat-sunny.png',
        mouse: './assets/mouse.png',
        tuna: './assets/tuna.png',
        buffaloFish: './assets/buffalo-fish.png',
        salmon: './assets/salmon.png',
        catnip: './assets/catnip.png'
    }
};

// Spawn configuration
const SPAWN_INTERVAL = 2000; // Spawn every 2 seconds
let lastSpawnTime = 0;
const SPAWN_TYPES = ['fish', 'fish', 'fish', 'catnip', 'mouse']; // More fish for better gameplay
const SPAWN_WEIGHTS = [0.4, 0.3, 0.1, 0.1, 0.1]; // Adjusted probabilities

// Asset loading function
async function loadAssets() {
    const imageLoadPromises = Object.entries(ASSETS.images).map(([key, path]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ key, img });
            img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
            img.src = path;
        });
    });

    try {
        const loadedImages = await Promise.all(imageLoadPromises);
        console.log('All assets loaded successfully');
        return loadedImages.reduce((acc, { key, img }) => {
            acc[key] = img;
            return acc;
        }, {});
    } catch (error) {
        console.error('Asset loading failed:', error);
        throw error;
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Starting game initialization...');

        // Initialize DOM elements
        domElements.canvas = document.getElementById('gameCanvas');
        domElements.startButton = document.getElementById('start-button');
        domElements.startScreenButton = document.getElementById('start-screen-button');
        domElements.stopButton = document.getElementById('stop-button');
        domElements.gameContainer = document.getElementById('game-container');
        domElements.scoreElement = document.getElementById('score-number');
        domElements.healthBarFill = document.getElementById('health-bar-fill');
        domElements.healthText = document.getElementById('health-text');
        domElements.levelElement = document.getElementById('level-number');

        // Setup user interaction
        const handleFirstInteraction = () => {
            if (gameState.hasUserInteracted) return;
            gameState.hasUserInteracted = true;
            document.body.classList.add('user-interaction');
            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.removeEventListener(event, handleFirstInteraction);
            });
        };

        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, handleFirstInteraction);
        });

        // Initialize canvas
        const ctx = domElements.canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        function getCurrentCatScale() {
            return gameState.catnipModeActive ? gameState.catnipCatScale : CAT_SCALE;
        }

        function getCatDimensions() {
            const scale = getCurrentCatScale();
            return {
                width: CAT_WIDTH * scale,
                height: CAT_HEIGHT * scale
            };
        }

        function clampCatPosition() {
            if (!domElements.canvas) return;

            const { width, height } = getCatDimensions();
            catX = Math.max(0, Math.min(catX, domElements.canvas.width - width));
            catY = Math.max(0, Math.min(catY, domElements.canvas.height - height));
        }

        // Initialize canvas size
        function resizeCanvas() {
            if (!domElements.canvas) return;
            domElements.canvas.width = window.innerWidth;
            domElements.canvas.height = window.innerHeight;
            
            // Adjust cat position when canvas is resized
            if (typeof catX !== 'undefined' && typeof catY !== 'undefined') {
                clampCatPosition();
            }
        }

        // Add resize listener
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Setup keyboard controls
        window.addEventListener('keydown', (e) => {
            keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });

        // Load game assets
        console.log('Loading assets...');
        const gameAssets = await loadAssets();
        console.log('Assets loaded successfully');

        // Setup touch controls
        function initializeTouchControls() {
            if (!domElements.canvas) return;

            // Touch start
            domElements.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                touchState.active = true;
                touchState.startX = touch.clientX;
                touchState.startY = touch.clientY;
                touchState.currentX = touch.clientX;
                touchState.currentY = touch.clientY;
            }, { passive: false });

            // Touch move
            domElements.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (!touchState.active) return;
                
                const touch = e.touches[0];
                touchState.currentX = touch.clientX;
                touchState.currentY = touch.clientY;
            }, { passive: false });

            // Touch end
            domElements.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                touchState.active = false;
                catVelocityX *= catDeceleration;
                catVelocityY *= catDeceleration;
            }, { passive: false });

            // Touch cancel
            domElements.canvas.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                touchState.active = false;
                catVelocityX *= catDeceleration;
                catVelocityY *= catDeceleration;
            }, { passive: false });
        }

        function updateCatPosition() {
            if (gameState.isMobile && touchState.active) {
                // Calculate touch displacement
                const dx = touchState.currentX - touchState.startX;
                const dy = touchState.currentY - touchState.startY;
                
                // Calculate distance from start point
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Normalize displacement if beyond max distance
                const normalizedDx = dx / (distance > touchState.maxDistance ? distance : touchState.maxDistance);
                const normalizedDy = dy / (distance > touchState.maxDistance ? distance : touchState.maxDistance);
                
                // Update cat velocity based on touch position with smoother acceleration
                catVelocityX = normalizedDx * BASE_CAT_SPEED * 1.5; // Slightly increased speed for better response
                catVelocityY = normalizedDy * VERTICAL_SPEED * 1.5;
                
                // Update cat facing direction with increased threshold
                if (Math.abs(dx) > 20) { // Increased threshold to prevent accidental flipping
                    catFacingRight = dx > 0;
                }
            } else {
                // Existing keyboard control logic
                if (keys['ArrowLeft'] || keys['a']) {
                    catVelocityX = Math.max(catVelocityX - catAcceleration, -BASE_CAT_SPEED);
                    catFacingRight = false;
                }
                if (keys['ArrowRight'] || keys['d']) {
                    catVelocityX = Math.min(catVelocityX + catAcceleration, BASE_CAT_SPEED);
                    catFacingRight = true;
                }
                if (keys['ArrowUp'] || keys['w']) {
                    catVelocityY = -VERTICAL_SPEED;
                } else if (keys['ArrowDown'] || keys['s']) {
                    catVelocityY = VERTICAL_SPEED;
                } else {
                    catVelocityY *= catDeceleration;
                }
                
                // Apply deceleration when no horizontal movement keys are pressed
                if (!keys['ArrowLeft'] && !keys['ArrowRight'] && !keys['a'] && !keys['d']) {
                    catVelocityX *= catDeceleration;
                }
            }

            // Update cat position (apply speed boost if catnip mode is active)
            const speedMultiplier = gameState.catnipModeActive ? gameState.catnipSpeedBoost : 1;
            catX += catVelocityX * speedMultiplier;
            catY += catVelocityY * speedMultiplier;

            // Keep cat within canvas bounds
            clampCatPosition();
        }

        function drawCat() {
            if (!gameAssets.cat) return;

            ctx.save();
            const { width: scaledWidth, height: scaledHeight } = getCatDimensions();
            const centerX = catX + scaledWidth / 2;
            const centerY = catY + scaledHeight / 2;

            // Use sunglasses cat during catnip mode
            const catImage = gameState.catnipModeActive && gameAssets.catSunny ? gameAssets.catSunny : gameAssets.cat;

            // Apply trick animation if performing a trick
            const isTrickAnimating = applyTrickAnimation(ctx, centerX, centerY, catX, catY, scaledWidth, scaledHeight, catFacingRight);

            if (isTrickAnimating) {
                // When animating, we're already translated to center, so draw centered at origin
                if (!catFacingRight) {
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(catImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
            } else {
                // Normal drawing at catX, catY
                if (!catFacingRight) {
                    ctx.scale(-1, 1);
                    ctx.drawImage(catImage, -catX - scaledWidth, catY, scaledWidth, scaledHeight);
                } else {
                    ctx.drawImage(catImage, catX, catY, scaledWidth, scaledHeight);
                }
            }
            ctx.restore();

            // Draw trick effects on top
            if (isTrickAnimating) {
                drawTrickEffect(ctx, centerX, centerY);
            }
        }

        // Catnip mode UI functions
        function showCatnipModeUI() {
            let catnipUI = document.getElementById('catnip-mode-ui');
            if (!catnipUI) {
                catnipUI = document.createElement('div');
                catnipUI.id = 'catnip-mode-ui';
                catnipUI.innerHTML = `
                    <div class="catnip-mode-label">🌿 CATNIP MODE 🌿</div>
                    <div class="catnip-mode-timer">10.0s</div>
                    <div class="catnip-mode-bonus">2x SCORE!</div>
                `;
                catnipUI.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                    z-index: 1000;
                    pointer-events: none;
                `;
                const label = catnipUI.querySelector('.catnip-mode-label');
                label.style.cssText = `
                    font-size: 24px;
                    font-weight: bold;
                    color: #00ff00;
                    text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
                    animation: catnipPulse 0.5s ease-in-out infinite alternate;
                `;
                const timer = catnipUI.querySelector('.catnip-mode-timer');
                timer.style.cssText = `
                    font-size: 32px;
                    font-weight: bold;
                    color: #ffffff;
                    text-shadow: 0 0 10px #00ff00;
                    margin-top: 5px;
                `;
                const bonus = catnipUI.querySelector('.catnip-mode-bonus');
                bonus.style.cssText = `
                    font-size: 18px;
                    color: #ffff00;
                    text-shadow: 0 0 10px #ffff00;
                    margin-top: 5px;
                `;
                document.body.appendChild(catnipUI);

                // Add animation keyframes if not already present
                if (!document.getElementById('catnip-animations')) {
                    const style = document.createElement('style');
                    style.id = 'catnip-animations';
                    style.textContent = `
                        @keyframes catnipPulse {
                            from { transform: scale(1); opacity: 1; }
                            to { transform: scale(1.1); opacity: 0.8; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            catnipUI.style.display = 'block';
        }

        function updateCatnipModeUI(timeRemaining) {
            const catnipUI = document.getElementById('catnip-mode-ui');
            if (catnipUI) {
                const timer = catnipUI.querySelector('.catnip-mode-timer');
                if (timer) {
                    timer.textContent = (timeRemaining / 1000).toFixed(1) + 's';
                }
            }
        }

        function hideCatnipModeUI() {
            const catnipUI = document.getElementById('catnip-mode-ui');
            if (catnipUI) {
                catnipUI.style.display = 'none';
            }
        }

        function showScorePopup(text, type) {
            const popup = document.createElement('div');
            const { width } = getCatDimensions();
            popup.className = `score-popup fish-${type}`;
            popup.textContent = text;
            popup.style.left = `${catX + width / 2}px`;
            popup.style.top = `${catY}px`;

            domElements.gameContainer.appendChild(popup);

            setTimeout(() => {
                popup.remove();
            }, 1500);
        }

        function activateCatnipMode(catnip) {
            const duration = catnip?.duration || gameState.catnipModeDuration;
            gameState.catnipModeActive = true;
            gameState.catnipModeEndTime = performance.now() + duration;
            clampCatPosition();

            mediaPlayerInstance.startCatnipMusic();

            gameState.score += 50;
            if (domElements.scoreElement) {
                domElements.scoreElement.textContent = gameState.score;
            }

            gameState.catHealth = 100;
            if (domElements.healthBarFill && domElements.healthText) {
                domElements.healthBarFill.style.width = '100%';
                domElements.healthText.textContent = '100%';
            }

            showScorePopup('CATNIP!', 'catnip');
            showCatnipModeUI();
        }

        function endCatnipMode() {
            const wasActive = gameState.catnipModeActive;
            gameState.catnipModeActive = false;
            gameState.catnipModeEndTime = 0;
            clampCatPosition();
            hideCatnipModeUI();

            if (wasActive) {
                mediaPlayerInstance.stopCatnipMusic();
            }
        }

        function drawCatnipEffect(ctx, canvasWidth, canvasHeight, timestamp) {
            ctx.save();

            const pulse = Math.sin(timestamp / 200) * 0.5 + 0.5;
            const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            gradient.addColorStop(0, `rgba(255, 107, 107, ${0.12 + pulse * 0.08})`);
            gradient.addColorStop(0.33, `rgba(78, 205, 196, ${0.12 + pulse * 0.08})`);
            gradient.addColorStop(0.66, `rgba(255, 217, 61, ${0.12 + pulse * 0.08})`);
            gradient.addColorStop(1, `rgba(0, 255, 0, ${0.08 + pulse * 0.08})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Sparkle particles
            const sparkleCount = 8;
            const { width, height } = getCatDimensions();
            for (let i = 0; i < sparkleCount; i++) {
                const angle = (timestamp / 1000 + i * (Math.PI * 2 / sparkleCount)) % (Math.PI * 2);
                const radius = 50 + Math.sin(timestamp / 500 + i) * 20;
                const x = catX + width / 2 + Math.cos(angle) * radius;
                const y = catY + height / 2 + Math.sin(angle) * radius;
                const size = 3 + Math.sin(timestamp / 300 + i * 2) * 2;

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${120 + i * 10}, 100%, 60%, ${0.6 + pulse * 0.4})`;
                ctx.fill();
            }
            ctx.restore();
        }

        function updateGameObjects(deltaTime) {
            // Update and filter out off-screen objects
            gameObjects = gameObjects.filter(obj => {
                obj.update(deltaTime);
                return !obj.shouldRemove;
            });

            // Spawn new objects
            const currentTime = performance.now();
            // Faster spawning during catnip mode (10x faster!)
            const spawnInterval = gameState.catnipModeActive ? SPAWN_INTERVAL / 10 : SPAWN_INTERVAL;

            if (currentTime - lastSpawnTime > spawnInterval) {
                // Choose object type based on weights
                // During catnip mode, spawn mostly fish (90% fish, 10% mouse, no catnip)
                let chosenType;
                if (gameState.catnipModeActive) {
                    const rand = Math.random();
                    chosenType = rand < 0.9 ? 'fish' : 'mouse';
                } else {
                    const rand = Math.random();
                    let sum = 0;
                    chosenType = SPAWN_TYPES[0];

                    for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
                        sum += SPAWN_WEIGHTS[i];
                        if (rand < sum) {
                            chosenType = SPAWN_TYPES[i];
                            break;
                        }
                    }
                }

                const newObject = spawnGameObject(domElements.canvas, gameAssets, chosenType);
                if (newObject) {
                    gameObjects.push(newObject);
                }
                lastSpawnTime = currentTime;
            }
        }

        function checkCollisions() {
            const { width: catWidth, height: catHeight } = getCatDimensions();
            const catHitbox = {
                left: catX + catWidth * 0.2,
                right: catX + catWidth * 0.8,
                top: catY + catHeight * 0.2,
                bottom: catY + catHeight * 0.8
            };

            // Iterate in reverse to safely remove items during iteration
            for (let i = gameObjects.length - 1; i >= 0; i--) {
                const obj = gameObjects[i];
                if (obj.checkCollision(
                    catHitbox.left,
                    catHitbox.top,
                    catHitbox.right - catHitbox.left,
                    catHitbox.bottom - catHitbox.top
                )) {
                    // Handle collision based on object type
                    // Apply score multiplier if catnip mode is active
                    const scoreMultiplier = gameState.catnipModeActive ? gameState.catnipScoreMultiplier : 1;

                    if (obj instanceof Fish) {
                        const points = obj.points * scoreMultiplier;
                        gameState.score += points;
                        if (domElements.scoreElement) {
                            domElements.scoreElement.textContent = gameState.score;
                        }
                        mediaPlayerInstance.playNextFishCatchSound();

                        // Update health (extra boost during catnip mode)
                        const healthBoost = gameState.catnipModeActive ? obj.healthBoost * 1.5 : obj.healthBoost;
                        gameState.catHealth = Math.min(100, gameState.catHealth + healthBoost);
                        if (domElements.healthBarFill && domElements.healthText) {
                            domElements.healthBarFill.style.width = `${gameState.catHealth}%`;
                            domElements.healthText.textContent = `${Math.round(gameState.catHealth)}%`;
                        }
                    } else if (obj instanceof Mouse) {
                        const points = 150 * scoreMultiplier;
                        gameState.score += points;
                        if (domElements.scoreElement) {
                            domElements.scoreElement.textContent = gameState.score;
                        }
                        obj.startSpinning(); // Start the mouse spinning animation
                    } else if (obj instanceof Catnip) {
                        activateCatnipMode(obj);
                    }

                    // Remove collected object if it's not a spinning mouse
                    if (!(obj instanceof Mouse && obj.isSpinning)) {
                        gameObjects.splice(i, 1);
                    }
                }
            }
        }

        // Setup game start functionality
        function startGame() {
            console.log('Starting game...');
            gameState.isGameRunning = true;
            gameState.gameLoopRunning = true;
            gameState.lastTime = performance.now();
            endCatnipMode();
            
            // Initialize cat position
            const { width: catWidth, height: catHeight } = getCatDimensions();
            catX = domElements.canvas.width / 2 - catWidth / 2;
            catY = domElements.canvas.height * 0.6 - catHeight / 2;
            
            // Show game UI
            if (domElements.gameContainer) {
                domElements.gameContainer.classList.add('gameplay-active');
            }
            
            // Hide start screen button, show stop button
            if (domElements.startScreenButton) {
                domElements.startScreenButton.style.display = 'none';
            }
            if (domElements.stopButton) {
                domElements.stopButton.style.display = 'block';
            }

            // Clear any existing game objects and reset spawn timer
            gameObjects = [];
            lastSpawnTime = performance.now();
            
            // Reset game state
            gameState.score = 0;
            gameState.catHealth = 100;

            if (domElements.scoreElement) {
                domElements.scoreElement.textContent = '0';
            }
            if (domElements.healthBarFill && domElements.healthText) {
                domElements.healthBarFill.style.width = '100%';
                domElements.healthText.textContent = '100%';
            }
            
            // Check if we're on mobile
            gameState.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Initialize touch controls if on mobile
            if (gameState.isMobile) {
                initializeTouchControls();
            }
            
            // Start game loop
            requestAnimationFrame(gameLoop);
            
            // Start game music
            mediaPlayerInstance.startGameMusic();
        }

        // Add event listeners for game controls
        if (domElements.startScreenButton) {
            domElements.startScreenButton.addEventListener('click', startGame);
        }
        if (domElements.stopButton) {
            domElements.stopButton.addEventListener('click', () => {
                gameState.isPaused = !gameState.isPaused;
                if (gameState.isPaused) {
                    domElements.stopButton.textContent = '▶️';
                    mediaPlayerInstance.stopWaveSound();
                } else {
                    domElements.stopButton.textContent = '⏸️';
                    gameState.lastTime = performance.now();
                    mediaPlayerInstance.startWaveSound();
                    requestAnimationFrame(gameLoop);
                }
            });
        }

        // Game loop function
        function gameLoop(timestamp) {
            if (!gameState.gameLoopRunning) return;

            const deltaTime = (timestamp - gameState.lastTime) / 1000;
            gameState.lastTime = timestamp;

            if (!gameState.isPaused) {
                // Clear canvas
                ctx.clearRect(0, 0, domElements.canvas.width, domElements.canvas.height);

                // Update game state
                updateCatPosition();
                updateGameObjects(deltaTime);
                checkCollisions();

                // Trick zone logic
                const { height: scaledHeight } = getCatDimensions();
                const inTrickZone = isInTrickZone(catY, scaledHeight, domElements.canvas);

                if (inTrickZone) {
                    activateTrickZone();
                }
                updateTrickZone(catY, scaledHeight, deltaTime, domElements.canvas);

                // Check for spacebar to perform trick
                if (keys[' '] || keys['Space']) {
                    const trickThreshold = domElements.canvas.height * (1/3);
                    const result = performTrick(
                        catY,
                        scaledHeight,
                        trickThreshold,
                        gameState.isGameRunning,
                        gameState.isGameOver,
                        gameState.score,
                        (points) => { gameState.score += points; }
                    );
                    if (result.score > 0) {
                        gameState.score += result.score;
                        if (domElements.scoreElement) {
                            domElements.scoreElement.textContent = gameState.score;
                        }
                    }
                    // Clear spacebar to prevent repeated tricks
                    keys[' '] = false;
                    keys['Space'] = false;
                }

                // Catnip mode timing
                if (gameState.catnipModeActive) {
                    const timeRemaining = gameState.catnipModeEndTime - timestamp;
                    if (timeRemaining <= 0) {
                        // Catnip mode ended
                        endCatnipMode();
                    } else {
                        // Update catnip mode UI with remaining time
                        updateCatnipModeUI(timeRemaining);
                    }
                }

                // Draw game state
                drawCat();
                gameObjects.forEach(obj => obj.draw(ctx));

                if (gameState.catnipModeActive) {
                    drawCatnipEffect(ctx, domElements.canvas.width, domElements.canvas.height, timestamp);
                }
            }

            if (gameState.isGameRunning) {
                requestAnimationFrame(gameLoop);
            }
        }

        // Show start screen
        if (domElements.gameContainer) {
            domElements.gameContainer.classList.remove('gameplay-active');
        }

        console.log('Game initialization complete!');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <h2>Oops! Something went wrong</h2>
            <p>Failed to start the game. Please refresh the page and try again.</p>
            <p>Error: ${error.message}</p>
        `;
        document.body.appendChild(errorMessage);
    }
});

// Remove the IIFE and move all its contents here
// ... rest of your existing code (game loop, update functions, etc.) ...
