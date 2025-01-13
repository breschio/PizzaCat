-- Enable Row Level Security
ALTER TABLE IF EXISTS scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS connection_tests ENABLE ROW LEVEL SECURITY;

-- Create scores table
CREATE TABLE IF NOT EXISTS scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    level INTEGER NOT NULL CHECK (level > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create connection_tests table for monitoring
CREATE TABLE IF NOT EXISTS connection_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL,
    environment TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS scores_username_idx ON scores(username);
CREATE INDEX IF NOT EXISTS scores_score_idx ON scores(score DESC);
CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores(created_at DESC);

-- Create updated_at trigger for scores table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_scores_updated_at ON scores;

-- Create trigger
CREATE TRIGGER update_scores_updated_at
    BEFORE UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Security Policies

-- Scores table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON scores;
DROP POLICY IF EXISTS "Enable insert for all users" ON scores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scores;

CREATE POLICY "Enable read access for all users" ON scores
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users" ON scores
    FOR INSERT
    WITH CHECK (
        -- Basic validation
        username IS NOT NULL AND
        length(username) > 0 AND
        score >= 0 AND
        level > 0
    );

-- Connection tests table policies
DROP POLICY IF EXISTS "Enable insert for all users" ON connection_tests;
CREATE POLICY "Enable insert for all users" ON connection_tests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for all users" ON connection_tests;
CREATE POLICY "Enable read for all users" ON connection_tests
    FOR SELECT USING (true);

-- Clean up old connection tests function (can be called manually)
CREATE OR REPLACE FUNCTION cleanup_old_connection_tests()
RETURNS void AS $$
BEGIN
    DELETE FROM connection_tests
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create function to get top scores
CREATE OR REPLACE FUNCTION get_top_scores(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    username TEXT,
    score INTEGER,
    level INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.username, s.score, s.level, s.created_at
    FROM scores s
    ORDER BY s.score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Verify policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'scores';

-- Verify RLS is enabled
SELECT
    relname,
    relrowsecurity
FROM pg_class
WHERE relname = 'scores'; 