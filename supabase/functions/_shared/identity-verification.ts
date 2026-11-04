// Identity Verification Utility intake.
// An API key holder posts a batch of identity records; each identifier is resolved to an
// opaque citizen platform_guid through the external Identity Vault and the raw identifier
// is dropped immediately. Every match is staged as a pending-consent charge at the
// key owner's organization rate (set by C-suite on the Client Organizations page).
// Served by `identity-verification-intake` and its legacy alias `surveillance-api-intake`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveServiceAccess, usageCost } from "./service-provisioning.ts";

const IDENTITY_VAULT_URL = "https://thebigidia.com/_functions/resolveIdentityGuid";
export const MAX_VERIFICATION_RECORDS = 1000;
// Credentials for this utility are stored under the original api_keys environment value.
const KEY_ENVIRONMENT = "lidd";

export interface VerificationRecord {
  identifier: string;
  identifier_type: string | null;
  timestamp: string | null;
}

/**
 * Accepts `records` (preferred), `identifiers`, or the original `infractions` array.
 * Entries may be strings or objects with `identifier` / `value` (or the original
 * `license_plate` field). Returns null when no array is present.
 */
export function normalizeVerificationRecords(payload: unknown): VerificationRecord[] | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const list = Array.isArray(p.records)
    ? p.records
    : Array.isArray(p.identifiers)
      ? p.identifiers
      : Array.isArray(p.infractions)
        ? p.infractions
        : null;
  if (!list) return null;
  return list.map((entry) => {
    if (typeof entry === "string") return { identifier: entry.trim(), identifier_type: null, timestamp: null };
    const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const raw = e.identifier ?? e.value ?? e.license_plate;
    const type = typeof e.identifier_type === "string" && e.identifier_type.trim()
      ? e.identifier_type.trim().slice(0, 64)
      : null;
    return {
      identifier: typeof raw === "string" ? raw.trim() : "",
      identifier_type: type,
      timestamp: typeof e.timestamp === "string" ? e.timestamp : null,
    };
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleIdentityVerificationIntake(req: Request, functionName: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const tag = "IdentityVerification";
  console.log(`[PHASE_START: ${tag}.Request] via=${functionName}`);

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const vaultKey = Deno.env.get("WIX_SECURE_API_KEY");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`[PHASE_START: ${tag}.ApiKeyAuth] Validating verification credential.`);
    const presentedKey = req.headers.get("x-api-key") ?? "";
    if (!presentedKey) {
      console.error(`[PHASE_END: ${tag}.ApiKeyAuth] rejected: missing x-api-key`);
      return json({ error: "Missing x-api-key header." }, 401);
    }
    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("id, user_id")
      .eq("key_hash", await sha256Hex(presentedKey))
      .eq("status", "active")
      .eq("environment", KEY_ENVIRONMENT)
      .maybeSingle();
    if (keyError) {
      console.error(`[PHASE_END: ${tag}.ApiKeyAuth] query fault: ${keyError.message}`);
      return json({ error: "Credential verification failed." }, 500);
    }
    if (!keyRow) {
      console.error(`[PHASE_END: ${tag}.ApiKeyAuth] rejected: unknown or revoked key`);
      return json({ error: "Invalid or revoked API key." }, 401);
    }
    const ownerId = keyRow.user_id as string;
    console.log(`[PHASE_END: ${tag}.ApiKeyAuth] owner=${ownerId}`);

    const access = await resolveServiceAccess(supabase, ownerId, "utility", tag);
    if (!access.allowed) {
      return json({ error: "The Identity Verification Utility is not provisioned for your organization." }, 403);
    }

    console.log(`[PHASE_START: ${tag}.PayloadParse]`);
    const payload = await req.json().catch(() => null);
    const records = normalizeVerificationRecords(payload);
    console.log(`[PHASE_END: ${tag}.PayloadParse] records=${records?.length ?? 0}`);
    if (!records || records.length === 0) {
      return json({ error: "Payload must include a non-empty 'records' array." }, 400);
    }
    if (records.length > MAX_VERIFICATION_RECORDS) {
      return json({ error: `Maximum ${MAX_VERIFICATION_RECORDS} records per batch.` }, 413);
    }
    const bodyExtractor = (payload as Record<string, unknown>).extractor_id;
    if (bodyExtractor && bodyExtractor !== ownerId) {
      console.error(`[${tag}.Validation] extractor_id does not match the key owner`);
      return json({ error: "extractor_id does not match the presented credential." }, 403);
    }

    const stagedEvents: Record<string, unknown>[] = [];
    console.log(`[PHASE_START: ${tag}.VaultResolution] ${records.length} records`);
    for (const [index, record] of records.entries()) {
      if (!record.identifier) {
        console.warn(`[${tag}.VaultResolution] record ${index} has no identifier — skipped`);
        continue;
      }
      try {
        console.log(`[PHASE_START: ${tag}.VaultLookup] record=${index}`);
        const res = await fetch(IDENTITY_VAULT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${vaultKey}` },
          // The vault's lookup field is still named license_plate; identifier/type are sent alongside.
          body: JSON.stringify({
            identifier: record.identifier,
            identifier_type: record.identifier_type,
            license_plate: record.identifier,
          }),
        });
        if (!res.ok) {
          console.error(`[PHASE_END: ${tag}.VaultLookup] record=${index} HTTP ${res.status}`);
          continue;
        }
        const vault = await res.json();
        console.log(`[PHASE_END: ${tag}.VaultLookup] record=${index} match=${!!(vault?.isMatch && vault?.guid)}`);
        if (vault?.isMatch && vault?.guid) {
          stagedEvents.push({
            extractor_id: ownerId,
            citizen_guid: vault.guid,
            synapse_credit_cost: access.rate,
            payment_status: "pending_consent",
            aca_hash_key: null,
            extraction_timestamp: record.timestamp || new Date().toISOString(),
          });
        }
      } catch (lookupError) {
        console.error(
          `[${tag}.VaultLookup.Fault] record=${index} ${lookupError instanceof Error ? lookupError.stack : String(lookupError)}`,
        );
      }
    }
    console.log(`[PHASE_END: ${tag}.VaultResolution] matches=${stagedEvents.length}`);

    if (stagedEvents.length > 0) {
      console.log(`[PHASE_START: ${tag}.StageCharges] rows=${stagedEvents.length} rate=${access.rate}`);
      const { error: insertError } = await supabase.from("lidd_extraction_events").insert(stagedEvents);
      if (insertError) {
        console.error(`[PHASE_END: ${tag}.StageCharges] failed: ${insertError.message}`);
        throw insertError;
      }
      console.log(`[PHASE_END: ${tag}.StageCharges] staged`);
    }

    const { error: touchError } = await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);
    if (touchError) console.error(`[${tag}.KeyTouch] ${touchError.message}`);

    const staged = usageCost(access.rate, stagedEvents.length);
    console.log(`[PHASE_END: ${tag}.Request] staged=${staged} CR`);
    return json({
      status: "success",
      records_processed: records.length,
      matches_found: stagedEvents.length,
      rate_cr: access.rate,
      credits_staged: staged,
      debt_staged: staged,
    });
  } catch (err) {
    console.error(`[PHASE_END: ${tag}.Request] fault: ${err instanceof Error ? err.stack : String(err)}`);
    return json({ error: "Internal Server Error" }, 500);
  }
}
