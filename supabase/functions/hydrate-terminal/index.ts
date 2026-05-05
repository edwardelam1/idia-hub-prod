// Public terminal hydration endpoint.
// Given a pairing_code, returns the schema_payload from idia_schema_manifest_vault.
// Uses the service role internally to bypass RLS, but exposes ONLY the matching
// row's payload + minimal business identity. No auth required (terminals are headless).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const pairing_code: string | undefined =
      body?.pairing_code ?? body?.code ?? body?.provisioning_code;

    if (!pairing_code || typeof pairing_code !== "string") {
      return new Response(
        JSON.stringify({ error: "pairing_code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("idia_schema_manifest_vault")
      .select("business_id, pairing_code, schema_payload, updated_at")
      .eq("pairing_code", pairing_code)
      .maybeSingle();

    if (error) {
      console.error("[hydrate-terminal] vault query error:", error);
      return new Response(JSON.stringify({ error: "vault_lookup_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "no_manifest_for_pairing_code" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        business_id: data.business_id,
        pairing_code: data.pairing_code,
        updated_at: data.updated_at,
        schema_payload: data.schema_payload,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[hydrate-terminal] unexpected:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});