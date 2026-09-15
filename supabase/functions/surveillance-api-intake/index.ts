// Edge function: surveillance-api-intake
// Ephemeral Verification Bridge for the Louisville Infrastructure Data Dividend (LIDD).
// Never stores the license plate: it resolves the plate to a citizen platform_guid via the
// external Wix Identity Vault, drops the PII, and stages a $2.50 debt per matched identity.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WIX_IDENTITY_VAULT_URL = "https://thebigidia.com/_functions/resolveIdentityGuid";
const WIX_API_KEY = Deno.env.get("WIX_SECURE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[SURVEILLANCE_INTAKE_START] Initializing batch utility intake payload process.`);

  try {
    console.log(`[SUPABASE_INIT_START] Opening connection to stage debt.`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log(`[SUPABASE_INIT_END] Connection established.`);

    console.log(`[API_KEY_AUTH_START] Validating commercial franchise credential.`);
    const presentedKey = req.headers.get("x-api-key") ?? "";
    if (!presentedKey) {
      console.error(`[API_KEY_AUTH_ERROR] Missing x-api-key header.`);
      console.log(`[API_KEY_AUTH_END] Rejected.`);
      return json({ error: "Missing x-api-key header." }, 401);
    }
    const presentedHash = await sha256Hex(presentedKey);
    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("id, user_id, status")
      .eq("key_hash", presentedHash)
      .eq("status", "active")
      .maybeSingle();

    if (keyError) {
      console.error(`[API_KEY_AUTH_QUERY_ERROR] ${keyError.message}`);
      console.log(`[API_KEY_AUTH_END] Rejected on query fault.`);
      return json({ error: "Credential verification failed." }, 500);
    }
    if (!keyRow) {
      console.error(`[API_KEY_AUTH_ERROR] Unknown or revoked credential presented.`);
      console.log(`[API_KEY_AUTH_END] Rejected.`);
      return json({ error: "Invalid or revoked API key." }, 401);
    }
    const authenticatedExtractorId = keyRow.user_id as string;
    console.log(`[API_KEY_AUTH_END] Credential valid. Extractor resolved: ${authenticatedExtractorId}`);

    console.log(`[PAYLOAD_PARSE_START] Attempting to read JSON payload from request.`);
    const payload = await req.json();
    const { extractor_id, infractions } = payload;
    console.log(
      `[PAYLOAD_PARSE_END] Payload read. Extractor ID: ${extractor_id || "UNKNOWN"}. Total infractions: ${infractions?.length || 0}`,
    );

    if (!Array.isArray(infractions) || infractions.length === 0) {
      console.error(`[VALIDATION_ERROR] Missing extractor_id or empty infractions array.`);
      return json(
        { error: "Invalid surveillance payload. Must include extractor_id and an array of infractions." },
        400,
      );
    }
    if (extractor_id && extractor_id !== authenticatedExtractorId) {
      console.error(`[VALIDATION_ERROR] extractor_id in body does not match the presented credential owner.`);
      return json({ error: "extractor_id does not match the presented credential." }, 403);
    }

    const synapseCreditUnitCost = 2.50;
    const stagedEvents: Record<string, unknown>[] = [];
    let matchCount = 0;

    console.log(`[BATCH_PROCESSING_START] Processing ${infractions.length} captured plates against Wix Identity Vault.`);

    for (const infraction of infractions) {
      const { license_plate, timestamp } = infraction ?? {};

      try {
        if (!license_plate || typeof license_plate !== "string") {
          console.error(`[WIX_VERIFICATION_SKIP] Entry missing a license_plate value. Skipping.`);
          continue;
        }

        console.log(`[WIX_VERIFICATION_START] Querying vault for plate ending in ${license_plate.slice(-3)}`);
        const wixResponse = await fetch(WIX_IDENTITY_VAULT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${WIX_API_KEY}`,
          },
          body: JSON.stringify({ license_plate }),
        });

        if (!wixResponse.ok) {
          console.error(`[WIX_VERIFICATION_HTTP_ERROR] Wix returned ${wixResponse.status}`);
          continue;
        }

        const wixData = await wixResponse.json();
        console.log(`[WIX_VERIFICATION_END] Query complete.`);

        if (wixData.isMatch && wixData.guid) {
          matchCount++;
          const targetGuid = wixData.guid;
          console.log(`[MATCH_FOUND] Plate matched. PII dropped. Staging $2.50 debt for opaque platform_guid: ${targetGuid}`);

          stagedEvents.push({
            extractor_id: authenticatedExtractorId,
            citizen_guid: targetGuid,
            synapse_credit_cost: synapseCreditUnitCost,
            payment_status: "unpaid",
            extraction_timestamp: timestamp || new Date().toISOString(),
          });
        }
      } catch (wixFetchError) {
        console.error(
          `[WIX_VERIFICATION_FAULT] Network failure for plate. Error: ${wixFetchError instanceof Error ? wixFetchError.stack : String(wixFetchError)}`,
        );
      }
    }
    console.log(`[BATCH_PROCESSING_END] Processed ${infractions.length} records. Total valid GUID matches: ${matchCount}`);

    if (stagedEvents.length > 0) {
      console.log(`[SUPABASE_INSERT_START] Writing ${stagedEvents.length} individual extraction events to lidd_extraction_events table.`);
      const { error: insertError } = await supabase.from("lidd_extraction_events").insert(stagedEvents);

      if (insertError) {
        console.error(`[SUPABASE_INSERT_ERROR] Database insertion failed. Details: ${insertError.message}`);
        throw insertError;
      }
      console.log(`[SUPABASE_INSERT_END] Successfully staged ${stagedEvents.length} unpaid balances.`);
    } else {
      console.log(`[SUPABASE_INSERT_SKIP] No matches found in this batch. No debt staged.`);
    }

    console.log(`[API_KEY_TOUCH_START] Stamping credential last_used_at.`);
    const { error: touchError } = await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);
    if (touchError) console.error(`[API_KEY_TOUCH_ERROR] ${touchError.message}`);
    console.log(`[API_KEY_TOUCH_END] Stamp complete.`);

    const totalDebtStaged = matchCount * synapseCreditUnitCost;
    console.log(`[SURVEILLANCE_INTAKE_END] Execution complete. Total debt staged for this batch: $${totalDebtStaged}`);

    return json({
      status: "success",
      records_processed: infractions.length,
      matches_found: matchCount,
      debt_staged: totalDebtStaged,
    });
  } catch (err) {
    console.error(
      `[CRITICAL_SYSTEM_FAULT] Unhandled exception in intake pipeline. Stack: ${err instanceof Error ? err.stack : String(err)}`,
    );
    console.log(`[SURVEILLANCE_INTAKE_END_WITH_ERROR] Process terminated abruptly.`);
    return json({ error: "Internal Server Error" }, 500);
  }
});
