## Plan

1. **Align the frontend approval spender with the live relayer**
   - Update the client-side `RELAYER_ADDRESS` used by `ensureUsdcApproval()` from `0xfd57Ab321639EA41f8943bca9b7226eCa04072f1` to the live relayer shown in the `[TRIAD]` logs: `0xd816D83703764551A7F292dbC435669AA89631a7`.
   - This makes the wallet approval transaction grant allowance to the same spender that `charge-usdc.ts` uses for `transferFrom()`.

2. **Preserve the hardened charge logging**
   - Keep the existing `[TRIAD]` diagnostics in `supabase/functions/_shared/charge-usdc.ts` unchanged.
   - No contract address, treasury address, RPC, or relayer private key changes.

3. **Add a small safety note in code**
   - Add a concise comment near the frontend relayer constant explaining it must match the public address derived from the deployed `RELAYER_PRIVATE_KEY`.

4. **Validation target**
   - After implementation, the next approval flow should approve spender `0xd816D83703764551A7F292dbC435669AA89631a7`; then `top-up-credits` should see nonzero allowance for buyer `0x429F7fd3CCd6514Cedef76DB12f7bA2151355A40` on Base USDC.

## Technical details

The current logs prove the backend signer is:

```text
relayer=0xd816D83703764551A7F292dbC435669AA89631a7
buyer=0x429F7fd3CCd6514Cedef76DB12f7bA2151355A40
allowance=0
balance=7590425
required=2000000
chainId=8453
usdc=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

But `src/lib/usdc-approval.ts` currently asks the user wallet to approve:

```text
0xfd57Ab321639EA41f8943bca9b7226eCa04072f1
```

So the chain state is consistent: the user approved the wrong spender relative to the deployed edge-function relayer. The fix is frontend-only unless you want to rotate the deployed `RELAYER_PRIVATE_KEY` instead.