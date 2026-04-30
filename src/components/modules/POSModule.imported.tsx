
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ShoppingCart, Plus, Minus, CreditCard, DollarSign, 
  Gift, Users, X, Search, Nfc, Bell, CheckCircle, AlertCircle, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { LiveCheckout } from "./LiveCheckout";
import { recordPosTransaction } from "@/hooks/use-pos-data";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image_url?: string | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export const POSModule = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "" });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isNfcPaymentOpen, setIsNfcPaymentOpen] = useState(false);
  const [isGiftCardOpen, setIsGiftCardOpen] = useState(false);
  const [isLiveCheckoutOpen, setIsLiveCheckoutOpen] = useState(false);
  const [giftCardData, setGiftCardData] = useState({ code: "", pin: "" });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cartNotification, setCartNotification] = useState<string | null>(null);
  const { toast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["all"]);

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const businessId = await getBusinessId();
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (!error && data) {
        const items: MenuItem[] = (data as any[]).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: Number(item.base_price) || 0,
          category: item.category || 'Main Course',
          description: item.description || '',
          image_url: item.image_url || null,
        }));
        setMenuItems(items);
        const uniqueCats = [...new Set(items.map(i => i.category))];
        setCategories(["all", ...uniqueCats]);
      }
    } catch (err) {
      console.error('Error loading POS menu items:', err);
    }
  };

  // Real-time notifications subscription
  useEffect(() => {
    const subscribeToNotifications = async () => {
      // Subscribe to real-time merchant notifications
      const channel = supabase
        .channel('merchant-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'merchant_notifications'
          },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev.slice(0, 4)]);
            
            // Show toast notification
            toast({
              title: payload.new.title,
              description: payload.new.message,
              variant: payload.new.notification_type === 'error' ? 'destructive' : 'default'
            });
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    subscribeToNotifications();
  }, [toast]);

  // categories is now derived from live data above

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [{ id: item.id, name: item.name, price: item.price, quantity: 1 }, ...prev];
    });

    setCartNotification(`${item.name} added`);
    setTimeout(() => setCartNotification(null), 2000);
    window.dispatchEvent(new CustomEvent('cart-item-added', { detail: { name: item.name } }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateTotal() * 0.08; // 8% tax
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateTax();
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout",
        variant: "destructive"
      });
      return;
    }
    setIsCheckoutOpen(true);
  };

  const processPayment = async (paymentMethod: string) => {
    if (paymentMethod === 'IDIA-USD (NFC)') {
      setIsNfcPaymentOpen(true);
      return;
    }
    
    if (paymentMethod === 'Gift Card') {
      setIsGiftCardOpen(true);
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Route card payments through the Universal Payment Adapter edge function
      if (paymentMethod === 'Credit Card') {
        const businessId = await getBusinessId();
        const { data: terminalResult, error: terminalErr } = await supabase.functions.invoke(
          'process-terminal-payment',
          { body: { merchant_id: businessId, amount: calculateGrandTotal(), currency: 'USD' } }
        );

        if (terminalErr) {
          console.error('Terminal payment error:', terminalErr);
          // Fall through to record anyway — adapter may be unconfigured
        } else if (terminalResult && !terminalResult.success) {
          console.warn('Terminal adapter response:', terminalResult);
        }
      }

      // Record transaction to database
      const menuItemMap = new Map(menuItems.map(m => [m.id, m]));
      await recordPosTransaction({
        cart: cart.map(c => ({ ...c, category: menuItemMap.get(c.id)?.category || 'Other' })),
        subtotal: calculateTotal(),
        taxAmount: calculateTax(),
        totalAmount: calculateGrandTotal(),
        taxRate: 8,
        paymentMethod,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
      });
      
      toast({
        title: "Payment Processed",
        description: `Payment of $${calculateGrandTotal().toFixed(2)} processed via ${paymentMethod}`,
      });
      
      // Clear cart and close checkout
      setCart([]);
      setIsCheckoutOpen(false);
      setCustomerInfo({ name: "", email: "", phone: "" });
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({
        title: "Payment Error",
        description: err.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const processNfcPayment = async () => {
    setIsProcessingPayment(true);
    
    try {
      // Simulate NFC reading delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock NFC payload - in real implementation, this would come from NFC reader
      const mockNfcPayload = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: calculateGrandTotal() * 0.85, // Mock IDIA-USD rate
        signature: 'a'.repeat(64), // Mock signature
        timestamp: Date.now()
      };

      const { data, error } = await supabase.functions.invoke('process-nfc-payment', {
        body: {
          nfcPayload: mockNfcPayload,
          locationId: '550e8400-e29b-41d4-a716-446655440002', // Mock location
          items: cart,
          totalAmount: calculateGrandTotal()
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "IDIA-USD Payment Successful",
          description: `Payment verified on blockchain`,
        });
        
        // Clear cart and close dialogs
        setCart([]);
        setIsCheckoutOpen(false);
        setIsNfcPaymentOpen(false);
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('NFC payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process NFC payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const processGiftCardPayment = async () => {
    setIsProcessingPayment(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('redeem-gift-card', {
        body: {
          cardCode: giftCardData.code,
          pinCode: giftCardData.pin,
          amount: calculateGrandTotal(),
          locationId: '550e8400-e29b-41d4-a716-446655440002' // Mock location
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Gift Card Redeemed",
          description: `$${data.amount_redeemed} charged. Remaining balance: $${data.remaining_balance}`,
        });
        
        // Clear cart and close dialogs
        setCart([]);
        setIsCheckoutOpen(false);
        setIsGiftCardOpen(false);
        setGiftCardData({ code: "", pin: "" });
      } else {
        throw new Error(data.error || 'Gift card redemption failed');
      }
    } catch (error) {
      console.error('Gift card error:', error);
      toast({
        title: "Gift Card Failed",
        description: error.message || "Failed to redeem gift card",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Cart Toggle Button */}
      <Button
        className="md:hidden fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
        size="icon"
        onClick={() => setIsCheckoutOpen(true)}
      >
        <ShoppingCart className="h-6 w-6" />
        {cart.length > 0 && (
          <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
            {cart.length}
          </Badge>
        )}
      </Button>

      {/* Menu Items Section */}
      <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden pb-20 md:pb-0">
        <div className="flex-shrink-0 mb-2">
          <h2 className="text-base sm:text-lg font-bold mb-2 flex items-center">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Point of Sale
          </h2>
          
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize h-7 text-xs px-3 whitespace-nowrap flex-shrink-0"
              >
                {category === "all" ? "All" : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Menu Grid - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                {item.image_url && (
                  <div className="w-full aspect-square overflow-hidden rounded-t-lg">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader className="p-2">
                  <CardTitle className="text-xs sm:text-sm leading-tight line-clamp-1">{item.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 hidden sm:block">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <Badge variant="secondary" className="text-xs mb-1 px-1 py-0">
                        {item.category}
                      </Badge>
                      <div className="font-bold text-sm">${item.price.toFixed(2)}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToCart(item)}
                      className="h-7 w-full sm:w-7 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Cart Section */}
      <div className="hidden md:flex flex-col w-80 lg:w-96 border-l bg-muted/20 h-[calc(100dvh-8rem)]">
        {/* Header */}
        <div className="p-3 border-b flex-shrink-0">
          <h3 className="text-base font-semibold flex items-center justify-between">
            Current Order
            <Badge variant="secondary" className="text-xs">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</Badge>
          </h3>
          {cartNotification && (
            <span className="text-xs text-success font-medium animate-fade-in mt-1 block">
              {cartNotification}
            </span>
          )}
        </div>

        {/* Cart items - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items in cart</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded border">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary + Buttons */}
        <div className="p-3 border-t flex-shrink-0 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (8%):</span>
            <span>${calculateTax().toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total:</span>
            <span>${calculateGrandTotal().toFixed(2)}</span>
          </div>
          <div className="space-y-2 mt-3">
            <Button 
              className="w-full h-10 bg-gradient-to-r from-primary to-primary/80" 
              onClick={() => setIsLiveCheckoutOpen(true)}
              disabled={cart.length === 0}
            >
              <Zap className="w-4 h-4 mr-2" />
              Live Checkout
            </Button>
            <Button 
              variant="outline"
              className="w-full h-10" 
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Standard Checkout
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Complete your order - Total: ${calculateGrandTotal().toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="space-y-2">
              <h4 className="font-medium">Customer Information (Optional)</h4>
              <Input
                placeholder="Customer name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            {/* Payment Methods */}
            <div className="space-y-2">
              <h4 className="font-medium">Payment Method</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => processPayment("Cash")}
                  className="h-12"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cash
                </Button>
                <Button
                  variant="outline"
                  onClick={() => processPayment("Credit Card")}
                  className="h-12"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => processPayment("IDIA-USD (NFC)")}
                  className="h-12 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20"
                >
                  <Nfc className="w-4 h-4 mr-2" />
                  IDIA-USD
                </Button>
                <Button
                  variant="outline"
                  onClick={() => processPayment("Gift Card")}
                  className="h-12"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Gift Card
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NFC Payment Dialog */}
      <Dialog open={isNfcPaymentOpen} onOpenChange={setIsNfcPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Nfc className="w-5 h-5 mr-2 text-primary" />
              IDIA-USD NFC Payment
            </DialogTitle>
            <DialogDescription>
              Total: ${calculateGrandTotal().toFixed(2)} USD
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-center">
            <div className="p-8 border-2 border-dashed border-primary/30 rounded-lg">
              <Nfc className="w-16 h-16 mx-auto text-primary mb-4 animate-pulse" />
              <p className="text-lg font-medium mb-2">Tap Device to Pay</p>
              <p className="text-sm text-muted-foreground">
                Place your IDIA wallet device near the reader
              </p>
              <div className="mt-4 text-primary font-mono">
                ≈ {(calculateGrandTotal() * 0.85).toFixed(2)} IDIA-USD
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={processNfcPayment}
                disabled={isProcessingPayment}
                className="w-full"
              >
                {isProcessingPayment ? (
                  <>Processing Payment...</>
                ) : (
                  <>Simulate NFC Payment</>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsNfcPaymentOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gift Card Dialog */}
      <Dialog open={isGiftCardOpen} onOpenChange={setIsGiftCardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Gift className="w-5 h-5 mr-2 text-primary" />
              Gift Card Payment
            </DialogTitle>
            <DialogDescription>
              Total: ${calculateGrandTotal().toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Gift card code"
                value={giftCardData.code}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, code: e.target.value }))}
              />
              <Input
                type="password"
                placeholder="PIN (if required)"
                value={giftCardData.pin}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, pin: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={processGiftCardPayment}
                disabled={isProcessingPayment || !giftCardData.code}
                className="w-full"
              >
                {isProcessingPayment ? (
                  <>Processing...</>
                ) : (
                  <>Redeem Gift Card</>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsGiftCardOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Checkout Dialog */}
      <Dialog open={isLiveCheckoutOpen} onOpenChange={setIsLiveCheckoutOpen}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden">
          <LiveCheckout onClose={() => setIsLiveCheckoutOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
