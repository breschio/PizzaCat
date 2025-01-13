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
const ALLOWED_ORIGINS = NODE_ENV === 'production' 
    ? ['https://pizzacat.surf'] 
    : ['http://localhost:8000', 'http://localhost:3000'];

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: [
                "'self'",
                process.env.SUPABASE_URL,
                "wss://*.supabase.co"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://esm.sh"
            ],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:", "data:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));
app.use(express.json());

// Rate limiting for configuration endpoint
const configLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // limit each IP to 10 requests per windowMs for this endpoint
});

// General rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// JWT authentication middleware
const authenticate = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256']
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Supabase configuration endpoint with additional security
app.get('/api/supabase-config', configLimiter, (req, res) => {
    try {
        // Log access attempts in development
        if (NODE_ENV === 'development') {
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
            'Surrogate-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
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

// Authentication endpoint
app.post('/api/login', (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const token = jwt.sign(
            { username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log('Allowed origins:', ALLOWED_ORIGINS);
});