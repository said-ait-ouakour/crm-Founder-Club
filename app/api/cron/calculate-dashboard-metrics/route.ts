import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

export async function GET(request: NextRequest) {
  try {
    // Verify authorization (for n8n or external callers)
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    // Always require CRON_SECRET in production
    if (process.env.NODE_ENV === 'production') {
      if (!expectedSecret) {
        console.error('[Cron] CRON_SECRET environment variable is not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      
      if (authHeader !== `Bearer ${expectedSecret}`) {
        console.warn('[Cron] Unauthorized access attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createClient();
    console.log('[Cron] Starting admin dashboard metrics calculation...');

    const today = new Date().toISOString().split('T')[0];

    // 1. Stats - Efficient Counts
    const { count: activeLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    // Opportunities (Sum requires fetching, but dataset usually smaller than leads)
    const { data: openOpportunitiesData } = await supabase
      .from('opportunities')
      .select('amount')
      .eq('status', 'Open');
    
    const openOpportunities = openOpportunitiesData?.length || 0;
    const totalOpportunityValue = openOpportunitiesData?.reduce((sum, opp) => sum + (opp.amount || 0), 0) || 0;

    // Policies
    const { data: activePoliciesData } = await supabase
      .from('policies_valuations')
      .select('valuation_amount')
      .eq('status', 'Active');

    const activePolicies = activePoliciesData?.length || 0;
    const totalPolicyValue = activePoliciesData?.reduce((sum, pol) => sum + (pol.valuation_amount || 0), 0) || 0;

    // 2. Sentiment Analysis - Query from lead_situation table
    // Get the most recent sentiment for each lead (in case a lead has multiple entries)
    // We'll fetch all lead_situation records and deduplicate by taking the most recent per lead
    let sentimentMap = new Map<string, { sentiment: string; lastUpdate: string }>();
    let sentimentPage = 0;
    const sentimentPageSize = 5000;
    
    while (true) {
      const { data: sentimentData, error: sentimentError } = await supabase
        .from('lead_situation')
        .select('lead_id, sentiment_analysis, last_update')
        .range(sentimentPage * sentimentPageSize, (sentimentPage + 1) * sentimentPageSize - 1);
        
      if (sentimentError) {
        console.warn('[Cron] Error fetching lead_situation for sentiment:', sentimentError);
        break;
      }
      
      if (!sentimentData || sentimentData.length === 0) break;
      
      // For each record, keep only the most recent sentiment per lead
      sentimentData.forEach((item: { lead_id: string; sentiment_analysis: string; last_update: string }) => {
        if (!item.lead_id || !item.sentiment_analysis) return;
        
        const existing = sentimentMap.get(item.lead_id);
        if (!existing || new Date(item.last_update) > new Date(existing.lastUpdate)) {
          sentimentMap.set(item.lead_id, {
            sentiment: item.sentiment_analysis.toLowerCase(),
            lastUpdate: item.last_update
          });
        }
      });
      
      if (sentimentData.length < sentimentPageSize) break;
      sentimentPage++;
    }
    
    // Count sentiments
    const sentimentPositive = Array.from(sentimentMap.values()).filter(s => s.sentiment === 'positive').length;
    const sentimentNegative = Array.from(sentimentMap.values()).filter(s => s.sentiment === 'negative').length;
    const sentimentNeutral = Array.from(sentimentMap.values()).filter(s => s.sentiment === 'neutral').length;
    const sentimentTotal = sentimentPositive + sentimentNegative + sentimentNeutral;
    
    // Engagement Status - Based on sentiment (leads with any sentiment = engaged)
    // A lead is considered "engaged" if they have sentiment analysis data (indicating interaction)
    const engagedLeads = sentimentTotal;
    const notEngagedLeads = (activeLeads || 0) - sentimentTotal;

    // 3. Call Metrics - Count Queries
    const { count: totalCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true });
      
    const { count: charlotteFoxCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('advisor_name', 'Charlotte Fox Vapi');
      
    const advisorCalls = (totalCalls || 0) - (charlotteFoxCalls || 0);
    
    const { count: positiveCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .gte('call_score', 7);
      
    const { count: negativeCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .lt('call_score', 4);

    // Unique leads called - requires fetching lead_ids (Batching if needed, but simplified here)
    // If calls table is huge, this might need optimization (e.g., distinct count via RPC)
    // For now, fetching only lead_id is efficient enough for <100k calls
    let calledLeadIds = new Set<string>();
    let callPage = 0;
    const callPageSize = 5000;
    while (true) {
      const { data: callIds, error } = await supabase
        .from('calls')
        .select('lead_id')
        .range(callPage * callPageSize, (callPage + 1) * callPageSize - 1);
        
      if (error || !callIds || callIds.length === 0) break;
      
      callIds.forEach(c => { if (c.lead_id) calledLeadIds.add(c.lead_id); });
      if (callIds.length < callPageSize) break;
      callPage++;
    }
    const calledLeads = calledLeadIds.size;
    const notCalledLeads = (activeLeads || 0) - calledLeads;

    // 4. Omnichannel Progress - Distinct Counts
    // Email Sent (Unique Leads)
    let emailSentLeads = new Set<string>();
    let emailPage = 0;
    while (true) {
      const { data, error } = await supabase
        .from('email_conversation')
        .select('lead_id')
        .range(emailPage * 5000, (emailPage + 1) * 5000 - 1);
      if (error || !data || data.length === 0) break;
      data.forEach(d => emailSentLeads.add(d.lead_id));
      if (data.length < 5000) break;
      emailPage++;
    }
    const emailSent = emailSentLeads.size;

    // SMS & WhatsApp Replies
    // Count total reply messages
    const { count: smsReplies } = await supabase
      .from('leads_sms_whatsapp_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('message_type', 'SMS')
      .eq('is_inbound', true);
      
    const { count: whatsappReplies } = await supabase
      .from('leads_sms_whatsapp_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('message_type', 'WhatsApp')
      .eq('is_inbound', true);
    
    // Count unique leads who replied to WhatsApp messages
    let whatsappRepliedLeads = new Set<string>();
    let whatsappRepliedPage = 0;
    while (true) {
      const { data, error } = await supabase
        .from('leads_sms_whatsapp_conversations')
        .select('lead_id')
        .eq('message_type', 'WhatsApp')
        .eq('is_inbound', true)
        .not('lead_id', 'is', null)
        .range(whatsappRepliedPage * 5000, (whatsappRepliedPage + 1) * 5000 - 1);
        
      if (error || !data || data.length === 0) break;
      
      data.forEach((d: { lead_id: string | null }) => {
        if (d.lead_id && d.lead_id.trim() !== '') {
          whatsappRepliedLeads.add(d.lead_id.trim());
        }
      });
      
      if (data.length < 5000) break;
      whatsappRepliedPage++;
    }
    const whatsappLeadsReplied = whatsappRepliedLeads.size;

    // For sent (unique leads), we need to fetch lead_ids
    let smsSentLeads = new Set<string>();
    let whatsappSentLeads = new Set<string>();
    
    let msgPage = 0;
    while (true) {
      const { data, error } = await supabase
        .from('leads_sms_whatsapp_conversations')
        .select('lead_id, message_type, is_inbound')
        .range(msgPage * 5000, (msgPage + 1) * 5000 - 1);
        
      if (error || !data || data.length === 0) break;
      
      data.forEach((d: { lead_id: string, message_type: string, is_inbound: boolean }) => {
        // We only count OUTBOUND messages for "Sent" / "Contacted"
        if (d.is_inbound === false || d.is_inbound === null) {
            if (d.message_type === 'SMS') smsSentLeads.add(d.lead_id);
            if (d.message_type === 'WhatsApp') whatsappSentLeads.add(d.lead_id);
        }
      });
      
      if (data.length < 5000) break;
      msgPage++;
    }
    const smsSent = smsSentLeads.size;
    const whatsappSent = whatsappSentLeads.size;

    // WhatsApp Seen - Count unique leads with OUTBOUND WhatsApp messages that have message_status = 'read'
    let whatsappSeenLeads = new Set<string>();
    let whatsappSeenPage = 0;
    let totalWhatsappSeenMessages = 0;
    let skippedNullLeadIdsSeen = 0;
    let skippedEmptyStatusSeen = 0;
    
    while (true) {
      // Fetch OUTBOUND WhatsApp messages and filter in JavaScript for case-insensitive matching
      const { data, error } = await supabase
        .from('leads_sms_whatsapp_conversations')
        .select('lead_id, message_status, is_inbound')
        .eq('message_type', 'WhatsApp')
        .not('message_status', 'is', null)
        .not('lead_id', 'is', null)
        .range(whatsappSeenPage * 5000, (whatsappSeenPage + 1) * 5000 - 1);
        
      if (error) {
        console.warn('[Cron] Error fetching WhatsApp messages for seen count:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      // Filter for OUTBOUND messages with 'read' status (case-insensitive, trim whitespace)
      data.forEach((d: { lead_id: string | null; message_status: string | null; is_inbound: boolean | null }) => {
        // Only count OUTBOUND messages (is_inbound = false or null)
        if (d.is_inbound === true) return;
        
        // Validate lead_id
        if (!d.lead_id || d.lead_id.trim() === '') {
          skippedNullLeadIdsSeen++;
          return;
        }
        
        // Validate and normalize message_status
        if (!d.message_status || d.message_status.trim() === '') {
          skippedEmptyStatusSeen++;
          return;
        }
        
        const normalizedStatus = d.message_status.trim().toLowerCase();
        
        // Count as seen if status is 'read'
        if (normalizedStatus === 'read') {
          whatsappSeenLeads.add(d.lead_id.trim());
          totalWhatsappSeenMessages++;
        }
      });
      
      if (data.length < 5000) break;
      whatsappSeenPage++;
    }
    // whatsapp_seen = total messages with read status (not unique leads)
    const whatsappSeen = totalWhatsappSeenMessages;
    // whatsapp_leads_seen = unique leads who saw messages
    const whatsappLeadsSeen = whatsappSeenLeads.size;
    
    console.log(`[Cron] WhatsApp Seen: ${whatsappSeen} total messages, ${whatsappLeadsSeen} unique leads with read status`);
    if (skippedNullLeadIdsSeen > 0 || skippedEmptyStatusSeen > 0) {
      console.warn(`[Cron] WhatsApp Seen: Skipped ${skippedNullLeadIdsSeen} null lead_ids, ${skippedEmptyStatusSeen} empty statuses`);
    }

    // WhatsApp Delivered - Count OUTBOUND WhatsApp messages that have message_status = 'delivered'
    // Note: Also includes messages that were 'read' (read implies delivered)
    let whatsappDeliveredLeads = new Set<string>();
    let whatsappDeliveredPage = 0;
    let totalWhatsappDeliveredMessages = 0;
    let skippedNullLeadIds = 0;
    let skippedEmptyStatus = 0;
    
    while (true) {
      // Fetch OUTBOUND WhatsApp messages and filter in JavaScript for case-insensitive matching
      const { data, error } = await supabase
        .from('leads_sms_whatsapp_conversations')
        .select('lead_id, message_status, is_inbound')
        .eq('message_type', 'WhatsApp')
        .not('message_status', 'is', null)
        .not('lead_id', 'is', null)
        .range(whatsappDeliveredPage * 5000, (whatsappDeliveredPage + 1) * 5000 - 1);
        
      if (error) {
        console.warn('[Cron] Error fetching WhatsApp messages for delivered count:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      // Filter for OUTBOUND messages with 'delivered' status (case-insensitive, trim whitespace)
      // Also count 'read' as delivered (read implies the message was delivered)
      data.forEach((d: { lead_id: string | null; message_status: string | null; is_inbound: boolean | null }) => {
        // Only count OUTBOUND messages (is_inbound = false or null)
        if (d.is_inbound === true) return;
        
        // Validate lead_id
        if (!d.lead_id || d.lead_id.trim() === '') {
          skippedNullLeadIds++;
          return;
        }
        
        // Validate and normalize message_status
        if (!d.message_status || d.message_status.trim() === '') {
          skippedEmptyStatus++;
          return;
        }
        
        const normalizedStatus = d.message_status.trim().toLowerCase();
        
        // Count as delivered if status is 'delivered' or 'read' (read implies delivered)
        if (normalizedStatus === 'delivered' || normalizedStatus === 'read') {
          whatsappDeliveredLeads.add(d.lead_id.trim());
          totalWhatsappDeliveredMessages++;
        }
      });
      
      if (data.length < 5000) break;
      whatsappDeliveredPage++;
    }
    // whatsapp_delivered = total messages with delivered/read status (not unique leads)
    const whatsappDelivered = totalWhatsappDeliveredMessages;
    
    console.log(`[Cron] WhatsApp Delivered: ${whatsappDelivered} total messages, ${whatsappDeliveredLeads.size} unique leads with delivered/read status`);
    if (skippedNullLeadIds > 0 || skippedEmptyStatus > 0) {
      console.warn(`[Cron] WhatsApp Delivered: Skipped ${skippedNullLeadIds} null lead_ids, ${skippedEmptyStatus} empty statuses`);
    }

    const vapiCallsMade = charlotteFoxCalls || 0;
    const vapiReplies = charlotteFoxCalls || 0; // Approx

    // 5. Email Analytics - Sums
    // Query email_messages with join to email_conversation to get lead_id
    const { data: emailStats, error: emailStatsError } = await supabase
      .from('email_messages')
      .select(`
        direction,
        open_count,
        clicks_count,
        mpp_opens_count,
        marked_as_spam,
        unsubscribed,
        email_conversation!inner (
          lead_id
        )
      `);
    
    if (emailStatsError) {
      console.warn('[Cron] Error fetching email_messages:', emailStatsError);
    }
      
    const totalEmails = emailStats?.length || 0;
    const inboundEmails = emailStats?.filter((em: any) => em.direction === 'Inbound').length || 0;
    const outboundEmails = emailStats?.filter((em: any) => em.direction === 'Outbound').length || 0;
    const totalOpens = emailStats?.reduce((sum: number, em: any) => sum + (em.open_count || 0), 0) || 0;
    const totalClicks = emailStats?.reduce((sum: number, em: any) => sum + (em.clicks_count || 0), 0) || 0;
    const mppOpens = emailStats?.reduce((sum: number, em: any) => sum + (em.mpp_opens_count || 0), 0) || 0;
    const nonMppOpens = totalOpens - mppOpens;
    const spamCount = emailStats?.filter((em: any) => em.marked_as_spam).length || 0;
    const unsubscribedCount = emailStats?.filter((em: any) => em.unsubscribed).length || 0;
    
    const emailReplies = inboundEmails;

    // Count unique leads who opened/clicked emails (more accurate than all-or-nothing)
    // Extract lead_id from nested email_conversation object
    const leadsWhoOpened = new Set(
      emailStats?.filter((em: any) => (em.open_count || 0) > 0)
        .map((em: any) => {
          // Handle nested email_conversation object
          if (em.email_conversation && Array.isArray(em.email_conversation)) {
            return em.email_conversation[0]?.lead_id;
          }
          return em.email_conversation?.lead_id;
        })
        .filter((id: string) => id != null && id !== undefined) || []
    ).size;
    
    const leadsWhoClicked = new Set(
      emailStats?.filter((em: any) => (em.clicks_count || 0) > 0)
        .map((em: any) => {
          // Handle nested email_conversation object
          if (em.email_conversation && Array.isArray(em.email_conversation)) {
            return em.email_conversation[0]?.lead_id;
          }
          return em.email_conversation?.lead_id;
        })
        .filter((id: string) => id != null && id !== undefined) || []
    ).size;

    const openRate = outboundEmails > 0 ? (nonMppOpens / outboundEmails) * 100 : 0;
    const clickRate = outboundEmails > 0 ? (totalClicks / outboundEmails) * 100 : 0;
    const mppOpenRate = outboundEmails > 0 ? (mppOpens / outboundEmails) * 100 : 0;
    const nonMppOpenRate = outboundEmails > 0 ? (nonMppOpens / outboundEmails) * 100 : 0;
    
    // Log warning if email_messages table is empty but email_conversation has data
    if (totalEmails === 0 && emailSent > 0) {
      console.warn('[Cron] email_messages table appears empty, but email_conversation has', emailSent, 'leads. Email analytics will be 0.');
    }

    // 6. VAPI Detailed Scores - Count Queries
    const { count: vapiScore0To4 } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('advisor_name', 'Charlotte Fox Vapi')
      .lt('call_score', 4);
      
    const { count: vapiScore4To7 } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('advisor_name', 'Charlotte Fox Vapi')
      .gte('call_score', 4)
      .lt('call_score', 7);
      
    const { count: vapiScore7To10 } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('advisor_name', 'Charlotte Fox Vapi')
      .gte('call_score', 7);

    // VAPI Call Dispositions (based on call_ended_reason)
    const { data: vapiCallsData } = await supabase
      .from('calls')
      .select('call_ended_reason')
      .eq('advisor_name', 'Charlotte Fox Vapi');
    
    let vapiAnswered = 0;
    let vapiVoicemail = 0;
    let vapiNoAnswer = 0;
    let vapiFailed = 0;
    let vapiAssistantEnded = 0;
    let vapiCustomerEnded = 0;
    const uncategorizedReasons = new Map<string, number>();
    
    vapiCallsData?.forEach(call => {
      const originalReason = call.call_ended_reason;
      const reason = originalReason?.toLowerCase() || '';
      
      if (reason === '' || !originalReason) {
        // If no reason provided, assume it was answered (call exists in system)
        vapiAnswered++;
      } else if (reason.includes('voicemail')) {
        vapiVoicemail++;
      } else if (reason.includes('no-answer') || reason.includes('no_answer') || reason.includes('not-answer') || reason.includes('no answer')) {
        vapiNoAnswer++;
      } else if (reason.includes('failed') || reason.includes('error') || reason.includes('failure')) {
        vapiFailed++;
      } else if (reason.includes('assistant-ended') || reason.includes('assistant_ended') || reason.includes('assistant ended')) {
        vapiAssistantEnded++;
        vapiAnswered++;
      } else if (reason.includes('customer-ended') || reason.includes('customer_ended') || reason.includes('customer ended')) {
        vapiCustomerEnded++;
        vapiAnswered++;
      } else if (reason.includes('exceeded-max-duration') || reason.includes('exceeded max duration')) {
        vapiAnswered++;
      } else {
        // Track uncategorized reasons for debugging
        uncategorizedReasons.set(originalReason, (uncategorizedReasons.get(originalReason) || 0) + 1);
        // Default uncategorized to answered if we can't determine otherwise
        vapiAnswered++;
      }
    });
    
    // Log uncategorized reasons if any
    if (uncategorizedReasons.size > 0) {
      console.warn('[Cron] Found uncategorized VAPI call_ended_reason values:', Array.from(uncategorizedReasons.entries()).slice(0, 10));
    }
    
    // Verify disposition counts match total VAPI calls
    const totalVapiCalls = vapiCallsData?.length || 0;
    const categorizedTotal = vapiAnswered + vapiVoicemail + vapiNoAnswer + vapiFailed;
    if (totalVapiCalls !== categorizedTotal) {
      console.warn(`[Cron] VAPI disposition mismatch: ${totalVapiCalls} total calls, ${categorizedTotal} categorized. Difference: ${totalVapiCalls - categorizedTotal}`);
    }

    // Admin KPIs (Approximations based on available data)
    // Use email_sent as fallback if email_messages table is empty
    const emailDelivered = outboundEmails > 0 ? outboundEmails : emailSent;
    const smsDelivered = smsSent; // Using sent count as delivered
    // whatsappDelivered and whatsappSeen are already calculated above from leads_sms_whatsapp_conversations table

    // Prepare record
    const metricsRecord = {
      date: today,
      is_admin_view: true,
      advisor_id: null,
      
      active_leads: activeLeads || 0,
      total_contacts: totalContacts || 0,
      open_opportunities: openOpportunities,
      active_policies: activePolicies,
      total_opportunity_value: totalOpportunityValue,
      total_policy_value: totalPolicyValue,
      
      sentiment_positive: sentimentPositive,
      sentiment_negative: sentimentNegative,
      sentiment_neutral: sentimentNeutral,
      sentiment_total: sentimentTotal,
      
      engaged_leads: engagedLeads || 0,
      not_engaged_leads: notEngagedLeads,
      
      called_leads: calledLeads,
      not_called_leads: notCalledLeads,
      
      email_sent: emailSent,
      sms_sent: smsSent,
      whatsapp_sent: whatsappSent,
      vapi_calls_made: vapiCallsMade,
      
      total_emails: totalEmails,
      inbound_emails: inboundEmails,
      outbound_emails: outboundEmails,
      total_opens: totalOpens,
      total_clicks: totalClicks,
      mpp_opens: mppOpens,
      non_mpp_opens: nonMppOpens,
      spam_count: spamCount,
      unsubscribed_count: unsubscribedCount,
      open_rate: openRate,
      click_rate: clickRate,
      mpp_open_rate: mppOpenRate,
      non_mpp_open_rate: nonMppOpenRate,
      
      email_replies: emailReplies,
      sms_replies: smsReplies || 0,
      whatsapp_replies: whatsappReplies || 0,
      vapi_replies: vapiReplies,
      
      total_calls: totalCalls || 0,
      charlotte_fox_calls: charlotteFoxCalls || 0,
      advisor_calls: advisorCalls,
      positive_calls: positiveCalls || 0,
      negative_calls: negativeCalls || 0,
      
      // Admin KPIs
      email_delivered: emailDelivered,
      sms_delivered: smsDelivered,
      whatsapp_delivered: whatsappDelivered,
      whatsapp_seen: whatsappSeen,
      
      email_leads_contacted: emailSent,
      email_leads_opened: leadsWhoOpened,
      email_leads_clicked: leadsWhoClicked,
      email_leads_replied: emailReplies,
      
      sms_leads_contacted: smsSent,
      sms_leads_replied: smsReplies || 0,
      
      whatsapp_leads_contacted: whatsappSent,
      whatsapp_leads_seen: whatsappLeadsSeen,
      whatsapp_leads_replied: whatsappLeadsReplied,
      
      vapi_answered: vapiAnswered,
      vapi_voicemail: vapiVoicemail,
      vapi_no_answer: vapiNoAnswer,
      vapi_failed: vapiFailed,
      vapi_assistant_ended: vapiAssistantEnded,
      vapi_customer_ended: vapiCustomerEnded,
      vapi_score_0_4: vapiScore0To4 || 0,
      vapi_score_4_7: vapiScore4To7 || 0,
      vapi_score_7_10: vapiScore7To10 || 0,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[Cron] Calculated metrics summary:', {
      date: metricsRecord.date,
      activeLeads: metricsRecord.active_leads,
      totalCalls: metricsRecord.total_calls,
      totalEmails: metricsRecord.total_emails,
      whatsappEngagement: {
        sent: metricsRecord.whatsapp_sent,
        delivered: metricsRecord.whatsapp_delivered,
        seen: metricsRecord.whatsapp_seen,
        replied: metricsRecord.whatsapp_replies,
        leadsContacted: metricsRecord.whatsapp_leads_contacted,
        leadsSeen: metricsRecord.whatsapp_leads_seen,
        leadsReplied: metricsRecord.whatsapp_leads_replied
      }
    });

    // 7. Save to Database - Check if record exists first, then update or insert
    const { data: existingRecord, error: checkError } = await supabase
      .from('dashboard_metrics')
      .select('id')
      .eq('date', today)
      .eq('is_admin_view', true)
      .is('advisor_id', null)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Cron] Error checking existing record:', checkError);
      return NextResponse.json({ error: 'Failed to check existing metrics', details: checkError }, { status: 500 });
    }

    let saveError;
    if (existingRecord) {
      // Update existing record (exclude created_at and id from update)
      console.log('[Cron] Updating existing record with id:', existingRecord.id);
      const { created_at, ...updateData } = metricsRecord;
      const { error: updateError } = await supabase
        .from('dashboard_metrics')
        .update(updateData)
        .eq('id', existingRecord.id);
      
      saveError = updateError;
    } else {
      // Insert new record (id will be auto-generated by identity column, created_at is included)
      console.log('[Cron] Inserting new record');
      // Explicitly exclude id to ensure it's auto-generated
      const { id, ...insertData } = metricsRecord as any;
      const { error: insertError } = await supabase
        .from('dashboard_metrics')
        .insert(insertData);
      
      saveError = insertError;
    }

    if (saveError) {
      console.error('[Cron] Error saving metrics:', saveError);
      return NextResponse.json({ error: 'Failed to save metrics', details: saveError }, { status: 500 });
    }

    console.log('[Cron] Successfully saved dashboard metrics');
    return NextResponse.json({ success: true, metrics: metricsRecord });

  } catch (error) {
    console.error('[Cron] Critical error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
