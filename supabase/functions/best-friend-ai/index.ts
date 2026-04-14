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

You have direct access to LIVE pipeline data and marketplace bundle metadata provided below. Your job is to synthesize actionable, data-driven insights from REAL data.

STRICT OPERATING INSTRUCTIONS:
1. DELIVER INSIGHTS, NOT MENUS: NEVER just read off a list of "available bundles." You are a Data Scientist answering their question with synthesized analysis.
2. USE REAL DATA: When pipeline data is provided, use the ACTUAL numbers (real step counts, heart rates, activity types, lifestyle events). Do NOT invent fake statistics when real data is available.
3. SYNTHESIZE: Combine pipeline data with marketplace context to provide comprehensive analysis.
4. ACT AUTHORITATIVE: Give them the insights directly without hesitation. You are the expert.
5. SIGNAL-LEVEL ONLY: Present signal-level metadata and aggregated statistics. NEVER return raw data records. Raw data access requires Enterprise T1P clearance.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, marketplaceResults, history } = await req.json();

    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is missing from the Supabase Edge Function environment variables.");
    }

    // Determine active mode from the UI toggle flag
    const isDataScientistMode = context?.isMarketplaceMode === true;

    // Build system prompt based on persona
    let systemPrompt = isDataScientistMode ? DATA_SCIENTIST_PERSONA : STORE_CLERK_PERSONA;

    // Append real pipeline data and marketplace results for Data Scientist mode
    if (isDataScientistMode) {
      // Inject real pipeline data (health + lifestyle)
      const realPipelineData = context?.realPipelineData;
      const realLifestyleData = context?.realLifestyleData;

      if (realPipelineData && Array.isArray(realPipelineData) && realPipelineData.length > 0) {
        // Aggregate health stats
        const steps = realPipelineData.filter((r: any) => r.steps_count != null);
        const heartRates = realPipelineData.filter((r: any) => r.average_heartrate != null);
        const bloodOx = realPipelineData.filter((r: any) => r.blood_oxygen_saturation != null);
        const activities = realPipelineData.map((r: any) => r.activity_type).filter(Boolean);
        const activityDist: Record<string, number> = {};
        activities.forEach((a: string) => { activityDist[a] = (activityDist[a] || 0) + 1; });

        const avgSteps = steps.length > 0
          ? Math.round(steps.reduce((s: number, r: any) => s + (r.steps_count || 0), 0) / steps.length)
          : null;
        const avgHR = heartRates.length > 0
          ? Math.round(heartRates.reduce((s: number, r: any) => s + (r.average_heartrate || 0), 0) / heartRates.length)
          : null;
        const avgSpO2 = bloodOx.length > 0
          ? (bloodOx.reduce((s: number, r: any) => s + (r.blood_oxygen_saturation || 0), 0) / bloodOx.length).toFixed(1)
          : null;

        systemPrompt += `\n\nLIVE HEALTH PIPELINE DATA (${realPipelineData.length} records):
- Average Steps: ${avgSteps ?? 'N/A'}
- Average Heart Rate: ${avgHR ?? 'N/A'} bpm
- Average SpO2: ${avgSpO2 ?? 'N/A'}%
- Activity Distribution: ${JSON.stringify(activityDist)}
- Records with step data: ${steps.length}
- Records with heart rate: ${heartRates.length}
- Records with blood oxygen: ${bloodOx.length}`;
      }

      if (realLifestyleData && Array.isArray(realLifestyleData) && realLifestyleData.length > 0) {
        const eventTypes = realLifestyleData.map((r: any) => r.event_type).filter(Boolean);
        const eventDist: Record<string, number> = {};
        eventTypes.forEach((e: string) => { eventDist[e] = (eventDist[e] || 0) + 1; });
        const categories = realLifestyleData.map((r: any) => r.event_category).filter(Boolean);
        const catDist: Record<string, number> = {};
        categories.forEach((c: string) => { catDist[c] = (catDist[c] || 0) + 1; });

        systemPrompt += `\n\nLIVE LIFESTYLE PIPELINE DATA (${realLifestyleData.length} records):
- Event Type Distribution: ${JSON.stringify(eventDist)}
- Category Distribution: ${JSON.stringify(catDist)}`;
      }

      // Append marketplace bundle metadata
      if (marketplaceResults && Array.isArray(marketplaceResults) && marketplaceResults.length > 0) {
        systemPrompt += `\n\nMARKETPLACE BUNDLE METADATA:
${JSON.stringify(
  marketplaceResults.map((b: any) => ({
    title: b.title,
    category: b.category,
    tier: b.tier,
    price: b.price,
    record_count: b.record_count,
    features: b.features,
  })),
  null,
  2,
)}`;
      }

      // Fallback if no data at all
      if ((!realPipelineData || realPipelineData.length === 0) && 
          (!realLifestyleData || realLifestyleData.length === 0) &&
          (!marketplaceResults || marketplaceResults.length === 0)) {
        systemPrompt += `\n\nNO PIPELINE DATA AVAILABLE: The query returned no staged data. Inform the user that no health or lifestyle data has been processed yet, and suggest they connect their devices via IDIA Life to start generating pipeline data.`;
      }

      systemPrompt += `\n\nCRITICAL DATA ACCESS RULE: Present signal-level metadata ONLY. NEVER return raw data records.`;
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
