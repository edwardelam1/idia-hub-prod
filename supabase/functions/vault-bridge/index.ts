import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * vault-bridge
 * Returns the IDIA Life–provisioned wallet address for the authenticated user
 * from profiles.wallet_address. Never exposes private keys / passphrases.
 */
Deno.serve(async (req) => {
  console.log("[IDIA_EDGE_FUNCTION][VaultBridge] >>> START: Vault bridge request thread.");

  if (req.method === "OPTIONS") {
    console.log("[IDIA_EDGE_FUNCTION][VaultBridge] <<< END: OPTIONS preflight.");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[IDIA_EDGE_FUNCTION][VaultBridge] !!! Missing Authorization header.");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error(`[IDIA_EDGE_FUNCTION][VaultBridge] !!! Auth failed: ${userError?.message}`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    console.log(`[IDIA_EDGE_FUNCTION][VaultBridge] User authenticated: ${user.id}`);

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("wallet_address")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn(`[IDIA_EDGE_FUNCTION][VaultBridge] Profile lookup warning: ${profileError.message}`);
    }

    const address = profile?.wallet_address ?? null;
    const status = address ? "PROVISIONED" : "UNPROVISIONED";
    console.log(`[IDIA_EDGE_FUNCTION][VaultBridge] <<< END: status=${status} address=${address}`);

    return new Response(JSON.stringify({ address, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error(`[IDIA_EDGE_FUNCTION][VaultBridge] !!! FATAL: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});