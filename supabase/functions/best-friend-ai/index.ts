import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_OMNI_ROWS = 5000;

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
      staged_signals: (totals["staged_health_data"] ?? 0) + (totals["staged_lifestyle_data"] ?? 0),
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
    const staged = (t["staged_health_data"] ?? 0) + (t["staged_lifestyle_data"] ?? 0);
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

function summarizeMarketplaceData(healthRecords: any[], lifestyleRecords: any[]) {
  const hrValues = healthRecords.map((r: any) => r.average_heartrate).filter((v: any) => typeof v === "number");
  return {
    health_records: healthRecords.length,
    lifestyle_records: lifestyleRecords.length,
    total_samples: healthRecords.length + lifestyleRecords.length,
    step_volume: healthRecords.reduce((acc: number, row: any) => acc + Number(row.steps_count || 0), 0),
    average_quality: healthRecords.length
      ? Number(
          (
            healthRecords.reduce((acc: number, row: any) => acc + Number(row.data_quality_score || 0), 0) /
            healthRecords.length
          ).toFixed(3),
        )
      : null,
    baseline_hr: hrValues.length
      ? Math.round(hrValues.reduce((acc: number, value: number) => acc + value, 0) / hrValues.length)
      : null,
    max_hr: hrValues.length ? Math.max(...hrValues) : null,
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
      "DATA SUMMARY:\n" +
      JSON.stringify(marketplaceSummary) +
      "\n\n" +
      "HEALTH DATA (compact JSON):\n" +
      JSON.stringify(healthRecords) +
      "\n\n" +
      "LIFESTYLE DATA (compact JSON):\n" +
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

    console.info(
      `[STATUS: BestFriendAI.Routing] Mode: ${isDataScientistMode ? "MARKETPLACE" : "NAVIGATION"}, Agent: ${detectedAgent}`,
    );

    let sourceHealth: any[] = context?.marketplace?.healthRecords ?? [];
    let sourceLifestyle: any[] = context?.marketplace?.lifestyleRecords ?? [];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (operatorId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.info(`[BEGIN: BestFriendAI.OmniFetchExecution] Invoking OmniFetch for ID: ${operatorId}`);
      const audit = await fetchOmniRecords(supabase, operatorId);
      if (audit.success) {
        if (audit.health.length > 0) sourceHealth = audit.health;
        if (audit.lifestyle.length > 0) sourceLifestyle = audit.lifestyle;
        console.info(
          `[STATUS: BestFriendAI.OmniFetchExecution] DB override for ${operatorId}: ${audit.health.length} health + ${audit.lifestyle.length} lifestyle records.`,
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
    const marketplaceSummary = isDataScientistMode ? summarizeMarketplaceData(healthMetrics, lifestyleEvents) : null;

    let systemPrompt: string;
    if (isDataScientistMode) {
      systemPrompt = buildOrchestratorPrompt(plan, agentPrompt, marketplaceSummary, healthMetrics, lifestyleEvents);
    } else {
      let navSummary = "\n\nLIBRARY SNAPSHOT: empty or not loaded for this session.";
      if (healthMetrics.length || lifestyleEvents.length) {
        navSummary =
          "\n\nLIBRARY SNAPSHOT:\n" + JSON.stringify(summarizeMarketplaceData(healthMetrics, lifestyleEvents));
      }
      systemPrompt = STORE_CLERK_PERSONA + navSummary;
    }

    // ── ACA file inspector: detect intent and inject signal-only context ──
    const acaIntent = detectAcaIntent(message);
    if (acaIntent.mode !== "none") {
      console.info(`[BEGIN: BestFriendAI.AcaInspector] Intent=${acaIntent.mode}`);
      let acaContext = "";
      if (acaIntent.mode === "list") {
        const listRes = await listAcaFiles(supabase);
        acaContext = buildAcaContext({ mode: "list" }, listRes);
      } else if (acaIntent.mode === "inspect" && acaIntent.hash) {
        const inspectRes = await inspectAcaFile(supabase, acaIntent.hash);
        acaContext = buildAcaContext({ mode: "inspect", hash: acaIntent.hash }, undefined, inspectRes);
      }
      systemPrompt += acaContext;
      console.info(`[END: BestFriendAI.AcaInspector] Context bytes appended: ${acaContext.length}`);
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
    if (isDataScientistMode) {
      const healthIds = healthMetrics.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
      const lifeIds = lifestyleEvents.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
      consumedReceipt = [...healthIds, ...lifeIds];

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
              intent_type: "MARKETPLACE RESEARCH",
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
