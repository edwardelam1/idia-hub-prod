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
// Public address derived from RELAYER_PRIVATE_KEY. Safe to embed client-side.
export const RELAYER_ADDRESS = "0xfd57Ab321639EA41f8943bca9b7226eCa04072f1" as const;

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
      return { ok: false, reason: "No browser wallet detected (install MetaMask or similar)." };
    }

    console.info(`[ensureUsdcApproval] requesting accounts`);
    const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
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
    const hash = (await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [RELAYER_ADDRESS, maxUint256],
      chain: base,
    } as any)) as `0x${string}`;
    console.info(`[ensureUsdcApproval] approval tx=${hash}, waiting for receipt`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== "success") {
      return { ok: false, reason: `Approval tx reverted (block ${receipt.blockNumber})` };
    }
    console.info(`[END: ensureUsdcApproval] confirmed in block ${receipt.blockNumber}`);
    return { ok: true, hash };
  } catch (err: any) {
    console.error(`🚨 [FATAL: ensureUsdcApproval] ${err?.message ?? err}`);
    return { ok: false, reason: err?.message ?? "Approval failed" };
  }
}