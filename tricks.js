import { mediaPlayer } from './mediaPlayer.js';
import { DEBUG_MODE } from './debug.js';

// Constants
const TRICK_DURATION = 200;
const TRICK_COOLDOWN = 1000; // 1 second cooldown
const TRICK_NAME_DISPLAY_DURATION = 500;
const TRICK_THRESHOLD = 200;
const TRICK_ZONE_COOLDOWN = 200;
const ROTATION_SPEED = 0.3;
const MAX_ROTATION = Math.PI * 4;
const TRICK_ZONE_HEIGHT_RATIO = 1/3;
const TRICK_ZONE_DURATION = 5000;
const TRICK_ZONE_ALPHA_MIN = 0.1;
const TRICK_ZONE_ALPHA_MAX = 0.3;

// Trick state variables (private)
let _isTrickActive = false;
let _trickTimer = 0;
let _trickNameDisplayTime = 0;
let _currentTrickName = '';
let _trickStartTime = 0;
let _lastTrickTime = 0;
let _trickZoneTimeLeft = TRICK_ZONE_DURATION;
let _trickZoneActive = false;
let _lastTrickZoneEnterTime = 0;
let _trickRotation = 0;
let _hasDoneTrickInZone = false;
let _hasExitedTrickZone = true;
let _isPerformingTrick = false;

// Animation state
let _trickScale = 1;
let _trickFlip = false;

// Define available tricks with their animations
const TRICKS = {
    'Tail Spin': {
        points: 100,
        rotation: (progress) => progress * Math.PI * 4,
        scale: (progress) => 1,
        effect: (ctx, centerX, centerY, progress) => {
            // Spiral trail effect
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const angle = (progress * Math.PI * 4) - (i * 0.2);
                const radius = i * 3;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    },
    'Paw Flip': {
        points: 200,
        rotation: (progress) => 0,
        scale: (progress) => Math.cos(progress * Math.PI * 2),
        translate: (progress) => [0, Math.sin(progress * Math.PI * 2) * 30],
        effect: (ctx, centerX, centerY, progress) => {
            // Motion blur streaks
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < 5; i++) {
                const offset = Math.sin((progress + i/5) * Math.PI * 2) * 30;
                ctx.fillRect(centerX - 50 + offset, centerY - 25, 10, 50);
            }
        }
    },
    'Whisker Twist': {
        points: 300,
        rotation: (progress) => progress * Math.PI * 3,
        scale: (progress) => [1, Math.cos(progress * Math.PI * 2)],
        effect: (ctx, centerX, centerY, progress) => {
            // Spiral sparkles
            for (let i = 0; i < 12; i++) {
                const angle = (progress * Math.PI * 3) + (i * Math.PI / 6);
                const x = centerX + Math.cos(angle) * 40;
                const y = centerY + Math.sin(angle) * 40;
                const size = 3 + Math.sin((progress + i) * Math.PI * 2) * 2;
                ctx.beginPath();
                ctx.fillStyle = `hsla(${i * 30}, 100%, 50%, 0.6)`;
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    'Furry 360': {
        points: 400,
        rotation: (progress) => progress * Math.PI * 2,
        scale: (progress) => 1 + Math.sin(progress * Math.PI * 2) * 0.2,
        effect: (ctx, centerX, centerY, progress) => {
            // Rainbow trail
            ctx.lineWidth = 5;
            for (let i = 0; i < 6; i++) {
                const angle = progress * Math.PI * 2;
                const radius = 40 + i * 10;
                ctx.beginPath();
                ctx.strokeStyle = `hsla(${i * 60}, 100%, 50%, 0.4)`;
                ctx.arc(centerX, centerY, radius, angle - 1, angle + 0.5);
                ctx.stroke();
            }
        }
    },
    'Meow Spin': {
        points: 500,
        rotation: (progress) => progress * Math.PI * 6,
        translate: (progress) => [0, Math.sin(progress * Math.PI * 4) * 40],
        effect: (ctx, centerX, centerY, progress) => {
            // Starburst effect
            const burstCount = 8;
            const burstLength = 60;
            ctx.lineWidth = 3;
            for (let i = 0; i < burstCount; i++) {
                const angle = (progress * Math.PI * 6) + (i * Math.PI * 2 / burstCount);
                const gradient = ctx.createLinearGradient(
                    centerX, centerY,
                    centerX + Math.cos(angle) * burstLength,
                    centerY + Math.sin(angle) * burstLength
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.beginPath();
                ctx.strokeStyle = gradient;
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(
                    centerX + Math.cos(angle) * burstLength,
                    centerY + Math.sin(angle) * burstLength
                );
                ctx.stroke();
            }
        }
    }
};

function performTrick(catY, catHeight, TRICK_THRESHOLD, isGameRunning, isGameOver, score, updateScore) {
    if (!isGameRunning || isGameOver) {
        console.log("Cannot perform trick: Game not in running state");
        return { score: 0, trickName: null };
    }

    const scaledHeight = catHeight * 0.665;
    if (!_trickZoneActive || catY + scaledHeight >= TRICK_THRESHOLD) {
        console.log("Cannot perform trick: Not in active trick zone");
        return { score: 0, trickName: null };
    }

    if (_hasDoneTrickInZone) {
        console.log("Cannot perform trick: Already performed trick in this zone");
        return { score: 0, trickName: null };
    }

    _hasDoneTrickInZone = true;
    _trickRotation = MAX_ROTATION;
    _isPerformingTrick = true;
    _trickStartTime = performance.now();
    
    const trickNames = Object.keys(TRICKS);
    const trickName = trickNames[Math.floor(Math.random() * trickNames.length)];
    _currentTrickName = trickName;
    
    const points = TRICKS[trickName].points;
    showTrickToast(trickName, points);
    mediaPlayer.playMewoabungaSound();
    
    console.log('Trick performed:', trickName, 'Points:', points);
    
    return { score: points, trickName };
}

function applyTrickAnimation(ctx, centerX, centerY, catX, catY, scaledWidth, scaledHeight, catFacingRight) {
    if (!_isPerformingTrick || !_currentTrickName) return false;

    const trick = TRICKS[_currentTrickName];
    if (!trick) return false;

    const progress = (performance.now() - _trickStartTime) / TRICK_COOLDOWN;
    if (progress >= 1) {
        _isPerformingTrick = false;
        _currentTrickName = null;
        return false;
    }

    ctx.translate(centerX, centerY);
    
    if (trick.rotation) {
        ctx.rotate(trick.rotation(progress));
    }
    
    if (trick.scale) {
        const scale = trick.scale(progress);
        if (Array.isArray(scale)) {
            ctx.scale(scale[0], scale[1]);
        } else {
            ctx.scale(scale, scale);
        }
    }
    
    if (trick.translate) {
        const [x, y] = trick.translate(progress);
        ctx.translate(x, y);
    }
    
    ctx.translate(-centerX, -centerY);
    return true;
}

function drawTrickEffect(ctx, centerX, centerY) {
    if (!_isPerformingTrick || !_currentTrickName) return;

    const trick = TRICKS[_currentTrickName];
    if (!trick || !trick.effect) return;

    const progress = (performance.now() - _trickStartTime) / TRICK_COOLDOWN;
    if (progress >= 1) return;

    ctx.save();
    trick.effect(ctx, centerX, centerY, progress);
    ctx.restore();
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
    }, 2000);
}

function updateTrickZone(catY, catHeight, deltaTime, canvas) {
    if (_trickZoneActive) {
        _trickZoneTimeLeft -= deltaTime * 1000;
        
        const inTrickZone = catY + catHeight < canvas.height * TRICK_ZONE_HEIGHT_RATIO;
        
        if (_trickZoneTimeLeft <= 0) {
            console.log('Trick zone deactivated: Time ran out');
            _trickZoneActive = false;
            _hasDoneTrickInZone = false;
            updateTrickZoneUI(false, DEBUG_MODE);
        } else if (!inTrickZone) {
            console.log('Trick zone deactivated: Cat left zone');
            _trickZoneActive = false;
            _hasDoneTrickInZone = false;
            updateTrickZoneUI(false, DEBUG_MODE);
        }
    }
}

function activateTrickZone() {
    if (!_trickZoneActive && !_hasDoneTrickInZone) {
        _trickZoneActive = true;
        _trickZoneTimeLeft = TRICK_ZONE_DURATION;
        _hasDoneTrickInZone = false;
        console.log('Trick zone activated! Time left:', _trickZoneTimeLeft);
        updateTrickZoneUI(true, DEBUG_MODE);
    }
}

function updateTrickZoneUI(isActive, isDebug) {
    const trickZoneElement = document.getElementById('trick-zone');
    if (!trickZoneElement) return;

    // Update active state
    trickZoneElement.classList.toggle('active', isActive);
    
    // Update debug state
    trickZoneElement.classList.toggle('debug', isDebug);
}

function isInTrickZone(catY, catHeight, canvas) {
    const scaledHeight = catHeight * 0.665;
    return catY + scaledHeight < canvas.height * TRICK_ZONE_HEIGHT_RATIO;
}

// Export additional functions and state
export {
    performTrick,
    applyTrickAnimation,
    drawTrickEffect,
    updateTrickZone,
    activateTrickZone,
    showTrickToast,
    isInTrickZone,
    TRICK_COOLDOWN,
    _isPerformingTrick as isPerformingTrick,
    _currentTrickName as currentTrickName,
    _trickStartTime as trickStartTime
}; 