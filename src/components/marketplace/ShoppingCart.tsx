import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Trash2, Coins, Plus, Minus, Loader2, AlertTriangle } from 'lucide-react';
import { CartItem } from '@/types/marketplace';
import { supabase } from '@/integrations/supabase/client';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import SynapsePurchaseModal from '@/components/billing/SynapsePurchaseModal';

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateCart: (items: CartItem[]) => void;
  userCredits: number;
  onPurchase: (totalCost: number) => void;
}

interface QuoteItem {
  bundle_id: string;
  name: string;
  base_valuation: number;
  streams?: string[];
  stale?: boolean;
  unavailable?: boolean;
}

const ShoppingCartComponent = ({ cartItems, onUpdateCart, userCredits, onPurchase }: ShoppingCartProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quoteState, setQuoteState] = useState<'idle' | 'quoting' | 'quoted' | 'error'>('idle');
  const [quotedItems, setQuotedItems] = useState<QuoteItem[]>([]);
  const [quotedTotal, setQuotedTotal] = useState(0);
  const [quoteNonce, setQuoteNonce] = useState(0);
  const { checkCredits, showTopUp, shortfall, dismissTopUp } = useCreditCheck();

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const canAfford = userCredits >= quotedTotal;

  // Fetch quote when cart opens or items change
  useEffect(() => {
    if (!isOpen || cartItems.length === 0) {
      setQuoteState('idle');
      return;
    }
    const fetchQuote = async () => {
      setQuoteState('quoting');
      try {
        const { data, error } = await supabase.functions.invoke('quote-bundle', {
          body: {
            items: cartItems.map(item => ({
              bundle_id: item.bundleId ?? item.id,
              streams: item.streams ?? null,
              quantity: item.quantity ?? 1,
              price: item.price,
            })),
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setQuotedItems(data.items || []);
        setQuotedTotal(Number(data.total ?? 0));
        setQuoteState('quoted');
      } catch (err) {
        // Never silently fall back to a page price — the server is the authority.
        console.error('[ShoppingCart][quote] failed:', err);
        setQuotedItems([]);
        setQuotedTotal(0);
        setQuoteState('error');
      }
    };
    fetchQuote();
  }, [isOpen, cartItems, quoteNonce]);

  const getItemPrice = (item: CartItem) => {
    const key = item.bundleId ?? item.id;
    const qi = quotedItems.find(q => {
      if (q.bundle_id !== key) return false;
      const qStreams = [...(q.streams ?? [])].sort().join('+');
      const iStreams = [...(item.streams ?? [])].sort().join('+');
      return qStreams === iStreams;
    });
    return qi?.base_valuation ?? item.price;
  };

  const removeItem = (itemId: string) => {
    onUpdateCart(cartItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, change: number) => {
    const updatedItems = cartItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, (item.quantity || 1) + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    onUpdateCart(updatedItems);
  };

  const handlePurchase = () => {
    if (quoteState !== 'quoted') return;
    if (!checkCredits(quotedTotal)) return;
    if (canAfford && cartItems.length > 0) {
      onPurchase(quotedTotal);
      setIsOpen(false);
    }
  };

  const clearCart = () => {
    onUpdateCart([]);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" aria-label="Open cart" className="relative h-9 w-9 shrink-0 p-0 sm:h-10 sm:w-auto sm:px-4">
            <ShoppingCart className="h-4 w-4" />
            {totalItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-primary">
                {totalItems}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Shopping Cart ({totalItems})
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsOpen(false)}>
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <>
                {/* Quoting state */}
                {quoteState === 'quoting' && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-primary font-medium">Fetching live pricing...</span>
                  </div>
                )}

                {quoteState === 'error' && (
                  <div className="flex items-center justify-between gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <span className="text-sm text-destructive font-medium">
                      We couldn't confirm live pricing. Please try again.
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setQuoteNonce(n => n + 1)}>
                      Retry
                    </Button>
                  </div>
                )}

                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const price = getItemPrice(item);
                    return (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                              <Badge variant="outline" className="text-xs">
                                {item.bundleName}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-destructive hover:text-destructive p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={(item.quantity || 1) <= 1}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium">{item.quantity || 1}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center font-semibold">
                              <Coins className="mr-1 h-3 w-3 text-primary" />
                              {(price * (item.quantity || 1)).toLocaleString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Summary */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Your Credits:</span>
                        <div className="flex items-center">
                          <Coins className="mr-1 h-3 w-3 text-primary" />
                          {userCredits.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total Cost:</span>
                        <div className="flex items-center">
                          <Coins className="mr-1 h-4 w-4 text-primary" />
                          {quoteState === 'quoting' ? '...' : quotedTotal.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Remaining:</span>
                        <span className={canAfford ? 'text-emerald-500' : 'text-destructive'}>
                          {(userCredits - quotedTotal).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="space-y-2">
                  <Button 
                    onClick={handlePurchase}
                    disabled={quoteState !== 'quoted'}
                    className="w-full"
                  >
                    {quoteState === 'quoting' ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Quoting...</>
                    ) : quoteState === 'error' ? (
                      'Pricing unavailable'
                    ) : !canAfford ? (
                      'Insufficient Credits'
                    ) : (
                      `Confirm Purchase (${quotedTotal.toLocaleString()} CRD)`
                    )}
                  </Button>
                  <Button variant="outline" onClick={clearCart} className="w-full">
                    Clear Cart
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Insufficient Funds Modal */}
      {showTopUp && (
        <SynapsePurchaseModal
          trigger={<span />}
          defaultOpen={true}
          onOpenChange={(open) => { if (!open) dismissTopUp(); }}
          insufficientWarning={`You need ${shortfall.toLocaleString()} more CRD to complete this action.`}
        />
      )}
    </>
  );
};

export default ShoppingCartComponent;
