
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';
import { anonymizeBundleData } from '@/utils/dataAnonymizer';
import { useNavigate } from 'react-router-dom';
import { marketplaceBundles } from '@/data/marketplaceBundles';
import MarketplaceHeader from './MarketplaceHeader';
import MarketplaceFilters from './MarketplaceFilters';
import ResultsHeader from './ResultsHeader';
import BundleCard from './BundleCard';

interface DataMarketplaceProps {
  userRole: string;
}

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [userCredits, setUserCredits] = useState(12500);

  const aiCuratedBundles = marketplaceBundles.map(bundle => anonymizeBundleData(bundle));

  const handleDownloadBundle = (bundle: any) => {
    if (userCredits >= bundle.price) {
      setUserCredits(prev => prev - bundle.price);
      navigate(`/data-viewer/${bundle.id}`);
    }
  };

  // Filter bundles based on search and applied filters
  const filteredBundles = aiCuratedBundles.filter(bundle => {
    const matchesSearch = !searchQuery || 
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = !appliedFilters.industry || bundle.category === appliedFilters.industry;
    
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className={`space-y-4 ${isMobile ? 'p-2' : 'p-6'} bg-gray-50 min-h-screen`}>
      <MarketplaceHeader userCredits={userCredits} isMobile={isMobile} />

      <MarketplaceFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        appliedFilters={appliedFilters}
        setAppliedFilters={setAppliedFilters}
        userRole={userRole}
        isMobile={isMobile}
      />

      <ResultsHeader filteredBundlesCount={filteredBundles.length} isMobile={isMobile} />

      {/* Bundle Grid */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'}`}>
        {filteredBundles.map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            isMobile={isMobile}
            userCredits={userCredits}
            onDownload={handleDownloadBundle}
          />
        ))}
      </div>

      {filteredBundles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No datasets found matching your criteria.</p>
          <Button 
            variant="outline" 
            className="mt-3"
            onClick={() => {
              setSearchQuery('');
              setAppliedFilters({});
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Privacy Notice */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className={isMobile ? 'p-3' : 'p-4'}>
          <p className={`text-purple-700 ${isMobile ? 'text-xs' : 'text-sm'} text-center`}>
            🔒 All datasets are fully anonymized and aggregated to protect individual privacy. Enterprise-grade data with zero personal identifiable information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataMarketplace;
