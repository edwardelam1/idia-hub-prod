import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Add the missing pipeline stages to the ProtocolActivityType union
export type ProtocolActivityType =
  | "bundle_created"
  | "data_processed"
  | "user_connected"
  | "delt_transfer"
  | "api_call"
  | "apple_health_sync" // Added for Ingestion Ingest
  | "synapse_controller" // Added for Processing Logic
  | "best_friend_ai" // Added for AI Egress
  | "data_sale" // Added for Economic Settlement
  | "royalty_payment"; // Added for Contributor Payout

export interface PipelineActivity {
  id: string;
  type: ProtocolActivityType; // Now recognizes all ironclad stages
  details: any;
  timestamp: number;
}

export const usePipelineActivity = () => {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addActivity = (newActivity: Omit<PipelineActivity, "timestamp">) => {
    console.log(`[Pipeline] New Activity Triggered: ${newActivity.type}`);
    setActivities((prev) => [{ ...newActivity, timestamp: Date.now() }, ...prev].slice(0, 10));
    setActivityCount((prev) => prev + 1);
    setIsActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsActive(false), 3000);
  };

  useEffect(() => {
    console.log("[Pipeline] >>> START: Global Channel Initialization");

    const setupChannels = async () => {
      try {
        // Stage 1: Apple Health Ingestion
        const healthChannel = supabase.channel("live-health");
        if (healthChannel) {
          healthChannel
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "raw_health_data" }, (payload) => {
              addActivity({ id: payload.new.id, type: "apple_health_sync", details: { userId: payload.new.user_id } });
            })
            .subscribe();
        }

        // Stage 2 & 5: Synapse Controller & Royalty
        const ledgerChannel = supabase.channel("live-ledger");
        if (ledgerChannel) {
          ledgerChannel
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "synapse_credit_ledger" },
              (payload) => {
                const type = payload.new.transaction_type === "FEE" ? "synapse_controller" : "royalty_payment";
                addActivity({ id: payload.new.id, type: type as any, details: { desc: payload.new.description } });
              },
            )
            .subscribe();
        }

        // Stage 3: Best Friend AI Egress
        const egressChannel = supabase.channel("live-egress");
        if (egressChannel) {
          egressChannel
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
              addActivity({ id: payload.new.id, type: "best_friend_ai", details: { type: payload.new.egress_type } });
            })
            .subscribe();
        }

        // Visualizer DELT
        const deltChannel = supabase.channel("visualizer-delt");
        if (deltChannel) {
          deltChannel
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "delt_transfers" }, (payload) => {
              addActivity({ id: payload.new.id, type: "delt_transfer", details: payload.new.details });
            })
            .subscribe();
        }

        return { healthChannel, ledgerChannel, egressChannel, deltChannel };
      } catch (err) {
        console.error("[Pipeline] !!! Realtime Setup Failed:", err);
      }
    };

    const channelsPromise = setupChannels();

    return () => {
      console.log("[Pipeline] >>> START: Channel Cleanup");
      channelsPromise.then((channels) => {
        if (channels) {
          Object.values(channels).forEach((ch) => supabase.removeChannel(ch));
        }
      });
      console.log("[Pipeline] <<< END: Cleanup Complete");
    };
  }, []);

  return { activities, isActive, activityCount };
};
