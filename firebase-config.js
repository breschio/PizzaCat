// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBWxbHEI9eRLxFb0eDdNJrnXXk17sJGiRw",
    authDomain: "pizzacat-d0c89.firebaseapp.com",
    projectId: "pizzacat-d0c89",
    storageBucket: "pizzacat-d0c89.firebasestorage.app",
    messagingSenderId: "484007714262",
    appId: "1:484007714262:web:835ce9b54b1133116b9877",
    measurementId: "G-T5MZR5VBZ6"
};

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    // Provide a fallback db object that logs errors
    db = {
        async collection() {
            throw new Error("Firebase not initialized properly");
        }
    };
}

export { db, collection, addDoc, getDocs, query, orderBy, limit }; 