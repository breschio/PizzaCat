import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { expressjwt as expressJwt } from 'express-jwt';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = NODE_ENV === 'production' 
    ? ['https://pizzacat.surf'] 
    : ['http://localhost:8000', 'http://localhost:3000'];

// Security middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
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

// Endpoint to provide Firebase configuration
app.get('/api/firebase-config', (req, res) => {
    try {
        if (!process.env.API_KEY || !process.env.PROJECT_ID) {
            throw new Error('Missing required Firebase configuration');
        }

        res.json({
            apiKey: process.env.API_KEY,
            authDomain: process.env.AUTH_DOMAIN,
            projectId: process.env.PROJECT_ID,
            storageBucket: process.env.STORAGE_BUCKET,
            messagingSenderId: process.env.MESSAGING_SENDER_ID,
            appId: process.env.APP_ID
        });
    } catch (error) {
        console.error('Error serving Firebase config:', error);
        res.status(500).json({ error: 'Could not retrieve Firebase configuration' });
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