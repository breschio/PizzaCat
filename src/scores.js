import { saveScore as supabaseSaveScore, getTopScores } from './supabase.js';

// Save score and return the position/rank
export const saveScore = async (username, { score, level }) => {
    try {
        const data = await supabaseSaveScore(username, score, level);
        
        // Get the position of this score
        const scores = await getTopScores();
        const position = scores.findIndex(s => 
            s.username === username && 
            s.score === score && 
            s.level === level
        ) + 1;
        
        return {
            id: data?.id,
            position,
            username,
            score,
            level
        };
    } catch (error) {
        console.error('Error in saveScore:', error);
        throw error;
    }
};

// Get scores around a specific position
export const getScoresAroundPosition = async (position, range = 5) => {
    try {
        const scores = await getTopScores(position + range);
        
        if (!scores || scores.length === 0) {
            return {
                scores: [],
                playerPosition: 1
            };
        }

        // Add position property to each score
        const scoresWithPosition = scores.map((score, index) => ({
            ...score,
            position: index + 1
        }));
        
        return {
            scores: scoresWithPosition,
            playerPosition: position
        };
    } catch (error) {
        console.error('Error in getScoresAroundPosition:', error);
        throw error;
    }
};

// Function to render the leaderboard
export const renderLeaderboard = (scores = [], playerPosition) => {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) {
        console.error('Leaderboard list element not found');
        return;
    }
    
    leaderboardList.innerHTML = '';
    
    // Handle empty scores
    if (!Array.isArray(scores) || scores.length === 0) {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        entry.innerHTML = `
            <span class="entry-rank">1</span>
            <span class="entry-name">---</span>
            <span class="entry-score">0</span>
        `;
        leaderboardList.appendChild(entry);
        return;
    }
    
    scores.forEach(score => {
        if (!score) return; // Skip undefined/null scores
        
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        if (score.position === playerPosition) {
            entry.classList.add('current-player');
        }
        
        // Add medal for top 3
        let rankSymbol = score.position;
        if (score.position === 1) rankSymbol = '🥇';
        else if (score.position === 2) rankSymbol = '🥈';
        else if (score.position === 3) rankSymbol = '🥉';
        
        // Format the name: use first 3 letters or pad with dashes
        let displayName = '---';
        if (score.username && typeof score.username === 'string') {
            const cleanName = score.username.trim().toUpperCase();
            if (cleanName.length >= 3) {
                displayName = cleanName.slice(0, 3);
            } else if (cleanName.length > 0) {
                // Pad shorter names with dashes
                displayName = cleanName.padEnd(3, '-');
            }
        }
        
        entry.innerHTML = `
            <span class="entry-rank">${rankSymbol}</span>
            <span class="entry-name">${displayName}</span>
            <span class="entry-score">${score.score || 0}</span>
        `;
        
        leaderboardList.appendChild(entry);
    });
    
    // Scroll to player's score with smooth animation
    if (playerPosition) {
        const playerEntry = leaderboardList.querySelector('.current-player');
        if (playerEntry) {
            setTimeout(() => {
                playerEntry.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 500); // Delay to ensure smooth transition
        }
    }
}; 