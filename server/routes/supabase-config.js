const express = require('express');
const router = express.Router();

router.get('/api/supabase-config', (req, res) => {
    try {
        // Log access attempts in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`Supabase config requested from: ${req.ip}`);
        }

        // Validate required environment variables
        const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('Missing required environment variables:', missingVars);
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Supabase configuration is incomplete'
            });
        }

        // Set security headers
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });

        // Return only the necessary Supabase configuration
        res.json({
            url: process.env.SUPABASE_URL,
            anonKey: process.env.SUPABASE_ANON_KEY
        });
    } catch (error) {
        console.error('Error serving Supabase config:', error);
        res.status(500).json({ error: 'Could not retrieve Supabase configuration' });
    }
});

module.exports = router; 