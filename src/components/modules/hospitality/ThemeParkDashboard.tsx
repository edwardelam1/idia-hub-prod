import { Ferris as _unused } from "lucide-react"; // placeholder to satisfy lint if removed below
import { Gamepad2 } from "lucide-react";
import { NanoBiteOpsDashboard } from "./NanoBiteOpsDashboard";

export const ThemeParkDashboard = () => (
  <NanoBiteOpsDashboard
    title="Theme Park Operations"
    description="Guest entitlements, queue science, ride telemetry and life-safety choreography for a high-throughput park."
    icon={Gamepad2}
    accent="violet"
    filter={(b) => b.industryId === "tertiary.hospitality.theme_park"}
    emptyHint="No theme-park nano-bites currently registered."
  />
);

export default ThemeParkDashboard;