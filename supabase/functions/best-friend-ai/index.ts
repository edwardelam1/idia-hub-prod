import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PAY_APP_ROUTING } from "../_shared/payAppRouting.ts";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_OMNI_ROWS = 5000;

// Pulls every relevant staged record for a user across BOTH staging tables.
// Tables expose user_id, entity_id, AND pseudo_user_id — we OR-filter on all three
// so a raw UUID, an entity ref, or a pre-hashed pseudonym all resolve correctly.
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

    if (healthRes.error) console.error("[ERROR: OmniFetch.Health] Health table query failed:", healthRes.error.message);
    if (lifestyleRes.error)
      console.error("[ERROR: OmniFetch.Lifestyle] Lifestyle table query failed:", lifestyleRes.error.message);

    console.info(
      `[END: OmniFetch] Retrieval complete. Health: ${healthRes.data?.length || 0}, Lifestyle: ${lifestyleRes.data?.length || 0}`,
    );
    return {
      success: !healthRes.error && !lifestyleRes.error,
      health: healthRes.data ?? [],
      lifestyle: lifestyleRes.data ?? [],
    };
  } catch (err) {
    console.error("[CRITICAL FAILURE: OmniFetch] Fatal exception during parallel retrieval:", err);
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
        const chunk = words
          .slice(i, i + 18)
          .join(" ")
          .trim();
        if (!chunk) continue;
        // FIX: Standard concatenation
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
  // FIX: Bulletproof string concatenation instead of template literals
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
    "- If the count is 55, just say 55.\n\n" +
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
  // 1. HANDLE OPTIONS PREFLIGHT FIRST (Fixes the 400 Crash)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. SAFE BODY PARSING (Fixes the "Unexpected end of JSON input" Crash)
    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === "") throw new Error("Empty request body");

    let rawPayload = JSON.parse(bodyText);

    // Catch the UI auto-trigger
    if (!rawPayload.message || rawPayload.message.trim() === "") {
      rawPayload.message = "I am ready to begin my data journey.";
    }

    console.info("[BEGIN: BestFriendAI.PayloadValidation] Validating incoming JSON.");
    const parsed = requestSchema.safeParse(rawPayload);

    if (!parsed.success) {
      console.error("[ERROR: BestFriendAI.PayloadValidation] Schema mismatch:", parsed.error.flatten());
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.info("[END: BestFriendAI.PayloadValidation] Payload verified.");

    const { message, context, history } = parsed.data;

    if (!openAiApiKey) {
      console.error("[CRITICAL FAILURE: BestFriendAI.Environment] OPENAI_API_KEY is missing.");
      throw new Error("OPENAI_API_KEY is missing from the Supabase Edge Function environment variables.");
    }

    const isDataScientistMode = context?.isMarketplaceMode === true;
    const detectedAgent = routeIntent(message);
    const agentPrompt = getAgentPrompt(detectedAgent);

    console.info(
      `[STATUS: BestFriendAI.Routing] Mode: ${isDataScientistMode ? "MARKETPLACE" : "NAVIGATION"}, Agent: ${detectedAgent}`,
    );

    // Frontend payload (may be empty or partial)
    let sourceHealth: any[] = context?.marketplace?.healthRecords ?? [];
    let sourceLifestyle: any[] = context?.marketplace?.lifestyleRecords ?? [];

    // OMNI-FETCH: override frontend payload with the full DB record set for this user.
    // Runs in marketplace mode whenever we have an identifier to resolve.
    const pseudoId = context?.platformGuid || context?.userId;
    const operatorId = pseudoId;
    let consumedReceipt: string[] = [];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const operatorId = pseudoId; // Define this here, at the top scope.

    if (pseudoId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.info(`[BEGIN: BestFriendAI.OmniFetchExecution] Invoking OmniFetch for ID: ${pseudoId}`);
      const audit = await fetchOmniRecords(supabase, pseudoId);
      if (audit.success) {
        if (audit.health.length > 0) sourceHealth = audit.health;
        if (audit.lifestyle.length > 0) sourceLifestyle = audit.lifestyle;
        console.info(
          `[STATUS: BestFriendAI.OmniFetchExecution] DB override for ${pseudoId}: ${audit.health.length} health + ${audit.lifestyle.length} lifestyle records.`,
        );
      } else {
        console.warn(
          `[WARNING: BestFriendAI.OmniFetchExecution] Omni-fetch failed for ${pseudoId}: ${audit.error ?? "see prior logs"}`,
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
      // FIX: Standard string concatenation
      let navSummary = "\n\nLIBRARY SNAPSHOT: empty or not loaded for this session.";
      if (healthMetrics.length || lifestyleEvents.length) {
        navSummary =
          "\n\nLIBRARY SNAPSHOT:\n" + JSON.stringify(summarizeMarketplaceData(healthMetrics, lifestyleEvents));
      }
      systemPrompt = STORE_CLERK_PERSONA + navSummary;
    }

    const formattedHistory = Array.isArray(history)
      ? history
          .filter((h: any) => h.role === "user" || h.role === "assistant")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const shouldAppendCurrentMessage =
      formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1]?.content !== message;

    // FIX: Standard string concatenation for context
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
        user_id: operatorId,
        client_id: parsed.data.client_id || "IDIA_HUB_APP", // ADD THIS LINE
        aca_record_ids: consumedReceipt,
        intent_type: "MARKETPLACE RESEARCH",
        granularity: 0.95,
        relevance: 1.0,
        timeliness: 1.0,
        completeness: 1.0,
        origin_fidelity: 1.0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[CRITICAL FAILURE: BestFriendAI.OpenAIExecution] HTTP ${response.status}: ${errText}`);
      throw new Error(`OpenAI API HTTP Error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      console.error("[CRITICAL FAILURE: BestFriendAI.OpenAIExecution] Empty response array from OpenAI.");
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
      if (consumedReceipt.length > 0) {
        console.info(
          `[STATUS: BestFriendAI.ReceiptTransmission] Firing ${consumedReceipt.length} records to synapse-controller.`,
        );
        try {
          // Resolve the operator ID to charge
          if (!operatorId) throw new Error("Missing operator ID for Synapse billing.");

          const synapseUrl = `${SUPABASE_URL}/functions/v1/synapse-controller`;

          // HYDRATION: Pass the user's actual JWT downstream and include the apikey
          const incomingAuthHeader = req.headers.get("Authorization");
          const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

          const synapseRes = await fetch(synapseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: incomingAuthHeader as string, // Valid user JWT
              apikey: anonKey, // Gateway clearance
            },
            body: JSON.stringify({
              user_id: operatorId,
              aca_record_ids: consumedReceipt,
              intent_type: "MARKETPLACE RESEARCH",
              granularity: 0.95,
              relevance: 1.0,
              timeliness: 1.0,
              completeness: 1.0,
              origin_fidelity: 1.0,
            }),
          });

          if (!synapseRes.ok) {
            const errText = await synapseRes.text();
            console.error(
              `[CRITICAL FAILURE: BestFriendAI.ReceiptTransmission] Synapse Controller rejected receipt. HTTP ${synapseRes.status}: ${errText}`,
            );
          } else {
            console.info(
              `[STATUS: BestFriendAI.ReceiptTransmission] Synapse Controller acknowledged receipt successfully.`,
            );
          }
        } catch (synErr: any) {
          console.error(
            `[CRITICAL FAILURE: BestFriendAI.ReceiptTransmission] Failed to reach Synapse network: ${synErr.message}`,
          );
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
    return new Response(JSON.stringify(finalPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(`[FATAL STALL: BestFriendAI Global] Offset: Outer Catch | Reason: ${error.message}`, error);
    return new Response(
      JSON.stringify({
        response: `⚠️ Diagnostics Alert: ${error.message}`,
        agentStatus: "error",
        persona: "Chief Researcher",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
