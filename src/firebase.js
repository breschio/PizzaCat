import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firestore instance
export const db = getFirestore(app);

// Save score to Firestore
export async function saveScore(username, score) {
    try {
        await db.collection('scores').add({
            username,
            score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving score:", error);
    }
}

// Get top scores from Firestore
export async function getTopScores() {
    try {
        const snapshot = await db.collection('scores')
            .orderBy('score', 'desc')
            .limit(10)
            .get();
        
        return snapshot.docs.map(doc => ({
            username: doc.data().username,
            score: doc.data().score
        }));
    } catch (error) {
        console.error("Error getting scores:", error);
        return [];
    }
} 