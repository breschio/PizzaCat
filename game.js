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
    let fishArray = [];
    let isGameRunning = false;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load images
    const catImage = new Image();
    const fishImage = new Image();

    let imagesLoaded = 0;
    const totalImages = 2;

    function imageLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            initializeGame();
        }
    }

    catImage.onload = imageLoaded;
    fishImage.onload = imageLoaded;

    catImage.src = "./assets/pizza-cat.png";
    fishImage.src = "./assets/buffalo-fish.png";

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

    function initializeGame() {
        // Initialize game state
        isGameRunning = false;
        score = 0;
        isFirstScoreUpdate = true; // Reset this flag when initializing the game
        updateScore();
        
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
    }

    function drawInitialState() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCat();
    }

    function gameLoop(timestamp) {
        handleInput();
        if (isGameRunning) {
            update();
        } else {
            drawInitialState();
        }
        requestAnimationFrame(gameLoop);
    }

    function update() {
        updateCatPosition();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCat();
        updateFish();
        drawFish();
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

    // Modify the updateFish function to use the new cat size
    function updateFish() {
        // Add new fish randomly
        if (Math.random() < 0.02) {
            const minY = canvas.height * 0.25; // Start at 1/4 of the screen height
            const maxY = canvas.height; // End at the bottom of the screen
            const fishY = minY + Math.random() * (maxY - minY); // Random Y position in bottom 3/4
            const fishSize = isMobile ? Math.random() * 60 + 30 : Math.random() * 40 + 20;
            fishArray.push({ x: canvas.width, y: fishY, size: fishSize });
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

        // Update fish positions
        for (let i = 0; i < fishArray.length; i++) {
            fishArray[i].x -= waveSpeed;

            // Constrain fish to bottom 3/4 of the screen
            const minY = canvas.height * 0.25;
            const maxY = canvas.height - fishArray[i].size;
            fishArray[i].y = Math.max(minY, Math.min(maxY, fishArray[i].y));

            // Check for collision with cat
            if (fishArray[i].x < catX + catWidth && fishArray[i].x + fishArray[i].size > catX &&
                fishArray[i].y < catY + catHeight && fishArray[i].y + fishArray[i].size > catY) {
                fishArray.splice(i, 1);
                score += 10;
                updateScore();
                waveSpeed += 0.1;
                playNextFishCatchSound();
                i--;
            }
        }

        // Remove fish that are off-screen
        fishArray = fishArray.filter(fish => fish.x > -fish.size);
    }

    function drawFish() {
        for (let fish of fishArray) {
            ctx.drawImage(fishImage, fish.x, fish.y, fish.size, fish.size);
        }
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
            isFirstScoreUpdate = true;
            updateScore();
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

    // Add this to your main draw function
    function draw() {
        // ... (other drawing code)
        drawCat();
        drawSurfMoveEffect();
        // ... (rest of drawing code)
    }

    // ... rest of your game code ...
})();