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
          const txType = (row.transaction_type as string) || "";
          const amount = Number(row.amount ?? 0);
          const metadata = (row.metadata as Record<string, any>) || {};
          const normalized = entryType.toLowerCase();
          const isPurchase =
            normalized === "deposit" ||
            normalized === "purchase" ||
            txType === "internal_deposit" ||
            metadata.class === "Synapse_Purchase" ||
            metadata.product_class === "SAAS_UTILITY_PURCHASE";
          const isUsage = normalized === "usage" || normalized === "deduction";
          const isRoyalty = normalized === "royalty" || normalized === "revenue";

          const severity: "info" | "success" | "warning" = isUsage
            ? "warning"
            : isPurchase || isRoyalty
              ? "success"
              : "info";

          const sign = amount >= 0 ? "+" : "";
          const usd = Number(metadata.usd_amount);
          const hash = row.blockchain_tx_hash as string | undefined;
          const truncatedHash =
            hash && hash.startsWith("0x") && hash.length > 16
              ? ` · ${hash.slice(0, 8)}…${hash.slice(-6)}`
              : "";

          const title = isPurchase
            ? "Synapse Credits purchased"
            : isUsage
              ? "Synapse Credits · usage"
              : isRoyalty
                ? "Synapse Credits · royalty"
                : `Synapse Credits · ${entryType}`;

          const body = isPurchase
            ? `${sign}${amount.toFixed(2)} CR${Number.isFinite(usd) && usd > 0 ? ` ($${usd.toFixed(2)})` : ""}${truncatedHash}`
            : `${sign}${amount.toFixed(2)} CR${row.description ? ` — ${row.description}` : ""}`;

          recordHubNotification({
            title,
            body,
            category: "credits",
            severity,
            link: "/settings",
            metadata: {
              ledger_id: row.id,
              entry_type: entryType,
              transaction_type: txType,
              amount,
              usd_amount: Number.isFinite(usd) ? usd : null,
              hash: hash ?? null,
            },
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