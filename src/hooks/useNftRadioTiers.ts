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
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<NFTRadioTierRecord[]> => {
      console.log("[START] useNftRadioTiers: Initiating database fetch for tiers.");
      try {
        console.log("[PROCESS] useNftRadioTiers: Querying the ordered tier ladder.");
        const { data, error } = await (supabase as any)
          .from("nft_radio_tiers")
          .select("*")
          .order("display_order", { ascending: true });

        if (error) {
          console.error(`[ERROR] useNftRadioTiers: ${error.message} (${error.code ?? "unknown"}).`);
          throw new Error(`Failed to fetch NFT Radio tiers: ${error.message}`);
        }

        console.log(`[PROCESS] useNftRadioTiers: Retrieved ${data?.length ?? 0} tiers.`);
        return (data ?? []) as NFTRadioTierRecord[];
      } catch (error) {
        console.error("[ERROR] useNftRadioTiers: Tier fetch failed.", error);
        throw error;
      } finally {
        console.log("[END] useNftRadioTiers: Tier fetch completed.");
      }
    },
  });
}

/** Highest tier whose staking requirement is met by the supplied USD amount. */
export function resolveTierForAmount(
  amountUsd: number,
  tiers: NFTRadioTierRecord[],
): NFTRadioTierRecord | null {
  console.log("[START] resolveTierForAmount: Resolving tier eligibility.");
  try {
    console.log(`[PROCESS] resolveTierForAmount: Evaluating $${amountUsd} against ${tiers.length} tiers.`);
    if (!tiers.length) return null;
    if (!Number.isFinite(amountUsd) || amountUsd < 0) {
      console.warn("[PROCESS] resolveTierForAmount: Invalid amount; using the lowest tier.");
      return tiers[0] ?? null;
    }
    const eligible = [...tiers]
      .filter((tier) => amountUsd >= Number(tier.required_usd_staked ?? 0))
      .sort((a, b) => Number(b.required_usd_staked ?? 0) - Number(a.required_usd_staked ?? 0));
    const tier = eligible[0] ?? tiers[0] ?? null;
    console.log(`[PROCESS] resolveTierForAmount: Resolved ${tier?.name ?? "no tier"}.`);
    return tier;
  } catch (error) {
    console.error("[ERROR] resolveTierForAmount: Tier resolution failed.", error);
    return null;
  } finally {
    console.log("[END] resolveTierForAmount: Resolution completed.");
  }
}
