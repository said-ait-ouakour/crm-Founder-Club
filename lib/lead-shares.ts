import { supabase } from "@/lib/supabase";

export type LeadVisibilityRow = {
  lead_id: string;
  is_assigned: boolean;
  is_shared: boolean;
};

export async function getVisibleLeadIds(authUserId: string): Promise<LeadVisibilityRow[]> {
  const { data, error } = await supabase.rpc("get_visible_lead_ids", {
    p_auth_user_id: authUserId,
  });

  if (error) throw error;
  return (data || []) as LeadVisibilityRow[];
}

export async function shareLeadWithUser(params: {
  leadId: string;
  userAuthId: string;
  sharedByAuthUserId?: string | null;
  canEdit?: boolean;
  accessLevel?: "view" | "edit";
}) {
  const { data, error } = await supabase.rpc("share_lead_with_auth_user", {
    p_lead_id: params.leadId,
    p_target_auth_user_id: params.userAuthId,
    p_shared_by_auth_user_id: params.sharedByAuthUserId ?? null,
    p_can_edit: params.canEdit ?? false,
    p_access_level: params.accessLevel ?? "view",
  });

  if (error) throw error;
  return data;
}

export async function unshareLeadFromUser(leadId: string, userAuthId: string) {
  const { data, error } = await supabase.rpc("unshare_lead_from_auth_user", {
    p_lead_id: leadId,
    p_target_auth_user_id: userAuthId,
  });

  if (error) throw error;
  return data === true;
}
