import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logBegin, logExec, logError, logEnd } from "@/lib/hook-logger";
import { sortByAuthority } from "@/lib/role-hierarchy";

export interface HubPlatformUser {
  user_id: string;
  platform_role: string;
  hub_saas_tier: string | null;
  hub_account_type: string | null;
  created_at: string | null;
  name?: string | null;
}

export function useHubPlatformUsers() {
  const [items, setItems] = useState<HubPlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const SCOPE = "useHubPlatformUsers";
    logBegin(SCOPE);
    setLoading(true);
    try {
      logExec(SCOPE, "select platform_users");
      const { data, error } = await supabase
        .from("platform_users")
        .select("user_id, platform_role, hub_saas_tier, hub_account_type, created_at");
      if (error) {
        logError(SCOPE, error);
        setError(error.message);
        return;
      }
      const rows = (data ?? []).map((r: any) => ({ ...r, name: r.user_id.slice(0, 8) }));
      setItems(sortByAuthority(rows as any) as HubPlatformUser[]);
    } catch (e) {
      logError(SCOPE, e);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
      logEnd(SCOPE);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, error, reload };
}