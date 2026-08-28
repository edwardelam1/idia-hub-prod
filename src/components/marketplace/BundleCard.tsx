import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Users, Database, Loader2, Clock } from 'lucide-react';
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
}

const COLLAPSED_INSIGHTS = 3;
const COLLAPSED_CHIPS = 4;

const BundleCard = ({ bundle, userCredits, onAddToCart }: BundleCardProps) => {
  const navigate = useNavigate();
  const { refreshBalance } = useSynapseCredits();
  const [isAccessing, setIsAccessing] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [showAllPoints, setShowAllPoints] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

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

  const visiblePoints = showAllPoints ? dataPoints : dataPoints.slice(0, COLLAPSED_CHIPS);
  const visibleFeatures = showAllFeatures ? features : features.slice(0, COLLAPSED_CHIPS);
  const visibleInsights = showFullText ? insights : insights.slice(0, COLLAPSED_INSIGHTS);

  return (
    <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <button
                type="button"
                aria-expanded={showFullText}
                onClick={() => setShowFullText((v) => !v)}
                className="block w-full text-left"
              >
                <h3 className="text-sm font-semibold leading-snug text-foreground break-words sm:text-base">
                  {bundle.name}
                </h3>
              </button>
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

          {/* Description — tap to expand */}
          <button
            type="button"
            aria-expanded={showFullText}
            onClick={() => setShowFullText((v) => !v)}
            className="block w-full text-left"
          >
            <p
              className={`text-xs text-muted-foreground sm:text-sm break-words ${
                showFullText ? '' : 'line-clamp-3'
              }`}
            >
              {bundle.description}
            </p>
          </button>

          {/* Key Insights — tap to expand */}
          {insights.length > 0 && (
            <button
              type="button"
              aria-expanded={showFullText}
              onClick={() => setShowFullText((v) => !v)}
              className="block w-full rounded-lg bg-blue-500/10 p-3 text-left"
            >
              <h4 className="mb-1.5 text-xs font-medium text-blue-900">Key Insights</h4>
              <ul className="space-y-1">
                {visibleInsights.map((insight, index) => (
                  <li key={index} className="flex gap-1.5 text-xs text-blue-800">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500" />
                    <span className="break-words">{insight}</span>
                  </li>
                ))}
              </ul>
            </button>
          )}

          <button
            type="button"
            aria-expanded={showFullText}
            onClick={() => setShowFullText((v) => !v)}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            {showFullText ? 'Show less' : 'Show more'}
          </button>


          {/* Data Points */}
          {dataPoints.length > 0 && (
            <div className="rounded-lg bg-muted/60 p-3">
              <h4 className="mb-1.5 text-xs font-medium text-foreground">Data Points</h4>
              <div className="flex flex-wrap gap-1">
                {visiblePoints.map((point, index) => (
                  <Badge key={index} variant="outline" className="max-w-full break-words text-[11px]">
                    {point}
                  </Badge>
                ))}
                {dataPoints.length > COLLAPSED_CHIPS && (
                  <button type="button" onClick={() => setShowAllPoints((v) => !v)}>
                    <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-accent">
                      {showAllPoints ? 'Show less' : `+${dataPoints.length - COLLAPSED_CHIPS} more`}
                    </Badge>
                  </button>
                )}
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
              {visibleFeatures.map((feature, index) => (
                <Badge key={index} variant="secondary" className="max-w-full break-words text-[11px]">
                  {feature}
                </Badge>
              ))}
              {features.length > COLLAPSED_CHIPS && (
                <button type="button" onClick={() => setShowAllFeatures((v) => !v)}>
                  <Badge variant="secondary" className="cursor-pointer text-[11px] hover:bg-accent">
                    {showAllFeatures ? 'Show less' : `+${features.length - COLLAPSED_CHIPS} more`}
                  </Badge>
                </button>
              )}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default BundleCard;
