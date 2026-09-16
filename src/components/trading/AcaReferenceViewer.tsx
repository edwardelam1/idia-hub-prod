import { useMemo, useState } from "react";
import { Copy, CheckCircle2, Download, ListTree, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PAGE_SIZE = 100;

interface AcaReferenceViewerProps {
  /** The egress receipt this consent set belongs to. */
  receiptId: string;
  /** Auditable Consent Artifact hashes captured by Best Friend AI for this yield. */
  references: string[];
  triggerClassName?: string;
}

/**
 * Renders the Auditable Consent Artifact hashes attached to an egress receipt.
 * These are data-record fingerprints from the Best Friend AI receipt — never
 * on-chain settlement transaction hashes.
 *
 * A single yield can carry tens of thousands of hashes, so the list is paged
 * (100 per page) and large exports are streamed to a file rather than rendered.
 */
const AcaReferenceViewer = ({ receiptId, references, triggerClassName }: AcaReferenceViewerProps) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const total = references.length;

  const filtered = useMemo(() => {
    if (!open) return [] as string[];
    const term = filter.trim().toLowerCase();
    const result = term ? references.filter((r) => r.toLowerCase().includes(term)) : references;
    console.info(
      `[BEGIN: EgressLogs.AcaMap] receipt=${receiptId} total=${total} filter="${term}" matched=${result.length}`,
    );
    console.info(`[END: EgressLogs.AcaMap] receipt=${receiptId} rendering page=${page + 1}`);
    return result;
  }, [open, filter, references, receiptId, total, page]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const copyAll = async () => {
    console.info(`[BEGIN: EgressLogs.AcaCopy] receipt=${receiptId} count=${total}`);
    try {
      await navigator.clipboard.writeText(references.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.info(`[END: EgressLogs.AcaCopy] receipt=${receiptId} copied=${total}`);
    } catch (e) {
      const err = e as Error;
      console.error(`[END: EgressLogs.AcaCopy] failed: ${err.message}\n${err.stack ?? ""}`);
    }
  };

  const download = () => {
    console.info(`[BEGIN: EgressLogs.AcaExport] receipt=${receiptId} count=${total}`);
    try {
      const blob = new Blob([JSON.stringify({ receipt_id: receiptId, count: total, aca_references: references }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aca-references-${receiptId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.info(`[END: EgressLogs.AcaExport] receipt=${receiptId} exported=${total}`);
    } catch (e) {
      const err = e as Error;
      console.error(`[END: EgressLogs.AcaExport] failed: ${err.message}\n${err.stack ?? ""}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPage(0); setFilter(""); } }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={total === 0}
          className={triggerClassName ?? "h-7 gap-1 px-2 font-mono text-xs"}
          aria-label={`View ${total} ACA references`}
        >
          <ListTree className="h-3.5 w-3.5" />
          {total} record{total === 1 ? "" : "s"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Auditable Consent Artifacts</DialogTitle>
          <DialogDescription className="text-xs">
            {total.toLocaleString()} consent hash{total === 1 ? "" : "es"} proving the data records in this yield.
            These are data fingerprints, not settlement transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
              placeholder="Filter hashes"
              className="h-8 pl-7 font-mono text-xs"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Copy all ACA references" onClick={copyAll}>
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Download ACA references" onClick={download}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <ol
          start={safePage * PAGE_SIZE + 1}
          className="max-h-[50vh] list-decimal space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-3 pl-8 font-mono text-[11px]"
        >
          {visible.length === 0 ? (
            <p className="-ml-4 list-none py-6 text-center text-muted-foreground">No matching consent hashes.</p>
          ) : (
            visible.map((ref, i) => (
              <li key={`${ref}-${safePage}-${i}`} className="break-all">
                {ref}
              </li>
            ))
          )}
        </ol>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">
            Page {safePage + 1} / {pageCount} · {filtered.length.toLocaleString()} shown
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcaReferenceViewer;
