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
    const catMaxSpeed = 10;
    const catAcceleration = 0.5;
    const catDeceleration = 0.9;
    let waveSpeed = 2;
    let isGameRunning = false;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load images
    let fishImage = new Image();
    let catImage = new Image();
    let loadedTrashImages = [];

    let imagesLoaded = 0;
    const totalImages = 2;

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

    function initializeGame() {
        // Initialize game state
        isGameRunning = false;
        score = 0;
        catHealth = maxCatHealth;
        isFirstScoreUpdate = true; // Reset this flag when initializing the game
        updateScore();
        updateHealthBar(); // Draw the initial health bar
        
        // Initialize cat position
        catY = (canvas.height - canvas.height * 0.2) / 2;
        catX = canvas.width / 4; // Start cat at 1/4 of the canvas width
        
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCat();
    }

    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000; // Convert to seconds
        lastTime = timestamp;

        handleInput();
        if (isGameRunning) {
            update(deltaTime);
        } else {
            drawInitialState();
        }
        requestAnimationFrame(gameLoop);
    }

    function update(deltaTime) {
        updateCatPosition();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCat();
        updateGameObjects(deltaTime);
        drawGameObjects();
        drawHealthBar(); // Always draw the health bar
        drawSurfMoveEffect();
        debugGameObjects(); // Add this line for debugging
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

    function updateCatPosition() {
        // Apply velocity to position
        catX += catVelocityX;
        catY += catVelocityY;

        // Apply deceleration
        catVelocityX *= 0.95;
        catVelocityY *= 0.95;

        // Constrain cat within canvas
        const catWidth = isMobile ? canvas.width * 0.4 : canvas.width * 0.15;
        const catHeight = isMobile ? canvas.height * 0.5 : canvas.height * 0.3;
        catX = Math.max(0, Math.min(canvas.width - catWidth, catX));
        catY = Math.max(0, Math.min(canvas.height - catHeight, catY));

        // Check if cat is in the top 1/4 of the screen
        if (catY < canvas.height * 0.25) {
            if (!currentSurfMove) {
                startSurfMove();
            } else {
                updateSurfMove();
            }
        } else if (currentSurfMove) {
            endSurfMove();
        }
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

    // Modify the drawCat function
    function drawCat() {
        let maxCatWidth, maxCatHeight;

        if (isMobile) {
            maxCatWidth = canvas.width * 0.4;  // 40% of canvas width on mobile
            maxCatHeight = canvas.height * 0.5;  // 50% of canvas height on mobile
        } else {
            maxCatWidth = canvas.width * 0.15;  // 15% of canvas width on desktop
            maxCatHeight = canvas.height * 0.3;  // 30% of canvas height on desktop
        }
        
        let catWidth = maxCatWidth;
        let catHeight = catWidth * (catImage.height / catImage.width);
        
        if (catHeight > maxCatHeight) {
            catHeight = maxCatHeight;
            catWidth = catHeight * (catImage.width / catImage.height);
        }
        
        ctx.save();

        ctx.translate(catX + catWidth / 2, catY + catHeight / 2);

        if (!catFacingRight) {
            ctx.scale(-1, 1);
        }

        // Apply surf move animations
        if (currentSurfMove) {
            const scale = 1 + (currentSurfMove.scale - 1) * Math.sin(surfMoveProgress * Math.PI);
            const rotation = currentSurfMove.rotation * Math.sin(surfMoveProgress * Math.PI);

            ctx.rotate(rotation);
            ctx.scale(scale, scale);
        }

        ctx.translate(-catWidth / 2, -catHeight / 2);
        ctx.drawImage(catImage, 0, 0, catWidth, catHeight);

        ctx.restore();
    }

    // Add this near the top of your script with other initializations
    const fishCatchSounds = [
        document.getElementById('fishCatchSound1'),
        document.getElementById('fishCatchSound2'),
        document.getElementById('fishCatchSound3')
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
        // Update game time and difficulty
        gameTime += deltaTime;
        updateDifficulty();

        // Spawn new objects
        if (Math.random() < trashSpawnRate + fishSpawnRate) {
            const minY = canvas.height * 0.25;
            const maxY = canvas.height - 50;
            const objectY = minY + Math.random() * (maxY - minY);
            
            const currentTrashCount = gameObjects.filter(obj => obj.type === 'trash').length;
            const spawnTrash = Math.random() < trashSpawnRate / (trashSpawnRate + fishSpawnRate) && currentTrashCount < maxTrashItems;

            if (spawnTrash) {
                // Spawn trash (code remains the same)
                const trashIndex = Math.floor(Math.random() * trashImages.length);
                const trashItem = trashImages[trashIndex];
                const scaleFactor = Math.random() * 0.5 + 0.75;
                const speedFactor = 1 + (Math.random() * 2 - 1) * TRASH_SPEED_VARIATION;
                gameObjects.push({
                    x: canvas.width,
                    y: objectY,
                    width: trashItem.width * scaleFactor,
                    height: trashItem.height * scaleFactor,
                    type: 'trash',
                    imageIndex: trashIndex,
                    speed: waveSpeed * speedFactor
                });
            } else {
                // Spawn a fish
                const fishSize = isMobile ? Math.random() * 60 + 30 : Math.random() * 40 + 20;
                gameObjects.push({
                    x: canvas.width,
                    y: objectY,
                    width: fishSize,
                    height: fishSize,
                    type: 'fish',
                    speed: waveSpeed
                });
            }
        }

        let catWidth, catHeight;
        if (isMobile) {
            catWidth = canvas.width * 0.4;
            catHeight = canvas.height * 0.5;
        } else {
            catWidth = canvas.width * 0.15;
            catHeight = canvas.height * 0.3;
        }

        // Adjust catHeight to maintain aspect ratio
        if (catWidth * (catImage.height / catImage.width) < catHeight) {
            catHeight = catWidth * (catImage.height / catImage.width);
        } else {
            catWidth = catHeight * (catImage.width / catImage.height);
        }

        // Update object positions and check for collisions
        for (let i = gameObjects.length - 1; i >= 0; i--) {
            const obj = gameObjects[i];
            obj.x -= obj.speed; // Use object's individual speed

            // Remove objects that are off-screen
            if (obj.x + obj.width < 0) {
                gameObjects.splice(i, 1);
                continue;
            }

            // Check for collision with cat
            if (obj.x < catX + catWidth && obj.x + obj.width > catX &&
                obj.y < catY + catHeight && obj.y + obj.height > catY) {
                if (obj.type === 'fish') {
                    gameObjects.splice(i, 1);
                    score += 10;
                    updateScore();
                    // Remove this line: waveSpeed += 0.1;
                    playNextFishCatchSound();
                } else if (obj.type === 'trash') {
                    gameObjects.splice(i, 1);
                    catHealth = Math.max(0, catHealth - 20);
                    updateHealthBar();
                    playCatMeowSound();
                }
            }
        }
    }

    // Modify the drawGameObjects function
    function drawGameObjects() {
        for (let obj of gameObjects) {
            if (obj.type === 'fish' && fishImage.complete) {
                ctx.drawImage(fishImage, obj.x, obj.y, obj.width, obj.height);
            } else if (obj.type === 'trash' && loadedTrashImages[obj.imageIndex] && loadedTrashImages[obj.imageIndex].complete) {
                ctx.drawImage(loadedTrashImages[obj.imageIndex], obj.x, obj.y, obj.width, obj.height);
            }
        }
    }

    // Modify the drawHealthBar function
    function drawHealthBar() {
        const barWidth = 200;
        const barHeight = 20;
        const x = (canvas.width - barWidth) / 2; // Center horizontally
        const y = 20; // 20 pixels from the top

        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw health
        const healthWidth = (catHealth / maxCatHealth) * barWidth;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(x, y, healthWidth, barHeight);

        // Draw border
        ctx.strokeStyle = 'white';
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Draw text
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Health: ${catHealth}`, x + barWidth / 2, y + 15);
    }

    // Add this function to update the health bar
    function updateHealthBar() {
        drawHealthBar(); // Simply redraw the health bar
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

    function startGame() {
        if (!isGameRunning) {
            isGameRunning = true;
            score = 0;
            catHealth = maxCatHealth;
            isFirstScoreUpdate = true;
            updateScore();
            updateHealthBar(); // Update the health bar when starting the game
            // Hide start button and show stop button
            document.getElementById('start-button').style.display = 'none';
            document.getElementById('stop-button').style.display = 'inline-block';
            
            // Start the background wave sound
            startBackgroundWaveSound();
        }
    }
    

    function stopGame() {
        if (isGameRunning) {
            isGameRunning = false;
            // Hide stop button and show start button
            document.getElementById('stop-button').style.display = 'none';
            document.getElementById('start-button').style.display = 'inline-block';
            
            // Stop the background wave sound
            stopBackgroundWaveSound();
        }
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

    // Add this event listener near the top of your file
    window.addEventListener('keydown', handleKeyPress);

    // Add this function to handle key presses
    function handleKeyPress(event) {
        if (event.code === 'Space') {
            event.preventDefault(); // Prevent scrolling when space is pressed
            if (isGameRunning) {
                stopGame();
            } else {
                startGame();
            }
        }
    }

    // Add this debug function
    function debugGameObjects() {
        console.log('Current game objects:');
        console.log(gameObjects);
    }

    // Near the top of your file with other initializations
    const catMeowSound = new Audio('./assets/cat-meow-2.mp3');

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

    // ... rest of your game code ...
})();