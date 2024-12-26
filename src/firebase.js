import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;

// Test function to save a test score
async function testSaveScore() {
    console.log("Saving test score...");
    await saveScore('TestUser', { score: 100, level: 1 });
    console.log("Test score saved.");
}

// Test function to retrieve top scores
async function testGetTopScores() {
    console.log("Retrieving top scores...");
    const topScores = await getTopScores();
    console.log("Top scores:", topScores);
}

// Test function to save a new test score with a different username
async function testSaveNewScore() {
    console.log("Saving new test score...");
    await saveScore('NewUser', { score: 150, level: 1 });
    console.log("New test score saved.");
}

// Run tests after Firebase is initialized
fetch('http://localhost:3000/api/firebase-config')
    .then(response => response.json())
    .then(config => {
        // Initialize Firebase with the config
        const app = initializeApp(config);
        db = getFirestore(app);
        
        // Run tests
        (async () => {
            await testSaveScore();
            await testGetTopScores();
            await testSaveNewScore();
            await testGetTopScores();
        })();
    })
    .catch(error => {
        console.error('Error fetching Firebase config:', error);
    });

// Save score to Firestore
export async function saveScore(username, { score, level }) {
    try {
        const scoresCollection = collection(db, 'scores');
        console.log("Saving to Firestore:", { username, score, level }); // Debug log
        await addDoc(scoresCollection, {
            username,
            score,
            level,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Error saving score:", error);
        throw error;
    }
}

// Get top scores from Firestore
export async function getTopScores() {
    try {
        const scoresCollection = collection(db, 'scores');
        const scoresQuery = query(scoresCollection, orderBy('score', 'desc'), limit(10));
        const snapshot = await getDocs(scoresQuery);
        
        const scores = snapshot.docs.map(doc => ({
            username: doc.data().username || doc.data().name,
            score: doc.data().score,
            level: doc.data().level || 1
        }));
        console.log("Retrieved from Firestore:", scores); // Debug log
        return scores;
    } catch (error) {
        console.error("Error getting scores:", error);
        throw error;
    }
}

// Export the Firestore instance and functions
export { db, collection, addDoc, getDocs, query, orderBy, limit }; 