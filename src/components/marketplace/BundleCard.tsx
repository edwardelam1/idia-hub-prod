import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Users, TrendingUp, PlayCircle } from 'lucide-react';
import AlaCarteModal from './AlaCarteModal';
import BundleSimulationModal from './BundleSimulationModal';

interface BundleCardProps {
  bundle: any;
  isMobile: boolean;
  isTablet?: boolean;
  userCredits: number;
  onDownload: (bundle: any) => void;
  onAddToCart?: (items: any[]) => void;
}

const BundleCard = ({ bundle, isMobile, isTablet, userCredits, onDownload, onAddToCart }: BundleCardProps) => {
  const [simulationOpen, setSimulationOpen] = useState(false);
  
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Professional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Analyst': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAddToCart = (items: any[]) => {
    if (onAddToCart) {
      onAddToCart(items);
    }
  };

  const handleFullDatasetAccess = () => {
    setSimulationOpen(true);
  };

  // Responsive sizing
  const cardPadding = isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6';
  const titleSize = isMobile ? 'text-sm' : isTablet ? 'text-sm' : 'text-base';
  const descSize = isMobile ? 'text-xs' : isTablet ? 'text-xs' : 'text-sm';
  const maxDataPoints = isMobile ? 2 : isTablet ? 3 : 4;
  const maxFeatures = isMobile ? 2 : isTablet ? 2 : 3;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className={cardPadding}>
        <div className={`space-y-3`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1.5 min-w-0">
              <h3 className={`font-medium text-gray-900 ${titleSize} line-clamp-2`}>
                {bundle.name}
              </h3>
              <div className="flex items-center flex-wrap gap-1">
                <Badge className={`${getTierColor(bundle.tier)} ${isTablet ? 'text-[10px] px-1.5' : 'text-xs'}`} variant="outline">
                  {bundle.tier}
                </Badge>
                <Badge variant="secondary" className={`${isTablet ? 'text-[10px] px-1.5' : 'text-xs'}`}>
                  {bundle.category}
                </Badge>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`flex items-center text-purple-600 font-semibold ${isMobile || isTablet ? 'text-sm' : ''}`}>
                <Coins className="mr-1 h-3 w-3" />
                {bundle.price}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className={`text-gray-600 ${descSize} line-clamp-2`}>
            {bundle.description}
          </p>

          {/* Key Insights */}
          <div className={`bg-blue-50 ${isTablet ? 'p-2' : 'p-3'} rounded-lg`}>
            <h4 className={`font-medium text-blue-900 ${isTablet ? 'text-[10px]' : 'text-xs'} mb-1.5`}>Key Insights</h4>
            <ul className="space-y-0.5">
              {bundle.keyInsights?.slice(0, isTablet ? 2 : 3).map((insight: string, index: number) => (
                <li key={index} className={`text-blue-700 ${isTablet ? 'text-[10px]' : 'text-xs'} flex items-center`}>
                  <div className="w-1 h-1 bg-blue-400 rounded-full mr-1.5 shrink-0"></div>
                  <span className="line-clamp-1">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Data Points */}
          <div className={`bg-gray-50 ${isTablet ? 'p-2' : 'p-3'} rounded-lg`}>
            <h4 className={`font-medium text-gray-900 ${isTablet ? 'text-[10px]' : 'text-xs'} mb-1.5`}>Data Points</h4>
            <div className="flex flex-wrap gap-1">
              {bundle.dataPoints?.slice(0, maxDataPoints).map((point: string, index: number) => (
                <Badge key={index} variant="outline" className={`${isTablet ? 'text-[10px] px-1.5' : 'text-xs px-2'} py-0`}>
                  {point}
                </Badge>
              ))}
              {bundle.dataPoints && bundle.dataPoints.length > maxDataPoints && (
                <Badge variant="outline" className={`${isTablet ? 'text-[10px] px-1.5' : 'text-xs px-2'} py-0`}>
                  +{bundle.dataPoints.length - maxDataPoints}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className={`flex items-center justify-between ${isTablet ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
            <div className="flex items-center">
              <Users className={`mr-1 ${isTablet ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
              {bundle.contacts.toLocaleString()} records
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className={`mr-1 ${isTablet ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
              {bundle.match}% relevance
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1">
            {bundle.features.slice(0, maxFeatures).map((feature: string, index: number) => (
              <Badge key={index} variant="secondary" className={`${isTablet ? 'text-[10px] px-1.5' : 'text-xs px-2'} py-0`}>
                {feature}
              </Badge>
            ))}
            {bundle.features.length > maxFeatures && (
              <Badge variant="secondary" className={`${isTablet ? 'text-[10px] px-1.5' : 'text-xs px-2'} py-0`}>
                +{bundle.features.length - maxFeatures}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className={`space-y-1.5 ${isTablet ? 'pt-1' : ''}`}>
            <Button 
              className={`w-full ${isMobile || isTablet ? 'text-xs py-1.5 h-8' : ''}`}
              onClick={handleFullDatasetAccess}
              disabled={userCredits < bundle.price}
            >
              {userCredits < bundle.price ? (
                'Insufficient Credits'
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Access Full Dataset
                </>
              )}
            </Button>
            
            {/* À La Carte Option */}
            <div className="flex items-center justify-center">
              <AlaCarteModal
                bundle={bundle}
                onAddToCart={handleAddToCart}
                userCredits={userCredits}
              />
            </div>
          </div>

          {/* Simulation Modal - controlled externally */}
          <BundleSimulationModal 
            bundle={bundle} 
            open={simulationOpen} 
            onOpenChange={setSimulationOpen}
            autoRun={true}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default BundleCard;
