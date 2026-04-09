-- Add linkedin_invite_accepted column to leads table
-- Tracks whether the lead has accepted a LinkedIn connection invitation
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_invite_accepted BOOLEAN DEFAULT FALSE;

-- Optional: Add index for filtering leads by invite acceptance status
CREATE INDEX IF NOT EXISTS idx_leads_linkedin_invite_accepted ON leads (linkedin_invite_accepted) WHERE linkedin_invite_accepted = TRUE;
