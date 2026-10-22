import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useResponsive } from "@/hooks/useResponsive";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMarketplaceBundles } from "@/hooks/useMarketplaceBundles";
import { Loader2, Bot, Terminal, Boxes, Bird, Radar, ChevronsDown, ChevronsUp, ChartNoAxesCombined } from "lucide-react";
import MarketplaceHeader from "./MarketplaceHeader";
import MarketplaceFilters from "./MarketplaceFilters";
import ResultsHeader from "./ResultsHeader";
import BundleCard from "./BundleCard";
import ShoppingCartComponent from "./ShoppingCart";
import MarketplaceTerminal from "./MarketplaceTerminal";
import VultureIngestionPanel from "./vulture/VultureIngestionPanel";
import UtilitiesIngestionPanel from "./utilities/UtilitiesIngestionPanel";
import { TradingDeskDashboard } from "@/components/trading/TradingDeskDashboard";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { CartItem } from "@/types/marketplace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WINDOW_OPTIONS } from "@/lib/bundle-freshness";
import { Button } from "@/components/ui/button";
import { recordActivity } from "@/lib/activity-history";

interface DataMarketplaceProps {
  userRole: string;
}

type ToolTile = "sql" | "bundles" | "vulture" | "utilities" | "trading";

const isToolTile = (value: string | null): value is ToolTile =>
  value === "sql" || value === "bundles" || value === "vulture" || value === "utilities" || value === "trading";

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMobile, isTablet } = useResponsive();
  const { bundles, isLoading, error } = useMarketplaceBundles();
  const { balanceData, refreshBalance } = useSynapseCredits();

  const currentLedgerBalance = balanceData?.available_credits ?? 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [windowFilter, setWindowFilter] = useState<string>("any");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const requestedTile = searchParams.get("panel");
  const [expandedBundleIds, setExpandedBundleIds] = useState<Set<string>>(() => new Set());

  const isAdmin = userRole === "admin" || userRole === "csuite" || userRole === "enterprise";
  const activeTile: ToolTile = isToolTile(requestedTile) && (requestedTile !== "vulture" || isAdmin)
    ? requestedTile
    : "bundles";

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
    setCartItems((prev) => {
      const merged = [...prev];
      for (const item of items) {
        // Same bundle + same stream selection is one line, not two.
        const existing = merged.findIndex((c) => c.id === item.id);
        if (existing >= 0) {
          merged[existing] = { ...merged[existing], quantity: (merged[existing].quantity || 1) + 1 };
        } else {
          merged.push({ ...item, quantity: 1 });
        }
      }
      return merged;
    });
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
            body: {
              bundle_id: item.bundleId ?? item.id,
              quantity: item.quantity ?? 1,
              streams: item.streams ?? null,
            },
          }),
        ),
      );
      const failed = results.filter((r) => r.error || (r.data as any)?.error);
      console.info("[PHASE_START: Marketplace.ActivityHistory] Saving completed bundle purchases.");
      await Promise.all(
        results.map(async (response, index) => {
          if (response.error || (response.data as any)?.error) return;
          const item = cartItems[index];
          const receipt = response.data as any;
          await recordActivity({
            source: "marketplace",
            action: "MARKETPLACE_BUNDLE_ACCESS",
            title: item.name,
            input: {
              bundle_id: item.bundleId ?? item.id,
              bundle_name: item.name,
              streams: item.streams ?? [],
              quantity: item.quantity ?? 1,
            },
            result: receipt,
            recordsConsumed: receipt?.consumed_records?.length ?? item.recordCount ?? 0,
            synapseCreditCost: Number(receipt?.fee_cr ?? receipt?.quoted_price_cr ?? item.price),
            egressLogId: receipt?.egress_log_id,
            synapseLedgerEntryId: receipt?.synapse_ledger_entry_id,
            referenceId: receipt?.reference_id,
            idempotencyKey: receipt?.reference_id,
          });
        }),
      );
      console.info("[PHASE_END: Marketplace.ActivityHistory] Completed purchases saved.");
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
  const visibleBundleIds = filteredBundles.map((bundle) => bundle.id);
  const allVisibleBundlesExpanded =
    visibleBundleIds.length > 0 && visibleBundleIds.every((id) => expandedBundleIds.has(id));

  const toggleBundle = (bundleId: string) => {
    setExpandedBundleIds((current) => {
      const next = new Set(current);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  };

  const setAllVisibleBundlesExpanded = (expanded: boolean) => {
    setExpandedBundleIds((current) => {
      const next = new Set(current);
      visibleBundleIds.forEach((id) => (expanded ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const selectTile = (tile: ToolTile) => {
    const next = new URLSearchParams(searchParams);
    if (tile === "bundles") next.delete("panel");
    else next.set("panel", tile);
    setSearchParams(next, { replace: true });
  };

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

  const tiles: { id: ToolTile; title: string; short: string; icon: any; show: boolean }[] = [
    { id: "sql", title: "SQL Terminal", short: "SQL", icon: Terminal, show: true },
    { id: "bundles", title: "AI Bundles", short: "Bundles", icon: Boxes, show: true },
    { id: "vulture", title: "The Vulture", short: "Vulture", icon: Bird, show: isAdmin },
    { id: "utilities", title: "Utilities", short: "Utilities", icon: Radar, show: true },
    { id: "trading", title: "Trading Desk API", short: "Trading", icon: ChartNoAxesCombined, show: true },
  ];
  const visibleTiles = tiles.filter((t) => t.show);

  return (
    <div className={`space-y-2 sm:space-y-3 ${containerPadding} bg-gray-50 min-h-screen`}>
      <div className="flex items-center justify-between gap-2">
        <MarketplaceHeader userCredits={currentLedgerBalance} isMobile={isMobile} isTablet={isTablet} userRole={userRole} />
        <ShoppingCartComponent
          cartItems={cartItems}
          onUpdateCart={handleUpdateCart}
          userCredits={currentLedgerBalance}
          onPurchase={handlePurchase}
        />
      </div>

      {/* ─── Tool Selector: one segmented row on phones/tablets, descriptive cards on desktop ─── */}
      <nav
        aria-label="Marketplace tools"
        className={`grid gap-1 rounded-xl border bg-card p-1 lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0 ${
          visibleTiles.length === 5 ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {visibleTiles.map((t) => {
          const Icon = t.icon;
          const active = activeTile === t.id;
          return (
            <Button
              key={t.id}
              type="button"
              variant="ghost"
              aria-pressed={active}
              aria-label={t.title}
              onClick={() => selectTile(t.id)}
              className={`h-auto min-w-0 flex-col items-center justify-start gap-0 whitespace-normal rounded-lg px-1 py-1.5 text-center transition-all lg:items-stretch lg:border-2 lg:p-3 lg:text-left ${
                active
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground lg:border-primary lg:bg-card lg:text-foreground lg:shadow-sm lg:hover:bg-card"
                  : "text-muted-foreground lg:border-transparent lg:bg-card/60 lg:hover:border-primary/30 lg:hover:bg-card"
              }`}
            >
              <div className="flex flex-col items-center gap-0.5 lg:mb-1 lg:flex-row lg:gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground lg:text-primary" : "text-muted-foreground"}`} />
                <span
                  className={`min-w-0 truncate text-[10px] font-semibold leading-tight sm:text-xs lg:whitespace-normal lg:text-sm ${
                    active ? "lg:text-primary" : "lg:text-foreground"
                  }`}
                >
                  <span className="lg:hidden">{t.short}</span>
                  <span className="hidden lg:inline">{t.title}</span>
                </span>
              </div>
              <p className="hidden text-[11px] font-normal text-muted-foreground lg:block">
                {t.id === "sql" && "Bio-sovereign SQL editor with floating-rate pricing."}
                {t.id === "bundles" && "AI-curated datasets across health, lifestyle, business."}
                {t.id === "vulture" && "Quarantine, sanitize, and rehabilitate distressed datasets."}
                {t.id === "utilities" && "Commercial intake gateway and staged data dividend balances."}
                {t.id === "trading" && "API keys, endpoints, MCP, monitoring, and feature feeds."}
              </p>
            </Button>
          );
        })}
      </nav>

      {/* ─── Active Tile Content Frame ─── */}
      <div className="bg-white rounded-lg border p-2 sm:p-3">
        {activeTile === "sql" && <MarketplaceTerminal isBioKeyVerified={true} />}

        {activeTile === "bundles" && (
          <div className="space-y-2 sm:space-y-3">
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
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 sm:gap-1.5">
              {[{ key: "any", short: "ALL TIME" }, ...WINDOW_OPTIONS].map((w: any) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWindowFilter(w.key)}
                  className={`h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-medium transition-colors sm:h-8 sm:px-3 sm:text-xs ${
                    windowFilter === w.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {w.short}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <ResultsHeader filteredBundlesCount={filteredBundles.length} isMobile={isMobile} isTablet={isTablet} />
              </div>
              {filteredBundles.length > 0 && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Collapse all bundles"
                    className="h-7 w-7 p-0 sm:h-9 sm:w-auto sm:px-3"
                    onClick={() => setAllVisibleBundlesExpanded(false)}
                    disabled={!visibleBundleIds.some((id) => expandedBundleIds.has(id))}
                  >
                    <ChevronsUp className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Collapse All</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Expand all bundles"
                    className="h-7 w-7 p-0 sm:h-9 sm:w-auto sm:px-3"
                    onClick={() => setAllVisibleBundlesExpanded(true)}
                    disabled={allVisibleBundlesExpanded}
                  >
                    <ChevronsDown className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Expand All</span>
                  </Button>
                </div>
              )}
            </div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <span className="text-gray-600">Loading live bundle catalog…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">

                {filteredBundles.map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    isMobile={isMobile}
                    isTablet={isTablet}
                    userCredits={currentLedgerBalance}
                    onDownload={handleAnalyzeWithAI}
                    onAddToCart={handleAddToCart}
                    isExpanded={expandedBundleIds.has(bundle.id)}
                    onToggle={() => toggleBundle(bundle.id)}
                  />
                ))}
                {filteredBundles.length === 0 && (
                  <div className="col-span-full py-10 text-center sm:py-16">
                    <Bot className="h-10 w-10 mx-auto mb-3 text-primary opacity-20 sm:h-12 sm:w-12" />
                    <p className="text-sm text-muted-foreground">No live bundles available right now.</p>
                  </div>
                )}
              </div>
            )}
            <p className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-center text-[11px] text-foreground sm:p-3 sm:text-sm">
              Each access fires a Liability Shield receipt and burns Synapse Credits at the live sector rate.
            </p>
          </div>
        )}

        {activeTile === "vulture" && <VultureIngestionPanel userRole={userRole} />}

        {activeTile === "utilities" && <UtilitiesIngestionPanel />}

        {activeTile === "trading" && <TradingDeskDashboard />}
      </div>
    </div>
  );
};

export default DataMarketplace;
