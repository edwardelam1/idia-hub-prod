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

// Fallback tokens when Supabase has no data
const MOCK_TOKENS: Token[] = [
  { symbol: 'IDIA', name: 'IDIA Hub Token', price: 24.67, change24h: 5.23, volume24h: 1240000, marketCap: 45600000 },
  { symbol: 'HEALTH', name: 'Health Data Token', price: 18.45, change24h: -2.14, volume24h: 890000, marketCap: 32100000 },
  { symbol: 'FITNESS', name: 'Fitness Analytics Token', price: 12.89, change24h: 7.56, volume24h: 650000, marketCap: 18900000 },
  { symbol: 'BIOME', name: 'Biometric Data Token', price: 9.34, change24h: -1.23, volume24h: 420000, marketCap: 12500000 },
];

// Deterministic hash for seeding
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const generatePriceHistory = (basePrice: number, symbol: string): PriceData[] => {
  const data: PriceData[] = [];
  let currentPrice = basePrice;
  const seed = simpleHash(symbol);
  for (let i = 24; i >= 0; i--) {
    currentPrice = currentPrice * (1 + (seededRandom(seed + i) - 0.5) * 0.1);
    data.push({ time: `${i}h`, price: currentPrice });
  }
  return data.reverse();
};

export const useTradingData = () => {
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
      price: (b.price ?? 0) / 100,
      change24h: ((b.bundle_version ?? 1) % 20) - 5,
      volume24h: b.contacts_count ?? 0,
      marketCap: ((b.price ?? 0) / 100) * (b.contacts_count ?? 1) * 100,
    }));
  }, [liveBundles]);

  // Deterministic portfolio derived from tokens
  const portfolio: PortfolioAsset[] = useMemo(() => {
    return tokens.slice(0, 4).map((t) => {
      const seed = simpleHash(t.symbol);
      const amount = Math.round(seededRandom(seed) * 200 + 20);
      const value = t.price * amount;
      const pnl = t.change24h * seededRandom(seed + 1) * 50;
      return {
        symbol: t.symbol,
        amount,
        value,
        unrealizedPnL: pnl,
        avgCost: t.price * (1 - t.change24h / 200),
      };
    });
  }, [tokens]);

  const [orders, setOrders] = useState<Order[]>([]);

  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  useEffect(() => {
    if (tokens.length > 0) setPriceHistory(generatePriceHistory(tokens[0].price, tokens[0].symbol));
  }, [tokens]);

  // No mock market depth — empty until live order book exists
  const marketDepth = { bids: [] as { price: number; amount: number }[], asks: [] as { price: number; amount: number }[] };

  const executeOrder = (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    const newOrder: Order = {
      ...orderData,
      id: crypto.randomUUID(),
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
