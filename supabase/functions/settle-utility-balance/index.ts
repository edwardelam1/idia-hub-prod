import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const round4 = (v: number) => Math.round(v * 10000) / 10000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log(
    "[PHASE_START: SettleUtility.Request] Utility balance settlement invoked via Synapse Controller integration.",
  );
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Server configuration error: missing Supabase credentials.");

    // Parse the incoming body safely to pass forward client identifiers
    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      // Fallback for empty POST requests
    }

    console.log("[PHASE_START: SettleUtility.Auth] Resolving caller identity from session token.");
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      console.warn("[PHASE_END: SettleUtility.Auth] Missing bearer token.");
      return json({ error: "Authentication required", failed_at: "AUTH" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      console.error(`[PHASE_END: SettleUtility.Auth] Invalid token: ${userError?.message ?? "no user"}`);
      return json({ error: "Invalid authentication token", failed_at: "AUTH" }, 401);
    }
    const userId = userData.user.id;
    console.log(`[PHASE_END: SettleUtility.Auth] Caller resolved user=${userId}`);

    console.log("[PHASE_START: SettleUtility.LoadDebt] Reading unpaid extraction events.");
    const { data: events, error: eventsError } = await adminClient
      .from("lidd_extraction_events")
      .select("id, synapse_credit_cost, aca_hash_key")
      .eq("extractor_id", userId)
      .in("payment_status", ["consented", "unpaid"]);

    if (eventsError) {
      console.error(`[PHASE_END: SettleUtility.LoadDebt] Query failed: ${eventsError.message}`);
      throw eventsError;
    }

    const rows = events ?? [];
    const eventIds: string[] = [];
    const consumedReceipt: string[] = [];
    const legacyEventIds: string[] = [];
    let amountDue = 0;

    for (const row of rows as Array<{ id: string; synapse_credit_cost: number | string; aca_hash_key?: string }>) {
      // Self-Healing Logic: Identify legacy test data that lacks a legal mandate
      if (!row.aca_hash_key) {
        legacyEventIds.push(row.id);
        continue;
      }
      eventIds.push(row.id);
      consumedReceipt.push(row.aca_hash_key);
      amountDue += Number(row.synapse_credit_cost);
    }

    // Rows without an ACA mandate are kept (never deleted) — they await consent and are not billed yet.
    if (legacyEventIds.length > 0) {
      console.warn(`[PHASE_WARN: SettleUtility] Skipping ${legacyEventIds.length} events without ACA hashes (not billable yet).`);
    }

    amountDue = round4(amountDue);

    console.log("[PHASE_START: SettleUtility.BalanceCheck] Verifying available Synapse Credits.");
    const { data: bal, error: balErr } = await adminClient.rpc("get_synapse_balance", { _user_id: userId } as never);
    if (balErr) console.warn(`[PHASE_END: SettleUtility.BalanceCheck] Balance lookup failed: ${balErr.message}`);
    const available = Number((Array.isArray(bal) ? bal[0] : bal)?.available_credits ?? (typeof bal === "number" ? bal : NaN));
    if (Number.isFinite(available) && available < amountDue && eventIds.length > 0) {
      console.warn(`[PHASE_END: SettleUtility.BalanceCheck] Insufficient: available=${available} due=${amountDue}`);
      return json({ error: "INSUFFICIENT_CREDITS", shortfall: round4(amountDue - available), amount_due: amountDue });
    }
    console.log("[PHASE_END: SettleUtility.BalanceCheck] OK");
    console.log(`[PHASE_END: SettleUtility.LoadDebt] valid_events=${eventIds.length} amount_due=${amountDue}`);

    if (eventIds.length === 0 || amountDue <= 0) {
      console.log("[PHASE_END: SettleUtility.Request] No valid outstanding events to settle.");
      return json({ status: "already_settled", amount_due: 0, events_settled: 0 });
    }

    console.log(
      `[PHASE_START: SettleUtility.SynapseController] Forwarding receipt array to native Synapse Controller.`,
    );
    const synapseUrl = `${supabaseUrl}/functions/v1/synapse-controller`;

    const synapseRes = await fetch(synapseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        user_id: userId,
        client_id: reqBody.client_id || "IDIA_HUB_APP",
        aca_record_ids: consumedReceipt,
        intent_type: "VULTURE_ALPR_EXTRACTION",
        location_string: reqBody.location_string || undefined,
        granularity: 1.0,
        relevance: 1.0,
        timeliness: 1.0,
        completeness: 1.0,
        origin_fidelity: 1.0,
      }),
    });

    if (!synapseRes.ok) {
      const errText = await synapseRes.text();
      console.error(
        `[CRITICAL FAILURE: SettleUtility.SynapseController] Synapse Controller rejected receipt. HTTP ${synapseRes.status}: ${errText}`,
      );
      throw new Error(`Synapse Controller HTTP ${synapseRes.status}: ${errText}`);
    }

    const synapseReceipt = await synapseRes.json();
    console.log(
      `[PHASE_END: SettleUtility.SynapseController] Synapse Controller acknowledged receipt successfully. Ref: ${synapseReceipt.reference_id}`,
    );

    console.log("[PHASE_START: SettleUtility.MarkPaid] Marking the exact settled event ids as paid.");
    const { error: markError } = await adminClient
      .from("lidd_extraction_events")
      .update({ payment_status: "paid" })
      .in("id", eventIds)
      .eq("extractor_id", userId)
      .in("payment_status", ["consented", "unpaid"]);

    if (markError) {
      console.error(
        `[PHASE_END: SettleUtility.MarkPaid] Update failed: ${markError.message}. Note: Synapse ledger successfully settled.`,
      );
      throw markError;
    }
    console.log(`[PHASE_END: SettleUtility.MarkPaid] ${eventIds.length} events marked paid.`);

    console.log("[PHASE_END: SettleUtility.Request] Settlement complete.");
    return json({
      status: "settled",
      amount_charged: amountDue,
      events_settled: eventIds.length,
      reference_id: synapseReceipt?.reference_id ?? synapseReceipt?.receipt?.reference_id ?? null,
      ledger_entry_id: synapseReceipt?.ledger_entry_id ?? synapseReceipt?.ledger_id ?? null,
      receipt: synapseReceipt,
    });
  } catch (error) {
    console.error(
      `[PHASE_END: SettleUtility.Fault] ${error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error)}`,
    );
    return json({ error: error instanceof Error ? error.message : String(error), failed_at: "SETTLEMENT" }, 500);
  }
});
