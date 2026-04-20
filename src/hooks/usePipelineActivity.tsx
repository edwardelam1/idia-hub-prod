import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineActivity {
  id: string;
  type: "bundle_created" | "data_processed" | "user_connected" | "delt_transfer" | "api_call";
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

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Return the visualizer to idle state after 2.5 seconds of no backend activity
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, 2500);
  };

  const addActivity = (newActivity: Omit<PipelineActivity, "timestamp">) => {
    setActivities((prev) => {
      const updated = [{ ...newActivity, timestamp: Date.now() }, ...prev].slice(0, 50);
      return updated;
    });
    setActivityCount((prev) => prev + 1);
    triggerActiveState();
  };

  useEffect(() => {
    // 1. Listen for DELT Liability Transfers (e.g., Trades, Data Unlocks)
    const deltChannel = supabase
      .channel("visualizer-delt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delt_transfers" }, (payload) => {
        addActivity({
          id: payload.new.id,
          type: "delt_transfer",
          details: {
            activityType: `DELT Minted: ${payload.new.aca_hash.substring(0, 8)}...`,
            action: payload.new.action_type,
          },
        });
      })
      .subscribe();

    // 2. Listen for DigiRAMP Provenance Egress (e.g., Immutable Anchoring)
    const egressChannel = supabase
      .channel("visualizer-egress")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        addActivity({
          id: payload.new.id,
          type: "bundle_created",
          details: {
            title: `Egress Anchor: ${payload.new.digiramp_anchor_id?.substring(0, 8)}`,
          },
        });
      })
      .subscribe();

    // 3. Listen for API Vault Queries (e.g., Agentic MCP or REST traffic)
    const apiChannel = supabase
      .channel("visualizer-api")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "api_metrics" }, (payload) => {
        addActivity({
          id: payload.new.id,
          type: "data_processed",
          details: {
            activityType: `${payload.new.endpoint} (${payload.new.latency_ms}ms)`,
          },
        });
      })
      .subscribe();

    // 4. Listen for User Authentication/Logins
    const authChannel = supabase
      .channel("visualizer-users")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "enterprise_users" }, (payload) => {
        addActivity({
          id: payload.new.id,
          type: "user_connected",
          details: { user: payload.new.email },
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(deltChannel);
      supabase.removeChannel(egressChannel);
      supabase.removeChannel(apiChannel);
      supabase.removeChannel(authChannel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { activities, isActive, activityCount };
};
