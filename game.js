(function() {
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

    function updateCatPosition() {
        // Apply velocity to position
        catX += catVelocityX;
        catY += catVelocityY;

        // Apply deceleration
        catVelocityX *= catDeceleration;
        catVelocityY *= catDeceleration;

        // Constrain cat within canvas
        const maxCatWidth = canvas.width * 0.1;
        const maxCatHeight = canvas.height * 0.2;
        catX = Math.max(0, Math.min(canvas.width - maxCatWidth, catX));
        catY = Math.max(0, Math.min(canvas.height - maxCatHeight, catY));
    }

    function drawCat() {
        const maxCatWidth = canvas.width * 0.1; // 10% of canvas width
        const maxCatHeight = canvas.height * 0.2; // 20% of canvas height
        
        let catWidth = maxCatWidth;
        let catHeight = catWidth * (catImage.height / catImage.width);
        
        if (catHeight > maxCatHeight) {
            catHeight = maxCatHeight;
            catWidth = catHeight * (catImage.width / catImage.height);
        }
        
        ctx.save(); // Save the current context state

        if (!catFacingRight) {
            // If cat is facing left, flip the image horizontally
            ctx.scale(-1, 1);
            ctx.translate(-catX - catWidth, 0);
        }

        ctx.drawImage(catImage, catFacingRight ? catX : 0, catY, catWidth, catHeight);

        ctx.restore(); // Restore the context state
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

    function updateFish() {
        // Add new fish randomly
        if (Math.random() < 0.02) {
            const fishY = Math.random() * canvas.height;
            fishArray.push({ x: canvas.width, y: fishY, size: Math.random() * 40 + 20 });
        }

        const catWidth = canvas.width * 0.1;
        const catHeight = catWidth * (catImage.height / catImage.width);

        // Update fish positions
        for (let i = 0; i < fishArray.length; i++) {
            fishArray[i].x -= waveSpeed;

            // Check for collision with cat
            if (fishArray[i].x < catX + catWidth && fishArray[i].x + fishArray[i].size > catX &&
                fishArray[i].y < catY + catHeight && fishArray[i].y + fishArray[i].size > catY) {
                fishArray.splice(i, 1);
                score += 10;
                updateScore();
                waveSpeed += 0.1;
                playNextFishCatchSound(); // Play the next sound when a fish is caught
                i--;
                console.log("Fish caught! Score: " + score); // Debug log
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

    function handleInput() {
        if (isGameRunning) {
            let movingHorizontally = false;

            if (keys["ArrowUp"]) catVelocityY -= catAcceleration;
            if (keys["ArrowDown"]) catVelocityY += catAcceleration;
            if (keys["ArrowLeft"]) {
                catVelocityX -= catAcceleration;
                movingHorizontally = true;
                catFacingRight = false;
            }
            if (keys["ArrowRight"]) {
                catVelocityX += catAcceleration;
                movingHorizontally = true;
                catFacingRight = true;
            }

            // If not moving horizontally, keep the current facing direction
            if (!movingHorizontally) {
                catFacingRight = catVelocityX >= 0;
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

    // ... rest of your game code ...
})();