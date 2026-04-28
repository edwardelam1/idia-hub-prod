import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, errorContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are IDIA's friendly AI assistant, appearing as a floating coin helper in an enterprise inventory & restaurant management system. You help users understand and resolve errors.

Your personality: warm, concise, knowledgeable about inventory management, UOM conversions, recipes, and POS systems.

When given an error context, explain:
1. What went wrong in plain language
2. Why it happened (technical reason simplified)
3. How to fix it (actionable steps)

Keep responses under 3 sentences for initial error explanations. Be more detailed in follow-up conversation.

Domain knowledge:
- UOM = Unit of Measure (e.g., liters, kg, bottles, cases)
- Cross-dimensional means converting between different measurement types (e.g., volume to weight) which requires a density coefficient
- Intra-dimensional means converting within the same type (e.g., ml to liters)
- Par level = minimum stock level before reordering
- Individual unit size + total unit count = dual-dimension tracking (e.g., 12 bottles of 750ml each)`;

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...(errorContext ? [{ role: "user", content: `Error context: ${errorContext}` }] : []),
      ...(messages || []),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: allMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-error-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
