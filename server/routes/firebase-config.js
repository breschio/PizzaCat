const express = require('express');
const router = express.Router();

router.get('/api/firebase-config', (req, res) => {
    // Only send the necessary public configuration
    // These values should be set in environment variables
    const config = {
        apiKey: process.env.FIREBASE_PUBLIC_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };

    // Validate that all required configuration values are present
    const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
    const missingKeys = requiredKeys.filter(key => !config[key]);

    if (missingKeys.length > 0) {
        console.error('Missing required Firebase configuration:', missingKeys);
        return res.status(500).json({ 
            error: 'Server configuration error',
            message: 'Firebase configuration is incomplete'
        });
    }

    res.json(config);
});

module.exports = router; 