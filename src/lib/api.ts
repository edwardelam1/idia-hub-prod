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

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  console.log(`[BEGIN: fetchApi] endpoint=${endpoint} method=${options.method ?? "GET"}`);

  let bodyParsed: unknown = {};
  try {
    bodyParsed = options.body ? JSON.parse(options.body as string) : {};
    console.log(`[fetchApi:PARSE_BODY] OK keys=${Object.keys(bodyParsed as object ?? {}).join(",") || "<empty>"}`);
  } catch (parseErr: any) {
    console.error(`🚨 [FATAL: fetchApi:PARSE_BODY] Invalid JSON body: ${parseErr?.message}`);
    throw new Error(`fetchApi: failed to parse request body as JSON: ${parseErr?.message}`);
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

  // 2. FALLBACK: external / un-mapped endpoints. Inject anon apikey to clear Supabase perimeter.
  console.log(`[BEGIN: fetchApi:FETCH_FALLBACK] endpoint=${endpoint}`);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!anonKey) {
      console.warn(`⚠️ [fetchApi:FETCH_FALLBACK] No anon key found in env. Gateway may reject.`);
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": anonKey ?? "",
      "Authorization": session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${anonKey ?? ""}`,
    };

    const url = `${import.meta.env.VITE_API_BASE_URL || ""}${endpoint}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.error(`🚨 [FATAL: fetchApi:FETCH_FALLBACK] status=${res.status} body=${text}`);
      throw new Error(`fetchApi fallback failed: HTTP ${res.status} - ${text}`);
    }
    const json = await res.json();
    console.log(`[END: fetchApi:FETCH_FALLBACK] status=${res.status}`);
    return json as T;
  } catch (fallbackErr: any) {
    console.error(`🚨 [FATAL: fetchApi:FETCH_FALLBACK] ${fallbackErr?.message}`);
    throw fallbackErr;
  } finally {
    console.log(`[END: fetchApi] endpoint=${endpoint} (fallback path)`);
  }
}