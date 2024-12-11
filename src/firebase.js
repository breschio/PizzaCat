import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = {
    // Your Firebase config object here
    // You can get this from your Firebase Console
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
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