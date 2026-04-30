import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, X } from "lucide-react";

/**
 * LiveCheckout — modal sub-component invoked from within the POSModule chassis
 * to finalize a transaction. Not a top-level vertical view.
 */
interface LiveCheckoutProps {
  open?: boolean;
  total?: number;
  currency?: string;
  onClose: () => void;
  onConfirm?: () => void;
}

export const LiveCheckout = ({
  open = true,
  total = 0,
  currency = "USD",
  onClose,
  onConfirm,
}: LiveCheckoutProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Live Checkout</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center py-6 border-y">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">Total Due</p>
          <p className="text-3xl font-mono font-semibold mt-1">
            {currency} {total.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            Confirm Payment
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LiveCheckout;