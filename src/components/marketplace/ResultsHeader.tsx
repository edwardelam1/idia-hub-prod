
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface ResultsHeaderProps {
  filteredBundlesCount: number;
  isMobile: boolean;
}

const ResultsHeader = ({ filteredBundlesCount, isMobile }: ResultsHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-xl'}`}>
          Available Datasets
        </h2>
        <Badge className="bg-purple-100 text-purple-800 text-xs">
          <Star className="mr-1 h-3 w-3" />
          AI Curated
        </Badge>
      </div>
      <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        {filteredBundlesCount} datasets
      </span>
    </div>
  );
};

export default ResultsHeader;
