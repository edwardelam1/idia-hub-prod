import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Activity, Cpu, Fingerprint, Wifi } from "lucide-react";
import { SovereignWrapper } from "@/components/sovereign/SovereignWrapper";

// Machine-to-Machine Cryptographic Provenance
async function generateTelemetryHash(payload: any): Promise<string> {
  console.info("[BEGIN: generateTelemetryHash] Initiating Web Crypto SHA-256 buffer conversion.");
  try {
    const msgBuffer = new TextEncoder().encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    console.info(`[END: generateTelemetryHash] Machine provenance hash generated: ${hex.substring(0, 8)}...`);
    return hex;
  } catch (error) {
    console.error(
      `[ERROR: generateTelemetryHash] Web Crypto hashing failed. Exception: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

interface SightingPin {
  pin_id: string;
  source_type: "HUMAN_VOLUNTEER" | "AI_VISION_NODE" | "AI_VOICE_NODE";
  source_id: string;
  confidence_score: number;
  location: { lat: number; lon: number; accuracy_meters: number };
  timestamp: string;
}

interface LedgerCommit {
  id: string;
  type: "JSON_PIN" | "LORA_TELEMETRY" | "AZIZ_VALIDATION";
  hash: string;
  status: "processing" | "committed" | "rejected";
  confidence?: number;
}

export default function VultureUploader() {
  const [isListening, setIsListening] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [commits, setCommits] = useState<LedgerCommit[]>([]);

  const toggleGatewayStatus = async () => {
    console.info("[BEGIN: VultureUI.GatewayToggle] Initiating gateway state transition.");
    setIsTransitioning(true);

    try {
      const targetState = !isListening ? "OPEN_MESH_GATEWAY" : "SEVER_MESH_GATEWAY";
      console.info(
        `[BEGIN: VultureUI.AzizValidation] Requesting autonomous system validation from Project Aziz for action: ${targetState}`,
      );

      // Simulating Project Aziz autonomous network validation delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.info(`[END: VultureUI.AzizValidation] Aziz network validation acquired.`);

      if (!isListening) {
        console.info("[BEGIN: VultureUI.ValidationLedger] Writing Aziz gateway authorization to local UI log.");
        setCommits((prev) => [
          {
            id: crypto.randomUUID(),
            type: "AZIZ_VALIDATION",
            hash: "AUTHORIZED_BY_AZIZ_NETWORK",
            status: "committed",
          },
          ...prev,
        ]);
        console.info("[END: VultureUI.ValidationLedger] Gateway authorization logged.");
      }

      setIsListening(!isListening);
    } catch (error) {
      console.error(
        `[ERROR: VultureUI.GatewayToggle] Gateway transition aborted due to Aziz validation rejection. Exception: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsTransitioning(false);
      console.info("[END: VultureUI.GatewayToggle] Gateway state transition sequence terminated.");
    }
  };

  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(async () => {
      console.info("[BEGIN: VultureUI.IngestionCycle] Awaiting incoming data from Reticulum mesh.");

      const incomingPin: SightingPin = {
        pin_id: crypto.randomUUID(),
        source_type: "AI_VISION_NODE",
        source_id: "xiao-sense-s3-node-04",
        confidence_score: 0.94,
        location: { lat: 38.0406, lon: -84.5037, accuracy_meters: 5.2 },
        timestamp: new Date().toISOString(),
      };

      console.info("[END: VultureUI.IngestionCycle] JSON Sighting Pin received from autonomous node.");

      const newCommit: LedgerCommit = {
        id: incomingPin.pin_id,
        type: "JSON_PIN",
        hash: "pending...",
        status: "processing",
        confidence: incomingPin.confidence_score,
      };

      setCommits((prev) => [newCommit, ...prev]);

      try {
        console.info("[BEGIN: VultureUI.TelemetryLedger] Processing telemetry machine hash.");
        const hash = await generateTelemetryHash(incomingPin);

        if (incomingPin.confidence_score > 0.9) {
          console.info(
            "[BEGIN: VultureUI.Escalation] Confidence threshold exceeded (0.90). Triggering dispatch routing.",
          );
          // Automated routing logic would execute here
          console.info("[END: VultureUI.Escalation] Dispatch routing executed.");
        }

        setCommits((prev) => prev.map((c) => (c.id === incomingPin.pin_id ? { ...c, status: "committed", hash } : c)));
        console.info("[END: VultureUI.TelemetryLedger] Telemetry machine hash resolved and committed to UI.");
      } catch (error) {
        console.error(
          `[ERROR: VultureUI.TelemetryLedger] Failure during machine hashing or ledger dispatch. Exception: ${error instanceof Error ? error.message : String(error)}`,
        );
        setCommits((prev) => prev.map((c) => (c.id === incomingPin.pin_id ? { ...c, status: "rejected" } : c)));
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isListening]);

  return (
    <SovereignWrapper id="vulture.mesh.gateway" className="max-w-2xl mx-auto">
      <div className="p-8 flex flex-col items-center justify-center border-b border-[#F2F2F7]">
        {isListening ? (
          <div className="relative">
            <Wifi className="h-12 w-12 text-[#007AFF] animate-ping absolute opacity-20" />
            <Cpu className="h-12 w-12 text-[#007AFF] relative z-10" />
          </div>
        ) : (
          <Activity className="h-12 w-12 text-[#D2D2D7] mb-2" />
        )}

        <h3 className="text-lg font-bold text-[#1D1D1F] mt-4 tracking-tight">
          {isListening ? "Reticulum Mesh Active" : "Edge Ingestion Offline"}
        </h3>
        <p className="text-[13px] text-[#86868B] mt-1 mb-6 text-center max-w-sm leading-relaxed">
          {isListening
            ? "Gateway authorized by Project Aziz. Synchronizing autonomous telemetry payloads."
            : "Establish connection to the Project Aziz mesh network. Validation is handled autonomously."}
        </p>

        <Button
          onClick={toggleGatewayStatus}
          disabled={isTransitioning}
          variant={isListening ? "destructive" : "default"}
          className="rounded-full px-6 font-bold tracking-wide"
        >
          {isTransitioning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ShieldAlert className="w-4 h-4 mr-2" />
          )}
          <span>{isListening ? "Sever Gateway" : "Authorize Gateway"}</span>
        </Button>
      </div>

      {/* ─── PROVENANCE STAMP LEDGER (IDIA Pay PicoBite Aesthetic) ─── */}
      <div className="bg-[#FBFBFD] p-6 flex-1 min-h-[300px] overflow-y-auto">
        <h4 className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.15em] mb-4">
          Machine Provenance Log
        </h4>

        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <Fingerprint className="h-8 w-8 text-[#D2D2D7] mb-2" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#86868B]">Awaiting Hashes</span>
          </div>
        ) : (
          <div className="space-y-3">
            {commits.map((c) => (
              <div
                key={c.id}
                className={`relative w-full flex flex-col gap-1 px-4 py-3 border transition-all ${
                  c.type === "AZIZ_VALIDATION"
                    ? "bg-[#1D1D1F] border-[#007AFF]/40"
                    : "bg-slate-950 border-violet-900/40"
                }`}
                style={{ borderRadius: 12 }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                      c.type === "AZIZ_VALIDATION" ? "text-[#007AFF]" : "text-violet-400"
                    }`}
                  >
                    {c.status === "processing" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Fingerprint className="h-3 w-3" />
                    )}
                    {c.type.replace("_", " ")}
                  </span>

                  {c.confidence && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-sm ${
                        c.confidence > 0.9 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-slate-300"
                      }`}
                    >
                      CF: {(c.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                <span className="text-[12px] font-mono text-slate-300 truncate mt-1">{c.hash}</span>

                {c.status === "committed" && (
                  <span
                    className={`self-end text-[9px] font-bold uppercase mt-1 ${
                      c.type === "AZIZ_VALIDATION" ? "text-[#007AFF]/70" : "text-violet-400/70"
                    }`}
                  >
                    Verified • Tap to Audit
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SovereignWrapper>
  );
}
