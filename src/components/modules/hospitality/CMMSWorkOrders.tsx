import { Wrench } from "lucide-react";
import { NanoBiteOpsDashboard } from "./NanoBiteOpsDashboard";

export const CMMSWorkOrders = () => (
  <NanoBiteOpsDashboard
    title="CMMS — Work Orders & Engineering"
    description="Preventive maintenance schedules, LOTO sign-offs, and asset-tied work orders for the engineering org."
    icon={Wrench}
    accent="amber"
    filter={(b) =>
      b.id.includes(".cmms.") ||
      b.id.includes(".maintenance.") ||
      b.microElement?.toLowerCase() === "facilities" ||
      b.microElement === "Maintenance"
    }
    emptyHint="No CMMS nano-bites mapped yet."
  />
);

export default CMMSWorkOrders;