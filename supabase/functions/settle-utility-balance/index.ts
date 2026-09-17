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

  console.log("[PHASE_START: SettleUtility.Request] Utility balance settlement invoked.");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Server configuration error: missing Supabase credentials.");

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
      .select("id, synapse_credit_cost")
      .eq("extractor_id", userId)
      .eq("payment_status", "unpaid");
    if (eventsError) {
      console.error(`[PHASE_END: SettleUtility.LoadDebt] Query failed: ${eventsError.message}`);
      throw eventsError;
    }
    const rows = events ?? [];
    const eventIds: string[] = [];
    let amountDue = 0;
    for (const row of rows as Array<{ id: string; synapse_credit_cost: number | string }>) {
      eventIds.push(row.id);
      amountDue += Number(row.synapse_credit_cost);
    }
    amountDue = round4(amountDue);
    console.log(`[PHASE_END: SettleUtility.LoadDebt] events=${eventIds.length} amount_due=${amountDue}`);

    if (eventIds.length === 0 || amountDue <= 0) {
      console.log("[PHASE_END: SettleUtility.Request] Nothing outstanding — already settled.");
      return json({ status: "already_settled", amount_due: 0, events_settled: 0 });
    }

    console.log("[PHASE_START: SettleUtility.Balance] Reading live Synapse balance.");
    const { data: balance, error: balanceError } = await adminClient.rpc("get_synapse_balance", { uid: userId });
    if (balanceError) {
      console.error(`[PHASE_END: SettleUtility.Balance] RPC failed: ${balanceError.message}`);
      throw balanceError;
    }
    const available = round4(Number(balance ?? 0));
    console.log(`[PHASE_END: SettleUtility.Balance] available=${available}`);

    if (available < amountDue) {
      const shortfall = round4(amountDue - available);
      console.warn(`[PHASE_END: SettleUtility.Request] Insufficient credits shortfall=${shortfall}`);
      return json(
        {
          error: "INSUFFICIENT_CREDITS",
          failed_at: "BALANCE",
          amount_due: amountDue,
          available_credits: available,
          shortfall,
        },
        402,
      );
    }

    const referenceId = `LIDD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    console.log(`[PHASE_START: SettleUtility.Ledger] Writing usage debit reference=${referenceId}`);
    const { data: ledgerRow, error: ledgerError } = await adminClient
      .from("synapse_credit_ledger")
      .insert({
        user_id: userId,
        amount: -amountDue,
        entry_type: "USAGE",
        transaction_type: "fee",
        status: "settled",
        description: `LIDD Utility Settlement | ${eventIds.length} identity matches [${amountDue} CR]`,
        reference_id: referenceId,
        metadata: {
          settlement_kind: "lidd_utility",
          event_count: eventIds.length,
          event_ids: eventIds,
        },
      })
      .select("id")
      .single();
    if (ledgerError) {
      console.error(`[PHASE_END: SettleUtility.Ledger] Ledger rejection: ${ledgerError.message}`);
      throw ledgerError;
    }
    console.log(`[PHASE_END: SettleUtility.Ledger] Ledger entry=${ledgerRow.id}`);

    console.log("[PHASE_START: SettleUtility.MarkPaid] Marking the exact settled event ids as paid.");
    const { error: markError } = await adminClient
      .from("lidd_extraction_events")
      .update({ payment_status: "paid" })
      .in("id", eventIds)
      .eq("extractor_id", userId)
      .eq("payment_status", "unpaid");
    if (markError) {
      console.error(`[PHASE_END: SettleUtility.MarkPaid] Update failed: ${markError.message}`);
      throw markError;
    }
    console.log(`[PHASE_END: SettleUtility.MarkPaid] ${eventIds.length} events marked paid.`);

    console.log("[PHASE_END: SettleUtility.Request] Settlement complete.");
    return json({
      status: "settled",
      amount_charged: amountDue,
      events_settled: eventIds.length,
      reference_id: referenceId,
      ledger_entry_id: ledgerRow.id,
      remaining_credits: round4(available - amountDue),
    });
  } catch (error) {
    console.error(
      `[PHASE_END: SettleUtility.Fault] ${error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error)}`,
    );
    return json({ error: error instanceof Error ? error.message : String(error), failed_at: "SETTLEMENT" }, 500);
  }
});
