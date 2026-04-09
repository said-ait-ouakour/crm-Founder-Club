-- Create linkedin_messages table for storing LinkedIn conversation messages
CREATE TABLE IF NOT EXISTS linkedin_messages (
    id BIGSERIAL PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_id VARCHAR(255),
    chat_id VARCHAR(255),
    sender_id VARCHAR(255),
    is_inbound BOOLEAN DEFAULT false,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Fields for tracking sender (outbound messages)
    sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_via_account_id VARCHAR(255),
    linkedin_attendee_id VARCHAR(255),
    -- Fields for tracking receiver (inbound messages)
    received_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    received_via_account_id VARCHAR(255)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_lead_id ON linkedin_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_chat_id ON linkedin_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_message_id ON linkedin_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_created_at ON linkedin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_is_inbound ON linkedin_messages(is_inbound);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_by_user_id ON linkedin_messages(sent_by_user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_via_account_id ON linkedin_messages(sent_via_account_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_received_by_user_id ON linkedin_messages(received_by_user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_received_via_account_id ON linkedin_messages(received_via_account_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_linkedin_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_linkedin_messages_updated_at ON linkedin_messages;
CREATE TRIGGER trigger_linkedin_messages_updated_at
    BEFORE UPDATE ON linkedin_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_linkedin_messages_updated_at();

-- Enable RLS
ALTER TABLE linkedin_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for linkedin_messages
CREATE POLICY "Users can view LinkedIn messages" 
ON linkedin_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert LinkedIn messages" 
ON linkedin_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update LinkedIn messages" 
ON linkedin_messages 
FOR UPDATE 
USING (true);

-- Add comment for documentation
COMMENT ON TABLE linkedin_messages IS 'Stores LinkedIn messages sent/received via Unipile integration';
