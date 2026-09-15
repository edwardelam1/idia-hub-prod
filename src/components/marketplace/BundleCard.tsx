import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Users, Database, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import AlaCarteModal from './AlaCarteModal';
import BundleDetailSheet from './BundleDetailSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { getFreshness, relativeTime, windowLabel, windowShort } from '@/lib/bundle-freshness';

interface BundleCardProps {
  bundle: any;
  isMobile: boolean;
  isTablet?: boolean;
  userCredits: number;
  onDownload: (bundle: any) => void;
  onAddToCart?: (items: any[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const BundleCard = ({ bundle, userCredits, onAddToCart, isExpanded, onToggle }: BundleCardProps) => {
  const navigate = useNavigate();
  const { refreshBalance } = useSynapseCredits();
  const [isAccessing, setIsAccessing] = useState(false);

  const freshness = getFreshness(bundle.sourceLatestAt);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise':
        return 'bg-purple-500/15 text-purple-700 border-purple-500/30';
      case 'Professional':
        return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
      case 'Analyst':
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleAddToCart = (items: any[]) => {
    if (onAddToCart) onAddToCart(items);
  };

  const handleFullDatasetAccess = async () => {
    if (isAccessing) return;
    if (userCredits < (bundle.price ?? 1)) return;
    setIsAccessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-bundle-access', {
        body: { bundle_id: bundle.bundle_id ?? bundle.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Liability Shield receipt issued (${data.fee_cr} CR burned).`);
      await refreshBalance();
      navigate(`/data-viewer/${bundle.bundle_id ?? bundle.id}?ref=${encodeURIComponent(data.reference_id)}`);
    } catch (err: any) {
      toast.error(`Access denied: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setIsAccessing(false);
    }
  };

  const dataPoints: string[] = bundle.dataPoints ?? [];
  const features: string[] = bundle.features ?? [];
  const insights: string[] = bundle.keyInsights ?? [];

  return (
    <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className={isExpanded ? 'p-4 sm:p-5' : 'p-1.5'}>
        <div className={isExpanded ? 'space-y-3' : 'space-y-0'}>
          <Button
            type="button"
            variant="ghost"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${bundle.name}`}
            onClick={onToggle}
            className={`h-auto w-full justify-between whitespace-normal text-left ${isExpanded ? 'min-h-11 gap-3 px-2 py-2' : 'min-h-0 gap-2 px-1.5 py-1.5'}`}
          >
            <span className="min-w-0 flex-1">
              <span className={`block break-words font-semibold leading-snug text-foreground ${isExpanded ? 'text-sm sm:text-base' : 'text-xs'}`}>
                {bundle.name}
              </span>
              {!isExpanded && (
                <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-normal leading-tight text-muted-foreground">
                  <Badge className={`${getTierColor(bundle.tier)} px-1.5 py-0 text-[9px]`} variant="outline">
                    {bundle.tier}
                  </Badge>
                  <Badge variant="secondary" className="max-w-full px-1.5 py-0 text-[9px]">
                    {bundle.category}
                  </Badge>
                  <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                    {windowShort(bundle.windowKey)}
                  </Badge>
                  <Badge variant="outline" className={`${freshness.className} px-1.5 py-0 text-[9px]`}>
                    {relativeTime(bundle.sourceLatestAt)}
                  </Badge>
                  <span className="px-0.5">{Number(bundle.records ?? 0).toLocaleString()} records</span>
                  <span className="px-0.5 font-medium text-foreground">{bundle.price} CR</span>
                </span>
              )}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </Button>

          {isExpanded && (
            <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={`${getTierColor(bundle.tier)} text-[11px]`} variant="outline">
                  {bundle.tier}
                </Badge>
                <Badge variant="secondary" className="max-w-full break-all text-[11px]">
                  {bundle.category}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {windowShort(bundle.windowKey)}
                </Badge>
                <Badge variant="outline" className={`${freshness.className} text-[11px]`}>
                  {freshness.label}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center font-semibold text-purple-600 tabular-nums">
              <Coins className="mr-1 h-3.5 w-3.5" />
              {bundle.price}
            </div>
          </div>

          {/* Freshness line */}
          <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="break-words">
              Pulled {windowLabel(bundle.windowKey)} · newest record {relativeTime(bundle.sourceLatestAt)} · snapshot{' '}
              {relativeTime(bundle.generatedAt ?? bundle.updatedAt)}
            </span>
          </div>

          <p className="break-words text-xs text-muted-foreground sm:text-sm">{bundle.description}</p>

          {/* Key Insights */}
          {insights.length > 0 && (
            <div className="block w-full rounded-lg bg-blue-500/10 p-3 text-left">
              <h4 className="mb-1.5 text-xs font-medium text-blue-900">Key Insights</h4>
              <ul className="space-y-1">
                {insights.map((insight, index) => (
                  <li key={index} className="flex gap-1.5 text-xs text-blue-800">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500" />
                    <span className="break-words">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Points */}
          {dataPoints.length > 0 && (
            <div className="rounded-lg bg-muted/60 p-3">
              <h4 className="mb-1.5 text-xs font-medium text-foreground">Data Points</h4>
              <div className="flex flex-wrap gap-1">
                {dataPoints.map((point, index) => (
                  <Badge key={index} variant="outline" className="max-w-full break-words text-[11px]">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center">
              <Database className="mr-1 h-3 w-3" />
              <span className="tabular-nums">{Number(bundle.records ?? 0).toLocaleString()} records</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-1 h-3 w-3" />
              <span className="tabular-nums">{Number(bundle.contributors ?? 0).toLocaleString()} contributors</span>
            </div>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="max-w-full break-words text-[11px]">
                  {feature}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-1.5 pt-1">
            <Button
              className="min-h-11 w-full"
              onClick={handleFullDatasetAccess}
              disabled={userCredits < bundle.price || isAccessing}
            >
              {isAccessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Issuing Liability Shield…
                </>
              ) : userCredits < bundle.price ? (
                'Insufficient Credits'
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Access Full Dataset
                </>
              )}
            </Button>

            <div className="flex flex-col gap-1.5">
              <AlaCarteModal bundle={bundle} onAddToCart={handleAddToCart} userCredits={userCredits} />
              <BundleDetailSheet bundle={bundle} />
            </div>
          </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BundleCard;
