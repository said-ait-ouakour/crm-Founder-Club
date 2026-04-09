-- =============================================
-- OMNICHANNEL COMMUNICATION TABLES
-- =============================================

-- Create communication_channels table
CREATE TABLE IF NOT EXISTS communication_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_oauth_tokens table
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    subject TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_contact_or_lead CHECK (contact_id IS NOT NULL OR lead_id IS NOT NULL)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES communication_channels(id),
    direction VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    subject TEXT,
    body TEXT,
    from_address VARCHAR(255),
    to_addresses TEXT[],
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    message_id TEXT,
    thread_id TEXT,
    in_reply_to TEXT,
    has_attachments BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    content_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_configurations table
CREATE TABLE IF NOT EXISTS channel_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES communication_channels(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, config_key)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);

-- Indexes for message_attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- Indexes for user_oauth_tokens
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_id ON user_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_provider ON user_oauth_tokens(provider);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communication_channels
CREATE POLICY "Enable read access for all users" 
ON communication_channels 
FOR SELECT 
USING (true);

-- RLS Policies for user_oauth_tokens
CREATE POLICY "Users can manage their own OAuth tokens" 
ON user_oauth_tokens 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their assigned conversations" 
ON conversations 
FOR SELECT 
USING (auth.uid() = assigned_to OR auth.uid() IN (
    SELECT user_id FROM user_oauth_tokens WHERE is_active = true
));

CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON messages 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.assigned_to = auth.uid() OR 
         auth.uid() IN (SELECT user_id FROM user_oauth_tokens WHERE is_active = true))
));

CREATE POLICY "Users can insert messages" 
ON messages 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for message_attachments
CREATE POLICY "Users can view attachments for messages they can see" 
ON message_attachments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM messages 
    WHERE messages.id = message_attachments.message_id
    AND EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND (conversations.assigned_to = auth.uid() OR 
             auth.uid() IN (SELECT user_id FROM user_oauth_tokens WHERE is_active = true))
    )
));

-- RLS Policies for channel_configurations
CREATE POLICY "Enable read access for all authenticated users" 
ON channel_configurations 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_communication_channels_modtime
BEFORE UPDATE ON communication_channels
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_oauth_tokens_modtime
BEFORE UPDATE ON user_oauth_tokens
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_conversations_modtime
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_messages_modtime
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_channel_configurations_modtime
BEFORE UPDATE ON channel_configurations
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Function to update last_message_at in conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last_message_at
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default communication channels
INSERT INTO communication_channels (name, description, is_active)
VALUES 
    ('email', 'Email communication channel', true),
    ('sms', 'SMS messaging channel', true),
    ('whatsapp', 'WhatsApp messaging channel', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE communication_channels IS 'Stores different communication channels available in the system';
COMMENT ON TABLE user_oauth_tokens IS 'Stores OAuth tokens for external service authentication';
COMMENT ON TABLE conversations IS 'Tracks communication threads between users and contacts/leads';
COMMENT ON TABLE messages IS 'Stores individual messages in conversations';
COMMENT ON TABLE message_attachments IS 'Stores file attachments for messages';
COMMENT ON TABLE channel_configurations IS 'Stores configuration settings for each communication channel';

-- =============================================
-- GRANTS (if needed for service roles)
-- =============================================
-- Uncomment and modify these as needed based on your Supabase setup
-- GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;