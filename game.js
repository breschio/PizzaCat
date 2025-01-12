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
import { gameOverManager } from './src/gameOver.js';

(function() {
    // 1. Game Setup & Configuration
    // ---------------------------
    const mobileBreakpoint = 768;
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    
    // 2. Game State Variables
    // ---------------------------
    let gameLoopRunning = false;
    let lastTime = 0;
    let isMobile = false;
    let isGameRunning = false;
    let isGameOver = false;
    let isPaused = false;
    let lastGameState = null;
    
    // Score & Health
    let score = 0;
    let isFirstScoreUpdate = true;
    let catHealth = 100;
    const maxCatHealth = 100;
    
    // Level System
    const LEVEL_DURATION = 60000; // 60 seconds per level
    let levelStartTime = 0;
    let levelTimeRemaining = LEVEL_DURATION;
    
    // Add level timer display
    const levelTimerDisplay = document.createElement('div');
    levelTimerDisplay.className = 'level-timer game-text';
    levelTimerDisplay.style.position = 'absolute';
    levelTimerDisplay.style.top = '20px';
    levelTimerDisplay.style.left = '50%';
    levelTimerDisplay.style.transform = 'translateX(-50%)';
    levelTimerDisplay.style.color = 'white';
    levelTimerDisplay.style.zIndex = '1000';
    document.getElementById('game-container').appendChild(levelTimerDisplay);

    function updateLevelTimer() {
        const currentTime = performance.now();
        levelTimeRemaining = Math.max(0, LEVEL_DURATION - (currentTime - levelStartTime));
        
        // Format time as MM:SS
        const seconds = Math.ceil(levelTimeRemaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        levelTimerDisplay.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Check for level completion
        if (levelTimeRemaining === 0) {
            showLevelSummary();
        }
    }

    function resetLevelState() {
        // Clear all game objects
        gameObjects = [];
        
        // Reset cat to starting position
        catX = canvas.width / 2 - (catWidth * catScaleFactor) / 2;
        catY = canvas.height * 0.6 - (catHeight * catScaleFactor) / 2;
        catVelocityX = 0;
        catVelocityY = 0;
        
        // Reset power-up states
        isCatnipMode = false;
        catnipEndTime = 0;
        catScaleFactor = 0.6;
        
        // Reset trick states
        lastTrickTime = 0;
        isPerformingTrick = false;
        inTrickZone = false;
        currentTrick = null;
        
        // Reset spawn timers
        lastSpawnTime = performance.now();
    }

    function showLevelStartAnimation() {
        const startNotification = document.createElement('div');
        startNotification.className = 'level-up-notification';
        startNotification.textContent = `LEVEL ${currentLevel}`;
        document.getElementById('game-container').appendChild(startNotification);
        
        // Add countdown after level number
        let countdown = 3;
        const updateCountdown = () => {
            if (countdown > 0) {
                setTimeout(() => {
                    startNotification.textContent = countdown.toString();
                    countdown--;
                    updateCountdown();
                }, 1000);
            } else {
                setTimeout(() => {
                    startNotification.textContent = "SURF'S UP!";
                    setTimeout(() => {
                        startNotification.remove();
                        isPaused = false;
                    }, 1000);
                }, 1000);
            }
        };
        
        // Start countdown after showing level number
        setTimeout(updateCountdown, 1500);
    }

    function progressToNextLevel() {
        currentLevel++;
        
        // Reset level timer
        levelStartTime = performance.now();
        levelTimeRemaining = LEVEL_DURATION;
        
        // Reset game state while preserving score and level
        resetLevelState();
        
        // Reset fish counts for the new level
        resetFishCounts();
        
        // Reset catnip count for new level
        catnipsSpawnedThisLevel = 0;
        
        // Update difficulty
        updateGameDifficulty();
        
        // Update UI
        updateLevel();
        
        // Keep game paused during transition
        isPaused = true;
        
        // Play transition sound
        mediaPlayerInstance.playLevelUpSound();
        
        // Show level start animation with countdown
        showLevelStartAnimation();
    }

    // Cat Properties
    let catX = 0;
    let catY = 0;
    let catVelocityX = 0;
    let catVelocityY = 0;
    let catWidth = 300;
    let catHeight = 300;
    let catFacingRight = true;
    let catScaleFactor = 0.6;
    
    // Trick State
    let lastTrickTime = 0;
    let isPerformingTrick = false;
    const TRICK_COOLDOWN = 1000; // 1 second cooldown between tricks
    
    // Resize canvas to match window size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Adjust cat position when canvas is resized
        if (catX + catWidth * catScaleFactor > canvas.width) {
            catX = canvas.width - catWidth * catScaleFactor;
        }
        if (catY + catHeight * catScaleFactor > canvas.height) {
            catY = canvas.height - catHeight * catScaleFactor;
        }
    }
    
    // Initial resize
    resizeCanvas();
    
    // Add resize listener
    window.addEventListener('resize', resizeCanvas);
    
    // Input State
    const keys = {}; // Single declaration for keyboard state
    let leftPressed = false;
    let rightPressed = false;
    let upPressed = false;
    let downPressed = false;
    
    // Game Objects
    let gameObjects = [];
    let imagesLoaded = 0;
    
    // Trick Zone State
    let inTrickZone = false;
    let trickZoneIntensity = 0;
    let currentTrick = null;
    
    // Visual Effects
    let isFlashing = false;
    let isPositiveFlash = false;
    let flashStartTime = 0;
    let flashColor = 'red';
    let flashAlpha = 0.3;
    
    // Catnip Mode
    let isCatnipMode = false;
    
    // Media Player - use the imported instance
    const mediaPlayerInstance = mediaPlayer;
    
    // 3. Constants
    // ---------------------------
    const INITIAL_MAX_TRASH_ITEMS = 3;
    const MAX_POSSIBLE_TRASH_ITEMS = 10;
    const BASE_SPEED = 200;
    const SPEED_VARIATION = 50;
    const MOUSE_DAMAGE = 25;
    const flashDuration = 500;
    const CATNIP_SCALE_FACTOR = 0.85;
    const CAT_WIDTH = 300;
    const CAT_HEIGHT = 300;
    const INVINCIBILITY_DURATION = 1000; // 1 second of invincibility after taking damage
    
    // Movement Constants
    const BASE_CAT_SPEED = 8; // Base speed for the cat
    let catMaxSpeed = BASE_CAT_SPEED;
    const catAcceleration = 0.5;
    const catDeceleration = 0.95;
    const VERTICAL_SPEED = 8;
    
    // Wave & Spawn Rates
    let waveSpeed = 100;
    const INITIAL_WAVE_SPEED = 2;
    const MAX_WAVE_SPEED = 8;
    const TIME_TO_MAX_SPEED = 300;
    const INITIAL_FISH_SPAWN_RATE = 0.5;
    const MAX_FISH_SPAWN_RATE = 0.7;
    let fishSpawnRate = INITIAL_FISH_SPAWN_RATE;
    
    // Add these constants near the other game constants
    const CATNIP_SPAWN_RATE = 0.1; // 10% chance every spawn check
    const CATNIP_DURATION = 10000; // 10 seconds
    let catnipEndTime = 0;
    
    // Add this constant with the other effect-related constants
    const CATNIP_FLASH_COLOR = 'rgba(0, 255, 0, 0.4)';
    
    // Add these with other game state variables
    let currentLevel = 1;
    let catnipsSpawnedThisLevel = 0;
    const MAX_CATNIPS_PER_LEVEL = 3;
    const POINTS_PER_LEVEL = 2000;
    let lastLevelPoints = 0;
    
    // Add fish tracking variables
    let fishCollected = {
        tuna: 0,
        salmon: 0,
        goldfish: 0
    };
    
    // Add level summary screen element
    const levelSummaryScreen = document.createElement('div');
    levelSummaryScreen.id = 'level-summary-screen';
    levelSummaryScreen.innerHTML = `
        <h2>LEVEL COMPLETE!</h2>
        <div class="level-summary-score">SCORE: <span id="level-final-score">0</span></div>
        <div class="fish-summary">
            <div class="fish-summary-item">
                <span>Tuna</span>
                <span id="tuna-count">0</span>
            </div>
            <div class="fish-summary-item">
                <span>Salmon</span>
                <span id="salmon-count">0</span>
            </div>
            <div class="fish-summary-item">
                <span>Goldfish</span>
                <span id="goldfish-count">0</span>
            </div>
        </div>
        <button id="next-level-button">NEXT LEVEL</button>
    `;
    document.getElementById('game-container').appendChild(levelSummaryScreen);
    
    // Add event listener for next level button
    document.getElementById('next-level-button').addEventListener('click', () => {
        levelSummaryScreen.style.display = 'none';
        progressToNextLevel();
    });
    
    // Update the fish collection tracking
    function updateFishCount(fishType) {
        if (fishCollected.hasOwnProperty(fishType)) {
            fishCollected[fishType]++;
        }
    }
    
    // Show level summary screen
    function showLevelSummary() {
        // Pause the game
        isPaused = true;
        
        // Update the summary screen with current stats
        document.getElementById('level-final-score').textContent = score;
        document.getElementById('tuna-count').textContent = fishCollected.tuna;
        document.getElementById('salmon-count').textContent = fishCollected.salmon;
        document.getElementById('goldfish-count').textContent = fishCollected.goldfish;
        
        // Show the summary screen
        levelSummaryScreen.style.display = 'block';
        
        // Play level complete sound
        mediaPlayerInstance.playLevelUpSound();
    }
    
    // Reset fish counts for new level
    function resetFishCounts() {
        fishCollected = {
            tuna: 0,
            salmon: 0,
            goldfish: 0
        };
    }

    // 4. Asset Loading
    // ---------------------------
    // Images
    let fishImage = new Image();
    let catImage = new Image();
    let catSunnyImage = new Image();
    let mouseImage = new Image();
    let tunaImage = new Image();
    let buffaloFishImage = new Image();
    let salmonImage = new Image();
    let catnipImage = new Image();
    const totalImages = 9;

    // Add this after the asset declarations
    // 4. Asset Loading System
    // ---------------------------
    const ASSETS = {
        images: {
            fish: './assets/buffalo-fish.png',
            cat: './assets/pizza-cat.png',
            catSunny: './assets/pizza-cat-sunny.png',
            mouse: './assets/mouse.png',
            tuna: './assets/tuna.png',
            buffaloFish: './assets/buffalo-fish.png',
            salmon: './assets/salmon.png',
            catnip: './assets/catnip.png'
        },
        sounds: {
            // Define sound assets here if needed
        }
    };

    // Asset loading tracking
    let assetsLoaded = 0;
    const totalAssets = Object.keys(ASSETS.images).length;

    // Asset loading system
    function loadAssets() {
        return new Promise((resolve, reject) => {
            console.log('Starting asset loading...');
            // Remove existing preload link if it exists
            const existingPreload = document.querySelector('link[rel="preload"][as="image"][href*="mouse.png"]');
            if (existingPreload) {
                existingPreload.remove();
            }

            // Load all images
            Object.entries(ASSETS.images).forEach(([key, path]) => {
                const img = new Image();
                img.onload = () => {
                    assetsLoaded++;
                    console.log(`Loaded ${key} (${assetsLoaded}/${totalAssets})`);
                    if (assetsLoaded === totalAssets) {
                        console.log('All assets loaded successfully');
                        resolve();
                    }
                };
                img.onerror = (err) => {
                    console.error(`Failed to load ${key} from path ${path}:`, err);
                    reject(err);
                };
                img.src = path;
                console.log(`Loading ${key} from ${path}`);
                
                // Assign to the corresponding image variable
                switch(key) {
                    case 'fish': fishImage = img; break;
                    case 'cat': catImage = img; break;
                    case 'catSunny': catSunnyImage = img; break;
                    case 'mouse': mouseImage = img; break;
                    case 'tuna': tunaImage = img; break;
                    case 'buffaloFish': buffaloFishImage = img; break;
                    case 'salmon': salmonImage = img; break;
                    case 'catnip': catnipImage = img; break;
                }
            });
        });
    }

    // 5. Function Declarations
    // ---------------------------
    function initializeGameState() {
        // Set initial cat dimensions and position
        catWidth = CAT_WIDTH;
        catHeight = CAT_HEIGHT;
        
        // Center the cat horizontally and place it at 60% of screen height
        catX = canvas.width / 2 - (catWidth * catScaleFactor) / 2;
        catY = canvas.height * 0.6 - (catHeight * catScaleFactor) / 2;
        
        catVelocityX = 0;
        catVelocityY = 0;
        catFacingRight = true;
        catMaxSpeed = BASE_CAT_SPEED;
        
        // Reset game state
        isGameRunning = false;
        isGameOver = false;
        isPaused = false;
        score = 0;
        catHealth = maxCatHealth;
        isFirstScoreUpdate = true;
        gameObjects = [];
        
        // Reset trick state
        inTrickZone = false;
        currentTrick = null;
        
        // Reset effects
        isCatnipMode = false;
        isFlashing = false;
        
        // Reset spawn rates
        fishSpawnRate = INITIAL_FISH_SPAWN_RATE;
        waveSpeed = INITIAL_WAVE_SPEED;
        
        // Update UI
        updateScore();
        updateHealthBar();
        
        // Show/hide appropriate buttons
        document.getElementById('start-button').style.display = 'inline-block';
        document.getElementById('stop-button').style.display = 'none';
        
        // Initialize debug panel and controls
        if (DEBUG_MODE) {
            updateDebugPanel(catX, catY, catVelocityX, catVelocityY, inTrickZone, null, currentTrick, isGameOver);
            createDebugControls(handleGameOver);
        }
        
        // Reset trick-related state
        lastTrickTime = 0;
        isPerformingTrick = false;
        inTrickZone = false;
        currentTrick = null;
        
        // Clean up any existing toasts
        const existingToasts = document.querySelectorAll('.trick-toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Reset level
        currentLevel = 1;
        lastLevelPoints = 0;
        updateLevel();
        catnipsSpawnedThisLevel = 0;
    }

    function startGameLoop() {
        if (!gameLoopRunning) {
            gameLoopRunning = true;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }

    function showStartMode() {
        // Show start screen elements
        const startScreen = document.getElementById('start-screen');
        const startScreenButton = document.getElementById('start-screen-button');
        const howToPlayButton = document.getElementById('how-to-play-button');
        const gameTitle = document.getElementById('game-title');
        
        if (startScreen) startScreen.style.display = 'block';
        if (startScreenButton) startScreenButton.style.display = 'block';
        if (howToPlayButton) howToPlayButton.style.display = 'block';
        if (gameTitle) gameTitle.style.display = 'block';
        
        // Hide game elements
        const healthBarContainer = document.getElementById('health-bar-container');
        const scoreElement = document.getElementById('score');
        const stopButton = document.getElementById('stop-button');
        
        if (healthBarContainer) healthBarContainer.style.display = 'none';
        if (scoreElement) scoreElement.style.display = 'none';
        if (stopButton) stopButton.style.display = 'none';
        
        // Reset game state
        isGameRunning = false;
        isGameOver = false;
        score = 0;
        updateScore();
        
        // Ensure timer is hidden in start mode
        levelTimerDisplay.style.display = 'none';
    }

    function drawTrickZoneBoundary(canvas) {
        if (!DEBUG_MODE) return;

        // Remove any existing boundary line
        const existingBoundary = document.querySelector('.trick-zone-boundary');
        if (existingBoundary) {
            existingBoundary.remove();
        }

        // Create new boundary line
        const boundary = document.createElement('div');
        boundary.className = 'trick-zone-boundary';
        boundary.style.top = `${canvas.height * (1/3)}px`;
        boundary.style.width = '100%';
        document.getElementById('game-container').appendChild(boundary);
    }

    async function initGame() {
        try {
            console.log('Starting game initialization...');
            
            // Load assets first
            console.log('Loading assets...');
            await loadAssets();
            console.log('Assets loaded successfully');
            
            // Initialize game state
            console.log('Initializing game state...');
            initializeGameState();
            console.log('Game state initialized');
            
            // Show start screen
            console.log('Showing start screen...');
            showStartMode();
            drawTrickZoneBoundary(canvas);
            
            console.log('Game initialization complete!');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            // Show error to user in a more friendly way
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = `
                <h2>Oops! Something went wrong</h2>
                <p>Failed to start the game. Please refresh the page and try again.</p>
                <p>Error: ${error.message}</p>
            `;
            document.body.appendChild(errorMessage);
        }
    }

    // Add game start time tracking
    let gameStartTime = 0;
    let lastSpawnTime = 0;

    function startGame() {
        console.log('Starting game...');
        
        // Hide start screen elements
        const startScreen = document.getElementById('start-screen');
        const startScreenButton = document.getElementById('start-screen-button');
        const howToPlayButton = document.getElementById('how-to-play-button');
        if (startScreen) startScreen.style.display = 'none';
        if (startScreenButton) startScreenButton.style.display = 'none';
        if (howToPlayButton) howToPlayButton.style.display = 'none';

        // Show game elements
        const healthBarContainer = document.getElementById('health-bar-container');
        const scoreElement = document.getElementById('score');
        if (healthBarContainer) healthBarContainer.style.display = 'block';
        if (scoreElement) scoreElement.style.display = 'block';
        if (stopButton) stopButton.style.display = 'block';
        if (startButton) startButton.style.display = 'none';

        // Initialize game state
        initializeGameState();
        
        // Initialize level
        currentLevel = 1;
        levelStartTime = performance.now();
        levelTimeRemaining = LEVEL_DURATION;

        // Show timer when game starts
        levelTimerDisplay.style.display = 'block';
        
        // Unmute and start game audio
        mediaPlayerInstance.isMuted = false;
        mediaPlayerInstance.volumeSlider.value = 45; // Set to 45%
        mediaPlayerInstance.updateVolume(0.45);
        mediaPlayerInstance.normalMusic.muted = false;
        mediaPlayerInstance.waveSound.muted = false;
        mediaPlayerInstance.catnipMusic.muted = false;
        for (let sound in mediaPlayerInstance.catSounds) {
            mediaPlayerInstance.catSounds[sound].muted = false;
        }
        mediaPlayerInstance.updateSpeakerIcon();
        mediaPlayerInstance.startGameMusic();
        mediaPlayerInstance.startWaveSound(); // Start the wave sound
        
        // Start the game loop
        isGameRunning = true;
        gameLoopRunning = true;
        lastTime = performance.now();
        gameStartTime = lastTime;
        lastSpawnTime = lastTime;
        requestAnimationFrame(gameLoop);
        
        console.log('Game started!');
    }

    // Add event listeners for start buttons
    const startButton = document.getElementById('start-button');
    const startScreenButton = document.getElementById('start-screen-button');
    const stopButton = document.getElementById('stop-button');

    if (startButton) {
        startButton.addEventListener('click', startGame);
    }

    if (startScreenButton) {
        startScreenButton.addEventListener('click', startGame);
    }

    if (stopButton) {
        stopButton.addEventListener('click', () => {
            isPaused = !isPaused;
            if (isPaused) {
                stopButton.textContent = '▶️';
                mediaPlayerInstance.stopWaveSound();
            } else {
                stopButton.textContent = '⏸️';
                lastTime = performance.now();
                mediaPlayerInstance.startWaveSound();
                requestAnimationFrame(gameLoop);
            }
        });
    }

    function handleTrick() {
        if (!isGameRunning || isGameOver || isPaused) return;

        const currentTime = performance.now();
        
        // Clear any lingering trick states if enough time has passed
        if (currentTime - lastTrickTime > TRICK_COOLDOWN * 2) {
            isPerformingTrick = false;
            currentTrick = null;
        }

        // Check cooldown and trick state
        if (currentTime - lastTrickTime < TRICK_COOLDOWN || isPerformingTrick) {
            console.log('Trick on cooldown or already performing:', {
                timeSinceLastTrick: currentTime - lastTrickTime,
                isPerformingTrick
            });
            return;
        }

        try {
            const scaledHeight = catHeight * catScaleFactor;
            
            if (!inTrickZone) {
                console.log('Not in trick zone, ignoring trick attempt');
                return;
            }

            const existingToasts = document.querySelectorAll('.trick-toast');
            existingToasts.forEach(toast => toast.remove());

            const result = performTrick(
                catY,
                scaledHeight,
                canvas.height * (1/3),
                isGameRunning,
                isGameOver,
                score,
                updateScore
            );

            if (result.score > 0) {
                currentTrick = result.trickName;
                lastTrickTime = currentTime;
                
                // Update the score
                score += result.score;
                updateScore();
                
                setTimeout(() => {
                    isPerformingTrick = false;
                    currentTrick = null;
                }, TRICK_COOLDOWN);
            }
        } catch (error) {
            console.error('Error in handleTrick:', error);
            currentTrick = null;
            inTrickZone = false;
        }
    }

    function updateScore() {
        const scoreElement = document.getElementById('score-number');
        if (scoreElement) {
            scoreElement.textContent = score;
            checkLevelUp(); // Check for level up after score update
        }
    }

    function updateHealthBar() {
        const healthBarFill = document.getElementById('health-bar-fill');
        const healthText = document.getElementById('health-text');
        if (healthBarFill && healthText) {
            const healthPercentage = (catHealth / maxCatHealth) * 100;
            healthBarFill.style.width = `${healthPercentage}%`;
            healthText.textContent = `${Math.round(catHealth)}`;
        }
    }

    function updateDebugPanel(catX, catY, catVelocityX, catVelocityY, inTrickZone, currentTrick) {
        if (!DEBUG_MODE) return;

        try {
            document.getElementById('debug-position').textContent = `(${Math.round(catX)}, ${Math.round(catY)})`;
            document.getElementById('debug-velocity').textContent = `(${catVelocityX.toFixed(2)}, ${catVelocityY.toFixed(2)})`;
            document.getElementById('debug-trick-zone').textContent = `${inTrickZone} (Y: ${Math.round(catY)} < ${Math.round(canvas.height/3)})`;
            document.getElementById('debug-trick').textContent = currentTrick || 'none';

            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                debugPanel.classList.toggle('active', DEBUG_MODE);
            }
            document.body.classList.toggle('debug-active', DEBUG_MODE);
        } catch (error) {
            console.error('Error in updateDebugPanel:', error);
        }
    }

    // 6. Event Listeners
    // ---------------------------
    // Now we can add event listeners since the functions they use are defined
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === ' ') {
            e.preventDefault();
            handleTrick();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // 7. Game Loop Functions
    // ---------------------------
    function gameLoop(timestamp) {
        if (!gameLoopRunning) return;

        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (deltaTime < 0.1 && !isPaused) {
            update(deltaTime);
            draw();
            
            // Update level timer
            if (!isGameOver) {
                updateLevelTimer();
            }
        }
        
        if (isGameRunning || isGameOver || isPaused) {
            requestAnimationFrame(gameLoop);
        } else {
            gameLoopRunning = false;
        }
    }

    function update(deltaTime) {
        if (isGameOver || !isGameRunning || isPaused) return;

        const currentTime = performance.now();
        const scaledHeight = catHeight * catScaleFactor;
        
        // Update invincibility timer
        if (isInvincible) {
            invincibilityTimer -= deltaTime * 1000;
            if (invincibilityTimer <= 0) {
                isInvincible = false;
            }
        }

        // Check if catnip mode should end
        if (isCatnipMode && currentTime > catnipEndTime) {
            isCatnipMode = false;
            catScaleFactor = 0.6; // Reset to normal size
            mediaPlayerInstance.stopCatnipMusic();
        }
        
        // Check if we should update trick zone state
        if (!isPerformingTrick || (currentTime - lastTrickTime > TRICK_COOLDOWN)) {
            inTrickZone = catY + scaledHeight < canvas.height * (1/3);
            if (inTrickZone) {
                activateTrickZone();
            }
        }
        
        // Update spawn rates based on time
        const { fishSpawnRate: newFishSpawnRate } = updateSpawnRates(
            currentTime,
            gameStartTime,
            INITIAL_FISH_SPAWN_RATE,
            MAX_FISH_SPAWN_RATE,
            TIME_TO_MAX_SPEED
        );
        fishSpawnRate = newFishSpawnRate;

        // Spawn new objects
        const spawnCheckInterval = isCatnipMode ? 100 : 1000; // Check every 0.1 seconds in catnip mode
        if (currentTime - lastSpawnTime > spawnCheckInterval) {
            // Increase fish spawn rate during catnip mode
            const adjustedFishSpawnRate = isCatnipMode ? Math.min(fishSpawnRate * 2, 1) : fishSpawnRate;
            
            // During catnip mode, spawn multiple fish at once
            const spawnCount = isCatnipMode ? 3 : 1;
            
            for (let i = 0; i < spawnCount; i++) {
                if (Math.random() < adjustedFishSpawnRate) {
                    const fish = spawnGameObject(canvas, {
                        tuna: tunaImage,
                        buffaloFish: buffaloFishImage,
                        salmon: salmonImage
                    }, 'fish');
                    gameObjects.push(fish);
                }
            }

            // Spawn mice with increased rate during catnip mode
            const mouseSpawnRate = isCatnipMode ? fishSpawnRate : fishSpawnRate * 0.5;
            if (Math.random() < mouseSpawnRate) {
                const mouse = spawnGameObject(canvas, { mouse: mouseImage }, 'mouse');
                gameObjects.push(mouse);
            }

            // Only check for catnip spawning during normal gameplay intervals
            if (!isCatnipMode && currentTime - lastSpawnTime > 1000) {
                // Check if there's already a catnip on screen
                const existingCatnip = gameObjects.some(obj => obj instanceof Catnip);
                
                if (!existingCatnip && catnipsSpawnedThisLevel < MAX_CATNIPS_PER_LEVEL && Math.random() < CATNIP_SPAWN_RATE) {
                    const catnip = spawnGameObject(canvas, { catnip: catnipImage }, 'catnip');
                    if (catnip) {
                        gameObjects.push(catnip);
                        catnipsSpawnedThisLevel++;
                    }
                }
            }
            lastSpawnTime = currentTime;
        }
        
        updateTrickZone(catY, scaledHeight, deltaTime, canvas);
        updateCatPosition();
        
        if (!isGameOver) {
            updateGameObjects(deltaTime);
            updateHealthBar();
            drawSurfMoveEffect();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (isGameRunning) {
            drawGameObjects();   // Draw game objects first (background layer)
            drawCat();          // Draw cat on top
            drawSurfMoveEffect();
        }

        // Draw catnip overlay if in catnip mode or game over
        if (isCatnipMode || isGameOver) {
            drawCatnipOverlay();
        }
        // Only show flash overlay if not game over
        if (isFlashing && !isGameOver) {
            drawFlashOverlay();
        }

        updateDebugPanel(
            catX, 
            catY, 
            catVelocityX, 
            catVelocityY, 
            inTrickZone, 
            null,
            currentTrick,
            isGameOver
        );
    }

    // 8. Initialization Functions
    // ---------------------------
    function startGameLoop() {
        if (!gameLoopRunning) {
            gameLoopRunning = true;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }

    // Add these before the game loop functions
    function updateCatPosition() {
        // Handle keyboard input for horizontal movement
        if (keys['ArrowLeft'] || keys['a']) {
            catVelocityX = Math.max(catVelocityX - catAcceleration, -catMaxSpeed);
            catFacingRight = false;
        }
        if (keys['ArrowRight'] || keys['d']) {
            catVelocityX = Math.min(catVelocityX + catAcceleration, catMaxSpeed);
            catFacingRight = true;
        }

        // Handle keyboard input for vertical movement
        if (keys['ArrowUp'] || keys['w']) {
            catVelocityY = -VERTICAL_SPEED;  // Move up
        } else if (keys['ArrowDown'] || keys['s']) {
            catVelocityY = VERTICAL_SPEED;   // Move down
        } else {
            catVelocityY *= catDeceleration; // Slow down vertical movement when no keys pressed
        }

        // Apply deceleration when no horizontal movement keys are pressed
        if (!keys['ArrowLeft'] && !keys['ArrowRight'] && !keys['a'] && !keys['d']) {
            catVelocityX *= catDeceleration;
        }

        // Apply minimum velocity threshold to prevent sliding
        if (Math.abs(catVelocityX) < 0.1) catVelocityX = 0;
        if (Math.abs(catVelocityY) < 0.1) catVelocityY = 0;

        // Update cat position based on velocity
        catX += catVelocityX;
        catY += catVelocityY;

        // Keep cat within canvas bounds
        if (catX < 0) {
            catX = 0;
            catVelocityX = 0;
        }
        if (catX + catWidth * catScaleFactor > canvas.width) {
            catX = canvas.width - catWidth * catScaleFactor;
            catVelocityX = 0;
        }
        if (catY < 0) {
            catY = 0;
            catVelocityY = 0;
        }
        if (catY + catHeight * catScaleFactor > canvas.height) {
            catY = canvas.height - catHeight * catScaleFactor;
            catVelocityY = 0;
        }
    }

    function updateGameObjects(deltaTime) {
        const scaledWidth = catWidth * catScaleFactor;
        const scaledHeight = catHeight * catScaleFactor;

        // Use filter instead of forEach for safe removal
        gameObjects = gameObjects.filter(obj => {
            obj.update(deltaTime);
            
            // Check for collisions
            if (obj.checkCollision(catX, catY, scaledWidth, scaledHeight)) {
                if (obj instanceof Fish) {
                    // Caught a fish - increase score based on fish type
                    score += obj.points;
                    updateScore();
                    updateFishCount(obj.type);
                    
                    // Restore health based on fish type
                    catHealth = Math.min(maxCatHealth, catHealth + obj.healthBoost);
                    updateHealthBar();
                    
                    // Show health boost effect
                    isFlashing = true;
                    flashStartTime = performance.now();
                    flashColor = 'rgba(0, 255, 0, 0.3)';  // Green flash for healing
                    flashAlpha = 0.3;
                    
                    mediaPlayerInstance.playNextFishCatchSound();
                    showScorePopup(obj.points, obj.type);
                    return false; // Remove the object
                } else if (obj instanceof Mouse) {
                    if (isCatnipMode) {
                        // During catnip mode, make the mouse spin away
                        obj.startSpinning();
                        mediaPlayerInstance.playNextFishCatchSound();
                        return true; // Keep the object alive for the animation
                    } else if (!isInvincible) {
                        // Take damage from mouse collision only if not invincible
                        catHealth = Math.max(0, catHealth - MOUSE_DAMAGE);
                        updateHealthBar();
                        mediaPlayerInstance.playHurtSound();
                        
                        // Set invincibility
                        isInvincible = true;
                        invincibilityTimer = INVINCIBILITY_DURATION;

                        // Only show red flash if health is not 0 (not game over)
                        if (catHealth > 0) {
                            isFlashing = true;
                            flashStartTime = performance.now();
                            flashColor = 'rgba(255, 0, 0, 0.5)';  // Semi-transparent red
                            flashAlpha = 0.5;  // Stronger flash for damage
                        }

                        // Game over if health reaches 0
                        if (catHealth <= 0) {
                            handleGameOver();
                            return false; // Remove the object
                        }
                    }
                } else if (obj instanceof Catnip) {
                    // Activate catnip mode
                    isCatnipMode = true;
                    catnipEndTime = performance.now() + CATNIP_DURATION;
                    catScaleFactor = CATNIP_SCALE_FACTOR;
                    
                    // Restore health to full
                    catHealth = maxCatHealth;
                    updateHealthBar();
                    
                    // Visual effects
                    isFlashing = true;
                    flashStartTime = performance.now();
                    flashColor = CATNIP_FLASH_COLOR;
                    flashAlpha = 0.6;
                    
                    showScorePopup('CATNIP!', 'catnip');
                    mediaPlayerInstance.startCatnipMusic();
                    return false; // Remove the object
                }
            }
            
            // Keep objects that are still on screen
            return !obj.shouldRemove;
        });
    }

    function drawCat() {
        ctx.save();
        const scaledWidth = catWidth * catScaleFactor;
        const scaledHeight = catHeight * catScaleFactor;
        
        // Calculate center point for rotation
        const centerX = catX + scaledWidth / 2;
        const centerY = catY + scaledHeight / 2;
        
        // Apply trick animations if performing a trick
        const isAnimating = applyTrickAnimation(
            ctx, 
            centerX, 
            centerY, 
            catX, 
            catY, 
            scaledWidth, 
            scaledHeight, 
            catFacingRight
        );
        
        // Use sunny cat image during catnip mode
        const currentCatImage = isCatnipMode ? catSunnyImage : catImage;
        
        // Add flashing effect when invincible
        if (isInvincible) {
            ctx.globalAlpha = Math.sin(performance.now() / 50) * 0.3 + 0.7;
        }
        
        if (!catFacingRight) {
            ctx.scale(-1, 1);
            ctx.drawImage(currentCatImage, -catX - scaledWidth, catY, scaledWidth, scaledHeight);
        } else {
            ctx.drawImage(currentCatImage, catX, catY, scaledWidth, scaledHeight);
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawGameObjects() {
        // Draw mice first (background layer)
        gameObjects.forEach(obj => {
            if (obj instanceof Mouse) {
                obj.draw(ctx);
            }
        });
        
        // Draw fish and catnip second (middle layer)
        gameObjects.forEach(obj => {
            if (obj instanceof Fish || obj instanceof Catnip) {
                obj.draw(ctx);
            }
        });
    }

    function drawSurfMoveEffect() {
        if (!isPerformingTrick || !currentTrickName) return;
        
        const centerX = catX + (catWidth * catScaleFactor) / 2;
        const centerY = catY + (catHeight * catScaleFactor) / 2;
        
        drawTrickEffect(ctx, centerX, centerY);
    }

    function drawCatnipOverlay() {
        ctx.save();
        
        // Create a rainbow gradient using our game's color scheme
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(255, 107, 107, 0.2)');  // Coral red (#FF6B6B)
        gradient.addColorStop(0.33, 'rgba(78, 205, 196, 0.2)'); // Turquoise (#4ECDC4)
        gradient.addColorStop(0.66, 'rgba(255, 217, 61, 0.2)');  // Golden yellow (#FFD93D)
        gradient.addColorStop(1, 'rgba(255, 107, 107, 0.2)');    // Back to coral red for seamless loop
        
        // Animate the gradient by shifting the transform
        const currentTime = performance.now() / 1000; // Convert to seconds
        const translateX = Math.sin(currentTime) * 50; // Shift by 50 pixels
        const translateY = Math.cos(currentTime) * 50;
        ctx.translate(translateX, translateY);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100); // Slightly larger to account for translation
        
        ctx.restore();
    }

    function drawFlashOverlay() {
        const currentTime = performance.now();
        const flashProgress = (currentTime - flashStartTime) / flashDuration;
        
        if (flashProgress >= 1) {
            isFlashing = false;
        } else {
            ctx.save();
            ctx.fillStyle = `${flashColor}`;
            ctx.globalAlpha = flashAlpha * (1 - flashProgress);
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    function showScorePopup(points, fishType) {
        // Create a score popup element
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        
        // For fish, show both points and health boost
        if (fishType === 'tuna' || fishType === 'buffalo' || fishType === 'salmon') {
            const healthBoost = {
                'tuna': 15,
                'buffalo': 5,
                'salmon': 10
            }[fishType];
            popup.innerHTML = `+${points}<br>❤️${healthBoost}`;
        } else {
            popup.textContent = `+${points}`;
        }
        
        // Add fish type specific class for different colors
        popup.classList.add(`fish-${fishType}`);
        
        // Position it at the cat's location
        popup.style.left = `${catX + (catWidth * catScaleFactor) / 2}px`;
        popup.style.top = `${catY}px`;
        
        // Add it to the game container
        document.getElementById('game-container').appendChild(popup);
        
        // Remove it after animation
        setTimeout(() => {
            popup.remove();
        }, 1000);
    }

    function showPowerupPopup(text) {
        const popup = document.createElement('div');
        popup.className = 'powerup-popup';
        popup.textContent = text;
        
        // Position it at the cat's location
        popup.style.left = `${catX + (catWidth * catScaleFactor) / 2}px`;
        popup.style.top = `${catY}px`;
        
        // Add it to the game container
        document.getElementById('game-container').appendChild(popup);
        
        // Remove it after animation
        setTimeout(() => {
            popup.remove();
        }, 1500);
    }

    // Add these new functions for level management
    function updateLevel() {
        const levelElement = document.getElementById('level-number');
        if (levelElement) {
            levelElement.textContent = currentLevel;
        }
    }

    function checkLevelUp() {
        const nextLevelPoints = lastLevelPoints + POINTS_PER_LEVEL;
        if (score >= nextLevelPoints) {
            currentLevel++;
            lastLevelPoints = nextLevelPoints;
            
            // Update level display
            updateLevel();
            
            // Add level up animation
            const levelContainer = document.getElementById('level-container');
            if (levelContainer) {
                levelContainer.classList.remove('level-up');
                void levelContainer.offsetWidth; // Trigger reflow
                levelContainer.classList.add('level-up');
            }
            
            // Show level up notification
            showLevelUpNotification();
            
            // Play level up sound
            mediaPlayerInstance.playLevelUpSound();
            
            // Increase game difficulty
            updateGameDifficulty();
        }
    }

    function showLevelUpNotification() {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.textContent = `LEVEL ${currentLevel}!`;
        document.getElementById('game-container').appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
            notification.remove();
        }, 1500);
    }

    function updateGameDifficulty() {
        // Increase spawn rates and speed based on level
        fishSpawnRate = Math.min(INITIAL_FISH_SPAWN_RATE * (1 + currentLevel * 0.1), MAX_FISH_SPAWN_RATE);
        waveSpeed = Math.min(INITIAL_WAVE_SPEED * (1 + currentLevel * 0.1), MAX_WAVE_SPEED);
        
        // Add more mice as levels progress
        const mouseSpawnRate = Math.min(0.1 + (currentLevel - 1) * 0.05, 0.3); // Cap at 30% spawn rate
        
        // Increase game speed (but keep it manageable)
        const speedMultiplier = 1 + (currentLevel - 1) * 0.05; // 5% faster each level
        catMaxSpeed = Math.min(BASE_CAT_SPEED * speedMultiplier, BASE_CAT_SPEED * 1.5); // Cap at 50% faster than base
    }

    // Add event listener for starting new game
    window.addEventListener('startNewGame', () => {
        initializeGameState();
        startGame();
    });

    // Start the game initialization
    initGame();

    // Add new function to handle game over state
    function handleGameOver() {
        // Clear game states
        isGameOver = true;
        isGameRunning = false;
        isPaused = true;
        
        // Clear any active animations or transitions
        const notifications = document.querySelectorAll('.level-up-notification, .powerup-popup, .score-popup');
        notifications.forEach(notification => notification.remove());
        
        // Hide level-related UI
        levelTimerDisplay.style.display = 'none';
        levelSummaryScreen.style.display = 'none';
        
        // Stop all game sounds
        mediaPlayerInstance.stopAllSounds();
        
        // Show game over screen with slight delay to ensure clean state
        setTimeout(() => {
            gameOverManager.showGameOver(currentLevel, score);
            
            // Force focus on name input after a short delay
            setTimeout(() => {
                const nameInput = document.getElementById('player-name');
                if (nameInput) {
                    nameInput.focus();
                }
            }, 100);
        }, 100);
        
        // Enable catnip mode for game over
        isCatnipMode = true;
        
        // Play Catnip music
        mediaPlayer.startCatnipMusic();
    }

    // Update the game over screen event listener
    document.getElementById('player-name').addEventListener('keydown', (e) => {
        e.stopPropagation(); // Prevent game controls from interfering
    });

    // Add invincibility state
    let isInvincible = false;
    let invincibilityTimer = 0;
})();
