import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabaseInstance = null;
let initializationPromise = null;

async function initializeSupabase() {
    try {
        let config;
        const isDevelopment = window.location.hostname === 'localhost';

        if (isDevelopment) {
            // In development, fetch config from local API
            const apiBaseUrl = 'http://localhost:3000';
            console.log('Development mode: Fetching Supabase config from:', apiBaseUrl);
            
            const response = await fetch(`${apiBaseUrl}/api/supabase-config`, {
                credentials: 'omit',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch Supabase config: ${response.status} ${response.statusText}`);
            }

            config = await response.json();
        } else {
            // In production, use the public Supabase configuration
            // These are public anon keys, specifically meant for client-side use
            console.log('Production mode: Using Supabase config');
            config = {
                url: 'https://iqhzxqhwqhgzuondvvmz.supabase.co',
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaHp4cWh3cWhnenVvbmR2dm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc0MzQzMTcsImV4cCI6MjAyMzAxMDMxN30.IqLF9y8tsaQyKrwKvXgtU-vLYgN8aD_C1yxY9bZnOVM'
            };
            
            // Only log in non-production environments
            if (window.location.hostname !== 'pizzacat.surf') {
                console.log('Using Supabase URL:', config.url);
            }
        }

        if (!config.url || !config.anonKey) {
            throw new Error('Invalid Supabase configuration: missing url or anonKey');
        }

        // Initialize Supabase client
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
        console.log('Testing Supabase connection...');
        await testSupabaseConnection(supabaseInstance);
        
        console.log('Supabase initialized successfully');
        return supabaseInstance;
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
        // Test 1: Basic connection - just count all rows
        const { count, error: countError } = await supabase
            .from('scores')
            .select('*', { count: 'exact', head: true });
            
        if (countError) {
            console.error('Failed to read scores:', countError);
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