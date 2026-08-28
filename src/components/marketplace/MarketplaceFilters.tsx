
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import FilterModal from './FilterModal';
import { industries } from '@/data/marketplaceBundles';

interface MarketplaceFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  appliedFilters: any;
  setAppliedFilters: (filters: any) => void;
  userRole: string;
  isMobile: boolean;
  isTablet?: boolean;
  bundleCategory?: string;
}

const MarketplaceFilters = ({
  searchQuery,
  setSearchQuery,
  appliedFilters,
  setAppliedFilters,
  userRole,
  isMobile,
  isTablet,
  bundleCategory
}: MarketplaceFiltersProps) => {
  const activeFilterCount = Object.keys(appliedFilters).filter(key => appliedFilters[key]).length;

  const handleApplyFilters = (filters: any) => {
    setAppliedFilters(filters);
  };

  // Responsive sizing
  const inputSize = isMobile ? 'text-sm' : isTablet ? 'text-sm' : '';
  const selectWidth = 'w-full sm:w-40';
  const cardPadding = isMobile ? 'p-3' : isTablet ? 'p-3' : 'p-4';

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className={cardPadding}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isTablet ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-gray-400`} />
            <Input
              placeholder={isTablet ? "Search datasets..." : "Search enterprise datasets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 border-gray-200 min-h-11 ${inputSize}`}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">

            <Select 
              value={appliedFilters.industry || ''} 
              onValueChange={(value) => setAppliedFilters({...appliedFilters, industry: value || undefined})}
            >
              <SelectTrigger className={`${selectWidth} ${isTablet ? 'text-xs h-9' : ''} border-gray-200`}>
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <FilterModal 
              userRole={userRole}
              onApplyFilters={handleApplyFilters}
              currentFilters={appliedFilters}
              bundleCategory={bundleCategory}
            />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {Object.entries(appliedFilters).map(([key, value]) => {
              if (!value) return null;
              return (
                <Badge key={key} variant="secondary" className={`flex items-center ${isMobile ? 'text-xs px-2 py-1' : ''}`}>
                  {String(value)}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => setAppliedFilters({...appliedFilters, [key]: undefined})}
                  />
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketplaceFilters;
