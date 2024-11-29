// Constants
const TRICK_DURATION = 1000; // 1 second for each trick
const TRICK_COOLDOWN = 2000; // 2 seconds cooldown between tricks
const TRICK_NAME_DISPLAY_DURATION = 2000; // Display for 2 seconds

// Trick state variables (private)
let _isTrickActive = false;
let _trickTimer = 0;
let _trickNameDisplayTime = 0;
let _currentTrickName = '';
let _trickAnimationActive = false;
let _trickRotation = 0;
let _trickStartTime = 0;
let _lastTrickTime = 0;

// Getter/Setter methods
function setTrickTimer(value) {
    _trickTimer = value;
}

function setTrickActive(value) {
    _isTrickActive = value;
}

function setTrickAnimationActive(value) {
    _trickAnimationActive = value;
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
    return canvas.height * 0.4;
}

function performTrick(catY, catHeight, TRICK_THRESHOLD, isGameRunning, isGameOver, score, updateScore) {
    const currentTime = Date.now();
    if (!_isTrickActive && 
        isGameRunning && 
        !isGameOver && 
        catY + catHeight < TRICK_THRESHOLD) {
        
        _isTrickActive = true;
        _trickTimer = TRICK_DURATION;
        _trickStartTime = currentTime;
        _lastTrickTime = currentTime;
        
        // Start the trick animation
        _trickRotation = 0;
        _trickAnimationActive = true;
        
        // Set trick name and show toast
        const trickNames = ['Tail Spin', 'Paw Flip', 'Whisker Twist', 'Furry 360', 'Meow Spin'];
        _currentTrickName = trickNames[Math.floor(Math.random() * trickNames.length)];
        _trickNameDisplayTime = TRICK_NAME_DISPLAY_DURATION;
        
        // Show toast notification
        showTrickToast(_currentTrickName, 5);
        
        score += 5;
        updateScore();
        
        console.log("Trick performed:", _currentTrickName);
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
    if (_trickNameDisplayTime > 0) {
        ctx.save();
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = 'yellow';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = _currentTrickName;
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}

function showTrickToast(trickName, points) {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="reaction">MEOWABUNGA!</div>
        <div class="trick-name">${trickName}</div>
        <div class="points">+${points} pts</div>
    `;

    // Add to document
    document.body.appendChild(toast);

    // Remove after animation
    setTimeout(() => {
        toast.remove();
    }, 3000); // 3 seconds total (0.5s slide in + 2s display + 0.5s fade out)
}

// Modified exports
export {
    performTrick,
    startSurfMove,
    updateSurfMove,
    endSurfMove,
    drawTrickName,
    calculateTrickThreshold,
    setTrickTimer,
    setTrickActive,
    setTrickAnimationActive,
    setTrickNameDisplayTime,
    TRICK_DURATION,
    TRICK_COOLDOWN,
    TRICK_NAME_DISPLAY_DURATION,
    // Getters for state
    _isTrickActive as isTrickActive,
    _trickTimer as trickTimer,
    _trickAnimationActive as trickAnimationActive,
    _trickRotation as trickRotation,
    _trickNameDisplayTime as trickNameDisplayTime,
    _currentTrickName as currentTrickName,
    _trickStartTime as trickStartTime,
    _lastTrickTime as lastTrickTime,
    showTrickToast
}; 