import { Wallet, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NoWalletState = ({ compact = false }: { compact?: boolean }) => {
  if (compact) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Wallet className="h-3 w-3" />
        <span>No wallet</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
      <Wallet className="h-8 w-8 text-muted-foreground" />
      <div>
        <h4 className="text-sm font-semibold">Wallet not provisioned</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Your IDIA wallet is provisioned through the IDIA Life app. Open Life to set up your wallet, then return here.
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <a href="https://app.idia.life" target="_blank" rel="noopener noreferrer">
          Open IDIA Life <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    </div>
  );
};

export default NoWalletState;