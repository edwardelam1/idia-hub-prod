import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Mock response handlers – only for endpoints not yet migrated to Supabase
const mockHandlers: Record<string, (body?: any) => any> = {
  "/api/v1/aca/verify": () => ({
    status: "verified",
    aca_reference: "ACA-REF-2024-001",
    verified_at: new Date().toISOString(),
  }),
  "/api/v1/health/metrics": () => ({
    total_records: 847,
    today_records: 23,
    average_steps: 8420,
    last_activity: new Date().toISOString(),
    data_types: ["Steps", "Heart Rate", "Calories", "Sleep"],
    comprehensive_score: 0.72,
  }),
  "/api/v1/security/events": () => ({
    events: [
      { id: "sec-001", agent_name: "crazy_sentinel", action_type: "scan", severity: "low", timestamp: new Date().toISOString(), resolved: true },
      { id: "sec-002", agent_name: "crazy_oracle", action_type: "anomaly_detection", severity: "medium", timestamp: new Date().toISOString(), resolved: false },
    ],
    total_count: 2,
  }),
  "/api/v1/billing/worldpay/initiate": (body?: any) => ({
    session_id: `WP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    payment_url: "#worldpay-mock",
    credit_amount: body?.credit_amount ?? 0,
    usd_amount: body?.usd_amount ?? 0,
    expires_in: 900,
  }),
  "/api/v1/synapse/query": () => ({
    data: [
      { region: "US-KY", device_os: "iOS 18.2", hri_score: 91.4, record_count: 1243, anonymization_level: "k-anon-5", last_updated: "2026-02-27T08:00:00Z" },
      { region: "US-CA", device_os: "Android 16", hri_score: 87.2, record_count: 3891, anonymization_level: "k-anon-10", last_updated: "2026-02-27T07:45:00Z" },
    ],
  }),
};

function getMockResponse(endpoint: string, body?: any): any | null {
  const strippedEndpoint = endpoint.split("?")[0];
  const handler = mockHandlers[strippedEndpoint];
  return handler ? handler(body) : null;
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const bodyParsed = options.body ? JSON.parse(options.body as string) : {};

  // 1. GET ACTIVE SESSION (The only source of truth for the JWT)
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // 2. ROUTE TO EDGE FUNCTIONS (Using SDK for auto-auth)
  const edgeFunctionMap: Record<string, string> = {
    "/api/v1/settlement/circular": "idia-circular-settlement",
    "/api/v1/billing/withdraw/crypto": "withdraw-to-crypto",
    "/api/v1/delt/transfer": "process-delt-transfer",
    "/api/v1/best-friend/chat": "best-friend-ai",
    "/api/v1/synapse/controller": "synapse-controller" // HYDRATED
  };

  const matchedRoute = Object.keys(edgeFunctionMap).find(route => endpoint.startsWith(route));
  
  if (matchedRoute) {
    const { data, error } = await supabase.functions.invoke(edgeFunctionMap[matchedRoute], {
      body: bodyParsed,
    });
    if (error) throw new Error(error.message || `Protocol Error: ${edgeFunctionMap[matchedRoute]}`);
    return data as T;
  }

  // 3. FALLBACK MOCK LOGIC
  if (!API_BASE_URL) {
    const mock = getMockResponse(endpoint, bodyParsed);
    if (mock) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return mock as T;
    }
    throw new Error(`No mock handler for endpoint: ${endpoint}`);
  }

  // 4. STANDARD FETCH (External APIs & Gateway Clearance)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": anonKey, 
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}