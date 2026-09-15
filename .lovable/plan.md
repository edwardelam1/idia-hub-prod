# Make "Authorize Relayer" actually work

## What I found (verified on-chain and in the code)

- The button asks for a **MetaMask** wallet. Your users don't have one — their wallet lives in the IDIA Life app, non-custodial, with the passphrase on their own device. On Android there is no MetaMask to answer, so the request never comes back and the button spins forever. That matches exactly what you see: nothing happens at all.
- Authorization itself is real and needed. Checking wallets on Base right now: some are already authorized for the Hub relayer (unlimited), others sit at **zero** — for example the wallet holding 10 USDC on account `9ac198fb…` is not authorized, so its purchase will always be refused.
- Separately, your own wallet **is** authorized but holds only **$0.33 USDC**, so a purchase from it fails for lack of funds, not authorization. Today the screen can make that look like the same problem.
- The IDIA Life app already has the exact routine that fixes this (`provisionNewWallet`: gas drip, then approve the relayer and the Synapse vault, then self-delegate) — and nothing in Life currently calls it. That is why newer wallets are never authorized.

## The fix

**1. Hub stops asking for MetaMask.** The "Authorize Relayer" button becomes "Authorize in IDIA Life": it opens the IDIA Life app on the user's phone to the authorization step. No MetaMask, no wallet-connect, nothing new to install.

**2. Hub waits intelligently, never forever.** After the handoff, Hub checks the chain every few seconds for up to two minutes. The moment the authorization lands it confirms, refreshes and lets the purchase continue automatically. If the user returns without finishing, they get a plain message and a retry button — never an endless spinner.

**3. Honest status before the user pays.** The purchase screen reads the wallet's live authorization and USDC balance first and says which one is wrong: "Wallet not yet authorized", or "Only $0.33 USDC available — add funds", instead of one generic failure.

**4. The IDIA Life side must be wired up** (separate app, separate change): Life needs to answer the incoming link by running its existing provisioning routine and returning the user to Hub. Without that step the handoff has nowhere to land. I can plan and apply that change in the Life project next, on your say-so.

## Technical notes

- `src/lib/usdc-approval.ts`: the MetaMask SDK path (`connectEmbeddedWallet` / `eth_requestAccounts` / `writeContract`) is the hang — no injected provider on Android Chrome, and the SDK's install modal is suppressed, so the promise never settles. Replace `ensureUsdcApproval` with `requestLifeAuthorization({ owner })`: open `idialife://authorize-relayer?owner=<addr>&relayer=<addr>&return=<hub-url>` (fallback `https://idia-life-ui.lovable.app/?authorizeRelayer=…` when the scheme doesn't resolve), then poll allowance.
- New `waitForRelayerAllowance(owner, { maxMs: 120_000 })` reading `USDC.allowance(owner, RELAYER_ADDRESS)` through the existing `base-rpc-proxy` edge function, 4s interval, bracketed `[AUTH_RELAYER_*]` begin/end logs at every level (START, DEEP_LINK, POLL_ITERATION, RPC_FAULT — retried not fatal, GRANTED, TIMEOUT, END). Resolves `granted | timeout | aborted`. Re-polls on `visibilitychange` so the app-switch return is caught immediately.
- New read-only preflight in the three purchase surfaces (`UniversalPurchaseScreen.tsx`, `SynapseTopUp.tsx`, `SynapsePurchaseModal.tsx`): one `base-rpc-proxy` call returning `{ allowance, usdcBalance }` → drives `needsApproval` and a distinct `insufficientFunds` state. `INSUFFICIENT_BUYER_BALANCE` from `top-up-credits` maps to the funds message, `APPROVAL_REQUIRED` to the authorize action; today both can read as an authorization problem.
- Every authorize handler gets a hard timeout and a `finally` that clears `isAuthorizingRelayer`, so no path can leave the spinner running.
- `RELAYER_ADDRESS` (`0xd816…31a7`) confirmed correct: provisioned Life wallets hold unlimited allowance to it, so Life's gas-drip relayer and the Hub relayer are the same account. No contract or key change needed.
- MetaMask SDK stays in the codebase for the existing on/off-ramp flows; only the approval path stops using it.
- IDIA Life companion change (project `IDIA Life App`): handle `idialife://authorize-relayer` in the `appUrlOpen` listener, call the unused `walletService.provisionNewWallet()`, then return to the Hub URL passed in.
