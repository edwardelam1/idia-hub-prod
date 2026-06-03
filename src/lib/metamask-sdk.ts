/**
 * NANO-BITE ID: hub.web3.metamask-bridge
 * ROLE: Singleton MetaMask SDK bridge. Hands the recovery-phrase import flow off
 *       to MetaMask's native sandbox — Hub code never sees or logs the passphrase.
 */
import { MetaMaskSDK } from "@metamask/sdk";

console.log("[IDIA_WEB3_SDK][Init] >>> START: Initializing standalone MetaMask SDK instance.");

let mmsdkInstance: MetaMaskSDK | null = null;

try {
  mmsdkInstance = new MetaMaskSDK({
    dappMetadata: {
      name: "IDIA Sovereign Hub",
      url: typeof window !== "undefined" ? window.location.origin : "https://hub.thebigidia.com",
    },
    logging: {
      developerMode: true,
    },
    // Force the SDK to detect and inject the local extension provider first
    injectProvider: true,
    // Defer installation check until the user explicitly clicks "Connect MetaMask".
    // When true the SDK surfaces its install/QR modal on app launch — not desired.
    checkInstallationImmediately: false,
  });
  console.log("[IDIA_WEB3_SDK][Init] <<< END: Standalone MetaMask SDK successfully compiled.");
} catch (error: any) {
  console.error(`[IDIA_WEB3_SDK][Init] !!! FATAL ERROR: SDK compilation aborted: ${error?.message}`);
}

export const getMetaMaskSDK = (): MetaMaskSDK | null => mmsdkInstance;

export const connectEmbeddedWallet = async (): Promise<string[]> => {
  console.log("[IDIA_WEB3_SDK][Connect] >>> START: Requesting embedded wallet handshake mapping framework.");

  try {
    if (!mmsdkInstance) {
      console.error("[IDIA_WEB3_SDK][Connect] !!! ERROR: MetaMask SDK instance is null prior to execution.");
      throw new Error("SDK instance not initialized.");
    }

    console.log("[IDIA_WEB3_SDK][Connect] >>> START: Calling SDK provider resolution loop.");
    const provider = mmsdkInstance.getProvider();

    if (!provider) {
      console.error("[IDIA_WEB3_SDK][Connect] !!! ERROR: SDK provider structural core returned null.");
      throw new Error("MetaMask provider structural core failed to initialize.");
    }
    console.log("[IDIA_WEB3_SDK][Connect] <<< END: SDK provider client mapping resolved.");

    console.log("[IDIA_WEB3_SDK][Connect] >>> START: Ingesting account connection flow via eth_requestAccounts.");
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];

    if (!accounts || accounts.length === 0) {
      console.warn("[IDIA_WEB3_SDK][Connect] !!! WARNING: eth_requestAccounts resolved but returned an empty array.");
    } else {
      console.log(`[IDIA_WEB3_SDK][Connect] <<< END: Connection array returned successfully: ${JSON.stringify(accounts)}`);
    }

    return accounts ?? [];
  } catch (error: any) {
    console.error(`[IDIA_WEB3_SDK][Connect] !!! FATAL ERROR: Handshake failed or silently stalled: ${error?.message}`);
    if (error?.stack) console.error(`[IDIA_WEB3_SDK][Connect] --- TRACE: ${error.stack}`);
    throw error;
  } finally {
    console.log("[IDIA_WEB3_SDK][Connect] <<< END: Embedded wallet handshake frame execution wrapped.");
  }
};