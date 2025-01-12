import { saveScore, getScoresAroundPosition, renderLeaderboard } from './scores.js';

class GameOverManager {
    constructor() {
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.submitButton = document.getElementById('submit-score');
        this.playerNameInput = document.getElementById('player-name');
        this.finalScoreSpan = document.getElementById('final-score');
        this.finalLevelSpan = document.getElementById('final-level');
        
        // Set maxlength attribute for the input
        this.playerNameInput.maxLength = 3;
        
        // Add input event to force uppercase
        this.playerNameInput.addEventListener('input', () => {
            this.playerNameInput.value = this.playerNameInput.value.toUpperCase();
        });
        
        this.submitButton.addEventListener('click', () => this.handleScoreSubmission());
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleScoreSubmission();
            }
        });
        
        // Store game stats
        this.currentScore = 0;
        this.currentLevel = 1;
        this.isSubmitting = false;
    }
    
    showGameOver(level, score) {
        this.currentScore = score;
        this.currentLevel = level;
        
        this.gameOverScreen.style.display = 'block';
        this.finalScoreSpan.textContent = score;
        this.finalLevelSpan.textContent = level;
        
        // Reset submission state
        this.isSubmitting = false;
        this.submitButton.disabled = false;
        this.submitButton.textContent = 'SUBMIT SCORE';
        
        // Clear and focus on name input
        this.playerNameInput.value = '';
        this.playerNameInput.disabled = false;
        setTimeout(() => {
            this.playerNameInput.focus();
        }, 100);
    }
    
    async handleScoreSubmission() {
        // Prevent double submission
        if (this.isSubmitting) return;
        
        const playerName = this.playerNameInput.value.trim().toUpperCase();
        if (!playerName) {
            alert('Please enter your name!');
            this.playerNameInput.focus();
            return;
        }
        
        try {
            this.isSubmitting = true;
            this.submitButton.disabled = true;
            this.playerNameInput.disabled = true;
            this.submitButton.textContent = 'SAVING...';
            
            // Add small delay to ensure Firebase is initialized
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Save score and get position
            const result = await saveScore(playerName, {
                score: this.currentScore,
                level: this.currentLevel
            });
            
            // Get scores around player's position
            const { scores } = await getScoresAroundPosition(result.position);
            
            // Hide game over screen
            this.gameOverScreen.style.display = 'none';
            
            // Show and render leaderboard
            this.leaderboardScreen.style.display = 'block';
            renderLeaderboard(scores, result.position);
            
            // Add play again button listener
            const playAgainButton = document.getElementById('leaderboard-play');
            playAgainButton.onclick = () => {
                this.leaderboardScreen.style.display = 'none';
                window.dispatchEvent(new Event('startNewGame'));
            };
            
        } catch (error) {
            console.error('Error submitting score:', error);
            alert(error.message || 'Failed to submit score. Please try again.');
            
            // Reset submission state
            this.isSubmitting = false;
            this.submitButton.disabled = false;
            this.playerNameInput.disabled = false;
            this.submitButton.textContent = 'SUBMIT SCORE';
            this.playerNameInput.focus();
        }
    }
}

export const gameOverManager = new GameOverManager(); 