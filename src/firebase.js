import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, connectFirestoreEmulator, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;
let initializationPromise = null;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Determine the API base URL based on the current environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : window.location.origin; // Use the same origin for production

// Initialize Firebase with proper error handling and retries
async function initializeFirebase(retryCount = 0) {
    if (db) return db;
    
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            console.log('Fetching Firebase configuration...');
            const response = await fetch(`${API_BASE_URL}/api/firebase-config`);
            if (!response.ok) {
                throw new Error(`Failed to fetch Firebase configuration: ${response.status} ${response.statusText}`);
            }
            const config = await response.json();
            
            console.log('Initializing Firebase app...');
            const app = initializeApp(config);
            db = getFirestore(app);

            // Use emulator in development
            if (window.location.hostname === 'localhost') {
                connectFirestoreEmulator(db, 'localhost', 8080);
            }

            // Test the connection
            try {
                const testQuery = query(collection(db, 'scores'), limit(1));
                await getDocs(testQuery);
                console.log('Firebase connection test successful');
            } catch (testError) {
                console.error('Firebase connection test failed:', testError);
                throw testError;
            }

            return db;
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying initialization (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return initializeFirebase(retryCount + 1);
            }
            throw new Error(`Failed to initialize Firebase after ${MAX_RETRIES} attempts: ${error.message}`);
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
            console.log('Initializing Firebase before saving score...');
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

        console.log('Saving score to Firestore...');
        console.log('Data:', { username: username.trim().toUpperCase(), score, level });

        const scoresCollection = collection(db, 'scores');
        const docRef = await addDoc(scoresCollection, {
            username: username.trim().toUpperCase(),
            score,
            level,
            timestamp: new Date().toISOString()
        });
        
        console.log('Score saved successfully:', docRef.id);
        return docRef;
    } catch (error) {
        console.error("Error saving score:", error);
        if (error.message.includes('Invalid')) {
            throw error; // Throw validation errors as is
        }
        // Log more details about the error
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw new Error('Failed to save score. Please try again.');
    }
}

// Get top scores from Firestore with proper error handling
export async function getTopScores() {
    try {
        if (!db) {
            console.log('Initializing Firebase before getting scores...');
            await initializeFirebase();
        }

        console.log('Fetching top scores...');
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
        
        console.log('Successfully fetched scores:', scores.length);
        return scores;
    } catch (error) {
        console.error("Error getting scores:", error);
        // Log more details about the error
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw new Error('Failed to load leaderboard. Please try again.');
    }
}

// Add this after the initialization code
async function verifyFirebaseConnection() {
    try {
        console.log('Verifying Firebase connection...');
        
        // First, check if we can get the config
        const response = await fetch(`${API_BASE_URL}/api/firebase-config`);
        const config = await response.json();
        console.log('Received config with API key:', config.apiKey.substring(0, 6) + '...');
        
        // Test Firestore connection
        if (!db) {
            await initializeFirebase();
        }
        
        // Try to write a test document
        const testCollection = collection(db, 'connection_tests');
        const testDoc = await addDoc(testCollection, {
            timestamp: new Date().toISOString(),
            test: 'Connection verification'
        });
        console.log('✅ Successfully wrote test document:', testDoc.id);
        
        // Try to read it back
        const testRead = await getDocs(query(testCollection, limit(1)));
        console.log('✅ Successfully read from Firestore');
        
        // Clean up - delete the test document
        // Note: We'll need to import deleteDoc
        await deleteDoc(testDoc);
        console.log('✅ Successfully deleted test document');
        
        return true;
    } catch (error) {
        console.error('❌ Firebase verification failed:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        return false;
    }
}

// Update imports at the top of the file
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    connectFirestoreEmulator,
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Update the initialization to include verification
console.log('Starting Firebase initialization...');
initializeFirebase()
    .then(() => {
        console.log('Firebase initialized successfully');
        return verifyFirebaseConnection();
    })
    .then(verified => {
        if (verified) {
            console.log('🎉 Firebase connection fully verified!');
        } else {
            console.error('⚠️ Firebase connection verification failed');
        }
    })
    .catch(error => {
        console.error('Failed to initialize Firebase:', error);
    });

export { db, verifyFirebaseConnection }; 