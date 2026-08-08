import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const IDIA = '0x6526f939d257e67896821c25b6c24daa404a01fb';
const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// Uniswap v3 subgraph on Base — Messari fork, gated by The Graph gateway.
// Subgraph id: 43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG (Uniswap v3 / Base)
const SUBGRAPH_ID = '43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG';

interface PoolDay {
  date: number;
  tvlUSD: string;
  volumeUSD: string;
}
interface Pool {
  id: string;
  feeTier: string;
  liquidity: string;
  sqrtPrice: string;
  tick: string;
  token0: { id: string; symbol: string; decimals: string };
  token1: { id: string; symbol: string; decimals: string };
  totalValueLockedUSD: string;
  volumeUSD: string;
  poolDayData: PoolDay[];
}

const QUERY = `
  query Pools($t0: String!, $t1: String!) {
    pools(
      where: {
        token0_in: [$t0, $t1],
        token1_in: [$t0, $t1]
      },
      orderBy: totalValueLockedUSD,
      orderDirection: desc,
      first: 10
    ) {
      id
      feeTier
      liquidity
      sqrtPrice
      tick
      token0 { id symbol decimals }
      token1 { id symbol decimals }
      totalValueLockedUSD
      volumeUSD
      poolDayData(first: 30, orderBy: date, orderDirection: desc) {
        date
        tvlUSD
        volumeUSD
      }
    }
  }
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = (Deno.env.get('THEGRAPH_API_KEY') ?? '').trim();
    // The Graph gateway keys are 32-char hex. Anything else -> "malformed API key".
    if (!/^[a-f0-9]{32}$/i.test(apiKey)) {
      return new Response(
        JSON.stringify({ pools: [], warning: 'THEGRAPH_API_KEY missing or malformed (expects 32-char hex key from The Graph Studio)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const url = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${SUBGRAPH_ID}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { t0: IDIA, t1: USDC_BASE } }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: 'subgraph_error', detail: text.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    if (json.errors) {
      const detail = JSON.stringify(json.errors).slice(0, 300);
      console.error('[uniswap-pool-stats] graphql_error', detail);
      // Degrade gracefully so the dashboard renders instead of blanking.
      return new Response(JSON.stringify({ pools: [], warning: `graphql_error: ${detail}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pools: Pool[] = (json.data?.pools ?? []).filter((p: Pool) => {
      const ids = [p.token0.id.toLowerCase(), p.token1.id.toLowerCase()].sort().join('|');
      const target = [IDIA, USDC_BASE].sort().join('|');
      return ids === target;
    });

    const enriched = pools.map((p) => {
      const days = [...p.poolDayData].reverse(); // chronological asc
      const vol30d = days.reduce((s, d) => s + parseFloat(d.volumeUSD || '0'), 0);
      const tvl = parseFloat(p.totalValueLockedUSD || '0');
      const feeFraction = parseInt(p.feeTier) / 1_000_000; // bps -> fraction
      // Annualised fee APR estimate: fees collected / TVL * (365 / windowDays)
      const windowDays = Math.max(days.length, 1);
      const feeApr = tvl > 0 ? (vol30d * feeFraction / tvl) * (365 / windowDays) : 0;
      return {
        id: p.id,
        feeTier: parseInt(p.feeTier),
        token0: p.token0,
        token1: p.token1,
        liquidity: p.liquidity,
        sqrtPriceX96: p.sqrtPrice,
        tick: parseInt(p.tick),
        tvlUSD: tvl,
        volume24hUSD: parseFloat(days[days.length - 1]?.volumeUSD ?? '0'),
        volume30dUSD: vol30d,
        feeApr,
        series: days.map((d) => ({
          date: new Date(d.date * 1000).toISOString().split('T')[0],
          tvl: parseFloat(d.tvlUSD || '0'),
          volume: parseFloat(d.volumeUSD || '0'),
        })),
      };
    });

    return new Response(JSON.stringify({ pools: enriched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});