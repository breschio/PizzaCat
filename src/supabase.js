import { createClient } from 'https://esm.sh/@supabase/supabase-js';

let supabaseInstance = null;
let initializationPromise = null;

async function initializeSupabase() {
    try {
        // Determine API base URL based on environment
        const apiBaseUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : 'https://pizzacat.surf';
        console.log('Using API base URL:', apiBaseUrl);

        const response = await fetch(`${apiBaseUrl}/api/supabase-config`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Supabase config: ${response.status} ${response.statusText}`);
        }

        const config = await response.json();
        console.log('Supabase configuration fetched successfully');

        supabaseInstance = createClient(config.url, config.anonKey);
        
        // Test the connection
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

        console.log('Supabase initialized and connection verified');
        return supabaseInstance;
    } catch (error) {
        console.error('Supabase initialization failed:', error);
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