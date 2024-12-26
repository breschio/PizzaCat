import { saveScore, getTopScores } from './scores.js';
import { mediaPlayer } from '../mediaPlayer.js';

export class GameOverManager {
    constructor() {
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.finalLevel = document.getElementById('final-level');
        this.finalScore = document.getElementById('final-score');
        this.playerNameInput = document.getElementById('player-name');
        this.submitButton = document.getElementById('submit-score');
        this.leaderboardLevels = document.getElementById('leaderboard-levels');
        this.leaderboardList = document.getElementById('leaderboard-list');
        this.leaderboardPlayButton = document.getElementById('leaderboard-play');
        
        this.currentLevel = 1;
        this.currentScore = 0;
        this.maxLevel = 1; // Will be updated as players progress
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Submit score button
        this.submitButton.addEventListener('click', async () => {
            const playerName = this.playerNameInput.value.trim();
            if (!playerName) {
                alert('Please enter your name!');
                return;
            }

            await this.submitScore(playerName);
            this.hideGameOver();
            this.showLeaderboard();
        });

        // Start game button on leaderboard
        this.leaderboardPlayButton.addEventListener('click', () => {
            this.hideLeaderboard();
            // Dispatch custom event to start new game
            window.dispatchEvent(new CustomEvent('startNewGame'));
        });

        // Handle enter key on name input
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitButton.click();
            }
        });
    }

    showGameOver(level, score) {
        this.currentLevel = level;
        this.currentScore = score;
        this.maxLevel = Math.max(this.maxLevel, level);
        
        // Ensure game container is in a clean state
        document.getElementById('game-container').classList.add('blur');
        
        // Update display
        this.finalLevel.textContent = level;
        this.finalScore.textContent = score;
        this.playerNameInput.value = '';
        
        // Show game over screen with proper z-index
        this.gameOverScreen.style.zIndex = '10000';
        this.gameOverScreen.style.display = 'block';
        
        // Enable input and focus
        this.playerNameInput.disabled = false;
        this.submitButton.disabled = false;
        this.submitButton.textContent = 'SUBMIT SCORE';
        
        // Force focus after a short delay
        setTimeout(() => {
            this.playerNameInput.focus();
        }, 100);
    }

    async submitScore(playerName) {
        try {
            // Disable input during submission
            this.submitButton.disabled = true;
            this.playerNameInput.disabled = true;
            this.submitButton.textContent = 'Saving...';
            
            await saveScore(playerName, {
                score: this.currentScore,
                level: this.currentLevel
            });
            
            // Clean up and show leaderboard
            this.hideGameOver();
            this.showLeaderboard();
        } catch (error) {
            console.error('Error saving score:', error);
            
            // Re-enable input on error
            this.submitButton.textContent = 'SUBMIT SCORE';
            this.submitButton.disabled = false;
            this.playerNameInput.disabled = false;
            this.playerNameInput.focus();
            
            alert('Failed to save score. Please check your internet connection and try again.');
        }
    }

    async showLeaderboard() {
        this.leaderboardScreen.style.display = 'block';
        
        try {
            const scoresByLevel = await getTopScores();
            const levelScores = scoresByLevel[this.currentLevel] || [];
            
            this.leaderboardList.innerHTML = '';
            
            if (levelScores.length === 0) {
                this.leaderboardList.innerHTML = '<div class="leaderboard-entry">No scores yet for this level</div>';
                return;
            }

            levelScores.forEach((score, index) => {
                const entry = document.createElement('div');
                entry.className = 'leaderboard-entry';
                entry.innerHTML = `
                    <span class="entry-rank">#${index + 1}</span>
                    <span class="entry-name">${score.username}</span>
                    <span class="entry-score">${score.score}</span>
                `;
                this.leaderboardList.appendChild(entry);
            });
        } catch (error) {
            console.error('Error fetching scores:', error);
            this.leaderboardList.innerHTML = '<div class="error">Failed to load scores</div>';
        }
    }

    hideGameOver() {
        // Clean up UI state
        this.gameOverScreen.style.display = 'none';
        document.getElementById('game-container').classList.remove('blur');
        
        // Clear input state
        this.playerNameInput.value = '';
        this.playerNameInput.disabled = true;
    }

    hideLeaderboard() {
        this.leaderboardScreen.style.display = 'none';
    }
}

// Export a singleton instance
export const gameOverManager = new GameOverManager(); 