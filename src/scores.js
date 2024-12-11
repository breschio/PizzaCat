import { collection, addDoc, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { db } from './firebase.js';

export const saveScore = async (username, score) => {
  try {
    await addDoc(collection(db, 'scores'), {
      username,
      score,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving score:', error);
  }
};

export const getTopScores = async (limitCount = 10) => {
  try {
    const scoresRef = collection(db, 'scores');
    const q = query(scoresRef, orderBy('score', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting scores:', error);
    return [];
  }
}; 