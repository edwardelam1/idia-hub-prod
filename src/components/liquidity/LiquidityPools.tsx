
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplets, TrendingUp, DollarSign, Coins, Calculator, Award, Eye, Settings, Plus, Minus } from 'lucide-react';
import { useLiquidityData } from '@/hooks/useLiquidityData';

const LiquidityPools = () => {
  const { pools, userPositions, rewards, addLiquidity, removeLiquidity, claimRewards } = useLiquidityData();
  const [selectedPool, setSelectedPool] = useState(pools[0]);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');

  const totalTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0);
  const totalUserValue = userPositions.reduce((sum, pos) => sum + pos.value, 0);
  const totalRewards = rewards.reduce((sum, reward) => sum + reward.amount, 0);

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
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Liquidity Pools</h1>
          <p className="text-sm text-muted-foreground">Provide liquidity and earn rewards on data token pairs</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">TVL: ${totalTVL.toLocaleString()}</Badge>
          <Badge variant="default">Position: ${totalUserValue.toLocaleString()}</Badge>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-lg font-bold">${totalTVL.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Value Locked</div>
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">${totalUserValue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Your Liquidity</div>
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">{totalRewards.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Pending Rewards</div>
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">12.5% - 45.8%</div>
          <div className="text-xs text-muted-foreground">APY Range</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Compact Chart */}
        <Card className="lg:col-span-2 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold">Pool Performance</h3>
              <p className="text-xs text-muted-foreground">TVL and volume trends</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Eye className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Detailed Pool Performance - {selectedPool.pair}</DialogTitle>
                  <DialogDescription>Advanced analytics and historical data</DialogDescription>
                </DialogHeader>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedPool.performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="tvl" stroke="#8884d8" strokeWidth={2} name="TVL ($)" />
                      <Line type="monotone" dataKey="volume" stroke="#82ca9d" strokeWidth={2} name="Volume ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedPool.performanceData}>
                <Line type="monotone" dataKey="tvl" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="volume" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Compact Liquidity Management */}
        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">Manage Liquidity</h3>
          <div className="space-y-2">
            <select 
              className="w-full p-1 text-xs border rounded"
              value={selectedPool.id}
              onChange={(e) => setSelectedPool(pools.find(p => p.id === e.target.value) || pools[0])}
            >
              {pools.map(pool => (
                <option key={pool.id} value={pool.id}>
                  {pool.pair} - {pool.apy.toFixed(1)}% APY
                </option>
              ))}
            </select>

            <Tabs value={actionType} onValueChange={(value) => setActionType(value as 'add' | 'remove')}>
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="add" className="text-xs">
                  <Plus className="h-3 w-3 mr-1" />Add
                </TabsTrigger>
                <TabsTrigger value="remove" className="text-xs">
                  <Minus className="h-3 w-3 mr-1" />Remove
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              type="number"
              placeholder="Amount"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
              className="h-8 text-xs"
            />

            <div className="p-2 bg-accent/50 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span>Pool Share:</span>
                <span>{selectedPool.userShare?.toFixed(4) || '0.0000'}%</span>
              </div>
              <div className="flex justify-between">
                <span>APY:</span>
                <span className="text-green-600">{selectedPool.apy.toFixed(1)}%</span>
              </div>
            </div>

            <Button 
              onClick={handleLiquidityAction}
              className="w-full h-8 text-xs"
              variant={actionType === 'add' ? 'default' : 'destructive'}
            >
              {actionType === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <Eye className="h-3 w-3 mr-1" />View All Pools
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>All Liquidity Pools</DialogTitle>
                  <DialogDescription>Browse and manage all available pools</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {pools.map(pool => (
                    <Card key={pool.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{pool.pair}</h4>
                        <Badge variant={pool.apy > 30 ? 'default' : 'secondary'}>
                          {pool.apy.toFixed(1)}% APY
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>TVL:</span>
                          <span>${pool.tvl.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>24h Volume:</span>
                          <span>${pool.volume24h.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fee:</span>
                          <span>{pool.fee}%</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />My Positions
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Your Liquidity Positions</DialogTitle>
                  <DialogDescription>Manage your current liquidity positions</DialogDescription>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pool</TableHead>
                      <TableHead>LP Tokens</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Rewards</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userPositions.map(position => (
                      <TableRow key={position.poolId}>
                        <TableCell>{position.pair}</TableCell>
                        <TableCell>{position.tokens}</TableCell>
                        <TableCell>${position.value.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">
                          +${position.rewards.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>

            {rewards.length > 0 && (
              <Button 
                onClick={() => claimRewards()}
                size="sm"
                className="w-full text-xs"
              >
                <Award className="h-3 w-3 mr-1" />
                Claim ${totalRewards.toFixed(2)}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Compact Pool List */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Top Pools</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings className="h-3 w-3 mr-1" />Manage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl">
              <DialogHeader>
                <DialogTitle>Pool Management</DialogTitle>
                <DialogDescription>Detailed view of all liquidity pools and positions</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">All Pools</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pools.map(pool => (
                      <div key={pool.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{pool.pair}</div>
                          <div className="text-sm text-muted-foreground">
                            TVL: ${pool.tvl.toLocaleString()} | Vol: ${pool.volume24h.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={pool.apy > 30 ? 'default' : 'secondary'}>
                            {pool.apy.toFixed(1)}% APY
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            Fee: {pool.fee}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Your Positions & Rewards</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">Positions</h5>
                      <div className="space-y-2">
                        {userPositions.map(position => (
                          <div key={position.poolId} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{position.pair}</div>
                              <div className="text-sm text-muted-foreground">{position.tokens} LP tokens</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${position.value.toLocaleString()}</div>
                              <div className="text-sm text-green-600">+${position.rewards.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-2">Pending Rewards</h5>
                      <div className="space-y-2">
                        {rewards.map(reward => (
                          <div key={reward.poolId} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{reward.token}</div>
                              <div className="text-sm text-muted-foreground">{reward.pair}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{reward.amount.toFixed(4)}</div>
                              <div className="text-sm text-muted-foreground">≈ ${(reward.amount * reward.usdValue).toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {pools.slice(0, 6).map(pool => (
            <div 
              key={pool.id}
              className={`p-2 border rounded cursor-pointer text-xs hover:bg-accent transition-colors ${
                selectedPool.id === pool.id ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedPool(pool)}
            >
              <div className="font-medium">{pool.pair}</div>
              <div className="text-green-600">{pool.apy.toFixed(1)}% APY</div>
              <div className="text-muted-foreground">${(pool.tvl / 1000000).toFixed(1)}M TVL</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default LiquidityPools;
