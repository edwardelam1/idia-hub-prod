import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Eye, Settings } from 'lucide-react';
import { useTradingData } from '@/hooks/useTradingData';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const TradingInterface = () => {
  const { tokens, portfolio, orders, priceHistory, executeOrder, cancelOrder } = useTradingData();
  const { credits } = useSynapseCredits();
  const { pipelineHealth } = useDashboardStats();

  const [selectedToken, setSelectedToken] = useState(tokens[0]);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');

  const handleTradeSubmit = () => {
    if (!orderAmount || !orderPrice) return;
    executeOrder({ token: selectedToken.symbol, type: orderType, amount: parseFloat(orderAmount), price: parseFloat(orderPrice) });
    setOrderAmount('');
    setOrderPrice('');
  };

  const totalPortfolioValue = portfolio.reduce((sum, asset) => sum + asset.value, 0);
  const totalPnL = portfolio.reduce((sum, asset) => sum + asset.unrealizedPnL, 0);
  const totalPnLPercent = totalPortfolioValue > 0 ? (totalPnL / totalPortfolioValue) * 100 : 0;
  const totalTransactions = pipelineHealth?.total_transactions ?? 0;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trading Interface</h1>
          <p className="text-sm text-muted-foreground">Trade data-backed tokens and manage your portfolio</p>
        </div>
        <Badge variant={totalPnL >= 0 ? "default" : "destructive"}>
          P&L: {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-lg font-bold">${totalPortfolioValue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Portfolio Value</div>
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">{credits.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Synapse Credits</div>
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">{orders.filter(o => o.status === 'open').length}</div>
          <div className="text-xs text-muted-foreground">Active Orders</div>
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">{totalTransactions.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Transactions</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Card className="lg:col-span-2 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold">Price Chart - {selectedToken?.name}</h3>
              <p className="text-xs text-muted-foreground">24-hour price movement</p>
            </div>
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Eye className="h-3 w-3" /></Button></DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Detailed Price Chart - {selectedToken?.name}</DialogTitle>
                  <DialogDescription>Advanced charting and technical analysis</DialogDescription>
                </DialogHeader>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceHistory}>
                      <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistory}>
                <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">Quick Trade</h3>
          <div className="space-y-2">
            <select
              className="w-full p-1 text-xs border rounded bg-background text-foreground"
              value={selectedToken?.symbol}
              onChange={(e) => setSelectedToken(tokens.find(t => t.symbol === e.target.value) || tokens[0])}
            >
              {tokens.map(token => (
                <option key={token.symbol} value={token.symbol}>{token.symbol} - ${token.price.toFixed(2)}</option>
              ))}
            </select>
            <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'buy' | 'sell')}>
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="buy" className="text-xs">Buy</TabsTrigger>
                <TabsTrigger value="sell" className="text-xs">Sell</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input type="number" placeholder="Amount" value={orderAmount} onChange={e => setOrderAmount(e.target.value)} className="h-8 text-xs" />
            <Input type="number" placeholder="Price" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} className="h-8 text-xs" />
            <Button onClick={handleTradeSubmit} className="w-full h-8 text-xs" variant={orderType === 'buy' ? 'default' : 'destructive'}>
              {orderType === 'buy' ? 'Buy' : 'Sell'} {selectedToken?.symbol}
            </Button>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Market</h3>
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Settings className="h-3 w-3" /></Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Market Overview</DialogTitle>
                  <DialogDescription>Detailed token information and market data</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {tokens.map(token => (
                    <div key={token.symbol} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{token.name}</div>
                        <div className="text-sm text-muted-foreground">{token.symbol}</div>
                        <div className="text-xs text-muted-foreground">Vol: {token.volume24h?.toLocaleString()} | MCap: ${token.marketCap?.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${token.price.toFixed(4)}</div>
                        <div className={`text-sm ${token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {tokens.slice(0, 4).map(token => (
              <div key={token.symbol} className="flex items-center justify-between p-1 text-xs hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedToken(token)}>
                <span>{token.symbol}</span>
                <div className="text-right">
                  <div>${token.price.toFixed(2)}</div>
                  <div className={token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Portfolio</h3>
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Eye className="h-3 w-3" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Portfolio Details</DialogTitle>
                  <DialogDescription>Your complete portfolio breakdown</DialogDescription>
                </DialogHeader>
                <Table>
                  <TableHeader><TableRow><TableHead>Token</TableHead><TableHead>Amount</TableHead><TableHead>Value</TableHead><TableHead>P&L</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {portfolio.map(asset => (
                      <TableRow key={asset.symbol}>
                        <TableCell>{asset.symbol}</TableCell>
                        <TableCell>{asset.amount}</TableCell>
                        <TableCell>${asset.value.toLocaleString()}</TableCell>
                        <TableCell className={asset.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {asset.unrealizedPnL >= 0 ? '+' : ''}${asset.unrealizedPnL.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {portfolio.map(asset => (
              <div key={asset.symbol} className="flex items-center justify-between text-xs">
                <span>{asset.symbol}</span>
                <div className="text-right">
                  <div>${asset.value.toLocaleString()}</div>
                  <div className={asset.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {asset.unrealizedPnL >= 0 ? '+' : ''}${asset.unrealizedPnL.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Open Orders</h3>
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Eye className="h-3 w-3" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Order Management</DialogTitle>
                  <DialogDescription>View and manage all your trading orders</DialogDescription>
                </DialogHeader>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Token</TableHead><TableHead>Amount</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell><Badge variant={order.type === 'buy' ? 'default' : 'destructive'}>{order.type.toUpperCase()}</Badge></TableCell>
                        <TableCell>{order.token}</TableCell>
                        <TableCell>{order.amount}</TableCell>
                        <TableCell>${order.price}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{order.status === 'open' && <Button size="sm" variant="outline" onClick={() => cancelOrder(order.id)}>Cancel</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {orders.filter(o => o.status === 'open').slice(0, 3).map(order => (
              <div key={order.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={order.type === 'buy' ? 'default' : 'destructive'} className="text-xs">{order.type.toUpperCase()}</Badge>
                  <span>{order.token}</span>
                </div>
                <div className="text-right">
                  <div>{order.amount} @ ${order.price}</div>
                  <Button size="sm" variant="ghost" onClick={() => cancelOrder(order.id)} className="h-4 text-xs">Cancel</Button>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status === 'open').length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">No open orders</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TradingInterface;
