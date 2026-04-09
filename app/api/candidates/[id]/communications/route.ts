import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Fetch all communication data for the candidate
    const [
      emailMessages,
      smsWhatsappMessages,
      calls
    ] = await Promise.all([
      // Email messages
      supabase
        .from('candidate_email_messages')
        .select(`
          *,
          candidates_conversation!inner(
            candidate_id
          )
        `)
        .eq('candidates_conversation.candidate_id', id)
        .order('created_at', { ascending: false }),
      
      // SMS and WhatsApp messages
      supabase
        .from('candidates_sms_whatsapp_conversations')
        .select('*')
        .eq('candidate_id', id)
        .order('sent_at', { ascending: false }),
      
      // Calls (assuming there's a calls table for candidates)
      supabase
        .from('candidate_calls')
        .select('*')
        .eq('candidate_id', id)
        .order('created_at', { ascending: false })
    ]);

    // Combine and sort all communications by timestamp
    const allCommunications = [
      ...(emailMessages.data || []).map(msg => ({
        id: `email-${msg.id}`,
        type: 'email',
        timestamp: msg.created_at,
        content: msg.content,
        subject: msg.subject,
        // Normalize direction to lowercase for consistency
        direction: (msg.direction || '').toLowerCase() === 'outbound' ? 'outbound' : 'inbound',
        status: msg.status,
        open_count: msg.open_count,
        clicks_count: msg.clicks_count,
        marked_as_spam: msg.marked_as_spam,
        unsubscribed: msg.unsubscribed
      })),
      ...(smsWhatsappMessages.data || []).map(msg => ({
        id: `sms-whatsapp-${msg.id}`,
        type: msg.message_type.toLowerCase(),
        timestamp: msg.sent_at,
        content: msg.message_text,
        direction: msg.is_inbound ? 'inbound' : 'outbound',
        status: msg.message_status,
        response_time_seconds: msg.response_time_seconds
      })),
      ...(calls.data || []).map(call => ({
        id: `call-${call.id}`,
        type: 'call',
        timestamp: call.created_at,
        content: call.summary || call.analysis || 'Call made',
        direction: 'outbound',
        status: call.call_status,
        duration: call.duration,
        call_ended_reason: call.call_ended_reason,
        // Include all call details for display
        call_details: {
          summary: call.summary,
          analysis: call.analysis,
          transcript: call.transcript,
          call_score: call.call_score,
          advisor_name: call.advisor_name,
          feedback_agreement: call.feedback_agreement,
          feedback_score: call.feedback_score,
          terry_feedback: call.terry_feedback,
          candidate_sentiment: call.candidate_sentiment,
          candidate_interest_level: call.candidate_interest_level,
          candidate_engagement_style: call.candidate_engagement_style,
          ai_comfort_level: call.ai_comfort_level,
          qualification_strength: call.qualification_strength,
          sales_readiness: call.sales_readiness,
          earnings_expectation_alignment: call.earnings_expectation_alignment,
          communication_quality: call.communication_quality,
          recommended_next_action: call.recommended_next_action,
          risk_flags: call.risk_flags,
          motivation_drivers: call.motivation_drivers
        }
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ 
      data: allCommunications,
      emailCount: emailMessages.data?.length || 0,
      smsCount: smsWhatsappMessages.data?.filter(msg => msg.message_type === 'SMS').length || 0,
      whatsappCount: smsWhatsappMessages.data?.filter(msg => msg.message_type === 'WhatsApp').length || 0,
      callsCount: calls.data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching candidate communications:', error);
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 });
  }
}
