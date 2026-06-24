-- Create table
CREATE TABLE cohere_api_keys (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_name VARCHAR(50) NOT NULL UNIQUE,
    request_count INT NOT NULL DEFAULT 0,
    
    CONSTRAINT chk_request_count
    CHECK (request_count >= 0 AND request_count <= 1000)
);

-- Insert records
INSERT INTO cohere_api_keys (api_key_name, request_count)
VALUES
    ('COHERE_API_KEY_2', 1000),
    ('COHERE_API_KEY_3', 0),
    ('COHERE_API_KEY_4', 0),
    ('COHERE_API_KEY_5', 0);


ALTER TABLE cohere_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated admins can access
CREATE POLICY "Admins can manage cohere_api_keys"
ON cohere_api_keys
FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
);


-- Function to reset all API key request counts
CREATE OR REPLACE FUNCTION reset_all_api_key_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE cohere_api_keys
    SET request_count = 0;
END;
$$;

-- Cron job: runs monthly on the 1st at 00:00
SELECT cron.schedule(
    'monthly-reset-all-api-key-counts',
    '0 0 1 * *',
    $$SELECT reset_all_api_key_counts();$$
);