import { collection, addDoc, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase.js';

export const saveScore = async (username, { score, level }) => {
  try {
    await addDoc(collection(db, 'scores'), {
      username,
      score,
      level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving score:', error);
    throw error; // Re-throw to handle in the UI
  }
};

export const getTopScores = async (limitCount = 10) => {
  try {
    const scoresRef = collection(db, 'scores');
    // First get all scores to determine max level
    const allScoresQuery = query(scoresRef, orderBy('score', 'desc'));
    const allScores = await getDocs(allScoresQuery);
    
    // Group scores by level
    const scoresByLevel = {};
    allScores.docs.forEach(doc => {
      const data = doc.data();
      const level = data.level || 1; // Default to level 1 for legacy scores
      if (!scoresByLevel[level]) {
        scoresByLevel[level] = [];
      }
      scoresByLevel[level].push({
        id: doc.id,
        ...data
      });
    });

    // Sort scores within each level
    Object.keys(scoresByLevel).forEach(level => {
      scoresByLevel[level].sort((a, b) => b.score - a.score);
      // Limit to top 10 for each level
      scoresByLevel[level] = scoresByLevel[level].slice(0, limitCount);
    });

    return scoresByLevel;
  } catch (error) {
    console.error('Error getting scores:', error);
    throw error; // Re-throw to handle in the UI
  }
}; 