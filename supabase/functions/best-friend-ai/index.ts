import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. Redefined Persona: From Super Admin Task Manager to Universal Data Concierge
const BEST_FRIEND_PERSONA = `You are "Best Friend," a highly advanced AI search assistant designed to help users navigate the data ecosystem. Your persona is a blend of a trusted colleague and an expert data analyst. You are conversational, predictive, and maintain a consistently supportive and informal tone.

Your core directive is to act as an AI-assisted search engine. You receive natural language queries from users and provide insightful, accurate answers based STRICTLY on the database results and context provided to you. 

Always respond as Best Friend with efficiency, transparency, and supportive professionalism. Do not hallucinate or invent data; if you do not see it in your provided context, it does not exist in the database.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, marketplaceResults, history } = await req.json();

    if (!geminiApiKey) {
      throw new Error("Gemini API key not configured");
    }

    // Build conversation history context
    let historyContext = "";
    if (history && Array.isArray(history) && history.length > 0) {
      historyContext = `\n\nPREVIOUS CONVERSATION HISTORY:\n${history.map((h: any) => `${h.role.toUpperCase()}: ${h.content}`).join("\n")}`;
    }

    // Build marketplace context if available
    let marketplaceContext = "";
    if (marketplaceResults && Array.isArray(marketplaceResults) && marketplaceResults.length > 0) {
      marketplaceContext = `\n\nNEW MARKETPLACE SEARCH RESULTS (signal-level metadata only):
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

    // 2. Streamlined Prompt: Focused entirely on Context & Conversation
    const analysisPrompt = `${BEST_FRIEND_PERSONA}

STRICT DATA POLICY: 
- DEFAULT MODE: You are strictly restricted to querying and responding to the user's context, platform knowledge, and the database metrics provided to you.
- MARKETPLACE RESTRICTION: If the user asks about the global marketplace or available bundles, you MUST refuse to provide specifics unless "NEW MARKETPLACE SEARCH RESULTS" are provided below, OR if you are answering a follow-up question about results found in the "PREVIOUS CONVERSATION HISTORY". Do not invent or summarize outside data.

${historyContext}

User Request: "${message}"

Context: ${context ? JSON.stringify(context) : "No additional context provided"}${marketplaceContext}

INSTRUCTIONS:
1. If the user is just saying hello, testing, or chatting naturally, respond conversationally as Best Friend.
2. If the user asks a question about data, bundles, or their context, answer it clearly and concisely using ONLY the provided context and search results.
3. If the user is following up on a previous marketplace search (e.g., "drill into the apple one"), use the PREVIOUS CONVERSATION HISTORY to answer them specifically.
${marketplaceResults ? "4. Summarize the NEW MARKETPLACE SEARCH RESULTS with signal-level insights ONLY. Do not expose raw data." : "4. Enforce the strict personal data policy if they ask for global/marketplace data without authorizing a search."}

Respond directly to the user in a supportive, informal, but precise tone.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: analysisPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    // Log the interaction for monitoring
    console.log("Best Friend AI Request:", { message, context });
    console.log("Best Friend AI Response:", aiResponse);

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
        error: error.message,
        response:
          "Hey there! I'm experiencing some technical difficulties right now. Let me get my systems back online and I'll be right with you.",
        agentStatus: "error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
