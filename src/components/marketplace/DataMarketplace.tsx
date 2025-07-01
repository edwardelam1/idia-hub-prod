
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';
import { useNavigate } from 'react-router-dom';
import { usePurchaseHistory } from '@/contexts/PurchaseHistoryContext';
import { useMarketplaceBundles } from '@/hooks/useMarketplaceBundles';
import { Loader2 } from 'lucide-react';
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
  const { addPurchase } = usePurchaseHistory();
  const { bundles, isLoading, error } = useMarketplaceBundles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [userCredits, setUserCredits] = useState(12500);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Convert database bundles to the format expected by the UI
  const convertedBundles = bundles.map(bundle => ({
    id: parseInt(bundle.bundle_id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000), // Extract number or generate random
    name: bundle.title,
    description: bundle.description,
    tier: bundle.tier,
    contacts: bundle.contacts_count,
    features: bundle.features,
    category: bundle.category,
    price: bundle.price,
    keyInsights: bundle.key_insights,
    dataPoints: bundle.data_points,
    suggestedFilters: bundle.suggested_filters,
    matchPercentage: bundle.match_percentage,
    dataJson: bundle.data_json,
    createdAt: bundle.created_at,
    updatedAt: bundle.updated_at,
    version: bundle.bundle_version
  }));

  const handleDownloadBundle = (bundle: any) => {
    if (userCredits >= bundle.price) {
      setUserCredits(prev => prev - bundle.price);
      
      // Add to purchase history
      addPurchase({
        bundleId: bundle.id,
        bundleName: bundle.name,
        items: [],
        totalCost: bundle.price,
        purchaseType: 'bundle'
      });
      
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
      
      // Add to purchase history
      addPurchase({
        items: cartItems,
        totalCost,
        purchaseType: 'ala-carte'
      });
      
      setCartItems([]);
      navigate('/my-reports');
    }
  };

  // Filter bundles based on search and applied filters
  const filteredBundles = convertedBundles.filter(bundle => {
    const matchesSearch = !searchQuery || 
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = !appliedFilters.industry || bundle.category === appliedFilters.industry;
    const matchesTier = !appliedFilters.tier || bundle.tier === appliedFilters.tier;
    
    return matchesSearch && matchesIndustry && matchesTier;
  });

  // Get the most common category for filter context
  const bundleCategory = filteredBundles.length > 0 ? filteredBundles[0].category : undefined;

  if (error) {
    return (
      <div className={`space-y-4 ${isMobile ? 'p-2' : 'p-6'} bg-gray-50 min-h-screen`}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className={isMobile ? 'p-3' : 'p-4'}>
            <p className="text-red-700 text-center">
              Error loading marketplace data. Please try again later.
            </p>
            <p className="text-red-600 text-sm text-center mt-2">
              {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading marketplace bundles...</span>
        </div>
      ) : (
        <>
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

          {filteredBundles.length === 0 && !isLoading && (
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
        </>
      )}

      {/* Privacy Notice */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className={isMobile ? 'p-3' : 'p-4'}>
          <p className={`text-purple-700 ${isMobile ? 'text-xs' : 'text-sm'} text-center`}>
            🔒 All datasets are fully anonymized and aggregated to protect individual privacy. Enterprise-grade data with zero personal identifiable information.
          </p>
        </CardContent>
      </Card>

      {/* Real-time Data Notice */}
      {bundles.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className={isMobile ? 'p-3' : 'p-4'}>
            <p className={`text-green-700 ${isMobile ? 'text-xs' : 'text-sm'} text-center`}>
              📊 Showing {bundles.length} dynamically generated health data bundles. Data refreshes every 5 minutes with new insights.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataMarketplace;
