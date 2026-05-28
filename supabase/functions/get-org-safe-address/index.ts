import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const address = Deno.env.get('IDIA_SAFE_ADDRESS_BASE') ?? null;
  return new Response(JSON.stringify({ address }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});