import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShoppingCart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AlaCarteInterceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundleName?: string;
  onAlaCartePurchase?: () => void;
}

export const AlaCarteInterceptModal = ({
  open,
  onOpenChange,
  bundleName,
  onAlaCartePurchase,
}: AlaCarteInterceptModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Business Subscription Required</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Data Bundles require a Business Subscription. Would you like to purchase this specific query A La Carte instead?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
          {bundleName && (
            <p className="text-sm font-medium text-foreground">{bundleName}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">A La Carte Query Price</span>
            <Badge variant="secondary" className="font-mono">$10.00 USD</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Limited to 50 records per query</p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAlaCartePurchase} className="w-full gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase A La Carte · $10.00
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate('/onboarding');
            }}
          >
            Upgrade to Business Entity
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
