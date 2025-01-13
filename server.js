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
    ? ['https://pizzacat.surf', 'https://www.pizzacat.surf'] 
    : ['http://localhost:8000', 'http://localhost:3000', 'http://localhost:5000'];

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files in production
if (NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname)));
    
    // Ensure all API routes are prefixed with /api
    const apiRouter = express.Router();
    
    // Move Supabase config endpoint to API router
    apiRouter.get('/supabase-config', configLimiter, (req, res) => {
        try {
            // Log access attempts in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`Supabase config requested from: ${req.ip}`);
                console.log('Origin:', req.get('origin'));
                console.log('Headers:', req.headers);
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

            // Return Supabase configuration with consistent property names
            res.json({
                url: process.env.SUPABASE_URL,
                anonKey: process.env.SUPABASE_ANON_KEY
            });
        } catch (error) {
            console.error('Error serving Supabase config:', error);
            res.status(500).json({ 
                error: 'Could not retrieve Supabase configuration',
                message: NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // Move login endpoint to API router
    apiRouter.post('/login', (req, res) => {
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

    // Mount API router
    app.use('/api', apiRouter);

    // Serve index.html for all other routes in production
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    });
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: [
                "'self'",
                "https://pizzacat.surf",
                "https://www.pizzacat.surf",
                process.env.SUPABASE_URL,
                "wss://*.supabase.co",
                "https://*.supabase.co",
                ...(NODE_ENV === 'development' ? ['http://localhost:*'] : [])
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://esm.sh",
                "https://*.supabase.co"
            ],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
            frameSrc: ["'self'", "https://*.supabase.co"]
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
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if the origin is allowed
        if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            console.error(`CORS error: ${origin} not allowed`);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type']
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        env: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log('Allowed origins:', ALLOWED_ORIGINS);
});