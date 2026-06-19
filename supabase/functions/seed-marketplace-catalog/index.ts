import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_FUNCTIONS = [
  "create-health-data-bundle",
  "create-lifestyle-bundles",
  "create-business-intelligence-bundles",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.info("[BEGIN: Orchestrator.Handler]");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    console.info(`[BEGIN: Orchestrator.ParallelFetch] targets=${CATEGORY_FUNCTIONS.join(",")}`);
    const results = await Promise.all(
      CATEGORY_FUNCTIONS.map(async (fn) => {
        console.info(`[BEGIN: Orchestrator.ParallelFetch.Call] fn=${fn}`);
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({}),
          });
          const json = await resp.json().catch(() => ({}));
          console.info(`[END: Orchestrator.ParallelFetch.Call] fn=${fn} status=${resp.status} seeded=${json?.seeded ?? 0}`);
          return { fn, ok: resp.ok, status: resp.status, ...json };
        } catch (e) {
          console.error(`[CATCH: Orchestrator.ParallelFetch.Stall] fn=${fn} error=${(e as Error).message}`);
          return { fn, ok: false, error: (e as Error).message, seeded: 0 };
        }
      }),
    );
    console.info("[END: Orchestrator.ParallelFetch]");

    const totalSeeded = results.reduce((s, r: any) => s + (r.seeded ?? 0), 0);
    const errors = results.flatMap((r: any) => {
      const list: string[] = [];
      if (r.error) list.push(`${r.fn}: ${r.error}`);
      if (Array.isArray(r.errors)) list.push(...r.errors.map((e: string) => `${r.fn}: ${e}`));
      return list;
    });

    console.info(`[END: Orchestrator.Handler] totalSeeded=${totalSeeded} errors=${errors.length}`);
    return new Response(
      JSON.stringify({ seeded: totalSeeded, errors, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[CATCH: Orchestrator.Handler] ${(error as Error).message}`);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});