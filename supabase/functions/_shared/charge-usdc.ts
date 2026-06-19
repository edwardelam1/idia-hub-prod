// ===================================================================
// charge-usdc.ts — Relayer-side USDC pull from a pre-approved buyer
// wallet straight to the IDIA treasury on Base mainnet.
//
// Contract: caller (top-up-credits) provides buyer_wallet + usd_amount
// (USD float). We call USDC.transferFrom(buyer, TREASURY, amount*1e6)
// signed by RELAYER_PRIVATE_KEY. If the buyer has not pre-approved the
// relayer, USDC reverts and we surface APPROVAL_REQUIRED so the UI can
// route the buyer through ensureUsdcApproval().
// ===================================================================

import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  getAddress,
  parseUnits,
} from "https://esm.sh/viem@2.9.20";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { PROTOCOL } from "./contracts.ts";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

const ERC20_ABI = [
  {
    name: "transferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type ChargeResult =
  | { ok: true; hash: string }
  | { ok: false; code: string; message: string };

function getTreasury(): string {
  const fromEnv = Deno.env.get("IDIA_SAFE_ADDRESS_BASE") ?? Deno.env.get("IDIA_TREASURY_ADDRESS");
  const candidate = (fromEnv && fromEnv.trim().length > 0 ? fromEnv : PROTOCOL.treasury) as string;
  if (!isAddress(candidate)) {
    throw new Error(`TREASURY_MISCONFIGURED: ${candidate}`);
  }
  return getAddress(candidate);
}

function getRpc(): string {
  return (
    Deno.env.get("ALCHEMY_BASE_RPC_URL") ??
    Deno.env.get("BASE_RPC_URL") ??
    "https://mainnet.base.org"
  );
}

export async function chargeBuyerUsdc(opts: {
  buyer_wallet: string;
  usd_amount: number;
}): Promise<ChargeResult> {
  const stage = "chargeBuyerUsdc";
  console.log(`[BEGIN: ${stage}] buyer=${opts.buyer_wallet} usd=${opts.usd_amount}`);

  try {
    if (!isAddress(opts.buyer_wallet)) {
      return { ok: false, code: "INVALID_BUYER", message: `Not a valid address: ${opts.buyer_wallet}` };
    }
    if (!Number.isFinite(opts.usd_amount) || opts.usd_amount <= 0) {
      return { ok: false, code: "INVALID_AMOUNT", message: `usd_amount must be > 0` };
    }

    const pk = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!pk) {
      return { ok: false, code: "RELAYER_MISCONFIGURED", message: "RELAYER_PRIVATE_KEY is not set" };
    }
    const normalizedPk = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;

    const buyer = getAddress(opts.buyer_wallet);
    const treasury = getTreasury();
    const amount = parseUnits(opts.usd_amount.toFixed(6), 6);

    const account = privateKeyToAccount(normalizedPk);
    const rpcUrl = getRpc();
    let rpcHost = "unknown";
    try { rpcHost = new URL(rpcUrl).host; } catch { /* ignore */ }
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain: base, transport });
    const walletClient = createWalletClient({ chain: base, transport, account });

    console.log(`[${stage}] relayer=${account.address} treasury=${treasury} amount=${amount.toString()}`);

    // Pre-flight: allowance + buyer balance to give the UI a precise error code.
    const [allowance, buyerBalance] = await Promise.all([
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [buyer, account.address],
      } as any) as Promise<bigint>,
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [buyer],
      } as any) as Promise<bigint>,
    ]);
    console.log(`[${stage}] allowance=${allowance.toString()} balance=${buyerBalance.toString()}`);

    // Triad-of-Execution diagnostic — surfaces every parameter the chain evaluates,
    // so APPROVAL_REQUIRED stalls can be compared 1:1 against BaseScan.
    console.log(
      `[TRIAD] relayer=${account.address} usdc=${USDC_ADDRESS} chainId=${base.id} ` +
      `buyer=${buyer} treasury=${treasury} ` +
      `allowance=${allowance.toString()} balance=${buyerBalance.toString()} required=${amount.toString()} ` +
      `rpc_host=${rpcHost}`
    );

    if (allowance < amount) {
      return {
        ok: false,
        code: "APPROVAL_REQUIRED",
        message: `Buyer ${buyer} has not granted the relayer sufficient USDC allowance.`,
      };
    }
    if (buyerBalance < amount) {
      return {
        ok: false,
        code: "INSUFFICIENT_BUYER_BALANCE",
        message: `Buyer USDC balance ${buyerBalance.toString()} below required ${amount.toString()}.`,
      };
    }

    console.log(`[${stage}] dispatching transferFrom`);
    const hash = (await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transferFrom",
      args: [buyer, treasury, amount],
      chain: base,
    } as any)) as `0x${string}`;
    console.log(`[${stage}] tx submitted hash=${hash}, awaiting receipt`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
    if (receipt.status !== "success") {
      return { ok: false, code: "TX_REVERTED", message: `transferFrom reverted at block ${receipt.blockNumber}` };
    }
    console.log(`[END: ${stage}] confirmed in block ${receipt.blockNumber}`);
    return { ok: true, hash };
  } catch (err: any) {
    const msg = err?.shortMessage ?? err?.message ?? String(err);
    console.error(`🚨 [FATAL: ${stage}] ${msg}`);
    // viem surfaces allowance/balance failures inside the revert reason; map them.
    if (/allowance/i.test(msg)) {
      return { ok: false, code: "APPROVAL_REQUIRED", message: msg };
    }
    if (/balance/i.test(msg)) {
      return { ok: false, code: "INSUFFICIENT_BUYER_BALANCE", message: msg };
    }
    return { ok: false, code: "RELAYER_EXECUTION_FAILED", message: msg };
  }
}