// Set this to true to enable debug features, false to disable
export const DEBUG_MODE = false;

// Function to update debug panel values
export function updateDebugPanel(catX, catY, catVelocityX, catVelocityY, inTrickZone, currentCollision, currentTrick, isGameOver) {
    if (!DEBUG_MODE) return;

    // Update debug panel visibility
    const debugPanel = document.getElementById('debug-panel');
    debugPanel.classList.toggle('active', DEBUG_MODE);
    document.body.classList.toggle('debug-active', DEBUG_MODE);

    // Update trick zone debug state
    const trickZoneElement = document.getElementById('trick-zone');
    if (trickZoneElement) {
        trickZoneElement.classList.toggle('debug', DEBUG_MODE);
    }

    // Update values with more detail
    document.getElementById('debug-position').textContent = 
        `(${Math.round(catX)}, ${Math.round(catY)})`;
    
    document.getElementById('debug-velocity').textContent = 
        `(${catVelocityX.toFixed(2)}, ${catVelocityY.toFixed(2)})`;
    
    document.getElementById('debug-trick-zone').textContent = 
        `${inTrickZone} (Y: ${Math.round(catY)} < ${Math.round(window.innerHeight/3)})`;
    
    document.getElementById('debug-collision').textContent = 
        currentCollision || 'none';
    
    document.getElementById('debug-trick').textContent = 
        currentTrick || 'none';

    // Update game over toggle state
    const gameOverToggle = document.getElementById('debug-game-over-toggle');
    if (gameOverToggle) {
        gameOverToggle.checked = isGameOver;
    }
}

// Function to create debug controls
export function createDebugControls(handleGameOver) {
    if (!DEBUG_MODE) return;

    const debugControls = document.createElement('div');
    debugControls.className = 'debug-controls';
    debugControls.innerHTML = `
        <div class="debug-row">
            <label class="debug-label">Game Over:</label>
            <input type="checkbox" id="debug-game-over-toggle" class="debug-toggle">
        </div>
    `;

    const debugPanel = document.getElementById('debug-panel');
    debugPanel.appendChild(debugControls);

    // Add event listener for game over toggle
    const gameOverToggle = document.getElementById('debug-game-over-toggle');
    gameOverToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            handleGameOver();
        }
    });
}

// Function to draw trick zone boundary line
export function drawTrickZoneBoundary(canvas) {
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