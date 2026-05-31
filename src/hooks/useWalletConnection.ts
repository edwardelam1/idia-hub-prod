import { useCallback, useState } from "react";
import { mmsdk } from "@/config/metamask";
import { supabase } from "@/integrations/supabase/client";

export type WalletSource = "vault" | "metamask";
export interface WalletConnection {
  address: string;
  source: WalletSource;
}

/**
 * Unified Connect Wallet hook.
 * 1) Silently asks vault-bridge for the IDIA Life–provisioned address (no passphrase ever leaves Life).
 * 2) Falls back to MetaMask SDK (QR + extension) for unlinked / institutional buyers.
 */
export const useWalletConnection = () => {
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tryVaultBridge = useCallback(async (): Promise<string | null> => {
    console.log("[IDIA_UI_BRIDGE] >>> START: Internal vault handshake via Edge Function.");
    try {
      const { data: sessionData, error: sErr } = await supabase.auth.getSession();
      if (sErr || !sessionData.session) {
        console.warn("[IDIA_UI_BRIDGE] !!! WARN: No active Supabase session for internal bridge.");
        return null;
      }
      const { data, error: invokeErr } = await supabase.functions.invoke("vault-bridge", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (invokeErr) {
        console.error(`[IDIA_UI_BRIDGE] !!! ERROR: vault-bridge invocation failed: ${invokeErr.message}`);
        return null;
      }
      console.log(`[IDIA_UI_BRIDGE] <<< END: vault-bridge payload: ${JSON.stringify(data)}`);
      if (data?.status === "PROVISIONED" && data?.address) return data.address as string;
      return null;
    } catch (e: any) {
      console.error(`[IDIA_UI_BRIDGE] !!! FATAL: vault bridge exception: ${e.message}`);
      return null;
    }
  }, []);

  const tryMetaMask = useCallback(async (): Promise<string | null> => {
    console.log("[IDIA_UI_BRIDGE] >>> START: MetaMask SDK fallback (QR/Extension).");
    const provider = mmsdk.getProvider();
    if (!provider) throw new Error("MetaMask provider failed to initialize.");
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    console.log(`[IDIA_UI_BRIDGE] <<< END: eth_requestAccounts: ${JSON.stringify(accounts)}`);
    return accounts?.[0] ?? null;
  }, []);

  const connect = useCallback(async (): Promise<WalletConnection | null> => {
    setConnecting(true);
    setError(null);
    try {
      let address = await tryVaultBridge();
      let source: WalletSource = "vault";
      if (!address) {
        console.log("[IDIA_UI_BRIDGE] --- Vault bridge yielded none. Escalating to MetaMask SDK.");
        address = await tryMetaMask();
        source = "metamask";
      }
      if (!address) {
        setError("No wallet returned from handshake.");
        return null;
      }
      const conn = { address, source };
      setConnection(conn);
      return conn;
    } catch (e: any) {
      console.error(`[IDIA_UI_BRIDGE] !!! Connect failure: ${e.message}`);
      setError(e.message || "Wallet connection failed.");
      return null;
    } finally {
      setConnecting(false);
    }
  }, [tryVaultBridge, tryMetaMask]);

  const disconnect = useCallback(() => {
    setConnection(null);
    setError(null);
  }, []);

  return { connect, disconnect, connecting, connection, error };
};