import { useEffect } from "react";
import { Lock, Radio } from "lucide-react";
import VultureUploader from "./VultureUploader";
import VultureLedgerTable from "./VultureLedgerTable";
import { SovereignWrapper } from "@/components/sovereign/SovereignWrapper";

interface Props {
  userRole: string;
}

export default function VultureIngestionPanel({ userRole }: Props) {
  const isAdmin = userRole === "admin" || userRole === "csuite" || userRole === "enterprise";

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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="bg-[#1D1D1F] border border-[#007AFF]/30 p-5 rounded-[24px] shadow-lg flex items-start gap-4">
        <div className="p-2.5 bg-[#007AFF]/10 rounded-full mt-0.5">
          <Radio className="h-5 w-5 text-[#007AFF]" />
        </div>
        <div className="flex-1">
          <h4 className="text-[11px] font-black text-[#007AFF] uppercase tracking-widest mb-1.5">
            Mesh Gateway Airlock
          </h4>
          <p className="text-[12px] text-[#D2D2D7] leading-relaxed">
            Inbound multiplexed streams from autonomous edge nodes are intercepted in-memory, PII-stripped via the
            Liability Shield. Protocol, and shaped into 40-byte LoRa binaries or high-level JSON event schemas. Payloads
            are tagged{" "}
            <code className="bg-white/10 px-1 py-0.5 rounded text-[#F2F2F7] font-mono text-[10px]">
              ACQUIRED_REHABILITATED
            </code>{" "}
            and cryptographically hashed for immutable on-chain provenance prior to ledgering. Execution boundaries are
            explicitly traced via{" "}
            <code className="bg-white/10 px-1 py-0.5 rounded text-[#F2F2F7] font-mono text-[10px]">
              [BEGIN/END: Vulture.*]
            </code>{" "}
            telemetry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <VultureUploader />
        </div>
        <div className="lg:col-span-7">
          <VultureLedgerTable />
        </div>
      </div>
    </div>
  );
}
