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
    prompt: `You are the IDIA Medical Evidence Synthesis Agent.
Framework: PICOTSS.
Source hierarchy: meta-analyses, clinical trials, CDC, NIH.
Do not diagnose. Use research framing only.` ,
    highStakes: true,
    verificationChecks: ["Require cited numeric claims", "Avoid diagnosis", "Flag uncertain medical evidence"],
  },
  CONSTRUCTION_AGENT: {
    prompt: `You are the IDIA Built-Environment Research Agent.
Framework: ENR indexing and local permit comparison.
Separate BCI from CCI cost logic.` ,
    highStakes: false,
    verificationChecks: ["Require cited cost figures", "Separate index source from local observation"],
  },
  FINANCE_AGENT: {
    prompt: `You are the IDIA Financial and Market Research Agent.
Framework: RFM, CLV, SEC filing review, and sentiment cross-checking.
Do not provide investment advice.` ,
    highStakes: true,
    verificationChecks: ["Require cited numeric claims", "Flag forward-looking statements", "Avoid investment advice"],
  },
  GENERAL_NAVIGATOR: {
    prompt: `You are the IDIA General Navigator.
Help the user understand the platform, research limits, and next best step.` ,
    highStakes: false,
    verificationChecks: ["Keep guidance concrete", "Do not invent unavailable data"],
  },
};

const ORCHESTRATOR_PROMPT = `You are the IDIA Chief Researcher Orchestrator.

You do not behave like a single prompt blob.
You work in stages.
Stage 1: Triage the intent.
Stage 2: Decompose the research task.
Stage 3: Select the correct agent.
Stage 4: Draft a response from available evidence only.
Stage 5: Prepare the draft for verification.

Language rules:
- Use simple vocabulary.
- Keep sentences short.
- No semicolons.
- No em dashes.
- Avoid hype.
- Use "And," "But," or "So," only when it feels natural.
- If you cite a number, include a source marker in the same sentence.

Never invent evidence.
Never claim domain certainty when the agent is still a stub.
If the evidence is thin, say so plainly.`;

const STORE_CLERK_PERSONA = `You are Best Friend, the IDIA platform guide.
Help users navigate the product.
If they need raw data or research mode, tell them to use Marketplace Mode.
Keep it warm, plain, and brief.`;

function applyLinguisticGovernance(text: string): string {
  let cleaned = text;
  for (const phrase of BANNED_WORDS) {
    const re = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(re, "");
  }
  cleaned = cleaned.replace(/;/g, ".").replace(/—/g, ",");
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

function buildResearchPlan(message: string, agent: AgentType, isMarketplaceMode: boolean, healthRecords: any[], lifestyleRecords: any[]): ResearchPlan {
  const recordCount = healthRecords.length + lifestyleRecords.length;
  const dataAvailability = recordCount === 0 ? "none" : recordCount < 10 ? "limited" : "available";
  const outputMode = isMarketplaceMode ? "research" : "navigation";
  const defaultObjectives = isMarketplaceMode
    ? [
        "Summarize what evidence is available",
        "State the main signal without inventing data",
        "Flag gaps or weak evidence",
      ]
    : [
        "Answer the product question clearly",
        "Point to the next action in the app",
      ];

  const agentObjectives: Record<AgentType, string[]> = {
    MEDICAL_AGENT: ["Frame the question with PICOTSS", "Separate evidence from inference", ...defaultObjectives],
    CONSTRUCTION_AGENT: ["Separate index logic from local signal", "Clarify scope and basis", ...defaultObjectives],
    FINANCE_AGENT: ["Separate reported facts from projections", "Flag forward-looking risk", ...defaultObjectives],
    GENERAL_NAVIGATOR: defaultObjectives,
  };

  return {
    agent,
    outputMode,
    highStakes: AGENT_REGISTRY[agent].highStakes,
    dataAvailability,
    intentSummary: message.slice(0, 240),
    objectives: agentObjectives[agent],
    evidenceNeeds: [
      "Every numeric claim needs a source marker",
      "Use only available staged data or cited external evidence",
      "State uncertainty plainly when evidence is thin",
    ],
    verificationChecks: AGENT_REGISTRY[agent].verificationChecks,
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
- Follow the plan in order.
- Do not skip uncertainty.
- If you mention a number, add a source marker in the same sentence.
- If data is missing, say that directly.
- For stub agents, stay at framework level unless evidence is present.

${compactData}`;
}

function runVerificationLoop(draft: string): VerificationResult {
  const issues: string[] = [];
  const verifiedText = splitIntoSentences(draft)
    .map((sentence) => {
      if (/\d/.test(sentence) && !hasCitationMarker(sentence)) {
        issues.push(`Numeric claim lacked citation: ${sentence}`);
        return "This numeric point may matter, but it still needs a cited source.";
      }
      return sentence;
    })
    .join(" ");

  return { text: verifiedText, issues };
}

function enforceAuditFooter(text: string, agent: AgentType): string {
  if (agent === "MEDICAL_AGENT" && !text.includes("Audit Required")) {
    return `${text}\n\n⚠️ Audit Required: This output is for research purposes only.`;
  }

  if (agent === "FINANCE_AGENT" && !text.includes("Audit Required")) {
    return `${text}\n\n⚠️ Audit Required: Not investment advice.`;
  }

  return text;
}

function normalizeOutput(text: string, agent: AgentType): string {
  let cleaned = applyLinguisticGovernance(text);
  cleaned = shortenLongSentences(cleaned);
  cleaned = redactPII(cleaned);
  cleaned = enforceAuditFooter(cleaned, agent);
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
    const rawHealth = context?.marketplace?.healthRecords ?? [];
    const rawLifestyle = context?.marketplace?.lifestyleRecords ?? [];
    const { health: healthMetrics, lifestyle: lifestyleEvents } = truncateRecords(rawHealth, rawLifestyle);
    const plan = buildResearchPlan(message, detectedAgent, isDataScientistMode, healthMetrics, lifestyleEvents);
    const marketplaceSummary = isDataScientistMode ? summarizeMarketplaceData(healthMetrics, lifestyleEvents) : null;

    let systemPrompt: string;
    if (isDataScientistMode) {
      systemPrompt = buildOrchestratorPrompt(plan, agentPrompt, marketplaceSummary, healthMetrics, lifestyleEvents);
    } else {
      systemPrompt = STORE_CLERK_PERSONA;
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
    const verification = runVerificationLoop(draftResponse);
    const aiResponse = normalizeOutput(verification.text, detectedAgent);

    console.log(`Chief Researcher [${detectedAgent}] [${isDataScientistMode ? "MARKETPLACE" : "NAVIGATION"}] Response OK`);

    // RECEIPT: which ACA records did the AI actually consume?
    let consumedReceipt: string[] = [];
    if (isDataScientistMode) {
      if (detectedAgent === "MEDICAL_AGENT" && healthMetrics.length > 0) {
        consumedReceipt = healthMetrics.map((r: any) => r.aca_hash_key).filter(Boolean);
      } else if ((detectedAgent === "CONSTRUCTION_AGENT" || detectedAgent === "FINANCE_AGENT") && lifestyleEvents.length > 0) {
        consumedReceipt = lifestyleEvents.map((r: any) => r.aca_hash_key).filter(Boolean);
      }
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
