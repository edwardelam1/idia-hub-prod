import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNativeShell, NATIVE_AUTH_CALLBACK } from "@/lib/auth-redirect";

type UrlOpenEvent = { url: string };
type CapPlugins = {
  App?: {
    addListener: (
      event: "appUrlOpen",
      cb: (e: UrlOpenEvent) => void,
    ) => Promise<{ remove: () => void }> | { remove: () => void };
  };
  Browser?: { close?: () => Promise<void> };
};

/**
 * Completes an OAuth (Apple / Google) sign-in that returned to the native shell
 * through the `idialife://auth-callback` custom URL scheme on iOS, Android and macOS.
 */
export const useNativeAuthDeepLink = () => {
  useEffect(() => {
    if (!isNativeShell()) return;

    const plugins = (window as unknown as { Capacitor?: { Plugins?: CapPlugins } }).Capacitor?.Plugins;
    if (!plugins?.App) return;

    let cleanup: (() => void) | undefined;

    const handleUrl = async ({ url }: UrlOpenEvent) => {
      if (!url || !url.startsWith(NATIVE_AUTH_CALLBACK)) return;

      try {
        const parsed = new URL(url);
        // PKCE flow: ?code=...  |  implicit flow: #access_token=...&refresh_token=...
        const code = parsed.searchParams.get("code");
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }

        await plugins.Browser?.close?.().catch(() => undefined);

        const next = parsed.searchParams.get("next");
        window.location.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      } catch {
        // Swallow — AuthContext keeps the user on the login screen if no session lands.
      }
    };

    Promise.resolve(plugins.App.addListener("appUrlOpen", handleUrl)).then((handle) => {
      cleanup = () => handle.remove();
    });

    return () => cleanup?.();
  }, []);
};
