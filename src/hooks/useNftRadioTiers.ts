import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NFTRadioTierRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  artist_profile: string;
  rwa_level: string;
  rwa_min_usd: number;
  rwa_max_usd: number;
  annual_nps_min_usd: number;
  annual_nps_max_usd: number;
  required_usd_staked: number;
  lock_duration_days: number;
  display_order: number;
  created_at: string;
}

/** Live NFT Radio tier ladder, ordered by display order. */
export function useNftRadioTiers() {
  return useQuery({
    queryKey: ["nft-radio-tiers"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<NFTRadioTierRecord[]> => {
      console.log("[BEGIN] useNftRadioTiers: fetching tiers");
      const { data, error } = await (supabase as any)
        .from("nft_radio_tiers")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) {
        console.error("[ERROR] useNftRadioTiers:", error.message);
        throw new Error(error.message);
      }
      console.log("[END] useNftRadioTiers:", data?.length ?? 0, "tiers");
      return (data ?? []) as NFTRadioTierRecord[];
    },
  });
}

/** Highest tier whose staking requirement is met by the supplied USD amount. */
export function resolveTierForAmount(
  amountUsd: number,
  tiers: NFTRadioTierRecord[],
): NFTRadioTierRecord | null {
  if (!tiers.length) return null;
  const eligible = tiers
    .filter((t) => amountUsd >= Number(t.required_usd_staked ?? 0))
    .sort((a, b) => Number(b.required_usd_staked ?? 0) - Number(a.required_usd_staked ?? 0));
  return eligible[0] ?? null;
}
