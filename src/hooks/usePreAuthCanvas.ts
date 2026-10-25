import { useEffect } from "react";

/** One solid brand color used edge-to-edge from launch through sign-in. */
export const PRE_AUTH_BG = "#3b0764";

/** Paints html, body and the phone's status/home bars the same solid color while mounted. */
export function usePreAuthCanvas() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    const prevTheme = meta.content;
    html.style.backgroundColor = PRE_AUTH_BG;
    body.style.backgroundColor = PRE_AUTH_BG;
    meta.content = PRE_AUTH_BG;
    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
      if (created) meta?.remove();
      else if (meta) meta.content = prevTheme;
    };
  }, []);
}
