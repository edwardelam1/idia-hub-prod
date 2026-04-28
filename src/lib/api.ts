export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const bodyParsed = options.body ? JSON.parse(options.body as string) : {};

  // FORCE ROUTE TO EDGE FUNCTIONS
  const edgeMap: Record<string, string> = {
    "/api/v1/synapse/controller": "synapse-controller",
    "/api/v1/settlement/circular": "idia-circular-settlement",
    "/api/v1/billing/withdraw/crypto": "withdraw-to-crypto"
  };

  const functionName = Object.keys(edgeMap).find(key => endpoint.startsWith(key));

  if (functionName) {
    console.log(`[MVP] Force-invoking: ${edgeMap[functionName]}`);
    const { data, error } = await supabase.functions.invoke(edgeMap[functionName], {
      body: bodyParsed
    });
    if (error) throw error;
    return data as T;
  }

  // FALLBACK FOR EVERYTHING ELSE
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    "Content-Type": "application/json",
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${session?.access_token}`
  };

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}${endpoint}`, { ...options, headers });
  return res.json();
}