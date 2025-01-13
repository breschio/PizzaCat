import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabaseInstance = null;
let initializationPromise = null;

async function initializeSupabase() {
    try {
        // Get the base URL for the API based on environment
        const apiBaseUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : 'https://pizzacat.surf';  // Use the production domain directly
        
        console.log('Fetching Supabase config from:', apiBaseUrl);
        
        // Add retry logic for production environment
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`${apiBaseUrl}/api/supabase-config`, {
                    credentials: 'same-origin',  // Always use same-origin for consistency
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch Supabase config (${response.status} ${response.statusText}): ${errorText}`);
                }

                const config = await response.json();
                console.log('Supabase config fetched successfully');

                if (!config.url || !config.anonKey) {
                    console.error('Invalid config received:', config);
                    throw new Error('Invalid Supabase configuration received: missing url or anonKey');
                }

                // Initialize Supabase client with correct property names
                supabaseInstance = createClient(config.url, config.anonKey, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    },
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                });

                // Test connection
                console.log('Testing Supabase connection before initialization...');
                await testSupabaseConnection(supabaseInstance);
                
                console.log('Supabase initialized and tested successfully');
                return supabaseInstance;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                lastError = error;
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`Retrying in ${delay/1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
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

// Add connection test function
async function testSupabaseConnection(supabase) {
    console.log('Testing Supabase connection...');
    
    try {
        // Test 1: Basic connection
        const { data: healthCheck, error: healthError } = await supabase
            .from('scores')
            .select('count(*)')
            .limit(1);
            
        if (healthError) {
            console.error('Failed to read scores:', healthError);
            throw new Error('Read permission check failed');
        }
        console.log('✓ Read permissions verified');

        // Test 2: Insert permission test with dummy data
        const testScore = {
            username: 'TEST_USER',
            score: 0,
            level: 1
        };

        const { data: insertData, error: insertError } = await supabase
            .from('scores')
            .insert([testScore])
            .select();

        if (insertError) {
            console.error('Failed to insert test score:', insertError);
            throw new Error('Insert permission check failed');
        }
        console.log('✓ Insert permissions verified');

        // Test 3: Clean up test data
        if (insertData && insertData[0]?.id) {
            const { error: deleteError } = await supabase
                .from('scores')
                .delete()
                .eq('id', insertData[0].id);

            if (deleteError) {
                console.warn('Warning: Could not clean up test data:', deleteError);
            } else {
                console.log('✓ Test data cleaned up');
            }
        }

        console.log('All Supabase connection tests passed!');
        return true;
    } catch (error) {
        console.error('Supabase connection test failed:', error);
        throw error;
    }
} 