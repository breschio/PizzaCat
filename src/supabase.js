import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabase = null;
let initializationPromise = null;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Determine the API base URL based on the current environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : window.location.origin;

// Initialize Supabase with proper error handling and retries
async function initializeSupabase(retryCount = 0) {
    if (supabase) return supabase;
    
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            console.log('Fetching Supabase configuration...');
            const response = await fetch(`${API_BASE_URL}/api/supabase-config`);
            if (!response.ok) {
                throw new Error(`Failed to fetch Supabase configuration: ${response.status} ${response.statusText}`);
            }
            const config = await response.json();
            
            console.log('Initializing Supabase client...');
            supabase = createClient(config.url, config.anonKey);

            // Test the connection
            try {
                const { data, error } = await supabase
                    .from('scores')
                    .select('*')
                    .limit(1);
                
                if (error) throw error;
                console.log('Supabase connection test successful');
            } catch (testError) {
                console.error('Supabase connection test failed:', testError);
                throw testError;
            }

            return supabase;
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying initialization (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return initializeSupabase(retryCount + 1);
            }
            throw new Error(`Failed to initialize Supabase after ${MAX_RETRIES} attempts: ${error.message}`);
        } finally {
            initializationPromise = null;
        }
    })();

    return initializationPromise;
}

// Save score to Supabase with proper validation and error handling
export async function saveScore(username, { score, level }) {
    try {
        if (!supabase) {
            console.log('Initializing Supabase before saving score...');
            await initializeSupabase();
        }
        
        // Validate input data
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            throw new Error('Invalid username');
        }
        if (typeof score !== 'number' || isNaN(score) || score < 0) {
            throw new Error('Invalid score value');
        }
        if (typeof level !== 'number' || isNaN(level) || level < 1) {
            throw new Error('Invalid level value');
        }

        console.log('Saving score to Supabase...');
        console.log('Data:', { username: username.trim().toUpperCase(), score, level });

        const { data, error } = await supabase
            .from('scores')
            .insert([{
                username: username.trim().toUpperCase(),
                score,
                level,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        
        console.log('Score saved successfully:', data.id);
        return data;
    } catch (error) {
        console.error("Error saving score:", error);
        if (error.message.includes('Invalid')) {
            throw error; // Throw validation errors as is
        }
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
        });
        throw new Error('Failed to save score. Please try again.');
    }
}

// Get top scores from Supabase with proper error handling
export async function getTopScores() {
    try {
        if (!supabase) {
            console.log('Initializing Supabase before getting scores...');
            await initializeSupabase();
        }

        console.log('Fetching top scores...');
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .order('score', { ascending: false })
            .limit(10);

        if (error) throw error;
        
        const scores = data.map(record => ({
            id: record.id,
            username: record.username,
            score: record.score,
            level: record.level,
            timestamp: record.created_at
        }));
        
        console.log('Successfully fetched scores:', scores.length);
        return scores;
    } catch (error) {
        console.error("Error getting scores:", error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
        });
        throw new Error('Failed to load leaderboard. Please try again.');
    }
}

// Subscribe to real-time score updates
export function subscribeToScores(callback) {
    if (!supabase) {
        console.warn('Supabase not initialized. Initializing...');
        initializeSupabase().then(() => {
            setupSubscription();
        });
    } else {
        setupSubscription();
    }

    function setupSubscription() {
        const subscription = supabase
            .channel('scores')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'scores' },
                payload => {
                    console.log('Score update received:', payload);
                    getTopScores().then(callback);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }
}

// Verification function for testing the connection
async function verifySupabaseConnection() {
    try {
        console.log('Verifying Supabase connection...');
        
        // First, check if we can get the config
        const response = await fetch(`${API_BASE_URL}/api/supabase-config`);
        const config = await response.json();
        
        // Log configuration details (safely)
        console.log('Supabase Configuration Check:');
        console.log('- URL:', config.url);
        console.log('- Anon Key:', '•'.repeat(config.anonKey.length - 8) + config.anonKey.slice(-4));
        
        // Test database connection
        if (!supabase) {
            await initializeSupabase();
        }
        
        // Try to write a test record
        const { data: insertData, error: insertError } = await supabase
            .from('connection_tests')
            .insert([{
                test: 'Connection verification',
                environment: window.location.hostname
            }])
            .select()
            .single();

        if (insertError) throw insertError;
        console.log('✅ Successfully wrote test record:', insertData.id);
        
        // Try to read it back
        const { data: readData, error: readError } = await supabase
            .from('connection_tests')
            .select('*')
            .limit(1);

        if (readError) throw readError;
        console.log('✅ Successfully read from Supabase');
        
        // Clean up - delete the test record
        const { error: deleteError } = await supabase
            .from('connection_tests')
            .delete()
            .eq('id', insertData.id);

        if (deleteError) throw deleteError;
        console.log('✅ Successfully deleted test record');
        
        // Additional verification
        console.log('\nVerification Summary:');
        console.log('1. Config Fetch:', '✅ Success');
        console.log('2. Supabase Init:', '✅ Success');
        console.log('3. Write Test:', '✅ Success');
        console.log('4. Read Test:', '✅ Success');
        console.log('5. Cleanup:', '✅ Success');
        
        return true;
    } catch (error) {
        console.error('❌ Supabase verification failed:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
        });
        return false;
    }
}

// Initialize Supabase when the module loads
console.log('Starting Supabase initialization...');
initializeSupabase()
    .then(() => {
        console.log('Supabase initialized successfully');
        return verifySupabaseConnection();
    })
    .then(verified => {
        if (verified) {
            console.log('🎉 Supabase connection fully verified!');
        } else {
            console.error('⚠️ Supabase connection verification failed');
        }
    })
    .catch(error => {
        console.error('Failed to initialize Supabase:', error);
    });

export { supabase, verifySupabaseConnection }; 