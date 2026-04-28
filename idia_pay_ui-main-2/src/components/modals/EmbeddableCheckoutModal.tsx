import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Link, ExternalLink, Copy, QrCode, Mail, 
  MessageSquare, CheckCircle2, Eye, Palette, Globe
} from "lucide-react";
import { toast } from "sonner";

interface EmbeddableCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmbeddableCheckoutModal = ({ isOpen, onClose }: EmbeddableCheckoutModalProps) => {
  const [checkoutSettings, setCheckoutSettings] = useState({
    idiaLifeLogin: true,
    walletPayment: true,
    showBranding: true,
    customColors: false,
  });

  // Mock checkout links
  const recentCheckouts = [
    { id: "CHK-001", url: "https://pay.idia.com/c/abc123", amount: 45.99, status: "paid", createdAt: "2024-12-28 14:30" },
    { id: "CHK-002", url: "https://pay.idia.com/c/def456", amount: 125.00, status: "pending", createdAt: "2024-12-28 15:45" },
    { id: "CHK-003", url: "https://pay.idia.com/c/ghi789", amount: 89.50, status: "expired", createdAt: "2024-12-27 10:00" },
  ];

  const generateCheckoutLink = () => {
    const code = Math.random().toString(36).substring(2, 8);
    const url = `https://pay.idia.com/c/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Checkout link generated and copied!");
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const shareViaSMS = (url: string) => {
    toast.success("SMS sharing initiated");
  };

  const shareViaEmail = (url: string) => {
    toast.success("Email sharing initiated");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "expired": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Embeddable Checkout (WEB-M)
          </DialogTitle>
          <DialogDescription>
            Generate unique checkout URLs for headless payment integration via SMS, Email, or Web
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate Link</TabsTrigger>
            <TabsTrigger value="recent">Recent Checkouts</TabsTrigger>
            <TabsTrigger value="settings">Page Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            {/* Quick Generate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Generate Checkout Link (WEB-M.4.1)
                </CardTitle>
                <CardDescription className="text-xs">
                  Create a unique checkout_url for transaction carts that can be shared via SMS/Email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cart/Order ID</Label>
                    <Input placeholder="e.g., ORD-12345" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Customer Email (Optional)</Label>
                  <Input type="email" placeholder="customer@email.com" />
                </div>

                <div className="space-y-2">
                  <Label>Customer Phone (Optional)</Label>
                  <Input type="tel" placeholder="+1 (555) 000-0000" />
                </div>

                <Button onClick={generateCheckoutLink} className="w-full">
                  <Link className="h-4 w-4 mr-2" />
                  Generate & Copy Checkout Link
                </Button>
              </CardContent>
            </Card>

            {/* Sharing Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Share Options</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => shareViaSMS("")}>
                  <MessageSquare className="h-6 w-6 mb-2" />
                  <span className="text-xs">Send via SMS</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col" onClick={() => shareViaEmail("")}>
                  <Mail className="h-6 w-6 mb-2" />
                  <span className="text-xs">Send via Email</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <QrCode className="h-6 w-6 mb-2" />
                  <span className="text-xs">Generate QR</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent Checkout Links</CardTitle>
                <CardDescription className="text-xs">
                  Track and manage generated checkout URLs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCheckouts.map((checkout) => (
                    <div key={checkout.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">${checkout.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                            {checkout.url}
                          </p>
                          <p className="text-xs text-muted-foreground">{checkout.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(checkout.status)} className="capitalize">
                          {checkout.status}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => copyLink(checkout.url)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Web Payment Page Settings (WEB-M.4.2)
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure the responsive, branded Web Payment Page hosted by IDIA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">IDIA Life Web Login (WEB-M.4.3)</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow users to log in with IDIA Life credentials to pay with wallet balance
                    </p>
                  </div>
                  <Switch
                    checked={checkoutSettings.idiaLifeLogin}
                    onCheckedChange={(checked) => setCheckoutSettings(prev => ({ ...prev, idiaLifeLogin: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Wallet Balance Payment</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable zero-friction payment with IDIA wallet balance
                    </p>
                  </div>
                  <Switch
                    checked={checkoutSettings.walletPayment}
                    onCheckedChange={(checked) => setCheckoutSettings(prev => ({ ...prev, walletPayment: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Show Merchant Branding</Label>
                    <p className="text-xs text-muted-foreground">
                      Display your logo and brand colors on the checkout page
                    </p>
                  </div>
                  <Switch
                    checked={checkoutSettings.showBranding}
                    onCheckedChange={(checked) => setCheckoutSettings(prev => ({ ...prev, showBranding: checked }))}
                  />
                </div>

                <Button className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Checkout Page
                </Button>
              </CardContent>
            </Card>

            {/* Visual Trust Signal */}
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Visual Trust (POS-M.3.3)</p>
                  <p className="text-xs text-muted-foreground">
                    All checkout pages automatically display "Verified Merchant" Badge and "Secure Lock" for customer trust
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
