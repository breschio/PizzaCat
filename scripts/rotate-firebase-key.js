import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function rotateFirebaseKey() {
    try {
        console.log('Starting Firebase API key rotation...');
        
        // Load current environment variables
        dotenv.config();
        
        // Backup current .env file
        const envPath = path.join(__dirname, '..', '.env');
        const backupPath = path.join(__dirname, '..', '.env.backup');
        
        await fs.copyFile(envPath, backupPath);
        console.log('Created backup of current .env file');

        console.log('\nIMPORTANT: Please follow these steps:');
        console.log('1. Go to Firebase Console (https://console.firebase.google.com)');
        console.log('2. Select your project: pizzacat-d0c89');
        console.log('3. Go to Project Settings');
        console.log('4. Under "Web API Key", click "Rotate key"');
        console.log('5. Copy the new API key');
        console.log('6. Update the API_KEY in your .env file');
        console.log('7. Deploy the updated configuration');
        console.log('\nNote: Keep both keys active for a short period to prevent service disruption');
        console.log('After confirming everything works, you can disable the old key.\n');
        
    } catch (error) {
        console.error('Error during key rotation:', error);
        process.exit(1);
    }
}

// Run the rotation script
rotateFirebaseKey(); 