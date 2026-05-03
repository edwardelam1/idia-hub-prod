import { ShieldAlert } from "lucide-react";
import { NanoBiteOpsDashboard } from "./NanoBiteOpsDashboard";

export const LifeSafetyCompliance = () => (
  <NanoBiteOpsDashboard
    title="Life Safety & Compliance"
    description="NFPA 101 audits, fire-suppression hood inspections, sprinkler cycles, LOTO and hazardous-chemical compliance."
    icon={ShieldAlert}
    accent="red"
    filter={(b) =>
      b.id.includes(".compliance.") ||
      b.id.includes(".life_safety") ||
      b.id.includes(".loto_") ||
      b.microElement?.toLowerCase() === "compliance" ||
      b.microElement === "Ride Safety"
    }
    emptyHint="No life-safety nano-bites mapped yet."
  />
);

export default LifeSafetyCompliance;