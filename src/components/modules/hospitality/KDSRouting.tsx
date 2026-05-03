import { ChefHat } from "lucide-react";
import { NanoBiteOpsDashboard } from "./NanoBiteOpsDashboard";

export const KDSRouting = () => (
  <NanoBiteOpsDashboard
    title="Kitchen Display Routing"
    description="Splinter POS tickets to broiler, fry, garde manger and expeditor zones with speed-of-service telemetry."
    icon={ChefHat}
    accent="orange"
    filter={(b) =>
      b.id.includes(".kds.") ||
      b.microElement?.toLowerCase() === "kitchen" ||
      b.microElement === "Kitchen Automation"
    }
    emptyHint="No KDS routing nano-bites mapped yet."
  />
);

export default KDSRouting;