
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
  const titleSize = isMobile ? 'text-xl' : isTablet ? 'text-2xl' : 'text-3xl';
  const subtitleSize = isMobile || isTablet ? 'text-sm' : '';
  const creditsSize = isMobile || isTablet ? 'text-sm' : '';
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
    <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
      <div>
        <h1 className={`font-bold text-gray-900 ${titleSize}`}>
          IDIA Data Marketplace
        </h1>
        <p className={`text-gray-600 ${subtitleSize}`}>
          {isTablet ? 'AI-curated datasets' : 'Enterprise-grade AI-curated datasets'}
        </p>
      </div>
      
      <div className={`flex items-center space-x-2 ${isMobile ? 'self-end' : ''}`}>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={seeding}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Regenerating…' : 'Regenerate Bundles'}
          </Button>
        )}
        <Coins className={`${isTablet ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-purple-600`} />
        <span className={`font-bold text-purple-600 ${creditsSize}`}>
          {userCredits.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default MarketplaceHeader;
