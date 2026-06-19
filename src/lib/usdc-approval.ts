// ========================================================================
// USDC Approval Helper — prompts the buyer's injected wallet
// (window.ethereum on Base) to approve(RELAYER, MAX_UINT256).
//
// One-time per buyer wallet. After this is mined, the relayer can
// transferFrom(buyer, relayer, amount) for any future on-chain charge.
// ========================================================================

import { createPublicClient, createWalletClient, custom, http, isAddress, getAddress, maxUint256 } from "viem";
import { base } from "viem/chains";

export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
// Public address derived from the deployed RELAYER_PRIVATE_KEY edge-function secret.
// MUST stay in lock-step with whatever privateKeyToAccount(RELAYER_PRIVATE_KEY) yields
// inside supabase/functions/_shared/charge-usdc.ts — otherwise the buyer approves a
// spender that the backend never uses and transferFrom() reverts with APPROVAL_REQUIRED.
// Safe to embed client-side (public address only).
export const RELAYER_ADDRESS = "0xd816D83703764551A7F292dbC435669AA89631a7" as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
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
] as const;

const BASE_CHAIN_ID_HEX = "0x2105"; // 8453

export type ApprovalResult =
  | { ok: true; hash: string }
  | { ok: false; reason: string };

/**
 * Ensures the buyer wallet has approved the relayer to spend USDC.
 * No-op if allowance is already adequate.
 */
export async function ensureUsdcApproval(opts: { owner: string }): Promise<ApprovalResult> {
  console.info(`[BEGIN: ensureUsdcApproval] owner=${opts.owner}`);
  try {
    if (!isAddress(opts.owner)) {
      return { ok: false, reason: "Invalid owner address" };
    }
    const owner = getAddress(opts.owner);

    const ethereum = (typeof window !== "undefined" ? (window as any).ethereum : null) as
      | { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      | null;
    if (!ethereum) {
      console.error("[ensureUsdcApproval] WALLET_NOT_FOUND — window.ethereum is null");
      throw new Error("WALLET_NOT_FOUND: No browser wallet detected. Install MetaMask and reload.");
    }

    console.info(`[ensureUsdcApproval] requesting accounts`);
    let accounts: string[];
    try {
      accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
    } catch (reqErr: any) {
      console.error("[ensureUsdcApproval] eth_requestAccounts failed:", reqErr);
      const code = reqErr?.code;
      const msg = String(reqErr?.message ?? reqErr ?? "");
      if (code === 4001) {
        throw new Error("APPROVAL_USER_REJECTED: You rejected the wallet connection request.");
      }
      if (code === -32002) {
        throw new Error("APPROVAL_POPUP_BLOCKED: A MetaMask request is already pending — open the extension and complete it.");
      }
      if (/unsafe-eval|Content Security Policy|CSP/i.test(msg) || reqErr instanceof EvalError) {
        throw new Error("APPROVAL_CSP_BLOCKED: Browser CSP blocked the MetaMask SDK from executing. Reload after the CSP update deploys.");
      }
      throw new Error(`APPROVAL_POPUP_BLOCKED: MetaMask popup did not open (${msg || "unknown reason"}).`);
    }
    const active = accounts?.[0];
    if (!active || getAddress(active) !== owner) {
      return {
        ok: false,
        reason: `Connected wallet (${active ?? "none"}) does not match buyer wallet (${owner}).`,
      };
    }

    // Force chain to Base
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch (switchErr: any) {
      // 4902 = chain not added; try to add it.
      if (switchErr?.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BASE_CHAIN_ID_HEX,
              chainName: "Base",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N"],
              blockExplorerUrls: ["https://basescan.org"],
            },
          ],
        });
      } else {
        return { ok: false, reason: `Could not switch to Base: ${switchErr?.message ?? switchErr}` };
      }
    }

    const publicClient = createPublicClient({ chain: base, transport: http("https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N") });
    const walletClient = createWalletClient({ chain: base, transport: custom(ethereum as any), account: owner });

    console.info(`[ensureUsdcApproval] reading current allowance`);
    const current = (await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_APPROVE_ABI,
      functionName: "allowance",
      args: [owner, RELAYER_ADDRESS],
    } as any)) as bigint;
    if (current >= maxUint256 / 2n) {
      console.info(`[END: ensureUsdcApproval] allowance already infinite — no tx needed`);
      return { ok: true, hash: "ALREADY_APPROVED" };
    }

    console.info(`[ensureUsdcApproval] sending approve(RELAYER, MAX_UINT256)`);
    let hash: `0x${string}`;
    try {
      hash = (await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [RELAYER_ADDRESS, maxUint256],
        chain: base,
      } as any)) as `0x${string}`;
    } catch (writeErr: any) {
      console.error("[ensureUsdcApproval] writeContract failed:", writeErr);
      const code = writeErr?.code ?? writeErr?.cause?.code;
      const msg = String(writeErr?.shortMessage ?? writeErr?.message ?? writeErr ?? "");
      if (code === 4001 || /user rejected|User denied/i.test(msg)) {
        throw new Error("APPROVAL_USER_REJECTED: You rejected the approval transaction.");
      }
      if (/unsafe-eval|Content Security Policy|CSP/i.test(msg) || writeErr instanceof EvalError) {
        throw new Error("APPROVAL_CSP_BLOCKED: Browser CSP blocked the MetaMask SDK from broadcasting.");
      }
      throw new Error(`APPROVAL_POPUP_BLOCKED: Approval transaction never broadcast (${msg || "unknown reason"}).`);
    }
    console.info(`[ensureUsdcApproval] approval tx=${hash}, waiting for receipt`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== "success") {
      return { ok: false, reason: `Approval tx reverted (block ${receipt.blockNumber})` };
    }
    console.info(`[END: ensureUsdcApproval] confirmed in block ${receipt.blockNumber}`);
    return { ok: true, hash };
  } catch (err: any) {
    console.error(`🚨 [FATAL: ensureUsdcApproval] ${err?.message ?? err}`);
    // Re-throw tagged errors so the UI surfaces the actual cause instead of
    // silently proceeding to the purchase retry.
    const msg = String(err?.message ?? "");
    if (/^(WALLET_NOT_FOUND|APPROVAL_USER_REJECTED|APPROVAL_POPUP_BLOCKED|APPROVAL_CSP_BLOCKED):/.test(msg)) {
      throw err;
    }
    return { ok: false, reason: err?.message ?? "Approval failed" };
  }
}