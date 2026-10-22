import { Coins, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface MarketplaceHeaderProps {
  userCredits: number;
  isMobile: boolean;
  isTablet?: boolean;
  userRole?: string;
}

const MarketplaceHeader = ({ userCredits, isMobile, isTablet, userRole }: MarketplaceHeaderProps) => {
  const titleSize = isMobile ? 'text-lg' : isTablet ? 'text-2xl' : 'text-3xl';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const isAdmin = userRole === 'super_admin';

  const handleRegenerate = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-marketplace-catalog', { body: {} });
      if (error) throw error;
      toast({ title: 'Bundle regeneration triggered', description: `Seeded: ${data?.seeded ?? 0}` });
      qc.invalidateQueries({ queryKey: ['marketplace-bundles'] });
    } catch (e: any) {
      toast({ title: 'Regeneration failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="min-w-0">
        <h1 className={`truncate font-bold leading-tight text-foreground ${titleSize}`}>
          IDIA Data Marketplace
        </h1>
        <p className="truncate text-[11px] text-muted-foreground sm:text-sm">
          {isMobile || isTablet ? 'AI-curated datasets' : 'Enterprise-grade AI-curated datasets'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={seeding}
            aria-label="Regenerate bundles"
            className="h-8 px-2 sm:px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:mr-1 ${seeding ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{seeding ? 'Regenerating…' : 'Regenerate Bundles'}</span>
          </Button>
        )}
        <div className="flex items-center gap-1">
          <Coins className={`${isMobile || isTablet ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-purple-600`} />
          <span className={`font-bold text-purple-600 ${isMobile || isTablet ? 'text-sm' : ''}`}>
            {userCredits.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceHeader;
