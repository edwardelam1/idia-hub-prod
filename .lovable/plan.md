## Fix MetaMask SDK to prioritize extension over QR code

Update `src/lib/metamask-sdk.ts` initialization options so the SDK checks for the injected `window.ethereum` provider first and only falls back to the QR/install modal when no extension is present.

### Change

In `src/lib/metamask-sdk.ts`, replace the current `new MetaMaskSDK({...})` options:

- Add `injectProvider: true` — forces the SDK to detect and use the local extension provider.
- Flip `checkInstallationImmediately: false` → `checkInstallationImmediately: true` — runs the installation check up front so the extension popup takes priority over the mobile QR bridge.

All other behavior (singleton instance, `dappMetadata`, `logging.developerMode: true`, `connectEmbeddedWallet` flow, granular `[IDIA_WEB3_SDK]` logging) stays exactly as-is.

### Result

- Installed extension → native MetaMask popup fires on `eth_requestAccounts`.
- No extension → SDK's full-featured modal appears with both the QR code and an "Install Extension" CTA, instead of jumping straight to a raw QR.

### Out of scope

No changes to `SynapsePurchaseModal`, `SynapseTopUp`, edge functions, or the on-chain transfer flow.
