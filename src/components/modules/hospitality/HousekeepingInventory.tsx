import { BedDouble } from "lucide-react";
import { NanoBiteOpsDashboard } from "./NanoBiteOpsDashboard";

export const HousekeepingInventory = () => (
  <NanoBiteOpsDashboard
    title="Housekeeping & Area Inventory"
    description="Cart par levels, chemical manifests, and dynamic linen / amenity recalculation against live PMS occupancy."
    icon={BedDouble}
    accent="cyan"
    filter={(b) =>
      b.id.includes(".housekeeping.") ||
      b.microElement === "Housekeeping"
    }
    emptyHint="No housekeeping nano-bites mapped yet."
  />
);

export default HousekeepingInventory;