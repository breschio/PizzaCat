const express = require('express');
const router = express.Router();

router.get('/api/firebase-config', (req, res) => {
    // Only send the necessary public configuration
    // These values are set in environment variables
    const config = {
        apiKey: process.env.API_KEY,
        authDomain: process.env.AUTH_DOMAIN,
        projectId: process.env.PROJECT_ID,
        storageBucket: process.env.STORAGE_BUCKET,
        messagingSenderId: process.env.MESSAGING_SENDER_ID,
        appId: process.env.APP_ID
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