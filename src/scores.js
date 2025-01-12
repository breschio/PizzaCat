import { collection, addDoc, getDocs, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase.js';

// Save score and return the position/rank
export const saveScore = async (username, { score, level }) => {
  try {
    // Wait for db to be initialized
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Save the score
    const scoresRef = collection(db, 'scores');
    const docRef = await addDoc(scoresRef, {
      username,
      score,
      level,
      timestamp: new Date().toISOString()
    });
    
    // Get the position of this score
    const position = await getScorePosition(score);
    
    return {
      id: docRef.id,
      position,
      username,
      score,
      level
    };
  } catch (error) {
    console.error('Error in saveScore:', error);
    throw new Error('Failed to save score. Please try again.');
  }
};

// Get the position of a score in the leaderboard
async function getScorePosition(targetScore) {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const scoresRef = collection(db, 'scores');
    const higherScoresQuery = query(
      scoresRef,
      orderBy('score', 'desc'),
      where('score', '>', targetScore)
    );
    
    const higherScores = await getDocs(higherScoresQuery);
    return higherScores.size + 1; // Position is 1-based
  } catch (error) {
    console.error('Error in getScorePosition:', error);
    throw new Error('Failed to calculate score position');
  }
}

// Get scores around a specific position
export const getScoresAroundPosition = async (position, range = 5) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const scoresRef = collection(db, 'scores');
    const allScoresQuery = query(scoresRef, orderBy('score', 'desc'));
    const snapshot = await getDocs(allScoresQuery);
    
    // Ensure we have scores before processing
    if (snapshot.empty) {
      return {
        scores: [],
        playerPosition: 1
      };
    }
    
    const scores = snapshot.docs.map((doc, index) => ({
      id: doc.id,
      position: index + 1,
      ...doc.data()
    }));

    // Ensure scores array exists before slicing
    if (!Array.isArray(scores)) {
      console.error('Scores is not an array:', scores);
      return {
        scores: [],
        playerPosition: position
      };
    }

    // Always include top scores (safely)
    const topScores = scores.length >= 3 ? scores.slice(0, 3) : scores.slice();
    
    // Calculate range around player's position
    const startPos = Math.max(3, position - range);
    const endPos = Math.min(position + range, scores.length);
    const rangeScores = scores.slice(startPos - 1, endPos);
    
    // Combine and deduplicate scores
    const combinedScores = [...topScores];
    if (Array.isArray(rangeScores)) {
      rangeScores.forEach(score => {
        if (score && !combinedScores.find(s => s.id === score.id)) {
          combinedScores.push(score);
        }
      });
    }
    
    // Sort by position
    combinedScores.sort((a, b) => a.position - b.position);
    
    return {
      scores: combinedScores,
      playerPosition: position
    };
  } catch (error) {
    console.error('Error in getScoresAroundPosition:', error);
    // Return empty scores array instead of throwing
    return {
      scores: [],
      playerPosition: position
    };
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