-- Add linkedin_account_id to users for traceability (LinkedIn provider_id of the connected account owner)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS linkedin_account_id TEXT;

COMMENT ON COLUMN users.linkedin_account_id IS 'LinkedIn provider_id of the connected user (from Unipile), for traceability alongside unipile_account_id';
