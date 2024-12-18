import { 
    performTrick,
    startSurfMove,
    updateSurfMove,
    endSurfMove,
    drawTrickName,
    calculateTrickThreshold,
    TRICK_DURATION,
    TRICK_COOLDOWN,
    TRICK_NAME_DISPLAY_DURATION,
    TRICK_THRESHOLD,
    showTrickToast,
    updateTrickButton,
    drawTrickZone,
    updateTrickZoneState,
    isTrickZoneActive,
    trickZoneTimeLeft
} from './tricks.js';
import * as Tricks from './tricks.js';
import { mediaPlayer } from './mediaPlayer.js';
import { db, collection, addDoc, getDocs, query, orderBy, limit } from './firebase-config.js';

(function() {
    // Add these variables at the top of your file, with other global variables
    let isMobile = false;
    const mobileBreakpoint = 768; // typical tablet breakpoint

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    let score = 0;
    let isFirstScoreUpdate = true;
    let catX = 0;
    let catY = 0;
    let catVelocityX = 0;
    let catVelocityY = 0;
    let catMaxSpeed = 12; // Initial max speed, can be modified by power-ups
    const catAcceleration = 0.9; // Decreased from 1.2 to 0.9
    const catDeceleration = 0.95; // Decreased from 0.97 to 0.95 for more friction
    let waveSpeed = 100; // Adjust this value to set the base speed of objects
    let isGameRunning = false;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load images
    let fishImage = new Image();
    let catImage = new Image();
    let catSunnyImage = new Image(); // New sunny image
    let loadedTrashImages = [];
    let mouseImage = new Image();
    let tunaImage = new Image();
    let buffaloFishImage = new Image();
    let salmonImage = new Image();
    let catnipImage = new Image();
    let loadedCollectibleImages = [];

    let imagesLoaded = 0;
    const totalImages = 9; // 3 original + 3 new collectibles + 3 trash images

    let catHealth = 100; // New variable for cat's health
    const maxCatHealth = 100; // Maximum cat health

    // Add this to your existing array of images to load
    const trashImages = [
        { src: './assets/trash-can.png', width: 60, height: 80 },    // Doubled from 30x40
        { src: './assets/trash-bottle.png', width: 40, height: 80 }, // Doubled from 20x40
        { src: './assets/trash-bag.png', width: 80, height: 80 },    // Doubled from 35x35
    ];

    // Add these constants for collectible properties
    const COLLECTIBLES = [
        { type: 'tuna', points: 25, health: 25, image: tunaImage, width: 100, height: 100 },
        { type: 'buffalo-fish', points: 10, health: 10, image: buffaloFishImage, width: 70, height: 40 },
        { type: 'salmon', points: 20, health: 20, image: salmonImage, width: 120, height: 120 },
        { type: 'catnip', points: 100, health: 100, image: catnipImage, width: 40, height: 40 }
    ];

    // Modify the imageLoaded function
    function imageLoaded() {
        imagesLoaded++;
        console.log(`Image loaded. Total: ${imagesLoaded}/${totalImages + trashImages.length}`); // Debug log
        if (imagesLoaded === totalImages + trashImages.length) {
            console.log('All images loaded. Initializing game.'); // Debug log
            initializeGame();
        }
    }

    // Load cat and fish images
    catImage.onload = function() {
        imageLoaded();
        // Initialize cat dimensions once image is loaded
        catWidth = CAT_WIDTH;
        catHeight = CAT_HEIGHT;
        // Force initial position and draw
        catX = canvas.width / 3;
        catY = canvas.height / 2 - catHeight / 2;
        draw();
    };
    catImage.src = './assets/pizza-cat.png'; // Default cat image

    catSunnyImage.src = './assets/pizza-cat-sunny.png'; // Sunny cat image

    fishImage.onload = imageLoaded;
    fishImage.src = './assets/buffalo-fish.png'; // Make sure this path is correct

    // Load trash images
    trashImages.forEach((trashItem, index) => {
        const img = new Image();
        img.onload = imageLoaded;
        img.onerror = function() {
            console.error(`Failed to load image: ${trashItem.src}`);
            imageLoaded(); // Still call imageLoaded to avoid blocking the game
        };
        img.src = trashItem.src;
        loadedTrashImages[index] = img;
    });

    let catFacingRight = true; // New variable to track cat's facing direction

    // Define an array of bright, Hawaiian-inspired colors
    const hawaiianColors = [
        '#FF6B6B', // Bright Coral
        '#4ECDC4', // Turquoise
        '#45B7D1', // Ocean Blue
        '#F7FFF7', // White (for contrast)
        '#FFD93D', // Sunny Yellow
        '#FF8C42', // Mango Orange
        '#98D9C2', // Mint Green
        '#E84855', // Hibiscus Red
        '#F9DC5C', // Pineapple Yellow
        '#3185FC', // Tropical Sky Blue
        '#E56399', // Orchid Pink
        '#7AE7C7', // Seafoam Green
        '#FFA69E', // Soft Coral
        '#9B5DE5', // Lavender
        '#00BBF9', // Bright Sky Blue
    ];

    function getRandomHawaiianColor() {
        return hawaiianColors[Math.floor(Math.random() * hawaiianColors.length)];
    }

    // Add this near the top of your script with other initializations
    const waveBackgroundSound = document.getElementById('waveBackgroundSound');

    // Function to start playing the background wave sound
    function startBackgroundWaveSound() {
        waveBackgroundSound.play().catch(e => console.error("Error playing background sound:", e));
    }

    // Function to stop the background wave sound
    function stopBackgroundWaveSound() {
        waveBackgroundSound.pause();
        waveBackgroundSound.currentTime = 0;
    }

    // Adjust these constants near the top of your file
    const INITIAL_MAX_TRASH_ITEMS = 3;
    const MAX_POSSIBLE_TRASH_ITEMS = 10;
    const INITIAL_TRASH_SPAWN_RATE = 0.01;
    const MAX_TRASH_SPAWN_RATE = 0.025;
    const TRASH_SPEED_VARIATION = 0.7;

    // Add these new constants for fish
    const INITIAL_FISH_SPAWN_RATE = 0.005;
    const MAX_FISH_SPAWN_RATE = 0.015;

    // Time (in seconds) to reach maximum difficulty
    const TIME_TO_MAX_DIFFICULTY = 180; // 3 minutes

    // Add these variables to track game progression
    let gameTime = 0;
    let maxTrashItems = INITIAL_MAX_TRASH_ITEMS;
    let trashSpawnRate = INITIAL_TRASH_SPAWN_RATE;
    let fishSpawnRate = INITIAL_FISH_SPAWN_RATE;

    // Add these constants near the top of your file
    const INITIAL_WAVE_SPEED = 2; // Starting speed
    const MAX_WAVE_SPEED = 8; // Maximum speed
    const TIME_TO_MAX_SPEED = 300; // Time (in seconds) to reach max speed (5 minutes)

    // Add this variable to track game progression
    waveSpeed = INITIAL_WAVE_SPEED;

    // Add this variable to track game state
    let isGameOver = false;

    // Define these variables globally if they're not already defined
    let catWidth = 200;  // Set initial values instead of declaring without values
    let catHeight = 200;
    let leftPressed = false;
    let rightPressed = false;
    let upPressed = false;
    let downPressed = false;

    // Adjust these values to make the cat slightly smaller
    const CAT_WIDTH = 200;  // Reduced from 250 to 200
    const CAT_HEIGHT = 200; // Reduced from 250 to 200

    function initializeCat() {
        catWidth = CAT_WIDTH;
        catHeight = CAT_HEIGHT;
        catX = canvas.width / 5; // Adjust initial position
        catY = (canvas.height - catHeight) / 2; // Center vertically
    }

    let currentInstructionIndex = 0;
    const instructions = [
        {
            text: "Get all the fish 🐟",
            videoSrc: "./assets/video/tut-fish-web.mp4"
            /*images: ["./assets/tuna.png", "./assets/buffalo-fish.png", "./assets/salmon.png"]*/
        },
        {
            text: "Move with your finger ☝️",
            videoSrc: "./assets/video/tut-finger-web.mp4"
        },
        {
            text: "Or use arrow keys ⬆️⬇️⬅️➡️",
            videoSrc: "./assets/video/tut-arrows-web.mp4"
        },
        {
            text: "Dodge Ninja Rat 🥷",
            videoSrc: "./assets/video/tut-rat-web.mp4"
            /*images: ["./assets/mouse.png"]*/
        },
        {
            text: "Do a trick over the wave! [Spacebar] on desktop",
            videoSrc: "./assets/video/tut-trick-web.mp4"
            /*images: []*/
        },
        {
            text: "Chill out in Catnip mode 🌿",
            videoSrc: "./assets/video/tut-catnip-web.mp4"
            /*images: []*/
        }
    ];

    function showStartMode() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Hide the start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.style.display = 'none';
        }

        // Draw the Pizza Cat at 2x size
        const catStartWidth = CAT_WIDTH * 2;
        const catStartHeight = CAT_HEIGHT * 2;
        const catStartX = (canvas.width - catStartWidth) / 2;
        const catStartY = (canvas.height - catStartHeight) / 2 - 100; // Adjust Y to leave space for instructions

        ctx.drawImage(catImage, catStartX, catStartY, catStartWidth, catStartHeight);

        // Show instructions
        const instructionsContainer = document.getElementById('instructions-container');
        instructionsContainer.style.display = 'block';
        setTimeout(() => {
            instructionsContainer.classList.add('show');
        }, 10); // Slight delay to trigger transition

        updateInstruction();

        // Add event listener to the existing button
        const startScreenButton = document.getElementById('start-screen-button');
        startScreenButton.addEventListener('click', () => {
            startGame();
            removeStartScreen();
        });
    }

    function updateInstruction() {
        const instruction = instructions[currentInstructionIndex];
        const instructionText = document.getElementById('instruction-text');
        const instructionVideo = document.getElementById('instruction-video');
        const carouselDots = document.getElementById('carousel-dots');

        if (instructionText) {
            instructionText.textContent = instruction.text;
        }

        // Update video source if applicable
        if (instruction.videoSrc) {
            instructionVideo.src = instruction.videoSrc;
            instructionVideo.style.display = 'block';
            instructionVideo.autoplay = true;
            instructionVideo.loop = true;
            instructionVideo.controls = false;
            instructionVideo.muted = true; // Mute the video
        } else {
            instructionVideo.style.display = 'none';
        }

        // Update carousel dots
        if (carouselDots) {
            carouselDots.innerHTML = ''; // Clear existing dots
            instructions.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.className = 'carousel-dot';
                if (index === currentInstructionIndex) {
                    dot.classList.add('active');
                }
                dot.addEventListener('click', () => {
                    currentInstructionIndex = index;
                    updateInstruction();
                });
                carouselDots.appendChild(dot);
            });
        }
    }

    document.getElementById('next-instruction-button').addEventListener('click', () => {
        currentInstructionIndex = (currentInstructionIndex + 1) % instructions.length;
        updateInstruction();
    });

    function removeStartScreen() {
        const startButton = document.getElementById('start-screen-button');
        const nextButton = document.getElementById('next-button');
        const instructionText = document.getElementById('instruction-text');
        const instructionImages = document.getElementById('instruction-images');

        if (startButton) startButton.remove();
        if (nextButton) nextButton.remove();
        if (instructionText) instructionText.remove();
        if (instructionImages) instructionImages.remove();

        // Hide instructions
        document.getElementById('instructions-container').style.display = 'none';
    }

    // Modify the initializeGame function to show the start mode first
    function initializeGame() {
        // Set initial cat dimensions and position
        catWidth = CAT_WIDTH;
        catHeight = CAT_HEIGHT;
        catX = canvas.width / 3;
        catY = canvas.height / 2 - catHeight / 2;
        
        // Initialize game state
        isGameRunning = false;
        score = 0;
        catHealth = maxCatHealth;
        isFirstScoreUpdate = true;
        updateScore();
        updateHealthBar();
        
        // Show start button initially
        document.getElementById('start-button').style.display = 'inline-block';
        document.getElementById('stop-button').style.display = 'none';

        // Force an initial draw
        draw();

        // Start the game loop
        gameLoopRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);

        // Reset game variables
        gameTime = 0;
        maxTrashItems = INITIAL_MAX_TRASH_ITEMS;
        trashSpawnRate = INITIAL_TRASH_SPAWN_RATE;
        fishSpawnRate = INITIAL_FISH_SPAWN_RATE;
        waveSpeed = INITIAL_WAVE_SPEED;
        setupTrickButton();

        // Show the start mode initially
        showStartMode();
    }

    function drawInitialState() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the cat at its starting position
        drawCat();

        // Update the health bar (using CSS version)
        updateHealthBar();

        // Any other initial game elements you want to draw
    }

    let lastTime = 0;
    function gameLoop(timestamp) {
        if (!gameLoopRunning) return;

        // Calculate proper deltaTime in seconds
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // Only update if deltaTime is reasonable (prevents huge jumps)
        if (deltaTime < 0.1 && !isPaused) {
            update(deltaTime);
            draw(); // Make sure we're calling draw every frame
        }
        
        if (isGameRunning || isGameOver || isPaused) {
            requestAnimationFrame(gameLoop);
        } else {
            gameLoopRunning = false;
        }
    }

    // Add near the top with other state variables
    let isPaused = false;
    let lastGameState = null;
    let inTrickZone = false;
    let trickZoneIntensity = 0;
    const TRICK_INTENSITY_MAX = 100;
    const TRICK_INTENSITY_RATE = 4;
    let trickCountdown = null;
    let currentTrickIndex = 0;
    const TRICK_NAMES = [
        'Wisker Flip',
        'Tail Spin', 
        'Paw Plant', 
        'Pizza Roll'
    ];

    // Create trick zone elements
    const trickZone = document.createElement('div');
    trickZone.className = 'trick-zone';
    document.getElementById('game-container').appendChild(trickZone);

    const trickZoneBar = document.createElement('div');
    trickZoneBar.className = 'trick-zone-bar';

    const trickZoneLabel = document.createElement('div');
    trickZoneLabel.className = 'trick-zone-label';
    trickZoneLabel.textContent = 'TRICK ZONE';

    const trickZoneBarBg = document.createElement('div');
    trickZoneBarBg.className = 'trick-zone-bar-background';

    const trickZoneBarFill = document.createElement('div');
    trickZoneBarFill.className = 'trick-zone-bar-fill';

    const trickInstruction = document.createElement('div');
    trickInstruction.className = 'trick-instruction';

    // Assemble the elements
    trickZoneBarBg.appendChild(trickZoneBarFill);
    trickZoneBar.appendChild(trickZoneLabel);
    trickZoneBar.appendChild(trickZoneBarBg);
    document.getElementById('game-container').appendChild(trickZoneBar);
    document.getElementById('game-container').appendChild(trickInstruction);

    function update(deltaTime) {
        if (isGameOver || !isGameRunning) return;

        // Update trick zone state
        inTrickZone = Tricks.updateTrickZoneState(
            catY,
            catHeight,
            TRICK_THRESHOLD,
            deltaTime
        );

        // Update cat position - Add this back!
        updateCatPosition();
        
        // Update game objects
        if (!isGameOver) {
            updateGameObjects(deltaTime);
            updateHealthBar();
            drawSurfMoveEffect();
        }

        // Rest of update function...
    }

    const surfMoves = [
        { name: 'Aerial', scale: 1.2, rotation: Math.PI * 2 },
        { name: 'Cutback', scale: 1.1, rotation: Math.PI },
        { name: 'Barrel', scale: 0.9, rotation: 0 },
        { name: 'Floater', scale: 1.15, rotation: Math.PI / 2 },
    ];

    let currentSurfMove = null;
    let surfMoveStartTime = 0;
    let surfMoveProgress = 0;

    // Add these variables at the top of your file
    let isTouching = false;
    let touchX = 0;
    let touchY = 0;

    // Modify the touch event listeners
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', () => { isTouching = false; }, { passive: true });

    let lastTapTime = 0;

    function handleTouch(event) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);

        // Detect double tap for trick
        const currentTime = Date.now();
        if (currentTime - lastTapTime < 300) { // 300ms between taps
            const scoreIncrease = performTrick(
                catY,
                catHeight,
                TRICK_THRESHOLD,
                isGameRunning,
                isGameOver,
                score,
                updateScore
            );
            if (scoreIncrease > 0) {
                score += scoreIncrease;
                updateScore();
            }
        }
        lastTapTime = currentTime;
    }

    // Add these variables at the top of your file
    let targetX = 0;
    let targetY = 0;
    const RESISTANCE = 0.1; // Adjust this value to change the level of resistance (0.1 = 10% movement towards target per frame)

    function updateCatPosition() {
        // Keyboard controls
        if (keys.ArrowLeft) {
            catVelocityX = Math.max(catVelocityX - catAcceleration, -catMaxSpeed);
            catFacingRight = false;
        }
        if (keys.ArrowRight) {
            catVelocityX = Math.min(catVelocityX + catAcceleration, catMaxSpeed);
            catFacingRight = true;
        }
        if (keys.ArrowUp) catVelocityY = Math.max(catVelocityY - catAcceleration, -catMaxSpeed);
        if (keys.ArrowDown) catVelocityY = Math.min(catVelocityY + catAcceleration, catMaxSpeed);

        // Touch controls
        if (isTouching) {
            const dx = touchX - (catX + catWidth / 2);
            const dy = touchY - (catY + catHeight / 2);
            
            // Apply touch movement with sensitivity
            catVelocityX += dx * RESISTANCE;
            catVelocityY += dy * RESISTANCE;

            // Update facing direction based on touch movement
            if (Math.abs(dx) > Math.abs(dy)) {
                catFacingRight = dx > 0;
            }
        }

        // Apply velocity
        catX += catVelocityX;
        catY += catVelocityY;

        // Apply deceleration
        catVelocityX *= catDeceleration;
        catVelocityY *= catDeceleration;

        // Keep cat within bounds
        catX = Math.max(0, Math.min(canvas.width - catWidth, catX));
        catY = Math.max(0, Math.min(canvas.height - catHeight, catY));
    }

    function startSurfMove() {
        currentSurfMove = surfMoves[Math.floor(Math.random() * surfMoves.length)];
        surfMoveStartTime = Date.now();
        surfMoveProgress = 0;
        console.log(`Starting surf move: ${currentSurfMove.name}`);
    }

    function updateSurfMove() {
        const elapsedTime = Date.now() - surfMoveStartTime;
        surfMoveProgress = Math.min(elapsedTime / 1000, 1); // Max 1 second for full animation
    }

    function endSurfMove() {
        const endDuration = 500; // 0.5 seconds to return to normal
        const endStartTime = Date.now();

        function animateEnd() {
            const elapsedTime = Date.now() - endStartTime;
            const endProgress = Math.min(elapsedTime / endDuration, 1);
            surfMoveProgress = 1 - endProgress;

            if (endProgress < 1) {
                requestAnimationFrame(animateEnd);
            } else {
                currentSurfMove = null;
                surfMoveProgress = 0;
            }
        }

        animateEnd();
    }

    // Function to check if the device is mobile
    function checkMobile() {
        isMobile = window.innerWidth <= mobileBreakpoint;
    }

    // Call this function initially and on window resize
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const DEBUG_MODE = false; // Set this to false to hide debug info

    function drawCat() {
        if (!catImage || !catImage.complete) {
            console.warn('Cannot draw cat - image not ready');
            return;
        }
        
        ctx.save();
        ctx.translate(catX + catWidth / 2, catY + catHeight / 2);
        
        // Apply trick rotation if any
        const rotation = Tricks.getTrickRotation();
        if (rotation > 0) {
            ctx.rotate(rotation);
        }
        
        if (!catFacingRight) {
            ctx.scale(-1, 1);
        }
        
        try {
            ctx.drawImage(catImage, -catWidth / 2, -catHeight / 2, catWidth, catHeight);
        } catch (error) {
            console.error('Error drawing cat:', error);
        }
        
        ctx.restore();
    }

    // Near the top of the file, update these audio elements
    const fishCatchSound1 = new Audio('./assets/cat-meow-1.MP3');
    const fishCatchSound2 = new Audio('./assets/cat-bite-1.MP3');
    const fishCatchSound3 = new Audio('./assets/cat-meow-2.MP3');

    // Add this near the top of your script with other initializations
    const fishCatchSounds = [
        fishCatchSound1,
        fishCatchSound2,
        fishCatchSound3
    ];
    let currentSoundIndex = 0;

    function playNextFishCatchSound() {
        const currentSound = fishCatchSounds[currentSoundIndex];
        
        // Only play if the current sound is not already playing
        if (currentSound.paused) {
            currentSound.play().catch(e => console.error("Error playing sound:", e));
            
            // Move to the next sound for the next catch
            currentSoundIndex = (currentSoundIndex + 1) % fishCatchSounds.length;
        }
    }

    // Modify fishArray to include both fish and trash
    let gameObjects = [];

    // Adjust these constants for better object speeds
    const BASE_SPEED = 200; // Base speed for all objects
    const SPEED_VARIATION = 50; // How much random variation to add

    // Function to show a toast notification
    function showToast(message, points, emoji = '🐟') {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove(); // Remove any existing toast
        }

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="reaction">${emoji}</div>
            <div class="trick-name">${message}</div>
            <div class="points">+${points} PTS</div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000); // Adjust the duration as needed
    }

    // Modify the updateGameObjects function
    function updateGameObjects(deltaTime) {
        const currentTime = Date.now();
        
        // Spawn new objects
        if (Math.random() < trashSpawnRate + fishSpawnRate) {
            spawnObject();
        }
        
        for (let i = gameObjects.length - 1; i >= 0; i--) {
            const obj = gameObjects[i];
            
            if (obj.type === 'mouse') {
                if (!obj.hasMimicked) {
                    // Update rat's direction to mimic the cat's movement once
                    const dx = (catX + catWidth / 2) - (obj.x + obj.width / 2);
                    const dy = (catY + catHeight / 2) - (obj.y + obj.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Normalize the direction
                    obj.directionX = dx / distance;
                    obj.directionY = dy / distance;

                    // Mark as mimicked
                    obj.hasMimicked = true;
                }

                // Move rat towards the cat
                obj.x += obj.directionX * obj.speed * deltaTime;
                obj.y += obj.directionY * obj.speed * deltaTime;
            } else {
                // Normal object movement
                obj.x -= obj.speed * deltaTime;
            }

            // Remove objects that are off-screen
            if (obj.x + obj.width < 0 || obj.y + obj.height < 0 || obj.y > canvas.height) {
                gameObjects.splice(i, 1);
                continue;
            }

            // Collision detection
            const catCenterX = catX + catWidth / 2;
            const catCenterY = catY + catHeight / 2;
            const objCenterX = obj.x + obj.width / 2;
            const objCenterY = obj.y + obj.height / 2;

            const distanceX = Math.abs(catCenterX - objCenterX);
            const distanceY = Math.abs(catCenterY - objCenterY);

            // Check for collision
            if (distanceX < (catWidth + obj.width) / 2 * 0.8 &&
                distanceY < (catHeight + obj.height) / 2 * 0.8) {
                
                gameObjects.splice(i, 1); // Remove the collected/hit object
                
                switch(obj.type) {
                    case 'mouse':
                        catHealth = Math.max(0, catHealth - MOUSE_DAMAGE);
                        updateHealthBar();
                        mediaPlayer.playHurtSound();
                        isFlashing = true;
                        isSpectrumFlash = false;
                        flashColor = 'red';
                        flashAlpha = 0.3;
                        flashStartTime = Date.now();
                        break;
                        
                    case 'trash':
                        catHealth = Math.max(0, catHealth - 20);
                        updateHealthBar();
                        mediaPlayer.playCatMeowSound();
                        isFlashing = true;
                        isSpectrumFlash = false;
                        flashColor = 'red';
                        flashAlpha = 0.3;
                        flashStartTime = Date.now();
                        break;
                        
                    case 'tuna':
                    case 'buffalo-fish':
                    case 'salmon':
                        score += obj.points;
                        catHealth = Math.min(maxCatHealth, catHealth + obj.health);
                        updateScore();
                        updateHealthBar();
                        mediaPlayer.playYumSound();
                        showToast(obj.type.charAt(0).toUpperCase() + obj.type.slice(1), obj.points); // Show toast for fish
                        isFlashing = true;
                        isSpectrumFlash = true;
                        flashAlpha = 0.2;
                        flashStartTime = Date.now();
                        break;
                        
                    case 'catnip':
                        score += obj.points * (isCatnipMode ? 2 : 1); // Double score in catnip mode
                        catHealth = Math.min(maxCatHealth, catHealth + obj.health);
                        updateScore();
                        updateHealthBar();
                        mediaPlayer.playCatnipSound(); // Play the catnip sound alternately
                        showToast('Catnip', obj.points, '🌿'); // Show toast for catnip with plant emoji
                        isFlashing = true;
                        isSpectrumFlash = true;
                        flashAlpha = 0.2;
                        flashStartTime = Date.now();
                        
                        startCatnipMode(); // Start catnip mode
                        break;
                }

                // Check for game over
                if (catHealth <= 0) {
                    gameOver();
                }
            }
        }

        // Update flash effect
        if (isFlashing && Date.now() - flashStartTime > flashDuration) {
            isFlashing = false;
        }

        // Check for game over condition
        if (catHealth <= 0) {
            gameOver();
        }

        // Update trick name display time
        if (Tricks.trickNameDisplayTime > 0) {
            Tricks.setTrickNameDisplayTime(Tricks.trickNameDisplayTime - deltaTime);
        }
    }

    function spawnObject() {
        const currentTime = Date.now();
        const minY = canvas.height * 0.25;
        const maxY = canvas.height - 50;
        const objectY = minY + Math.random() * (maxY - minY);
        
        // Ensure only one rat is on screen at a time
        const existingRats = gameObjects.filter(obj => obj.type === 'mouse');
        if (existingRats.length === 0 && currentTime - lastMouseSpawnTime > MOUSE_SPAWN_INTERVAL) {
            // Calculate initial direction towards cat
            const dx = (catX + catWidth / 2) - (canvas.width + MOUSE_WIDTH / 2);
            const dy = (catY + catHeight / 2) - objectY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Normalize the direction and set speed to 1.5x for aggressive movement
            const dirX = dx / distance;
            const dirY = dy / distance;
            const aggressiveSpeed = BASE_SPEED * 1.5; // 1.5x speed for aggression

            gameObjects.push({
                x: canvas.width,
                y: objectY,
                width: MOUSE_WIDTH,
                height: MOUSE_HEIGHT,
                type: 'mouse',
                speed: aggressiveSpeed,
                directionX: dirX,
                directionY: dirY,
                hasMimicked: false // New property to track if the rat has mimicked the cat
            });
            lastMouseSpawnTime = currentTime;
            return;
        }

        const canSpawnTrash = gameObjects.filter(obj => obj.type === 'trash').length < maxTrashItems 
            && Math.random() < (trashSpawnRate / (trashSpawnRate + COLLECTIBLE_SPAWN_RATE));

        if (canSpawnTrash) {
            const trashIndex = Math.floor(Math.random() * trashImages.length);
            const trashItem = trashImages[trashIndex];
            const scaleFactor = Math.random() * 0.3 + 0.5;
            const trashWidth = trashItem.width * scaleFactor;
            const trashHeight = trashItem.height * scaleFactor;
            gameObjects.push({
                x: canvas.width,
                y: objectY,
                width: trashWidth,
                height: trashHeight,
                type: 'trash',
                imageIndex: trashIndex,
                speed: BASE_SPEED + Math.random() * SPEED_VARIATION
            });
        } else {
            // Spawn a random collectible
            const collectible = COLLECTIBLES[Math.floor(Math.random() * COLLECTIBLES.length)];
            gameObjects.push({
                x: canvas.width,
                y: objectY,
                width: collectible.width,
                height: collectible.height,
                type: collectible.type,
                points: collectible.points,
                health: collectible.health,
                speed: BASE_SPEED + Math.random() * SPEED_VARIATION
            });
        }
    }

    // Modify the drawGameObjects function
    function drawGameObjects() {
        for (let obj of gameObjects) {
            // Skip drawing if the image isn't loaded yet
            if (obj.type === 'mouse' && (!mouseImage || !mouseImage.complete)) {
                continue;
            }
            if (obj.type === 'tuna' && (!tunaImage || !tunaImage.complete)) {
                continue;
            }
            if (obj.type === 'buffalo-fish' && (!buffaloFishImage || !buffaloFishImage.complete)) {
                continue;
            }
            if (obj.type === 'salmon' && (!salmonImage || !salmonImage.complete)) {
                continue;
            }
            if (obj.type === 'catnip' && (!catnipImage || !catnipImage.complete)) {
                continue;
            }

            try {
                // Comment out or remove the trash drawing logic
                // if (obj.type === 'trash' && loadedTrashImages[obj.imageIndex]) {
                //     ctx.save();
                //     ctx.drawImage(loadedTrashImages[obj.imageIndex], obj.x, obj.y, obj.width, obj.height);
                //     ctx.restore();
                // } else 
                if (obj.type === 'mouse' && mouseImage) {
                    ctx.drawImage(mouseImage, obj.x, obj.y, obj.width, obj.height);
                } else if (obj.type === 'tuna' && tunaImage) {
                    ctx.drawImage(tunaImage, obj.x, obj.y, obj.width, obj.height);
                } else if (obj.type === 'buffalo-fish' && buffaloFishImage) {
                    ctx.drawImage(buffaloFishImage, obj.x, obj.y, obj.width, obj.height);
                } else if (obj.type === 'salmon' && salmonImage) {
                    ctx.drawImage(salmonImage, obj.x, obj.y, obj.width, obj.height);
                } else if (obj.type === 'catnip' && catnipImage) {
                    ctx.drawImage(catnipImage, obj.x, obj.y, obj.width, obj.height);
                }
            } catch (error) {
                console.warn(`Failed to draw object of type ${obj.type}:`, error);
            }
        }
    }

    // Add this function to update the health bar
    function updateHealthBar() {
        const healthBarFill = document.getElementById('health-bar-fill');
        const healthText = document.getElementById('health-text');
        
        // Update health bar width
        const healthPercentage = (catHealth / maxCatHealth) * 100;
        healthBarFill.style.width = `${healthPercentage}%`;
        
        // Update health text to show only current health
        healthText.textContent = `${Math.round(catHealth)}`;
    }

    // Add this function to update the score display
    function updateScore() {
        console.log("Updating score..."); // Debug log
        const scoreContainer = document.getElementById('score-container');
        const scoreNumberElement = document.getElementById('score-number');
        console.log("Score elements:", scoreContainer, scoreNumberElement); // Debug log
        if (scoreContainer && scoreNumberElement) {
            scoreNumberElement.textContent = score;
            
            if (isFirstScoreUpdate) {
                scoreNumberElement.style.color = 'white';
                isFirstScoreUpdate = false;
            } else {
                // Get a random Hawaiian-inspired color
                const randomColor = getRandomHawaiianColor();
                scoreNumberElement.style.color = randomColor;
                
                // Trigger animation
                scoreContainer.classList.remove('animate');
                void scoreContainer.offsetWidth; // Trigger reflow
                scoreContainer.classList.add('animate');
            }
            
            console.log("Score updated: " + score); // Debug log
        } else {
            console.error("Score elements not found!"); // Debug log
            console.log("All elements with class 'game-text':", document.getElementsByClassName('game-text')); // Debug log
        }
    }

    function getRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `rgb(${r},${g},${b})`;
    }

    // Control cat movement
    const keys = {};
    window.addEventListener("keydown", (e) => {
        keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    // Adjust these values to fine-tune touch sensitivity
    const touchSensitivity = 0.15; // Increase this to make touch more sensitive
    const touchMaxSpeed = 15; // Maximum speed from touch input

    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart, false);
    canvas.addEventListener('touchmove', handleTouchMove, false);
    canvas.addEventListener('touchend', handleTouchEnd, false);

    function handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
    }

    function handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];

        let dx = touch.clientX - lastTouchX;
        let dy = touch.clientY - lastTouchY;

        // Apply sensitivity
        dx *= touchSensitivity;
        dy *= touchSensitivity;

        // Update cat velocity
        catVelocityX += dx;
        catVelocityY += dy;

        // Limit max speed
        const speed = Math.sqrt(catVelocityX * catVelocityX + catVelocityY * catVelocityY);
        if (speed > touchMaxSpeed) {
            const ratio = touchMaxSpeed / speed;
            catVelocityX *= ratio;
            catVelocityY *= ratio;
        }

        // Update cat facing direction
        if (Math.abs(dx) > Math.abs(dy)) {
            catFacingRight = dx > 0;
        }

        // Update last touch position
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
    }

    function handleTouchEnd(event) {
        event.preventDefault();
        // Gradually reduce velocity when touch ends
        catVelocityX *= 0.9;
        catVelocityY *= 0.9;
    }

    // Modify the handleInput function to work with both keyboard and touch
    function handleInput() {
        if (isGameRunning) {
            if (keys["ArrowUp"]) catVelocityY -= catAcceleration;
            if (keys["ArrowDown"]) catVelocityY += catAcceleration;
            if (keys["ArrowLeft"]) {
                catVelocityX -= catAcceleration;
                catFacingRight = false;
            }
            if (keys["ArrowRight"]) {
                catVelocityX += catAcceleration;
                catFacingRight = true;
            }

            // Limit max speed
            const speed = Math.sqrt(catVelocityX * catVelocityX + catVelocityY * catVelocityY);
            if (speed > catMaxSpeed) {
                const ratio = catMaxSpeed / speed;
                catVelocityX *= ratio;
                catVelocityY *= ratio;
            }
        }
    }

    // Add event listeners for start and stop buttons
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('stop-button').addEventListener('click', stopGame);

    // Add this event listener near the top of your file, or where you have other event listeners
    document.addEventListener('keydown', handleKeyDown);

    function handleKeyDown(event) {
        if (event.code === 'Space') {
            event.preventDefault(); // Prevent scrolling
            if (!isGameRunning) {
                startGame();
            } else if (!isGameOver) {
                handleTrick(); // Call handleTrick here
            }
        }
        
        // Keep your existing key handling for game controls here
        if (isGameRunning && !isGameOver) {
            switch(event.code) {
                case 'ArrowLeft':
                    leftPressed = true;
                    break;
                case 'ArrowRight':
                    rightPressed = true;
                    break;
                case 'ArrowUp':
                    upPressed = true;
                    break;
                case 'ArrowDown':
                    downPressed = true;
                    break;
            }
        }
    }

    // Make sure your startGame function looks like this:
    function startGame() {
        if (!isGameRunning && !isPaused) {
            isGameRunning = true;
            isGameOver = false;
            score = 0;
            catHealth = maxCatHealth;
            initializeCat();
            gameObjects = [];
            gameTime = 0;

            mediaPlayer.startWaveSound();
            mediaPlayer.startGameMusic();
            // mediaPlayer.playPizzaCatSound(); // Remove or comment out this line to stop playing the pizza-cat sound

            document.getElementById('start-button').style.display = 'none';
            document.getElementById('stop-button').style.display = 'inline-block';
            document.getElementById('start-screen-button').style.display = 'none'; // Hide the start screen button

            // Hide the "How to Play" button
            document.getElementById('how-to-play-button').style.display = 'none';

            if (!gameLoopRunning) {
                gameLoopRunning = true;
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }
        } else if (isPaused) {
            isPaused = false;
            isGameRunning = true;
            
            mediaPlayer.startWaveSound();
            mediaPlayer.startGameMusic();
        }
    }

    // And your stopGame function:
    function stopGame() {
        isPaused = true;
        isGameRunning = false;
        
        // Update UI
        document.getElementById('stop-button').style.display = 'none';
        document.getElementById('start-button').style.display = 'inline-block';
        
        // Pause sounds
        mediaPlayer.stopWaveSound();
        mediaPlayer.stopAllSounds();

        // Pause the background music
        if (mediaPlayer.currentAudio) {
            mediaPlayer.currentAudio.pause();
            mediaPlayer.isPlaying = false;
        }
        if (mediaPlayer.playPauseBtn) {
            mediaPlayer.playPauseBtn.textContent = '▶';
        }
    }

    // Initialize the game when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        initializeGame();

        // Hide instructions initially
        const instructionsContainer = document.getElementById('instructions-container');
        instructionsContainer.style.display = 'none';

        // Show instructions when "How to Play" is clicked
        document.getElementById('how-to-play-button').addEventListener('click', () => {
            instructionsContainer.style.display = 'block';
            setTimeout(() => {
                instructionsContainer.classList.add('show');
            }, 10);
        });

        // Close instructions
        document.getElementById('close-instructions').addEventListener('click', () => {
            instructionsContainer.classList.remove('show');
            setTimeout(() => {
                instructionsContainer.style.display = 'none';
            }, 500);
        });
    });

    // Function to resize canvas and adjust game elements
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        checkMobile();
        
        // Adjust cat position when resizing
        if (isMobile) {
            catY = Math.min(catY, canvas.height - canvas.height * 0.5); // Ensure cat doesn't go off-screen
        }
        
        // You might want to adjust other game element sizes here as well
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Call once to set initial size

    function drawSurfMoveEffect() {
        if (currentSurfMove) {
            ctx.save();
            ctx.font = '24px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(currentSurfMove.name, canvas.width / 2, 50);
            ctx.restore();
        }
    }

    // Add this debug function
    function debugGameObjects() {
        console.log('Current game objects:');
        console.log(gameObjects);
    }

    // Near the top of your file with other initializations
    const catMeowSound = new Audio('./assets/cat-meow-2.MP3');

    // Add this function to play the cat meow sound
    function playCatMeowSound() {
        catMeowSound.currentTime = 0; // Reset the audio to the beginning
        catMeowSound.play().catch(e => console.error("Error playing cat meow sound:", e));
    }

    // Modify the updateDifficulty function
    function updateDifficulty() {
        const difficultyProgress = Math.min(gameTime / TIME_TO_MAX_DIFFICULTY, 1);
        
        // Use easing function for spawn rates
        const spawnRateProgress = easeOutQuad(difficultyProgress);
        
        // Gradually increase maxTrashItems (linear progression)
        maxTrashItems = Math.floor(INITIAL_MAX_TRASH_ITEMS + (MAX_POSSIBLE_TRASH_ITEMS - INITIAL_MAX_TRASH_ITEMS) * difficultyProgress);
        
        // Gradually increase trashSpawnRate (with easing)
        trashSpawnRate = INITIAL_TRASH_SPAWN_RATE + (MAX_TRASH_SPAWN_RATE - INITIAL_TRASH_SPAWN_RATE) * spawnRateProgress;

        // Gradually increase fishSpawnRate (with easing, but slower than trash)
        fishSpawnRate = INITIAL_FISH_SPAWN_RATE + (MAX_FISH_SPAWN_RATE - INITIAL_FISH_SPAWN_RATE) * (spawnRateProgress * 0.5);

        // Gradually increase wave speed (with different easing)
        const speedProgress = easeInOutQuad(Math.min(gameTime / TIME_TO_MAX_SPEED, 1));
        waveSpeed = INITIAL_WAVE_SPEED + (MAX_WAVE_SPEED - INITIAL_WAVE_SPEED) * speedProgress;
    }

    // Add this easing function for a smoother speed increase
    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    // Add this easing function
    function easeOutQuad(t) {
        return t * (2 - t);
    }

    // Add this function to handle game over
    function gameOver() {
        isGameOver = true;
        isGameRunning = false;

        // Stop the wave sound
        mediaPlayer.stopWaveSound();

        // Remove any existing game over screen
        const existingScreen = document.getElementById('game-over-screen');
        if (existingScreen) {
            existingScreen.remove();
        }

        // Create and display game over message and input field
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        gameOverScreen.innerHTML = `
            <h2>Game Over</h2>
            <p>Your score: ${score}</p>
            <input type="text" id="player-name" placeholder="Enter your name" maxlength="20">
            <button id="submit-score">Submit Score</button>
        `;
        document.body.appendChild(gameOverScreen);

        // Get input field and add event listeners
        const inputField = document.getElementById('player-name');
        if (inputField) {
            // Focus on the input field
            inputField.focus();
            
            // Add keydown event listener for Enter key
            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default form submission
                    submitScore();
                }
            });
        }

        // Add event listener to the submit button
        const submitButton = document.getElementById('submit-score');
        if (submitButton) {
            submitButton.addEventListener('click', submitScore);
        }
    }

    let leaderboard = [];

    async function submitScore() {
        const playerNameInput = document.getElementById('player-name');
        const playerName = playerNameInput ? playerNameInput.value.trim() : '';
        
        if (playerName) {
            try {
                console.log("Attempting to save score...");
                // Add score to Firebase
                const docRef = await addDoc(collection(db, "scores"), {
                    name: playerName,
                    score: score,
                    timestamp: new Date().toISOString()
                });
                console.log("Score saved successfully with ID:", docRef.id);
                
                // Fetch and display updated leaderboard
                await showLeaderboard();
            } catch (error) {
                console.error("Error saving score:", error);
                // More detailed error message
                let errorMessage = "Error saving score: ";
                if (error.code === 'permission-denied') {
                    errorMessage += "Permission denied. Please check Firestore rules.";
                } else if (error.code === 'unavailable') {
                    errorMessage += "Service unavailable. Please check your internet connection.";
                } else {
                    errorMessage += error.message || "Unknown error";
                }
                alert(errorMessage);
            }
        } else {
            // Visual feedback if name is empty
            if (playerNameInput) {
                playerNameInput.style.borderColor = 'red';
                playerNameInput.placeholder = 'Name required!';
                setTimeout(() => {
                    playerNameInput.style.borderColor = '#FF8C42';
                    playerNameInput.placeholder = 'Enter your name';
                }, 1500);
            }
        }
    }

    async function showLeaderboard() {
        try {
            // Remove ANY existing leaderboard screens first
            const existingLeaderboards = document.querySelectorAll('#leaderboard-screen');
            existingLeaderboards.forEach(board => board.remove());

            // Remove game over screen if it exists
            const gameOverScreen = document.getElementById('game-over-screen');
            if (gameOverScreen) {
                gameOverScreen.remove();
            }

            // Create query to get top 10 scores
            const scoresQuery = query(
                collection(db, "scores"),
                orderBy("score", "desc"),
                limit(10)
            );

            // Get scores from Firebase
            const querySnapshot = await getDocs(scoresQuery);
            leaderboard = [];
            querySnapshot.forEach((doc) => {
                leaderboard.push(doc.data());
            });

            // Create and display the leaderboard
            const leaderboardScreen = document.createElement('div');
            leaderboardScreen.id = 'leaderboard-screen';
            leaderboardScreen.innerHTML = `
                <h2>TOP CATS</h2>
                <ul id="leaderboard-list"></ul>
                <button id="restart-game">Play Again</button>
            `;
            document.body.appendChild(leaderboardScreen);

            // Populate the leaderboard list
            const leaderboardList = document.getElementById('leaderboard-list');
            leaderboard.forEach((entry, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = `${index + 1}. ${entry.name}: ${entry.score}`;
                leaderboardList.appendChild(listItem);
            });

            // Add event listener to the restart button
            const restartButton = document.getElementById('restart-game');
            if (restartButton) {
                restartButton.addEventListener('click', restartGame, { once: true }); // Add once: true to prevent multiple listeners
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            alert("Error loading leaderboard. Please try again.");
        }
    }

    // Add this variable to track if the game loop is running
    let gameLoopRunning = false;

    // Add this event listener for keyup
    document.addEventListener('keyup', function(event) {
        switch(event.code) {
            case 'ArrowLeft':
                leftPressed = false;
                break;
            case 'ArrowRight':
                rightPressed = false;
                break;
            case 'ArrowUp':
                upPressed = false;
                break;
            case 'ArrowDown':
                downPressed = false;
                break;
        }
    });

    const TRICK_THRESHOLD = Tricks.calculateTrickThreshold(canvas);

    function handleTrick() {
        if (isTrickZoneActive && !isPaused) {
            console.log('Handling trick...'); // Debug log
            const scoreIncrease = performTrick(
                catY,
                catHeight,
                TRICK_THRESHOLD,
                isGameRunning,
                isGameOver,
                score,
                updateScore
            );
            
            if (scoreIncrease > 0) {
                console.log('Trick successful! Score increase:', scoreIncrease); // Debug log
                score += scoreIncrease;
                updateScore();
            } else {
                console.log('Trick failed or not possible.'); // Debug log
            }
        } else {
            console.log('Not in trick zone or game is paused.'); // Debug log
        }
    }

    // Audio elements
    let waveSoundAudio;

    // Load audio files
    function loadAudio() {
        waveSoundAudio = new Audio('./assets/surf-sound-1.MP3');
        waveSoundAudio.loop = true;
        waveSoundAudio.volume = 0.5; // Set volume to 50%, adjust as needed
        console.log("Attempting to load wave sound");
        
        waveSoundAudio.addEventListener('canplaythrough', () => {
            console.log("Wave sound loaded successfully");
        });
        
        waveSoundAudio.addEventListener('error', (e) => {
            console.error("Error loading wave sound:", e);
        });
    }

    // Call this function when the page loads
    window.addEventListener('load', loadAudio);

    // Modify the draw function to remove the halo effect
    function draw() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw game objects if game is running
        if (isGameRunning && !isGameOver) {
            drawGameObjects();
            drawSurfMoveEffect();
        }

        // Draw the trick zone if cat is in it
        if (catY + catHeight < TRICK_THRESHOLD) {
            Tricks.drawTrickZone(ctx, canvas);
        }

        // Draw the cat (always on top)
        if (catImage.complete) {
            drawCat();
        }

        // Draw catnip mode effects
        if (isCatnipMode) {
            drawCatnipOverlay();
        }

        // Draw flash overlay if active
        if (isFlashing) {
            ctx.save();
            if (isSpectrumFlash) {
                const progress = (Date.now() - flashStartTime) / flashDuration;
                const colorPosition = progress * (HAWAIIAN_COLORS.length - 1);
                const index1 = Math.floor(colorPosition);
                const index2 = Math.min(HAWAIIAN_COLORS.length - 1, index1 + 1);
                const lerpAmount = colorPosition - index1;
                
                if (index1 < HAWAIIAN_COLORS.length) {
                    const color1 = HAWAIIAN_COLORS[index1];
                    const color2 = HAWAIIAN_COLORS[index2];
                    flashColor = lerpColors(color1, color2, lerpAmount);
                }
            }
            ctx.globalAlpha = flashAlpha * (1 - (Date.now() - flashStartTime) / flashDuration);
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            
            if (Date.now() - flashStartTime > flashDuration) {
                isFlashing = false;
                isSpectrumFlash = false;
            }
        }

        // Draw pause overlay if game is paused
        if (isPaused) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    function drawDebugInfo() {
        if (!DEBUG_MODE) return; // Exit early if debug mode is off
        
        ctx.font = '14px Silkscreen';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        
        // Calculate total speed (magnitude of velocity vector)
        const totalSpeed = Math.sqrt(catVelocityX * catVelocityX + catVelocityY * catVelocityY);
        
        const debugInfo = [
            `Cat Y: ${Math.round(catY)}`,
            `Cat Bottom: ${Math.round(catY + catHeight)}`,
            `Trick Threshold: ${Math.round(TRICK_THRESHOLD)}`,
            `In Trick Zone: ${catY + catHeight < TRICK_THRESHOLD}`,
            `Trick Active: ${Tricks.isTrickActive}`,
            `Current Trick: ${Tricks.currentTrickName}`,
            `Trick Timer: ${Math.round(Tricks.trickTimer)}`,
            `Speed: ${totalSpeed.toFixed(2)}`,
            `Velocity X: ${catVelocityX.toFixed(2)}`,
            `Velocity Y: ${catVelocityY.toFixed(2)}`
        ];
        
        debugInfo.forEach((text, index) => {
            ctx.fillText(text, 10, canvas.height - (debugInfo.length - index) * 20);
        });
    }

    let isFlashing = false;
    let flashStartTime = 0;
    const flashDuration = 800; // Increased from 200 to 800 milliseconds
    let flashColor = 'red'; // Default flash color
    let flashAlpha = 0.3; // Default flash opacity

    function drawFlashOverlay() {
        if (isFlashing) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.35)'; // Red with 35% opacity
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    function restartGame() {
        // Remove leaderboard screen
        const leaderboardScreen = document.getElementById('leaderboard-screen');
        if (leaderboardScreen) {
            leaderboardScreen.remove();
        }

        // Reset game state
        isGameOver = false;
        isGameRunning = true;
        catHealth = maxCatHealth;
        score = 0;
        updateScore();
        updateHealthBar();

        // Reset other game variables
        gameObjects = [];
        
        // Restart the game loop if it's not running
        if (!gameLoopRunning) {
            gameLoopRunning = true;
            requestAnimationFrame(gameLoop);
        }
    }

    function drawInitialState() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the cat at its starting position
        drawCat();

        // Update the health bar (using CSS version)
        updateHealthBar();

        // Any other initial game elements you want to draw
    }

    function drawBackground() {
        // Remove the blue background fill
        // The wave.gif will show through from the CSS background
    }

    document.fonts.ready.then(() => {
        // Initialize your game here, or redraw if it's already initialized
        updateHealthBar();
    });

    // Add this function to visualize the trick zone (for debugging)
    function drawTrickZone() {
        if (!DEBUG_MODE) return; // Exit early if debug mode is off
        
        ctx.save();
        // Draw a semi-transparent zone
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, TRICK_THRESHOLD);
        
        // Draw a line at the threshold
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, TRICK_THRESHOLD);
        ctx.lineTo(canvas.width, TRICK_THRESHOLD);
        ctx.stroke();
        
        // Debug text
        if (catY + catHeight < TRICK_THRESHOLD) {
            ctx.fillStyle = 'lime';
            ctx.font = '20px Silkscreen';
            ctx.fillText('TRICK ZONE!', 10, TRICK_THRESHOLD - 10);
        }
        ctx.restore();
    }

    // Add this with your other event listeners
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space') {
            event.preventDefault();
            if (isTrickZoneActive && !isPaused) {
                handleTrick();
            }
        }
    });

    // Add these constants for mouse behavior
    const MOUSE_WIDTH = 120;  // Increased from 80 to 120
    const MOUSE_HEIGHT = 120; // Increased from 80 to 120
    const MOUSE_SPEED = 200;  // Keep the same speed
    const MOUSE_DAMAGE = 15;
    const MOUSE_SPAWN_INTERVAL = 5000; // Spawn a mouse every 5 seconds
    let lastMouseSpawnTime = 0;

    // Add this with the other image loading code (around line 55)
    mouseImage.onload = imageLoaded;
    mouseImage.src = './assets/mouse.png';

    // Add these constants for the Hawaiian spectrum flash
    const HAWAIIAN_COLORS = [
        '#FF6B6B', // Coral
        '#4ECDC4', // Turquoise
        '#FFD93D', // Yellow
        '#FF8C42', // Orange
        '#98D9C2', // Mint
        '#E84855', // Red
        '#7AE7C7'  // Seafoam
    ];
    let colorIndex = 0;
    let isSpectrumFlash = false;

    // Add this helper function for color interpolation
    function lerpColors(color1, color2, amount) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * amount);
        const g = Math.round(g1 + (g2 - g1) * amount);
        const b = Math.round(b1 + (b2 - b1) * amount);
        
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }

    // Add this constant for collectible spawn rate
    const COLLECTIBLE_SPAWN_RATE = 0.02; // Increased from 0.015

    // Update the image loading section
    tunaImage.onload = imageLoaded;
    tunaImage.src = './assets/tuna.png';

    buffaloFishImage.onload = imageLoaded;
    buffaloFishImage.src = './assets/buffalo-fish.png';

    salmonImage.onload = imageLoaded;
    salmonImage.src = './assets/salmon.png';

    catnipImage.onload = imageLoaded;
    catnipImage.src = './assets/catnip.png';

    // Add error handlers for the new images
    tunaImage.onerror = function() {
        console.error('Failed to load tuna image');
        imageLoaded(); // Still call imageLoaded to avoid blocking the game
    };

    buffaloFishImage.onerror = function() {
        console.error('Failed to load buffalo fish image');
        imageLoaded();
    };

    salmonImage.onerror = function() {
        console.error('Failed to load salmon image');
        imageLoaded();
    };

    catnipImage.onerror = function() {
        console.error('Failed to load catnip image');
        imageLoaded();
    };

    // Add this near your other event listeners
    function setupTrickButton() {
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('trick-button')) {
                console.log('Trick button clicked!'); // Debug log
                handleTrick();
            }
        });
    }

    let isCatnipMode = false;
    let catnipModeStartTime = 0;
    const CATNIP_MODE_DURATION = 9000; // 9 seconds

    // Function to start catnip mode
    function startCatnipMode() {
        isCatnipMode = true;
        catnipModeStartTime = Date.now();
        catMaxSpeed *= 1.5; // Speed boost

        // Switch to sunny cat image
        catImage = catSunnyImage;

        // Start catnip music
        mediaPlayer.startCatnipMusic();

        // Set a timeout to end catnip mode after 9 seconds
        setTimeout(endCatnipMode, CATNIP_MODE_DURATION);
    }

    // Function to end catnip mode
    function endCatnipMode() {
        isCatnipMode = false;
        catMaxSpeed /= 1.5; // Reset speed

        // Revert to default cat image
        catImage = new Image();
        catImage.src = './assets/pizza-cat.png';

        // Stop catnip music and resume normal music
        mediaPlayer.stopCatnipMusic();
    }

    // Function to draw a spinning halo around the cat
    function drawCatnipHalo() {
        ctx.save();
        ctx.translate(catX + catWidth / 2, catY + catHeight / 2);
        ctx.rotate((Date.now() - catnipModeStartTime) / 1000); // Rotate over time
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // Yellow halo
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, catWidth / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Function to draw a multi-color overlay
    function drawCatnipOverlay() {
        ctx.save();
        ctx.globalAlpha = 0.3; // Adjust opacity
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.2, '#FFD93D');
        gradient.addColorStop(0.4, '#6BCB77');
        gradient.addColorStop(0.6, '#4D96FF');
        gradient.addColorStop(0.8, '#9B5DE5');
        gradient.addColorStop(1, '#FF6B6B');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    document.getElementById('close-instructions').addEventListener('click', () => {
        const instructionsContainer = document.getElementById('instructions-container');
        instructionsContainer.classList.remove('show');
        instructionsContainer.classList.add('hide'); // Add hide class for smooth transition
        setTimeout(() => {
            instructionsContainer.style.display = 'none';
            instructionsContainer.classList.remove('hide'); // Remove hide class after transition
        }, 500);
    });

    document.getElementById('how-to-play-button').addEventListener('click', () => {
        const instructionsContainer = document.getElementById('instructions-container');
        instructionsContainer.style.display = 'block';
        setTimeout(() => {
            instructionsContainer.classList.add('show');
        }, 10); // Slight delay to trigger transition
    });

    function showInstructions() {
        const instructionsContainer = document.getElementById('instructions-container');
        const gameContainer = document.getElementById('game-container');

        gameContainer.classList.add('blur'); // Add blur effect
        instructionsContainer.style.display = 'block';
        setTimeout(() => {
            instructionsContainer.classList.add('show');
        }, 10);
    }

    function hideInstructions() {
        const instructionsContainer = document.getElementById('instructions-container');
        const gameContainer = document.getElementById('game-container');

        instructionsContainer.classList.remove('show');
        instructionsContainer.classList.add('hide'); // Add hide class for smooth transition
        setTimeout(() => {
            instructionsContainer.style.display = 'none';
            instructionsContainer.classList.remove('hide'); // Remove hide class after transition
            gameContainer.classList.remove('blur'); // Remove blur effect
        }, 500);
    }

    document.getElementById('how-to-play-button').addEventListener('click', showInstructions);
    document.getElementById('close-instructions').addEventListener('click', hideInstructions);
})();
