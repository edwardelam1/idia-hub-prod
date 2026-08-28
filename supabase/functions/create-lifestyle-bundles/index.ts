import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, runWindowedBundleGeneration } from "../_shared/window-bundle-runner.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.info("[BEGIN: LifestyleBundle.Handler]");
  try {
    const result = await runWindowedBundleGeneration({
      source: "staged_lifestyle_data",
      label: "LifestyleBundle",
      contributorKey: "unique_users",
    });
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[CATCH: LifestyleBundle.Handler] ${(error as Error).message}`);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
