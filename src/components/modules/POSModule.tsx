import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  AlertCircle,
  Clock,
  Users,
  Search,
  ShoppingCart,
  CreditCard,
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

      {/* Base POS surface (placeholder grid) */}
      <Card className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <ShoppingCart className="w-4 h-4" />
        POS catalog hydrates here from merchant_blueprint.json
      </Card>

      <LiveCheckout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
};

export default POSModule;