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
}

const ShoppingCartComponent = ({ cartItems, onUpdateCart, userCredits, onPurchase }: ShoppingCartProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quoteState, setQuoteState] = useState<'idle' | 'quoting' | 'quoted' | 'error'>('idle');
  const [quotedItems, setQuotedItems] = useState<QuoteItem[]>([]);
  const [quotedTotal, setQuotedTotal] = useState(0);
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
        const bundleIds = cartItems.map(item => item.id);
        const { data, error } = await supabase.functions.invoke('quote-bundle', {
          body: { bundle_ids: bundleIds },
        });
        if (error) throw error;
        setQuotedItems(data.items || []);
        // Apply quantities
        let total = 0;
        cartItems.forEach(ci => {
          const qi = (data.items || []).find((q: QuoteItem) => q.bundle_id === ci.id);
          total += (qi?.base_valuation || ci.price) * (ci.quantity || 1);
        });
        setQuotedTotal(total);
        setQuoteState('quoted');
      } catch {
        // Fallback to cart prices
        const total = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        setQuotedTotal(total);
        setQuoteState('quoted');
      }
    };
    fetchQuote();
  }, [isOpen, cartItems]);

  const getItemPrice = (item: CartItem) => {
    const qi = quotedItems.find(q => q.bundle_id === item.id);
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
          <Button variant="outline" className="relative">
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
                    disabled={quoteState === 'quoting'}
                    className="w-full"
                  >
                    {quoteState === 'quoting' ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Quoting...</>
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
