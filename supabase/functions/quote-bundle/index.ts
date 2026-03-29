import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { bundle_ids } = await req.json();

    if (!bundle_ids || !Array.isArray(bundle_ids) || bundle_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'bundle_ids array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: bundles, error } = await supabase
      .from('marketplace_bundles')
      .select('bundle_id, name, price')
      .in('bundle_id', bundle_ids);

    if (error) throw error;

    const items = (bundles || []).map((b: any) => ({
      bundle_id: b.bundle_id,
      name: b.name,
      base_valuation: Number(b.price) || 0,
    }));

    const total_cost = items.reduce((sum: number, i: any) => sum + i.base_valuation, 0);

    return new Response(JSON.stringify({ items, total_cost }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
