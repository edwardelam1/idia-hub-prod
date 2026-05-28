import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const ALLOWED_METHODS = new Set([
  'eth_call',
  'eth_blockNumber',
  'eth_chainId',
  'eth_getBlockByNumber',
  'eth_getLogs',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
  'eth_gasPrice',
  'eth_feeHistory',
  'eth_estimateGas',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getBalance',
  'net_version',
]);

const FALLBACK_RPC = 'https://mainnet.base.org';

function isAllowed(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.every((b) => b && typeof b === 'object' && ALLOWED_METHODS.has((b as { method: string }).method));
  }
  if (body && typeof body === 'object') {
    return ALLOWED_METHODS.has((body as { method: string }).method);
  }
  return false;
}

async function forward(url: string, body: unknown): Promise<Response> {
  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!isAllowed(body)) {
    return new Response(JSON.stringify({ error: 'method_not_allowed_in_proxy' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const primary = Deno.env.get('ALCHEMY_BASE_RPC_URL');
  let res: Response | null = null;
  if (primary) {
    try {
      res = await forward(primary, body);
      if (!res.ok) res = null;
    } catch {
      res = null;
    }
  }
  if (!res) {
    try {
      res = await forward(FALLBACK_RPC, body);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'upstream_unreachable', detail: String(e) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});