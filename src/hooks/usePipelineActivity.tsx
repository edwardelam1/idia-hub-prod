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
  const [isActive, setIsActive] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerActiveState = () => {
    setIsActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsActive(false), 2500);
  };

  const addActivity = (newActivity: Omit<PipelineActivity, "timestamp">) => {
    setActivities((prev) => [{ ...newActivity, timestamp: Date.now() }, ...prev].slice(0, 50));
    setActivityCount((prev) => prev + 1);
    triggerActiveState();
  };

  useEffect(() => {
    // Stage 1: Apple Health Sync (ACA Generation)
    const syncChannel = supabase
      .channel("live-ingestion")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_aca_records" }, (payload) => {
        addActivity({
          id: payload.new.id || crypto.randomUUID(),
          type: "apple_sync",
          details: { label: `Bio-Tether Secured`, hash: payload.new.platform_guid },
        });
      })
      .subscribe();

    // Stage 2: Synapse (Valuation & Routing)
    const synapseChannel = supabase
      .channel("live-synapse")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staged_health_data" }, (payload) => {
        addActivity({
          id: payload.new.id || crypto.randomUUID(),
          type: "synapse_staged",
          details: { label: `Valuation Assessed`, type: payload.new.activity_type, hash: payload.new.aca_hash_key },
        });
      })
      .subscribe();

    // Stage 3: University Library (Market Staging)
    const libraryChannel = supabase
      .channel("live-library")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "data_market_libraries" }, (payload) => {
        addActivity({
          id: payload.new.id || crypto.randomUUID(),
          type: "library_entry",
          details: {
            label: `Library Cataloged`,
            libraryId: payload.new.library_id,
            score: payload.new.granularity_score,
          },
        });
      })
      .subscribe();

    // Stage 4: DELT Transfer / Sale Execution
    const deltChannel = supabase
      .channel("live-delt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        addActivity({
          id: payload.new.id || crypto.randomUUID(),
          type: "delt_transfer",
          details: {
            label: `DELT Transfer Executed`,
            token: payload.new.liability_token_hash,
            egress: payload.new.egress_type,
          },
        });
      })
      .subscribe();

    // Stage 5: User Wallet Royalty Payment
    const royaltyChannel = supabase
      .channel("live-royalty")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "synapse_credit_ledger" }, (payload) => {
        // Filter strictly for user royalty drops
        if (payload.new.entry_type === "ROYALTY") {
          addActivity({
            id: payload.new.id || crypto.randomUUID(),
            type: "royalty_payment",
            details: { label: `Wallet Settled`, amount: payload.new.amount, ref: payload.new.reference_id },
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(syncChannel);
      supabase.removeChannel(synapseChannel);
      supabase.removeChannel(libraryChannel);
      supabase.removeChannel(deltChannel);
      supabase.removeChannel(royaltyChannel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { activities, isActive, activityCount };
};
