import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabaseInstance = null;
let initializationPromise = null;

async function initializeSupabase() {
    try {
        // Get the base URL for the API based on environment
        const apiBaseUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : window.location.origin;
        
        console.log('Fetching Supabase config from:', apiBaseUrl);
        
        // Add retry logic for production environment
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`${apiBaseUrl}/api/supabase-config`, {
                    credentials: window.location.hostname === 'localhost' ? 'include' : 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch Supabase config: ${response.status} ${response.statusText}`);
                }

                const config = await response.json();
                console.log('Supabase config fetched successfully');

                if (!config.url || !config.anonKey) {
                    throw new Error('Invalid Supabase configuration received');
                }

                // Initialize Supabase client with correct property names
                supabaseInstance = createClient(config.url, config.anonKey, {
                    auth: {
                        persistSession: false
                    },
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                });

                // Test connection
                const { data, error } = await supabaseInstance
                    .from('connection_tests')
                    .insert({
                        client_id: crypto.randomUUID(),
                        environment: window.location.hostname === 'localhost' ? 'development' : 'production',
                        status: 'connected'
                    });

                if (error) {
                    throw new Error(`Connection test failed: ${error.message}`);
                }

                console.log('Supabase initialized successfully');
                return supabaseInstance;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                lastError = error;
                
                if (attempt < maxRetries) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        
        // If we get here, all retries failed
        throw lastError || new Error('Failed to initialize Supabase after multiple attempts');
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        throw error;
    }
}

export async function getSupabase() {
    if (supabaseInstance) {
        return supabaseInstance;
    }

    if (!initializationPromise) {
        initializationPromise = initializeSupabase();
    }

    return initializationPromise;
}

export async function saveScore(username, score, level) {
    try {
        // Input validation
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            throw new Error('Invalid username');
        }
        if (!Number.isInteger(score) || score < 0) {
            throw new Error('Invalid score');
        }
        if (!Number.isInteger(level) || level <= 0) {
            throw new Error('Invalid level');
        }

        const supabase = await getSupabase();
        
        const { data, error } = await supabase
            .from('scores')
            .insert({
                username: username.trim().toUpperCase(),
                score,
                level
            });

        if (error) {
            throw new Error(`Failed to save score: ${error.message}`);
        }

        console.log('Score saved successfully:', { username, score, level });
        return data;
    } catch (error) {
        console.error('Error saving score:', error);
        throw error;
    }
}

export async function getTopScores(limit = 10) {
    try {
        const supabase = await getSupabase();
        
        const { data, error } = await supabase
            .rpc('get_top_scores', { limit_count: limit });

        if (error) {
            throw new Error(`Failed to fetch top scores: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching top scores:', error);
        throw error;
    }
}

// Subscribe to real-time score updates
export async function subscribeToScores(callback) {
    try {
        const supabase = await getSupabase();
        
        const subscription = supabase
            .channel('scores')
            .on('postgres_changes', 
                {
                    event: '*',
                    schema: 'public',
                    table: 'scores'
                },
                (payload) => {
                    console.log('Score update received:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    } catch (error) {
        console.error('Error setting up score subscription:', error);
        throw error;
    }
} 