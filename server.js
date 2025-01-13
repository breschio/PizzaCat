import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { expressjwt as expressJwt } from 'express-jwt';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only allow localhost origins since this is development only
const ALLOWED_ORIGINS = ['http://localhost:8000', 'http://localhost:3000', 'http://localhost:5000'];

// Basic middleware
app.use(express.json());

// Simplified CORS for local development
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Basic rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Create API Router
const apiRouter = express.Router();

// Supabase config endpoint (development only)
apiRouter.get('/supabase-config', (req, res) => {
    try {
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

        res.json({
            url: process.env.SUPABASE_URL,
            anonKey: process.env.SUPABASE_ANON_KEY
        });
    } catch (error) {
        console.error('Error serving Supabase config:', error);
        res.status(500).json({ 
            error: 'Could not retrieve Supabase configuration',
            message: error.message
        });
    }
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        env: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Mount API router
app.use('/api', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
    console.log(`Development server running on port ${PORT}`);
    console.log('Allowed origins:', ALLOWED_ORIGINS);
});