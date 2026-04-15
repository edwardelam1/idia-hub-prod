import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── BANNED LEXICON & LINGUISTIC GOVERNANCE ────────────────────────────────────
const BANNED_WORDS = [
  "unleash", "dive into", "game-changing", "revolutionary", "transformative",
  "leverage", "unlock potential", "dive deeper", "delve", "synergy",
];

function applyLinguisticGovernance(text: string): string {
  let cleaned = text;
  // Strip banned phrases (case-insensitive)
  for (const phrase of BANNED_WORDS) {
    const re = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(re, "");
  }
  // Remove semicolons and em dashes
  cleaned = cleaned.replace(/;/g, ".").replace(/—/g, ",");
  // Collapse double spaces
  cleaned = cleaned.replace(/ {2,}/g, " ").trim();
  return cleaned;
}

// ─── INTENT-BASED ROUTING ──────────────────────────────────────────────────────
type AgentType = "MEDICAL_AGENT" | "CONSTRUCTION_AGENT" | "FINANCE_AGENT" | "GENERAL_NAVIGATOR";

function routeIntent(message: string): AgentType {
  if (/\b(heart|medical|health|clinical|diagnosis|symptom|treatment|patient|drug|pharma)\b/i.test(message)) return "MEDICAL_AGENT";
  if (/\b(cost|permits?|construction|steel|concrete|labor|ENR|building)\b/i.test(message)) return "CONSTRUCTION_AGENT";
  if (/\b(market|sales|CLV|revenue|SEC|filing|stock|portfolio|RFM)\b/i.test(message)) return "FINANCE_AGENT";
  return "GENERAL_NAVIGATOR";
}

// ─── ORCHESTRATOR SYSTEM PROMPT ────────────────────────────────────────────────
const ORCHESTRATOR_PROMPT = `You are the IDIA Chief Researcher. Your role is strategic navigation and research coordination.

STRICT LANGUAGE RULES:
- Use simple vocabulary. Short sentences. Max 20 words per sentence.
- Start sentences with "And," "But," or "So" when it fits naturally.
- Never use semicolons or em dashes.
- Never use these words: unleash, dive into, game-changing, revolutionary, transformative, leverage, unlock potential, dive deeper, delve, synergy.
- Every numeric claim must include its source.

OPERATIONAL PROTOCOL:
1. DECOMPOSE the user query into a research plan.
2. ROUTE to the correct domain agent (Medical, Construction, Finance, or General).
3. VERIFY all outputs. Never report a number without a citation.
4. Present findings clearly. Use bullet points for lists.

If you detect a domain you cannot serve yet, say so plainly. Do not fabricate expertise.`;

// ─── STORE CLERK (NON-MARKETPLACE) ─────────────────────────────────────────────
const STORE_CLERK_PERSONA = `You are "Best Friend," the IDIA platform's AI Store Clerk and Navigator.

LANGUAGE RULES:
- Simple vocabulary. Short sentences. Max 20 words per sentence.
- Never use: unleash, dive into, game-changing, revolutionary, transformative, leverage, unlock potential, dive deeper.
- No semicolons. No em dashes.

OPERATING INSTRUCTIONS:
1. Help users understand data bundles and navigate the platform.
2. If they ask for statistics or raw data, tell them to toggle "Marketplace Mode" (1 CR).
3. Be warm and helpful in conversation.
4. Never invent data or statistics.`;

// ─── DOMAIN AGENT STUBS (placeholders for future build-out) ────────────────────
const MEDICAL_AGENT_STUB = `You are the IDIA Medical Evidence Synthesis Agent.
Framework: PICOTSS (Population, Intervention, Comparison, Outcome, Time, Setting, Study Design).
Search Logic: Prioritize MeSH terms over natural language.
Source Hierarchy: 1. Meta-analyses 2. Clinical Trials 3. CDC Knowledgebases.
IMPORTANT: You are a research assistant. You do not diagnose. Every response must end with: "⚠️ Audit Required: This output is for research purposes only."`;

const CONSTRUCTION_AGENT_STUB = `You are the IDIA Built-Environment Research Agent.
Framework: ENR Indexing.
Logic: Differentiate between BCI (skilled labor) and CCI (common labor).
Task: Cross-reference US Census BPS data against localized municipal permit logs.
IMPORTANT: Every cost estimate must cite its index source and date.`;

const FINANCE_AGENT_STUB = `You are the IDIA Financial/Market Research Agent.
Framework: RFM and CLV Analysis.
Logic: Execute Exploratory Data Analysis on raw payloads.
Task: Isolate forward-looking statements from SEC filings and cross-reference with sentiment clusters.
IMPORTANT: Every financial projection must end with: "⚠️ Audit Required: Not investment advice."`;

function getAgentPrompt(agent: AgentType): string {
  switch (agent) {
    case "MEDICAL_AGENT": return MEDICAL_AGENT_STUB;
    case "CONSTRUCTION_AGENT": return CONSTRUCTION_AGENT_STUB;
    case "FINANCE_AGENT": return FINANCE_AGENT_STUB;
    default: return "";
  }
}

// ─── DATA TRUNCATION ───────────────────────────────────────────────────────────
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

// ─── PII REDACTION ─────────────────────────────────────────────────────────────
function redactPII(text: string): string {
  // Email
  let cleaned = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
  // Phone numbers (US patterns)
  cleaned = cleaned.replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[PHONE_REDACTED]");
  // SSN patterns
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  return cleaned;
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, marketplaceResults, history } = await req.json();

    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is missing from the Supabase Edge Function environment variables.");
    }

    const isDataScientistMode = context?.isMarketplaceMode === true;

    // ── Step 1: Intent Triage ──────────────────────────────────────────────────
    const detectedAgent = routeIntent(message);
    const agentPrompt = getAgentPrompt(detectedAgent);

    // ── Step 2: Build System Prompt ────────────────────────────────────────────
    let systemPrompt: string;

    if (isDataScientistMode) {
      const rawHealth: any[] = context?.realPipelineData ?? [];
      const rawLifestyle: any[] = context?.realLifestyleData ?? [];
      const { health: healthMetrics, lifestyle: lifestyleEvents } = truncateRecords(rawHealth, rawLifestyle);

      // Compute audit metrics
      const hrValues = healthMetrics.map((r: any) => r.average_heartrate).filter((v: any) => v != null);
      const audit = {
        total_samples: healthMetrics.length + lifestyleEvents.length,
        health_records: healthMetrics.length,
        lifestyle_records: lifestyleEvents.length,
        hr_baseline: hrValues.length > 0 ? Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length) : null,
        max_hr: hrValues.length > 0 ? Math.max(...hrValues) : null,
        step_volume: healthMetrics.reduce((acc: number, r: any) => acc + (r.steps_count || 0), 0),
        avg_quality: healthMetrics.length > 0
          ? +(healthMetrics.reduce((acc: number, r: any) => acc + (r.data_quality_score || 0), 0) / healthMetrics.length).toFixed(3)
          : null,
      };

      const biometricCost = lifestyleEvents.map((e: any) => ({
        type: e.event_type,
        category: e.event_category,
        duration: e.session_duration,
        quality: e.data_quality_score,
        context: e.activity_context,
      }));

      // Orchestrator + domain agent layered prompt
      systemPrompt = `${ORCHESTRATOR_PROMPT}

ACTIVE DOMAIN AGENT: ${detectedAgent}
${agentPrompt ? `\nDOMAIN-SPECIFIC INSTRUCTIONS:\n${agentPrompt}` : ""}

PRIMARY DATA SOURCE: DIRECT STAGED TABLE INGESTION.
- HEALTH SAMPLES: ${audit.health_records} records.
- LIFESTYLE SESSIONS: ${audit.lifestyle_records} records.
- TOTAL SAMPLES: ${audit.total_samples}.
- TOTAL STEPS IN AUDIT: ${audit.step_volume}.
- PEAK HR DETECTED: ${audit.max_hr ?? "N/A"} BPM.
- HR BASELINE: ${audit.hr_baseline ?? "N/A"} BPM.
- DATA TRUST SCORE (avg quality): ${audit.avg_quality ?? "N/A"}.

TASK:
1. Review the provided health and lifestyle data tables.
2. Execute BIO-AI.9.6: Calculate "Work Load Biometric Cost" from the intersection of physiological and lifestyle data.
3. Determine "Personal Alpha" readiness from heart rate volatility and session durations.
4. Provide an objective audit of data veracity and reliability.
5. Use ONLY the actual numbers from the data below. Do NOT invent statistics.
6. Present signal-level metadata and aggregated statistics. NEVER return raw data records verbatim.

FULL HEALTH TABLE DATA (compact JSON):
${JSON.stringify(healthMetrics)}

BIOMETRIC COST ANALYSIS (lifestyle sessions):
${JSON.stringify(biometricCost)}`;

      if (marketplaceResults && Array.isArray(marketplaceResults) && marketplaceResults.length > 0) {
        systemPrompt += `\n\nMARKETPLACE BUNDLE METADATA:\n${JSON.stringify(marketplaceResults.map((b: any) => ({
          title: b.title, category: b.category, tier: b.tier, price: b.price, participant_count: b.participant_count, features: b.features,
        })))}`;
      }

      if (audit.total_samples === 0 && (!marketplaceResults || marketplaceResults.length === 0)) {
        systemPrompt += `\n\nNO PIPELINE DATA AVAILABLE: The query returned no staged data. Tell the user that no health or lifestyle data has been processed yet. Suggest they connect devices via IDIA Life.`;
      }
    } else {
      systemPrompt = STORE_CLERK_PERSONA;
    }

    // ── Step 3: Format History ─────────────────────────────────────────────────
    const formattedHistory = Array.isArray(history)
      ? history
          .filter((h: any) => h.role === "user" || h.role === "assistant")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      {
        role: "user",
        content: `Current Context: ${context ? JSON.stringify({ currentPage: context.currentPage, isMarketplaceMode: context.isMarketplaceMode, agent: detectedAgent }) : "No additional context provided"}\n\nUser Request: "${message}"`,
      },
    ];

    // ── Step 4: Call OpenAI ────────────────────────────────────────────────────
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

    let aiResponse = data.choices[0].message?.content || "I processed the request but could not format a text response.";

    // ── Step 5: Governance Filters ─────────────────────────────────────────────
    aiResponse = applyLinguisticGovernance(aiResponse);
    aiResponse = redactPII(aiResponse);

    // Add mandatory audit footer for high-stakes domains
    if (detectedAgent === "MEDICAL_AGENT" && !aiResponse.includes("Audit Required")) {
      aiResponse += "\n\n⚠️ Audit Required: This output is for research purposes only.";
    }
    if (detectedAgent === "FINANCE_AGENT" && !aiResponse.includes("Audit Required")) {
      aiResponse += "\n\n⚠️ Audit Required: Not investment advice.";
    }

    console.log(`Chief Researcher [${detectedAgent}] [${isDataScientistMode ? "MARKETPLACE" : "NAVIGATION"}] Response OK`);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        timestamp: new Date().toISOString(),
        agentStatus: "active",
        persona: isDataScientistMode ? "Chief Researcher" : "Store Clerk",
        activeAgent: detectedAgent,
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
