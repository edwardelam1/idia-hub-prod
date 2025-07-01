
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
import ShoppingCartComponent from './ShoppingCart';

interface DataMarketplaceProps {
  userRole: string;
}

interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  bundleId: number;
  bundleName: string;
  quantity?: number;
}

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [userCredits, setUserCredits] = useState(12500);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const aiCuratedBundles = marketplaceBundles.map(bundle => anonymizeBundleData(bundle));

  const handleDownloadBundle = (bundle: any) => {
    if (userCredits >= bundle.price) {
      setUserCredits(prev => prev - bundle.price);
      navigate(`/data-viewer/${bundle.id}`);
    }
  };

  const handleAddToCart = (items: any[]) => {
    const newItems = items.map(item => ({
      ...item,
      quantity: 1
    }));
    setCartItems(prev => [...prev, ...newItems]);
  };

  const handleUpdateCart = (items: CartItem[]) => {
    setCartItems(items);
  };

  const handlePurchase = (totalCost: number) => {
    if (userCredits >= totalCost) {
      setUserCredits(prev => prev - totalCost);
      setCartItems([]);
      // Could navigate to a custom data viewer for à la carte items
      console.log('À la carte purchase completed!');
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

  // Get the most common category for filter context
  const bundleCategory = filteredBundles.length > 0 ? filteredBundles[0].category : undefined;

  return (
    <div className={`space-y-4 ${isMobile ? 'p-2' : 'p-6'} bg-gray-50 min-h-screen`}>
      <div className="flex items-center justify-between">
        <MarketplaceHeader userCredits={userCredits} isMobile={isMobile} />
        <ShoppingCartComponent
          cartItems={cartItems}
          onUpdateCart={handleUpdateCart}
          userCredits={userCredits}
          onPurchase={handlePurchase}
        />
      </div>

      <MarketplaceFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        appliedFilters={appliedFilters}
        setAppliedFilters={setAppliedFilters}
        userRole={userRole}
        isMobile={isMobile}
        bundleCategory={bundleCategory}
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
            onAddToCart={handleAddToCart}
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
