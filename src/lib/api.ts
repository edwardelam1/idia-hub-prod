import { supabase } from "@/integrations/supabase/client";

/**
 * Internal endpoint -> Edge Function name map.
 * Any endpoint listed here will ALWAYS be routed through
 * supabase.functions.invoke() so that JWT + apikey hydration
 * is handled by the SDK (bypassing 401 Gateway rejections).
 */
const EDGE_MAP: Record<string, string> = {
  "/api/v1/synapse/controller": "synapse-controller",
  "/api/v1/settlement/circular": "idia-circular-settlement",
  "/api/v1/billing/withdraw/crypto": "withdraw-to-crypto",
  "/api/v1/best-friend/chat": "best-friend-ai",
};

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  console.log(`[BEGIN: fetchApi] endpoint=${endpoint} method=${options.method ?? "GET"}`);

  // ====================================================================
  // BODY EXTRACTION: Fixes blind parsing vulnerability.
  // Ensures we handle both stringified and object-based bodies safely.
  // ====================================================================
  console.log(`[BEGIN: fetchApi:EXTRACT_BODY]`);
  let bodyParsed: any = {};
  try {
    if (options.body) {
      bodyParsed = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
    }
    console.log(
      `[fetchApi:EXTRACT_BODY:SUCCESS] keys=${Object.keys((bodyParsed as object) ?? {}).join(",") || "<empty>"}`,
    );
  } catch (parseErr: any) {
    console.error(`🚨 [FATAL: fetchApi:EXTRACT_BODY] Invalid JSON body: ${parseErr?.message}`);
    throw new Error(`fetchApi: failed to parse request body: ${parseErr?.message}`);
  } finally {
    console.log(`[END: fetchApi:EXTRACT_BODY]`);
  }

  // 1. INTERNAL EDGE FUNCTION ROUTE (preferred path)
  const matchedKey = Object.keys(EDGE_MAP).find((key) => endpoint.startsWith(key));
  if (matchedKey) {
    const fnName = EDGE_MAP[matchedKey];
    console.log(`[BEGIN: fetchApi:INVOKE_EDGE] fn=${fnName}`);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: bodyParsed,
      });

      if (error) {
        console.error(`🚨 [FATAL: fetchApi:INVOKE_EDGE] fn=${fnName} error=${error.message}`);
        throw error;
      }

      console.log(`[END: fetchApi:INVOKE_EDGE] fn=${fnName} OK`);
      return data as T;
    } catch (invokeErr: any) {
      console.error(`🚨 [FATAL: fetchApi:INVOKE_EDGE] fn=${fnName} threw: ${invokeErr?.message}`);
      throw invokeErr;
    } finally {
      console.log(`[END: fetchApi] endpoint=${endpoint} (edge path)`);
    }
  }

  // 2. FALLBACK: external / un-mapped endpoints.
  console.log(`[BEGIN: fetchApi:FETCH_FALLBACK] endpoint=${endpoint}`);
  try {
    console.log(`[BEGIN: fetchApi:SESSION_RETRIEVAL]`);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log(`[END: fetchApi:SESSION_RETRIEVAL] session_exists=${!!session}`);

    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.warn(`⚠️ [fetchApi:FETCH_FALLBACK] No publishable key found. Perimeter rejection imminent.`);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: publishableKey ?? "",
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${publishableKey ?? ""}`,
    };

    const url = `${import.meta.env.VITE_API_BASE_URL || ""}${endpoint}`;
    console.log(`[BEGIN: fetchApi:NETWORK_FETCH] url=${url}`);

    // FIX: Included JSON.stringify(bodyParsed) to ensure body is actually transmitted
    const res = await fetch(url, {
      ...options,
      headers,
      body: options.method !== "GET" && options.method !== "HEAD" ? JSON.stringify(bodyParsed) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.error(`🚨 [FATAL: fetchApi:NETWORK_FETCH] status=${res.status} body=${text}`);
      throw new Error(`fetchApi fallback failed: HTTP ${res.status} - ${text}`);
    }

    const json = await res.json();
    console.log(`[END: fetchApi:NETWORK_FETCH] status=${res.status}`);
    return json as T;
  } catch (fallbackErr: any) {
    console.error(`🚨 [FATAL: fetchApi:FETCH_FALLBACK] ${fallbackErr?.message}`);
    throw fallbackErr;
  } finally {
    console.log(`[END: fetchApi] endpoint=${endpoint} (fallback path)`);
  }
}
