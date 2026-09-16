import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createPublicClient, http, getAddress, parseAbi, encodeAbiParameters, keccak256 } from 'npm:viem@2.21.54';
import { base } from 'npm:viem@2.21.54/chains';

/**
 * Uniswap v4 position reader (Base mainnet).
 *
 * The Hub's liquidity page originally only understood Uniswap v3 positions
 * (NonfungiblePositionManager + v3 subgraph). IDIA liquidity actually lives in
 * a Uniswap v4 pool, whose positions are ERC-721s minted by the v4
 * PositionManager and whose pool state lives behind the singleton PoolManager
 * (read via StateView). This function resolves an owner's v4 positions and the
 * live pool state for any pool that contains the IDIA token.
 */

const POSITION_MANAGER = '0x7C5f5A4bBd8fD63184577525326123B519429bDc';
const STATE_VIEW = '0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71';
const IDIA = '0x6526f939d257e67896821c25b6c24daa404a01fb';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const WETH = '0x4200000000000000000000000000000000000006';

const pmAbi = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getPoolAndPositionInfo(uint256 tokenId) view returns ((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey, uint256 info)',
  'function getPositionLiquidity(uint256 tokenId) view returns (uint128)',
]);
const stateViewAbi = parseAbi([
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) view returns (uint128)',
]);
const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);
const transferEvent = parseAbi([
  'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
])[0];

const Q96 = 2n ** 96n;

function poolIdOf(key: {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        {
          type: 'tuple',
          components: [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
          ],
        },
      ],
      [key as never],
    ),
  );
}

function tickToSqrtPriceX96(tick: number): bigint {
  const ratio = Math.pow(1.0001, tick / 2);
  return BigInt(Math.floor(ratio * 2 ** 96));
}

function amountsForLiquidity(sqrtP: bigint, sqrtA: bigint, sqrtB: bigint, L: bigint) {
  let lower = sqrtA;
  let upper = sqrtB;
  if (lower > upper) [lower, upper] = [upper, lower];
  if (sqrtP <= lower) {
    return {
      amount0: (L * Q96 * (upper - lower)) / (upper * lower),
      amount1: 0n,
    };
  }
  if (sqrtP < upper) {
    return {
      amount0: (L * Q96 * (upper - sqrtP)) / (upper * sqrtP),
      amount1: (L * (sqrtP - lower)) / Q96,
    };
  }
  return { amount0: 0n, amount1: (L * (upper - lower)) / Q96 };
}

const toNumber = (raw: bigint, decimals: number) => Number(raw) / Math.pow(10, decimals);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log('[V4_POSITIONS][PHASE_START] request received');
  try {
    const body = await req.json().catch(() => ({}));
    const owners: string[] = Array.isArray(body?.owners)
      ? body.owners
      : body?.owner
        ? [body.owner]
        : [];
    const cleaned = owners
      .filter((o) => typeof o === 'string' && /^0x[a-fA-F0-9]{40}$/.test(o))
      .map((o) => getAddress(o));

    if (cleaned.length === 0) {
      console.log('[V4_POSITIONS][PHASE_END] no valid owners supplied');
      return new Response(JSON.stringify({ positions: [], pools: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rpcUrl =
      (Deno.env.get('ALCHEMY_BASE_RPC_URL') ?? '').trim() ||
      (Deno.env.get('BASE_RPC_URL') ?? '').trim() ||
      'https://mainnet.base.org';
    const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

    // 1. Discover candidate token ids from inbound ERC-721 transfers.
    console.log('[V4_POSITIONS][PHASE_START] discovering token ids', cleaned);
    const idsByOwner = new Map<string, bigint[]>();
    for (const owner of cleaned) {
      const logs = await client.getLogs({
        address: POSITION_MANAGER as `0x${string}`,
        event: transferEvent,
        args: { to: owner },
        fromBlock: 0n,
        toBlock: 'latest',
      });
      const unique = Array.from(new Set(logs.map((l) => (l.args as { tokenId: bigint }).tokenId)));
      idsByOwner.set(owner, unique);
    }
    console.log(
      '[V4_POSITIONS][PHASE_END] token ids discovered',
      JSON.stringify(Array.from(idsByOwner, ([k, v]) => [k, v.map(String)])),
    );

    // 2. Resolve each still-owned position, keeping only IDIA pools.
    const tokenMeta = new Map<string, { symbol: string; decimals: number }>();
    const readToken = async (addr: string) => {
      const key = addr.toLowerCase();
      const cached = tokenMeta.get(key);
      if (cached) return cached;
      if (key === '0x0000000000000000000000000000000000000000') {
        const native = { symbol: 'ETH', decimals: 18 };
        tokenMeta.set(key, native);
        return native;
      }
      const [symbol, decimals] = await Promise.all([
        client.readContract({ address: addr as `0x${string}`, abi: erc20Abi, functionName: 'symbol' }) as Promise<string>,
        client.readContract({ address: addr as `0x${string}`, abi: erc20Abi, functionName: 'decimals' }) as Promise<number>,
      ]);
      const meta = { symbol, decimals: Number(decimals) };
      tokenMeta.set(key, meta);
      return meta;
    };

    const positions: unknown[] = [];
    const pools = new Map<string, unknown>();

    for (const [owner, ids] of idsByOwner) {
      for (const tokenId of ids) {
        console.log('[V4_POSITIONS][PHASE_START] resolving position', tokenId.toString());
        const currentOwner = (await client.readContract({
          address: POSITION_MANAGER as `0x${string}`,
          abi: pmAbi,
          functionName: 'ownerOf',
          args: [tokenId],
        })) as string;
        if (currentOwner.toLowerCase() !== owner.toLowerCase()) {
          console.log('[V4_POSITIONS][PHASE_END] position transferred away', tokenId.toString());
          continue;
        }

        const [poolKey, info] = (await client.readContract({
          address: POSITION_MANAGER as `0x${string}`,
          abi: pmAbi,
          functionName: 'getPoolAndPositionInfo',
          args: [tokenId],
        })) as [
          { currency0: string; currency1: string; fee: number; tickSpacing: number; hooks: string },
          bigint,
        ];

        const c0 = poolKey.currency0.toLowerCase();
        const c1 = poolKey.currency1.toLowerCase();
        if (c0 !== IDIA && c1 !== IDIA) {
          console.log('[V4_POSITIONS][PHASE_END] non-IDIA pool skipped', tokenId.toString());
          continue;
        }

        const liquidity = (await client.readContract({
          address: POSITION_MANAGER as `0x${string}`,
          abi: pmAbi,
          functionName: 'getPositionLiquidity',
          args: [tokenId],
        })) as bigint;

        const raw = BigInt(info);
        const tickLower = Number(BigInt.asIntN(24, (raw >> 8n) & 0xffffffn));
        const tickUpper = Number(BigInt.asIntN(24, (raw >> 32n) & 0xffffffn));

        const id = poolIdOf({
          currency0: poolKey.currency0,
          currency1: poolKey.currency1,
          fee: Number(poolKey.fee),
          tickSpacing: Number(poolKey.tickSpacing),
          hooks: poolKey.hooks,
        });

        const [slot0, poolLiquidity] = (await Promise.all([
          client.readContract({ address: STATE_VIEW as `0x${string}`, abi: stateViewAbi, functionName: 'getSlot0', args: [id] }),
          client.readContract({ address: STATE_VIEW as `0x${string}`, abi: stateViewAbi, functionName: 'getLiquidity', args: [id] }),
        ])) as [[bigint, number, number, number], bigint];

        const sqrtPriceX96 = slot0[0];
        const tick = Number(slot0[1]);

        const meta0 = await readToken(poolKey.currency0);
        const meta1 = await readToken(poolKey.currency1);

        const { amount0, amount1 } = amountsForLiquidity(
          sqrtPriceX96,
          tickToSqrtPriceX96(tickLower),
          tickToSqrtPriceX96(tickUpper),
          liquidity,
        );

        const amt0 = toNumber(amount0, meta0.decimals);
        const amt1 = toNumber(amount1, meta1.decimals);

        // Price of currency0 denominated in currency1, adjusted for decimals.
        const sqrt = Number(sqrtPriceX96) / Number(Q96);
        const price0in1 = sqrt * sqrt * Math.pow(10, meta0.decimals - meta1.decimals);

        const stableIsC1 = c1 === USDC;
        const stableIsC0 = c0 === USDC;
        let valueUSD = 0;
        if (stableIsC1) valueUSD = amt0 * price0in1 + amt1;
        else if (stableIsC0) valueUSD = amt0 + (price0in1 > 0 ? amt1 / price0in1 : 0);

        // Whole-pool depth at the active tick (informational).
        const poolAmounts = amountsForLiquidity(
          sqrtPriceX96,
          tickToSqrtPriceX96(-887272),
          tickToSqrtPriceX96(887272),
          poolLiquidity,
        );
        const poolAmt0 = toNumber(poolAmounts.amount0, meta0.decimals);
        const poolAmt1 = toNumber(poolAmounts.amount1, meta1.decimals);
        const poolTvlUSD = stableIsC1
          ? poolAmt0 * price0in1 + poolAmt1
          : stableIsC0
            ? poolAmt0 + (price0in1 > 0 ? poolAmt1 / price0in1 : 0)
            : 0;

        pools.set(id, {
          id,
          version: 'v4',
          poolKey: {
            currency0: poolKey.currency0,
            currency1: poolKey.currency1,
            fee: Number(poolKey.fee),
            tickSpacing: Number(poolKey.tickSpacing),
            hooks: poolKey.hooks,
          },
          feeTier: Number(poolKey.fee),
          token0: { id: poolKey.currency0, symbol: meta0.symbol, decimals: String(meta0.decimals) },
          token1: { id: poolKey.currency1, symbol: meta1.symbol, decimals: String(meta1.decimals) },
          liquidity: poolLiquidity.toString(),
          sqrtPriceX96: sqrtPriceX96.toString(),
          tick,
          tvlUSD: poolTvlUSD,
          amount0: poolAmt0,
          amount1: poolAmt1,
        });

        positions.push({
          version: 'v4',
          owner,
          tokenId: tokenId.toString(),
          poolId: id,
          token0: poolKey.currency0,
          token1: poolKey.currency1,
          symbol0: meta0.symbol,
          symbol1: meta1.symbol,
          fee: Number(poolKey.fee),
          tickSpacing: Number(poolKey.tickSpacing),
          hooks: poolKey.hooks,
          tickLower,
          tickUpper,
          liquidity: liquidity.toString(),
          amount0: amt0,
          amount1: amt1,
          valueUSD,
          inRange: tick >= tickLower && tick < tickUpper,
          fullRange: tickLower <= -887200 && tickUpper >= 887200,
        });
        console.log('[V4_POSITIONS][PHASE_END] position resolved', tokenId.toString());
      }
    }

    console.log('[V4_POSITIONS][PHASE_END] request complete', positions.length, 'positions');
    return new Response(JSON.stringify({ positions, pools: Array.from(pools.values()) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[V4_POSITIONS][ERROR]', err instanceof Error ? err.message : String(err));
    console.error('[V4_POSITIONS][STACK]', err instanceof Error ? err.stack : 'no stack');
    return new Response(
      JSON.stringify({ error: 'internal', detail: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
