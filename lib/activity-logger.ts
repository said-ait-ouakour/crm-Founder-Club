import { createServerClient } from "@supabase/ssr";

interface LogActionParams {
  user_id: string;
  endpoint: string;
  action: string;
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    if (!params.user_id) return;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() {
            return "";
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("user_id", params.user_id)
      .single();

    if (userError || !userData) {
      console.warn("User not found for logging:", params.user_id, userError?.message);
      return;
    }

    const { error } = await supabase.from("logs").insert({
      user_id: userData.id,
      endpoint: params.endpoint,
      action: params.action,
    });

    if (error) {
      console.error("Failed to save activity log:", error);
    }
  } catch (error) {
    console.error("Activity logging error:", error);
  }
}

export function detectAction(endpoint: string, method: string): string {
  const cleanEndpoint = endpoint.split("?")[0].replace(/\/$/, "");
  const parts = cleanEndpoint.split("/").filter(Boolean);

  if (parts[0] === "api") {
    const resource = parts[1] || "unknown";
    const hasId = parts.length > 2 && parts[2] !== "new";

    const actionMap: Record<string, string> = {
      GET: hasId ? `GET_${resource.toUpperCase()}` : `LIST_${resource.toUpperCase()}`,
      POST: `CREATE_${resource.toUpperCase()}`,
      PUT: `UPDATE_${resource.toUpperCase()}`,
      PATCH: `UPDATE_${resource.toUpperCase()}`,
      DELETE: `DELETE_${resource.toUpperCase()}`,
    };

    return actionMap[method] || `${method}_${resource.toUpperCase()}`;
  }

  return `${method}_${cleanEndpoint.replace(/\//g, "_").toUpperCase()}`;
}
