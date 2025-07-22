
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Droplets, TrendingUp, DollarSign, Coins, Calculator, Award } from 'lucide-react';
import { useLiquidityData } from '@/hooks/useLiquidityData';

const LiquidityPools = () => {
  const { pools, userPositions, rewards, addLiquidity, removeLiquidity, claimRewards } = useLiquidityData();
  const [selectedPool, setSelectedPool] = useState(pools[0]);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');

  const totalTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0);
  const totalUserValue = userPositions.reduce((sum, pos) => sum + pos.value, 0);
  const totalRewards = rewards.reduce((sum, reward) => sum + reward.amount, 0);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  const handleLiquidityAction = () => {
    if (!liquidityAmount) return;
    
    if (actionType === 'add') {
      addLiquidity(selectedPool.id, parseFloat(liquidityAmount));
    } else {
      removeLiquidity(selectedPool.id, parseFloat(liquidityAmount));
    }
    
    setLiquidityAmount('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Liquidity Pools</h1>
          <p className="text-muted-foreground">Provide liquidity and earn rewards on data token pairs</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            Total TVL: ${totalTVL.toLocaleString()}
          </Badge>
          <Badge variant="default">
            Your Position: ${totalUserValue.toLocaleString()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Value Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalTVL.toLocaleString()}</div>
            <div className="text-sm text-green-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              +8.5% this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUserValue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{userPositions.length} pools</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRewards.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">IDIA tokens</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">APY Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5% - 45.8%</div>
            <div className="text-sm text-muted-foreground">Across all pools</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pool Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pool Performance</CardTitle>
            <CardDescription>TVL and volume trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedPool.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="tvl" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="TVL ($)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Volume ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Add/Remove Liquidity */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Liquidity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pool</Label>
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedPool.id}
                onChange={(e) => setSelectedPool(pools.find(p => p.id === e.target.value) || pools[0])}
              >
                {pools.map(pool => (
                  <option key={pool.id} value={pool.id}>
                    {pool.pair} - {pool.apy.toFixed(1)}% APY
                  </option>
                ))}
              </select>
            </div>

            <Tabs value={actionType} onValueChange={(value) => setActionType(value as 'add' | 'remove')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add">Add Liquidity</TabsTrigger>
                <TabsTrigger value="remove">Remove</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>{actionType === 'add' ? 'Amount to Add' : 'Amount to Remove'}</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={liquidityAmount}
                onChange={(e) => setLiquidityAmount(e.target.value)}
              />
            </div>

            <div className="p-3 bg-accent/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pool Share:</span>
                <span>{selectedPool.userShare?.toFixed(4) || '0.0000'}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current APY:</span>
                <span className="text-green-600">{selectedPool.apy.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pool Fee:</span>
                <span>{selectedPool.fee}%</span>
              </div>
            </div>

            <Button 
              onClick={handleLiquidityAction}
              className="w-full"
              variant={actionType === 'add' ? 'default' : 'destructive'}
            >
              {actionType === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Pools */}
      <Card>
        <CardHeader>
          <CardTitle>Active Liquidity Pools</CardTitle>
          <CardDescription>All available pools for liquidity provision</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map(pool => (
              <Card 
                key={pool.id}
                className={`cursor-pointer transition-colors ${
                  selectedPool.id === pool.id ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedPool(pool)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pool.pair}</CardTitle>
                    <Badge variant={pool.apy > 30 ? 'default' : 'secondary'}>
                      {pool.apy.toFixed(1)}% APY
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">TVL</span>
                    <span className="font-medium">${pool.tvl.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">24h Volume</span>
                    <span className="font-medium">${pool.volume24h.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fee</span>
                    <span className="font-medium">{pool.fee}%</span>
                  </div>
                  {pool.userShare && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Your Share</span>
                      <span className="font-medium text-green-600">{pool.userShare.toFixed(4)}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Positions</CardTitle>
            <CardDescription>Your current liquidity positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userPositions.map(position => (
                <div key={position.poolId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Droplets className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{position.pair}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.tokens} LP tokens
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${position.value.toLocaleString()}</div>
                    <div className="text-sm text-green-600">
                      +${position.rewards.toFixed(2)} rewards
                    </div>
                  </div>
                </div>
              ))}
              {userPositions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No active positions
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Rewards</CardTitle>
            <CardDescription>Claimable rewards from your positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rewards.map(reward => (
                <div key={reward.poolId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Award className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">{reward.token}</div>
                      <div className="text-sm text-muted-foreground">{reward.pair}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{reward.amount.toFixed(4)}</div>
                    <div className="text-sm text-muted-foreground">
                      ≈ ${(reward.amount * reward.usdValue).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
              {rewards.length > 0 && (
                <Button 
                  onClick={() => claimRewards()}
                  className="w-full"
                >
                  Claim All Rewards (${totalRewards.toFixed(2)})
                </Button>
              )}
              {rewards.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No pending rewards
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiquidityPools;
