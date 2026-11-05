import { useEffect, useState } from "react";
import { ChevronDown, Radio } from "lucide-react";
import VultureUploader from "./VultureUploader";
import VultureLedgerTable from "./VultureLedgerTable";
import MeshNodeIntegration from "./MeshNodeIntegration";
import MfaGate from "@/components/security/MfaGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useResponsive } from "@/hooks/useResponsive";

interface Props {
  /** Organization rate in Synapse Credits per intake batch (set by C-suite). */
  rate: number | null;
  businessName: string | null;
}

// Visibility is decided by the parent from per-organization provisioning; the server
// enforces the same rule on every node key, upload and intake batch.
export default function VultureIngestionPanel({ rate, businessName }: Props) {
  const { isDesktop } = useResponsive();
  const [specsOpen, setSpecsOpen] = useState(false);

  useEffect(() => {
    console.info(`[BEGIN: VultureUI.IngestionPanel] Mounting gateway panel. rate=${rate ?? "n/a"}`);
    return () => console.info(`[END: VultureUI.IngestionPanel] Unmounting gateway panel.`);
  }, [rate]);

  return (
    <div className="space-y-3 max-w-[1400px] mx-auto sm:space-y-6">
      {rate != null && (
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-xs sm:text-sm">
          <span className="truncate text-muted-foreground">
            {businessName ? `${businessName} rate` : "Platform rate"}
          </span>
          <span className="shrink-0 font-semibold text-foreground">{rate.toFixed(2)} CR / intake batch</span>
        </div>
      )}
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
              Inbound multiplexed streams from autonomous edge nodes are intercepted in-memory, PII-stripped, and shaped
              into 40-byte LoRa binaries or high-level JSON event schemas. Payloads are tagged{" "}
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

      <MfaGate resource="The Vulture console">
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
            <TabsTrigger value="upload" className="py-1.5 text-xs">
              Uploader
            </TabsTrigger>
            <TabsTrigger value="nodes" className="py-1.5 text-xs">
              Mesh Nodes
            </TabsTrigger>
            <TabsTrigger value="ledger" className="py-1.5 text-xs">
              Ledger
            </TabsTrigger>
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
      </MfaGate>
    </div>
  );
}
