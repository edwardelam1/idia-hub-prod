import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BEST_FRIEND_PERSONA = `You are "Best Friend," a highly advanced AI search assistant designed to help users navigate the data ecosystem. Your persona is a blend of a trusted colleague and an expert data analyst. You are conversational, predictive, and maintain a consistently supportive and informal tone.

Your core directive is to act as an AI-assisted search engine. You receive natural language queries from users and provide insightful, accurate answers based STRICTLY on the database results and context provided to you. 

Always respond as Best Friend with efficiency, transparency, and supportive professionalism. Do not hallucinate or invent data; if you do not see it in your provided context, it does not exist in the database.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, marketplaceResults, history } = await req.json();

    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is missing from the Supabase Edge Function environment variables.");
    }

    // 1. Build the System Prompt
    let systemPrompt = `${BEST_FRIEND_PERSONA}

STRICT DATA POLICY: 
- DEFAULT MODE: You are strictly restricted to querying and responding to the user's context, platform knowledge, and the database metrics provided to you.
- MARKETPLACE RESTRICTION: If the user asks about the global marketplace or available bundles, you MUST refuse to provide specifics unless "NEW MARKETPLACE SEARCH RESULTS" are provided below, OR if you are answering a follow-up question about results found in the conversation history. Do not invent or summarize outside data.

INSTRUCTIONS:
1. If the user is just saying hello, testing, or chatting naturally, respond conversationally as Best Friend.
2. If the user asks a question about data, bundles, or their context, answer it clearly and concisely using ONLY the provided context and search results.
3. If the user is following up on a previous marketplace search (e.g., "drill into the apple one"), use the conversation history to answer them specifically.
4. If new marketplace results are provided, summarize them with signal-level insights ONLY. Do not expose raw data.
`;

    // 2. Append Marketplace Results to the System Prompt if they exist
    if (marketplaceResults && Array.isArray(marketplaceResults) && marketplaceResults.length > 0) {
      systemPrompt += `\n\nNEW MARKETPLACE SEARCH RESULTS (signal-level metadata only):
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

CRITICAL DATA ACCESS RULE: You must ONLY present signal-level metadata. NEVER return raw data records.`;
    }

    // 3. Format Conversation History for OpenAI
    // OpenAI strictly requires roles to be 'system', 'user', or 'assistant'.
    // We filter out any 'error' roles that might have been saved in the frontend state.
    const formattedHistory = Array.isArray(history)
      ? history
          .filter((h: any) => h.role === "user" || h.role === "assistant")
          .map((h: any) => ({
            role: h.role,
            content: h.content,
          }))
      : [];

    // 4. Construct the Final Messages Array
    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      {
        role: "user",
        content: `Current Context: ${context ? JSON.stringify(context) : "No additional context provided"}\n\nUser Request: "${message}"`,
      },
    ];

    // 5. Call the OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Change to "gpt-4o" if you need stronger reasoning
        messages: messages,
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
      throw new Error(`OpenAI returned an empty response. Response: ${JSON.stringify(data)}`);
    }

    const aiResponse =
      data.choices[0].message?.content || "I processed the request, but couldn't format a text response.";

    console.log("Best Friend AI Response Success via OpenAI");

    return new Response(
      JSON.stringify({
        response: aiResponse,
        timestamp: new Date().toISOString(),
        agentStatus: "active",
        persona: "Best Friend",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in Best Friend AI function:", error);

    return new Response(
      JSON.stringify({
        response: `⚠️ Diagnostics Alert: ${error.message}`,
        agentStatus: "error",
        persona: "Best Friend",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
