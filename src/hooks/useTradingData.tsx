
import { useState, useEffect } from 'react';

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

const generatePriceHistory = (basePrice: number): PriceData[] => {
  const data: PriceData[] = [];
  let currentPrice = basePrice;
  
  for (let i = 24; i >= 0; i--) {
    const volatility = (Math.random() - 0.5) * 0.1;
    currentPrice = currentPrice * (1 + volatility);
    data.push({
      time: `${i}h`,
      price: currentPrice
    });
  }
  
  return data.reverse();
};

export const useTradingData = () => {
  const [tokens] = useState<Token[]>([
    {
      symbol: 'IDIA',
      name: 'IDIA Hub Token',
      price: 24.67,
      change24h: 5.23,
      volume24h: 1240000,
      marketCap: 45600000
    },
    {
      symbol: 'HEALTH',
      name: 'Health Data Token',
      price: 18.45,
      change24h: -2.14,
      volume24h: 890000,
      marketCap: 32100000
    },
    {
      symbol: 'FITNESS',
      name: 'Fitness Analytics Token',
      price: 12.89,
      change24h: 7.56,
      volume24h: 650000,
      marketCap: 18900000
    },
    {
      symbol: 'BIOME',
      name: 'Biometric Data Token',
      price: 9.34,
      change24h: -1.23,
      volume24h: 420000,
      marketCap: 12500000
    },
    {
      symbol: 'VITALS',
      name: 'Vital Signs Token',
      price: 15.67,
      change24h: 3.45,
      volume24h: 780000,
      marketCap: 28400000
    },
    {
      symbol: 'GENOME',
      name: 'Genomic Data Token',
      price: 45.23,
      change24h: 12.67,
      volume24h: 1560000,
      marketCap: 67800000
    },
    {
      symbol: 'SLEEP',
      name: 'Sleep Analytics Token',
      price: 7.89,
      change24h: -0.78,
      volume24h: 340000,
      marketCap: 8900000
    },
    {
      symbol: 'NEURO',
      name: 'Neural Data Token',
      price: 78.45,
      change24h: 18.23,
      volume24h: 2340000,
      marketCap: 145600000
    }
  ]);

  const [portfolio] = useState<PortfolioAsset[]>([
    {
      symbol: 'IDIA',
      amount: 145.67,
      value: 3593.18,
      unrealizedPnL: 234.56,
      avgCost: 23.45
    },
    {
      symbol: 'HEALTH',
      amount: 89.23,
      value: 1646.19,
      unrealizedPnL: -45.67,
      avgCost: 18.96
    },
    {
      symbol: 'FITNESS',
      amount: 234.56,
      value: 3022.46,
      unrealizedPnL: 567.89,
      avgCost: 10.46
    },
    {
      symbol: 'GENOME',
      amount: 23.45,
      value: 1060.64,
      unrealizedPnL: 123.45,
      avgCost: 39.98
    }
  ]);

  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      token: 'IDIA',
      type: 'buy',
      amount: 50,
      price: 24.50,
      status: 'open',
      createdAt: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      token: 'HEALTH',
      type: 'sell',
      amount: 25,
      price: 19.00,
      status: 'open',
      createdAt: new Date(Date.now() - 7200000)
    },
    {
      id: '3',
      token: 'FITNESS',
      type: 'buy',
      amount: 100,
      price: 12.75,
      status: 'filled',
      createdAt: new Date(Date.now() - 86400000)
    }
  ]);

  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
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
    ]
  });

  useEffect(() => {
    setPriceHistory(generatePriceHistory(24.67));
  }, []);

  const executeOrder = (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    const newOrder: Order = {
      ...orderData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'open',
      createdAt: new Date()
    };
    
    setOrders(prev => [newOrder, ...prev]);
    
    // Simulate order execution after 2-5 seconds
    setTimeout(() => {
      setOrders(prev => prev.map(order => 
        order.id === newOrder.id 
          ? { ...order, status: 'filled' as const }
          : order
      ));
    }, Math.random() * 3000 + 2000);
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' as const }
        : order
    ));
  };

  return {
    tokens,
    portfolio,
    orders,
    priceHistory,
    marketDepth,
    executeOrder,
    cancelOrder
  };
};
