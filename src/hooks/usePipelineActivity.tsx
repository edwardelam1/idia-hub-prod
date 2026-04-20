import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineActivity {
  id: string;
  type: "apple_sync" | "synapse_staged" | "library_entry" | "delt_transfer" | "royalty_payment";
  details: any;
  timestamp: number;
}

export const usePipelineActivity = () => {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [activeStages, setActiveStages] = useState<Record<string, boolean>>({});
  const [activityCount, setActivityCount] = useState(0);

  // Triggers a 3-second visual pulse for a specific pipeline stage
  const lightUpStage = (stage: string) => {
    setActiveStages((prev) => ({ ...prev, [stage]: true }));
    setTimeout(() => {
      setActiveStages((prev) => ({ ...prev, [stage]: false }));
    }, 3000);
  };

  const addActivity = (newActivity: Omit<PipelineActivity, "timestamp">, stageKey: string) => {
    setActivities((prev) => [{ ...newActivity, timestamp: Date.now() }, ...prev].slice(0, 50));
    setActivityCount((prev) => prev + 1);
    lightUpStage(stageKey);
  };

  useEffect(() => {
    // 1. Apple Health Ingestion
    const syncChannel = supabase
      .channel("live-ingestion")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_aca_records" }, (payload) => {
        addActivity(
          {
            id: payload.new.id || crypto.randomUUID(),
            type: "apple_sync",
            details: { label: `Bio-Tether Secured`, hash: payload.new.platform_guid },
          },
          "ingest",
        );
      })
      .subscribe();

    // 2. Synapse Controller
    const synapseChannel = supabase
      .channel("live-synapse")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staged_health_data" }, (payload) => {
        addActivity(
          {
            id: payload.new.id || crypto.randomUUID(),
            type: "synapse_staged",
            details: { label: `Valuation Assessed`, type: payload.new.activity_type },
          },
          "synapse",
        );
      })
      .subscribe();

    // 3. Best Friend AI Library / Consumption
    const libraryChannel = supabase
      .channel("live-library")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_bundles" }, (payload) => {
        addActivity(
          {
            id: payload.new.bundle_id || crypto.randomUUID(),
            type: "library_entry",
            details: { label: `Cataloged for AI`, title: payload.new.title },
          },
          "library",
        );
      })
      .subscribe();

    // 4. DELT Egress / Sale
    const deltChannel = supabase
      .channel("live-delt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        addActivity(
          {
            id: payload.new.id || crypto.randomUUID(),
            type: "delt_transfer",
            details: { label: `DELT Transfer Executed`, token: payload.new.liability_token_hash },
          },
          "delt",
        );
      })
      .subscribe();

    // 5. Final Settlement / Royalty
    const royaltyChannel = supabase
      .channel("live-royalty")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "synapse_credit_ledger" }, (payload) => {
        if (payload.new.entry_type === "ROYALTY" || payload.new.transaction_type === "DATA_SALE") {
          addActivity(
            {
              id: payload.new.id || crypto.randomUUID(),
              type: "royalty_payment",
              details: { label: `Royalty Dropped`, amount: payload.new.amount },
            },
            "settle",
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(syncChannel);
      supabase.removeChannel(synapseChannel);
      supabase.removeChannel(libraryChannel);
      supabase.removeChannel(deltChannel);
      supabase.removeChannel(royaltyChannel);
    };
  }, []);

  return { activities, activeStages, activityCount };
};
