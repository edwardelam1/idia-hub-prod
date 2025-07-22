
import { useState } from 'react';

interface Pool {
  id: string;
  pair: string;
  tvl: number;
  volume24h: number;
  apy: number;
  fee: number;
  userShare?: number;
  performanceData: Array<{
    date: string;
    tvl: number;
    volume: number;
  }>;
}

interface UserPosition {
  poolId: string;
  pair: string;
  tokens: number;
  value: number;
  rewards: number;
}

interface Reward {
  poolId: string;
  pair: string;
  token: string;
  amount: number;
  usdValue: number;
}

const generatePerformanceData = () => {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      tvl: Math.random() * 1000000 + 500000,
      volume: Math.random() * 200000 + 50000
    });
  }
  return data;
};

export const useLiquidityData = () => {
  const [pools] = useState<Pool[]>([
    {
      id: '1',
      pair: 'IDIA/USDC',
      tvl: 2450000,
      volume24h: 450000,
      apy: 24.5,
      fee: 0.3,
      userShare: 0.0234,
      performanceData: generatePerformanceData()
    },
    {
      id: '2',
      pair: 'HEALTH/IDIA',
      tvl: 1850000,
      volume24h: 320000,
      apy: 32.1,
      fee: 0.3,
      userShare: 0.0156,
      performanceData: generatePerformanceData()
    },
    {
      id: '3',
      pair: 'FITNESS/USDC',
      tvl: 1200000,
      volume24h: 180000,
      apy: 28.7,
      fee: 0.3,
      performanceData: generatePerformanceData()
    },
    {
      id: '4',
      pair: 'GENOME/IDIA',
      tvl: 3200000,
      volume24h: 680000,
      apy: 45.8,
      fee: 0.5,
      userShare: 0.0087,
      performanceData: generatePerformanceData()
    },
    {
      id: '5',
      pair: 'VITALS/HEALTH',
      tvl: 890000,
      volume24h: 125000,
      apy: 35.2,
      fee: 0.3,
      performanceData: generatePerformanceData()
    },
    {
      id: '6',
      pair: 'NEURO/USDC',
      tvl: 4100000,
      volume24h: 890000,
      apy: 18.9,
      fee: 0.25,
      performanceData: generatePerformanceData()
    },
    {
      id: '7',
      pair: 'SLEEP/FITNESS',
      tvl: 650000,
      volume24h: 95000,
      apy: 41.3,
      fee: 0.5,
      performanceData: generatePerformanceData()
    },
    {
      id: '8',
      pair: 'BIOME/HEALTH',
      tvl: 1100000,
      volume24h: 160000,
      apy: 29.8,
      fee: 0.3,
      performanceData: generatePerformanceData()
    }
  ]);

  const [userPositions] = useState<UserPosition[]>([
    {
      poolId: '1',
      pair: 'IDIA/USDC',
      tokens: 245.67,
      value: 12450,
      rewards: 156.78
    },
    {
      poolId: '2',
      pair: 'HEALTH/IDIA',
      tokens: 89.23,
      value: 5680,
      rewards: 89.45
    },
    {
      poolId: '4',
      pair: 'GENOME/IDIA',
      tokens: 34.56,
      value: 8900,
      rewards: 234.56
    }
  ]);

  const [rewards] = useState<Reward[]>([
    {
      poolId: '1',
      pair: 'IDIA/USDC',
      token: 'IDIA',
      amount: 6.789,
      usdValue: 24.67
    },
    {
      poolId: '2',
      pair: 'HEALTH/IDIA',
      token: 'IDIA',
      amount: 3.456,
      usdValue: 24.67
    },
    {
      poolId: '4',
      pair: 'GENOME/IDIA',
      token: 'IDIA',
      amount: 12.345,
      usdValue: 24.67
    }
  ]);

  const addLiquidity = (poolId: string, amount: number) => {
    console.log(`Adding ${amount} liquidity to pool ${poolId}`);
    // Simulate adding liquidity
  };

  const removeLiquidity = (poolId: string, amount: number) => {
    console.log(`Removing ${amount} liquidity from pool ${poolId}`);
    // Simulate removing liquidity
  };

  const claimRewards = () => {
    console.log('Claiming all rewards');
    // Simulate claiming rewards
  };

  return {
    pools,
    userPositions,
    rewards,
    addLiquidity,
    removeLiquidity,
    claimRewards
  };
};
