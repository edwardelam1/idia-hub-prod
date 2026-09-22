import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RadioTrack {
  id: string;
  provider: string;
  track_title: string;
  artist_name: string;
  album_title: string | null;
  artwork_url: string | null;
  duration_ms: number | null;
  external_url: string | null;
  preview_audio_url: string;
  ttm_nps_yield: number | null;
  buyout_valuation: number | null;
}

/** Randomized, playable, unassigned catalog rotation from the secure feed. */
export function useNftRadioFeed(enabled: boolean) {
  return useQuery({
    queryKey: ["nft-radio-feed"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RadioTrack[]> => {
      console.log("[BEGIN] useNftRadioFeed");
      const { data, error } = await supabase.functions.invoke("nft-radio", {
        body: { action: "feed" },
      });
      if (error) {
        console.error("[ERROR] useNftRadioFeed:", error.message);
        throw new Error(error.message);
      }
      const tracks = (data?.tracks ?? []) as RadioTrack[];
      console.log("[END] useNftRadioFeed:", tracks.length, "tracks");
      return tracks.filter((t) => !!t.preview_audio_url);
    },
  });
}
