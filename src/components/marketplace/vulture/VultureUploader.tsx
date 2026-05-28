import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const BUCKET = "idia-data-quarantine-prod";

interface UploadStatus {
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

export default function VultureUploader() {
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      console.info("[BEGIN: VultureUI.Upload]", { name: file.name, size: file.size });
      setUploads((prev) => [{ name: file.name, status: "uploading" }, ...prev]);
      try {
        const path = `${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) throw error;
        setUploads((prev) =>
          prev.map((u) => (u.name === file.name && u.status === "uploading" ? { ...u, status: "done" } : u))
        );
        console.info("[END: VultureUI.Upload]", { name: file.name, path });
      } catch (e: any) {
        console.error("[BEGIN: VultureUI.Upload.Stall]", e);
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name && u.status === "uploading"
              ? { ...u, status: "error", message: e.message ?? String(e) }
              : u
          )
        );
      }
    }
  }, []);

  return (
    <Card className="border-dashed border-2">
      <CardContent className="p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center py-10 rounded-md transition-colors ${
            dragging ? "bg-primary/10 border-primary" : "bg-muted/30"
          }`}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">Drop distressed datasets here</p>
          <p className="text-xs text-muted-foreground mb-4">
            CSV or JSON — files land in the immutable quarantine airlock
          </p>
          <label>
            <input
              type="file"
              multiple
              accept=".csv,.json,application/json,text/csv"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Button asChild variant="outline" size="sm">
              <span>Choose files</span>
            </Button>
          </label>
        </div>

        {uploads.length > 0 && (
          <div className="mt-4 space-y-1 text-xs">
            {uploads.slice(0, 5).map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                {u.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin" />}
                {u.status === "done" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                {u.status === "error" && <AlertCircle className="h-3 w-3 text-red-600" />}
                <span className="font-mono">{u.name}</span>
                {u.message && <span className="text-red-600">— {u.message}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}