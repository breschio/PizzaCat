import { mediaPlayer } from './mediaPlayer.js';

// Constants
const TRICK_DURATION = 200; // Even shorter duration for quicker tricks
const TRICK_COOLDOWN = 200; // Reduced to 0.2 seconds between tricks
const TRICK_NAME_DISPLAY_DURATION = 500; // Shorter display time
const TRICK_THRESHOLD = 200; // Default value
const TRICK_ZONE_COOLDOWN = 200; // Reduced to 0.2 seconds
const ROTATION_SPEED = 0.3; // Speed of rotation reduction
const MAX_ROTATION = Math.PI * 4; // Maximum rotation (2 full spins)

// Trick state variables (private)
let _isTrickActive = false;
let _trickTimer = 0;
let _trickNameDisplayTime = 0;
let _currentTrickName = '';
let _trickStartTime = 0;
let _lastTrickTime = 0;
let _trickZoneTimeLeft = 5000; // 5 seconds in milliseconds
let _trickZoneActive = false;
const TRICK_ZONE_DURATION = 5000; // 5 seconds
let _lastTrickZoneEnterTime = 0;
let _trickRotation = 0;
let _hasDoneTrickInZone = false;  // Track if a trick has been done in current zone
let _hasExitedTrickZone = true; // New flag to track if the cat has exited the zone

// Getter/Setter methods
function setTrickTimer(value) {
    _trickTimer = value;
}

function setTrickActive(value) {
    _isTrickActive = value;
}

function setTrickNameDisplayTime(value) {
    _trickNameDisplayTime = value;
}

// Define available surf moves
const surfMoves = [
    { name: 'Aerial', scale: 1.2, rotation: Math.PI * 2 },
    { name: 'Cutback', scale: 1.1, rotation: Math.PI },
    { name: 'Barrel', scale: 0.9, rotation: 0 },
    { name: 'Floater', scale: 1.15, rotation: Math.PI / 2 },
];

let currentSurfMove = null;
let surfMoveStartTime = 0;
let surfMoveProgress = 0;

function calculateTrickThreshold(canvas) {
    return canvas.height * 0.4; // 40% from the top
}

function performTrick(catY, catHeight, TRICK_THRESHOLD, isGameRunning, isGameOver, score, updateScore) {
    if (!_trickZoneActive || _hasDoneTrickInZone) {
        console.log("Trick not possible: Zone inactive or already done.");
        return 0;
    }
    
    if (isGameRunning && !isGameOver && catY + catHeight < TRICK_THRESHOLD) {
        _hasDoneTrickInZone = true;
        _trickRotation = MAX_ROTATION;
        
        const trickNames = ['Tail Spin', 'Paw Flip', 'Whisker Twist', 'Furry 360', 'Meow Spin'];
        _currentTrickName = trickNames[Math.floor(Math.random() * trickNames.length)];
        
        showTrickToast(_currentTrickName, 5);
        
        mediaPlayer.playMewoabungaSound();
        
        _trickZoneActive = false;
        _trickZoneTimeLeft = 0;
        _lastTrickZoneEnterTime = Date.now();
        
        removeTrickZoneBar();
        removeTrickButton();
        
        const healthBar = document.getElementById('health-bar-container');
        if (healthBar) {
            healthBar.style.opacity = '1';
            healthBar.style.pointerEvents = 'auto';
        }
        
        return 5;
    }
    return 0;
}

function startSurfMove() {
    currentSurfMove = surfMoves[Math.floor(Math.random() * surfMoves.length)];
    surfMoveStartTime = Date.now();
    surfMoveProgress = 0;
    console.log(`Starting surf move: ${currentSurfMove.name}`);
}

function updateSurfMove() {
    const elapsedTime = Date.now() - surfMoveStartTime;
    surfMoveProgress = Math.min(elapsedTime / 1000, 1);
}

function endSurfMove() {
    const endDuration = 500;
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

function drawTrickName(ctx, canvas) {
    // Only draw the trick zone, don't handle button creation here
    drawTrickZone(ctx, canvas);
}

function showTrickToast(trickName, points) {
    // Find any existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    
    // Remove old toasts if there are too many (keep last 3)
    while (existingToasts.length >= 3) {
        existingToasts[0].remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="reaction">🏄‍♂️</div>
        <div class="trick-name">${trickName}</div>
        <div class="points">+${points} pts</div>
    `;

    // Add to document
    document.body.appendChild(toast);

    // Remove after animation
    setTimeout(() => {
        toast.remove();
    }, 2000); // Reduced to 2 seconds
}

// Create a separate function for button management
function updateTrickButton(isInTrickZone) {
    // Remove existing button and instruction
    const existingButton = document.querySelector('.trick-button');
    const existingInstruction = document.querySelector('.spacebar-instruction');
    
    if (isInTrickZone && !existingButton) {
        // Create button
        const button = document.createElement('button');
        button.className = 'trick-button active';
        button.textContent = 'DO A TRICK';
        button.style.opacity = '1';
        button.style.pointerEvents = 'auto';
        document.body.appendChild(button);

        // Create spacebar instruction
        const instruction = document.createElement('div');
        instruction.className = 'spacebar-instruction';
        instruction.textContent = 'HIT SPACEBAR';
        document.body.appendChild(instruction);
    } else if (!isInTrickZone) {
        // Remove both button and instruction
        if (existingButton) existingButton.remove();
        if (existingInstruction) existingInstruction.remove();
    }
}

// Add this function to draw the trick zone
function drawTrickZone(ctx, canvas) {
    // Only draw if trick zone is active
    if (!_trickZoneActive) return;

    const threshold = calculateTrickThreshold(canvas);
    
    // Draw a semi-transparent gradient zone
    ctx.save();
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, threshold);
    gradient.addColorStop(0, 'rgba(255, 140, 66, 0.2)');    // Orange
    gradient.addColorStop(0.5, 'rgba(255, 217, 61, 0.15)'); // Yellow
    gradient.addColorStop(1, 'rgba(255, 107, 107, 0.1)');   // Coral
    
    // Fill trick zone with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, threshold);
    
    // Draw sparkle effect
    const time = Date.now() / 1000;
    for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time * 2 + i) + 1) * canvas.width / 2;
        const y = (Math.cos(time * 3 + i) + 1) * threshold / 2;
        const size = Math.sin(time * 4 + i) * 2 + 3;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Made sparkles more subtle
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw dashed line at threshold
    ctx.strokeStyle = 'rgba(255, 217, 61, 0.3)'; // Made line more subtle
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, threshold);
    ctx.lineTo(canvas.width, threshold);
    ctx.stroke();
    
    ctx.restore();
}

// Add this function to manage trick zone state
function updateTrickZoneState(catY, catHeight, threshold, deltaTime) {
    const inZone = catY + catHeight < threshold;

    console.log(`In Zone: ${inZone}, Trick Zone Active: ${_trickZoneActive}, Has Exited: ${_hasExitedTrickZone}`);

    if (inZone && !_trickZoneActive && _hasExitedTrickZone &&
        Date.now() - _lastTrickZoneEnterTime > TRICK_ZONE_COOLDOWN) {
        console.log('Activating Trick Zone');
        _trickZoneActive = true;
        _trickZoneTimeLeft = TRICK_ZONE_DURATION;
        _lastTrickZoneEnterTime = Date.now();
        _hasDoneTrickInZone = false;
        _hasExitedTrickZone = false;
        createTrickZoneBar();
    }

    if (!inZone && !_hasExitedTrickZone) {
        console.log('Exiting Trick Zone');
        _hasExitedTrickZone = true;
        removeTrickZoneBar();
        removeTrickButton();
        _trickZoneActive = false;
    }

    if (_trickZoneTimeLeft <= 0) {
        console.log('Trick Zone Time Up');
        _trickZoneActive = false;
        _hasDoneTrickInZone = true;
        removeTrickButton();
    }

    return _trickZoneActive && inZone;
}

// Add these functions to manage the trick zone bar
function createTrickZoneBar() {
    removeTrickZoneBar(); // Remove any existing bar
    
    const barContainer = document.createElement('div');
    barContainer.className = 'trick-zone-bar';
    barContainer.innerHTML = `
        <div class="trick-zone-label">TRICK ZONE</div>
        <div class="trick-zone-bar-background">
            <div class="trick-zone-bar-fill"></div>
        </div>
        <div class="trick-zone-text">5</div>
    `;
    document.body.appendChild(barContainer);
    
    // Force reflow to ensure animation works
    void barContainer.offsetWidth;
    barContainer.classList.add('active');
    
    // Hide health bar when trick zone is active
    const healthBar = document.getElementById('health-bar-container');
    if (healthBar) {
        healthBar.style.opacity = '0';
        healthBar.style.pointerEvents = 'none';
    }
}

function updateTrickZoneBar(deltaTime) {
    _trickZoneTimeLeft -= deltaTime * 1000; // Reduce time left by deltaTime in milliseconds
    const percentage = _trickZoneTimeLeft / TRICK_ZONE_DURATION;

    const barFill = document.querySelector('.trick-zone-bar-fill');
    const trickText = document.querySelector('.trick-zone-text');
    if (barFill) {
        barFill.style.width = `${Math.max(0, percentage * 100)}%`;
    }
    if (trickText) {
        trickText.textContent = `${Math.ceil(_trickZoneTimeLeft / 1000)}`; // Update text to show remaining seconds
    }

    // Remove the bar and deactivate the trick zone if time is up
    if (_trickZoneTimeLeft <= 0) {
        removeTrickZoneBar();
        _trickZoneActive = false;
        _hasDoneTrickInZone = true; // Prevent reactivation until the cat leaves the zone
        removeTrickButton(); // Remove the button when time is up
    }
}

function removeTrickZoneBar() {
    const existingBar = document.querySelector('.trick-zone-bar');
    if (existingBar) {
        existingBar.remove();
    }
    
    // Show health bar when trick zone is removed
    const healthBar = document.getElementById('health-bar-container');
    if (healthBar) {
        healthBar.style.opacity = '1';
        healthBar.style.pointerEvents = 'auto';
    }
}

// Add this function to get the current trick rotation
function getTrickRotation() {
    // Gradually reduce rotation back to 0 with a fixed speed
    if (_trickRotation > 0) {
        _trickRotation = Math.max(0, _trickRotation - ROTATION_SPEED);
    }
    return _trickRotation;
}

function removeTrickButton() {
    const existingButton = document.querySelector('.trick-button');
    const existingInstruction = document.querySelector('.spacebar-instruction');
    if (existingButton) existingButton.remove();
    if (existingInstruction) existingInstruction.remove();
}

// Modified exports
export {
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
    updateTrickZoneBar,
    _trickZoneActive as isTrickZoneActive,
    _trickZoneTimeLeft as trickZoneTimeLeft,
    getTrickRotation
}; 