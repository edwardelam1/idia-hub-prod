## Goal
Unblock the MetaMask SDK approval flow by relaxing CSP and making `ensureUsdcApproval` fail loudly instead of silently when the wallet popup is blocked.

## Findings
- `index.html` currently has **no** `<meta http-equiv="Content-Security-Policy">` tag. If CSP is actively blocking `unsafe-eval`, it is coming from a server/host header — a meta tag cannot loosen a header-level CSP. I will still add the meta tag as the directive requests, but flag this caveat.
- `src/lib/usdc-approval.ts` currently catches errors and returns `{ ok: false, reason }` — the caller may interpret this softly. We need it to also detect popup-blocked / user-rejected / no-provider conditions and throw distinctly.

## Changes

### 1. `index.html` — add CSP meta tag
Insert a new `<meta http-equiv="Content-Security-Policy">` inside `<head>` with directives that:
- include `'unsafe-eval'` and `'unsafe-inline'` on `script-src` (MetaMask SDK requirement)
- preserve all currently-loaded origins so nothing else regresses:
  - `connect-src`: self, `https://*.supabase.co`, `wss://*.supabase.co`, `https://*.alchemy.com`, `https://*.g.alchemy.com`, `https://api.bigdatacloud.net`, `https://*.metamask.io`, `https://*.infura.io`, `https://*.walletconnect.com`, `wss://*.walletconnect.com`, `https://storage.googleapis.com`
  - `img-src`: `'self' data: blob: https:`
  - `style-src`: `'self' 'unsafe-inline' https:`
  - `font-src`: `'self' data: https:`
  - `frame-src`: `'self' https://*.metamask.io https://*.walletconnect.com`
  - `default-src 'self'`

### 2. `src/lib/usdc-approval.ts` — harden the catch
Wrap the `ethereum.request({ method: "eth_requestAccounts" })` call (and the subsequent `writeContract`) in a tighter `try/catch` that:
- Throws (not returns) when `window.ethereum` is missing, with a clear `WALLET_NOT_FOUND` message.
- Detects MetaMask error codes (`4001` user rejected, `-32002` request already pending, popup-blocked / `evalError` / CSP errors) and rethrows with a tagged message (`APPROVAL_POPUP_BLOCKED`, `APPROVAL_USER_REJECTED`, `APPROVAL_CSP_BLOCKED`).
- Returns `{ ok: false, reason }` only for benign cases (wrong chain that we successfully recovered from, allowance already infinite is still `ok: true`).
- Logs the raw error object before rethrowing so the call site can surface it.

### 3. Caller awareness (no logic change)
`SynapsePurchaseModal.tsx` / `SynapseTopUp.tsx` already gate on `result.ok`; the hardened throws will bubble through their existing try/catch and the unpacked-error helper will display the tagged reason. No edits needed there — confirmed by re-reading both files.

## Out of scope
- No edge function changes.
- No `RELAYER_ADDRESS` changes.
- No changes to the purchase retry flow itself.

## Caveat to flag to the user
If after this change CSP errors still appear in the console, the CSP is being injected by the hosting layer (response header), and a meta tag cannot override it — that would need to be addressed at the host config, not in the app code.

## Validation
1. Reload preview, open DevTools → Network → Doc; confirm the new `Content-Security-Policy` meta is present and no `unsafe-eval` violation appears in console on app load.
2. Trigger purchase with zero allowance → amber "Authorize Relayer" button renders → click it → MetaMask popup opens → sign approval → tx hash logged.
3. Simulate popup-block (deny in MetaMask) → toast shows `APPROVAL_USER_REJECTED`, UI does not advance to retry.