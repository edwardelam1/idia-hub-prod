import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { recordHubNotification } from "@/lib/hub-notifications";

/**
 * Mounted once globally inside AppLayout. Listens to realtime postgres_changes
 * on key event tables and persists rows into hub_notifications so the bell
 * actually shows activity.
 */
const NotificationsBridge = () => {
  const { user } = useAuth();
  const userId = user?.user_id;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-bridge-${userId}`)
      // Liability Shield mints / egress events
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "egress_logs", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Record<string, any>;
          const hash = row.liability_token_hash as string | undefined;
          const truncated = hash ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : "Egress recorded";
          recordHubNotification({
            title: "Liability Shield minted",
            body: `${row.egress_type || "EGRESS"} · ${truncated}`,
            category: "shield",
            severity: "success",
            link: "/trading",
            metadata: { egress_id: row.id, hash },
          });
        },
      )
      // Synapse Credit ledger movements
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "synapse_credit_ledger", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Record<string, any>;
          const entryType = (row.entry_type as string) || "ENTRY";
          const amount = Number(row.amount ?? 0);
          const severity: "info" | "success" | "warning" =
            entryType === "USAGE" ? "warning" : entryType === "ROYALTY" || entryType === "PURCHASE" ? "success" : "info";
          const sign = amount >= 0 ? "+" : "";
          recordHubNotification({
            title: `Synapse Credits · ${entryType}`,
            body: `${sign}${amount.toFixed(2)} CR${row.description ? ` — ${row.description}` : ""}`,
            category: "credits",
            severity,
            link: "/settings",
            metadata: { ledger_id: row.id, entry_type: entryType, amount },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
};

export default NotificationsBridge;