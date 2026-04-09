import { supabase } from "@/lib/supabase";

/** Mirrors `get_leads_filtered` args in `app/leads/page.tsx` (USE_LEADS_RPC path). */
export type GetLeadsFilteredNavigationInput = {
  searchTerm: string;
  filters: Record<string, any>;
  sortKey: string;
  sortDir: "asc" | "desc";
  userId: string | null | undefined;
  isAdvisor: boolean;
  isManager: boolean;
};

const NAV_PAGE_SIZE = 500;
export const NAV_MAX_IDS = 5000;

export function buildGetLeadsFilteredRpcArgs(
  input: GetLeadsFilteredNavigationInput,
  page: number,
  pageSize: number
) {
  const filters = { ...input.filters };

  if (
    filters.not_called_yet !== null &&
    filters.not_called_yet !== undefined &&
    (filters.has_call === null || filters.has_call === undefined)
  ) {
    filters.has_call = !filters.not_called_yet;
  }

  const isUnassigned =
    input.isManager &&
    filters.advisor_id &&
    String(filters.advisor_id).trim() === "__unassigned__";

  const advisorUserId =
    input.isAdvisor && input.userId
      ? input.userId
      : input.isManager &&
          filters.advisor_id &&
          String(filters.advisor_id).trim() !== "" &&
          !isUnassigned
        ? String(filters.advisor_id).trim()
        : null;

  let createdTo: string | null = null;
  if (filters.created_on?.to) {
    const endOfDay = new Date(filters.created_on.to);
    endOfDay.setDate(endOfDay.getDate() + 1);
    createdTo = endOfDay.toISOString();
  }

  const sortKey = String(input.sortKey || "created_on");

  return {
    p_search:
      input.searchTerm && String(input.searchTerm).trim() !== ""
        ? String(input.searchTerm).trim()
        : null,
    p_lead_source: filters.lead_source || null,
    p_status: filters.current_status || null,
    p_progress: filters.current_progress || null,
    p_industry: filters.industry || null,
    p_sic: filters.sic_07_code || null,
    p_employees_band: filters.employees_band_desc || null,
    p_modeled_turnover_band: filters.modeled_turnover_band_desc || null,
    p_engaged: filters.engaged ?? null,
    p_guide_sent: filters.guide_sent || null,
    p_created_from: filters.created_on?.from ? filters.created_on.from.toISOString() : null,
    p_created_to: createdTo,
    p_advisor_user_id: advisorUserId,
    p_unassigned: isUnassigned ? true : null,
    p_visibility_scope:
      filters.visibility_scope && filters.visibility_scope !== "all"
        ? filters.visibility_scope
        : null,
    p_share_status:
      filters.share_status && filters.share_status !== "any"
        ? filters.share_status
        : null,
    p_sentiment: filters.sentiment_analysis || null,
    p_has_notes: filters.has_notes ?? null,
    p_has_call: filters.has_call ?? null,
    p_vapi_score: filters.vapi_score || null,
    p_followed_up: filters.followed_up ?? null,
    p_email_opened: filters.email_opened ?? null,
    p_sms_answered: filters.sms_answered ?? null,
    p_whatsapp_answered: filters.whatsapp_answered ?? null,
    p_inbound_email: filters.inbound_email ?? null,
    p_inbound_whatsapp: filters.inbound_whatsapp ?? null,
    p_page: page,
    p_page_size: pageSize,
    p_sort_key: sortKey,
    p_sort_dir: input.sortDir || "desc",
    p_called_by: filters.called_by && filters.called_by.length > 0 ? filters.called_by : [],
    p_pipeline_stage: filters.pipeline_stage && filters.pipeline_stage.length > 0 ? filters.pipeline_stage : null,
    // Compatibility params
    p_name: null,
    p_email: null,
    p_phone_number: null,
  };
}

/**
 * Fetches ordered lead IDs using the same RPC as the leads list (all pages, capped).
 */
export async function fetchAllLeadIdsViaGetLeadsFiltered(
  input: GetLeadsFilteredNavigationInput
): Promise<{ ids: string[]; total: number }> {
  const effectiveSortKey =
    input.sortKey === "assigned_advisors" ? "created_on" : String(input.sortKey || "created_on");

  const allIds: string[] = [];
  let total = 0;
  let page = 1;

  while (allIds.length < NAV_MAX_IDS) {
    const args = buildGetLeadsFilteredRpcArgs(
      { ...input, sortKey: effectiveSortKey, sortDir: input.sortDir },
      page,
      NAV_PAGE_SIZE
    );

    const { data: rpcRows, error } = await supabase.rpc("get_leads_filtered_v9", args as any);
    if (error) throw error;

    const rows = Array.isArray(rpcRows) ? rpcRows : [];
    if (rows.length === 0) break;

    if (page === 1) {
      total = Number((rows[0] as any).total_count || 0);
    }

    for (const row of rows) {
      const id = (row as any).lead?.id;
      if (id) allIds.push(String(id));
    }

    if (allIds.length >= total || rows.length < NAV_PAGE_SIZE) break;
    page += 1;
  }

  return { ids: allIds.slice(0, NAV_MAX_IDS), total };
}
