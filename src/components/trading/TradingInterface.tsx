
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Activity } from 'lucide-react';
import { useTradingData } from '@/hooks/useTradingData';

const TradingInterface = () => {
  const { 
    tokens, 
    portfolio, 
    orders, 
    priceHistory, 
    marketDepth,
    executeOrder,
    cancelOrder 
  } = useTradingData();
  
  const [selectedToken, setSelectedToken] = useState(tokens[0]);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');

  const handleTradeSubmit = () => {
    if (!orderAmount || !orderPrice) return;
    
    executeOrder({
      token: selectedToken.symbol,
      type: orderType,
      amount: parseFloat(orderAmount),
      price: parseFloat(orderPrice)
    });
    
    setOrderAmount('');
    setOrderPrice('');
  };

  const totalPortfolioValue = portfolio.reduce((sum, asset) => sum + asset.value, 0);
  const totalPnL = portfolio.reduce((sum, asset) => sum + asset.unrealizedPnL, 0);
  const totalPnLPercent = (totalPnL / totalPortfolioValue) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Interface</h1>
          <p className="text-muted-foreground">Trade data-backed tokens and manage your portfolio</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={totalPnL >= 0 ? "default" : "destructive"}>
            Portfolio P&L: {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Portfolio Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPortfolioValue.toLocaleString()}</div>
            <div className={`flex items-center text-sm ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Available Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <div className="text-sm text-muted-foreground">Synapse Credits</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'open').length}</div>
            <div className="text-sm text-muted-foreground">Open positions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">24h Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$847K</div>
            <div className="text-sm text-green-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12.4%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Price Chart - {selectedToken.name}</CardTitle>
            <CardDescription>24-hour price movement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trading Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Token</Label>
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedToken.symbol}
                onChange={(e) => setSelectedToken(tokens.find(t => t.symbol === e.target.value) || tokens[0])}
              >
                {tokens.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>

            <Tabs value={orderType} onValueChange={(value) => setOrderType(value as 'buy' | 'sell')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleTradeSubmit}
              className="w-full"
              variant={orderType === 'buy' ? 'default' : 'destructive'}
            >
              {orderType === 'buy' ? 'Buy' : 'Sell'} {selectedToken.symbol}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Market Overview</CardTitle>
            <CardDescription>Data-backed token prices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tokens.map(token => (
                <div 
                  key={token.symbol}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedToken.symbol === token.symbol ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedToken(token)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{token.name}</div>
                      <div className="text-sm text-muted-foreground">{token.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${token.price.toFixed(4)}</div>
                    <div className={`text-sm flex items-center ${
                      token.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {token.change24h >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Holdings */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Holdings</CardTitle>
            <CardDescription>Your current positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolio.map(asset => (
                <div key={asset.symbol} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <PieChart className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{asset.symbol}</div>
                      <div className="text-sm text-muted-foreground">{asset.amount} tokens</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${asset.value.toLocaleString()}</div>
                    <div className={`text-sm ${
                      asset.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {asset.unrealizedPnL >= 0 ? '+' : ''}${asset.unrealizedPnL.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
          <CardDescription>Your active trading orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.filter(order => order.status === 'open').map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <Badge variant={order.type === 'buy' ? 'default' : 'destructive'}>
                    {order.type.toUpperCase()}
                  </Badge>
                  <div>
                    <div className="font-medium">{order.token}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.amount} @ ${order.price}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{order.status}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelOrder(order.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
            {orders.filter(order => order.status === 'open').length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No open orders
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingInterface;
