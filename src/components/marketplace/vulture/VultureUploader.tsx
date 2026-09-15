import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cpu, Wifi, WifiOff, Upload, ShieldCheck, AlertTriangle, FileUp } from "lucide-react";
import { SovereignWrapper } from "@/components/sovereign/SovereignWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const QUARANTINE_BUCKET = "idia-data-quarantine-prod";
const ACCEPTED = ".json,.csv,.bin,.lora";

interface UploadResult {
  id: string;
  fileName: string;
  status: "uploading" | "sanitizing" | "committed" | "rejected";
  records?: number;
  sanitizedHash?: string;
  error?: string;
}

export default function VultureUploader() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const loadGatewayState = useCallback(async () => {
    console.info("[BEGIN: Vulture.GatewayState] Reading persisted mesh gateway authorization state.");
    try {
      const { data, error } = await supabase
        .from("mesh_gateway_state")
        .select("is_open")
        .eq("id", "singleton")
        .maybeSingle();
      if (error) {
        console.error(`[ERROR: Vulture.GatewayState] ${error.message}`);
        throw error;
      }
      setIsOpen(Boolean(data?.is_open));
      console.info(`[END: Vulture.GatewayState] Gateway is ${data?.is_open ? "OPEN" : "SEALED"}.`);
    } catch (err) {
      console.error(
        `[ERROR: Vulture.GatewayState.Stall] ${err instanceof Error ? err.stack : String(err)}`,
      );
    } finally {
      setGatewayLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGatewayState();
  }, [loadGatewayState]);

  const toggleGateway = async () => {
    console.info("[BEGIN: Vulture.GatewayToggle] Persisting mesh gateway state transition.");
    setIsTransitioning(true);
    const next = !isOpen;
    try {
      const { error } = await supabase
        .from("mesh_gateway_state")
        .update({ is_open: next, updated_by: user?.user_id ?? null })
        .eq("id", "singleton");
      if (error) {
        console.error(`[ERROR: Vulture.GatewayToggle] ${error.message}`);
        throw error;
      }

      console.info("[BEGIN: Vulture.GatewayToggle.Ledger] Recording authorization event to provenance ledger.");
      const { error: ledgerError } = await supabase.from("vulture_provenance_ledger" as any).insert({
        original_file_name: next ? "MESH_GATEWAY_OPENED" : "MESH_GATEWAY_SEALED",
        action: "gateway_authorization",
        status: "success",
        record_count: 0,
      });
      if (ledgerError) console.error(`[ERROR: Vulture.GatewayToggle.Ledger] ${ledgerError.message}`);
      console.info("[END: Vulture.GatewayToggle.Ledger] Authorization event recorded.");

      setIsOpen(next);
      toast({
        title: next ? "Mesh gateway open" : "Mesh gateway sealed",
        description: next
          ? "Authorized edge nodes can now transmit telemetry."
          : "All inbound node telemetry is now refused.",
      });
    } catch (err) {
      console.error(
        `[ERROR: Vulture.GatewayToggle.Stall] ${err instanceof Error ? err.stack : String(err)}`,
      );
      toast({
        title: "Gateway unchanged",
        description: "You may not have clearance to change the gateway state.",
        variant: "destructive",
      });
    } finally {
      setIsTransitioning(false);
      console.info("[END: Vulture.GatewayToggle] Transition sequence terminated.");
    }
  };

  const processFile = async (file: File) => {
    const id = crypto.randomUUID();
    const objectPath = `${new Date().toISOString().slice(0, 10)}/${id}-${file.name}`;
    setResults((prev) => [{ id, fileName: file.name, status: "uploading" }, ...prev]);

    console.info(`[BEGIN: Vulture.QuarantineUpload] Uploading ${file.name} (${file.size} bytes).`);
    try {
      const { error: uploadError } = await supabase.storage
        .from(QUARANTINE_BUCKET)
        .upload(objectPath, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (uploadError) {
        console.error(`[ERROR: Vulture.QuarantineUpload] ${uploadError.message}`);
        throw uploadError;
      }
      console.info(`[END: Vulture.QuarantineUpload] Object committed at ${objectPath}.`);

      setResults((prev) => prev.map((r) => (r.id === id ? { ...r, status: "sanitizing" } : r)));

      console.info(`[BEGIN: Vulture.SanitizationInvoke] Dispatching sanitization agent for ${objectPath}.`);
      const { data, error } = await supabase.functions.invoke("vulture-sanitization-agent", {
        body: { bucket: QUARANTINE_BUCKET, name: objectPath, created_at: new Date().toISOString() },
      });
      if (error) {
        console.error(`[ERROR: Vulture.SanitizationInvoke] ${error.message}`);
        throw error;
      }
      console.info(`[END: Vulture.SanitizationInvoke] Agent responded with ${data?.records ?? 0} records.`);

      setResults((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "committed", records: Number(data?.records ?? 0), sanitizedHash: data?.sanitizedHash }
            : r,
        ),
      );
      toast({
        title: "Payload rehabilitated",
        description: `${data?.records ?? 0} records sanitized and ledgered from ${file.name}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[ERROR: Vulture.QuarantinePipeline.Stall] ${err instanceof Error ? err.stack : String(err)}`,
      );
      setResults((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected", error: message } : r)));
      toast({ title: "Ingestion rejected", description: message, variant: "destructive" });
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    console.info(`[BEGIN: Vulture.IngestionBatch] ${files.length} file(s) queued for rehabilitation.`);
    setIsBusy(true);
    try {
      for (const file of Array.from(files)) {
        await processFile(file);
      }
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      console.info("[END: Vulture.IngestionBatch] Batch sequence terminated.");
    }
  };

  return (
    <SovereignWrapper id="vulture.mesh.gateway" className="max-w-2xl mx-auto">
      <div className="p-8 flex flex-col items-center justify-center border-b border-[#F2F2F7]">
        {isOpen ? (
          <div className="relative">
            <Wifi className="h-12 w-12 text-[#007AFF] animate-ping absolute opacity-20" />
            <Cpu className="h-12 w-12 text-[#007AFF] relative z-10" />
          </div>
        ) : (
          <WifiOff className="h-12 w-12 text-[#D2D2D7]" />
        )}

        <h3 className="mt-4 text-sm font-bold text-[#1D1D1F] uppercase tracking-widest">Mesh Gateway</h3>
        <p className="mt-1 text-[12px] text-[#86868B] text-center max-w-sm">
          {gatewayLoading
            ? "Reading authorization state…"
            : isOpen
              ? "Open. Authorized edge nodes may transmit telemetry to the ingest endpoint."
              : "Sealed. Inbound node telemetry is refused at the door."}
        </p>

        <Button onClick={toggleGateway} disabled={isTransitioning || gatewayLoading} className="mt-5 gap-2">
          {isTransitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isOpen ? "Seal Gateway" : "Authorize Gateway"}
        </Button>
      </div>

      <div className="p-6 border-b border-[#F2F2F7]">
        <div className="flex items-center gap-2 mb-3">
          <FileUp className="h-4 w-4 text-[#007AFF]" />
          <h4 className="text-[11px] font-black text-[#1D1D1F] uppercase tracking-widest">Quarantine Intake</h4>
        </div>
        <p className="text-[12px] text-[#86868B] mb-4">
          Upload a capture file (.json, .csv, .bin, .lora). It is quarantined, stripped of identifying fields,
          timestamp-reconstructed, ledgered and published with a provenance manifest.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleFiles(e.dataTransfer.files);
          }}
          className="rounded-[18px] border-2 border-dashed border-[#E5E5EA] bg-[#FBFBFD] px-6 py-8 text-center"
        >
          <Upload className="mx-auto h-6 w-6 text-[#86868B] mb-2" />
          <p className="text-[12px] text-[#86868B] mb-3">Drop capture files here</p>
          <Button variant="outline" disabled={isBusy} onClick={() => fileInputRef.current?.click()} className="gap-2">
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Choose Files
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="p-6 space-y-2">
          {results.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-[14px] border border-[#F2F2F7] bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#1D1D1F]">{r.fileName}</p>
                <p className="truncate font-mono text-[10px] text-[#86868B]">
                  {r.status === "committed"
                    ? `${r.records} records · ${r.sanitizedHash?.slice(0, 16) ?? ""}…`
                    : r.status === "rejected"
                      ? r.error
                      : r.status === "uploading"
                        ? "Uploading to quarantine…"
                        : "Sanitizing…"}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  r.status === "committed"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50 text-[10px]"
                    : r.status === "rejected"
                      ? "bg-red-500/10 text-red-600 border-red-200/50 text-[10px]"
                      : "bg-blue-500/10 text-blue-600 border-blue-200/50 text-[10px]"
                }
              >
                {r.status === "committed" ? (
                  <ShieldCheck className="mr-1 h-3 w-3" />
                ) : r.status === "rejected" ? (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                ) : (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                {r.status.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </SovereignWrapper>
  );
}
