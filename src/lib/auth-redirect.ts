/**
 * Platform-aware OAuth redirect resolution.
 *
 * Native shells (iOS, Android, macOS/Catalyst via Capacitor) must return to the
 * app through the registered custom URL scheme `idialife://auth-callback`.
 * Browsers keep using a same-origin https redirect.
 */

export const NATIVE_AUTH_CALLBACK = "idialife://auth-callback";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  platform?: string;
};

export const getNativePlatform = (): "ios" | "android" | "macos" | null => {
  if (typeof window === "undefined") return null;

  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap) {
    const isNative = typeof cap.isNativePlatform === "function" ? cap.isNativePlatform() : cap.platform !== "web";
    const platform = (typeof cap.getPlatform === "function" ? cap.getPlatform() : cap.platform) ?? "";
    if (isNative) {
      if (platform === "ios") return "ios";
      if (platform === "android") return "android";
      return "macos";
    }
  }

  // Non-Capacitor native wrappers (WKWebView / Android WebView) can flag themselves.
  const ua = navigator.userAgent || "";
  if (/IDIALifeNative\/(ios|iphone|ipad|mac)/i.test(ua)) return /mac/i.test(ua) ? "macos" : "ios";
  if (/IDIALifeNative\/android/i.test(ua)) return "android";

  return null;
};

export const isNativeShell = () => getNativePlatform() !== null;

/**
 * Resolve the redirect target handed to Supabase `signInWithOAuth`.
 * `nextPath` is an optional same-origin path (e.g. the MCP consent bounce-back).
 */
export const resolveOAuthRedirect = (nextPath?: string | null): string => {
  if (isNativeShell()) {
    return nextPath ? `${NATIVE_AUTH_CALLBACK}?next=${encodeURIComponent(nextPath)}` : NATIVE_AUTH_CALLBACK;
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return nextPath ? `${origin}${nextPath}` : `${origin}/dashboard`;
};
