import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactEmail = searchParams.get('contactEmail');
  const userId = searchParams.get('userId');

  if (!contactEmail || !userId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }


  try {
    // Create a client with service role key for authenticated access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get messages where the user is the sender and contact is in the recipients
    const { data: sentMessages, error: sentError } = await supabase
      .from('messages')
      .select(`
        *,
        attachments:message_attachments(*)
      `)
      .eq('from_address', userId)
      .contains('to_addresses', [contactEmail])
      .order('sent_at', { ascending: false });

    if (sentError) throw sentError;

    // Get messages where the contact is the sender and user is in the recipients
    const { data: receivedMessages, error: receivedError } = await supabase
      .from('messages')
      .select(`
        *,
        attachments:message_attachments(*)
      `)
      .eq('from_address', contactEmail)
      .contains('to_addresses', [userId])
      .order('sent_at', { ascending: false });

    if (receivedError) throw receivedError;

    // Combine and sort all messages by date
    const allMessages = [...(sentMessages || []), ...(receivedMessages || [])]
      .sort((a, b) => 
        new Date(b.sent_at || b.created_at).getTime() - 
        new Date(a.sent_at || a.created_at).getTime()
      );

    return NextResponse.json({ messages: allMessages });
  } catch (error) {
    console.error('Error fetching message history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message history' },
      { status: 500 }
    );
  }
}
