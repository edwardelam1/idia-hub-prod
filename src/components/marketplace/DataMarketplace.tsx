import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useResponsive } from "@/hooks/useResponsive";
import { useNavigate } from "react-router-dom";
import { useMarketplaceBundles } from "@/hooks/useMarketplaceBundles";
import { Loader2, Bot } from "lucide-react";
import MarketplaceHeader from "./MarketplaceHeader";
import MarketplaceFilters from "./MarketplaceFilters";
import ResultsHeader from "./ResultsHeader";
import BundleCard from "./BundleCard";
import ShoppingCartComponent from "./ShoppingCart";
import MarketplaceTerminal from "./MarketplaceTerminal";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { CartItem } from "@/types/marketplace";

interface DataMarketplaceProps {
  userRole: string;
}

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const { bundles, isLoading, error } = useMarketplaceBundles();
  const { balanceData } = useSynapseCredits();

  const currentLedgerBalance = balanceData?.available_credits ?? 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Responsive padding and sizing
  const containerPadding = isMobile ? "p-2" : isTablet ? "p-4" : "p-6";
  const cardPadding = isMobile ? "p-3" : isTablet ? "p-3" : "p-4";

  // Map bundles and ensure price reflects the fixed Synapse Credit unit
  const convertedBundles = bundles.map((bundle) => ({
    bundle_id: bundle.bundle_id,
    id: bundle.bundle_id,
    name: bundle.title,
    description: bundle.description,
    tier: bundle.tier,
    contacts: bundle.contacts_count,
    features: bundle.features,
    category: bundle.category,
    price: bundle.price || 1, // Defaulting to 1 CR ($0.75)
    keyInsights: bundle.key_insights,
    dataPoints: bundle.data_points,
    suggestedFilters: bundle.suggested_filters,
    matchPercentage: bundle.match_percentage,
    dataJson: bundle.data_json,
    createdAt: bundle.created_at,
    updatedAt: bundle.updated_at,
    version: bundle.bundle_version,
  }));

  const handleAnalyzeWithAI = (bundle: any) => {
    // Zero-leak check: Hard floor stop at 0
    // Every AI interaction is fixed at 1 CR ($0.75)
    if (currentLedgerBalance >= 1) {
      navigate("/best-friend", {
        state: {
          marketplaceContext: {
            bundleId: bundle.bundle_id,
            bundleName: bundle.name,
            initialPrompt: `I am accessing the ${bundle.name} bundle. Based on the available data curated by the AI, what are the primary insights?`,
            isMarketplaceMode: true,
          },
        },
      });
    }
  };

  const handleAddToCart = (items: any[]) => {
    const newItems = items.map((item) => ({
      ...item,
      quantity: 1,
    }));
    setCartItems((prev) => [...prev, ...newItems]);
  };

  const handleUpdateCart = (items: CartItem[]) => {
    setCartItems(items);
  };

  const handlePurchase = (totalCost: number) => {
    if (currentLedgerBalance >= totalCost) {
      setCartItems([]);
      navigate("/my-reports");
    }
  };

  const filteredBundles = convertedBundles.filter((bundle) => {
    const matchesSearch =
      !searchQuery ||
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !appliedFilters.category || bundle.category === appliedFilters.category;

    return matchesSearch && matchesCategory;
  });

  const bundleCategory = filteredBundles.length > 0 ? filteredBundles[0].category : undefined;

  if (error) {
    return (
      <div className={`space-y-4 ${containerPadding} bg-gray-50 min-h-screen`}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className={cardPadding}>
            <p className="text-red-700 text-center font-mono">
              SYSTEM_ERROR: Failed to synchronize AI-curated bundles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${containerPadding} bg-gray-50 min-h-screen`}>
      <div className="flex items-center justify-between gap-2">
        <MarketplaceHeader userCredits={currentLedgerBalance} isMobile={isMobile} isTablet={isTablet} userRole={userRole} />
        <ShoppingCartComponent
          cartItems={cartItems}
          onUpdateCart={handleUpdateCart}
          userCredits={currentLedgerBalance}
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

      {/* Central Cashier's Terminal */}
      <MarketplaceTerminal synapseBalance={currentLedgerBalance} isBioKeyVerified={true} />

      <ResultsHeader filteredBundlesCount={filteredBundles.length} isMobile={isMobile} isTablet={isTablet} />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <span className="text-gray-600 animate-pulse">Best Friend AI is curating data bundles...</span>
        </div>
      ) : (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
          {filteredBundles.map((bundle) => (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              isMobile={isMobile}
              isTablet={isTablet}
              userCredits={currentLedgerBalance}
              onDownload={handleAnalyzeWithAI} // Rerouted to AI Analysis
              onAddToCart={handleAddToCart}
            />
          ))}

          {filteredBundles.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 text-primary opacity-20" />
              <p className="text-muted-foreground">The AI Curator is currently processing the data pipeline.</p>
            </div>
          )}
        </div>
      )}

      {/* Sovereign Privacy & Pricing Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className={cardPadding}>
            <p className={`text-purple-700 ${isMobile || isTablet ? "text-xs" : "text-sm"} text-center`}>
              🔒 Datasets are anonymized and curated solely by the IDIA AI Pipeline.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className={cardPadding}>
            <p className={`text-green-700 ${isMobile || isTablet ? "text-xs" : "text-sm"} text-center`}>
              📊 Query cost floats with sector demand and your interest profile — typically 1–3 CR per session. Exact quote shown at execution.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataMarketplace;
