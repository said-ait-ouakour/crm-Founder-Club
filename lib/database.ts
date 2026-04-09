import { th } from "date-fns/locale";
import { supabase } from "./supabase";
import type {
  Lead as LeadType,
  Contact,
  Advisor,
  Opportunity,
  OpportunityProduct,
  FactFind,
  PolicyValuation,
} from "./supabase";
import { GetLexiconCommand } from "@aws-sdk/client-polly";
import { formatDistanceToNow } from "date-fns";

export type Lead = LeadType;

async function getVisibleLeadIdsForAdvisor(advisorAuthId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_visible_lead_ids", {
    p_auth_user_id: advisorAuthId,
  });

  if (error) throw error;
  return (data || []).map((row: { lead_id: string }) => row.lead_id);
}

// Lead CRUD operations
export const leadService = {
  async getAll({
    page = 1,
    pageSize = 20,
    filters = {},
    sortBy = "created_on",
    sortDirection = "desc",
    advisorId = null, // Add Independent Account Manager filtering support
  } = {}) {
    let query = supabase.from("leads").select("*", { count: "exact" });

    // Apply Independent Account Manager filtering first if advisorId is provided
    if (advisorId) {
      try {
        const assignedLeadIds = await getVisibleLeadIdsForAdvisor(advisorId);

        // If Independent Account Manager has no assigned/shared leads, return empty results
        if (assignedLeadIds.length === 0) {
          return { data: [], count: 0 };
        }

        // Filter leads to only those visible to this Independent Account Manager
        query = query.in("id", assignedLeadIds);
      } catch (error) {
        console.error("Error applying Independent Account Manager filter:", error);
        return { data: [], count: 0 };
      }
    }

    // Enhanced search: support full name (first + last, last + first), first, last, or email
    const filtersCopy = { ...filters };

    if (
      "search" in filtersCopy &&
      typeof filtersCopy["search"] === "string" &&
      filtersCopy["search"].trim() !== ""
    ) {
      const search = `%${filtersCopy["search"].replace(/%/g, "\\%")}%`;
      // Compose all name/email search options
      query = query.or(
        `contact_first_name.ilike.${search},` +
          `contact_last_name.ilike.${search},` +
          `contact_email.ilike.${search},` +
          `concat_ws(' ',contact_first_name,contact_last_name).ilike.${search},` +
          `concat_ws(' ',contact_last_name,contact_first_name).ilike.${search}`
      );
      delete filtersCopy["search"];
    }

    // Process filters
    Object.entries(filtersCopy).forEach(([key, value]) => {
      if (value && value !== "all") {
        // Handle range filters (e.g., annual_revenue, budget)
        if (typeof value === "string") {
          if (value.startsWith("gte.")) {
            const val = value.split(".")[1];
            query = query.gte(key.replace("_max", ""), val);
          } else if (value.startsWith("lte.")) {
            const val = value.split(".")[1];
            query = query.lte(key.replace("_max", ""), val);
          } else if (value === "true" || value === "false") {
            // Handle boolean values
            query = query.eq(key, value === "true");
          } else if (!isNaN(Number(value))) {
            // Handle numeric values
            query = query.eq(key, Number(value));
          } else {
            // Standard equality filter for strings
            query = query.eq(key, value);
          }
        } else if (Array.isArray(value)) {
          // Handle array filters (e.g., in operator)
          query = query.in(key, value);
        } else {
          // Fallback to equality filter
          query = query.eq(key, value);
        }
      }
    });

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === "asc" });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as Lead[], count };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async getLeadSituation(leadId: string) {
    const { data, error } = await supabase
      .from("lead_situation")
      .select("*")
      .eq("lead_id", leadId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // Ignore not found error
    return data;
  },

  async create(lead: Omit<Lead, "id" | "created_on">) {
    const { data, error } = await supabase
      .from("leads")
      .insert([lead])
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async update(id: string, updates: Partial<Lead>) {
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async updatePipelineStage(leadId: string, newStage: number, force = false): Promise<{ success: boolean; error?: string; new_stage?: number }> {
    const { data, error } = await supabase.rpc("update_lead_pipeline_stage", {
      p_lead_id: leadId,
      p_new_stage: newStage,
      p_force: force,
    });
    if (error) throw error;
    return data as { success: boolean; error?: string; new_stage?: number };
  },

  async delete(id: string) {
    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  async bulkAssignAdvisor(leadIds: string[], advisorAuthId: string) { // Independent Account Manager
    // First, get the user record from the users table using the auth id
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("user_id", advisorAuthId)
      .single();

    if (userError) throw userError;
    if (!userRecord) throw new Error("Independent Account Manager not found");

    // First, remove any existing assignments for these leads
    const { error: deleteError } = await supabase
      .from("users_leads")
      .delete()
      .in("lead_id", leadIds);

    if (deleteError) throw deleteError;

    // Then create new assignments using the user's id from the users table
    const assignments = leadIds.map((leadId) => ({
      user_id: userRecord.id,
      lead_id: leadId,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("users_leads")
      .insert(assignments).select(`
        lead_id,
        user_id,
        leads:lead_id ( id, contact_first_name, contact_last_name, contact_email )
      `);

    if (error) throw error;
    return data;
  },

  async convertToContact(
    leadId: string,
    contactData: Omit<Contact, "id" | "created_at" | "last_updated">
  ) {
    // Start a transaction-like operation
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) throw leadError;

    // Create contact with lead data
    const newContact = {
      ...contactData,
      originating_lead: leadId,
      first_name: lead.contact_first_name,
      last_name: lead.contact_last_name,
      email: lead.contact_email,
      mobile_phone: lead.mobile_phone,
      business_telephone: lead.business_telephone,
    };

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert([newContact])
      .select()
      .single();

    if (contactError) throw contactError;

    // Update lead status
    await supabase
      .from("leads")
      .update({ current_status: "Converted" })
      .eq("id", leadId);

    return contact as Contact;
  },
};

// Contact CRUD operations
export const contactService = {
  async getAll({ page = 1, pageSize = 20, filters = {} } = {}) {
    let query = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    // Handle search filter for name or email
    const filtersCopy = { ...filters };
    if (
      "search" in filtersCopy &&
      typeof filtersCopy["search"] === "string" &&
      filtersCopy["search"].trim() !== ""
    ) {
      const search = `%${filtersCopy["search"].replace(/%/g, "\\%")}%`;
      query = query.or(
        `contact_first_name.ilike.${search},contact_last_name.ilike.${search},contact_email.ilike.${search},concat_ws(' ',contact_first_name,contact_last_name).ilike.${search},concat_ws(' ',contact_last_name,contact_first_name).ilike.${search}`
      );
      delete filtersCopy["search"];
    }
    // Add equality filters if needed
    Object.entries(filtersCopy).forEach(([key, value]) => {
      if (value && value !== "all") query = query.eq(key, value);
    });
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as Contact[], count };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Contact;
  },

  async create(contact: Omit<Contact, "id" | "created_at" | "last_updated">) {
    const { data, error } = await supabase
      .from("contacts")
      .insert([contact])
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  },

  async update(id: string, updates: Partial<Contact>) {
    const { data, error } = await supabase
      .from("contacts")
      .update({ ...updates, last_updated: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  },

  async getLeadId(id: string) {
    const { data, error } = await supabase
      .from("contacts")
      .select("lead_id")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data?.lead_id || null;
  },

  async delete(id: string) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);

    if (error) throw error;
  },
};

export const advisorService = { // Independent Account Manager service
  async getAll() {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        users_leads(id, lead_id)
      `)
      .eq("is_active", true);

    if (error) throw error;

    return data.map((item) => ({
      id: item.id,
      fullname: item.fullname,
      email: item.email,
      phone: item.phone,
      user_id: item.user_id,
      role: item.role,
      leads: item.users_leads.map((lead: { id: string; lead_id: string }) => ({
        id: lead.id,
        lead_id: lead.lead_id,
      })),
    }));
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        *,
        users_leads(id, lead_id)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      fullname: data.fullname,
      email: data.email,
      phone: data.phone,
      user_id: data.user_id,
      role: data.role,
      leads: data.users_leads.map((lead: { id: string; lead_id: string }) => ({
        id: lead.id,
        lead_id: lead.lead_id,
      })),
    };
  },
};

// Opportunity CRUD operations
export const opportunityService = {
  async getAll() {
    const { data, error } = await supabase
      .from("opportunities")
      .select(
        `
        *,
        lead:leads(contact_first_name, contact_last_name, contact_email)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Opportunity[];
  },

  async getById(id: string) {
    // Handle the 'new' ID case
    if (id === "new") {
      throw new Error("Invalid opportunity ID: new");
    }

    try {
      console.log(`Fetching opportunity with ID: ${id}`);
      const { data, error, status } = await supabase
        .from("opportunities")
        .select(
          `
          *,
          lead:leads(*)
        `
        )
        .eq("id", id)
        .single();

      console.log("Opportunity fetch result:", { data, error, status });

      if (error) {
        if (error.code === "PGRST116" || status === 406) {
          // No rows returned or not acceptable
          console.log(`Opportunity not found for ID: ${id}`);
          return null;
        }
        console.error("Error fetching opportunity:", error);
        throw error;
      }

      if (!data) {
        console.log(`No data returned for opportunity ID: ${id}`);
        return null;
      }

      console.log("Successfully fetched opportunity:", data);
      return data as Opportunity;
    } catch (error) {
      console.error("Error in opportunityService.getById:", error);
      throw error;
    }
  },

  async getByContactId(contactId: string) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Opportunity[];
  },

  async create(
    opportunity: Omit<Opportunity, "id" | "created_at" | "updated_at"> & {
      products?: Array<Omit<OpportunityProduct, "id" | "opportunity_id" | "created_at" | "updated_at">>
    }
  ) {
    // Extract products from opportunity data
    const { products, ...opportunityData } = opportunity;
    
    // Insert the opportunity first
    const { data: opportunityResult, error: opportunityError } = await supabase
      .from("opportunities")
      .insert([opportunityData])
      .select()
      .single();

    if (opportunityError) throw opportunityError;

    // If there are products, insert them
    if (products && products.length > 0) {
      const productsWithOpportunityId = products.map(product => ({
        ...product,
        opportunity_id: opportunityResult.id
      }));

      const { error: productsError } = await supabase
        .from("opportunity_products")
        .insert(productsWithOpportunityId);

      if (productsError) throw productsError;
    }

    return opportunityResult as Opportunity;
  },

  async update(id: string, updates: Partial<Opportunity>) {
    const { data, error } = await supabase
      .from("opportunities")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Opportunity;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};

// FactFind CRUD operations
export const factFindService = {
  async getAll() {
    const { data, error } = await supabase
      .from("factfinds")
      .select(
        `
        *,
        contact:contacts(first_name, last_name, email)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as FactFind[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("factfinds")
      .select(
        `
        *,
        contact:contacts(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as FactFind;
  },

  async getByContactId(contactId: string) {
    const { data, error } = await supabase
      .from("factfinds")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as FactFind[];
  },

  async create(factFind: Omit<FactFind, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from("factfinds")
      .insert([factFind])
      .select()
      .single();

    if (error) throw error;
    return data as FactFind;
  },

  async update(id: string, updates: Partial<FactFind>) {
    console.log("Updating fact find:", updates);
    const { data, error } = await supabase
      .from("factfinds")
      .update({ ...updates, updated_at: new Date() })
      .eq("id", id)
      .select()
      .single();
    console.log('done');
    if (error) throw error;
    return data as FactFind;
  },

  async delete(id: string) {
    const { error } = await supabase.from("factfinds").delete().eq("id", id);

    if (error) throw error;
  },
};

// Policy & Valuation CRUD operations
export const policyService = {
  async getAll() {
    const { data, error } = await supabase
      .from("policies_valuations")
      .select(
        `
        *,
        opportunity:opportunities(name, contact:contacts(first_name, last_name))
      `
      )
      .order("created_on", { ascending: false });

    if (error) throw error;
    return data as PolicyValuation[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("policies_valuations")
      .select(
        `
          *,
          opportunity:opportunities(*, contact:contacts(*))
        `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned or not acceptable
        return null;
      }
      throw error;
    }

    return data as PolicyValuation;
  },

  async getByOpportunityId(opportunityId: string) {
    const { data, error } = await supabase
      .from("policies_valuations")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("created_on", { ascending: false });

    if (error) throw error;
    return data as PolicyValuation[];
  },

  async create(
    policy: Omit<PolicyValuation, "id" | "created_on" | "updated_at">
  ) {
    const { data, error } = await supabase
      .from("policies_valuations")
      .insert([policy])
      .select()
      .single();

    if (error) throw error;
    return data as PolicyValuation;
  },

  async update(id: string, updates: Partial<PolicyValuation>) {
    const { data, error } = await supabase
      .from("policies_valuations")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as PolicyValuation;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from("policies_valuations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
//emails states
export const emailService = {
  async getLead(id: string) {
    const leadId = (await contactService.getById(id)).lead_id || null;
    if (!leadId) {
      throw new Error("Lead ID not found for contact");
    }
    return leadId;
  },
  async getStats(id: string) {
    const { data, error } = await supabase
      .from("email_conversation")
      .select(
        `
        id,
        lead_id,
        email_messages (
          conversation_id,
          direction,
          clicks_count,
          open_count,
          marked_as_spam,
          unsubscribed
        )
      `
      )
      .eq("lead_id", await this.getLead(id));

    if (error) throw error;
    // console.log("Email stats data:", data);
    return {
      inBoundEmails: data.reduce((count, email) => {
        if (Array.isArray(email.email_messages)) {
          return (
            count +
            email.email_messages.filter((msg) => msg.direction === "Inbound")
              .length
          );
        }
        return count;
      }, 0),
      outBoundEmails: data.reduce((count, email) => {
        if (Array.isArray(email.email_messages)) {
          return (
            count +
            email.email_messages.filter((msg) => msg.direction === "Outbound")
              .length
          );
        }
        return count;
      }, 0),
      status: {
        clicksCount: data.reduce((count, email) => {
          if (Array.isArray(email.email_messages)) {
            return (
              count +
              email.email_messages.reduce(
                (sum, msg) => sum + (msg.clicks_count || 0),
                0
              )
            );
          }
          return count;
        }, 0),
        openCount: data.reduce((count, email) => {
          if (Array.isArray(email.email_messages)) {
            return (
              count +
              email.email_messages.reduce(
                (sum, msg) => sum + (msg.open_count || 0),
                0
              )
            );
          }
          return count;
        }, 0),
        marked_as_spam: data.reduce((count, email) => {
          if (Array.isArray(email.email_messages)) {
            return (
              count +
              email.email_messages.filter(
                (msg) => msg.marked_as_spam !== "FALSE"
              ).length
            );
          }
          return count;
        }, 0),
        unsubscribed: data.reduce((count, email) => {
          if (Array.isArray(email.email_messages)) {
            return (
              count +
              email.email_messages.filter((msg) => msg.unsubscribed !== "FALSE")
                .length
            );
          }
          return count;
        }, 0),
      },
    };
  },

  //lead curret stat
  async getLeadStatus(id: string) {
    const leadId = await this.getLead(id); // get the lead ID from the contact ID
    const { data, error } = await supabase
      .from("leads")
      .select(
        `
        current_progress,
        lead_situation(
        summary,
        last_update
        )`
      )
      .eq("id", leadId)
      .single();

    if (error) throw error;

    return {
      current_progress: data?.current_progress || "Unknown Status",
      summary: data?.lead_situation[0]?.summary || "No Summary Available",
      last_update: data?.lead_situation[0]?.last_update
        ? formatDistanceToNow(new Date(data?.lead_situation[0]?.last_update), {
            addSuffix: true,
          })
        : "Unknown",
    };
  },

  // call informations
  async getCallSummary(id: string) {
    const { data, error } =
      (await supabase
        .from("calls")
        .select(
          `
        id,
        lead_id,
        created_at,
        advisor_name,
        analysis,
        summary,
        call_score
      `
        )
        .eq("lead_id", await this.getLead(id))
        .order("created_at", { ascending: false })
        .limit(1)
        .single()) || null;
    if (error) throw error;

    return {
      createdAt: new Date(data.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      advisorName: data.advisor_name,
      analysis: data.analysis,
      summary: data.summary,
      score: data.call_score,
    };
  },
};

// Dashboard statistics
export const dashboardService = {
  async getStats(advisorId?: string) {
    // Build leads query based on Independent Account Manager role
    let leadsQuery = supabase
      .from("leads")
      .select("id", { count: "exact", head: true });

    // If advisorId is provided, filter leads to only those assigned to this Independent Account Manager
    if (advisorId) {
      try {
        const assignedLeadIds = await getVisibleLeadIdsForAdvisor(advisorId);

        // If Independent Account Manager has no assigned/shared leads, return 0
        if (assignedLeadIds.length === 0) {
          leadsQuery = supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("id", "no-match");
        } else {
          // Filter leads to only those visible to this Independent Account Manager
          leadsQuery = supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .in("id", assignedLeadIds);
        }
      } catch (error) {
        console.error(
          "Error applying Independent Account Manager filter to dashboard stats:",
          error
        );
        // On error, return 0 for leads
        leadsQuery = supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("id", "no-match");
      }
    }

    // Use count: 'exact' to get accurate row counts for each entity
    const [leads, contacts, opportunities, policies] = await Promise.all([
      leadsQuery,
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase
        .from("opportunities")
        .select("id, status, amount")
        .eq("status", "Open"),
      supabase
        .from("policies_valuations")
        .select("id, status, valuation_amount")
        .eq("status", "Active"),
    ]);

    const totalOpportunityValue =
      opportunities.data?.reduce((sum, opp) => sum + (opp.amount || 0), 0) || 0;
    const totalPolicyValue =
      policies.data?.reduce(
        (sum, pol) => sum + (pol.valuation_amount || 0),
        0
      ) || 0;

    // Do NOT fetch omnichannel replies here
    return {
      activeLeads: leads.count || 0,
      totalContacts: contacts.count || 0,
      openOpportunities: opportunities.data?.length || 0,
      activePolicies: policies.data?.length || 0,
      totalOpportunityValue,
      totalPolicyValue,
    };
  },

  /**
   * Get email analytics from email_messages table
   * Returns comprehensive email statistics including MPP and non-MPP metrics
   */
  async getEmailAnalytics(advisorId?: string) {
    try {
      // Get all email messages
      const { data: messages, error } = await supabase
        .from("email_messages")
        .select(`
          id,
          direction,
          clicks_count,
          open_count,
          mpp_opens_count,
          marked_as_spam,
          unsubscribed,
          email_conversation (
            lead_id
          )
        `);

      if (error) throw error;

      if (!messages || messages.length === 0) {
        return {
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
        };
      }

      // Apply Independent Account Manager filtering if needed
      let filteredMessages = messages;
      if (advisorId) {
        const visibleLeadIds = await getVisibleLeadIdsForAdvisor(advisorId);
        if (visibleLeadIds.length > 0) {
          filteredMessages = messages.filter((msg: any) =>
            visibleLeadIds.includes(msg.email_conversation.lead_id)
          );
        } else {
          // No visible leads, return empty analytics
          return {
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
          };
        }
      }

      // Calculate analytics
      let inboundEmails = 0;
      let outboundEmails = 0;
      let totalOpens = 0;
      let totalClicks = 0;
      let mppOpens = 0;
      let nonMppOpens = 0;
      let spamCount = 0;
      let unsubscribedCount = 0;

      filteredMessages.forEach((message: any) => {
        // Count by direction
        if (message.direction === "Inbound") {
          inboundEmails++;
        } else if (message.direction === "Outbound") {
          outboundEmails++;
        }

        // Count opens and clicks
        totalOpens += Number(message.open_count || 0);
        totalClicks += Number(message.clicks_count || 0);
        mppOpens += Number(message.mpp_opens_count || 0);
        nonMppOpens += Number(message.open_count || 0) - Number(message.mpp_opens_count || 0);

        // Count spam and unsubscribed
        if (message.marked_as_spam) {
          spamCount++;
        }
        if (message.unsubscribed) {
          unsubscribedCount++;
        }
      });

      const totalEmails = inboundEmails + outboundEmails;
      const outboundEmailsForRates = outboundEmails; // Only outbound emails count for rates

      // Calculate rates (only for outbound emails)
      const openRate = outboundEmailsForRates > 0 ? (nonMppOpens / outboundEmailsForRates) * 100 : 0; // Open rate without MPP
      const clickRate = outboundEmailsForRates > 0 ? (totalClicks / outboundEmailsForRates) * 100 : 0;
      const mppOpenRate = outboundEmailsForRates > 0 ? (mppOpens / outboundEmailsForRates) * 100 : 0;
      const nonMppOpenRate = outboundEmailsForRates > 0 ? (nonMppOpens / outboundEmailsForRates) * 100 : 0;

      return {
        totalEmails,
        inboundEmails,
        outboundEmails,
        totalOpens,
        totalClicks,
        mppOpens,
        nonMppOpens,
        spamCount,
        unsubscribedCount,
        openRate: Math.round(openRate * 100) / 100, // Round to 2 decimal places
        clickRate: Math.round(clickRate * 100) / 100,
        mppOpenRate: Math.round(mppOpenRate * 100) / 100,
        nonMppOpenRate: Math.round(nonMppOpenRate * 100) / 100,
      };
    } catch (error) {
      console.error("Error loading email analytics:", error);
      return {
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
      };
    }
  },

  /**
   * Get omnichannel replies stats for dashboard
   * Now retrieves from engagement_metrics table (latest row)
   * Returns: { email: number, sms: number, whatsapp: number, vapi: number, total: number }
   */
  async getOmnichannelReplies() {
    // Get the latest engagement_metrics row
    const { data, error } = await supabase
      .from("engagement_metrics")
      .select("email_replies, sms_replies, whatsapp_replies, vapi_replies")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { email: 0, sms: 0, whatsapp: 0, vapi: 0, total: 0 };
    }

    const { email_replies, sms_replies, whatsapp_replies, vapi_replies } = data;
    const total =
      Number(email_replies) +
      Number(sms_replies) +
      Number(whatsapp_replies) +
      Number(vapi_replies);

    return {
      email: Number(email_replies),
      sms: Number(sms_replies),
      whatsapp: Number(whatsapp_replies),
      vapi: Number(vapi_replies),
      total,
    };
  },
};

// Add a helper function to fetch leads with opened emails
export const getLeadsWithOpenedEmails = async () => {
  const { data: openedMessages, error: messagesError } = await supabase
    .from('email_messages')
    .select('conversation_id')
    .gt('open_count', 0)
    .not('conversation_id', 'is', null);

  if (messagesError) {
    console.error('Error fetching opened messages:', messagesError);
    return [];
  }

  const conversationIds = [...new Set(openedMessages.map(m => m.conversation_id))];

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: convsWithLeads, error: convsError } = await supabase
    .from('email_conversation')
    .select('lead_id')
    .in('id', conversationIds)
    .not('lead_id', 'is', null);

  if (convsError) {
    console.error('Error fetching conversations for leads:', convsError);
    return [];
  }

  return [...new Set(convsWithLeads.map(c => c.lead_id))];
};

export const getLeadsWithSmsResponses = async (isInbound: boolean) => {
  const { data, error } = await supabase
    .from("leads_sms_whatsapp_conversations")
    .select("lead_id")
    .eq("message_type", "SMS")
    .eq("is_inbound", isInbound);

  if (error) {
    console.error("Error fetching SMS responses:", error);
    return [];
  }

  return [...new Set(data.map((sms) => sms.lead_id))];
};

export const getLeadsWithWhatsappResponses = async (isInbound: boolean) => {
  const { data, error } = await supabase
    .from("leads_sms_whatsapp_conversations")
    .select("lead_id")
    .eq("message_type", "WhatsApp")
    .eq("is_inbound", isInbound);

  if (error) {
    console.error("Error fetching WhatsApp responses:", error);
    return [];
  }

  return [...new Set(data.map((wa) => wa.lead_id))];
};

export const updateCandidateStatus = async (
  candidateId: number,
  status: "not_suitable" | "interview_booked" | "interview_attended" | "not_interested" | "has_position_already"
) => {
  const { error } = await supabase
    .from("candidates")
    .update({ status })
    .eq("id", candidateId);

  if (error) throw error;
};
