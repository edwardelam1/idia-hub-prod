const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Mock response handlers – only for endpoints not yet migrated to Supabase
const mockHandlers: Record<string, (body?: any) => any> = {
  '/api/v1/aca/verify': () => ({
    status: 'verified',
    aca_reference: 'ACA-REF-2024-001',
    verified_at: new Date().toISOString(),
  }),
  '/api/v1/health/metrics': () => ({
    total_records: 847,
    today_records: 23,
    average_steps: 8420,
    last_activity: new Date().toISOString(),
    data_types: ['Steps', 'Heart Rate', 'Calories', 'Sleep'],
    comprehensive_score: 0.72,
  }),
  '/api/v1/security/events': () => ({
    events: [
      { id: 'sec-001', agent_name: 'crazy_sentinel', action_type: 'scan', severity: 'low', timestamp: new Date().toISOString(), resolved: true },
      { id: 'sec-002', agent_name: 'crazy_oracle', action_type: 'anomaly_detection', severity: 'medium', timestamp: new Date().toISOString(), resolved: false },
    ],
    total_count: 2,
  }),
  '/api/v1/delt/transfer': (body?: any) => ({
    success: true,
    liability_token: `LT-${crypto.randomUUID().replace(/-/g, '')}`,
    provenance_id: crypto.randomUUID(),
    client_id: body?.client_id || 'ENT-MOCK',
    timestamp: new Date().toISOString(),
  }),
  '/api/v1/best-friend/chat': (body?: any) => ({
    response: `I've analyzed your request: "${body?.message || ''}". Based on the current system state, all services are operational. How else can I help?`,
  }),
  '/api/v1/synapse/query': () => ({
    data: [
      { region: 'US-KY', device_os: 'iOS 18.2', hri_score: 91.4, record_count: 1243, anonymization_level: 'k-anon-5', last_updated: '2026-02-27T08:00:00Z' },
      { region: 'US-CA', device_os: 'Android 16', hri_score: 87.2, record_count: 3891, anonymization_level: 'k-anon-10', last_updated: '2026-02-27T07:45:00Z' },
      { region: 'GB-LND', device_os: 'iOS 18.2', hri_score: 78.9, record_count: 672, anonymization_level: 'k-anon-5', last_updated: '2026-02-26T22:30:00Z' },
      { region: 'DE-BY', device_os: 'Android 15', hri_score: 93.1, record_count: 418, anonymization_level: 'k-anon-8', last_updated: '2026-02-27T06:15:00Z' },
    ],
  }),
};

function getMockResponse(endpoint: string, body?: any): any | null {
  const strippedEndpoint = endpoint.split('?')[0];
  const handler = mockHandlers[strippedEndpoint];
  return handler ? handler(body) : null;
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    const bodyParsed = options.body ? JSON.parse(options.body as string) : undefined;
    const mock = getMockResponse(endpoint, bodyParsed);
    if (mock) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return mock as T;
    }
    throw new Error(`No mock handler for endpoint: ${endpoint}`);
  }

  const token = localStorage.getItem('idia_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}
