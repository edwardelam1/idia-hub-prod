import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { CreditCard, DollarSign, Zap, Check } from "lucide-react";

interface PaymentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDERS = [
  {
    key: "IDIA",
    label: "IDIA Processing",
    subtitle: "Powered by Worldpay TriPOS",
    fee: "0.5%",
    icon: Zap,
    recommended: true,
  },
  {
    key: "Stripe",
    label: "Stripe",
    subtitle: "Stripe Terminal SDK",
    fee: "2.9%",
    icon: CreditCard,
    recommended: false,
  },
  {
    key: "Square",
    label: "Square",
    subtitle: "Square Terminal API",
    fee: "2.6%",
    icon: DollarSign,
    recommended: false,
  },
] as const;

type ProviderKey = (typeof PROVIDERS)[number]["key"];

export const PaymentConfigModal = ({ isOpen, onClose }: PaymentConfigModalProps) => {
  const [activeProvider, setActiveProvider] = useState<ProviderKey>("IDIA");
  const [idiaMerchantId, setIdiaMerchantId] = useState("");
  const [idiaTerminalId, setIdiaTerminalId] = useState("");
  const [stripeTerminalId, setStripeTerminalId] = useState("");
  const [squareTerminalId, setSquareTerminalId] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) loadConfig();
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const businessId = await getBusinessId();
      const { data } = await supabase
        .from("merchant_payment_configs")
        .select("*")
        .eq("business_id", businessId)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setConfigId(data.id);
        setActiveProvider((data.active_provider as ProviderKey) || "IDIA");
        setIdiaMerchantId(data.idia_merchant_id || "");
        setIdiaTerminalId(data.idia_terminal_id || "");
        setStripeTerminalId(data.stripe_terminal_id || "");
        setSquareTerminalId(data.square_terminal_id || "");
      }
    } catch (err) {
      console.error("Error loading payment config:", err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const businessId = await getBusinessId();
      const payload = {
        business_id: businessId,
        active_provider: activeProvider,
        idia_merchant_id: idiaMerchantId,
        idia_terminal_id: idiaTerminalId,
        stripe_terminal_id: stripeTerminalId,
        square_terminal_id: squareTerminalId,
        is_default: true,
        updated_at: new Date().toISOString(),
      };

      if (configId) {
        await supabase
          .from("merchant_payment_configs")
          .update(payload)
          .eq("id", configId);
      } else {
        await supabase.from("merchant_payment_configs").insert(payload);
      }

      toast({
        title: "Payment Configuration Saved",
        description: `Active processor set to ${activeProvider}.`,
      });
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Error", description: "Failed to save configuration.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Processing Configuration
          </DialogTitle>
          <DialogDescription>
            Select your payment processor. All communication happens server-side — no API keys are exposed in the browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Provider Selection */}
          <div className="grid gap-3">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              const selected = activeProvider === p.key;
              return (
                <Card
                  key={p.key}
                  className={`cursor-pointer transition-all border-2 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                  onClick={() => setActiveProvider(p.key)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.label}</span>
                        {p.recommended && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            Recommended · Low Rate
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-mono font-semibold">{p.fee}</div>
                      <div className="text-[10px] text-muted-foreground">per txn</div>
                    </div>

                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Provider-specific fields */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <h4 className="text-sm font-semibold">
              {activeProvider === "IDIA" && "IDIA / Worldpay Credentials"}
              {activeProvider === "Stripe" && "Stripe Terminal Settings"}
              {activeProvider === "Square" && "Square Terminal Settings"}
            </h4>

            {activeProvider === "IDIA" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="idia-merchant">Merchant ID</Label>
                  <Input
                    id="idia-merchant"
                    value={idiaMerchantId}
                    onChange={(e) => setIdiaMerchantId(e.target.value)}
                    placeholder="IDIA merchant ID"
                  />
                </div>
                <div>
                  <Label htmlFor="idia-terminal">Terminal / Lane ID</Label>
                  <Input
                    id="idia-terminal"
                    value={idiaTerminalId}
                    onChange={(e) => setIdiaTerminalId(e.target.value)}
                    placeholder="TriPOS lane ID"
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  The Worldpay API key is stored as a secure server secret and never sent to the browser.
                </p>
              </div>
            )}

            {activeProvider === "Stripe" && (
              <div>
                <Label htmlFor="stripe-terminal">Stripe Terminal ID</Label>
                <Input
                  id="stripe-terminal"
                  value={stripeTerminalId}
                  onChange={(e) => setStripeTerminalId(e.target.value)}
                  placeholder="tmr_..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Stripe integration is currently in stub mode. Add your Stripe secret key to activate.
                </p>
              </div>
            )}

            {activeProvider === "Square" && (
              <div>
                <Label htmlFor="square-terminal">Square Terminal Device ID</Label>
                <Input
                  id="square-terminal"
                  value={squareTerminalId}
                  onChange={(e) => setSquareTerminalId(e.target.value)}
                  placeholder="Device ID"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Square integration is currently in stub mode. Add your Square access token to activate.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
