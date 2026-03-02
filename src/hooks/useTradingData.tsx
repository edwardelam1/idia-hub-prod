import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Token {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

interface PortfolioAsset {
  symbol: string;
  amount: number;
  value: number;
  unrealizedPnL: number;
  avgCost: number;
}

interface Order {
  id: string;
  token: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: Date;
}

interface PriceData {
  time: string;
  price: number;
}

// ── Fallback mock tokens (shown when Supabase returns nothing) ──
const MOCK_TOKENS: Token[] = [
  { symbol: 'IDIA', name: 'IDIA Hub Token', price: 24.67, change24h: 5.23, volume24h: 1240000, marketCap: 45600000 },
  { symbol: 'HEALTH', name: 'Health Data Token', price: 18.45, change24h: -2.14, volume24h: 890000, marketCap: 32100000 },
  { symbol: 'FITNESS', name: 'Fitness Analytics Token', price: 12.89, change24h: 7.56, volume24h: 650000, marketCap: 18900000 },
  { symbol: 'BIOME', name: 'Biometric Data Token', price: 9.34, change24h: -1.23, volume24h: 420000, marketCap: 12500000 },
];

const generatePriceHistory = (basePrice: number): PriceData[] => {
  const data: PriceData[] = [];
  let currentPrice = basePrice;
  for (let i = 24; i >= 0; i--) {
    currentPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.1);
    data.push({ time: `${i}h`, price: currentPrice });
  }
  return data.reverse();
};

export const useTradingData = () => {
  // ── Fetch active marketplace bundles & map to tokens ──
  const { data: liveBundles, isLoading: bundlesLoading } = useQuery({
    queryKey: ['marketplace-bundles-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_bundles')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  const tokens: Token[] = useMemo(() => {
    if (!liveBundles || liveBundles.length === 0) return MOCK_TOKENS;
    return liveBundles.map((b) => ({
      symbol: (b.category || 'DATA').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6),
      name: b.title || b.category || 'Data Bundle',
      price: (b.price ?? 0) / 100, // cents → dollars for display
      change24h: ((b.bundle_version ?? 1) % 20) - 5, // derive a pseudo-change from version
      volume24h: b.contacts_count ?? 0,
      marketCap: ((b.price ?? 0) / 100) * (b.contacts_count ?? 1) * 100,
    }));
  }, [liveBundles]);

  // ── Portfolio derived from tokens ──
  const portfolio: PortfolioAsset[] = useMemo(() => {
    return tokens.slice(0, 4).map((t) => ({
      symbol: t.symbol,
      amount: Math.round(Math.random() * 200 + 20),
      value: t.price * (Math.random() * 200 + 20),
      unrealizedPnL: t.change24h * (Math.random() * 50),
      avgCost: t.price * (1 - t.change24h / 200),
    }));
  }, [tokens]);

  // ── Orders (local state – no DB table yet) ──
  const [orders, setOrders] = useState<Order[]>([]);

  // ── Price history ──
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  useEffect(() => {
    if (tokens.length > 0) setPriceHistory(generatePriceHistory(tokens[0].price));
  }, [tokens]);

  const [marketDepth] = useState({
    bids: [
      { price: 24.65, amount: 145.67 },
      { price: 24.64, amount: 234.89 },
      { price: 24.63, amount: 567.23 },
    ],
    asks: [
      { price: 24.68, amount: 198.45 },
      { price: 24.69, amount: 345.67 },
      { price: 24.70, amount: 789.12 },
    ],
  });

  const executeOrder = (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    const newOrder: Order = {
      ...orderData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'open',
      createdAt: new Date(),
    };
    setOrders((prev) => [newOrder, ...prev]);
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) => (o.id === newOrder.id ? { ...o, status: 'filled' as const } : o))
      );
    }, Math.random() * 3000 + 2000);
  };

  const cancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' as const } : o))
    );
  };

  return {
    tokens,
    portfolio,
    orders,
    priceHistory,
    marketDepth,
    executeOrder,
    cancelOrder,
    isLoading: bundlesLoading,
  };
};
