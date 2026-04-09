-- Add is_active column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Update all existing records to TRUE
UPDATE users 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_user_id_is_active ON users(user_id, is_active);


