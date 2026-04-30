import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertCircle,
  Clock,
  Users,
  Search,
  ShoppingCart,
  CreditCard,
  Flame,
  Radio,
  Server,
} from "lucide-react";
import { LiveCheckout } from "./LiveCheckout";

/**
 * POSModule — the universal dynamic chassis for IDIA Pay transactional verticals
 * (hospitality, retail, QSR). It receives `activeBites` (NanoBite IDs from the
 * merchant's blueprint) and exposes vertical-specific telemetry overlays on top
 * of the shared point-of-sale base.
 */
interface POSModuleProps {
  activeBites?: string[];
  verticalId?: string;
}

export const POSModule = ({ activeBites = [], verticalId }: POSModuleProps) => {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Controls whether the main panel shows the POS grid, Spatial Tracking, or KDS
  const [activeView, setActiveView] = useState<"pos" | "spatial" | "kds">("pos");

  // Dynamic Capabilities parsed from IDIA Hub Blueprint
  const hasSpatialFlow = activeBites.includes("hosp.ops.guest_flow_tracking");
  const hasKitchenTelemetry = activeBites.includes("hosp.ops.kitchen_telemetry");
  const hasQSRLineSpeed = activeBites.includes("qsr.ops.line");
  const hasBoutiqueConsult = activeBites.includes("retail.boutique.ops.consult");

  // Strict error-handling logs for blueprint hydration debugging.
  if (typeof window !== "undefined") {
    try {
      if (!Array.isArray(activeBites)) {
        console.error("[POSModule] activeBites must be an array, received:", typeof activeBites);
      } else if (activeBites.length > 0) {
        console.debug(
          `[POSModule] Hydrated vertical "${verticalId ?? "unknown"}" with ${activeBites.length} NanoBite(s):`,
          activeBites,
        );
      }
    } catch (err) {
      console.error("[POSModule] Failed to introspect activeBites:", err);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Dynamic Omni-Vertical Telemetry Header */}
      {(hasSpatialFlow || hasKitchenTelemetry || hasQSRLineSpeed || hasBoutiqueConsult) && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {hasSpatialFlow && (
            <Card className="bg-blue-500/5 border-blue-500/20 py-2 px-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Spatial Flow</p>
                <p className="text-sm font-mono">UWB Tracking Active</p>
              </div>
              <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
            </Card>
          )}
          {hasKitchenTelemetry && (
            <Card className="bg-orange-500/5 border-orange-500/20 py-2 px-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Autonomic KDS</p>
                <p className="text-sm font-mono">Elo Load: 84%</p>
              </div>
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </Card>
          )}
          {hasQSRLineSpeed && (
            <Card className="bg-green-500/5 border-green-500/20 py-2 px-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Line Speed Audit</p>
                <p className="text-sm font-mono">Drive-Thru: 42s avg</p>
              </div>
              <Clock className="w-5 h-5 text-green-500" />
            </Card>
          )}
          {hasBoutiqueConsult && (
            <Card className="bg-purple-500/5 border-purple-500/20 py-2 px-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Client Consultation</p>
                <p className="text-sm font-mono">VIP CRM Active</p>
              </div>
              <Users className="w-5 h-5 text-purple-500" />
            </Card>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, SKU, or scan barcode..."
            className="pl-8"
          />
        </div>
        <Button onClick={() => setCheckoutOpen(true)} className="gap-2">
          <CreditCard className="w-4 h-4" /> Checkout
        </Button>
      </div>

      {/* Dynamic Module Navigation */}
      {(hasSpatialFlow || hasKitchenTelemetry) && (
        <div className="flex gap-2 mb-2 border-b pb-2 overflow-x-auto scrollbar-hide">
          <Button
            variant={activeView === "pos" ? "default" : "ghost"}
            onClick={() => setActiveView("pos")}
            className="font-bold tracking-tight"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Point of Sale
          </Button>

          {hasSpatialFlow && (
            <Button
              variant={activeView === "spatial" ? "default" : "ghost"}
              onClick={() => setActiveView("spatial")}
              className="font-bold tracking-tight text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
            >
              <Activity className="w-4 h-4 mr-2" />
              Spatial Matrix
            </Button>
          )}

          {hasKitchenTelemetry && (
            <Button
              variant={activeView === "kds" ? "default" : "ghost"}
              onClick={() => setActiveView("kds")}
              className="font-bold tracking-tight text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
            >
              <Flame className="w-4 h-4 mr-2" />
              Autonomic KDS
            </Button>
          )}
        </div>
      )}

      {/* Dynamic Main Work Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* VIEW: Standard Point of Sale (placeholder until merchant catalog hydrates) */}
        {activeView === "pos" && (
          <Card className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <ShoppingCart className="w-4 h-4" />
            POS catalog hydrates here from merchant_blueprint.json
          </Card>
        )}

        {/* VIEW: Spatial Matrix (UWB Guest Flow & VIP Table Mapping) */}
        {activeView === "spatial" && hasSpatialFlow && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
              <div>
                <h3 className="font-bold text-blue-600 flex items-center">
                  <Radio className="w-4 h-4 mr-2 animate-pulse" />
                  UWB Anchor Array Online
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Executing Adaptive Monte Carlo Localization for guest traversal.
                </p>
              </div>
              <Badge variant="outline" className="bg-background">42 Active Client Tags</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-dashed border-2">
                <CardContent className="pt-6 text-center space-y-2">
                  <Activity className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="font-bold">Sector A (VIP Lounge)</p>
                  <p className="text-sm text-muted-foreground">Density: High (14 tags)</p>
                  <Badge className="bg-orange-500/10 text-orange-600 border-none mt-2">Dwell Time Avg: 42m</Badge>
                </CardContent>
              </Card>
              <Card className="border-dashed border-2">
                <CardContent className="pt-6 text-center space-y-2">
                  <Activity className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="font-bold">Sector B (Main Bar)</p>
                  <p className="text-sm text-muted-foreground">Density: Optimal (8 tags)</p>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none mt-2">Dwell Time Avg: 12m</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* VIEW: Autonomic KDS (Kitchen Display Engine) */}
        {activeView === "kds" && hasKitchenTelemetry && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 p-4 rounded-lg">
              <div>
                <h3 className="font-bold text-orange-600 flex items-center">
                  <Server className="w-4 h-4 mr-2" />
                  Elo Android Hardware Telemetry Linked
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitoring dynamic Speed-of-Service (SoS) across all prep stations.
                </p>
              </div>
              <Badge variant="outline" className="bg-background text-orange-600">Global Load: 84%</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-orange-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex justify-between items-center">
                    Grill Station <Badge variant="destructive">Critical</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Algorithmic Load</span>
                      <span>92%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-destructive h-1.5 rounded-full" style={{ width: "92%" }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex justify-between items-center">
                    Garde Manger <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Optimal</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Algorithmic Load</span>
                      <span>45%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "45%" }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex justify-between items-center">
                    Saucier <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Elevated</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Algorithmic Load</span>
                      <span>71%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "71%" }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <LiveCheckout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
};

export default POSModule;