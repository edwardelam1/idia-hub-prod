import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STORE_CLERK_PERSONA = `You are "Best Friend," the IDIA platform's AI Store Clerk and Navigator. You help users understand what data bundles are available for purchase in the marketplace, navigate the platform, and answer general questions about their account and workspace.

You DO NOT have direct access to the underlying marketplace data. If a user asks for specific data insights, trends, statistics, or raw data, politely tell them you are in "Navigation Mode" and they need to toggle the "Marketplace Search" button (or type @search marketplace) so you can analyze the database for them. That action costs 1 Synapse Credit.

STRICT OPERATING INSTRUCTIONS:
1. NAVIGATE AND INFORM: You can tell the user what types of bundles exist, help them navigate the platform, or answer general questions about their account.
2. REFUSE DATA REQUESTS: If they ask for statistics, insights, trend analysis, or raw data, you must politely remind them to toggle "Marketplace Search" to authorize the query (1 CR per search).
3. CONVERSATIONAL: If they are just chatting normally, respond warmly and helpfully.
4. NEVER HALLUCINATE DATA: Do not invent statistics, percentages, or data insights. You do not have access to the database in this mode.`;

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

    let systemPrompt = isDataScientistMode ? "" : STORE_CLERK_PERSONA;

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

      // Biometric cost analysis from lifestyle events
      const biometricCost = lifestyleEvents.map((e: any) => ({
        type: e.event_type,
        category: e.event_category,
        duration: e.session_duration,
        quality: e.data_quality_score,
        context: e.activity_context,
      }));

      systemPrompt = `YOU ARE THE IDIA RAW DATA AUDITOR (OCCUPATIONAL ALPHA ENGINE).

PRIMARY DATA SOURCE: DIRECT STAGED TABLE INGESTION.
- HEALTH SAMPLES: ${audit.health_records} records.
- LIFESTYLE SESSIONS: ${audit.lifestyle_records} records.
- TOTAL SAMPLES: ${audit.total_samples}.
- TOTAL STEPS IN AUDIT: ${audit.step_volume}.
- PEAK HR DETECTED: ${audit.max_hr ?? "N/A"} BPM.
- HR BASELINE: ${audit.hr_baseline ?? "N/A"} BPM.
- DATA TRUST SCORE (avg quality): ${audit.avg_quality ?? "N/A"}.

TASK:
1. Perform a direct review of the provided health and lifestyle data tables below.
2. Execute BIO-AI.9.6: Calculate the "Work Load Biometric Cost" for the user by analyzing the intersection of physiological data (heart rate, steps, calories, duration) and lifestyle activity logs (session durations, activity contexts, event types).
3. Determine "Personal Alpha" readiness by reviewing raw heart rate volatility and session durations.
4. Provide an objective audit of data veracity and reliability.
5. Focus ONLY on the raw physiological and lifestyle logs provided. Use the ACTUAL numbers from the data below — do NOT invent statistics.
6. Present signal-level metadata and aggregated statistics. NEVER return raw data records verbatim. Raw data access requires Enterprise T1P clearance.

FULL HEALTH TABLE DATA (compact JSON):
${JSON.stringify(healthMetrics)}

BIOMETRIC COST ANALYSIS (lifestyle sessions):
${JSON.stringify(biometricCost)}`;

      // Append marketplace bundle metadata if available
      if (marketplaceResults && Array.isArray(marketplaceResults) && marketplaceResults.length > 0) {
        systemPrompt += `\n\nMARKETPLACE BUNDLE METADATA:\n${JSON.stringify(marketplaceResults.map((b: any) => ({
          title: b.title, category: b.category, tier: b.tier, price: b.price, participant_count: b.participant_count, features: b.features,
        })))}`;
      }

      if (audit.total_samples === 0 && (!marketplaceResults || marketplaceResults.length === 0)) {
        systemPrompt += `\n\nNO PIPELINE DATA AVAILABLE: The query returned no staged data. Inform the user that no health or lifestyle data has been processed yet, and suggest they connect their devices via IDIA Life to start generating pipeline data.`;
      }
    }

    // Format conversation history
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
        content: `Current Context: ${context ? JSON.stringify({ currentPage: context.currentPage, isMarketplaceMode: context.isMarketplaceMode }) : "No additional context provided"}\n\nUser Request: "${message}"`,
      },
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

    const aiResponse = data.choices[0].message?.content || "I processed the request, but couldn't format a text response.";

    console.log(`Best Friend AI [${isDataScientistMode ? "RAW_DATA_AUDITOR" : "STORE_CLERK"}] Response Success`);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        timestamp: new Date().toISOString(),
        agentStatus: "active",
        persona: isDataScientistMode ? "Raw Data Auditor" : "Store Clerk",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in Best Friend AI function:", error);
    return new Response(
      JSON.stringify({
        response: `⚠️ Diagnostics Alert: ${error.message}`,
        agentStatus: "error",
        persona: "Best Friend",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
