## Fix — IDIA transfer must move tokens

`Escrow.automatedDistribute` is executing on-chain but not moving IDIA (phantom state-update). The Relayer already has an ERC-20 allowance from the Ecosystem Escrow, so bypass the Escrow contract and call `transferFrom` directly on the IDIA token contract.

### Change 1 — Extend ERC-20 ABI (top of file, ~line 52)

Add `transferFrom` to `ERC20_ABI`:

```ts
{
  name: "transferFrom",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "from",  type: "address" },
    { name: "to",    type: "address" },
    { name: "value", type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
}
```

### Change 2 — Add IDIA token constant (~line 43)

```ts
const IDIA_TOKEN_ADDRESS = "0x6526F939D257E67896821c25B6C24Daa404a01FB";
```

### Change 3 — Rewrite the IDIA transaction block (lines ~628–651)

Replace the Escrow `automatedDistribute` call with a strict ERC-20 `transferFrom`. Keep `sendWithNonceRetry` and all surrounding logic (`idiaSettled`, ledger insert, catch/finally) untouched.

```ts
// 2. IDIA royalty award — direct ERC-20 transferFrom
//    From: Ecosystem Escrow (allowance already granted to relayer)
//    To:   Contributor wallet
//    Amount: idiaAwardAmount (wei)
const { hash: idiaHash, receipt: idiaReceipt } = await sendWithNonceRetry(
  (nonce) =>
    client.writeContract({
      address: IDIA_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transferFrom",
      args: [
        ESCROW_ECOSYSTEM as `0x${string}`,
        lifeWallet as `0x${string}`,
        idiaAwardAmount,
      ],
      account,
      nonce,
    }),
  "idia_award",
);
console.info(`[STATUS: Batch.Item] IDIA transferFrom Broadcasted. Hash: ${idiaHash}.`);
if (idiaReceipt.status === "success") {
  console.info(`[END: Batch.Item] IDIA transferFrom successful. Block: ${idiaReceipt.blockNumber}`);
} else {
  console.error(`[ERROR: Batch.Item] IDIA transferFrom reverted. Hash: ${idiaHash}`);
}
```

### Preserved
- Serial nonce-retry loop (`sendWithNonceRetry`).
- `yieldSettled` / `idiaSettled` per-phase booleans and catch-block phase routing (double-payout fix from prior turn).
- USDC yield phase, ledger inserts, mutex, polling loop, Phase 1/2 flow.
- `ESCROW_ABI` stays in place (still referenced elsewhere/harmless).

### Verification
1. Redeploy `idia-circular-settlement`.
2. Trigger a synthetic settlement with one contributor.
3. On BaseScan, confirm the IDIA tx is a `Transfer` event from `ESCROW_ECOSYSTEM` → contributor wallet on `0x6526…01FB` with non-zero `value`.
4. Confirm contributor IDIA balance actually increases.
5. Ledger shows one `data_sale_payout` completed + one `idia_royalty_yield` completed, no duplicates.

### Files touched
- `supabase/functions/idia-circular-settlement/index.ts` (ABI + constant + IDIA block only).
