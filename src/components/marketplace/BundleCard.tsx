
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Users, TrendingUp } from 'lucide-react';

interface BundleCardProps {
  bundle: any;
  isMobile: boolean;
  userCredits: number;
  onDownload: (bundle: any) => void;
}

const BundleCard = ({ bundle, isMobile, userCredits, onDownload }: BundleCardProps) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Professional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Analyst': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className={isMobile ? 'p-4' : 'p-6'}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                {bundle.name}
              </h3>
              <div className="flex items-center space-x-2">
                <Badge className={`${getTierColor(bundle.tier)} text-xs`} variant="outline">
                  {bundle.tier}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {bundle.category}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className={`flex items-center text-purple-600 font-semibold ${isMobile ? 'text-sm' : ''}`}>
                <Coins className="mr-1 h-3 w-3" />
                {bundle.price}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {bundle.description}
          </p>

          {/* Key Insights */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 text-xs mb-2">Key Insights</h4>
            <ul className="space-y-1">
              {bundle.keyInsights?.map((insight: string, index: number) => (
                <li key={index} className="text-blue-700 text-xs flex items-center">
                  <div className="w-1 h-1 bg-blue-400 rounded-full mr-2"></div>
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          {/* Data Points */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 text-xs mb-2">Data Points Included</h4>
            <div className="flex flex-wrap gap-1">
              {bundle.dataPoints?.slice(0, isMobile ? 2 : 4).map((point: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs px-2 py-0">
                  {point}
                </Badge>
              ))}
              {bundle.dataPoints && bundle.dataPoints.length > (isMobile ? 2 : 4) && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  +{bundle.dataPoints.length - (isMobile ? 2 : 4)} more
                </Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center">
              <Users className="mr-1 h-3 w-3" />
              {bundle.contacts.toLocaleString()} records
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              {bundle.match}% relevance
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1">
            {bundle.features.slice(0, isMobile ? 2 : 3).map((feature: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                {feature}
              </Badge>
            ))}
            {bundle.features.length > (isMobile ? 2 : 3) && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                +{bundle.features.length - (isMobile ? 2 : 3)}
              </Badge>
            )}
          </div>

          {/* Action */}
          <Button 
            className={`w-full ${isMobile ? 'text-sm py-2' : ''}`}
            onClick={() => onDownload(bundle)}
            disabled={userCredits < bundle.price}
          >
            {userCredits < bundle.price ? 'Insufficient Credits' : 'Access Dataset'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BundleCard;
