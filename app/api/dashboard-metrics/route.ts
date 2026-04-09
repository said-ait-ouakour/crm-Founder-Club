import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type AdminKpis = {
  deliveries: {
    emailDelivered: number;
    smsDelivered: number;
    whatsappDelivered: number;
    whatsappSeen: number;
  };
  emailLeads: {
    contacted: number;
    opened: number;
    clicked: number;
    replied: number;
  };
  smsLeads: {
    contacted: number;
    replied: number;
  };
  whatsappLeads: {
    contacted: number;
    seen: number;
    replied: number;
  };
  vapi: {
    answered: number;
    voicemail: number;
    noAnswer: number;
    failed: number;
    assistantEnded: number;
    customerEnded: number;
    score0To4: number;
    score4To7: number;
    score7To10: number;
  };
};

function createEmptyAdminKpis(): AdminKpis {
  return {
    deliveries: {
      emailDelivered: 0,
      smsDelivered: 0,
      whatsappDelivered: 0,
      whatsappSeen: 0,
    },
    emailLeads: {
      contacted: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
    },
    smsLeads: {
      contacted: 0,
      replied: 0,
    },
    whatsappLeads: {
      contacted: 0,
      seen: 0,
      replied: 0,
    },
    vapi: {
      answered: 0,
      voicemail: 0,
      noAnswer: 0,
      failed: 0,
      assistantEnded: 0,
      customerEnded: 0,
      score0To4: 0,
      score4To7: 0,
      score7To10: 0,
    },
  };
}

function mapAdminKpisFromRecord(record: any): AdminKpis {
  const empty = createEmptyAdminKpis();

  if (!record) {
    return empty;
  }

  return {
    deliveries: {
      emailDelivered: record.email_delivered ?? 0,
      smsDelivered: record.sms_delivered ?? 0,
      whatsappDelivered: record.whatsapp_delivered ?? 0,
      whatsappSeen: record.whatsapp_seen ?? 0,
    },
    emailLeads: {
      contacted: record.email_leads_contacted ?? 0,
      opened: record.email_leads_opened ?? 0,
      clicked: record.email_leads_clicked ?? 0,
      replied: record.email_leads_replied ?? 0,
    },
    smsLeads: {
      contacted: record.sms_leads_contacted ?? 0,
      replied: record.sms_leads_replied ?? 0,
    },
    whatsappLeads: {
      contacted: record.whatsapp_leads_contacted ?? 0,
      seen: record.whatsapp_leads_seen ?? 0,
      replied: record.whatsapp_leads_replied ?? 0,
    },
    vapi: {
      answered: record.vapi_answered ?? 0,
      voicemail: record.vapi_voicemail ?? 0,
      noAnswer: record.vapi_no_answer ?? 0,
      failed: record.vapi_failed ?? 0,
      assistantEnded: record.vapi_assistant_ended ?? 0,
      customerEnded: record.vapi_customer_ended ?? 0,
      score0To4: record.vapi_score_0_4 ?? 0,
      score4To7: record.vapi_score_4_7 ?? 0,
      score7To10: record.vapi_score_7_10 ?? 0,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const advisorId = searchParams.get('advisorId');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    
    // If it's an advisor (not admin), calculate metrics directly for their assigned leads
    if (advisorId && !isAdmin) {
      return await calculateAdvisorMetrics(advisorId, supabase);
    }
    
    // Get today's metrics for admin view
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('dashboard_metrics')
      .select('*')
      .eq('date', today)
      .eq('is_admin_view', isAdmin);
    
    // Only filter by advisor_id if it's provided (not admin view)
    if (advisorId) {
      query = query.eq('advisor_id', advisorId);
    }
    
    const { data: metrics, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching dashboard metrics:', error);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
    
    if (!metrics) {
      // If no pre-calculated metrics exist, return empty metrics
      return NextResponse.json({
        stats: {
          activeLeads: 0,
          totalContacts: 0,
          openOpportunities: 0,
          activePolicies: 0,
          totalOpportunityValue: 0,
          totalPolicyValue: 0,
        },
        analytics: {
          sentimentAnalysis: { positive: 0, negative: 0, neutral: 0, total: 0 },
          engagementStatus: { engaged: 0, notEngaged: 0, total: 0 },
          callStatus: { called: 0, notCalled: 0, total: 0 },
          omnichannelProgress: { email: 0, sms: 0, whatsapp: 0, call: 0, total: 0 },
        },
        emailAnalytics: {
          totalEmails: 0,
          inboundEmails: 0,
          outboundEmails: 0,
          totalOpens: 0,
          totalClicks: 0,
          mppOpens: 0,
          nonMppOpens: 0,
          spamCount: 0,
          unsubscribedCount: 0,
          openRate: 0,
          clickRate: 0,
          mppOpenRate: 0,
          nonMppOpenRate: 0,
        },
        omnichannelReplies: {
          email: 0,
          sms: 0,
          whatsapp: 0,
          vapi: 0,
          total: 0,
        },
        callMetrics: {
          totalCalls: 0,
          charlotteFoxCalls: 0,
          advisorCalls: 0,
          positiveCalls: 0,
          negativeCalls: 0,
        },
        recentCalls: [],
        leadsByDate: [],
        adminKpis: isAdmin ? createEmptyAdminKpis() : null,
      });
    }
    
    // Transform the stored metrics into the format expected by the dashboard
    const response = {
      stats: {
        activeLeads: metrics.active_leads,
        totalContacts: metrics.total_contacts,
        openOpportunities: metrics.open_opportunities,
        activePolicies: metrics.active_policies,
        totalOpportunityValue: metrics.total_opportunity_value,
        totalPolicyValue: metrics.total_policy_value,
      },
      analytics: {
        sentimentAnalysis: {
          positive: metrics.sentiment_positive,
          negative: metrics.sentiment_negative,
          neutral: metrics.sentiment_neutral,
          total: metrics.sentiment_total,
        },
        engagementStatus: {
          engaged: metrics.engaged_leads,
          notEngaged: metrics.not_engaged_leads,
          total: metrics.engaged_leads + metrics.not_engaged_leads,
        },
        callStatus: {
          called: metrics.called_leads,
          notCalled: metrics.not_called_leads,
          total: metrics.called_leads + metrics.not_called_leads,
        },
        omnichannelProgress: {
          email: metrics.email_sent,
          sms: metrics.sms_sent,
          whatsapp: metrics.whatsapp_sent,
          call: metrics.vapi_calls_made,
          total: metrics.active_leads,
        },
      },
      emailAnalytics: {
        totalEmails: metrics.total_emails,
        inboundEmails: metrics.inbound_emails,
        outboundEmails: metrics.outbound_emails,
        totalOpens: metrics.total_opens,
        totalClicks: metrics.total_clicks,
        mppOpens: metrics.mpp_opens,
        nonMppOpens: metrics.non_mpp_opens,
        spamCount: metrics.spam_count,
        unsubscribedCount: metrics.unsubscribed_count,
        openRate: metrics.open_rate,
        clickRate: metrics.click_rate,
        mppOpenRate: metrics.mpp_open_rate,
        nonMppOpenRate: metrics.non_mpp_open_rate,
      },
      omnichannelReplies: {
        email: metrics.email_replies,
        sms: metrics.sms_replies,
        whatsapp: metrics.whatsapp_replies,
        vapi: metrics.vapi_replies,
        total: metrics.email_replies + metrics.sms_replies + metrics.whatsapp_replies + metrics.vapi_replies,
      },
      callMetrics: {
        totalCalls: metrics.total_calls,
        charlotteFoxCalls: metrics.charlotte_fox_calls,
        advisorCalls: metrics.advisor_calls,
        positiveCalls: metrics.positive_calls,
        negativeCalls: metrics.negative_calls,
      },
      recentCalls: [], // Will be fetched below
      leadsByDate: [], // Will be fetched below
      adminKpis: isAdmin ? mapAdminKpisFromRecord(metrics) : null,
    };
    
    // Fetch recent calls for admin (not stored in metrics table)
    if (isAdmin) {
      const { data: recentCalls } = await supabase
        .from('calls')
        .select(`
          id,
          lead_id,
          created_at,
          advisor_name,
          call_score,
          summary,
          call_ended_reason,
          leads(contact_first_name, contact_last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentCalls) {
        response.recentCalls = recentCalls.map((call: any) => {
          const lead = Array.isArray(call.leads) ? call.leads[0] : call.leads;
          const firstName = lead?.contact_first_name || '';
          const lastName = lead?.contact_last_name || '';
          const leadName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || 'Unknown Lead');
          return {
            id: call.id,
            lead_name: leadName,
            created_at: call.created_at,
            advisor_name: call.advisor_name,
            call_score: call.call_score,
            summary: call.summary,
            call_ended_reason: call.call_ended_reason
          };
        }) as any;
      }
      
      // Get leads by date for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: leadsByDate } = await supabase
        .from('leads')
        .select('created_on')
        .gte('created_on', thirtyDaysAgo.toISOString().split('T')[0])
        .order('created_on', { ascending: true });
      
      if (leadsByDate) {
        const leadsByDateMap = new Map();
        leadsByDate.forEach((lead: { created_on: string }) => {
          const date = lead.created_on.split('T')[0];
          leadsByDateMap.set(date, (leadsByDateMap.get(date) || 0) + 1);
        });
        
        response.leadsByDate = Array.from(leadsByDateMap.entries()).map(([date, count]) => ({
          date,
          count
        })) as any;
      }
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in dashboard metrics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Function to calculate metrics directly for advisor's assigned leads
async function calculateAdvisorMetrics(advisorId: string, supabase: any) {
  try {
    console.log('[calculateAdvisorMetrics] Starting for advisorId:', advisorId);
    
    // First, get the internal user ID from the users table
    // Try looking up by user_id (UUID) first
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, user_id')
      .eq('user_id', advisorId)
      .maybeSingle();
    
    // If not found by UUID, try by internal ID (bigint) as fallback
    if (!userData && !userError) {
      console.log('[calculateAdvisorMetrics] User not found by UUID, trying internal ID...');
      const parsedId = parseInt(advisorId);
      if (!isNaN(parsedId)) {
        const { data: userDataById, error: userErrorById } = await supabase
          .from('users')
          .select('id, user_id')
          .eq('id', parsedId)
          .maybeSingle();
        userData = userDataById;
        userError = userErrorById;
      }
    }
    
    if (userError) {
      console.error('[calculateAdvisorMetrics] Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
    
    if (!userData) {
      console.error('[calculateAdvisorMetrics] User not found for advisorId:', advisorId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[calculateAdvisorMetrics] Found user with internal ID:', userData.id, 'UUID:', userData.user_id);
    
    // Get all lead IDs assigned to this advisor using the internal user ID (bigint)
    let { data: advisorLeads, error: leadsError } = await supabase
      .from('users_leads')
      .select('lead_id, user_id')
      .eq('user_id', userData.id);
    
    if (leadsError) {
      console.error('[calculateAdvisorMetrics] Error fetching advisor leads by internal ID:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch advisor leads' }, { status: 500 });
    }
    
    console.log('[calculateAdvisorMetrics] Found', advisorLeads?.length || 0, 'assigned leads using internal ID:', userData.id);
    
    // If no leads found by internal ID, try by UUID (in case the table uses UUID instead)
    if ((!advisorLeads || advisorLeads.length === 0) && userData.user_id) {
      console.log('[calculateAdvisorMetrics] No leads found by internal ID, trying UUID lookup...');
      const { data: advisorLeadsByUuid, error: uuidLeadsError } = await supabase
        .from('users_leads')
        .select('lead_id, user_id')
        .eq('user_id', userData.user_id);
      
      if (!uuidLeadsError && advisorLeadsByUuid && advisorLeadsByUuid.length > 0) {
        console.log('[calculateAdvisorMetrics] Found', advisorLeadsByUuid.length, 'leads using UUID lookup');
        advisorLeads = advisorLeadsByUuid;
        leadsError = null;
      } else {
        console.log('[calculateAdvisorMetrics] Also no leads found by UUID');
      }
    }
    
    if (advisorLeads && advisorLeads.length > 0) {
      console.log('[calculateAdvisorMetrics] Sample leads:', advisorLeads.slice(0, 3));
    } else {
      // Let's check if there are any leads at all in users_leads for debugging
      const { data: allLeadsSample, error: sampleError } = await supabase
        .from('users_leads')
        .select('user_id, lead_id')
        .limit(5);
      console.log('[calculateAdvisorMetrics] Sample from users_leads table (first 5):', allLeadsSample);
      console.log('[calculateAdvisorMetrics] Checking if user_id type matches. Looking for user_id:', userData.id, 'Type:', typeof userData.id);
      console.log('[calculateAdvisorMetrics] User UUID:', userData.user_id, 'Type:', typeof userData.user_id);
    }
    
    if (!advisorLeads || advisorLeads.length === 0) {
      console.log('[calculateAdvisorMetrics] No leads assigned, returning empty metrics');
      // Return empty metrics if no leads assigned
      return NextResponse.json({
        stats: {
          activeLeads: 0,
          totalContacts: 0,
          openOpportunities: 0,
          activePolicies: 0,
          totalOpportunityValue: 0,
          totalPolicyValue: 0,
        },
        analytics: {
          sentimentAnalysis: { positive: 0, negative: 0, neutral: 0, total: 0 },
          engagementStatus: { engaged: 0, notEngaged: 0, total: 0 },
          callStatus: { called: 0, notCalled: 0, total: 0 },
          omnichannelProgress: { email: 0, sms: 0, whatsapp: 0, call: 0, total: 0 },
        },
        emailAnalytics: {
          totalEmails: 0,
          inboundEmails: 0,
          outboundEmails: 0,
          totalOpens: 0,
          totalClicks: 0,
          mppOpens: 0,
          nonMppOpens: 0,
          spamCount: 0,
          unsubscribedCount: 0,
          openRate: 0,
          clickRate: 0,
          mppOpenRate: 0,
          nonMppOpenRate: 0,
        },
        omnichannelReplies: {
          email: 0,
          sms: 0,
          whatsapp: 0,
          vapi: 0,
          total: 0,
        },
        callMetrics: {
          totalCalls: 0,
          charlotteFoxCalls: 0,
          advisorCalls: 0,
          positiveCalls: 0,
          negativeCalls: 0,
        },
        recentCalls: [],
        leadsByDate: [],
        adminKpis: null,
      });
    }
    
    const leadIds = advisorLeads.map((lead: { lead_id: string }) => lead.lead_id).filter((id: string | null): id is string => id != null);
    
    if (leadIds.length === 0) {
      console.log('[calculateAdvisorMetrics] No valid lead IDs found');
      // Return empty metrics if no valid lead IDs
      return NextResponse.json({
        stats: {
          activeLeads: 0,
          totalContacts: 0,
          openOpportunities: 0,
          activePolicies: 0,
          totalOpportunityValue: 0,
          totalPolicyValue: 0,
        },
        analytics: {
          sentimentAnalysis: { positive: 0, negative: 0, neutral: 0, total: 0 },
          engagementStatus: { engaged: 0, notEngaged: 0, total: 0 },
          callStatus: { called: 0, notCalled: 0, total: 0 },
          omnichannelProgress: { email: 0, sms: 0, whatsapp: 0, call: 0, total: 0 },
        },
        emailAnalytics: {
          totalEmails: 0,
          inboundEmails: 0,
          outboundEmails: 0,
          totalOpens: 0,
          totalClicks: 0,
          mppOpens: 0,
          nonMppOpens: 0,
          spamCount: 0,
          unsubscribedCount: 0,
          openRate: 0,
          clickRate: 0,
          mppOpenRate: 0,
          nonMppOpenRate: 0,
        },
        omnichannelReplies: {
          email: 0,
          sms: 0,
          whatsapp: 0,
          vapi: 0,
          total: 0,
        },
        callMetrics: {
          totalCalls: 0,
          charlotteFoxCalls: 0,
          advisorCalls: 0,
          positiveCalls: 0,
          negativeCalls: 0,
        },
        recentCalls: [],
        leadsByDate: [],
        adminKpis: null,
      });
    }
    
    console.log('[calculateAdvisorMetrics] Querying', leadIds.length, 'lead IDs');
    
    // Helper function to batch queries (Supabase/PostgreSQL has limits on IN clause size)
    const batchSize = 100;
    const batchQuery = async <T>(table: string, select: string, filterField: string, values: string[]): Promise<T[]> => {
      const results: T[] = [];
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from(table)
          .select(select)
          .in(filterField, batch);
        
        if (error) {
          console.error(`[calculateAdvisorMetrics] Error querying ${table} batch ${Math.floor(i / batchSize) + 1}:`, error);
        } else if (data) {
          results.push(...data as T[]);
        }
      }
      return results;
    };
    
    // Calculate metrics using direct queries instead of RPC functions
    // 1. Lead Metrics - Batch query to avoid IN clause limits
    // Note: sentiment column doesn't exist in leads table, using null/empty for now
    const leads = await batchQuery<{ id: string; current_status: string | null }>('leads', 'id, current_status', 'id', leadIds);
    
    console.log('[calculateAdvisorMetrics] Found', leads?.length || 0, 'leads in database');
    
    const activeLeads = leads?.length || 0;
    // sentiment column doesn't exist - returning 0 for all sentiment metrics
    const sentimentPositive = 0;
    const sentimentNegative = 0;
    const sentimentNeutral = activeLeads; // All leads treated as neutral since no sentiment field
    const engagedLeads = leads?.filter((l: { current_status: string | null }) => l.current_status === 'Engaged' || l.current_status === 'Converted').length || 0;
    const notEngagedLeads = activeLeads - engagedLeads;
    
    // Check which leads have been called
    const calledLeadsData = await batchQuery<{ lead_id: string }>('calls', 'lead_id', 'lead_id', leadIds);
    const calledLeadIds = new Set(calledLeadsData.map((c: { lead_id: string }) => c.lead_id));
    const calledLeads = calledLeadIds.size;
    const notCalledLeads = activeLeads - calledLeads;
    
    // Check email, SMS, WhatsApp sent
    const emailConversations = await batchQuery<{ id: number; lead_id: string }>('email_conversation', 'id, lead_id', 'lead_id', leadIds);
    const emailSent = new Set(emailConversations.map((ec: { lead_id: string }) => ec.lead_id)).size;
    
    // For SMS and WhatsApp, we need to query separately to filter by message_type
    const smsMessagesFiltered = await Promise.all(
      Array.from({ length: Math.ceil(leadIds.length / batchSize) }, (_, i) => {
        const batch = leadIds.slice(i * batchSize, (i + 1) * batchSize);
        return supabase
          .from('leads_sms_whatsapp_conversations')
          .select('lead_id')
          .in('lead_id', batch)
          .eq('message_type', 'SMS')
          .then(({ data }: { data: { lead_id: string }[] | null }) => data || []);
      })
    );
    const smsSent = new Set(smsMessagesFiltered.flat().map((s: { lead_id: string }) => s.lead_id)).size;
    
    const whatsappMessagesFiltered = await Promise.all(
      Array.from({ length: Math.ceil(leadIds.length / batchSize) }, (_, i) => {
        const batch = leadIds.slice(i * batchSize, (i + 1) * batchSize);
        return supabase
          .from('leads_sms_whatsapp_conversations')
          .select('lead_id')
          .in('lead_id', batch)
          .eq('message_type', 'WhatsApp')
          .then(({ data }: { data: { lead_id: string }[] | null }) => data || []);
      })
    );
    const whatsappSent = new Set(whatsappMessagesFiltered.flat().map((w: { lead_id: string }) => w.lead_id)).size;
    
    // 2. Call Metrics
    const calls = await batchQuery<{ id: number; advisor_name: string | null; call_score: number | null }>('calls', 'id, advisor_name, call_score', 'lead_id', leadIds);
    
    const totalCalls = calls.length;
    const charlotteFoxCalls = calls.filter((c: { advisor_name: string | null; call_score: number | null }) => c.advisor_name === 'Charlotte Fox Vapi').length;
    const advisorCalls = totalCalls - charlotteFoxCalls;
    const positiveCalls = calls.filter((c: { call_score: number | null }) => c.call_score && c.call_score >= 7).length;
    const negativeCalls = calls.filter((c: { call_score: number | null }) => c.call_score && c.call_score < 4).length;
    
    // 3. Message Metrics (SMS and WhatsApp replies)
    const inboundSmsBatches = await Promise.all(
      Array.from({ length: Math.ceil(leadIds.length / batchSize) }, (_, i) => {
        const batch = leadIds.slice(i * batchSize, (i + 1) * batchSize);
        return supabase
          .from('leads_sms_whatsapp_conversations')
          .select('id')
          .in('lead_id', batch)
          .eq('message_type', 'SMS')
          .eq('is_inbound', true)
          .then(({ data }: { data: { id: string }[] | null }) => data || []);
      })
    );
    const smsReplies = inboundSmsBatches.flat().length;
    
    const inboundWhatsappBatches = await Promise.all(
      Array.from({ length: Math.ceil(leadIds.length / batchSize) }, (_, i) => {
        const batch = leadIds.slice(i * batchSize, (i + 1) * batchSize);
        return supabase
          .from('leads_sms_whatsapp_conversations')
          .select('id')
          .in('lead_id', batch)
          .eq('message_type', 'WhatsApp')
          .eq('is_inbound', true)
          .then(({ data }: { data: { id: string }[] | null }) => data || []);
      })
    );
    const whatsappReplies = inboundWhatsappBatches.flat().length;
    
    // 4. Email Metrics
    const emailConversationIds = emailConversations.map((ec: { id: number }) => ec.id);
    const { data: emailMessages } = emailConversationIds.length > 0
      ? await supabase
          .from('email_messages')
          .select('direction, open_count, clicks_count, mpp_opens_count, marked_as_spam, unsubscribed, conversation_id')
          .in('conversation_id', emailConversationIds)
      : { data: [] };
    
    const totalEmails = emailMessages?.length || 0;
    const inboundEmails = emailMessages?.filter((em: { direction: string | null }) => em.direction === 'Inbound').length || 0;
    const outboundEmails = emailMessages?.filter((em: { direction: string | null }) => em.direction === 'Outbound').length || 0;
    const totalOpens = emailMessages?.reduce((sum: number, em: { open_count: number | null }) => sum + (em.open_count || 0), 0) || 0;
    const totalClicks = emailMessages?.reduce((sum: number, em: { clicks_count: number | null }) => sum + (em.clicks_count || 0), 0) || 0;
    const mppOpens = emailMessages?.reduce((sum: number, em: { mpp_opens_count: number | null }) => sum + (em.mpp_opens_count || 0), 0) || 0;
    const nonMppOpens = totalOpens - mppOpens;
    const spamCount = emailMessages?.filter((em: { marked_as_spam: boolean | null }) => em.marked_as_spam === true).length || 0;
    const unsubscribedCount = emailMessages?.filter((em: { unsubscribed: boolean | null }) => em.unsubscribed === true).length || 0;
    const emailReplies = inboundEmails; // Inbound emails count as replies
    const openRate = outboundEmails > 0 ? (nonMppOpens / outboundEmails) * 100 : 0;
    const clickRate = outboundEmails > 0 ? (totalClicks / outboundEmails) * 100 : 0;
    const mppOpenRate = outboundEmails > 0 ? (mppOpens / outboundEmails) * 100 : 0;
    const nonMppOpenRate = outboundEmails > 0 ? (nonMppOpens / outboundEmails) * 100 : 0;
    
    // 5. Other Metrics (Contacts, Opportunities, Policies)
    const contacts = await batchQuery<{ id: string }>('contacts', 'id', 'originating_lead', leadIds);
    const totalContacts = contacts.length;
    
    const contactIds = contacts.map((c: { id: string }) => c.id);
    const { data: opportunities } = contactIds.length > 0
      ? await supabase
          .from('opportunities')
          .select('id, amount, status')
          .in('contact_id', contactIds)
          .eq('status', 'Open')
      : { data: [] };
    const openOpportunities = opportunities?.length || 0;
    const totalOpportunityValue = opportunities?.reduce((sum: number, opp: { amount: number | null }) => sum + (opp.amount || 0), 0) || 0;
    
    const opportunityIds = opportunities?.map((o: { id: string }) => o.id) || [];
    const { data: policies } = opportunityIds.length > 0
      ? await supabase
          .from('policies_valuations')
          .select('id, valuation_amount, status')
          .in('opportunity_id', opportunityIds)
          .eq('status', 'Active')
      : { data: [] };
    const activePolicies = policies?.length || 0;
    const totalPolicyValue = policies?.reduce((sum: number, pol: { valuation_amount: number | null }) => sum + (pol.valuation_amount || 0), 0) || 0;
    
    // Get recent calls for this advisor's leads - batch query then sort/limit
    const allRecentCalls = await Promise.all(
      Array.from({ length: Math.ceil(leadIds.length / batchSize) }, (_, i) => {
        const batch = leadIds.slice(i * batchSize, (i + 1) * batchSize);
        return supabase
          .from('calls')
          .select(`
            id,
            lead_id,
            created_at,
            advisor_name,
            call_score,
            summary,
            call_ended_reason,
            leads(contact_first_name, contact_last_name)
          `)
          .in('lead_id', batch)
          .then(({ data }: { data: any[] | null }) => data || []);
      })
    );
    // Sort by created_at descending and limit to 5
    const recentCalls = allRecentCalls.flat()
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    // Get VAPI calls specifically (Charlotte Fox calls with answered statuses)
    const allVapiCalls = await Promise.all(
      Array.from({ length: Math.ceil(leadIds.length / batchSize) }, (_, i) => {
        const batch = leadIds.slice(i * batchSize, (i + 1) * batchSize);
        return supabase
          .from('calls')
          .select('id, lead_id, call_ended_reason')
          .in('lead_id', batch)
          .eq('advisor_name', 'Charlotte Fox Vapi')
          .in('call_ended_reason', [
            'assistant-ended-call',
            'customer-ended-call', 
            'customer_ended_call',
            'advisor_ended_call',
            'exceeded-max-duration'
          ])
          .then(({ data }: { data: any[] | null }) => data || []);
      })
    );
    const vapiCalls = allVapiCalls.flat();
    
    // Get leads by date for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allLeadsByDate = await Promise.all(
      Array.from({ length: Math.ceil(leadIds.length / batchSize) }, (_, i) => {
        const batch = leadIds.slice(i * batchSize, (i + 1) * batchSize);
        return supabase
          .from('leads')
          .select('created_on')
          .in('id', batch)
          .gte('created_on', thirtyDaysAgo.toISOString().split('T')[0])
          .then(({ data }: { data: { created_on: string | null }[] | null }) => data || []);
      })
    );
    const leadsByDate = allLeadsByDate.flat().sort((a: { created_on: string | null }, b: { created_on: string | null }) => {
      const dateA = a.created_on ? new Date(a.created_on).getTime() : 0;
      const dateB = b.created_on ? new Date(b.created_on).getTime() : 0;
      return dateA - dateB;
    });
    
    // Process leads by date data
    const leadsByDateMap = new Map<string, number>();
    if (leadsByDate && leadsByDate.length > 0) {
      leadsByDate.forEach((lead: { created_on: string | null }) => {
        const date = lead.created_on?.split('T')[0] || new Date().toISOString().split('T')[0];
        leadsByDateMap.set(date, (leadsByDateMap.get(date) || 0) + 1);
      });
    }
    
    const leadsByDateArray = Array.from(leadsByDateMap.entries()).map(([date, count]) => ({
      date,
      count
    }));
    
    // Get recent calls with lead names (using correct column names: contact_first_name, contact_last_name)
    const recentCallsWithNames = recentCalls.map((call: any) => {
      const lead = Array.isArray(call.leads) ? call.leads[0] : call.leads;
      const firstName = lead?.contact_first_name || '';
      const lastName = lead?.contact_last_name || '';
      const leadName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || 'Unknown Lead');
      return {
        id: call.id,
        lead_name: leadName,
        created_at: call.created_at,
        advisor_name: call.advisor_name,
        call_score: call.call_score,
        summary: call.summary,
        call_ended_reason: call.call_ended_reason
      };
    }) || [];
    
    // Build response with calculated metrics (using direct query results)
    const response = {
      stats: {
        activeLeads: activeLeads,
        totalContacts: totalContacts,
        openOpportunities: openOpportunities,
        activePolicies: activePolicies,
        totalOpportunityValue: totalOpportunityValue,
        totalPolicyValue: totalPolicyValue,
      },
      analytics: {
        sentimentAnalysis: {
          positive: sentimentPositive,
          negative: sentimentNegative,
          neutral: sentimentNeutral,
          total: activeLeads,
        },
        engagementStatus: {
          engaged: engagedLeads,
          notEngaged: notEngagedLeads,
          total: activeLeads,
        },
        callStatus: {
          called: calledLeads,
          notCalled: notCalledLeads,
          total: activeLeads,
        },
        omnichannelProgress: {
          email: emailSent,
          sms: smsSent,
          whatsapp: whatsappSent,
          call: vapiCalls.length, // Use actual VAPI calls count
          total: activeLeads,
        },
      },
      emailAnalytics: {
        totalEmails: totalEmails,
        inboundEmails: inboundEmails,
        outboundEmails: outboundEmails,
        totalOpens: totalOpens,
        totalClicks: totalClicks,
        mppOpens: mppOpens,
        nonMppOpens: nonMppOpens,
        spamCount: spamCount,
        unsubscribedCount: unsubscribedCount,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        mppOpenRate: Math.round(mppOpenRate * 100) / 100,
        nonMppOpenRate: Math.round(nonMppOpenRate * 100) / 100,
      },
              omnichannelReplies: {
          email: emailReplies,
          sms: smsReplies,
          whatsapp: whatsappReplies,
          vapi: vapiCalls.length, // VAPI calls that were answered (various engagement statuses)
          total: emailReplies + smsReplies + whatsappReplies + vapiCalls.length,
        },
      callMetrics: {
        totalCalls: totalCalls,
        charlotteFoxCalls: charlotteFoxCalls,
        advisorCalls: advisorCalls,
        positiveCalls: positiveCalls,
        negativeCalls: negativeCalls,
      },
      recentCalls: recentCallsWithNames,
      leadsByDate: leadsByDateArray,
      adminKpis: null,
    };
    
    console.log('[calculateAdvisorMetrics] Returning response with', activeLeads, 'active leads');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[calculateAdvisorMetrics] Error calculating advisor metrics:', error);
    return NextResponse.json({ error: 'Failed to calculate advisor metrics' }, { status: 500 });
  }
}