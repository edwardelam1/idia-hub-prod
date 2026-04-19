import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_OMNI_ROWS = 500;

// Pulls every relevant staged record for a user across BOTH staging tables.
// Tables expose user_id, entity_id, AND pseudo_user_id — we OR-filter on all three
// so a raw UUID, an entity ref, or a pre-hashed pseudonym all resolve correctly.
async function fetchOmniRecords(
  supabase: ReturnType<typeof createClient>,
  pseudoId: string,
): Promise<{ success: boolean; health: any[]; lifestyle: any[]; error?: string }> {
  try {
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

    if (healthRes.error) console.error("[OMNI_FETCH] health error:", healthRes.error.message);
    if (lifestyleRes.error) console.error("[OMNI_FETCH] lifestyle error:", lifestyleRes.error.message);

    return {
      success: !healthRes.error && !lifestyleRes.error,
      health: healthRes.data ?? [],
      lifestyle: lifestyleRes.data ?? [],
    };
  } catch (err) {
    console.error("[OMNI_FETCH] exception:", err);
    return { success: false, health: [], lifestyle: [], error: String(err) };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── BANNED LEXICON & LINGUISTIC GOVERNANCE ────────────────────────────────────
const BANNED_WORDS = [
  "unleash", "dive into", "game-changing", "revolutionary", "transformative",
  "leverage", "unlock potential", "dive deeper", "delve", "synergy",
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
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1),
  })).optional().default([]),
  context: z.object({
    currentPage: z.string().optional(),
    isMarketplaceMode: z.boolean().optional(),
    platformGuid: z.string().optional(),
    userId: z.string().optional(),
    marketplace: z.object({
      healthRecords: z.array(z.any()).optional().default([]),
      lifestyleRecords: z.array(z.any()).optional().default([]),
      lookupId: z.string().nullable().optional(),
      liabilityTokenHash: z.string().nullable().optional(),
    }).nullable().optional(),
  }).optional().default({}),
});

const AGENT_REGISTRY: Record<AgentType, { prompt: string; highStakes: boolean; verificationChecks: string[] }> = {
  MEDICAL_AGENT: {
    prompt: `You are the IDIA Hub Analyst focused on health data.
Summarize what the data shows in plain language.`,
    highStakes: false,
    verificationChecks: [],
  },
  CONSTRUCTION_AGENT: {
    prompt: `You are the IDIA Hub Analyst focused on built-environment data.
Summarize what the data shows in plain language.`,
    highStakes: false,
    verificationChecks: [],
  },
  FINANCE_AGENT: {
    prompt: `You are the IDIA Hub Analyst focused on financial and market data.
Summarize what the data shows in plain language.`,
    highStakes: false,
    verificationChecks: [],
  },
  GENERAL_NAVIGATOR: {
    prompt: `You are the IDIA Hub Analyst.
Help the user understand the data yield and next step in plain language.`,
    highStakes: false,
    verificationChecks: [],
  },
};

const ORCHESTRATOR_PROMPT = `You are the IDIA Hub Analyst speaking from the Library of Data.

CITATION RULES (MANDATORY):
- Every quantitative claim must cite its source. Use the format [src: <table>:<aca_hash_key prefix 8 chars>] or [src: <table> n=<count>].
- When summarizing aggregates, cite the row count and table, e.g. "average HR 72 bpm [src: staged_health_data n=277]".
- If a metric is not present in the attached Library payload, say "not in Library" — do not infer.
- Reference data_category and activity_type fields verbatim when relevant.

Language rules:
- Plain vocabulary, no hype.
- Brief, but never omit a citation to save space.
- Numbers first, then the citation, then the trend.`;

const STORE_CLERK_PERSONA = `You are Best Friend, the IDIA Hub guide with read access to the Library of Data summary.

You may answer questions about what data exists in the user's Library (counts, categories, last sync) by citing the attached summary.
For raw row inspection or research-grade analysis, recommend Marketplace Mode.
When you cite a number, append [src: <table> n=<count>] so the user knows it came from the Library, not a guess.
Keep it warm, plain, and brief — but always cite.`;

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
  if (/\b(heart|medical|health|clinical|diagnosis|symptom|treatment|patient|drug|pharma)\b/i.test(message)) return "MEDICAL_AGENT";
  if (/\b(cost|permits?|construction|steel|concrete|labor|ENR|building)\b/i.test(message)) return "CONSTRUCTION_AGENT";
  if (/\b(market|sales|CLV|revenue|SEC|filing|stock|portfolio|RFM)\b/i.test(message)) return "FINANCE_AGENT";
  return "GENERAL_NAVIGATOR";
}

function getAgentPrompt(agent: AgentType): string {
  return AGENT_REGISTRY[agent].prompt;
}

const MAX_RECORDS_PER_TABLE = 200;
const MAX_PAYLOAD_BYTES = 80_000;

function truncateRecords(health: any[], lifestyle: any[]): { health: any[]; lifestyle: any[] } {
  let h = health.slice(0, MAX_RECORDS_PER_TABLE);
  let l = lifestyle.slice(0, MAX_RECORDS_PER_TABLE);
  const size = JSON.stringify(h).length + JSON.stringify(l).length;
  if (size > MAX_PAYLOAD_BYTES) {
    const half = Math.floor(MAX_RECORDS_PER_TABLE / 2);
    h = h.slice(0, half);
    l = l.slice(0, half);
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
        const chunk = words.slice(i, i + 18).join(" ").trim();
        if (!chunk) continue;
        chunks.push(/[.!?]$/.test(chunk) ? chunk : `${chunk}.`);
      }
      return chunks;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCitationMarker(sentence: string): boolean {
  return /(source:|sources:|\[[^\]]+\]|\([^)]*(source|cdc|nih|sec|enr|census|trial|study|report)[^)]*\))/i.test(sentence);
}

function buildResearchPlan(message: string, agent: AgentType, isMarketplaceMode: boolean, _healthRecords: any[], _lifestyleRecords: any[]): ResearchPlan {
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
      ? Number((healthRecords.reduce((acc: number, row: any) => acc + Number(row.data_quality_score || 0), 0) / healthRecords.length).toFixed(3))
      : null,
    baseline_hr: hrValues.length ? Math.round(hrValues.reduce((acc: number, value: number) => acc + value, 0) / hrValues.length) : null,
    max_hr: hrValues.length ? Math.max(...hrValues) : null,
  };
}

function buildOrchestratorPrompt(plan: ResearchPlan, agentPrompt: string, marketplaceSummary: Record<string, unknown> | null, healthRecords: any[], lifestyleRecords: any[]) {
  const compactData = marketplaceSummary
    ? `DATA SUMMARY:\n${JSON.stringify(marketplaceSummary)}\n\nHEALTH DATA (compact JSON):\n${JSON.stringify(healthRecords)}\n\nLIFESTYLE DATA (compact JSON):\n${JSON.stringify(lifestyleRecords)}`
    : "No marketplace dataset is attached to this request.";

  return `${ORCHESTRATOR_PROMPT}

ACTIVE AGENT: ${plan.agent}
AGENT INSTRUCTIONS:
${agentPrompt}

RESEARCH PLAN:
${JSON.stringify(plan, null, 2)}

EXECUTION RULES:
- State the data clearly.
- Do not add citations or source markers.
- If the count is 55, just say 55.

${compactData}`;
}

function runVerificationLoop(
  draft: string,
  healthRecords: any[],
  lifestyleRecords: any[],
): VerificationResult {
  const issues: string[] = [];
  const totalRows = healthRecords.length + lifestyleRecords.length;

  // Check 1: any number-bearing sentence must carry a [src: ...] citation
  const numericSentences = splitIntoSentences(draft).filter((s) => /\d/.test(s));
  const uncited = numericSentences.filter((s) => !/\[src:\s*[^\]]+\]/i.test(s));
  if (uncited.length > 0) {
    issues.push(`uncited_numeric_claims:${uncited.length}`);
  }

  // Check 2: if the draft cites a row count, it must match the Library
  const countMatch = draft.match(/n=(\d+)/);
  if (countMatch) {
    const claimed = Number(countMatch[1]);
    if (claimed !== healthRecords.length && claimed !== lifestyleRecords.length && claimed !== totalRows) {
      issues.push(`row_count_mismatch:claimed=${claimed},library_health=${healthRecords.length},library_lifestyle=${lifestyleRecords.length}`);
    }
  }

  // Check 3: forbid invented aca_hash_key prefixes
  const hashRefs = [...draft.matchAll(/\[src:\s*\w+:([a-f0-9]{6,})\]/gi)].map((m) => m[1].toLowerCase());
  if (hashRefs.length > 0) {
    const validHashes = new Set(
      [...healthRecords, ...lifestyleRecords]
        .map((r: any) => String(r.aca_hash_key || "").toLowerCase())
        .filter(Boolean),
    );
    const fabricated = hashRefs.filter((prefix) => ![...validHashes].some((h) => h.startsWith(prefix)));
    if (fabricated.length > 0) {
      issues.push(`fabricated_hashes:${fabricated.join(",")}`);
    }
  }

  const footer = issues.length === 0
    ? `\n\n_Library check: passed (${totalRows} rows referenced)._`
    : `\n\n_Library check flagged: ${issues.join("; ")}._`;

  return { text: draft + footer, issues };
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

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, context, history } = parsed.data;

    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is missing from the Supabase Edge Function environment variables.");
    }

    const isDataScientistMode = context?.isMarketplaceMode === true;
    const detectedAgent = routeIntent(message);
    const agentPrompt = getAgentPrompt(detectedAgent);

    // Frontend payload (may be empty or partial)
    let sourceHealth: any[] = context?.marketplace?.healthRecords ?? [];
    let sourceLifestyle: any[] = context?.marketplace?.lifestyleRecords ?? [];

    // OMNI-FETCH: override frontend payload with the full DB record set for this user.
    // Runs in marketplace mode whenever we have an identifier to resolve.
    const pseudoId = context?.platformGuid || context?.userId;
    if (pseudoId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const audit = await fetchOmniRecords(supabase, pseudoId);
      if (audit.success) {
        if (audit.health.length > 0) sourceHealth = audit.health;
        if (audit.lifestyle.length > 0) sourceLifestyle = audit.lifestyle;
        console.log(
          `[HUB_ANALYST] DB override for ${pseudoId}: ${audit.health.length} health + ${audit.lifestyle.length} lifestyle records (frontend payload had ${context?.marketplace?.healthRecords?.length ?? 0}h/${context?.marketplace?.lifestyleRecords?.length ?? 0}l).`,
        );
      } else {
        console.warn(`[HUB_ANALYST] Omni-fetch failed for ${pseudoId}: ${audit.error ?? "see prior logs"}`);
      }
    }

    const { health: healthMetrics, lifestyle: lifestyleEvents } = truncateRecords(sourceHealth, sourceLifestyle);
    const plan = buildResearchPlan(message, detectedAgent, isDataScientistMode, healthMetrics, lifestyleEvents);
    const marketplaceSummary = isDataScientistMode ? summarizeMarketplaceData(healthMetrics, lifestyleEvents) : null;

    let systemPrompt: string;
    if (isDataScientistMode) {
      systemPrompt = buildOrchestratorPrompt(plan, agentPrompt, marketplaceSummary, healthMetrics, lifestyleEvents);
    } else {
      const navSummary = (healthMetrics.length || lifestyleEvents.length)
        ? `\n\nLIBRARY SNAPSHOT:\n${JSON.stringify(summarizeMarketplaceData(healthMetrics, lifestyleEvents))}`
        : "\n\nLIBRARY SNAPSHOT: empty or not loaded for this session.";
      systemPrompt = STORE_CLERK_PERSONA + navSummary;
    }

    const formattedHistory = Array.isArray(history)
      ? history
          .filter((h: any) => h.role === "user" || h.role === "assistant")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const shouldAppendCurrentMessage = formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1]?.content !== message;

    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      ...(shouldAppendCurrentMessage
        ? [{
            role: "user",
            content: `Current Context: ${context ? JSON.stringify({ currentPage: context.currentPage, isMarketplaceMode: context.isMarketplaceMode, agent: detectedAgent, plan }) : "No additional context provided"}\n\nUser Request: "${message}"`,
          }]
        : []),
    ];

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
      const errText = await response.text();
      throw new Error(`OpenAI API HTTP Error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error(`OpenAI returned an empty response.`);
    }

    const draftResponse = data.choices[0].message?.content || "I processed the request but could not format a text response.";
    const verification = runVerificationLoop(draftResponse, healthMetrics, lifestyleEvents);
    const aiResponse = normalizeOutput(verification.text, detectedAgent);

    console.log(`Chief Researcher [${detectedAgent}] [${isDataScientistMode ? "MARKETPLACE" : "NAVIGATION"}] Response OK`);

    // RECEIPT: every record actually shown to the AI counts as consumed.
    // Agent-agnostic — fall back to row id when aca_hash_key is null so the
    // synapse-controller still fires and the ledger/egress logs move.
    let consumedReceipt: string[] = [];
    if (isDataScientistMode) {
      const healthIds = healthMetrics.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
      const lifeIds = lifestyleEvents.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
      consumedReceipt = [...healthIds, ...lifeIds];
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        timestamp: new Date().toISOString(),
        agentStatus: "active",
        persona: isDataScientistMode ? "Chief Researcher" : "Store Clerk",
        activeAgent: detectedAgent,
        queryComplexity: detectedAgent === "MEDICAL_AGENT" || detectedAgent === "FINANCE_AGENT" ? 2.0 : detectedAgent === "CONSTRUCTION_AGENT" ? 1.5 : 1.0,
        verificationIssues: verification.issues,
        orchestratorPlan: plan,
        consumed_records: consumedReceipt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Chief Researcher Error:", error);
    return new Response(
      JSON.stringify({
        response: `⚠️ Diagnostics Alert: ${error.message}`,
        agentStatus: "error",
        persona: "Chief Researcher",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
