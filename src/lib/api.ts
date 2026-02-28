const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Mock response handlers – used when no real API_BASE_URL is configured
const mockHandlers: Record<string, (body?: any) => any> = {
  '/api/v1/synapse/balance': () => ({
    wallet_address: '0x71C7656EC7ab88b098defB751B7401B5f6d89A34',
    available_credits: 1250.0,
    currency: 'SYNAPSE_GAS',
    last_updated: new Date().toISOString(),
  }),
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
  '/api/v1/delt/logs': () => ({
    logs: [
      { provenance_id: 'prov-001', egress_timestamp: '2026-02-27T14:32:00Z', liability_token_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', aca_record_reference: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', hri_score_at_egress: 92.45, country_of_origin: 'US' },
      { provenance_id: 'prov-002', egress_timestamp: '2026-02-26T09:15:00Z', liability_token_hash: '7d793037a076817bc004234e4d0876cb5a305e5e5d9a37e4e76e02e26eab615f', aca_record_reference: 'f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1', hri_score_at_egress: 88.12, country_of_origin: 'GB' },
      { provenance_id: 'prov-003', egress_timestamp: '2026-02-25T18:47:00Z', liability_token_hash: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', aca_record_reference: 'b2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3', hri_score_at_egress: 74.30, country_of_origin: 'DE' },
      { provenance_id: 'prov-004', egress_timestamp: '2026-02-24T11:03:00Z', liability_token_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', aca_record_reference: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4', hri_score_at_egress: 95.88, country_of_origin: 'US' },
    ],
  }),
  '/api/v1/billing/worldpay/initiate': () => ({
    payment_url: '#worldpay-mock',
    session_id: `WP-${crypto.randomUUID()}`,
  }),
};

function getMockResponse(endpoint: string, body?: any): any | null {
  const strippedEndpoint = endpoint.split('?')[0];
  const handler = mockHandlers[strippedEndpoint];
  return handler ? handler(body) : null;
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // If no real API base URL, return mock data
  if (!API_BASE_URL) {
    const bodyParsed = options.body ? JSON.parse(options.body as string) : undefined;
    const mock = getMockResponse(endpoint, bodyParsed);
    if (mock) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return mock as T;
    }
    // Fall through – if no mock handler, throw
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
