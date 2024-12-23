import { DEBUG_MODE } from './debug.js';
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
    
    // Collision State
    let currentCollision = null;
    
    // Visual Effects
    let isFlashing = false;
    let isPositiveFlash = false;
    let flashStartTime = 0;
    let flashColor = 'red';
    let flashAlpha = 0.3;
    
    // Catnip Mode
    let isCatnipMode = false;
    
    // 3. Constants
    // ---------------------------
    const INITIAL_MAX_TRASH_ITEMS = 3;
    const MAX_POSSIBLE_TRASH_ITEMS = 10;
    const BASE_SPEED = 200;
    const SPEED_VARIATION = 50;
    const MOUSE_DAMAGE = 34;
    const flashDuration = 500;
    const CATNIP_SCALE_FACTOR = 1.1025;
    const CAT_WIDTH = 300;
    const CAT_HEIGHT = 300;
    
    // Movement Constants
    const catMaxSpeed = 8;
    const catAcceleration = 0.5;
    const catDeceleration = 0.95;
    const VERTICAL_SPEED = 8;
    
    // Wave & Spawn Rates
    let waveSpeed = 100;
    const INITIAL_WAVE_SPEED = 2;
    const MAX_WAVE_SPEED = 8;
    const TIME_TO_MAX_SPEED = 300;
    const INITIAL_FISH_SPAWN_RATE = 0.02;
    const MAX_FISH_SPAWN_RATE = 0.03;
    let fishSpawnRate = INITIAL_FISH_SPAWN_RATE;
    
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
                        resolve();
                    }
                };
                img.onerror = (err) => {
                    console.error(`Failed to load ${key}:`, err);
                    reject(err);
                };
                img.src = path;
                
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
        
        // Initialize debug panel
        if (DEBUG_MODE) {
            updateDebugPanel(catX, catY, catVelocityX, catVelocityY, inTrickZone, currentCollision, currentTrick);
        }
        
        // Reset trick-related state
        lastTrickTime = 0;
        isPerformingTrick = false;
        inTrickZone = false;
        currentTrick = null;
        
        // Clean up any existing toasts
        const existingToasts = document.querySelectorAll('.trick-toast');
        existingToasts.forEach(toast => toast.remove());
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

        // Start the game loop
        isGameRunning = true;
        gameLoopRunning = true;
        lastTime = performance.now();
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
            } else {
                stopButton.textContent = '⏸️';
                lastTime = performance.now();
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

    function updateDebugPanel(catX, catY, catVelocityX, catVelocityY, inTrickZone, currentCollision, currentTrick) {
        if (!DEBUG_MODE) return;

        try {
            document.getElementById('debug-position').textContent = `(${Math.round(catX)}, ${Math.round(catY)})`;
            document.getElementById('debug-velocity').textContent = `(${catVelocityX.toFixed(2)}, ${catVelocityY.toFixed(2)})`;
            document.getElementById('debug-trick-zone').textContent = `${inTrickZone} (Y: ${Math.round(catY)} < ${Math.round(canvas.height/3)})`;
            document.getElementById('debug-collision').textContent = currentCollision || 'none';
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
        }
        
        if (isGameRunning || isGameOver || isPaused) {
            requestAnimationFrame(gameLoop);
        } else {
            gameLoopRunning = false;
        }
    }

    function update(deltaTime) {
        if (isGameOver || !isGameRunning || isPaused) return;

        const scaledHeight = catHeight * catScaleFactor;
        
        // Check if we should update trick zone state
        const currentTime = performance.now();
        if (!isPerformingTrick || (currentTime - lastTrickTime > TRICK_COOLDOWN)) {
            inTrickZone = catY + scaledHeight < canvas.height * (1/3);
            if (inTrickZone) {
                activateTrickZone();
            }
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
            drawCat();
            drawGameObjects();
            drawSurfMoveEffect();
        }

        if (isCatnipMode) {
            drawCatnipOverlay();
        }
        if (isFlashing) {
            drawFlashOverlay();
        }

        updateDebugPanel(
            catX, 
            catY, 
            catVelocityX, 
            catVelocityY, 
            inTrickZone, 
            currentCollision, 
            currentTrick
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
        // Update game objects (fish, obstacles, etc.)
        gameObjects.forEach((obj, index) => {
            obj.update(deltaTime);
            if (obj.shouldRemove) {
                gameObjects.splice(index, 1);
            }
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
        
        if (!catFacingRight) {
            ctx.scale(-1, 1);
            ctx.drawImage(catImage, -catX - scaledWidth, catY, scaledWidth, scaledHeight);
        } else {
            ctx.drawImage(catImage, catX, catY, scaledWidth, scaledHeight);
        }
        ctx.restore();
    }

    function drawGameObjects() {
        // Draw all game objects
        gameObjects.forEach(obj => obj.draw(ctx));
    }

    function drawSurfMoveEffect() {
        if (!isPerformingTrick || !currentTrickName) return;
        
        const centerX = catX + (catWidth * catScaleFactor) / 2;
        const centerY = catY + (catHeight * catScaleFactor) / 2;
        
        drawTrickEffect(ctx, centerX, centerY);
    }

    function drawCatnipOverlay() {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    // Start the game initialization
    initGame();
})();
