import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useResponsive } from "@/hooks/useResponsive";
import { useNavigate } from "react-router-dom";
import { useMarketplaceBundles } from "@/hooks/useMarketplaceBundles";
import { Loader2, Bot, Terminal, Boxes, Bird } from "lucide-react";
import MarketplaceHeader from "./MarketplaceHeader";
import MarketplaceFilters from "./MarketplaceFilters";
import ResultsHeader from "./ResultsHeader";
import BundleCard from "./BundleCard";
import ShoppingCartComponent from "./ShoppingCart";
import MarketplaceTerminal from "./MarketplaceTerminal";
import VultureIngestionPanel from "./vulture/VultureIngestionPanel";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { CartItem } from "@/types/marketplace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WINDOW_OPTIONS } from "@/lib/bundle-freshness";

interface DataMarketplaceProps {
  userRole: string;
}

type ToolTile = "sql" | "bundles" | "vulture";

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const { bundles, isLoading, error } = useMarketplaceBundles();
  const { balanceData, refreshBalance } = useSynapseCredits();

  const currentLedgerBalance = balanceData?.available_credits ?? 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [windowFilter, setWindowFilter] = useState<string>("any");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeTile, setActiveTile] = useState<ToolTile>("bundles");

  const isAdmin = userRole === "admin" || userRole === "csuite" || userRole === "enterprise";

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
    contributors: bundle.contacts_count ?? 0,
    records: Number(bundle.data_json?.record_count ?? 0),
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
    windowKey: (bundle as any).window_key ?? "all",
    windowStart: (bundle as any).window_start ?? null,
    windowEnd: (bundle as any).window_end ?? null,
    sourceLatestAt: (bundle as any).source_latest_at ?? null,
    generatedAt: (bundle as any).generated_at ?? null,
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

  const handlePurchase = async (totalCost: number) => {
    if (currentLedgerBalance < totalCost) return;
    try {
      const results = await Promise.all(
        cartItems.map((item) =>
          supabase.functions.invoke("marketplace-bundle-access", {
            body: { bundle_id: item.bundleId ?? item.id, quantity: item.quantity ?? 1 },
          }),
        ),
      );
      const failed = results.filter((r) => r.error || (r.data as any)?.error);
      if (failed.length > 0) {
        toast.error(`${failed.length} bundle(s) rejected by Liability Shield.`);
      } else {
        toast.success(`Liability Shield receipts issued for ${results.length} bundle(s).`);
      }
      await refreshBalance();
      setCartItems([]);
      navigate("/my-reports");
    } catch (err: any) {
      toast.error(`Purchase failed: ${err?.message ?? "Unknown error"}`);
    }
  };

  const filteredBundles = convertedBundles
    .filter((bundle) => {
      const matchesSearch =
        !searchQuery ||
        bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bundle.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !appliedFilters.category || bundle.category === appliedFilters.category;
      const matchesWindow = windowFilter === "any" || bundle.windowKey === windowFilter;

      return matchesSearch && matchesCategory && matchesWindow;
    })
    // Freshest telemetry first.
    .sort((a, b) => new Date(b.sourceLatestAt ?? 0).getTime() - new Date(a.sourceLatestAt ?? 0).getTime());

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

  const tiles: { id: ToolTile; title: string; icon: any; show: boolean }[] = [
    { id: "sql", title: "SQL Terminal", icon: Terminal, show: true },
    { id: "bundles", title: "AI Bundles", icon: Boxes, show: true },
    { id: "vulture", title: "The Vulture", icon: Bird, show: isAdmin },
  ];

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

      {/* ─── Tool Tile Panel ─── */}
      <div className={`grid gap-2 grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-3" : ""}`}>
        {tiles.filter((t) => t.show).map((t) => {
          const Icon = t.icon;
          const active = activeTile === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTile(t.id)}
              className={`text-left rounded-lg border-2 transition-all p-4 ${
                active
                  ? "border-primary bg-white shadow-md"
                  : "border-transparent bg-white/60 hover:bg-white hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                  {t.title}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t.id === "sql" && "Bio-sovereign SQL editor with floating-rate pricing."}
                {t.id === "bundles" && "AI-curated datasets across health, lifestyle, business."}
                {t.id === "vulture" && "Quarantine, sanitize, and rehabilitate distressed datasets."}
              </p>
            </button>
          );
        })}
      </div>

      {/* ─── Active Tile Content Frame ─── */}
      <div className="bg-white rounded-lg border p-3">
        {activeTile === "sql" && <MarketplaceTerminal isBioKeyVerified={true} />}

        {activeTile === "bundles" && (
          <div className="space-y-3">
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
            {/* Freshness / time-window selector */}
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {[{ key: "any", short: "ALL WINDOWS" }, ...WINDOW_OPTIONS].map((w: any) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWindowFilter(w.key)}
                  className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${
                    windowFilter === w.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {w.short}
                </button>
              ))}
            </div>
            <ResultsHeader filteredBundlesCount={filteredBundles.length} isMobile={isMobile} isTablet={isTablet} />
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <span className="text-gray-600">Loading live bundle catalog…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">

                {filteredBundles.map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    isMobile={isMobile}
                    isTablet={isTablet}
                    userCredits={currentLedgerBalance}
                    onDownload={handleAnalyzeWithAI}
                    onAddToCart={handleAddToCart}
                  />
                ))}
                {filteredBundles.length === 0 && (
                  <div className="col-span-full py-16 text-center">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-primary opacity-20" />
                    <p className="text-muted-foreground">No live bundles available right now.</p>
                  </div>
                )}
              </div>
            )}
            <Card className="border-primary/20 bg-primary/5 mt-4">
              <CardContent className={cardPadding}>
                <p className={`text-foreground ${isMobile || isTablet ? "text-xs" : "text-sm"} text-center`}>
                  Each access fires a Liability Shield receipt and burns Synapse Credits at the live sector rate.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTile === "vulture" && <VultureIngestionPanel userRole={userRole} />}
      </div>
    </div>
  );
};

export default DataMarketplace;
