/**
 * Unpack the real JSON error body from a Supabase FunctionsHttpError.
 *
 * supabase.functions.invoke() wraps non-2xx responses in a generic
 * FunctionsHttpError whose .message is just
 * "Edge Function returned a non-2xx status code". The actual backend
 * payload lives on error.context (a Response). This helper extracts
 * the most descriptive error string available.
 */
export async function unpackEdgeError(error: unknown): Promise<string> {
  const fallback =
    (error as any)?.message ?? (typeof error === "string" ? error : "Unknown edge function error");

  const ctx = (error as any)?.context;
  if (!ctx || typeof ctx.clone !== "function") {
    return fallback;
  }

  try {
    const cloned: Response = ctx.clone();
    const text = await cloned.text();
    if (!text) return fallback;
    try {
      const body = JSON.parse(text);
      console.log("[unpackEdgeError] Unpacked backend error body:", body);
      return body?.error || body?.message || text || fallback;
    } catch {
      console.log("[unpackEdgeError] Unpacked backend error text:", text);
      return text || fallback;
    }
  } catch (parseErr) {
    console.warn("[unpackEdgeError] Failed to read error context body:", parseErr);
    return fallback;
  }
}