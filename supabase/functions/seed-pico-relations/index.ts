import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keyword → pico tag heuristic dictionary. Each hit contributes to a weight.
// Weights are clamped 0.30–0.95; the strongest match per nano-bite is marked mandatory
// when it lands in a payment / compliance / auth category.
const KEYWORD_MAP: Array<{ match: RegExp; picos: Array<{ tag: string; weight: number; slot?: string; mandatory?: boolean }> }> = [
  { match: /\b(pos|sale|sales|order|ordering|cart|ticket|tab|counter|register|terminal|kiosk)\b/i, picos: [
    { tag: "pico.ui.item_grid", weight: 0.90, slot: "catalog" },
    { tag: "pico.input.quick_fire_add", weight: 0.72, slot: "catalog" },
    { tag: "pico.ui.category_tabs", weight: 0.70, slot: "catalog" },
    { tag: "pico.ui.modifier_sheet", weight: 0.68, slot: "cart" },
    { tag: "pico.ui.summary_bar", weight: 0.60, slot: "totals" },
    { tag: "pico.input.chip_insert", weight: 0.75, slot: "payment" },
    { tag: "pico.input.nfc_tap", weight: 0.70, slot: "payment" },
    { tag: "pico.output.receipt_printer", weight: 0.65, slot: "receipt" },
  ]},
  { match: /\b(mobile|handheld|tableside|curbside|field)\b/i, picos: [
    { tag: "pico.input.nfc_tap", weight: 0.72, slot: "payment" },
    { tag: "pico.input.quick_fire_add", weight: 0.70, slot: "catalog" },
    { tag: "pico.fleet.gps_ping", weight: 0.45, slot: "geo" },
  ]},
  { match: /\b(fire|expedite|route to|kds_fire)\b/i, picos: [
    { tag: "pico.output.kds_route", weight: 0.85, slot: "route" },
    { tag: "pico.input.quick_fire_add", weight: 0.80, slot: "catalog" },
  ]},
  { match: /\b(quick fire|fire item|quick add|rapid entry|fast add)\b/i, picos: [
    { tag: "pico.input.quick_fire_add", weight: 0.92, slot: "catalog" },
    { tag: "pico.ui.item_grid", weight: 0.65, slot: "catalog" },
  ]},
  { match: /\b(waste|spoilage|86|comp)\b/i, picos: [
    { tag: "pico.compliance.void_reason", weight: 0.75, slot: "void" },
    { tag: "pico.ops.expiration_flag", weight: 0.60, slot: "ops" },
  ]},
  { match: /\b(commissary|depletion|deplete|prep list|par level)\b/i, picos: [
    { tag: "pico.ops.sku_lookup", weight: 0.75, slot: "lookup" },
    { tag: "pico.ops.par_alert", weight: 0.65, slot: "ops" },
    { tag: "pico.input.barcode_scan", weight: 0.60, slot: "lookup" },
  ]},
  { match: /\b(pay|payment|tender|checkout|charge|invoice|settle)\b/i, picos: [
    { tag: "pico.input.chip_insert", weight: 0.90, slot: "payment", mandatory: true },
    { tag: "pico.input.nfc_tap", weight: 0.85, slot: "payment" },
    { tag: "pico.ui.tip_selector", weight: 0.80, slot: "payment" },
    { tag: "pico.output.receipt_printer", weight: 0.75, slot: "receipt" },
    { tag: "pico.pay.split_tender", weight: 0.55, slot: "payment" },
  ]},
  { match: /\b(refund|return|chargeback)\b/i, picos: [
    { tag: "pico.compliance.refund_reason", weight: 0.90, slot: "refund", mandatory: true },
    { tag: "pico.pay.refund_execute", weight: 0.85, slot: "refund" },
    { tag: "pico.compliance.manager_override", weight: 0.70, slot: "auth" },
  ]},
  { match: /\b(void|cancel)\b/i, picos: [
    { tag: "pico.compliance.void_reason", weight: 0.85, slot: "void", mandatory: true },
    { tag: "pico.compliance.manager_override", weight: 0.70, slot: "auth" },
  ]},
  { match: /\b(tip|gratuity)\b/i, picos: [
    { tag: "pico.ui.tip_selector", weight: 0.90, slot: "payment" },
    { tag: "pico.pay.tip_share_split", weight: 0.60, slot: "tipout" },
  ]},
  { match: /\b(inventory|stock|sku|receiving|par|reorder)\b/i, picos: [
    { tag: "pico.input.barcode_scan", weight: 0.90, slot: "lookup" },
    { tag: "pico.output.label_printer", weight: 0.65, slot: "label" },
    { tag: "pico.ops.sku_lookup", weight: 0.80, slot: "lookup" },
    { tag: "pico.ops.par_alert", weight: 0.55, slot: "ops" },
  ]},
  { match: /\b(count|cycle count|audit stock)\b/i, picos: [
    { tag: "pico.ops.cycle_count_input", weight: 0.85, slot: "ops" },
    { tag: "pico.input.barcode_scan", weight: 0.70, slot: "lookup" },
  ]},
  { match: /\b(kitchen|prep|expo|line|kds|bar)\b/i, picos: [
    { tag: "pico.output.kds_route", weight: 0.90, slot: "route" },
    { tag: "pico.output.kitchen_printer", weight: 0.70, slot: "route" },
    { tag: "pico.output.buzzer", weight: 0.45, slot: "notify" },
  ]},
  { match: /\b(menu|item|catalog|product|recipe)\b/i, picos: [
    { tag: "pico.ui.item_grid", weight: 0.85, slot: "catalog" },
    { tag: "pico.input.quick_fire_add", weight: 0.62, slot: "catalog" },
    { tag: "pico.ui.category_tabs", weight: 0.60, slot: "catalog" },
    { tag: "pico.ui.modifier_sheet", weight: 0.65, slot: "cart" },
  ]},
  { match: /\b(receipt|invoice send|email receipt)\b/i, picos: [
    { tag: "pico.output.receipt_printer", weight: 0.90, slot: "receipt", mandatory: true },
    { tag: "pico.ui.receipt_preview", weight: 0.70, slot: "receipt" },
    { tag: "pico.output.email_send", weight: 0.55, slot: "notify" },
  ]},
  { match: /\b(age|alcohol|tobacco|cannabis|restricted)\b/i, picos: [
    { tag: "pico.compliance.age_verify", weight: 0.95, slot: "auth", mandatory: true },
    { tag: "pico.compliance.id_check", weight: 0.80, slot: "auth" },
    { tag: "pico.input.id_scan", weight: 0.60, slot: "auth" },
  ]},
  { match: /\b(id|identity|kyc|verify identity)\b/i, picos: [
    { tag: "pico.compliance.kyc_gate", weight: 0.85, slot: "auth", mandatory: true },
    { tag: "pico.input.id_scan", weight: 0.70, slot: "auth" },
  ]},
  { match: /\b(permit|license|regulatory|certification)\b/i, picos: [
    { tag: "pico.compliance.permit_gate", weight: 0.85, slot: "auth", mandatory: true },
    { tag: "pico.compliance.audit_stamp", weight: 0.50, slot: "audit" },
  ]},
  { match: /\b(customer|guest|member|client|patron)\b/i, picos: [
    { tag: "pico.crm.customer_lookup", weight: 0.80, slot: "lookup" },
    { tag: "pico.crm.new_customer", weight: 0.55, slot: "entry" },
  ]},
  { match: /\b(loyalty|reward|referral|points)\b/i, picos: [
    { tag: "pico.loyalty.loyalty_scan", weight: 0.90, slot: "loyalty" },
    { tag: "pico.loyalty.reward_redeem", weight: 0.75, slot: "loyalty" },
  ]},
  { match: /\b(gift card|gift-card|store credit)\b/i, picos: [
    { tag: "pico.loyalty.gift_card_swipe", weight: 0.90, slot: "payment" },
  ]},
  { match: /\b(table|floor plan|seating|reservation|booking|appointment|schedule)\b/i, picos: [
    { tag: "pico.ui.table_map", weight: 0.75, slot: "seating" },
    { tag: "pico.sched.book_slot", weight: 0.70, slot: "schedule" },
    { tag: "pico.ui.calendar_view", weight: 0.55, slot: "schedule" },
    { tag: "pico.sched.reminder", weight: 0.45, slot: "notify" },
  ]},
  { match: /\b(staff|employee|shift|roster|timesheet|clock)\b/i, picos: [
    { tag: "pico.sched.roster_pick", weight: 0.75, slot: "schedule" },
    { tag: "pico.compliance.manager_override", weight: 0.55, slot: "auth" },
  ]},
  { match: /\b(cash|drawer|change)\b/i, picos: [
    { tag: "pico.output.cash_drawer", weight: 0.90, slot: "cash" },
    { tag: "pico.pay.cash_tender", weight: 0.80, slot: "payment" },
  ]},
  { match: /\b(deliver|shipment|pickup|route|dispatch|fleet)\b/i, picos: [
    { tag: "pico.fleet.route_plan", weight: 0.80, slot: "geo" },
    { tag: "pico.fleet.pod_capture", weight: 0.75, slot: "delivery" },
    { tag: "pico.fleet.gps_ping", weight: 0.55, slot: "geo" },
    { tag: "pico.ui.map_view", weight: 0.45, slot: "geo" },
  ]},
  { match: /\b(warehouse|bin|pick|pack|slot)\b/i, picos: [
    { tag: "pico.ops.bin_scan", weight: 0.85, slot: "ops" },
    { tag: "pico.input.barcode_scan", weight: 0.70, slot: "lookup" },
    { tag: "pico.ops.transfer_ticket", weight: 0.50, slot: "ops" },
  ]},
  { match: /\b(temperature|cold chain|hot hold)\b/i, picos: [
    { tag: "pico.ops.temperature_log", weight: 0.90, slot: "ops", mandatory: true },
  ]},
  { match: /\b(patient|clinical|dose|prescription|vital|symptom)\b/i, picos: [
    { tag: "pico.compliance.hipaa_gate", weight: 0.95, slot: "auth", mandatory: true },
    { tag: "pico.health.vital_capture", weight: 0.75, slot: "clinical" },
    { tag: "pico.health.dose_check", weight: 0.70, slot: "clinical" },
    { tag: "pico.health.consent_form", weight: 0.60, slot: "auth" },
  ]},
  { match: /\b(consent|privacy|opt.?in)\b/i, picos: [
    { tag: "pico.compliance.consent_prompt", weight: 0.85, slot: "auth", mandatory: true },
  ]},
  { match: /\b(analytics|report|metric|dashboard|kpi|forecast)\b/i, picos: [
    { tag: "pico.ui.chart_pane", weight: 0.85, slot: "analytics" },
    { tag: "pico.ui.summary_bar", weight: 0.55, slot: "totals" },
  ]},
  { match: /\b(webhook|integration|sync|api)\b/i, picos: [
    { tag: "pico.logic.webhook_emit", weight: 0.75, slot: "integration" },
    { tag: "pico.logic.event_publish", weight: 0.60, slot: "integration" },
    { tag: "pico.logic.retry_backoff", weight: 0.45, slot: "sync" },
  ]},
  { match: /\b(offline|sync|queue)\b/i, picos: [
    { tag: "pico.logic.offline_queue", weight: 0.80, slot: "sync" },
  ]},
  { match: /\b(audit|log|trace|provenance)\b/i, picos: [
    { tag: "pico.compliance.audit_stamp", weight: 0.80, slot: "audit" },
    { tag: "pico.logic.provenance_stamp", weight: 0.60, slot: "audit" },
  ]},
  { match: /\b(iot|sensor|meter|telemetry)\b/i, picos: [
    { tag: "pico.telemetry.iot_sensor", weight: 0.80, slot: "ambient" },
  ]},
  { match: /\b(energy|power|kwh)\b/i, picos: [
    { tag: "pico.telemetry.energy_meter", weight: 0.85, slot: "ambient" },
  ]},
  { match: /\b(weight|weigh|scale|grams|pounds)\b/i, picos: [
    { tag: "pico.input.weight_scale", weight: 0.90, slot: "measurement" },
    { tag: "pico.output.scale_display", weight: 0.65, slot: "display" },
  ]},
  { match: /\b(signature|sign)\b/i, picos: [
    { tag: "pico.input.signature_pad", weight: 0.90, slot: "auth" },
  ]},
  { match: /\b(notes|comment|memo)\b/i, picos: [
    { tag: "pico.ui.notes_field", weight: 0.60, slot: "entry" },
  ]},
  { match: /\b(discount|promo|coupon)\b/i, picos: [
    { tag: "pico.ui.discount_prompt", weight: 0.85, slot: "promo" },
    { tag: "pico.ui.upsell_carousel", weight: 0.40, slot: "promo" },
  ]},
  { match: /\b(tax|vat|gst)\b/i, picos: [
    { tag: "pico.compliance.tax_holiday_flag", weight: 0.55, slot: "tax" },
    { tag: "pico.ui.summary_bar", weight: 0.50, slot: "totals" },
  ]},
  { match: /\b(batch|end of day|eod|close)\b/i, picos: [
    { tag: "pico.pay.settlement_batch", weight: 0.85, slot: "eod" },
  ]},
];

// Default picos assigned to any nano-bite that fails to match anything specific.
const DEFAULT_PICOS: Array<{ tag: string; weight: number; slot?: string }> = [
  { tag: "pico.ui.notes_field", weight: 0.40, slot: "entry" },
  { tag: "pico.compliance.audit_stamp", weight: 0.40, slot: "audit" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const started = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.info("[seed-pico-relations] START");

    // Load pico catalog → tag → id map
    const { data: picos, error: picoErr } = await supabase
      .from("idia_pico_bites")
      .select("id, tag");
    if (picoErr) throw picoErr;
    const picoByTag = new Map<string, string>();
    (picos ?? []).forEach((p: any) => picoByTag.set(p.tag, p.id));
    console.info(`[seed-pico-relations] loaded ${picoByTag.size} picos`);

    // Load nano-bites (paged to bypass 1000-row default)
    const nanos: Array<{ id: string; task: string; micro_element: string; value_chain_stage: string; industry_id: string }> = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("taxonomy_nano_bites")
        .select("id, task, micro_element, value_chain_stage, industry_id")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      nanos.push(...(data as any[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    console.info(`[seed-pico-relations] loaded ${nanos.length} nano-bites`);

    // Clear existing graph-source relations so this run is idempotent (no upsert).
    const { error: delErr } = await supabase
      .from("idia_nano_pico_relations")
      .delete()
      .eq("source", "graph");
    if (delErr) throw delErr;
    console.info("[seed-pico-relations] cleared prior graph relations");

    // Build relation rows
    const rows: any[] = [];
    for (const nb of nanos) {
      // The nano-bite ID itself carries strong signals (…pos.item_add, …pay.tip_close,
      // …inv.receive_stock), so it is part of the match surface. Separators are
      // normalized to spaces so \b word boundaries can see each segment.
      const idTokens = String(nb.id ?? "").replace(/[._-]+/g, " ");
      const haystack = `${nb.task} ${nb.micro_element} ${nb.value_chain_stage} ${nb.industry_id} ${idTokens}`
        .replace(/[-_/]+/g, " ");
      const picked = new Map<string, { weight: number; slot?: string; mandatory?: boolean }>();
      for (const entry of KEYWORD_MAP) {
        if (!entry.match.test(haystack)) continue;
        for (const p of entry.picos) {
          const existing = picked.get(p.tag);
          if (!existing || p.weight > existing.weight) {
            picked.set(p.tag, { weight: p.weight, slot: p.slot, mandatory: p.mandatory });
          }
        }
      }
      if (picked.size === 0) {
        for (const p of DEFAULT_PICOS) picked.set(p.tag, { weight: p.weight, slot: p.slot });
      }
      // Cap at top 6 by weight so the UI stays readable
      const top = [...picked.entries()]
        .sort((a, b) => b[1].weight - a[1].weight)
        .slice(0, 6);
      for (const [tag, meta] of top) {
        const picoId = picoByTag.get(tag);
        if (!picoId) continue;
        rows.push({
          nano_bite_id: nb.id,
          pico_bite_id: picoId,
          relationship_weight: Math.min(0.95, Math.max(0.30, meta.weight)),
          is_mandatory: !!meta.mandatory,
          slot: meta.slot ?? null,
          source: "graph",
        });
      }
    }

    console.info(`[seed-pico-relations] prepared ${rows.length} relations, inserting in batches`);

    // Batch insert (chunks of 500) — plain INSERT, not upsert.
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from("idia_nano_pico_relations").insert(batch);
      if (error) {
        console.error(`[seed-pico-relations] batch ${i} failed: ${error.message}`);
        throw error;
      }
      inserted += batch.length;
    }

    const ms = Date.now() - started;
    console.info(`[seed-pico-relations] END inserted=${inserted} ms=${ms}`);

    return new Response(
      JSON.stringify({ success: true, nano_bites: nanos.length, picos: picoByTag.size, relations_inserted: inserted, elapsed_ms: ms }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error(`[seed-pico-relations] FAILURE: ${err?.message ?? err}`);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});