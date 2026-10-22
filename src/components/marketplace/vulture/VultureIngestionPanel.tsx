import { useEffect, useState } from "react";
import { ChevronDown, Lock, Radio } from "lucide-react";
import VultureUploader from "./VultureUploader";
import VultureLedgerTable from "./VultureLedgerTable";
import MeshNodeIntegration from "./MeshNodeIntegration";
import { SovereignWrapper } from "@/components/sovereign/SovereignWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useResponsive } from "@/hooks/useResponsive";

interface Props {
  userRole: string;
}

export default function VultureIngestionPanel({ userRole }: Props) {
  const isAdmin = userRole === "admin" || userRole === "csuite" || userRole === "enterprise";
  const { isDesktop } = useResponsive();
  const [specsOpen, setSpecsOpen] = useState(false);

  useEffect(() => {
    console.info(`[BEGIN: VultureUI.IngestionPanel] Mounting gateway panel. Assessed Role: ${userRole}`);
    return () => console.info(`[END: VultureUI.IngestionPanel] Unmounting gateway panel.`);
  }, [userRole]);

  if (!isAdmin) {
    return (
      <SovereignWrapper id="vulture.gateway.restricted" className="max-w-2xl mx-auto mt-8">
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Lock className="h-10 w-10 text-[#D2D2D7] mb-4" />
          <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-widest mb-2">Restricted Clearance</h3>
          <p className="text-[12px] text-[#86868B] max-w-sm">
            The Vulture Mesh Gateway is securely restricted to authorized administrators and enterprise system
            operators.
          </p>
        </div>
      </SovereignWrapper>
    );
  }

  return (
    <div className="space-y-3 max-w-[1400px] mx-auto sm:space-y-6">
      {/* Airlock banner — title always visible, protocol specs expand on demand */}
      <Collapsible open={specsOpen} onOpenChange={setSpecsOpen}>
        <div className="bg-[#1D1D1F] border border-[#007AFF]/30 rounded-2xl shadow-lg sm:rounded-[24px]">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 p-3 text-left sm:p-4"
              aria-label={specsOpen ? "Hide protocol specs" : "Show protocol specs"}
            >
              <div className="shrink-0 rounded-full bg-[#007AFF]/10 p-2">
                <Radio className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-black text-[#007AFF] uppercase tracking-widest">
                  Mesh Gateway Airlock
                </h4>
                <p className="truncate text-[11px] text-[#D2D2D7]">
                  {specsOpen ? "Protocol specs" : "PII-stripped, hashed, ledgered · Protocol specs"}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#D2D2D7] transition-transform ${specsOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="px-3 pb-3 text-[12px] text-[#D2D2D7] leading-relaxed sm:px-5 sm:pb-5">
              Inbound multiplexed streams from autonomous edge nodes are intercepted in-memory, PII-stripped via the
              Liability Shield. Protocol, and shaped into 40-byte LoRa binaries or high-level JSON event schemas.
              Payloads are tagged{" "}
              <code className="bg-white/10 px-1 py-0.5 rounded text-[#F2F2F7] font-mono text-[10px]">
                ACQUIRED_REHABILITATED
              </code>{" "}
              and cryptographically hashed for immutable on-chain provenance prior to ledgering. Execution boundaries
              are explicitly traced via{" "}
              <code className="bg-white/10 px-1 py-0.5 rounded text-[#F2F2F7] font-mono text-[10px]">
                [BEGIN/END: Vulture.*]
              </code>{" "}
              telemetry.
            </p>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {isDesktop ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-6">
            <VultureUploader />
            <MeshNodeIntegration />
          </div>
          <div className="col-span-7">
            <VultureLedgerTable />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="upload" className="space-y-2">
          <TabsList className="grid h-auto w-full grid-cols-3 p-0.5">
            <TabsTrigger value="upload" className="py-1.5 text-xs">Uploader</TabsTrigger>
            <TabsTrigger value="nodes" className="py-1.5 text-xs">Mesh Nodes</TabsTrigger>
            <TabsTrigger value="ledger" className="py-1.5 text-xs">Ledger</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-0">
            <VultureUploader />
          </TabsContent>
          <TabsContent value="nodes" className="mt-0">
            <MeshNodeIntegration />
          </TabsContent>
          <TabsContent value="ledger" className="mt-0">
            <VultureLedgerTable />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
