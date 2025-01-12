import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;

// Initialize Firebase with proper error handling
async function initializeFirebase() {
    try {
        const response = await fetch('http://localhost:3000/api/firebase-config');
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase configuration');
        }
        const config = await response.json();
        const app = initializeApp(config);
        db = getFirestore(app);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
}

// Save score to Firestore with proper validation
export async function saveScore(username, { score, level }) {
    if (!db) {
        await initializeFirebase();
    }
    
    if (!username || typeof score !== 'number' || typeof level !== 'number') {
        throw new Error('Invalid score data');
    }

    try {
        const scoresCollection = collection(db, 'scores');
        await addDoc(scoresCollection, {
            username,
            score,
            level,
            timestamp: new Date().toISOString()
        });
        console.log('Score saved successfully');
    } catch (error) {
        console.error("Error saving score:", error);
        throw error;
    }
}

// Get top scores from Firestore with proper error handling
export async function getTopScores() {
    if (!db) {
        await initializeFirebase();
    }

    try {
        const scoresCollection = collection(db, 'scores');
        const scoresQuery = query(scoresCollection, orderBy('score', 'desc'), limit(10));
        const snapshot = await getDocs(scoresQuery);
        
        const scores = snapshot.docs.map(doc => ({
            id: doc.id,
            username: doc.data().username || doc.data().name,
            score: doc.data().score,
            level: doc.data().level || 1,
            timestamp: doc.data().timestamp
        }));
        
        return scores;
    } catch (error) {
        console.error("Error getting scores:", error);
        throw error;
    }
}

// Initialize Firebase when the module loads
initializeFirebase().catch(console.error);

export { db }; 