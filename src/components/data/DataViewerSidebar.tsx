
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataViewerFilters from './DataViewerFiltersSimple';

interface Bundle {
  id: number;
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
}

interface DataViewerSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  bundle: Bundle;
  isMobile?: boolean;
}

const DataViewerSidebar = ({ 
  filters, 
  onFiltersChange, 
  bundle, 
  isMobile = false 
}: DataViewerSidebarProps) => {
  const navigate = useNavigate();

  return (
    <div className={`${isMobile ? 'h-full' : 'w-80'} space-y-4`}>
      {!isMobile && (
        <Button
          variant="outline"
          onClick={() => navigate('/marketplace')}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Button>
      )}

      <DataViewerFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        bundle={bundle}
      />
    </div>
  );
};

export default DataViewerSidebar;
