import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type EmailMsg = { id: number; created_at: string | null; direction: string | null; status: string | null };
type SmsWaMsg = { id: string; sent_at: string | null; is_inbound: boolean; message_status: string | null; message_type: 'SMS' | 'WhatsApp' };
type Call = { id: number; created_at?: string | null; direction?: string | null; status?: string | null };

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const candidateIdsParam = searchParams.get('candidate_ids');
    const messageCountFilter = searchParams.get('message_count'); // e.g. gte:3, eq:0
    const responseStatusFilter = searchParams.get('response_status'); // responded | no_response
    const responseChannelFilter = searchParams.get('response_channel'); // email | sms | whatsapp | calls

    if (!candidateIdsParam) {
      return NextResponse.json({ error: 'candidate_ids parameter is required' }, { status: 400 });
    }

    const candidateIds = candidateIdsParam
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id));

    if (candidateIds.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // For each candidate, collect:
    // - conversation ids (from candidates_conversation)
    // - email messages by conversation_id
    // - sms/whatsapp by candidate_id (map direction from is_inbound)
    // - calls optional (best-effort)
    const stats = await Promise.all(
      candidateIds.map(async (candidateId) => {
        // 1) Conversations for this candidate
        const { data: conversations, error: convErr } = await supabase
          .from('candidates_conversation')
          .select('id')
          .eq('candidate_id', candidateId);

        if (convErr) console.error('Error fetching conversations', { candidateId, convErr });

        const conversationIds = (conversations || []).map((c) => c.id);

        // 2) Email messages by conversation_id
        let emailMessages: EmailMsg[] = [];
        if (conversationIds.length > 0) {
          const { data: emails, error: emailErr } = await supabase
            .from('candidate_email_messages')
            .select('id, created_at, direction, status')
            .in('conversation_id', conversationIds);

          if (emailErr) {
            console.error('Error fetching email messages', { candidateId, emailErr });
          } else {
            emailMessages = (emails || []) as EmailMsg[];
          }
        }

        // 3) SMS/WhatsApp messages by candidate_id
        let smsWhatsappMessages: SmsWaMsg[] = [];
        {
          const { data: smswa, error: smsErr } = await supabase
            .from('candidates_sms_whatsapp_conversations')
            .select('id, sent_at, is_inbound, message_status, message_type')
            .eq('candidate_id', candidateId);

          if (smsErr) {
            console.error('Error fetching SMS/WhatsApp', { candidateId, smsErr });
          } else {
            smsWhatsappMessages = (smswa || []) as SmsWaMsg[];
          }
        }

        // 4) Calls (optional best-effort)
        let calls: Call[] = [];
        try {
          const { data: callsData, error: callsErr } = await supabase
            .from('calls')
            .select('id, created_at, direction, status')
            .eq('candidate_id', candidateId);

          if (callsErr) {
            // Just log; calls are optional
            console.warn('Calls table not available or error occurred', { candidateId, callsErr });
          } else {
            calls = (callsData || []) as Call[];
          }
        } catch (e) {
          console.warn('Calls table lookup failed (skipped).');
        }

        // Normalize direction counts:
        const inboundFromEmails = emailMessages.filter((m) => (m.direction || '').toLowerCase() === 'inbound').length;
        const outboundFromEmails = emailMessages.filter((m) => (m.direction || '').toLowerCase() === 'outbound').length;

        const inboundFromSmsWa = smsWhatsappMessages.filter((m) => m.is_inbound).length;
        const outboundFromSmsWa = smsWhatsappMessages.filter((m) => !m.is_inbound).length;

        const inboundFromCalls = calls.filter((c) => (c.direction || '').toLowerCase() === 'inbound').length;
        const outboundFromCalls = calls.filter((c) => (c.direction || '').toLowerCase() === 'outbound').length;

        const inbound_messages = inboundFromEmails + inboundFromSmsWa + inboundFromCalls;
        const outbound_messages = outboundFromEmails + outboundFromSmsWa + outboundFromCalls;
        const total_messages = emailMessages.length + smsWhatsappMessages.length + calls.length;

        const has_responded = inbound_messages > 0;
        
        // Check which channels the candidate has responded on
        const responded_via_email = inboundFromEmails > 0;
        const responded_via_sms = smsWhatsappMessages.filter(m => m.is_inbound && m.message_type === 'SMS').length > 0;
        const responded_via_whatsapp = smsWhatsappMessages.filter(m => m.is_inbound && m.message_type === 'WhatsApp').length > 0;
        const responded_via_calls = inboundFromCalls > 0;

        // Latest message timestamp: consider email.created_at, smswa.sent_at, calls.created_at
        const timestamps: number[] = [
          ...emailMessages.map((e) => (e.created_at ? new Date(e.created_at).getTime() : 0)),
          ...smsWhatsappMessages.map((s) => (s.sent_at ? new Date(s.sent_at).getTime() : 0)),
          ...calls.map((c) => (c.created_at ? new Date(c.created_at).getTime() : 0)),
        ].filter((t) => t > 0);

        const latest_message_date = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;

        return {
          candidate_id: candidateId,
          total_messages,
          outbound_messages,
          inbound_messages,
          has_responded,
          latest_message_date,
          communication_channels: {
            email: emailMessages.length,
            sms_whatsapp: smsWhatsappMessages.length,
            calls: calls.length,
          },
          response_channels: {
            email: responded_via_email,
            sms: responded_via_sms,
            whatsapp: responded_via_whatsapp,
            calls: responded_via_calls,
          },
        };
      })
    );

    // Apply filters
    let filtered = stats;

    if (messageCountFilter) {
      const [op, countStr] = messageCountFilter.split(':');
      const count = parseInt(countStr || '0', 10);
      if (op === 'gte') filtered = filtered.filter((s) => s.total_messages >= count);
      else if (op === 'lte') filtered = filtered.filter((s) => s.total_messages <= count);
      else if (op === 'eq') filtered = filtered.filter((s) => s.total_messages === count);
    }

    if (responseStatusFilter) {
      if (responseStatusFilter === 'responded') filtered = filtered.filter((s) => s.has_responded);
      else if (responseStatusFilter === 'no_response') filtered = filtered.filter((s) => !s.has_responded);
    }

    if (responseChannelFilter) {
      if (responseChannelFilter === 'email') {
        filtered = filtered.filter((s) => s.response_channels.email);
      } else if (responseChannelFilter === 'sms') {
        filtered = filtered.filter((s) => s.response_channels.sms);
      } else if (responseChannelFilter === 'whatsapp') {
        filtered = filtered.filter((s) => s.response_channels.whatsapp);
      } else if (responseChannelFilter === 'calls') {
        filtered = filtered.filter((s) => s.response_channels.calls);
      }
    }

    return NextResponse.json({ data: filtered, total: filtered.length });
  } catch (error) {
    console.error('Error fetching communication statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
