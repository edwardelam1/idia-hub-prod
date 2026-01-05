
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface ResultsHeaderProps {
  filteredBundlesCount: number;
  isMobile: boolean;
  isTablet?: boolean;
}

const ResultsHeader = ({ filteredBundlesCount, isMobile, isTablet }: ResultsHeaderProps) => {
  const headingSize = isMobile ? 'text-base' : isTablet ? 'text-lg' : 'text-xl';
  const countSize = isMobile ? 'text-xs' : isTablet ? 'text-xs' : 'text-sm';
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <h2 className={`font-semibold text-gray-900 ${headingSize}`}>
          Available Datasets
        </h2>
        <Badge className={`bg-purple-100 text-purple-800 ${isTablet ? 'text-[10px] px-1.5' : 'text-xs'}`}>
          <Star className={`mr-1 ${isTablet ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
          AI Curated
        </Badge>
      </div>
      <span className={`text-gray-600 ${countSize}`}>
        {filteredBundlesCount} datasets
      </span>
    </div>
  );
};

export default ResultsHeader;
