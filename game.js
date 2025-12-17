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
    hasUserInteracted: false
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

        // Initialize canvas size
        function resizeCanvas() {
            if (!domElements.canvas) return;
            domElements.canvas.width = window.innerWidth;
            domElements.canvas.height = window.innerHeight;
            
            // Adjust cat position when canvas is resized
            if (typeof catX !== 'undefined' && typeof catY !== 'undefined') {
                if (catX + CAT_WIDTH * CAT_SCALE > domElements.canvas.width) {
                    catX = domElements.canvas.width - CAT_WIDTH * CAT_SCALE;
                }
                if (catY + CAT_HEIGHT * CAT_SCALE > domElements.canvas.height) {
                    catY = domElements.canvas.height - CAT_HEIGHT * CAT_SCALE;
                }
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

            // Update cat position
            catX += catVelocityX;
            catY += catVelocityY;

            // Keep cat within canvas bounds
            catX = Math.max(0, Math.min(catX, domElements.canvas.width - CAT_WIDTH * CAT_SCALE));
            catY = Math.max(0, Math.min(catY, domElements.canvas.height - CAT_HEIGHT * CAT_SCALE));
        }

        function drawCat() {
            if (!gameAssets.cat) return;

            ctx.save();
            const scaledWidth = CAT_WIDTH * CAT_SCALE;
            const scaledHeight = CAT_HEIGHT * CAT_SCALE;
            const centerX = catX + scaledWidth / 2;
            const centerY = catY + scaledHeight / 2;

            // Apply trick animation if performing a trick
            const isTrickAnimating = applyTrickAnimation(ctx, centerX, centerY, catX, catY, scaledWidth, scaledHeight, catFacingRight);

            if (isTrickAnimating) {
                // When animating, we're already translated to center, so draw centered at origin
                if (!catFacingRight) {
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(gameAssets.cat, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
            } else {
                // Normal drawing at catX, catY
                if (!catFacingRight) {
                    ctx.scale(-1, 1);
                    ctx.drawImage(gameAssets.cat, -catX - scaledWidth, catY, scaledWidth, scaledHeight);
                } else {
                    ctx.drawImage(gameAssets.cat, catX, catY, scaledWidth, scaledHeight);
                }
            }
            ctx.restore();

            // Draw trick effects on top
            if (isTrickAnimating) {
                drawTrickEffect(ctx, centerX, centerY);
            }
        }

        function updateGameObjects(deltaTime) {
            // Update and filter out off-screen objects
            gameObjects = gameObjects.filter(obj => {
                obj.update(deltaTime);
                return !obj.shouldRemove;
            });

            // Spawn new objects
            const currentTime = performance.now();
            if (currentTime - lastSpawnTime > SPAWN_INTERVAL) {
                // Random spawn position at the right edge
                const y = Math.random() * (domElements.canvas.height * 0.8);
                
                // Choose object type based on weights
                const rand = Math.random();
                let sum = 0;
                let chosenType = SPAWN_TYPES[0];
                
                for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
                    sum += SPAWN_WEIGHTS[i];
                    if (rand < sum) {
                        chosenType = SPAWN_TYPES[i];
                        break;
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
            const catHitbox = {
                left: catX + CAT_WIDTH * CAT_SCALE * 0.2,
                right: catX + CAT_WIDTH * CAT_SCALE * 0.8,
                top: catY + CAT_HEIGHT * CAT_SCALE * 0.2,
                bottom: catY + CAT_HEIGHT * CAT_SCALE * 0.8
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
                    if (obj instanceof Fish) {
                        gameState.score += obj.points;
                        if (domElements.scoreElement) {
                            domElements.scoreElement.textContent = gameState.score;
                        }
                        mediaPlayerInstance.playNextFishCatchSound();

                        // Update health
                        gameState.catHealth = Math.min(100, gameState.catHealth + obj.healthBoost);
                        if (domElements.healthBarFill && domElements.healthText) {
                            domElements.healthBarFill.style.width = `${gameState.catHealth}%`;
                            domElements.healthText.textContent = `${Math.round(gameState.catHealth)}%`;
                        }
                    } else if (obj instanceof Mouse) {
                        gameState.score += 150;
                        if (domElements.scoreElement) {
                            domElements.scoreElement.textContent = gameState.score;
                        }
                        obj.startSpinning(); // Start the mouse spinning animation
                    } else if (obj instanceof Catnip) {
                        mediaPlayerInstance.playCatnipSound();
                        mediaPlayerInstance.startCatnipMusic();
                        // Add any catnip power-up effects here
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
            
            // Initialize cat position
            catX = domElements.canvas.width / 2 - (CAT_WIDTH * CAT_SCALE) / 2;
            catY = domElements.canvas.height * 0.6 - (CAT_HEIGHT * CAT_SCALE) / 2;
            
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
                const scaledHeight = CAT_HEIGHT * CAT_SCALE;
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

                // Draw game state
                drawCat();
                gameObjects.forEach(obj => obj.draw(ctx));
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
