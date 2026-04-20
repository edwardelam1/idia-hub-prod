import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// 1. Expanded to include ALL activity types expected by your components
export interface PipelineActivity {
  id: string;
  type:
    | "apple_sync"
    | "delt_transfer"
    | "library_entry"
    | "royalty_payment"
    | "synapse_staged"
    | "bundle_created"
    | "data_processed"
    | "user_connected"
    | "health_data_received"
    | "api_call";
  details: any;
  timestamp: number;
}

// 2. Defined strict return interface including 'isActive' and 'activeStages'
export interface PipelineState {
  activities: PipelineActivity[];
  isActive: boolean;
  activityCount: number;
  activeStages: Record<string, boolean>;
}

export const usePipelineActivity = (): PipelineState => {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const [activeStages, setActiveStages] = useState<Record<string, boolean>>({});
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

    // Update active stages dictionary for components that monitor specific pipelines
    setActiveStages((prev) => ({
      ...prev,
      [newActivity.type]: true,
    }));

    triggerActiveState();
  };

  useEffect(() => {
    // 1. Listen for DELT Liability Transfers
    const deltChannel = supabase
      .channel("visualizer-delt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delt_transfers" }, (payload) => {
        addActivity({
          id: payload.new.id,
          type: "delt_transfer",
          details: {
            activityType: `DELT Minted: ${payload.new.aca_hash?.substring(0, 8)}...`,
            action: payload.new.action_type,
          },
        });
      })
      .subscribe();

    // 2. Listen for DigiRAMP Provenance Egress
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

    // 3. Listen for API Vault Queries
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

  return { activities, isActive, activityCount, activeStages };
};
