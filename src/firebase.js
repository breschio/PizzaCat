import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;
let initializationPromise = null;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Determine the API base URL based on the current environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://pizzacat.surf'; // Replace with your actual production domain

// Initialize Firebase with proper error handling and retries
async function initializeFirebase(retryCount = 0) {
    if (db) return db;
    
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/firebase-config`);
            if (!response.ok) {
                throw new Error('Failed to fetch Firebase configuration');
            }
            const config = await response.json();
            
            // Check if we already have an initialized Firebase app
            try {
                const app = initializeApp(config);
                db = getFirestore(app);
            } catch (initError) {
                // If Firebase is already initialized, get the existing app
                if (initError.code === 'app/duplicate-app') {
                    const existingApp = firebase.app();
                    db = getFirestore(existingApp);
                } else {
                    throw initError;
                }
            }
            
            console.log('Firebase initialized successfully');
            return db;
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying initialization (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return initializeFirebase(retryCount + 1);
            }
            throw new Error('Failed to initialize Firebase after multiple attempts');
        } finally {
            initializationPromise = null;
        }
    })();

    return initializationPromise;
}

// Save score to Firestore with proper validation and better error handling
export async function saveScore(username, { score, level }) {
    try {
        if (!db) {
            await initializeFirebase();
        }
        
        // Validate input data
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            throw new Error('Invalid username');
        }
        if (typeof score !== 'number' || isNaN(score) || score < 0) {
            throw new Error('Invalid score value');
        }
        if (typeof level !== 'number' || isNaN(level) || level < 1) {
            throw new Error('Invalid level value');
        }

        const scoresCollection = collection(db, 'scores');
        const docRef = await addDoc(scoresCollection, {
            username: username.trim().toUpperCase(),
            score,
            level,
            timestamp: new Date().toISOString()
        });
        console.log('Score saved successfully');
        return docRef;
    } catch (error) {
        console.error("Error saving score:", error);
        if (error.message.includes('Invalid')) {
            throw error; // Throw validation errors as is
        }
        throw new Error('Failed to save score. Please try again.');
    }
}

// Get top scores from Firestore with proper error handling
export async function getTopScores() {
    try {
        if (!db) {
            await initializeFirebase();
        }

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
        throw new Error('Failed to load leaderboard. Please try again.');
    }
}

// Test Firebase connection and functionality
async function testFirebaseConnection() {
    try {
        console.log('Testing Firebase connection...');
        console.log('Environment:', window.location.hostname);
        console.log('API URL:', API_BASE_URL);
        
        // Test config fetch
        const response = await fetch(`${API_BASE_URL}/api/firebase-config`);
        if (!response.ok) {
            throw new Error(`Config fetch failed: ${response.status} ${response.statusText}`);
        }
        const config = await response.json();
        console.log('Firebase config fetched successfully');
        
        // Test database initialization
        await initializeFirebase();
        if (!db) {
            throw new Error('Database not initialized after initializeFirebase()');
        }
        console.log('Firebase initialized successfully');
        
        // Test read operation
        const testQuery = query(collection(db, 'scores'), limit(1));
        const snapshot = await getDocs(testQuery);
        console.log('Read operation successful, documents found:', !snapshot.empty);
        
        return {
            success: true,
            message: 'Firebase connection test completed successfully'
        };
    } catch (error) {
        console.error('Firebase connection test failed:', error);
        return {
            success: false,
            message: error.message,
            error: error
        };
    }
}

// Initialize Firebase when the module loads
initializeFirebase()
    .then(() => testFirebaseConnection())
    .then(result => {
        console.log('Firebase initialization test result:', result);
    })
    .catch(console.error);

export { db, testFirebaseConnection }; 