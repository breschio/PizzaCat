-- Insert a test score
INSERT INTO scores (username, score, level)
VALUES ('TEST_USER', 1000, 1);

-- Query using our function
SELECT * FROM get_top_scores(5);

-- Verify the trigger works
UPDATE scores 
SET score = 1500 
WHERE username = 'TEST_USER';

-- Check the updated_at timestamp changed
SELECT username, score, created_at, updated_at 
FROM scores 
WHERE username = 'TEST_USER'; 