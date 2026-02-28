
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
import MarketplaceTerminal from './MarketplaceTerminal';
import NoDataState from '@/components/health/NoDataState';
import HealthDataInput from '@/components/health/HealthDataInput';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CartItem } from '@/types/marketplace';

interface DataMarketplaceProps {
  userRole: string;
}

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const navigate = useNavigate();
  const { isMobile, isTablet, isSmallTablet } = useResponsive();
  const { addPurchase } = usePurchaseHistory();
  const { bundles, isLoading, error } = useMarketplaceBundles();
  const { balanceData } = useSynapseCredits();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [userCredits, setUserCredits] = useState(12500);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showAddDataModal, setShowAddDataModal] = useState(false);

  // Responsive padding and sizing
  const containerPadding = isMobile ? 'p-2' : isTablet ? 'p-4' : 'p-6';
  const cardPadding = isMobile ? 'p-3' : isTablet ? 'p-3' : 'p-4';

  // Use real database bundles directly (no ID conversion needed)
  const convertedBundles = bundles.map(bundle => ({
    bundle_id: bundle.bundle_id, // Keep as UUID
    id: bundle.bundle_id, // For compatibility with existing components
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
        bundleId: bundle.bundle_id,
        bundleName: bundle.name,
        items: [],
        totalCost: bundle.price,
        purchaseType: 'bundle'
      });
      
      navigate(`/data-viewer/${bundle.bundle_id}`);
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
      bundle.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bundle.keyInsights?.some(insight => insight.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !appliedFilters.category || bundle.category === appliedFilters.category;
    const matchesTier = !appliedFilters.tier || bundle.tier === appliedFilters.tier;
    
    // Health metric filtering
    const matchesHealthMetric = !appliedFilters.healthMetric || (() => {
      const metric = appliedFilters.healthMetric.toLowerCase();
      return bundle.name.toLowerCase().includes(metric) ||
             bundle.description.toLowerCase().includes(metric) ||
             bundle.keyInsights?.some(insight => insight.toLowerCase().includes(metric));
    })();
    
    // Activity type filtering
    const matchesActivityType = !appliedFilters.activityType || (() => {
      const activityType = appliedFilters.activityType;
      return bundle.dataJson?.activity_type_breakdown && 
             Object.keys(bundle.dataJson.activity_type_breakdown).includes(activityType);
    })();
    
    // Data type filtering
    const matchesDataType = !appliedFilters.dataType || (() => {
      const dataType = appliedFilters.dataType.toLowerCase();
      if (dataType.includes('activity') && (bundle.dataJson?.total_activities || bundle.dataJson?.total_workouts)) return true;
      if (dataType.includes('sleep') && bundle.dataJson?.total_sleep_records) return true;
      if (dataType.includes('nutrition') && bundle.dataJson?.total_nutrition_records) return true;
      if (dataType.includes('clinical') && bundle.dataJson?.total_clinical_records) return true;
      if (dataType.includes('geographic') && bundle.dataJson?.regions_covered) return true;
      return false;
    })();
    
    // Price range filtering
    const matchesPriceRange = !appliedFilters.priceRange || (() => {
      const price = bundle.price || 0;
      const range = appliedFilters.priceRange;
      if (range === 'Under $500') return price < 500;
      if (range === '$500 - $1,000') return price >= 500 && price < 1000;
      if (range === '$1,000 - $2,500') return price >= 1000 && price < 2500;
      if (range === '$2,500 - $5,000') return price >= 2500 && price < 5000;
      if (range === '$5,000+') return price >= 5000;
      return true;
    })();
    
    return matchesSearch && matchesCategory && matchesTier && matchesHealthMetric && 
           matchesActivityType && matchesDataType && matchesPriceRange;
  });

  // Get the most common category for filter context
  const bundleCategory = filteredBundles.length > 0 ? filteredBundles[0].category : undefined;

  if (error) {
    return (
      <div className={`space-y-4 ${containerPadding} bg-gray-50 min-h-screen`}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className={cardPadding}>
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
    <div className={`space-y-3 ${containerPadding} bg-gray-50 min-h-screen`}>
      <div className="flex items-center justify-between gap-2">
        <MarketplaceHeader userCredits={userCredits} isMobile={isMobile} isTablet={isTablet} />
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
        isTablet={isTablet}
        bundleCategory={bundleCategory}
      />

      <MarketplaceTerminal
        synapseBalance={balanceData?.available_credits ?? 0}
        isBioKeyVerified={true}
      />

      <ResultsHeader filteredBundlesCount={filteredBundles.length} isMobile={isMobile} isTablet={isTablet} />

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className={`${isTablet ? 'h-6 w-6' : 'h-8 w-8'} animate-spin text-blue-600`} />
          <span className={`ml-2 text-gray-600 ${isTablet ? 'text-sm' : ''}`}>Loading marketplace bundles...</span>
        </div>
      ) : (
        <>
          {/* Bundle Grid - Single column on tablet for less crowding */}
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {filteredBundles.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                isMobile={isMobile}
                isTablet={isTablet}
                userCredits={userCredits}
                onDownload={handleDownloadBundle}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

          {filteredBundles.length === 0 && !isLoading && (
            <NoDataState onAddData={() => setShowAddDataModal(true)} />
          )}
        </>
      )}

      <Dialog open={showAddDataModal} onOpenChange={setShowAddDataModal}>
        <DialogContent className={`${isTablet ? 'max-w-2xl' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>Add Health Data</DialogTitle>
          </DialogHeader>
          <HealthDataInput 
            onDataSubmitted={() => {
              setShowAddDataModal(false);
              window.location.reload(); // Refresh to show new data
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Privacy Notice */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className={cardPadding}>
          <p className={`text-purple-700 ${isMobile || isTablet ? 'text-xs' : 'text-sm'} text-center`}>
            🔒 All datasets are fully anonymized and aggregated to protect individual privacy.
          </p>
        </CardContent>
      </Card>

      {/* Real-time Data Notice */}
      {bundles.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className={cardPadding}>
            <p className={`text-green-700 ${isMobile || isTablet ? 'text-xs' : 'text-sm'} text-center`}>
              📊 {bundles.length} health data bundles. Refreshes every 5 minutes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataMarketplace;
