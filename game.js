import * as Tricks from './tricks.js';
import { mediaPlayer } from './mediaPlayer.js';

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
    const catMaxSpeed = 12; // Decreased from 20 to 12
    const catAcceleration = 0.9; // Decreased from 1.2 to 0.9
    const catDeceleration = 0.95; // Decreased from 0.97 to 0.95 for more friction
    let waveSpeed = 100; // Adjust this value to set the base speed of objects
    let isGameRunning = false;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load images
    let fishImage = new Image();
    let catImage = new Image();
    let loadedTrashImages = [];
    let mouseImage = new Image();

    let imagesLoaded = 0;
    const totalImages = 3;

    let catHealth = 100; // New variable for cat's health
    const maxCatHealth = 100; // Maximum cat health

    // Add this to your existing array of images to load
    const trashImages = [
        { src: './assets/trash-can.png', width: 60, height: 80 },    // Doubled from 30x40
        { src: './assets/trash-bottle.png', width: 40, height: 80 }, // Doubled from 20x40
        { src: './assets/trash-bag.png', width: 70, height: 70 },    // Doubled from 35x35
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
    catImage.onload = imageLoaded;
    catImage.src = './assets/pizza-cat.png'; // Make sure this path is correct

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
    const MAX_TRASH_SPAWN_RATE = 0.035;
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
    let catWidth, catHeight;
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

    function initializeGame() {
        // Initialize game state
        isGameRunning = false;
        score = 0;
        catHealth = maxCatHealth;
        isFirstScoreUpdate = true; // Reset this flag when initializing the game
        updateScore();
        updateHealthBar(); // Update the CSS health bar
        
        // Initialize cat position
        initializeCat();
        
        // Show start button initially
        document.getElementById('start-button').style.display = 'inline-block';
        document.getElementById('stop-button').style.display = 'none';

        // Draw initial game state
        drawInitialState();

        // Start the game loop
        requestAnimationFrame(gameLoop);

        gameTime = 0;
        maxTrashItems = INITIAL_MAX_TRASH_ITEMS;
        trashSpawnRate = INITIAL_TRASH_SPAWN_RATE;
        fishSpawnRate = INITIAL_FISH_SPAWN_RATE;
        waveSpeed = INITIAL_WAVE_SPEED;
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
        if (deltaTime < 0.1) {
            update(deltaTime);
            draw(); // Make sure we're calling draw every frame
        }
        
        if (isGameRunning || isGameOver) {
            requestAnimationFrame(gameLoop);
        } else {
            gameLoopRunning = false;
        }
    }

    function update(deltaTime) {
        if (isGameOver || !isGameRunning) return;

        updateCatPosition();
        
        // Update trick timer and display time
        if (Tricks.isTrickActive) {
            Tricks.setTrickTimer(Tricks.trickTimer - deltaTime * 1000);
            if (Tricks.trickTimer <= 0) {
                Tricks.setTrickActive(false);
                Tricks.setTrickAnimationActive(false);
            }
        }

        // Update trick name display timer
        if (Tricks.trickNameDisplayTime > 0) {
            Tricks.setTrickNameDisplayTime(Tricks.trickNameDisplayTime - deltaTime * 1000);
        }

        if (!isGameOver) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawCat();
            updateGameObjects(deltaTime);
            drawGameObjects();
            updateHealthBar();
            drawSurfMoveEffect();
        }
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
        isTouching = true;
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);

        // Detect double tap for trick
        const currentTime = Date.now();
        if (currentTime - lastTapTime < 300) { // 300ms between taps
            performTrick();
        }
        lastTapTime = currentTime;
    }

    // Add these variables at the top of your file
    let targetX = 0;
    let targetY = 0;
    const RESISTANCE = 0.1; // Adjust this value to change the level of resistance (0.1 = 10% movement towards target per frame)

    function updateCatPosition() {
        // Update cat velocity based on key presses
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

        // Update cat position
        catX += catVelocityX;
        catY += catVelocityY;

        // Apply deceleration
        catVelocityX *= catDeceleration;
        catVelocityY *= catDeceleration;

        // Keep the cat within the canvas bounds
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
        ctx.save(); // Save the current state of the context
        
        // Move to cat's center for rotation
        ctx.translate(catX + catWidth/2, catY + catHeight/2);
        
        // Apply trick rotation if active
        if (Tricks.trickAnimationActive) {
            const trickProgress = (Date.now() - Tricks.trickStartTime) / Tricks.TRICK_DURATION;
            if (trickProgress <= 1) {
                ctx.rotate(Math.PI * 2 * trickProgress); // Full 360-degree rotation
            } else {
                // Reset trick animation when complete
                Tricks.setTrickAnimationActive(false);
            }
        }
        
        // Draw the cat image
        if (!catFacingRight) {
            // If cat is facing left, flip the image horizontally
            ctx.scale(-1, 1);
            ctx.drawImage(catImage, -catWidth/2, -catHeight/2, catWidth, catHeight);
        } else {
            ctx.drawImage(catImage, -catWidth/2, -catHeight/2, catWidth, catHeight);
        }
        
        ctx.restore(); // Restore the context state
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

    // Modify the updateGameObjects function
    function updateGameObjects(deltaTime) {
        const currentTime = Date.now();
        
        // Spawn new objects
        if (Math.random() < trashSpawnRate + fishSpawnRate) {
            spawnObject();
        }
        
        for (let i = gameObjects.length - 1; i >= 0; i--) {
            const obj = gameObjects[i];
            
            // Special movement for mouse
            if (obj.type === 'mouse') {
                // Move in the initial direction set at spawn
                obj.x += obj.directionX * obj.speed * deltaTime;
                obj.y += obj.directionY * obj.speed * deltaTime;
                
                // Add slight sine wave to vertical movement for more interesting pattern
                obj.y += Math.sin(currentTime / 500) * deltaTime * 50;
            } else {
                // Existing movement for other objects
                obj.x -= obj.speed * deltaTime;
            }

            // Remove objects that are off-screen
            if (obj.x + obj.width < 0) {
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

            if (distanceX < (catWidth + obj.width) / 2 * 0.8 &&
                distanceY < (catHeight + obj.height) / 2 * 0.8) {
                if (obj.type === 'mouse') {
                    gameObjects.splice(i, 1);
                    catHealth = Math.max(0, catHealth - MOUSE_DAMAGE);
                    updateHealthBar();
                    playCatMeowSound();
                    isFlashing = true;
                    isSpectrumFlash = false;  // Make sure it's not a spectrum flash
                    flashColor = 'red';
                    flashAlpha = 0.3;
                    flashStartTime = Date.now();
                } else if (obj.type === 'fish') {
                    gameObjects.splice(i, 1);
                    score += 10;
                    catHealth = Math.min(maxCatHealth, catHealth + 10);
                    updateScore();
                    updateHealthBar();
                    playNextFishCatchSound();
                    isFlashing = true;
                    isSpectrumFlash = true;  // Only fish gets spectrum flash
                    flashAlpha = 0.2;
                    flashStartTime = Date.now();
                    colorIndex = 0;
                } else if (obj.type === 'trash') {
                    gameObjects.splice(i, 1);
                    catHealth = Math.max(0, catHealth - 20);
                    updateHealthBar();
                    playCatMeowSound();
                    isFlashing = true;
                    isSpectrumFlash = false;  // Make sure it's not a spectrum flash
                    flashColor = 'red';
                    flashAlpha = 0.3;
                    flashStartTime = Date.now();
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
        
        // Check if it's time to spawn a mouse
        if (currentTime - lastMouseSpawnTime > MOUSE_SPAWN_INTERVAL) {
            // Calculate initial direction towards cat
            const dx = (catX + catWidth/2) - (canvas.width + MOUSE_WIDTH/2);
            const dy = (catY + catHeight/2) - objectY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize the direction
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            gameObjects.push({
                x: canvas.width,
                y: objectY,
                width: MOUSE_WIDTH,
                height: MOUSE_HEIGHT,
                type: 'mouse',
                speed: MOUSE_SPEED,
                directionX: dirX,
                directionY: dirY
            });
            lastMouseSpawnTime = currentTime;
            return;
        }

        const canSpawnTrash = gameObjects.filter(obj => obj.type === 'trash').length < maxTrashItems 
            && Math.random() < trashSpawnRate / (trashSpawnRate + fishSpawnRate);

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
                speed: 300 + Math.random() * 100 // Increased from 100 to 300
            });
        } else {
            const fishSize = Math.random() * 40 + 20;
            gameObjects.push({
                x: canvas.width,
                y: objectY,
                width: fishSize,
                height: fishSize,
                type: 'fish',
                speed: 400 + Math.random() * 150 // Increased from 150 to 400
            });
        }
    }

    // Modify the drawGameObjects function
    function drawGameObjects() {
        for (let obj of gameObjects) {
            if (obj.type === 'fish' && fishImage.complete) {
                ctx.drawImage(fishImage, obj.x, obj.y, obj.width, obj.height);
            } else if (obj.type === 'trash' && loadedTrashImages[obj.imageIndex] && loadedTrashImages[obj.imageIndex].complete) {
                ctx.drawImage(loadedTrashImages[obj.imageIndex], obj.x, obj.y, obj.width, obj.height);
            } else if (obj.type === 'mouse' && mouseImage.complete) {
                // Draw mouse without any transformation
                ctx.drawImage(mouseImage, obj.x, obj.y, obj.width, obj.height);
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
        if (!isGameRunning) {
            isGameRunning = true;
            isGameOver = false;
            // Reset game state, score, cat position, etc.
            score = 0;
            catHealth = maxCatHealth;
            initializeCat();
            gameObjects = [];
            gameTime = 0;

            // Start both wave sound and music
            if (waveSoundAudio) {
                waveSoundAudio.currentTime = 0;
                waveSoundAudio.play().catch(error => console.error("Audio play failed:", error));
            }
            
            // Start the background music
            mediaPlayer.startGameMusic();

            // Hide start button and show stop button
            document.getElementById('start-button').style.display = 'none';
            document.getElementById('stop-button').style.display = 'inline-block';

            // Start the game loop if it's not already running
            if (!gameLoopRunning) {
                gameLoopRunning = true;
                requestAnimationFrame(gameLoop);
            }
        }
    }

    // And your stopGame function:
    function stopGame() {
        isGameRunning = false;
        // Hide stop button and show start button
        document.getElementById('stop-button').style.display = 'none';
        document.getElementById('start-button').style.display = 'inline-block';
        
        // Pause both wave sound and music
        if (waveSoundAudio) {
            waveSoundAudio.pause();
        }
        
        // Pause the background music
        mediaPlayer.currentAudio.pause();
        mediaPlayer.isPlaying = false;
        mediaPlayer.playPauseBtn.textContent = '▶';

        // Any other cleanup or state reset you need to do when stopping the game
    }

    // Initialize the game when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        initializeGame();
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
        if (waveSoundAudio) {
            waveSoundAudio.pause();
        }

        // Display game over message and input field
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        gameOverScreen.innerHTML = `
            <h2>Game Over</h2>
            <p>Your score: ${score}</p>
            <input type="text" id="player-name" placeholder="Enter your name">
            <button id="submit-score">Submit Score</button>
        `;
        document.body.appendChild(gameOverScreen);

        // Focus on the input field
        setTimeout(() => {
            const inputField = document.getElementById('player-name');
            if (inputField) {
                inputField.focus();
            }
        }, 0);

        // Add event listener to the submit button
        document.getElementById('submit-score').addEventListener('click', submitScore);
    }

    let leaderboard = [];

    function submitScore() {
        const playerName = document.getElementById('player-name').value;
        if (playerName) {
            // Add the new score to the leaderboard
            leaderboard.push({ name: playerName, score: score });
            
            // Sort the leaderboard
            leaderboard.sort((a, b) => b.score - a.score);
            
            // Keep only the top 10 scores
            leaderboard = leaderboard.slice(0, 10);
            
            // Show the leaderboard
            showLeaderboard();
        } else {
            alert('Please enter your name before submitting.');
        }
    }

    function showLeaderboard() {
        // Remove the game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.remove();
        }

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
        document.getElementById('restart-game').addEventListener('click', restartGame);
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
        const scoreIncrease = Tricks.performTrick(
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

    function draw() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw trick zone
        drawTrickZone();

        // Draw game objects
        drawGameObjects();

        // Draw cat
        drawCat();

        // Draw flash overlay LAST to ensure it's on top
        if (isFlashing) {
            ctx.save();
            if (isSpectrumFlash) {
                // Calculate progress through the flash duration
                const progress = (Date.now() - flashStartTime) / flashDuration;
                // Use a smoother color transition by using decimal index
                const colorPosition = progress * (HAWAIIAN_COLORS.length - 1);
                const index1 = Math.floor(colorPosition);
                const index2 = Math.min(HAWAIIAN_COLORS.length - 1, index1 + 1);
                const lerpAmount = colorPosition - index1;
                
                // Interpolate between colors for smoother transition
                if (index1 < HAWAIIAN_COLORS.length) {
                    const color1 = HAWAIIAN_COLORS[index1];
                    const color2 = HAWAIIAN_COLORS[index2];
                    flashColor = lerpColors(color1, color2, lerpAmount);
                }
            }
            ctx.globalAlpha = flashAlpha * (1 - (Date.now() - flashStartTime) / flashDuration); // Fade out
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            
            // Check if flash duration is over
            if (Date.now() - flashStartTime > flashDuration) {
                isFlashing = false;
                isSpectrumFlash = false;
            }
        }

        // Draw debug info
        drawDebugInfo();
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
        // Remove the leaderboard screen
        const leaderboardScreen = document.getElementById('leaderboard-screen');
        if (leaderboardScreen) {
            leaderboardScreen.remove();
        }

        // Reset game state
        isGameOver = false;
        isGameRunning = true;
        catHealth = 100;
        score = 0;

        // Reset other game variables
        gameObjects = []; // Clear all game objects
        
        // Restart the game loop
        requestAnimationFrame(gameLoop);
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
            handleTrick();
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
})();
