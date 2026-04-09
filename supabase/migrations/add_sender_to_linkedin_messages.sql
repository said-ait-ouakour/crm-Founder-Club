-- Add sender tracking columns to linkedin_messages table (for outbound messages)
ALTER TABLE linkedin_messages 
ADD COLUMN IF NOT EXISTS sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE linkedin_messages 
ADD COLUMN IF NOT EXISTS sent_via_account_id VARCHAR(255);

ALTER TABLE linkedin_messages 
ADD COLUMN IF NOT EXISTS linkedin_attendee_id VARCHAR(255);

-- Add receiver tracking columns (for inbound messages)
ALTER TABLE linkedin_messages 
ADD COLUMN IF NOT EXISTS received_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE linkedin_messages 
ADD COLUMN IF NOT EXISTS received_via_account_id VARCHAR(255);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_by_user_id ON linkedin_messages(sent_by_user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_via_account_id ON linkedin_messages(sent_via_account_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_received_by_user_id ON linkedin_messages(received_by_user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_received_via_account_id ON linkedin_messages(received_via_account_id);

-- Add comments for documentation
COMMENT ON COLUMN linkedin_messages.sent_by_user_id IS 'The CRM user who sent this message (NULL for inbound messages)';
COMMENT ON COLUMN linkedin_messages.sent_via_account_id IS 'The Unipile account ID used to send this message';
COMMENT ON COLUMN linkedin_messages.linkedin_attendee_id IS 'The LinkedIn attendee/profile ID of the lead in the conversation';
COMMENT ON COLUMN linkedin_messages.received_by_user_id IS 'The CRM user who received this message (NULL for outbound messages)';
COMMENT ON COLUMN linkedin_messages.received_via_account_id IS 'The Unipile account ID that received this message';
