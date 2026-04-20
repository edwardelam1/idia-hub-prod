import { useState, useEffect, useRef } from "react";
import { supabase } from "../integrations/supabase/client";

export interface PipelineActivity {
  id: string;
  type: "apple_sync" | "synapse_staged" | "library_entry" | "delt_transfer" | "royalty_payment";
  details: any;
  timestamp: number;
}

export const usePipelineActivity = () => {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [activeStages, setActiveStages] = useState<Record<string, boolean>>({
    ingest: false,
    synapse: false,
    library: false,
    delt: false,
    settle: false,
  });
  const [activityCount, setActivityCount] = useState(0);

  // Timeouts to individually control the glow of each node
  const timeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const lightUpStage = (stage: string) => {
    setActiveStages((prev) => ({ ...prev, [stage]: true }));

    if (timeouts.current[stage]) {
      clearTimeout(timeouts.current[stage]);
    }

    timeouts.current[stage] = setTimeout(() => {
      setActiveStages((prev) => ({ ...prev, [stage]: false }));
    }, 3500); // 3.5 seconds of illumination per node
  };

  const addActivity = (newActivity: Omit<PipelineActivity, "timestamp">, stageKey: string) => {
    setActivities((prev) => [{ ...newActivity, timestamp: Date.now() }, ...prev].slice(0, 50));
    setActivityCount((prev) => prev + 1);
    lightUpStage(stageKey);
  };

  useEffect(() => {
    // 1. Apple Health Ingestion -> ACA Record
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

    // 2. Synapse Valuation Staging
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

    // 3. University Library Cataloging (Marketplace Bundles)
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

    // 4. DELT Egress Transfer
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

    // 5. User Wallet Royalty Payment
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
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, []);

  return { activities, activeStages, activityCount };
};
