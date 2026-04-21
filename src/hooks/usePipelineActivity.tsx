import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Add "delt_transfer" to the allowed ProtocolActivityType
export type ProtocolActivityType =
  | "bundle_created"
  | "data_processed"
  | "user_connected"
  | "delt_transfer" // Add this
  | "api_call";

export interface PipelineActivity {
  id: string;
  type: ProtocolActivityType;
  details: any;
  timestamp: number;
}

export const usePipelineActivity = () => {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addActivity = (newActivity: Omit<PipelineActivity, "timestamp">) => {
    setActivities((prev) => [{ ...newActivity, timestamp: Date.now() }, ...prev].slice(0, 10));
    setActivityCount((prev) => prev + 1);
    setIsActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsActive(false), 3000);
  };

  useEffect(() => {
    // Stage 1: Apple Health Ingestion
    const healthChannel = supabase
      .channel("live-health")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "raw_health_data" }, (payload) => {
        addActivity({ id: payload.new.id, type: "apple_health_sync", details: { userId: payload.new.user_id } });
      })
      .subscribe();

    // Stage 2 & 5: Synapse Controller & Royalty
    const ledgerChannel = supabase
      .channel("live-ledger")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "synapse_credit_ledger" }, (payload) => {
        const type = payload.new.transaction_type === "FEE" ? "synapse_controller" : "royalty_payment";
        addActivity({ id: payload.new.id, type: type as any, details: { desc: payload.new.description } });
      })
      .subscribe();

    // Stage 3: Best Friend AI Egress
    const egressChannel = supabase
      .channel("live-egress")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        addActivity({ id: payload.new.id, type: "best_friend_ai", details: { type: payload.new.egress_type } });
      })
      .subscribe();
    // Inside usePipelineActivity.tsx
    const deltChannel = supabase
      .channel("visualizer-delt")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delt_transfers",
        },
        (payload) => {
          // The attributes are now coming directly from the DB trigger
          addActivity({
            id: payload.new.id,
            type: "delt_transfer",
            details: payload.new.details,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(healthChannel);
      supabase.removeChannel(ledgerChannel);
      supabase.removeChannel(egressChannel);
    };
  }, []);

  return { activities, isActive, activityCount };
};
