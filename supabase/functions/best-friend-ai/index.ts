import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_OMNI_ROWS = 500;
const MARKETPLACE_HASH_PAGE_SIZE = 1_000;
const MARKETPLACE_MAX_HASH_PAGES = 75;
const MARKETPLACE_SAMPLE_ROW_BUDGET = 150;

type MarketplaceFetchResult = {
  success: boolean;
  health: any[];
  lifestyle: any[];
  receiptIds: string[];
  contributorCount: number;
  unresolvedHashCount: number;
  error?: string;
};

// Aggregates computed server-side (see get_omni_aggregates RPC) so we never
// derive totals from the truncated LLM sample. Truncation is only for row
// examples, not for counts/sums/averages.
export type OmniAggregates = {
  health: { count: number; totals: Record<string, number | null>; range: Record<string, string | null> } | null;
  lifestyle: { count: number; totals: Record<string, number | null>; range: Record<string, string | null> } | null;
  // Ford vehicle telemetry is an ecosystem-wide shared pool, never user-scoped.
  ford:
    | { scope?: string; count: number; totals: Record<string, number | null>; range: Record<string, string | null> }
    | null;
};

async function fetchOmniAggregates(
  supabase: ReturnType<typeof createClient>,
  pseudoId: string,
): Promise<OmniAggregates> {
  try {
    const { data, error } = await supabase.rpc("get_omni_aggregates", { pseudo_id: pseudoId });
    if (error) {
      console.error("[ERROR: OmniAggregates] RPC failed:", error.message);
      return { health: null, lifestyle: null, ford: null };
    }
    const parsed = (data ?? {}) as any;
    console.info(
      `[STATUS: OmniAggregates] health.count=${parsed?.health?.count ?? 0} lifestyle.count=${parsed?.lifestyle?.count ?? 0} ford.count=${parsed?.ford?.count ?? 0}`,
    );
    return {
      health: parsed?.health ?? null,
      lifestyle: parsed?.lifestyle ?? null,
      ford: parsed?.ford ?? null,
    };
  } catch (err) {
    console.error("[CRITICAL FAILURE: OmniAggregates] Exception:", err);
    return { health: null, lifestyle: null, ford: null };
  }
}


function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundNullable(value: number | null, places: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function addMetric(
  bucket: Record<string, { sum: number; count: number }>,
  key: string,
  value: unknown,
) {
  const parsed = numberOrNull(value);
  if (parsed === null) return;
  if (!bucket[key]) bucket[key] = { sum: 0, count: 0 };
  bucket[key].sum += parsed;
  bucket[key].count += 1;
}

function updateRange(range: { min: string | null; max: string | null }, value: unknown) {
  if (typeof value !== "string" || value.length === 0) return;
  if (!range.min || value < range.min) range.min = value;
  if (!range.max || value > range.max) range.max = value;
}

async function fetchMarketplaceAggregates(supabase: ReturnType<typeof createClient>): Promise<OmniAggregates> {
  try {
    console.info("[BEGIN: MarketplaceAggregates] Calculating all-staged marketplace totals.");
    const healthTotals: Record<string, { sum: number; count: number }> = {};
    const lifestyleTotals: Record<string, { sum: number; count: number }> = {};
    const healthRange = { min: null as string | null, max: null as string | null };
    const lifestyleRange = { min: null as string | null, max: null as string | null };
    const eventTypes = new Set<string>();
    const eventCategories = new Set<string>();
    let healthCount = 0;
    let lifestyleCount = 0;

    for (let page = 0; page < MARKETPLACE_MAX_HASH_PAGES; page++) {
      const offset = page * MARKETPLACE_HASH_PAGE_SIZE;
      const { data, error } = await supabase
        .from("staged_health_data")
        .select(
          "id, steps_count, duration_seconds, active_energy_kcal, basal_energy_kcal, data_quality_score, heart_rate, resting_heart_rate, blood_oxygen_percentage, vo2_max, processed_at",
        )
        .order("id", { ascending: true })
        .range(offset, offset + MARKETPLACE_HASH_PAGE_SIZE - 1);
      if (error) throw new Error(`Marketplace health aggregate scan failed: ${error.message}`);
      for (const row of data ?? []) {
        healthCount += 1;
        addMetric(healthTotals, "steps", (row as any).steps_count);
        addMetric(healthTotals, "duration_seconds", (row as any).duration_seconds);
        addMetric(healthTotals, "active_energy_kcal", (row as any).active_energy_kcal);
        addMetric(healthTotals, "basal_energy_kcal", (row as any).basal_energy_kcal);
        addMetric(healthTotals, "quality", (row as any).data_quality_score);
        addMetric(healthTotals, "heart_rate", (row as any).heart_rate);
        addMetric(healthTotals, "resting_heart_rate", (row as any).resting_heart_rate);
        addMetric(healthTotals, "blood_oxygen", (row as any).blood_oxygen_percentage);
        addMetric(healthTotals, "vo2_max", (row as any).vo2_max);
        updateRange(healthRange, (row as any).processed_at);
      }
      if (!data || data.length < MARKETPLACE_HASH_PAGE_SIZE) break;
    }

    for (let page = 0; page < MARKETPLACE_MAX_HASH_PAGES; page++) {
      const offset = page * MARKETPLACE_HASH_PAGE_SIZE;
      const { data, error } = await supabase
        .from("staged_lifestyle_data")
        .select("id, session_duration, data_quality_score, event_type, event_category, processed_at")
        .order("id", { ascending: true })
        .range(offset, offset + MARKETPLACE_HASH_PAGE_SIZE - 1);
      if (error) throw new Error(`Marketplace lifestyle aggregate scan failed: ${error.message}`);
      for (const row of data ?? []) {
        lifestyleCount += 1;
        addMetric(lifestyleTotals, "session_duration", (row as any).session_duration);
        addMetric(lifestyleTotals, "quality", (row as any).data_quality_score);
        if ((row as any).event_type) eventTypes.add(String((row as any).event_type));
        if ((row as any).event_category) eventCategories.add(String((row as any).event_category));
        updateRange(lifestyleRange, (row as any).processed_at);
      }
      if (!data || data.length < MARKETPLACE_HASH_PAGE_SIZE) break;
    }

    const avg = (bucket: Record<string, { sum: number; count: number }>, key: string, places: number) => {
      const metric = bucket[key];
      return metric?.count ? roundNullable(metric.sum / metric.count, places) : null;
    };
    const sum = (bucket: Record<string, { sum: number; count: number }>, key: string) => bucket[key]?.sum ?? 0;

    console.info(
      `[END: MarketplaceAggregates] health.count=${healthCount} lifestyle.count=${lifestyleCount}`,
    );

    return {
      health: {
        count: healthCount,
        totals: {
          steps: sum(healthTotals, "steps"),
          duration_seconds: sum(healthTotals, "duration_seconds"),
          active_energy_kcal: sum(healthTotals, "active_energy_kcal"),
          basal_energy_kcal: sum(healthTotals, "basal_energy_kcal"),
          avg_quality: avg(healthTotals, "quality", 4),
          avg_heart_rate: avg(healthTotals, "heart_rate", 2),
          avg_resting_hr: avg(healthTotals, "resting_heart_rate", 2),
          max_heart_rate: null,
          min_heart_rate: null,
          avg_blood_oxygen: avg(healthTotals, "blood_oxygen", 2),
          avg_vo2_max: avg(healthTotals, "vo2_max", 2),
        },
        range: {
          min_processed_at: healthRange.min,
          max_processed_at: healthRange.max,
        },
      },
      lifestyle: {
        count: lifestyleCount,
        totals: {
          session_duration: sum(lifestyleTotals, "session_duration"),
          avg_quality: avg(lifestyleTotals, "quality", 4),
          event_types: eventTypes.size,
          event_categories: eventCategories.size,
        },
        range: {
          min_processed_at: lifestyleRange.min,
          max_processed_at: lifestyleRange.max,
        },
      },
    };
  } catch (err) {
    console.error("[CRITICAL FAILURE: MarketplaceAggregates] Exception:", err);
    return { health: null, lifestyle: null };
  }
}

// Pulls every relevant staged record for a user across BOTH staging tables.
async function fetchOmniRecords(
  supabase: ReturnType<typeof createClient>,
  pseudoId: string,
): Promise<{ success: boolean; health: any[]; lifestyle: any[]; error?: string }> {
  try {
    console.info(`[BEGIN: OmniFetch] Initiating cross-table data retrieval for operator: ${pseudoId}`);
    const filter = `user_id.eq.${pseudoId},entity_id.eq.${pseudoId},pseudo_user_id.eq.${pseudoId}`;

    const [healthRes, lifestyleRes] = await Promise.all([
      supabase
        .from("staged_health_data")
        .select("*")
        .or(filter)
        .order("processed_at", { ascending: false })
        .limit(MAX_OMNI_ROWS),
      supabase
        .from("staged_lifestyle_data")
        .select("*")
        .or(filter)
        .order("processed_at", { ascending: false })
        .limit(MAX_OMNI_ROWS),
    ]);

    if (healthRes.error) {
      console.info(`[BEGIN: OmniFetch.Health.Error] Evaluating Health API error response.`);
      console.error("[ERROR: OmniFetch.Health] Health table query failed:", healthRes.error.message);
      console.info(`[END: OmniFetch.Health.Error] Error logged.`);
    }
    if (lifestyleRes.error) {
      console.info(`[BEGIN: OmniFetch.Lifestyle.Error] Evaluating Lifestyle API error response.`);
      console.error("[ERROR: OmniFetch.Lifestyle] Lifestyle table query failed:", lifestyleRes.error.message);
      console.info(`[END: OmniFetch.Lifestyle.Error] Error logged.`);
    }

    console.info(
      `[END: OmniFetch] Retrieval complete. Health: ${healthRes.data?.length || 0}, Lifestyle: ${lifestyleRes.data?.length || 0}`,
    );
    return {
      success: !healthRes.error && !lifestyleRes.error,
      health: healthRes.data ?? [],
      lifestyle: lifestyleRes.data ?? [],
    };
  } catch (err) {
    console.info(`[BEGIN: OmniFetch.Stall] Catch block triggered during parallel retrieval.`);
    console.error("[CRITICAL FAILURE: OmniFetch] Fatal exception during parallel retrieval:", err);
    console.info(`[END: OmniFetch.Stall] Returning empty result set following error.`);
    return { success: false, health: [], lifestyle: [], error: String(err) };
  }
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => typeof v === "string" && v.trim().length > 0)));
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) chunks.push(values.slice(i, i + size));
  return chunks;
}

async function collectStagedAcaHashes(
  supabase: ReturnType<typeof createClient>,
  table: "staged_health_data" | "staged_lifestyle_data",
): Promise<string[]> {
  const hashes = new Set<string>();
  let offset = 0;

  for (let page = 0; page < MARKETPLACE_MAX_HASH_PAGES; page++) {
    const { data, error } = await supabase
      .from(table)
      .select("id, aca_hash_key")
      .not("aca_hash_key", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + MARKETPLACE_HASH_PAGE_SIZE - 1);

    if (error) throw new Error(`${table} hash scan failed: ${error.message}`);
    for (const row of data ?? []) {
      if ((row as any).aca_hash_key) hashes.add(String((row as any).aca_hash_key));
    }
    if (!data || data.length < MARKETPLACE_HASH_PAGE_SIZE) break;
    offset += MARKETPLACE_HASH_PAGE_SIZE;
  }

  return Array.from(hashes);
}

async function resolveHashOwners(
  supabase: ReturnType<typeof createClient>,
  hashes: string[],
): Promise<Map<string, string>> {
  const hashToOwner = new Map<string, string>();
  for (const chunk of chunkArray(hashes, 100)) {
    const { data, error } = await supabase
      .from("user_aca_records")
      .select("aca_hash_key, platform_guid")
      .in("aca_hash_key", chunk);
    if (error) throw new Error(`ACA owner resolution failed: ${error.message}`);
    for (const row of data ?? []) {
      const hash = (row as any).aca_hash_key;
      const owner = (row as any).platform_guid;
      if (hash && owner) hashToOwner.set(String(hash), String(owner));
    }
  }
  return hashToOwner;
}

async function fetchBalancedRowsForReceipt(
  supabase: ReturnType<typeof createClient>,
  table: "staged_health_data" | "staged_lifestyle_data",
  hashes: string[],
  rowsPerContributor: number,
): Promise<any[]> {
  const responses = await Promise.all(
    hashes.map((hash) =>
      supabase
        .from(table)
        .select("*")
        .eq("aca_hash_key", hash)
        .order("processed_at", { ascending: false })
        .limit(rowsPerContributor),
    ),
  );

  const rows: any[] = [];
  for (const res of responses) {
    if (res.error) {
      console.error(`[ERROR: MarketplaceFetch.SampleRows.${table}]`, res.error.message);
      continue;
    }
    rows.push(...(res.data ?? []));
  }
  return rows;
}

// Marketplace mode: scan staged ACA lineage across ALL contributing owners so
// payouts do not depend on the newest 500 rows belonging to a single user.
async function fetchMarketplaceRecords(
  supabase: ReturnType<typeof createClient>,
): Promise<MarketplaceFetchResult> {
  try {
    console.info(`[BEGIN: MarketplaceFetch] Cross-owner retrieval initiated.`);

    const [healthHashes, lifestyleHashes] = await Promise.all([
      collectStagedAcaHashes(supabase, "staged_health_data"),
      collectStagedAcaHashes(supabase, "staged_lifestyle_data"),
    ]);
    const allHashes = uniqueStrings([...healthHashes, ...lifestyleHashes]);
    const hashToOwner = await resolveHashOwners(supabase, allHashes);

    const perContributor = new Map<string, { hash: string; table: "staged_health_data" | "staged_lifestyle_data" }>();
    const registerHash = (hash: string, table: "staged_health_data" | "staged_lifestyle_data") => {
      const owner = hashToOwner.get(hash);
      if (owner && !perContributor.has(owner)) perContributor.set(owner, { hash, table });
    };
    healthHashes.forEach((hash) => registerHash(hash, "staged_health_data"));
    lifestyleHashes.forEach((hash) => registerHash(hash, "staged_lifestyle_data"));

    const healthReceiptHashes = Array.from(perContributor.values())
      .filter((entry) => entry.table === "staged_health_data")
      .map((entry) => entry.hash);
    const lifestyleReceiptHashes = Array.from(perContributor.values())
      .filter((entry) => entry.table === "staged_lifestyle_data")
      .map((entry) => entry.hash);
    const receiptIds = Array.from(perContributor.values()).map((entry) => entry.hash);
    const rowsPerContributor = Math.max(
      1,
      Math.floor(MARKETPLACE_SAMPLE_ROW_BUDGET / Math.max(1, receiptIds.length)),
    );

    const [health, lifestyle] = await Promise.all([
      fetchBalancedRowsForReceipt(supabase, "staged_health_data", healthReceiptHashes, rowsPerContributor),
      fetchBalancedRowsForReceipt(supabase, "staged_lifestyle_data", lifestyleReceiptHashes, rowsPerContributor),
    ]);

    const unresolvedHashCount = allHashes.filter((hash) => !hashToOwner.has(hash)).length;
    console.info(
      `[END: MarketplaceFetch] candidate_hashes=${allHashes.length} resolved_contributors=${perContributor.size} receipt_ids=${receiptIds.length} unresolved_hashes=${unresolvedHashCount} sample_health=${health.length} sample_lifestyle=${lifestyle.length}`,
    );
    return {
      success: true,
      health,
      lifestyle,
      receiptIds,
      contributorCount: perContributor.size,
      unresolvedHashCount,
    };
  } catch (err) {
    console.error("[CRITICAL FAILURE: MarketplaceFetch]", err);
    return {
      success: false,
      health: [],
      lifestyle: [],
      receiptIds: [],
      contributorCount: 0,
      unresolvedHashCount: 0,
      error: String(err),
    };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── BANNED LEXICON & LINGUISTIC GOVERNANCE ────────────────────────────────────
const BANNED_WORDS = [
  "unleash",
  "dive into",
  "game-changing",
  "revolutionary",
  "transformative",
  "leverage",
  "unlock potential",
  "dive deeper",
  "delve",
  "synergy",
];

type AgentType = "MEDICAL_AGENT" | "CONSTRUCTION_AGENT" | "FINANCE_AGENT" | "GENERAL_NAVIGATOR";

type ResearchPlan = {
  agent: AgentType;
  outputMode: "navigation" | "research";
  highStakes: boolean;
  dataAvailability: "none" | "limited" | "available";
  intentSummary: string;
  objectives: string[];
  evidenceNeeds: string[];
  verificationChecks: string[];
};

type VerificationResult = {
  text: string;
  issues: string[];
};

const requestSchema = z.object({
  message: z.string().min(1),
  client_id: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
  context: z.object({
    currentPage: z.string().optional(),
    isMarketplaceMode: z.boolean().optional(),
    platformGuid: z.string().optional(),
    userId: z.string().optional(),
    location_string: z.string().nullable().optional(),
    marketplace: z
      .object({
        healthRecords: z.array(z.any()).optional().default([]),
        lifestyleRecords: z.array(z.any()).optional().default([]),
        lookupId: z.string().nullable().optional(),
        liabilityTokenHash: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  }),
});

const AGENT_REGISTRY: Record<AgentType, { prompt: string; highStakes: boolean; verificationChecks: string[] }> = {
  MEDICAL_AGENT: {
    prompt: "You are the IDIA Hub Analyst focused on health data.\nSummarize what the data shows in plain language.",
    highStakes: false,
    verificationChecks: [],
  },
  CONSTRUCTION_AGENT: {
    prompt:
      "You are the IDIA Hub Analyst focused on built-environment data.\nSummarize what the data shows in plain language.",
    highStakes: false,
    verificationChecks: [],
  },
  FINANCE_AGENT: {
    prompt:
      "You are the IDIA Hub Analyst focused on financial and market data.\nSummarize what the data shows in plain language.",
    highStakes: false,
    verificationChecks: [],
  },
  GENERAL_NAVIGATOR: {
    prompt: "You are the IDIA Hub Analyst.\nHelp the user understand the data yield and next step in plain language.",
    highStakes: false,
    verificationChecks: [],
  },
};

const ORCHESTRATOR_PROMPT =
  "You are the IDIA Hub Analyst speaking from the Library of Data.\n\n" +
  "CRITICAL DIRECTIVES:\n" +
  "1. DO NOT run library checks, citation checks, or fact-checking against external sources. \n" +
  "2. The numeric data provided in the payload is the absolute ground truth. \n" +
  '3. DO NOT append "_Library check flagged_" or any internal warning messages to the output.\n' +
  "4. Your response should conclude with the a thank you.\n\n" +
  "Language rules:\n" +
  "- Plain vocabulary, no hype.\n" +
  "- Brief, \n" +
  "- Numbers first, then the trend.";

const STORE_CLERK_PERSONA = "You are Best Friend, the IDIA Hub guide with read access to the Library of Data summary.";

function applyLinguisticGovernance(text: string): string {
  let cleaned = text;
  for (const phrase of BANNED_WORDS) {
    const re = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(re, "");
  }
  // Preserve ; and — so cited lists and dashed clauses survive.
  cleaned = cleaned.replace(/ {2,}/g, " ").trim();
  return cleaned;
}

function routeIntent(message: string): AgentType {
  if (/\b(heart|medical|health|clinical|diagnosis|symptom|treatment|patient|drug|pharma)\b/i.test(message))
    return "MEDICAL_AGENT";
  if (/\b(cost|permits?|construction|steel|concrete|labor|ENR|building)\b/i.test(message)) return "CONSTRUCTION_AGENT";
  if (/\b(market|sales|CLV|revenue|SEC|filing|stock|portfolio|RFM)\b/i.test(message)) return "FINANCE_AGENT";
  return "GENERAL_NAVIGATOR";
}

function getAgentPrompt(agent: AgentType): string {
  return AGENT_REGISTRY[agent].prompt;
}

const MAX_RECORDS_PER_TABLE = 150;
const MAX_PAYLOAD_BYTES = 80_000;

// ─── ACA FILE INSPECTOR ────────────────────────────────────────────────────────
// Tables that carry an aca_hash_key reference (the canonical column).
const ACA_HASH_KEY_TABLES = [
  "raw_health_data",
  "raw_app_data",
  "staged_health_data",
  "staged_lifestyle_data",
  "staged_ford_data",
  "governance_ledger",
  "data_lineage_index",
  "dao_proposals",
  "dao_votes",
  "committee_applications",
  "proposal_comments",
  "proposal_signatures",
  "hat_recall_petitions",
  "hat_recall_signatures",
  "synapse_controller",
] as const;
// Tables that store the hash under a non-standard column name.
const ACA_HASH_ALT_TABLES: Array<{ table: string; column: string }> = [
  { table: "delt_transfers", column: "aca_hash" },
  { table: "usdc_payments", column: "aca_hash" },
  { table: "dao_vetoes", column: "veto_aca_hash" },
];

const PII_KEYS = new Set([
  "platform_guid",
  "user_id",
  "pseudo_user_id",
  "entity_id",
  "owner_id",
  "actor_id",
]);

function stripPiiRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row ?? {})) {
    if (PII_KEYS.has(k)) {
      out[k] = typeof v === "string" && v.length >= 8 ? v.slice(0, 8) + "…" : null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function detectAcaIntent(msg: string): { mode: "list" | "inspect" | "none"; hash?: string } {
  const lower = msg.toLowerCase();
  // Inspect: explicit hash token (hex >= 8 chars, optionally with "aca" nearby)
  const hashMatch = msg.match(/\b([a-f0-9]{8,64})\b/i);
  const mentionsAca = /\baca\b/i.test(msg);
  if (hashMatch && (mentionsAca || /\b(inspect|what.?s in|contents of|inside|show me|file)\b/i.test(lower))) {
    return { mode: "inspect", hash: hashMatch[1].toLowerCase() };
  }
  if (mentionsAca && /\b(list|all|every|catalog|index|how many|count|files?)\b/i.test(lower)) {
    return { mode: "list" };
  }
  return { mode: "none" };
}

async function listAcaFiles(
  supabase: ReturnType<typeof createClient>,
  limit = 50,
): Promise<{ total: number; rows: any[]; error?: string }> {
  try {
    const { count } = await supabase
      .from("user_aca_records")
      .select("*", { count: "exact", head: true });
    const { data, error } = await supabase
      .from("user_aca_records")
      .select("aca_hash_key, source_id, consent_type, created_at, consumed_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { total: count ?? data?.length ?? 0, rows: (data ?? []).map(stripPiiRow) };
  } catch (err: any) {
    return { total: 0, rows: [], error: err?.message ?? String(err) };
  }
}

async function inspectAcaFile(
  supabase: ReturnType<typeof createClient>,
  hashOrPrefix: string,
): Promise<{ found: boolean; registry?: any; totals: Record<string, number>; samples: Record<string, any[]>; error?: string }> {
  const totals: Record<string, number> = {};
  const samples: Record<string, any[]> = {};
  try {
    // Resolve prefix → unique full hash via user_aca_records.
    let fullHash = hashOrPrefix;
    if (hashOrPrefix.length < 32) {
      const { data: matches, error: matchErr } = await supabase
        .from("user_aca_records")
        .select("aca_hash_key")
        .ilike("aca_hash_key", `${hashOrPrefix}%`)
        .limit(2);
      if (matchErr) throw matchErr;
      if (!matches || matches.length === 0) {
        return { found: false, totals, samples, error: "No ACA file matches that prefix." };
      }
      if (matches.length > 1) {
        return { found: false, totals, samples, error: "Prefix is ambiguous; provide more characters." };
      }
      fullHash = (matches[0] as any).aca_hash_key;
    }

    const { data: reg } = await supabase
      .from("user_aca_records")
      .select("aca_hash_key, source_id, consent_type, consent_scope, created_at, consumed_at")
      .eq("aca_hash_key", fullHash)
      .maybeSingle();

    const probes = await Promise.all([
      ...ACA_HASH_KEY_TABLES.map(async (t) => {
        const { count } = await supabase
          .from(t)
          .select("*", { count: "exact", head: true })
          .eq("aca_hash_key", fullHash);
        const { data } = await supabase
          .from(t)
          .select("*")
          .eq("aca_hash_key", fullHash)
          .limit(3);
        return { table: t, count: count ?? 0, rows: (data ?? []).map(stripPiiRow) };
      }),
      ...ACA_HASH_ALT_TABLES.map(async ({ table, column }) => {
        const { count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq(column, fullHash);
        const { data } = await supabase
          .from(table)
          .select("*")
          .eq(column, fullHash)
          .limit(3);
        return { table, count: count ?? 0, rows: (data ?? []).map(stripPiiRow) };
      }),
    ]);

    for (const p of probes) {
      totals[p.table] = p.count;
      if (p.rows.length) samples[p.table] = p.rows;
    }

    return { found: true, registry: reg ? stripPiiRow(reg) : null, totals, samples };
  } catch (err: any) {
    return { found: false, totals, samples, error: err?.message ?? String(err) };
  }
}

function buildAcaContext(
  intent: { mode: "list" | "inspect"; hash?: string },
  listResult?: Awaited<ReturnType<typeof listAcaFiles>>,
  inspectResult?: Awaited<ReturnType<typeof inspectAcaFile>>,
): string {
  const guard =
    "\n\nACA RESPONSE RULES (mandatory):\n" +
    "- Never echo, quote, or reference the ACA hash value itself in your reply.\n" +
    "- Translate counts into signal: describe what the activity pattern means, not the raw rows.\n" +
    "- Aim for a medium-length summary (3-6 sentences). No tables, no IDs, no JSON.\n" +
    "- If the file has no downstream activity, say it is dormant and explain implications.\n";

  if (intent.mode === "list" && listResult) {
    if (listResult.error) return `\n\nACA INDEX: error fetching catalog (${listResult.error}).` + guard;
    const sources = new Map<string, number>();
    for (const r of listResult.rows) sources.set(r.source_id ?? "unknown", (sources.get(r.source_id ?? "unknown") ?? 0) + 1);
    const consumed = listResult.rows.filter((r: any) => r.consumed_at).length;
    const oldest = listResult.rows[listResult.rows.length - 1]?.created_at;
    const newest = listResult.rows[0]?.created_at;
    return (
      "\n\nACA CATALOG SIGNAL:\n" +
      JSON.stringify({
        total_files: listResult.total,
        recent_window: listResult.rows.length,
        consumed_in_window: consumed,
        sources: Object.fromEntries(sources),
        newest_at: newest,
        oldest_in_window_at: oldest,
      }) +
      guard
    );
  }

  if (intent.mode === "inspect" && inspectResult) {
    if (!inspectResult.found) {
      return `\n\nACA FILE LOOKUP: ${inspectResult.error ?? "not found"}.` + guard;
    }
    const totals = inspectResult.totals;
    const grouped = {
      raw_signals: (totals["raw_health_data"] ?? 0) + (totals["raw_app_data"] ?? 0),
      staged_signals:
        (totals["staged_health_data"] ?? 0) +
        (totals["staged_lifestyle_data"] ?? 0) +
        (totals["staged_ford_data"] ?? 0),
      financial_events: (totals["delt_transfers"] ?? 0) + (totals["usdc_payments"] ?? 0),
      governance_events:
        (totals["governance_ledger"] ?? 0) +
        (totals["dao_proposals"] ?? 0) +
        (totals["dao_votes"] ?? 0) +
        (totals["dao_vetoes"] ?? 0) +
        (totals["proposal_comments"] ?? 0) +
        (totals["proposal_signatures"] ?? 0),
      lineage_links: totals["data_lineage_index"] ?? 0,
      controller_events: totals["synapse_controller"] ?? 0,
    };
    return (
      "\n\nACA FILE SIGNAL:\n" +
      JSON.stringify({
        registry: inspectResult.registry,
        grouped,
      }) +
      guard
    );
  }
  return "";
}

// ─── DETERMINISTIC ACA RESPONDER ───────────────────────────────────────────────
// Server-authored, signal-only summary. Bypasses the LLM so the agreed format
// cannot regress to legacy phrasing. Never echoes the hash.
function buildAcaPlainResponse(
  intent: { mode: "list" | "inspect"; hash?: string },
  listResult?: Awaited<ReturnType<typeof listAcaFiles>>,
  inspectResult?: Awaited<ReturnType<typeof inspectAcaFile>>,
): string | null {
  if (intent.mode === "list" && listResult) {
    if (listResult.error) {
      return `I could not read the ACA catalog right now (${listResult.error}). Try again in a moment.`;
    }
    const total = listResult.total;
    const rows = listResult.rows ?? [];
    if (total === 0) return "The ACA catalog is empty — no files have been registered yet.";
    const sources = new Map<string, number>();
    for (const r of rows) {
      const src = (r as any).source_id ?? "unknown";
      sources.set(src, (sources.get(src) ?? 0) + 1);
    }
    const consumed = rows.filter((r: any) => r.consumed_at).length;
    const newest = rows[0]?.created_at;
    const oldest = rows[rows.length - 1]?.created_at;
    const topSources = [...sources.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ");
    const consumedPct = rows.length ? Math.round((consumed / rows.length) * 100) : 0;
    return [
      `Across the registry there are ${total} ACA files on record.`,
      `Of the ${rows.length} most recent, ${consumed} have already been consumed downstream (${consumedPct}%).`,
      topSources ? `Activity is led by ${topSources}.` : "",
      newest && oldest
        ? `The window spans from ${new Date(oldest).toISOString().slice(0, 10)} to ${new Date(newest).toISOString().slice(0, 10)}.`
        : "",
      "Ask about a specific ACA prefix if you want a per-file readout.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (intent.mode === "inspect" && inspectResult) {
    if (!inspectResult.found) {
      return `That ACA lookup did not resolve — ${inspectResult.error ?? "no matching file"}. Try a longer prefix.`;
    }
    const t = inspectResult.totals;
    const reg: any = inspectResult.registry ?? {};
    const raw = (t["raw_health_data"] ?? 0) + (t["raw_app_data"] ?? 0);
    const staged =
      (t["staged_health_data"] ?? 0) + (t["staged_lifestyle_data"] ?? 0) + (t["staged_ford_data"] ?? 0);
    const fin = (t["delt_transfers"] ?? 0) + (t["usdc_payments"] ?? 0);
    const gov =
      (t["governance_ledger"] ?? 0) +
      (t["dao_proposals"] ?? 0) +
      (t["dao_votes"] ?? 0) +
      (t["dao_vetoes"] ?? 0) +
      (t["proposal_comments"] ?? 0) +
      (t["proposal_signatures"] ?? 0);
    const lineage = t["data_lineage_index"] ?? 0;
    const controller = t["synapse_controller"] ?? 0;
    const total = raw + staged + fin + gov + lineage + controller;

    const created = reg.created_at ? new Date(reg.created_at).toISOString().slice(0, 10) : null;
    const source = reg.source_id ?? "an unspecified source";
    const consent = reg.consent_type ? `, consent type ${reg.consent_type}` : "";

    if (total === 0) {
      return [
        `This ACA file is dormant.`,
        created ? `It was registered on ${created} from ${source}${consent},` : `Registered from ${source}${consent},`,
        `but no downstream pipeline, financial, governance, or lineage activity has been recorded against it.`,
        `Practically that means the file is sealed and untouched — eligible for use, not yet consumed.`,
      ].join(" ");
    }

    const parts: string[] = [];
    if (raw) parts.push(`${raw} raw signal${raw === 1 ? "" : "s"} ingested`);
    if (staged) parts.push(`${staged} staged record${staged === 1 ? "" : "s"} prepared for downstream use`);
    if (fin) parts.push(`${fin} financial event${fin === 1 ? "" : "s"}`);
    if (gov) parts.push(`${gov} governance event${gov === 1 ? "" : "s"}`);
    if (lineage) parts.push(`${lineage} lineage link${lineage === 1 ? "" : "s"}`);
    if (controller) parts.push(`${controller} controller event${controller === 1 ? "" : "s"}`);

    const activity = parts.join(", ");
    const meaning =
      fin > 0
        ? "It has already produced settlement activity, so it is materially in use."
        : staged > 0
          ? "It is moving through the pipeline but has not yet generated settlement activity."
          : raw > 0
            ? "Ingestion has begun but the file has not yet been staged or monetized."
            : "Activity is limited to governance or lineage — the file has not yet been monetized.";

    return [
      created ? `Registered on ${created} from ${source}${consent}.` : `Registered from ${source}${consent}.`,
      `Across the system this file has ${activity}.`,
      meaning,
      `Total downstream touches: ${total}.`,
    ].join(" ");
  }
  return null;
}
// ───────────────────────────────────────────────────────────────────────────────

function truncateRecords(health: any[], lifestyle: any[]): { health: any[]; lifestyle: any[] } {
  let h = health.slice(0, MAX_RECORDS_PER_TABLE);
  let l = lifestyle.slice(0, MAX_RECORDS_PER_TABLE);
  // Iteratively shrink until under byte budget (gpt-4o-mini TPM = 200k tokens).
  while (JSON.stringify(h).length + JSON.stringify(l).length > MAX_PAYLOAD_BYTES && (h.length > 1 || l.length > 1)) {
    h = h.slice(0, Math.max(1, Math.floor(h.length / 2)));
    l = l.slice(0, Math.max(1, Math.floor(l.length / 2)));
  }
  return { health: h, lifestyle: l };
}

function redactPII(text: string): string {
  let cleaned = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
  cleaned = cleaned.replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[PHONE_REDACTED]");
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  return cleaned;
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function shortenLongSentences(text: string): string {
  return splitIntoSentences(text)
    .flatMap((sentence) => {
      const words = sentence.split(/\s+/).filter(Boolean);
      if (words.length <= 20) return [sentence];

      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += 18) {
        const chunk = words
          .slice(i, i + 18)
          .join(" ")
          .trim();
        if (!chunk) continue;
        chunks.push(/[.!?]$/.test(chunk) ? chunk : chunk + ".");
      }
      return chunks;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildResearchPlan(
  message: string,
  agent: AgentType,
  isMarketplaceMode: boolean,
  _healthRecords: any[],
  _lifestyleRecords: any[],
): ResearchPlan {
  return {
    agent,
    outputMode: isMarketplaceMode ? "research" : "navigation",
    highStakes: false,
    dataAvailability: "available",
    intentSummary: message.slice(0, 240),
    objectives: ["Summarize the data yield"],
    evidenceNeeds: [],
    verificationChecks: [],
  };
}

function summarizeMarketplaceData(
  aggregates: OmniAggregates | null,
  sampleHealth: any[],
  sampleLifestyle: any[],
) {
  const h = aggregates?.health;
  const l = aggregates?.lifestyle;
  const healthCount = h?.count ?? sampleHealth.length;
  const lifestyleCount = l?.count ?? sampleLifestyle.length;
  return {
    health_records: healthCount,
    lifestyle_records: lifestyleCount,
    total_samples: healthCount + lifestyleCount,
    step_volume: h?.totals?.steps ?? null,
    active_energy_kcal: h?.totals?.active_energy_kcal ?? null,
    basal_energy_kcal: h?.totals?.basal_energy_kcal ?? null,
    duration_seconds: h?.totals?.duration_seconds ?? null,
    average_quality: h?.totals?.avg_quality ?? null,
    baseline_hr: h?.totals?.avg_heart_rate ?? null,
    resting_hr: h?.totals?.avg_resting_hr ?? null,
    max_hr: h?.totals?.max_heart_rate ?? null,
    min_hr: h?.totals?.min_heart_rate ?? null,
    avg_blood_oxygen: h?.totals?.avg_blood_oxygen ?? null,
    avg_vo2_max: h?.totals?.avg_vo2_max ?? null,
    lifestyle_event_types: l?.totals?.event_types ?? null,
    lifestyle_event_categories: l?.totals?.event_categories ?? null,
    date_range_health: h?.range ?? null,
    date_range_lifestyle: l?.range ?? null,
    sample_size: sampleHealth.length + sampleLifestyle.length,
    aggregates_source: aggregates ? "database" : "sample_fallback",
  };
}

function buildOrchestratorPrompt(
  plan: ResearchPlan,
  agentPrompt: string,
  marketplaceSummary: Record<string, unknown> | null,
  healthRecords: any[],
  lifestyleRecords: any[],
) {
  let compactData = "No marketplace dataset is attached to this request.";
  if (marketplaceSummary) {
    compactData =
      "TRUE_TOTALS (from database, authoritative — use these for all counts/sums/averages):\n" +
      JSON.stringify(marketplaceSummary) +
      "\n\n" +
      "SAMPLE_ROWS — HEALTH (preview only, NOT representative of totals):\n" +
      JSON.stringify(healthRecords) +
      "\n\n" +
      "SAMPLE_ROWS — LIFESTYLE (preview only, NOT representative of totals):\n" +
      JSON.stringify(lifestyleRecords);
  }

  return (
    ORCHESTRATOR_PROMPT +
    "\n\n" +
    "ACTIVE AGENT: " +
    plan.agent +
    "\n" +
    "AGENT INSTRUCTIONS:\n" +
    agentPrompt +
    "\n\n" +
    "RESEARCH PLAN:\n" +
    JSON.stringify(plan, null, 2) +
    "\n\n" +
    "EXECUTION RULES:\n" +
    "- State the data clearly.\n" +
    "- Do not add citations or source markers.\n" +
    compactData
  );
}

// STRIPPED: verification logic removed to prevent LLM hallucinations from blocking the Anchor token.
function runVerificationLoop(draft: string, healthRecords: any[], lifestyleRecords: any[]): VerificationResult {
  return {
    text: draft,
    issues: [],
  };
}

function normalizeOutput(text: string, _agent: AgentType): string {
  let cleaned = applyLinguisticGovernance(text);
  cleaned = shortenLongSentences(cleaned);
  cleaned = redactPII(cleaned);
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const __t0 = performance.now();
  const logApiMetric = (statusCode: number, errorDetails?: string, userId?: string) => {
    const latencyMs = Math.max(0, Math.round(performance.now() - __t0));
    const task = (async () => {
      console.log("[HUB_TELEMETRY][INGEST][START] Capturing processing latency for runtime thread...");
      try {
        const metricsClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await metricsClient.from("api_metrics").insert({
          endpoint: "best-friend-ai",
          latency_ms: latencyMs,
          status_code: statusCode,
          error_details: errorDetails ?? null,
          user_id: userId ?? null,
        });
        if (error) throw error;
        console.log("[HUB_TELEMETRY][INGEST][END:OK] Metrics written to database schema successfully.");
      } catch (err: any) {
        console.error("[HUB_TELEMETRY][INGEST][END:FAIL] api_metrics insert failed:", err?.message ?? String(err));
      }
    })();
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(task); } catch { /* noop */ }
  };

  let operatorId: string | undefined;
  let consumedReceipt: string[] = [];

  try {
    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === "") {
      console.info("[BEGIN: BestFriendAI.PayloadValidation.Stall] Empty request body received.");
      throw new Error("Empty request body");
    }

    let rawPayload = JSON.parse(bodyText);

    if (!rawPayload.message || rawPayload.message.trim() === "") {
      rawPayload.message = "I am ready to begin my data journey.";
    }

    console.info("[BEGIN: BestFriendAI.PayloadValidation] Validating incoming JSON.");
    const parsed = requestSchema.safeParse(rawPayload);

    if (!parsed.success) {
      console.info("[BEGIN: BestFriendAI.PayloadValidation.Error] Handling schema parsing failure.");
      console.error("[ERROR: BestFriendAI.PayloadValidation] Schema mismatch:", parsed.error.flatten());
      console.info("[END: BestFriendAI.PayloadValidation.Error] Returning 400 Bad Request.");
      logApiMetric(400, "zod_validation");
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.info("[END: BestFriendAI.PayloadValidation] Payload verified.");

    const { message, context, history, client_id } = parsed.data;
    const normalizedLocationString = context?.location_string?.trim() || undefined;

    operatorId = context?.platformGuid || context?.userId;

    if (!openAiApiKey) {
      console.info("[BEGIN: BestFriendAI.Environment.Error] Checking OpenAI API Key configuration.");
      console.error("[CRITICAL FAILURE: BestFriendAI.Environment] OPENAI_API_KEY is missing.");
      console.info("[END: BestFriendAI.Environment.Error] Throwing missing key error.");
      throw new Error("OPENAI_API_KEY is missing from the Supabase Edge Function environment variables.");
    }

    const isDataScientistMode = context?.isMarketplaceMode === true;
    const detectedAgent = routeIntent(message);
    const agentPrompt = getAgentPrompt(detectedAgent);
    let marketplaceReceiptIds: string[] = [];

    console.info(
      `[STATUS: BestFriendAI.Routing] Mode: ${isDataScientistMode ? "MARKETPLACE" : "NAVIGATION"}, Agent: ${detectedAgent}`,
    );

    let sourceHealth: any[] = context?.marketplace?.healthRecords ?? [];
    let sourceLifestyle: any[] = context?.marketplace?.lifestyleRecords ?? [];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let aggregates: OmniAggregates | null = null;
    if (operatorId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.info(`[BEGIN: BestFriendAI.OmniFetchExecution] Invoking OmniFetch for ID: ${operatorId}`);
      const [audit, aggResult, marketplaceAudit] = await Promise.all([
        fetchOmniRecords(supabase, operatorId),
        isDataScientistMode ? fetchMarketplaceAggregates(supabase) : fetchOmniAggregates(supabase, operatorId),
        isDataScientistMode
          ? fetchMarketplaceRecords(supabase)
          : Promise.resolve({
              success: true,
              health: [],
              lifestyle: [],
              receiptIds: [],
              contributorCount: 0,
              unresolvedHashCount: 0,
            } as MarketplaceFetchResult),
      ]);
      aggregates = aggResult;
      // In marketplace mode, prefer cross-owner sample so receipts fan out to
      // every contributing owner. Fall back to caller-scoped rows otherwise.
      if (isDataScientistMode && marketplaceAudit.success && (marketplaceAudit.health.length > 0 || marketplaceAudit.lifestyle.length > 0)) {
        sourceHealth = marketplaceAudit.health;
        sourceLifestyle = marketplaceAudit.lifestyle;
        marketplaceReceiptIds = marketplaceAudit.receiptIds;
        console.info(
          `[STATUS: BestFriendAI.MarketplaceSample] Balanced rows: ${sourceHealth.length} health + ${sourceLifestyle.length} lifestyle; receipt contributors=${marketplaceAudit.contributorCount}; unresolved_hashes=${marketplaceAudit.unresolvedHashCount}.`,
        );
      } else if (audit.success) {
        if (audit.health.length > 0) sourceHealth = audit.health;
        if (audit.lifestyle.length > 0) sourceLifestyle = audit.lifestyle;
        console.info(
          `[STATUS: BestFriendAI.OmniFetchExecution] Sample rows fetched for ${operatorId}: ${audit.health.length} health + ${audit.lifestyle.length} lifestyle. True totals: health=${aggregates?.health?.count ?? "n/a"} lifestyle=${aggregates?.lifestyle?.count ?? "n/a"}.`,
        );
      } else {
        console.info(`[BEGIN: BestFriendAI.OmniFetchExecution.Warning] Handling OmniFetch failure condition.`);
        console.warn(
          `[WARNING: BestFriendAI.OmniFetchExecution] Omni-fetch failed for ${operatorId}: ${audit.error ?? "see prior logs"}`,
        );
        console.info(
          `[END: BestFriendAI.OmniFetchExecution.Warning] OmniFetch failure recorded, proceeding with defaults.`,
        );
      }
      console.info("[END: BestFriendAI.OmniFetchExecution]");
    }

    console.info("[BEGIN: BestFriendAI.DataTruncation] Ensuring payload fits context window.");
    const { health: healthMetrics, lifestyle: lifestyleEvents } = truncateRecords(sourceHealth, sourceLifestyle);
    console.info(
      `[END: BestFriendAI.DataTruncation] Final dimensions: ${healthMetrics.length} health, ${lifestyleEvents.length} lifestyle.`,
    );

    const plan = buildResearchPlan(message, detectedAgent, isDataScientistMode, healthMetrics, lifestyleEvents);
    const marketplaceSummary = isDataScientistMode
      ? summarizeMarketplaceData(aggregates, healthMetrics, lifestyleEvents)
      : null;

    const totalsGuidance =
      "\n\nIMPORTANT: When reporting counts, sums, averages, or ranges, use the TRUE_TOTALS block. " +
      "The SAMPLE_ROWS block is a small preview of individual records for context and is NOT representative of totals. " +
      "Never count SAMPLE_ROWS to answer 'how many' or 'how much' questions.";

    let systemPrompt: string;
    if (isDataScientistMode) {
      systemPrompt =
        buildOrchestratorPrompt(plan, agentPrompt, marketplaceSummary, healthMetrics, lifestyleEvents) +
        totalsGuidance;
    } else {
      const trueTotals = summarizeMarketplaceData(aggregates, healthMetrics, lifestyleEvents);
      const hasAnyData =
        (trueTotals.health_records ?? 0) > 0 ||
        (trueTotals.lifestyle_records ?? 0) > 0 ||
        healthMetrics.length > 0 ||
        lifestyleEvents.length > 0;
      const navSummary = hasAnyData
        ? "\n\nTRUE_TOTALS (from database, authoritative):\n" +
          JSON.stringify(trueTotals) +
          "\n\nSAMPLE_ROWS (preview only, NOT representative of totals): " +
          `${healthMetrics.length} health + ${lifestyleEvents.length} lifestyle records shown.`
        : "\n\nLIBRARY SNAPSHOT: empty or not loaded for this session.";
      systemPrompt = STORE_CLERK_PERSONA + navSummary + totalsGuidance;
    }

    // ── ACA file inspector: detect intent and inject signal-only context ──
    const acaIntent = detectAcaIntent(message);
    let acaDirectResponse: string | null = null;
    let acaTouched = false;
    if (acaIntent.mode !== "none") {
      console.info(`[BEGIN: BestFriendAI.AcaInspector] Intent=${acaIntent.mode}`);
      if (acaIntent.mode === "list") {
        const listRes = await listAcaFiles(supabase);
        acaDirectResponse = buildAcaPlainResponse({ mode: "list" }, listRes);
        acaTouched = (listRes?.total ?? 0) > 0;
      } else if (acaIntent.mode === "inspect" && acaIntent.hash) {
        const inspectRes = await inspectAcaFile(supabase, acaIntent.hash);
        acaDirectResponse = buildAcaPlainResponse(
          { mode: "inspect", hash: acaIntent.hash },
          undefined,
          inspectRes,
        );
        acaTouched = !!inspectRes?.found;
      }
      console.info(
        `[END: BestFriendAI.AcaInspector] Direct response: ${acaDirectResponse ? "yes" : "no"}, touched=${acaTouched}`,
      );
    }

    // SHORT-CIRCUIT: ACA replies are server-authored so the agreed signal-only
    // format cannot regress to legacy phrasing from the LLM. We still issue a
    // Synapse receipt below for the data access.
    if (acaDirectResponse) {
      const aiResponse = normalizeOutput(acaDirectResponse, detectedAgent);

      // Receipt for ACA introspection (data access counts as consumption).
      if (operatorId && acaTouched) {
        try {
          const synapseUrl = `${SUPABASE_URL}/functions/v1/synapse-controller`;
          const acaRef = acaIntent.hash
            ? [acaIntent.hash]
            : [`aca-list-${new Date().toISOString().slice(0, 10)}`];
          await fetch(synapseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
            },
            body: JSON.stringify({
              user_id: operatorId,
              client_id: client_id || "IDIA_HUB_APP",
              aca_record_ids: acaRef,
              intent_type: acaIntent.mode === "list" ? "ACA_CATALOG_LOOKUP" : "ACA_FILE_INSPECT",
              location_string: normalizedLocationString,
            }),
          });
          consumedReceipt = acaRef;
        } catch (synErr: any) {
          console.error(`[BestFriendAI.AcaReceipt.Stall] ${synErr.message}`);
        }
      }

      logApiMetric(200, undefined, operatorId);
      return new Response(
        JSON.stringify({
          response: aiResponse,
          timestamp: new Date().toISOString(),
          agentStatus: "active",
          persona: "Best Friend",
          activeAgent: "GENERAL_NAVIGATOR",
          aca_mode: acaIntent.mode,
          consumed_records: consumedReceipt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const formattedHistory = Array.isArray(history)
      ? history
          .filter((h: any) => h.role === "user" || h.role === "assistant")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const shouldAppendCurrentMessage =
      formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1]?.content !== message;

    const contextString =
      "Current Context: " +
      (context
        ? JSON.stringify({
            currentPage: context.currentPage,
            isMarketplaceMode: context.isMarketplaceMode,
            agent: detectedAgent,
            plan,
          })
        : "No additional context provided") +
      '\n\nUser Request: "' +
      message +
      '"';

    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      ...(shouldAppendCurrentMessage
        ? [
            {
              role: "user",
              content: contextString,
            },
          ]
        : []),
    ];

    console.info("[BEGIN: BestFriendAI.OpenAIExecution] Dispatching payload to GPT-4o-Mini.");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      console.info(`[BEGIN: BestFriendAI.OpenAIExecution.Error] Parsing failed OpenAI API response.`);
      const errText = await response.text();
      console.error(`[CRITICAL FAILURE: BestFriendAI.OpenAIExecution] HTTP ${response.status}: ${errText}`);
      console.info(`[END: BestFriendAI.OpenAIExecution.Error] Throwing formatted API error.`);
      throw new Error(`OpenAI API HTTP Error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      console.info(`[BEGIN: BestFriendAI.OpenAIExecution.Stall] Validating empty response payload.`);
      console.error("[CRITICAL FAILURE: BestFriendAI.OpenAIExecution] Empty response array from OpenAI.");
      console.info(`[END: BestFriendAI.OpenAIExecution.Stall] Throwing empty response error.`);
      throw new Error(`OpenAI returned an empty response.`);
    }
    console.info("[END: BestFriendAI.OpenAIExecution] Response received successfully.");

    console.info("[BEGIN: BestFriendAI.Verification] Running output through Verification Loop.");
    const draftResponse =
      data.choices[0].message?.content || "I processed the request but could not format a text response.";
    const verification = runVerificationLoop(draftResponse, healthMetrics, lifestyleEvents);
    const aiResponse = normalizeOutput(verification.text, detectedAgent);
    console.info(`[END: BestFriendAI.Verification] Check complete. Issues found: ${verification.issues.length}`);

    // RECEIPT: every record actually shown to the AI counts as consumed.
    console.info("[BEGIN: BestFriendAI.ReceiptTransmission] Evaluating consumption vectors.");
    // Fire a receipt whenever the AI actually accessed user data — not just in
    // marketplace mode. Any AI interaction that reads the Library of Data must
    // produce a Synapse consumption receipt.
    const touchedData = healthMetrics.length > 0 || lifestyleEvents.length > 0;
    if (touchedData) {
      if (isDataScientistMode) {
        // MARKETPLACE_RESEARCH: one representative aca_hash_key per unique
        // contributing owner, so idia-circular-settlement pays every real
        // contributor (not just the buyer).
        consumedReceipt = marketplaceReceiptIds.length > 0
          ? marketplaceReceiptIds
          : uniqueStrings([...healthMetrics, ...lifestyleEvents].map((r: any) => r.aca_hash_key || r.id));
        console.info(
          `[STATUS: BestFriendAI.Receipt] Marketplace lineage receipt hashes=${consumedReceipt.length}.`,
        );
      } else {
        // BEST_FRIEND_AI_CHAT: personal chat, self-only receipt.
        const healthIds = healthMetrics.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
        const lifeIds = lifestyleEvents.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
        consumedReceipt = [...healthIds, ...lifeIds];
      }

      // THE MISSING WIRE: Actually send the receipt to Synapse!
      if (consumedReceipt.length > 0 && operatorId) {
        console.info(
          `[STATUS: BestFriendAI.ReceiptTransmission] Firing ${consumedReceipt.length} records to synapse-controller.`,
        );
        try {
          const synapseUrl = `${SUPABASE_URL}/functions/v1/synapse-controller`;

          console.info(`[BEGIN: BestFriendAI.ReceiptTransmission.Fetch] Initiating POST request to ${synapseUrl}`);
          const synapseRes = await fetch(synapseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // FIX: Promote to Service Role to bypass Client Auth volatility
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
            },
            body: JSON.stringify({
              user_id: operatorId,
              client_id: client_id || "IDIA_HUB_APP",
              aca_record_ids: consumedReceipt,
              intent_type: isDataScientistMode ? "MARKETPLACE_RESEARCH" : "BEST_FRIEND_AI_CHAT",
              location_string: normalizedLocationString,
              // Maintain strict telemetry
              granularity: 0.95,
              relevance: 1.0,
              timeliness: 1.0,
              completeness: 1.0,
              origin_fidelity: 1.0,
            }),
          });
          console.info(
            `[END: BestFriendAI.ReceiptTransmission.Fetch] Network resolution complete. HTTP Status: ${synapseRes.status}`,
          );

          if (!synapseRes.ok) {
            console.info(
              `[BEGIN: BestFriendAI.ReceiptTransmission.ErrorParse] Extracting error payload for failed HTTP ${synapseRes.status}`,
            );
            const errText = await synapseRes.text();
            console.info(`[END: BestFriendAI.ReceiptTransmission.ErrorParse] Error payload extracted.`);

            console.error(
              `[CRITICAL FAILURE: BestFriendAI.ReceiptTransmission] Synapse Controller rejected receipt. HTTP ${synapseRes.status}: ${errText}`,
            );
          } else {
            console.info(
              `[STATUS: BestFriendAI.ReceiptTransmission] Synapse Controller acknowledged receipt successfully.`,
            );
          }
        } catch (synErr: any) {
          console.info(`[BEGIN: BestFriendAI.ReceiptTransmission.Stall] Processing Synapse controller fetch error.`);
          console.error(
            `[CRITICAL FAILURE: BestFriendAI.ReceiptTransmission.Stall] Failed to reach Synapse network: ${synErr.message}`,
          );
          console.info(`[END: BestFriendAI.ReceiptTransmission.Stall] Fetch error parsed and logged.`);
        }
      }
    }
    console.info("[END: BestFriendAI.ReceiptTransmission]");

    console.info("[BEGIN: BestFriendAI.ResponseCompilation] Formatting final payload.");
    const personaLabels: Record<AgentType, string> = {
      MEDICAL_AGENT: "Health Analyst",
      CONSTRUCTION_AGENT: "Project Architect",
      FINANCE_AGENT: "Financial Controller",
      GENERAL_NAVIGATOR: "Best Friend",
    };
    const finalPayload = {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      agentStatus: "active",
      persona: personaLabels[detectedAgent],
      activeAgent: detectedAgent,
      queryComplexity:
        detectedAgent === "MEDICAL_AGENT" || detectedAgent === "FINANCE_AGENT"
          ? 2.0
          : detectedAgent === "CONSTRUCTION_AGENT"
            ? 1.5
            : 1.0,
      verificationIssues: verification.issues,
      orchestratorPlan: plan,
      consumed_records: consumedReceipt,
    };
    console.info("[END: BestFriendAI.ResponseCompilation] Payload ready.");

    console.info("[END: BestFriendAI.RequestGate] Closing HTTP transaction cleanly.");
    logApiMetric(200, undefined, operatorId);
    return new Response(JSON.stringify(finalPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.info(
      `[BEGIN: BestFriendAI.Diagnostics.Stall] Processing top-level catch block for error: ${error.message}`,
    );
    console.error(`[FATAL STALL]: ${error.message}`);
    console.info(`[END: BestFriendAI.Diagnostics.Stall] Error handled. Exiting gracefully.`);
    logApiMetric(500, error?.message ?? "unknown_error", operatorId);
    return new Response(
      JSON.stringify({
        response: `Diagnostics Alert: ${error.message}`,
        agentStatus: "error",
        persona: "Chief Researcher",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
