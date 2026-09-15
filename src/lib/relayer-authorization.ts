/**
 * NANO-BITE ID: hub.web3.relayer-authorization
 * ROLE: One-time USDC allowance grant for the settlement relayer.
 *
 * The buyer's wallet is a NON-CUSTODIAL wallet generated inside the IDIA Life
 * app — the passphrase lives on the user's device, inside that app's secure
 * storage. There is no MetaMask, no injected provider and no browser-signable
 * key. Any attempt to drive the approval through an EIP-1193 provider hangs
 * forever on Android (no provider ever answers `eth_requestAccounts`).
 *
 * So Hub never signs. It hands the request to IDIA Life through the registered
 * `idialife://` custom scheme (the same scheme Supabase auth already returns
 * through, so it resolves inside the iOS / Android shells rather than the
 * browser), then watches the chain until the allowance appears.
 *
 * Every stage is bracketed with [AUTH_RELAYER_*] begin/end telemetry.
 */

import { supabase } from "@/integrations/supabase/client";
import { getNativePlatform } from "@/lib/auth-redirect";

/** Base mainnet USDC. */
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/**
 * Public address of RELAYER_PRIVATE_KEY (edge secret). Verified identical to the
 * relayer IDIA Life's `wallet-gas-drip` reports during wallet provisioning —
 * provisioned Life wallets already hold an unlimited allowance to this address.
 */
export const RELAYER_ADDRESS = "0xd816D83703764551A7F292dbC435669AA89631a7";

/** Custom scheme registered by the IDIA Life native shells (iOS / Android / macOS). */
export const LIFE_SCHEME = "idialife://";
export const LIFE_AUTHORIZE_PATH = "authorize-relayer";
/** Browser fallback when no native shell is installed to answer the scheme. */
export const LIFE_WEB_ORIGIN = "https://idia-life-ui.lovable.app";

const MIN_MEANINGFUL_ALLOWANCE = 1_000_000n; // 1 USDC (6 decimals)

export type UsdcWalletState = {
  allowance: bigint;
  balance: bigint;
};

export type AllowanceWaitOutcome = "granted" | "timeout" | "aborted";

const pad = (addr: string) => addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");

async function rpcCall(to: string, data: string): Promise<bigint> {
  const { data: res, error } = await supabase.functions.invoke("base-rpc-proxy", {
    body: { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] },
  });
  if (error) throw new Error(error.message ?? "RPC proxy error");
  const hex = (res as { result?: string; error?: { message?: string } })?.result;
  if (!hex) throw new Error((res as any)?.error?.message ?? "RPC returned no result");
  return BigInt(hex);
}

/** Reads the buyer's live USDC allowance to the relayer plus their USDC balance. */
export async function readUsdcWalletState(owner: string): Promise<UsdcWalletState> {
  console.info(`[AUTH_RELAYER_STATE][START] owner=${owner}`);
  try {
    const [allowance, balance] = await Promise.all([
      rpcCall(USDC_ADDRESS, `0xdd62ed3e${pad(owner)}${pad(RELAYER_ADDRESS)}`),
      rpcCall(USDC_ADDRESS, `0x70a08231${pad(owner)}`),
    ]);
    console.info(`[AUTH_RELAYER_STATE][OK] allowance=${allowance} balance=${balance}`);
    return { allowance, balance };
  } catch (err: any) {
    console.error(`[AUTH_RELAYER_STATE][FAULT] ${err?.message ?? err}`);
    throw err;
  } finally {
    console.info(`[AUTH_RELAYER_STATE][END] owner=${owner}`);
  }
}

/** True when the wallet has already authorized the relayer for the given amount. */
export function isAuthorized(state: UsdcWalletState, requiredUsd?: number): boolean {
  const required =
    requiredUsd && requiredUsd > 0
      ? BigInt(Math.ceil(requiredUsd * 1_000_000))
      : MIN_MEANINGFUL_ALLOWANCE;
  return state.allowance >= required;
}

/**
 * Canonical Hub origin. IDIA Life only honours `return` targets on this host,
 * so previews/custom hosts must still hand back the production URL.
 */
export const HUB_RETURN_ORIGIN = "https://hub.thebigidia.com";

/** Same-origin path (+query/hash) the user should land back on inside the Hub. */
function hubReturnUrl(): string {
  if (typeof window === "undefined") return HUB_RETURN_ORIGIN;
  const { pathname, search, hash } = window.location;
  return `${HUB_RETURN_ORIGIN}${pathname}${search}${hash}`;
}

/** Builds the deep link handed to IDIA Life. */
export function buildLifeAuthorizationUrl(owner: string): { native: string; web: string } {
  const origin = hubReturnUrl();
  const qs = `owner=${encodeURIComponent(owner)}&relayer=${encodeURIComponent(
    RELAYER_ADDRESS,
  )}&return=${encodeURIComponent(origin)}`;
  return {
    native: `${LIFE_SCHEME}${LIFE_AUTHORIZE_PATH}?${qs}`,
    web: `${LIFE_WEB_ORIGIN}/?${LIFE_AUTHORIZE_PATH}=1&${qs}`,
  };
}

/**
 * Opens IDIA Life at the authorization step.
 * Inside a native shell the custom scheme switches apps directly (no browser).
 * In a plain browser we try the scheme first and fall back to the Life web app.
 */
export function openLifeAuthorization(owner: string): void {
  const { native, web } = buildLifeAuthorizationUrl(owner);
  const platform = getNativePlatform();
  console.info(`[AUTH_RELAYER_DEEPLINK][START] platform=${platform ?? "web"} url=${native}`);

  try {
    if (platform) {
      window.location.href = native;
      console.info(`[AUTH_RELAYER_DEEPLINK][NATIVE_DISPATCHED]`);
      return;
    }

    let switched = false;
    const onHide = () => {
      if (document.visibilityState === "hidden") switched = true;
    };
    document.addEventListener("visibilitychange", onHide);
    window.location.href = native;

    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (!switched) {
        console.warn(`[AUTH_RELAYER_DEEPLINK][NO_HANDLER] falling back to Life web app`);
        window.open(web, "_blank", "noopener,noreferrer");
      }
    }, 1500);
  } catch (err: any) {
    console.error(`[AUTH_RELAYER_DEEPLINK][FAULT] ${err?.message ?? err}`);
  } finally {
    console.info(`[AUTH_RELAYER_DEEPLINK][END]`);
  }
}

/**
 * Polls the chain until the relayer allowance lands. Never hangs: resolves
 * `timeout` once maxMs elapses. RPC faults are logged and retried, never fatal.
 */
export async function waitForRelayerAllowance(
  owner: string,
  opts: { requiredUsd?: number; maxMs?: number; intervalMs?: number; signal?: AbortSignal } = {},
): Promise<AllowanceWaitOutcome> {
  const maxMs = opts.maxMs ?? 120_000;
  const intervalMs = opts.intervalMs ?? 4_000;
  const started = Date.now();
  let attempt = 0;

  console.info(`[AUTH_RELAYER_POLL][START] owner=${owner} maxMs=${maxMs}`);
  try {
    while (Date.now() - started < maxMs) {
      if (opts.signal?.aborted) {
        console.warn(`[AUTH_RELAYER_POLL][ABORTED] attempt=${attempt}`);
        return "aborted";
      }
      attempt += 1;
      console.info(`[AUTH_RELAYER_POLL][ITERATION_START] attempt=${attempt}`);
      try {
        const state = await readUsdcWalletState(owner);
        if (isAuthorized(state, opts.requiredUsd)) {
          console.info(`[AUTH_RELAYER_POLL][GRANTED] attempt=${attempt} allowance=${state.allowance}`);
          return "granted";
        }
        console.info(`[AUTH_RELAYER_POLL][NOT_YET] attempt=${attempt} allowance=${state.allowance}`);
      } catch (err: any) {
        console.warn(`[AUTH_RELAYER_POLL][RPC_FAULT] attempt=${attempt} ${err?.message ?? err} — retrying`);
      }
      console.info(`[AUTH_RELAYER_POLL][ITERATION_END] attempt=${attempt}`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    console.warn(`[AUTH_RELAYER_POLL][TIMEOUT] attempts=${attempt}`);
    return "timeout";
  } finally {
    console.info(`[AUTH_RELAYER_POLL][END] owner=${owner} elapsedMs=${Date.now() - started}`);
  }
}

export type AuthorizationResult = {
  ok: boolean;
  alreadyAuthorized?: boolean;
  reason?: string;
  pending?: boolean;
};

/**
 * Drop-in replacement for the old MetaMask `ensureUsdcApproval`.
 * Never throws for flow-control, never hangs longer than `maxMs`.
 */
export async function authorizeRelayerViaLife(opts: {
  owner: string;
  requiredUsd?: number;
  maxMs?: number;
  signal?: AbortSignal;
}): Promise<AuthorizationResult> {
  const { owner, requiredUsd } = opts;
  console.info(`[AUTH_RELAYER][START] owner=${owner} requiredUsd=${requiredUsd ?? "n/a"}`);
  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(owner ?? "")) {
      return { ok: false, reason: "No IDIA wallet is linked to this account yet." };
    }

    try {
      const state = await readUsdcWalletState(owner);
      if (isAuthorized(state, requiredUsd)) {
        console.info(`[AUTH_RELAYER][ALREADY_AUTHORIZED]`);
        return { ok: true, alreadyAuthorized: true };
      }
    } catch {
      // Chain read failed — continue to the handoff anyway.
    }

    openLifeAuthorization(owner);

    const outcome = await waitForRelayerAllowance(owner, {
      requiredUsd,
      maxMs: opts.maxMs ?? 120_000,
      signal: opts.signal,
    });

    if (outcome === "granted") return { ok: true, alreadyAuthorized: false };
    if (outcome === "aborted") return { ok: false, reason: "Authorization cancelled." };
    return {
      ok: false,
      pending: true,
      reason:
        "Still waiting on IDIA Life. Finish the authorization in the IDIA Life app, then return here and tap purchase again.",
    };
  } finally {
    console.info(`[AUTH_RELAYER][END] owner=${owner}`);
  }
}
