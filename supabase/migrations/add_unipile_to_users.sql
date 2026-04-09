-- Add Unipile account ID column to users table for LinkedIn connection
ALTER TABLE users ADD COLUMN IF NOT EXISTS unipile_account_id VARCHAR(255);

-- Create index for faster lookups by unipile_account_id
CREATE INDEX IF NOT EXISTS idx_users_unipile_account_id ON users(unipile_account_id);

-- Add comment for documentation
COMMENT ON COLUMN users.unipile_account_id IS 'Unipile account ID for LinkedIn integration - stores the connected LinkedIn account identifier';
