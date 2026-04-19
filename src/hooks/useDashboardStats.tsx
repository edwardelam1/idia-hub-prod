import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PipelineHealth {
  total_raw_data: number;
  unprocessed_raw_data: number;
  processing_raw_data: number;
  processed_raw_data: number;
  total_staged_data: number;
  unrewarded_staged_data: number;
  total_transactions: number;
}

interface DashboardStats {
  pipelineHealth: PipelineHealth | null;
  activeBundlesCount: number;
  stagedDataCount: number;
  isLoading: boolean;
  error: Error | null;
}

export const useDashboardStats = (): DashboardStats => {
  const {
    data: pipelineHealth,
    isLoading: pipelineLoading,
    error: pipelineError,
  } = useQuery({
    queryKey: ["pipeline-health"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("check_health_data_pipeline_status");
      if (error) throw error;
      return (data as unknown as PipelineHealth[])?.[0] ?? null;
    },
    refetchInterval: 30_000,
  });

  const { data: bundlesCount, isLoading: bundlesLoading } = useQuery({
    queryKey: ["active-bundles-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("marketplace_bundles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  const { data: stagedCount, isLoading: stagedLoading } = useQuery({
    queryKey: ["staged-data-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("staged_health_data").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return {
    pipelineHealth: pipelineHealth ?? null,
    activeBundlesCount: bundlesCount ?? 0,
    stagedDataCount: stagedCount ?? 0,
    isLoading: pipelineLoading || bundlesLoading || stagedLoading,
    error: pipelineError as Error | null,
  };
};
