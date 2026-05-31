import { MetaMaskSDK } from "@metamask/sdk";

console.log("[IDIA_WEB3_INIT] >>> START: Initializing MetaMask Enterprise SDK instance thread.");

export const mmsdk = new MetaMaskSDK({
  dappMetadata: {
    name: "IDIA Sovereign Hub",
    url: typeof window !== "undefined" ? window.location.origin : "https://hub.thebigidia.com",
  },
  logging: {
    developerMode: true,
  },
  checkInstallationImmediately: false,
});

console.log("[IDIA_WEB3_INIT] <<< END: MetaMask Enterprise SDK structuralized.");