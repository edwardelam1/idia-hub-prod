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

  return (
    <div className="space-y-1.5">
      {/* Search, industry and advanced filters share one row on every screen size. */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:h-4 sm:w-4" />
          <Input
            placeholder={isMobile || isTablet ? "Search datasets..." : "Search enterprise datasets..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-sm sm:h-10"
          />
        </div>

        <Select
          value={appliedFilters.industry || ''}
          onValueChange={(value) => setAppliedFilters({ ...appliedFilters, industry: value || undefined })}
        >
          <SelectTrigger className="h-9 w-[104px] shrink-0 text-xs sm:h-10 sm:w-40 sm:text-sm">
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
          onApplyFilters={setAppliedFilters}
          currentFilters={appliedFilters}
          bundleCategory={bundleCategory}
          compact={isMobile}
          activeCount={activeFilterCount}
        />
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(appliedFilters).map(([key, value]) => {
            if (!value) return null;
            return (
              <Badge key={key} variant="secondary" className="flex items-center px-2 py-0.5 text-[11px]">
                {String(value)}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => setAppliedFilters({ ...appliedFilters, [key]: undefined })}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MarketplaceFilters;
