import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { expressjwt as expressJwt } from 'express-jwt';
import cors from 'cors';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to protect the endpoint
const authenticate = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256']
});

// Enable CORS for specific origin
app.use(cors({
    origin: ['http://localhost:8000', 'https://pizzacat.surf']
}));

console.log('Allowed origins:', ['http://localhost:8000', 'https://pizzacat.surf']);

// Endpoint to provide Firebase configuration
app.get('/api/firebase-config', (req, res) => {
    res.json({
        apiKey: process.env.API_KEY,
        authDomain: process.env.AUTH_DOMAIN,
        projectId: process.env.PROJECT_ID,
        storageBucket: process.env.STORAGE_BUCKET,
        messagingSenderId: process.env.MESSAGING_SENDER_ID,
        appId: process.env.APP_ID
    });
});

app.post('/api/login', (req, res) => {
    // Replace this with your actual user authentication logic
    const user = { id: 1, username: 'user' };

    // Generate a token
    const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});