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

const DATA_SCIENTIST_PERSONA = `You are "Best Friend," a highly advanced AI data analyst and expert data scientist for the IDIA ecosystem. The user has authorized a deep database query by toggling Marketplace Search (1 Synapse Credit deducted).

You have direct access to the marketplace database results provided below (if any). Your job is to synthesize actionable, data-driven insights.

STRICT OPERATING INSTRUCTIONS:
1. DELIVER INSIGHTS, NOT MENUS: NEVER just read off a list of "available bundles." You are a Data Scientist answering their question with synthesized analysis.
2. SYNTHESIZE DATA: Use the features, categories, and metadata in the search results (or general IDIA ecosystem knowledge if results are empty) to craft a highly realistic, data-driven answer to the user's prompt.
3. SIMULATE METRICS: Simulate realistic statistics, percentages, and insights (e.g., "Based on the Apple HealthKit Vitals data, we are seeing a 12% variance...") to provide a valuable demonstration of the platform's analytical capabilities.
4. ACT AUTHORITATIVE: Give them the insights directly without hesitation. You are the expert.
5. SIGNAL-LEVEL ONLY: Present signal-level metadata (bundle names, categories, record counts, pricing, compliance tags). NEVER return raw data records. Raw data access requires Enterprise T1P clearance.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, marketplaceResults, history } = await req.json();

    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is missing from the Supabase Edge Function environment variables.");
    }

    // Determine active mode from the UI toggle flag, NOT from results array length
    const isDataScientistMode = context?.isMarketplaceMode === true;

    // Build system prompt based on persona
    let systemPrompt = isDataScientistMode ? DATA_SCIENTIST_PERSONA : STORE_CLERK_PERSONA;

    // Append marketplace results or fallback for Data Scientist mode
    if (isDataScientistMode) {
      if (marketplaceResults && Array.isArray(marketplaceResults) && marketplaceResults.length > 0) {
        systemPrompt += `\n\nMARKETPLACE SEARCH RESULTS (Use these themes/features to synthesize your data answer):
${JSON.stringify(
  marketplaceResults.map((b: any) => ({
    title: b.title,
    category: b.category,
    tier: b.tier,
    price: b.price,
    features: b.features,
  })),
  null,
  2,
)}

CRITICAL DATA ACCESS RULE: Present signal-level metadata ONLY. NEVER return raw data records.`;
      } else {
        systemPrompt += `\n\nMARKETPLACE SEARCH RESULTS: The user's query was broad and did not match specific bundles. Synthesize insights based on the general IDIA ecosystem data categories: HealthKit vitals (heart rate, steps, sleep), Urban Flow location analytics, Activity movement data, POS Transaction intelligence, and Lifestyle behavioral patterns. Provide realistic simulated metrics.`;
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
        content: `Current Context: ${context ? JSON.stringify(context) : "No additional context provided"}\n\nUser Request: "${message}"`,
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
        temperature: 0.7,
        max_tokens: 2048,
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

    console.log(`Best Friend AI [${isDataScientistMode ? "DATA_SCIENTIST" : "STORE_CLERK"}] Response Success`);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        timestamp: new Date().toISOString(),
        agentStatus: "active",
        persona: isDataScientistMode ? "Data Scientist" : "Store Clerk",
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
