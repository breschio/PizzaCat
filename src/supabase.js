// Supabase client configuration
const supabaseUrl = 'https://vehiztosmLmshraryews.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaGl6dG9zbWxtc2hyYXJ5ZXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NDI1NzMsImV4cCI6MjA1MjMxODU3M30.UKDFgx3EvLmRgqAjz5TXNySEHBmq9BIeZFgLiIT-eNQ';

// Initialize the Supabase client
let supabase = null;

function initSupabaseClient() {
    if (!window.supabase) {
        console.error('Supabase client library not loaded');
        return null;
    }

    if (!supabase) {
        try {
            supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true
                }
            });
            console.log('Supabase client initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            return null;
        }
    }
    return supabase;
}

// Test the connection and verify access
async function testConnection() {
    try {
        const client = initSupabaseClient();
        if (!client) {
            throw new Error('Failed to initialize Supabase client');
        }

        const { data, error } = await client
            .from('scores')
            .select('*')
            .limit(1);
            
        if (error) {
            throw error;
        }
        
        console.log('Supabase connection test successful');
        return true;
    } catch (error) {
        console.error('Error testing Supabase connection:', error);
        return false;
    }
}

// Save a new score
export async function saveScore(username, score, level) {
    try {
        const client = initSupabaseClient();
        if (!client) {
            throw new Error('Supabase client not initialized');
        }

        if (!username?.trim() || typeof score !== 'number' || typeof level !== 'number') {
            throw new Error('Invalid score data');
        }

        const { data, error } = await client
            .from('scores')
            .insert([
                {
                    username: username.trim().toUpperCase(),
                    score,
                    level
                }
            ])
            .select()
            .single();

        if (error) throw error;

        console.log('Score saved successfully:', data);
        return data;
    } catch (error) {
        console.error('Error saving score:', error);
        return null;
    }
}

// Get top scores
export async function getTopScores(limit = 10) {
    try {
        const client = initSupabaseClient();
        if (!client) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error } = await client
            .from('scores')
            .select('*')
            .order('score', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching top scores:', error);
        return [];
    }
}

// Initialize connection on load
testConnection().then(success => {
    if (!success) {
        console.warn('Supabase initialization failed - some features may not work');
    }
});

// Export the client getter
export const getClient = () => {
    const client = initSupabaseClient();
    if (!client) {
        throw new Error('Failed to get Supabase client');
    }
    return client;
}; 