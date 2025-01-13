import { saveScore, getScoresAroundPosition, renderLeaderboard } from './scores.js';

class GameOverManager {
    constructor() {
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.submitButton = document.getElementById('submit-score');
        this.initialInputs = document.querySelectorAll('.initial-input');
        this.finalScoreSpan = document.getElementById('final-score');
        this.finalLevelSpan = document.getElementById('final-level');
        
        // Add input event listeners for each initial input
        this.initialInputs.forEach((input, index) => {
            // Force uppercase and move to next input
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
                if (e.target.value && index < this.initialInputs.length - 1) {
                    this.initialInputs[index + 1].focus();
                }
            });

            // Handle backspace to go to previous input
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    this.initialInputs[index - 1].focus();
                }
            });
        });
        
        this.submitButton.addEventListener('click', () => this.handleScoreSubmission());
        
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
        
        // Clear and focus on first initial input
        this.initialInputs.forEach(input => {
            input.value = '';
            input.disabled = false;
        });
        setTimeout(() => {
            this.initialInputs[0].focus();
        }, 100);
    }
    
    async handleScoreSubmission() {
        // Prevent double submission
        if (this.isSubmitting) return;
        
        // Combine the three initials
        const initials = Array.from(this.initialInputs)
            .map(input => input.value.toUpperCase())
            .join('');

        if (initials.length !== 3) {
            alert('Please enter your three initials!');
            // Focus on the first empty input
            const emptyInput = Array.from(this.initialInputs).find(input => !input.value);
            if (emptyInput) emptyInput.focus();
            return;
        }
        
        try {
            this.isSubmitting = true;
            this.submitButton.disabled = true;
            this.initialInputs.forEach(input => input.disabled = true);
            this.submitButton.textContent = 'SAVING...';
            
            // Save score and get position
            const result = await saveScore(initials, {
                score: this.currentScore,
                level: this.currentLevel
            });
            
            // Get scores around player's position
            const { scores } = await getScoresAroundPosition(result.position);
            
            // Hide game over screen but keep the catnip effects
            this.gameOverScreen.style.display = 'none';
            
            // Show and render leaderboard
            this.leaderboardScreen.style.display = 'block';
            renderLeaderboard(scores, result.position);
            
            // Add play again button listener
            const playAgainButton = document.getElementById('leaderboard-play');
            if (playAgainButton) {
                playAgainButton.onclick = () => {
                    this.leaderboardScreen.style.display = 'none';
                    window.dispatchEvent(new Event('startNewGame'));
                };
            }
            
        } catch (error) {
            console.error('Error submitting score:', error);
            alert(error.message || 'Failed to submit score. Please try again.');
            
            // Reset submission state
            this.isSubmitting = false;
            this.submitButton.disabled = false;
            this.initialInputs.forEach(input => input.disabled = false);
            this.submitButton.textContent = 'SUBMIT SCORE';
            this.initialInputs[0].focus();
        }
    }
}

export default GameOverManager; 