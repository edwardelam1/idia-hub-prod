import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch marketing configuration
    const { data, error } = await supabaseClient
      .from('marketing_config')
      .select('logo_url, taglines')
      .single();

    if (error) {
      console.error('Database error:', error);
      // Return default config if database error
      return new Response(
        JSON.stringify({
          logoUrl: "/lovable-uploads/91fc9afd-c1cf-4088-8d4f-12b744fcfda4.png",
          taglines: [
            "Revolutionizing Business Operations with AI",
            "Smart Payments. Smarter Business.",
            "The Future of Commerce is Here"
          ]
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Parse taglines if they exist
    let taglines = [];
    if (data?.taglines) {
      taglines = Array.isArray(data.taglines) ? data.taglines : [];
    }

    return new Response(
      JSON.stringify({
        logoUrl: data?.logo_url || "/lovable-uploads/91fc9afd-c1cf-4088-8d4f-12b744fcfda4.png",
        taglines: taglines
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        logoUrl: "/lovable-uploads/91fc9afd-c1cf-4088-8d4f-12b744fcfda4.png",
        taglines: ["Loading IDIA Pay..."]
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});