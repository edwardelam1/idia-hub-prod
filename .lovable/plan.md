

# Plan: Connect Trading & Dashboard UI to Supabase Data

## Problem
The Trading Interface and Trading Desk Dashboard display only hardcoded mock data. The `useTradingData` hook uses static `useState` values with no database queries. Dashboard metrics (API calls, latency, credits) are also hardcoded HTML.

Supabase already contains live data:
- 221 health_metrics records
- 131 staged_data records  
- 2 active marketplace_bundles

## Approach

### 1. Create a `useDashboardStats` hook with Supabase queries
- Query `health_metrics` for record counts, recent activity, and aggregated stats
- Query `marketplace_bundles` for active bundle count and category breakdown
- Query `staged_data` for processing pipeline stats
- Use the existing `check_pipeline_health` RPC function for pipeline summary
- Wire stats into the SuperAdmin overview cards (replacing hardcoded 0 values)

### 2. Update `useTradingData` hook to pull from Supabase
- Query `marketplace_bundles` to derive "token" data from real bundles (each bundle category becomes a tradeable data token with price/quality as its value)
- Query `staged_data` for volume and activity metrics
- Keep the order/trade execution as local state (no trading table exists yet), but base market data on real bundle/health records
- Add `useQuery` from TanStack React Query for caching and auto-refresh

### 3. Update `TradingDeskDashboard` metrics cards
- Replace hardcoded "47ms", "127,453 calls", "8,456 credits" with data from Supabase:
  - **Records processed**: from `check_pipeline_health` RPC
  - **Active bundles**: count from `marketplace_bundles`
  - **Credits**: from the mock API `/api/v1/synapse/balance` (already in `fetchApi`)
- Show loading skeletons while data loads

### 4. Update `SuperAdminDashboard` overview
- The overview cards already reference `healthStats.totalRecords` -- verify this is pulling correctly
- Wire `marketplace_bundles` count into `aiGeneratedBundles`
- Wire `staged_data` count into processing metrics

## Technical Details

### Files to modify:
- **`src/hooks/useTradingData.tsx`** -- Replace static arrays with Supabase queries using `useQuery`. Map `marketplace_bundles` rows into the `Token` interface (bundle title as name, price as token price, quality_score as change metric, record count as volume).
- **`src/components/trading/TradingDeskDashboard.tsx`** -- Import the updated hook data for metric cards. Replace hardcoded values with live counts.
- **`src/components/dashboards/SuperAdminDashboard.tsx`** -- Query `marketplace_bundles` count and `staged_data` count for overview stats.

### Files to create:
- **`src/hooks/useDashboardStats.tsx`** -- New hook that calls `check_pipeline_health` RPC and queries `marketplace_bundles` count, returning aggregated platform stats for dashboard consumption.

### Data mapping (marketplace_bundles to tokens):
```text
bundle.title       -> token.name
bundle.category    -> token.symbol (uppercased)
bundle.price       -> token.price
bundle.quality_score -> derived change24h
bundle.contacts_count -> token.volume24h
```

### Query pattern:
```typescript
const { data: bundles } = useQuery({
  queryKey: ['marketplace-bundles-active'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('marketplace_bundles')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data;
  }
});
```

### Fallback behavior:
- If Supabase returns empty results, fall back to existing mock data so the UI is never blank
- Show skeleton loaders during fetch
- Display "No live data" indicators when appropriate
