// ========================================================================
// SHARED MODULE: Non-custodial USDC charge via transferFrom on Base.
// Imported directly by edge functions to avoid edge-to-edge HTTP latency.
// ========================================================================
//
// Flow:
//   1. Buyer has previously called approve(RELAYER_ADDRESS, MAX_UINT256)
//      on the USDC contract from their own wallet (one-time setup).
//   2. This module reads on-chain allowance + balance.
//   3. If both are sufficient, the relayer broadcasts
//      transferFrom(buyer, RELAYER_ADDRESS, amount) and pays gas.
//   4. Caller is responsible for any ledger writes.
//
// Returns a discriminated result so callers can surface APPROVAL_REQUIRED
// or INSUFFICIENT_USDC errors to the UI without throwing.

export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
// Relayer == treasury wallet. Public address derived from RELAYER_PRIVATE_KEY.
export const RELAYER_ADDRESS = "0xfd57Ab321639EA41f8943bca9b7226eCa04072f1" as const;

const ERC20_ABI = [
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
] as const;

export type ChargeResult =
  | { ok: true; hash: string; block_number: number; amount_usdc: number }
  | { ok: false; code: "APPROVAL_REQUIRED"; allowance: string; required: string; spender: string }
  | { ok: false; code: "INSUFFICIENT_USDC"; balance: string; required: string }
  | { ok: false; code: "INVALID_ADDRESS" | "CONFIG_MISSING" | "BROADCAST_FAILED"; message: string };

// Serialize relayer broadcasts so concurrent calls don't collide on nonce.
// Module-level promise chain — each invocation awaits the previous.
let nonceLock: Promise<unknown> = Promise.resolve();

export interface ChargeBuyerUsdcInput {
  buyer_wallet: string;
  usd_amount: number; // dollar amount, e.g. 0.75
}

export async function chargeBuyerUsdc(input: ChargeBuyerUsdcInput): Promise<ChargeResult> {
  const { buyer_wallet, usd_amount } = input;
  console.info(`[BEGIN: chargeBuyerUsdc] buyer=${buyer_wallet} usd=${usd_amount}`);

  try {
    console.info(`[BEGIN: chargeBuyerUsdc:LOAD_VIEM]`);
    const { createWalletClient, createPublicClient, http, parseUnits, formatUnits, isAddress, getAddress } =
      await import("https://esm.sh/viem@2.9.20");
    const { privateKeyToAccount } = await import("https://esm.sh/viem@2.9.20/accounts");
    const { base } = await import("https://esm.sh/viem@2.9.20/chains");
    console.info(`[END: chargeBuyerUsdc:LOAD_VIEM]`);

    console.info(`[BEGIN: chargeBuyerUsdc:VALIDATE]`);
    if (!isAddress(buyer_wallet)) {
      console.error(`🚨 [FATAL: chargeBuyerUsdc:VALIDATE] Invalid buyer wallet: ${buyer_wallet}`);
      return { ok: false, code: "INVALID_ADDRESS", message: `Invalid buyer wallet: ${buyer_wallet}` };
    }
    if (!Number.isFinite(usd_amount) || usd_amount <= 0) {
      return { ok: false, code: "INVALID_ADDRESS", message: `Invalid usd_amount: ${usd_amount}` };
    }
    const buyer = getAddress(buyer_wallet);
    const required = parseUnits(usd_amount.toFixed(6), 6); // USDC has 6 decimals
    console.info(`[END: chargeBuyerUsdc:VALIDATE] buyer=${buyer} required=${required.toString()}`);

    console.info(`[BEGIN: chargeBuyerUsdc:LOAD_KEY]`);
    let rawPk = Deno.env.get("RELAYER_PRIVATE_KEY") || "";
    if (!rawPk) {
      console.error(`🚨 [FATAL: chargeBuyerUsdc:LOAD_KEY] RELAYER_PRIVATE_KEY not set`);
      return { ok: false, code: "CONFIG_MISSING", message: "RELAYER_PRIVATE_KEY env var is not set" };
    }
    if (!rawPk.startsWith("0x")) rawPk = "0x" + rawPk;
    const account = privateKeyToAccount(rawPk as `0x${string}`);
    console.info(`[END: chargeBuyerUsdc:LOAD_KEY] relayer=${account.address}`);

    const baseRpcUrl = Deno.env.get("BASE_RPC_URL");
    if (!baseRpcUrl) {
      return { ok: false, code: "CONFIG_MISSING", message: "BASE_RPC_URL env var is not set" };
    }
    const transport = http(baseRpcUrl);
    const publicClient = createPublicClient({ chain: base, transport });
    const walletClient = createWalletClient({ account, chain: base, transport });

    console.info(`[BEGIN: chargeBuyerUsdc:READ_ALLOWANCE]`);
    const allowance = (await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [buyer, RELAYER_ADDRESS],
    })) as bigint;
    console.info(
      `[END: chargeBuyerUsdc:READ_ALLOWANCE] allowance=${formatUnits(allowance, 6)} required=${formatUnits(required, 6)}`,
    );
    if (allowance < required) {
      console.warn(`⚠️ [chargeBuyerUsdc] APPROVAL_REQUIRED — buyer must approve(${RELAYER_ADDRESS}, MAX_UINT256)`);
      return {
        ok: false,
        code: "APPROVAL_REQUIRED",
        allowance: allowance.toString(),
        required: required.toString(),
        spender: RELAYER_ADDRESS,
      };
    }

    console.info(`[BEGIN: chargeBuyerUsdc:READ_BALANCE]`);
    const balance = (await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [buyer],
    })) as bigint;
    console.info(`[END: chargeBuyerUsdc:READ_BALANCE] balance=${formatUnits(balance, 6)}`);
    if (balance < required) {
      console.warn(`⚠️ [chargeBuyerUsdc] INSUFFICIENT_USDC — buyer balance below required charge`);
      return {
        ok: false,
        code: "INSUFFICIENT_USDC",
        balance: balance.toString(),
        required: required.toString(),
      };
    }

    // ====================================================================
    // NONCE LOCK: serialize relayer broadcasts so concurrent invocations
    // don't race for the same blockchain nonce.
    // ====================================================================
    console.info(`[BEGIN: chargeBuyerUsdc:NONCE_LOCK]`);
    const myTurn = nonceLock.then(async () => {
      console.info(`[BEGIN: chargeBuyerUsdc:BROADCAST] transferFrom(${buyer}, ${RELAYER_ADDRESS}, ${required.toString()})`);
      const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
      console.info(`[chargeBuyerUsdc:BROADCAST] nonce=${nonce}`);
      const txHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transferFrom",
        args: [buyer, RELAYER_ADDRESS, required],
        chain: base,
        account,
        nonce,
      });
      console.info(`[END: chargeBuyerUsdc:BROADCAST] hash=${txHash}`);

      console.info(`[BEGIN: chargeBuyerUsdc:WAIT_RECEIPT]`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      console.info(`[END: chargeBuyerUsdc:WAIT_RECEIPT] status=${receipt.status} block=${receipt.blockNumber}`);
      if (receipt.status !== "success") {
        throw new Error(`On-chain transferFrom reverted (block=${receipt.blockNumber})`);
      }
      return { hash: txHash, block: Number(receipt.blockNumber) };
    });
    // Update the lock immediately, swallow failures so the chain doesn't poison itself.
    nonceLock = myTurn.catch(() => undefined);
    const { hash, block } = await myTurn;
    console.info(`[END: chargeBuyerUsdc:NONCE_LOCK]`);

    console.info(`[END: chargeBuyerUsdc] success hash=${hash} block=${block}`);
    return { ok: true, hash, block_number: block, amount_usdc: usd_amount };
  } catch (err: any) {
    console.error(`🚨 [FATAL: chargeBuyerUsdc] ${err?.message ?? err}`);
    return { ok: false, code: "BROADCAST_FAILED", message: err?.message ?? "Unknown broadcast error" };
  }
}