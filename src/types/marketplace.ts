export interface Bundle {
  bundle_id: string;
  id: string; // For compatibility
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
  keyInsights?: string[];
  dataPoints?: string[];
  suggestedFilters?: string[];
  price?: number;
  dataJson?: any;
  matchPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  bundleId: string;
  bundleName: string;
  quantity?: number;
}

export interface DataRecord {
  id: string;
  [key: string]: any;
}