// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;

fetch('http://localhost:3000/api/firebase-config')
    .then(response => response.json())
    .then(config => {
        // Initialize Firebase with the config
        const app = initializeApp(config);
        db = getFirestore(app);
    })
    .catch(error => {
        console.error('Error fetching Firebase config:', error);
    });

// Export the Firestore instance
export { db, collection, addDoc, getDocs, query, orderBy, limit };