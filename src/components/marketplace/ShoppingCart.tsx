
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Trash2, Coins, Plus, Minus } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  bundleId: number;
  bundleName: string;
  quantity?: number;
}

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateCart: (items: CartItem[]) => void;
  userCredits: number;
  onPurchase: (totalCost: number) => void;
}

const ShoppingCartComponent = ({ cartItems, onUpdateCart, userCredits, onPurchase }: ShoppingCartProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalCost = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const canAfford = userCredits >= totalCost;

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
    if (canAfford && cartItems.length > 0) {
      onPurchase(totalCost);
      setIsOpen(false);
      // Navigation to My Reports is now handled in DataMarketplace
    }
  };

  const clearCart = () => {
    onUpdateCart([]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="h-4 w-4" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-purple-600">
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
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsOpen(false)}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                          <Badge variant="outline" className="text-xs">
                            {item.bundleName}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
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
                          <Coins className="mr-1 h-3 w-3 text-purple-600" />
                          {item.price * (item.quantity || 1)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary */}
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Your Credits:</span>
                      <div className="flex items-center">
                        <Coins className="mr-1 h-3 w-3 text-purple-600" />
                        {userCredits.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total Cost:</span>
                      <div className="flex items-center">
                        <Coins className="mr-1 h-4 w-4 text-purple-600" />
                        {totalCost}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Remaining:</span>
                      <span className={canAfford ? 'text-green-600' : 'text-red-600'}>
                        {(userCredits - totalCost).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  onClick={handlePurchase}
                  disabled={!canAfford}
                  className="w-full"
                >
                  {!canAfford ? 'Insufficient Credits' : `Purchase & View Reports (${totalCost} credits)`}
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
  );
};

export default ShoppingCartComponent;
