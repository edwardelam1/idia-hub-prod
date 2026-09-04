import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Activity, Cpu, Fingerprint, Wifi } from "lucide-react";
import { SovereignWrapper } from "@/components/sovereign/SovereignWrapper";

// --- CORE SYSTEM ARCHITECTURE: CRYPTOGRAPHIC HASHING ---
async function generateTelemetryHash(payload: any): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    throw error;
  }
}

// --- LOW-LEVEL TELEMETRY DATA SHAPING (LORA/RETICULUM) ---
interface LoRaTelemetryPayload {
  latitude: number; // 8 bytes (double)
  longitude: number; // 8 bytes (double)
  altitude: number; // 4 bytes (float)
  gps_time: number; // 4 bytes (uint32)
  gps_date: number; // 4 bytes (uint32)
  satellites: number; // 1 byte (uint8)
  hdop: number; // 4 bytes (float)
  battery_voltage: number; // 4 bytes (float)
  fix_status: number; // 1 byte (uint8)
  fw_ver_major: number; // 1 byte (uint8)
  fw_ver_minor: number; // 1 byte (uint8)
}

function decodeLoRaPayload(buffer: ArrayBuffer): LoRaTelemetryPayload {
  if (buffer.byteLength !== 40) throw new Error("Invalid payload size. Expected 40 bytes.");
  const view = new DataView(buffer);
  return {
    latitude: view.getFloat64(0, true),
    longitude: view.getFloat64(8, true),
    altitude: view.getFloat32(16, true),
    gps_time: view.getUint32(20, true),
    gps_date: view.getUint32(24, true),
    satellites: view.getUint8(28),
    hdop: view.getFloat32(29, true),
    battery_voltage: view.getFloat32(33, true),
    fix_status: view.getUint8(37),
    fw_ver_major: view.getUint8(38),
    fw_ver_minor: view.getUint8(39),
  };
}

// --- HIGH-LEVEL APPLICATION DATA SHAPING (JSON) ---
interface SightingPin {
  pin_id: string;
  source_type: "HUMAN_VOLUNTEER" | "AI_VISION_NODE" | "AI_VOICE_NODE";
  source_id: string;
  confidence_score: number;
  location: { lat: number; lon: number; accuracy_meters: number };
  media_attached: boolean;
  media_uri?: string;
  timestamp: string;
}

interface NetworkAlert {
  alert_id: string;
  issuer_id: string;
  target_biometric_hash: string;
  status: "ACTIVE" | "RESOLVED";
  priority: "CRITICAL" | "STANDARD";
  geo_polygon: { type: "Polygon"; coordinates: number[][][] };
  timestamp_issued: string;
  audience_reached: number;
}

interface ModelMetadata {
  model_id: string;
  case_id: string;
  target_name_pseudonym: string;
  data_sources: { image_count: number; video_seconds: number; voice_samples: number };
  compiled_binary_uri: string;
  checksum: string;
  target_hardware: "ESP32-S3" | string;
  created_at: string;
}

interface LedgerCommit {
  id: string;
  type: "JSON_PIN" | "LORA_TELEMETRY" | "NETWORK_ALERT" | "MODEL_METADATA" | "NETWORK_VALIDATION";
  hash: string;
  status: "processing" | "committed" | "rejected";
  confidence?: number;
  routing_note?: string;
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
        `[BEGIN: VultureUI.NetworkValidation] Requesting autonomous system validation from external mesh network for action: ${targetState}`,
      );

      // Simulating external autonomous network validation delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.info(`[END: VultureUI.NetworkValidation] External network validation acquired.`);

      if (!isListening) {
        console.info("[BEGIN: VultureUI.ValidationLedger] Writing mesh gateway authorization to local UI log.");
        setCommits((prev) => [
          {
            id: crypto.randomUUID(),
            type: "NETWORK_VALIDATION",
            hash: "AUTHORIZED_BY_MESH_NETWORK",
            status: "committed",
          },
          ...prev,
        ]);
        console.info("[END: VultureUI.ValidationLedger] Gateway authorization logged.");
      }

      setIsListening(!isListening);
    } catch (error) {
      console.error(
        `[ERROR: VultureUI.GatewayToggle] Gateway transition aborted due to network validation rejection. Exception: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsTransitioning(false);
      console.info("[END: VultureUI.GatewayToggle] Gateway state transition sequence terminated.");
    }
  };

  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(async () => {
      console.info("[BEGIN: VultureUI.IngestionCycle] Awaiting incoming multiplexed data from mesh network.");

      const eventType = Math.random();
      let payloadToHash: any;
      let commitType: LedgerCommit["type"];
      let confidenceScore: number | undefined;
      let routingNote: string | undefined;

      if (eventType > 0.6) {
        console.info("[PROCESS: VultureUI.IngestionCycle] Constructing AI Sighting Pin payload.");
        const pin: SightingPin = {
          pin_id: crypto.randomUUID(),
          source_type: "AI_VISION_NODE",
          source_id: "edge-node-04",
          confidence_score: 0.94,
          location: { lat: 38.0406, lon: -84.5037, accuracy_meters: 5.2 },
          media_attached: true,
          media_uri: `https://storage.decentralized-mesh.net/pins/${crypto.randomUUID()}.jpg`,
          timestamp: new Date().toISOString(),
        };
        payloadToHash = pin;
        commitType = "JSON_PIN";
        confidenceScore = pin.confidence_score;
        if (confidenceScore > 0.9) routingNote = "Escalated to Official Law Enforcement Channels";
      } else if (eventType > 0.3) {
        console.info("[PROCESS: VultureUI.IngestionCycle] Decoding 40-byte LoRa telemetry buffer.");
        const buffer = new ArrayBuffer(40);
        const view = new DataView(buffer);
        view.setFloat64(0, 38.0406, true);
        view.setFloat64(8, -84.5037, true);
        view.setFloat32(16, 210.5, true);
        view.setUint8(37, 1);
        payloadToHash = decodeLoRaPayload(buffer);
        commitType = "LORA_TELEMETRY";
      } else if (eventType > 0.1) {
        console.info("[PROCESS: VultureUI.IngestionCycle] Constructing Network Alert payload.");
        const alert: NetworkAlert = {
          alert_id: crypto.randomUUID(),
          issuer_id: crypto.randomUUID(),
          target_biometric_hash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
          status: "ACTIVE",
          priority: "CRITICAL",
          geo_polygon: {
            type: "Polygon",
            coordinates: [
              [
                [-84.5, 38.0],
                [-84.4, 38.0],
                [-84.4, 38.1],
                [-84.5, 38.0],
              ],
            ],
          },
          timestamp_issued: new Date().toISOString(),
          audience_reached: 198,
        };
        payloadToHash = alert;
        commitType = "NETWORK_ALERT";
      } else {
        console.info("[PROCESS: VultureUI.IngestionCycle] Constructing Model Metadata payload.");
        const model: ModelMetadata = {
          model_id: crypto.randomUUID(),
          case_id: crypto.randomUUID(),
          target_name_pseudonym: "TARGET_P_01",
          data_sources: { image_count: 45, video_seconds: 120, voice_samples: 3 },
          compiled_binary_uri: "ipfs://QmYwAPJzv5CZsnA625s3Xf2n...",
          checksum: "a2c5b...f9d1",
          target_hardware: "ESP32-S3",
          created_at: new Date().toISOString(),
        };
        payloadToHash = model;
        commitType = "MODEL_METADATA";
      }

      const commitId = crypto.randomUUID();
      setCommits((prev) => [
        {
          id: commitId,
          type: commitType,
          hash: "pending...",
          status: "processing",
          confidence: confidenceScore,
          routing_note: routingNote,
        },
        ...prev,
      ]);
      console.info(`[END: VultureUI.IngestionCycle] Payload structured. ID: ${commitId}, Type: ${commitType}`);

      try {
        console.info(`[BEGIN: VultureUI.TelemetryLedger] Generating hash for ID: ${commitId}`);
        const hash = await generateTelemetryHash(payloadToHash);

        console.info(`[PROCESS: VultureUI.TelemetryLedger] Committing hash ${hash.substring(0, 8)}... to ledger.`);
        // IDIA Protocol ledger write implementation here

        setCommits((prev) => prev.map((c) => (c.id === commitId ? { ...c, status: "committed", hash } : c)));
        console.info(`[END: VultureUI.TelemetryLedger] Ledger sequence complete for ID: ${commitId}`);
      } catch (error) {
        console.error(
          `[ERROR: VultureUI.TelemetryLedger] Rejection during hashing or ledger write for ID: ${commitId}. Exception: ${error instanceof Error ? error.message : String(error)}`,
        );
        setCommits((prev) => prev.map((c) => (c.id === commitId ? { ...c, status: "rejected" } : c)));
      }
    }, 4500);

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
            ? "Decoding 40-byte LoRa binaries and HTTP/3 multiplexed JSON event schemas."
            : "Establish connection to the external mesh network. Validation is handled autonomously."}
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

      <div className="bg-[#FBFBFD] p-6 flex-1 min-h-[400px] overflow-y-auto">
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
                  c.type === "NETWORK_VALIDATION"
                    ? "bg-[#1D1D1F] border-[#007AFF]/40"
                    : "bg-slate-950 border-violet-900/40"
                }`}
                style={{ borderRadius: 12 }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                      c.type === "NETWORK_VALIDATION" ? "text-[#007AFF]" : "text-violet-400"
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

                {c.routing_note && (
                  <span className="text-[10px] font-bold text-red-400 mt-1 uppercase tracking-wider">
                    {c.routing_note}
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
