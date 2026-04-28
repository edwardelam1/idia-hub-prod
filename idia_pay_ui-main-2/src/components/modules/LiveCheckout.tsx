import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Smartphone, 
  Zap, 
  Clock,
  CheckCircle2,
  User,
  AlertCircle,
  Radio
} from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface IncomingOrder {
  id: string;
  customerName: string;
  customerId: string;
  customerPhone: string;
  items: OrderItem[];
  status: "pending" | "validated" | "ready" | "paid";
  timestamp: Date;
  idVerified: boolean;
  paymentMethod?: "remote" | "nfc";
}

interface LiveCheckoutProps {
  onClose?: () => void;
}

export const LiveCheckout = ({ onClose }: LiveCheckoutProps) => {
  // Simulated incoming orders from IDIA Life app
  const [orders, setOrders] = useState<IncomingOrder[]>([
    {
      id: "ORD-001",
      customerName: "Sarah Johnson",
      customerId: "IDIA-USER-4521",
      customerPhone: "+1 (555) 123-4567",
      items: [
        { id: "1", name: "Premium Coffee", price: 4.50, quantity: 2 },
        { id: "2", name: "Croissant", price: 3.25, quantity: 1 },
      ],
      status: "pending",
      timestamp: new Date(Date.now() - 2 * 60000),
      idVerified: true,
    },
    {
      id: "ORD-002",
      customerName: "Mike Chen",
      customerId: "IDIA-USER-7832",
      customerPhone: "+1 (555) 987-6543",
      items: [
        { id: "3", name: "Fresh Juice", price: 5.00, quantity: 1 },
        { id: "4", name: "Avocado Toast", price: 8.50, quantity: 1 },
      ],
      status: "validated",
      timestamp: new Date(Date.now() - 5 * 60000),
      idVerified: true,
    },
    {
      id: "ORD-003",
      customerName: "Emma Wilson",
      customerId: "IDIA-USER-2194",
      customerPhone: "+1 (555) 456-7890",
      items: [
        { id: "5", name: "Iced Latte", price: 5.25, quantity: 1 },
      ],
      status: "ready",
      timestamp: new Date(Date.now() - 8 * 60000),
      idVerified: true,
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNFCReady, setShowNFCReady] = useState(false);

  // Simulate new orders arriving
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update order status for demo
      setOrders(prev => {
        const updated = [...prev];
        const randomIndex = Math.floor(Math.random() * updated.length);
        if (updated[randomIndex]) {
          if (updated[randomIndex].status === "pending") {
            // Don't auto-change for demo purposes
          }
        }
        return updated;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getOrderTotal = (order: IncomingOrder) => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleValidateOrder = (orderId: string) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: "validated" as const } : order
      )
    );
    toast.success("Order validated successfully");
  };

  const handleMarkReady = (orderId: string) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: "ready" as const } : order
      )
    );
    toast.success("Customer notified - Order ready for pickup");
  };

  const handleNFCPayment = (orderId: string) => {
    setSelectedOrder(orderId);
    setShowNFCReady(true);
    setIsProcessing(true);

    // Simulate NFC payment processing
    setTimeout(() => {
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, status: "paid" as const, paymentMethod: "nfc" as const }
            : order
        )
      );
      setIsProcessing(false);
      setShowNFCReady(false);
      setSelectedOrder(null);
      toast.success("Payment completed via IDIA-USD NFC");
    }, 3000);
  };

  const handleRemotePayment = (orderId: string) => {
    toast.info("Customer notified to complete payment via IDIA Life app");
    // Simulate remote payment
    setTimeout(() => {
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, status: "paid" as const, paymentMethod: "remote" as const }
            : order
        )
      );
      toast.success("Payment received via IDIA Life app");
    }, 5000);
  };

  const getStatusBadge = (status: IncomingOrder["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending Validation</Badge>;
      case "validated":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Progress</Badge>;
      case "ready":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Ready for Checkout</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Completed</Badge>;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";
    return `${minutes} mins ago`;
  };

  const pendingOrders = orders.filter(o => o.status !== "paid");
  const completedOrders = orders.filter(o => o.status === "paid");

  return (
    <div className="min-h-[100dvh] bg-background overflow-auto">
      <div className="container max-w-6xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Live Checkout</h1>
              <p className="text-sm text-muted-foreground">Incoming orders from IDIA Life Shop</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-lg px-3 py-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              {pendingOrders.length} Active
            </Badge>
          </div>
        </div>

        {/* NFC Ready Overlay */}
        {showNFCReady && selectedOrder && (
          <Card className="border-primary bg-primary/5 animate-pulse">
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <Smartphone className="h-16 w-16 mx-auto text-primary animate-bounce" />
              </div>
              <h3 className="text-xl font-bold mb-2">NFC Payment Ready</h3>
              <p className="text-muted-foreground mb-4">
                Hold your device near the customer's phone to complete IDIA-USD payment
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Radio className="h-4 w-4" />
                <span>Waiting for NFC tap...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Orders */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Active Orders</h2>
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  No active orders. Waiting for IDIA Life customers...
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{order.id}</CardTitle>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{getTimeAgo(order.timestamp)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${getOrderTotal(order).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{order.customerName}</p>
                        {order.idVerified && (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            ID Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customerId}</p>
                      <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Order Items:</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Action Buttons based on status */}
                  <div className="space-y-2">
                    {order.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleValidateOrder(order.id)}
                          className="flex-1"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Validate Order
                        </Button>
                      </div>
                    )}

                    {order.status === "validated" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleMarkReady(order.id)}
                          className="flex-1"
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Mark Ready for Pickup
                        </Button>
                      </div>
                    )}

                    {order.status === "ready" && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground text-center">
                          Customer notified. Choose payment method:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => handleNFCPayment(order.id)}
                            disabled={isProcessing}
                            className="flex-1"
                          >
                            <Smartphone className="mr-2 h-4 w-4" />
                            NFC Payment
                          </Button>
                          <Button
                            onClick={() => handleRemotePayment(order.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Remote Payment
                          </Button>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <Zap className="h-3 w-3 text-green-600" />
                          <span>Both methods use IDIA-USD with 0% fees</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Completed Orders */}
        {completedOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">Recently Completed</h2>
            {completedOrders.map((order) => (
              <Card key={order.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{order.id}</CardTitle>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${getOrderTotal(order).toFixed(2)}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {order.paymentMethod === "nfc" ? (
                          <>
                            <Smartphone className="h-3 w-3 mr-1" />
                            NFC
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-3 w-3 mr-1" />
                            Remote
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Close Button */}
        {onClose && (
          <div className="sticky bottom-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg border shadow-lg">
            <Button variant="outline" onClick={onClose} className="w-full">
              Close Live Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
