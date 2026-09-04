import { useCallback, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle, Radio, StopCircle, Activity } from "lucide-react";

const BUCKET = "idia-data-quarantine-prod";
const CHUNK_INTERVAL_MS = 5000; // 5-second temporal micro-chunks

interface ChunkStatus {
  sequence: number;
  status: "uploading" | "done" | "error";
  message?: string;
  size: number;
}

export default function VultureUploader() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunks, setChunks] = useState<ChunkStatus[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sequenceRef = useRef<number>(0);

  const processChunk = useCallback(async (blob: Blob, sequence: number) => {
    console.info(`[BEGIN: VultureUI.Stream.ProcessChunk] Initiating processing for sequence ${sequence}.`, {
      size: blob.size,
    });

    setChunks((prev) => [{ sequence, status: "uploading", size: blob.size }, ...prev]);

    try {
      console.info(`[BEGIN: VultureUI.Stream.Upload] Executing ledger write for sequence ${sequence}.`);
      const path = `ambient_stream/${Date.now()}_seq_${sequence}.webm`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: "video/webm",
        upsert: false,
      });

      if (error) {
        console.error(`[ERROR: VultureUI.Stream.Upload] Supabase upload rejected sequence ${sequence}.`);
        throw error;
      }

      console.info(`[END: VultureUI.Stream.Upload] Sequence ${sequence} committed to immutable quarantine airlock.`);

      setChunks((prev) =>
        prev.map((c) => (c.sequence === sequence && c.status === "uploading" ? { ...c, status: "done" } : c)),
      );

      console.info(`[END: VultureUI.Stream.ProcessChunk] Processing cycle completed for sequence ${sequence}.`);
    } catch (e: any) {
      console.error(`[BEGIN: VultureUI.Stream.Stall] Critical failure during sequence ${sequence} processing.`, e);
      setChunks((prev) =>
        prev.map((c) =>
          c.sequence === sequence && c.status === "uploading"
            ? { ...c, status: "error", message: e.message ?? String(e) }
            : c,
        ),
      );
      console.info(`[END: VultureUI.Stream.Stall] Error state applied to UI for sequence ${sequence}.`);
    }
  }, []);

  const startStream = useCallback(async () => {
    console.info("[BEGIN: VultureUI.Stream.Initialization] Requesting ambient edge capture permissions.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      console.info("[END: VultureUI.Stream.Initialization] Device stream acquired successfully.");

      console.info("[BEGIN: VultureUI.Stream.RecorderSetup] Instantiating MediaRecorder with rolling buffer.");
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;
      sequenceRef.current = 0;

      recorder.ondataavailable = (event) => {
        console.info(`[BEGIN: VultureUI.Stream.DataAvailable] Data emitted from recorder. Size: ${event.data.size}`);
        if (event.data && event.data.size > 0) {
          sequenceRef.current += 1;
          processChunk(event.data, sequenceRef.current);
        }
        console.info("[END: VultureUI.Stream.DataAvailable] Data chunk routed to processor.");
      };

      recorder.start(CHUNK_INTERVAL_MS);
      setIsStreaming(true);
      console.info(
        `[END: VultureUI.Stream.RecorderSetup] MediaRecorder active. Micro-chunking interval set to ${CHUNK_INTERVAL_MS}ms.`,
      );
    } catch (e: any) {
      console.error("[ERROR: VultureUI.Stream.Initialization] Edge capture initialization failed.", e);
    }
  }, [processChunk]);

  const stopStream = useCallback(() => {
    console.info("[BEGIN: VultureUI.Stream.Termination] Stop signal received. Halting recorder and stream tracks.");

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      console.info("[END: VultureUI.Stream.Termination] MediaRecorder stopped.");
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      console.info("[END: VultureUI.Stream.Termination] Stream tracks severed.");
    }

    setIsStreaming(false);
    console.info("[END: VultureUI.Stream.Termination] Stream termination sequence complete.");
  }, []);

  return (
    <Card
      className={`border-2 transition-colors ${isStreaming ? "border-red-500/50 bg-red-500/5" : "border-dashed bg-muted/30"}`}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-10 rounded-md">
          {isStreaming ? (
            <Activity className="h-10 w-10 text-red-500 mb-3 animate-pulse" />
          ) : (
            <Radio className="h-10 w-10 text-muted-foreground mb-3" />
          )}

          <p className="text-sm font-medium mb-1">
            {isStreaming ? "Ambient Stream Active" : "Initialize Ambient Capture"}
          </p>
          <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
            {isStreaming
              ? "Capturing edge feed and committing temporal micro-chunks to the immutable quarantine airlock."
              : "Establish persistent connection to ingest in-stream data for Project Aziz."}
          </p>

          {!isStreaming ? (
            <Button onClick={startStream} variant="default" size="sm">
              <Radio className="w-4 h-4 mr-2" />
              <span>Open Stream Interface</span>
            </Button>
          ) : (
            <Button onClick={stopStream} variant="destructive" size="sm">
              <StopCircle className="w-4 h-4 mr-2" />
              <span>Terminate Feed</span>
            </Button>
          )}
        </div>

        {chunks.length > 0 && (
          <div className="mt-4 space-y-2 text-xs">
            <h4 className="font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Ledger Commit Log</h4>
            {chunks.slice(0, 5).map((c) => (
              <div key={c.sequence} className="flex items-center gap-2 bg-background p-2 rounded border">
                {c.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin" />}
                {c.status === "done" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                {c.status === "error" && <AlertCircle className="h-3 w-3 text-red-600" />}
                <span className="font-mono font-semibold">SEQ_{c.sequence.toString().padStart(4, "0")}</span>
                <span className="text-muted-foreground">({(c.size / 1024).toFixed(2)} KB)</span>
                {c.message && <span className="text-red-600 truncate">— {c.message}</span>}
              </div>
            ))}
            {chunks.length > 5 && (
              <p className="text-muted-foreground text-center pt-2">... {chunks.length - 5} earlier chunks committed</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
