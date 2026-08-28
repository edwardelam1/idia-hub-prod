import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getSuggestedPicosForNano, type SuggestedPicoRelation } from "@/hooks/usePayBlueprintCatalog";
import { toast } from "sonner";
import { X, Plus, Sparkles, Search } from "lucide-react";


export interface PicoBite {
  id: string;
  tag: string;
  name: string;
  ui_component: string | null;
  gate_policy: unknown;
}

export interface NanoPicoRelation {
  pico_bite_id: string;
  relationship_weight: number;
  is_mandatory: boolean;
  slot: string | null;
}

interface NanoBiteLike {
  id: string;
  task: string;
  microElement?: string;
  industryId?: string;
}

interface Props {
  bite: NanoBiteLike | null;
  assignments: string[];
  onChange: (biteId: string, picoIds: string[]) => void;
  onClose: () => void;
}

/**
 * Nano-Bite ↔ Pico-Bite assignment dialog.
 * - Fetches the full pico catalog from `idia_pico_bites`.
 * - Loads suggested weighted relations from `idia_nano_pico_relations`.
 * - Highest-weighted picos are marked "Suggested"; lower-weighted picos are dimmed.
 * - User can freely add/remove picos; the selection is emitted into the blueprint JSON.
 */
export const NanoBitePicoDialog = ({ bite, assignments, onChange, onClose }: Props) => {
  const [catalog, setCatalog] = useState<PicoBite[]>([]);
  const [relations, setRelations] = useState<NanoPicoRelation[]>([]);
  const [loading, setLoading] = useState(false);
  const [addPickerValue, setAddPickerValue] = useState<string>("");
  const [picoQuery, setPicoQuery] = useState("");

  const open = !!bite;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: picos, error: e1 }, rels] = await Promise.all([
          supabase.from("idia_pico_bites").select("id, tag, name, ui_component, gate_policy").order("tag"),
          bite ? getSuggestedPicosForNano(bite.id) : Promise.resolve([] as SuggestedPicoRelation[]),
        ]);
        if (cancelled) return;
        if (e1) throw e1;
        setCatalog((picos as PicoBite[] | null) || []);
        // DB-ranked order is preserved exactly as returned; no client-side sorting.
        setRelations(
          (rels || [])
            .filter((r) => !!r.pico_bite)
            .map((r) => ({
              pico_bite_id: r.pico_bite!.id,
              relationship_weight: Number(r.relationship_weight ?? 0),
              is_mandatory: !!r.is_mandatory,
              slot: r.slot ?? null,
            })),
        );
      } catch (err: any) {
        console.error("[NanoBitePicoDialog] load failed", err);
        toast.error("Failed to load pico-bite catalog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, bite?.id]);

  const relByPico = useMemo(() => {
    const m = new Map<string, NanoPicoRelation>();
    relations.forEach((r) => m.set(r.pico_bite_id, r));
    return m;
  }, [relations]);

  const maxWeight = useMemo(
    () => relations.reduce((mx, r) => Math.max(mx, r.relationship_weight ?? 0), 0),
    [relations],
  );


  const assignedSet = useMemo(() => new Set(assignments), [assignments]);

  const assignedPicos = useMemo(
    () => catalog.filter((p) => assignedSet.has(p.id)),
    [catalog, assignedSet],
  );

  const availablePicos = useMemo(
    () => catalog.filter((p) => !assignedSet.has(p.id)),
    [catalog, assignedSet],
  );

  const filteredAvailablePicos = useMemo(() => {
    const q = picoQuery.trim().toLowerCase();
    if (!q) return availablePicos;
    return availablePicos.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) || p.tag?.toLowerCase().includes(q),
    );
  }, [availablePicos, picoQuery]);

  // Assigned IDs with no catalog match (legacy/ghost entries). Surfaced explicitly
  // so the count on the chip badge can never disagree with what's rendered here.
  const unresolvedIds = useMemo(
    () => (loading ? [] : assignments.filter((id) => !catalog.some((p) => p.id === id))),
    [assignments, catalog, loading],
  );

  const handleAdd = (picoId: string) => {
    if (!bite || !picoId) return;
    if (assignedSet.has(picoId)) return;
    onChange(bite.id, [...assignments, picoId]);
    setAddPickerValue("");
    setPicoQuery("");
  };

  const handleRemove = (picoId: string) => {
    if (!bite) return;
    onChange(bite.id, assignments.filter((id) => id !== picoId));
  };

  const strengthLabel = (weight?: number) => {
    if (!weight) return null;
    if (maxWeight > 0 && weight === maxWeight) return "Strongest";
    if (maxWeight > 0 && weight >= maxWeight * 0.66) return "Strong";
    return "Weak";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPicoQuery("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Assign Pico-Bites
          </DialogTitle>
          <DialogDescription>
            {bite ? (
              <span>
                Configuring <span className="font-medium text-foreground">{bite.task}</span>
                {bite.microElement ? <span className="text-muted-foreground"> · {bite.microElement}</span> : null}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Suggested (weighted) picos */}
          {relations.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Suggested by relationship graph
              </div>
              <div className="flex flex-wrap gap-1.5">
                {relations.map((rel) => {
                    const pico = catalog.find((p) => p.id === rel.pico_bite_id);
                    if (!pico) return null;
                    const isAssigned = assignedSet.has(pico.id);
                    const isTop = maxWeight > 0 && rel.relationship_weight === maxWeight;
                    const dimmed = !isTop && (rel.relationship_weight ?? 0) < maxWeight * 0.66;
                    return (
                      <button
                        key={pico.id}
                        type="button"
                        onClick={() => (isAssigned ? handleRemove(pico.id) : handleAdd(pico.id))}
                        className={`text-[11px] rounded-md border px-2 py-1 flex items-center gap-1 transition-opacity ${
                          isAssigned
                            ? "border-primary/60 bg-primary/10"
                            : "border-border bg-muted/40 hover:bg-muted/70"
                        } ${dimmed && !isAssigned ? "opacity-50" : ""}`}
                        title={`${pico.tag} · weight ${rel.relationship_weight}${rel.is_mandatory ? " · mandatory" : ""}`}
                      >
                        <span className="font-medium">{pico.name}</span>
                        <Badge variant="outline" className="text-[8px] px-1 py-0">
                          {strengthLabel(rel.relationship_weight)}
                        </Badge>
                        {rel.is_mandatory && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">
                            required
                          </Badge>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Currently assigned */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Assigned pico-bites ({assignedPicos.length})
            </div>
            {assignedPicos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                None assigned yet. Pick from suggestions above or the dropdown below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedPicos.map((p) => {
                  const rel = relByPico.get(p.id);
                  return (
                    <div
                      key={p.id}
                      className="text-[11px] rounded-md border border-primary/60 bg-primary/10 px-2 py-1 flex items-center gap-1.5"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[9px] text-muted-foreground">{p.tag}</span>
                      {rel && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0">
                          w{rel.relationship_weight}
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(p.id)}
                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {unresolvedIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unresolvedIds.map((id) => (
                  <div
                    key={id}
                    className="text-[11px] rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1 flex items-center gap-1.5"
                    title="This entry does not match any pico-bite and will not ship in the manifest."
                  >
                    <span className="font-medium">Unresolved</span>
                    <span className="text-[9px] text-muted-foreground break-all">{id}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(id)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                      aria-label={`Remove unresolved entry ${id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add from full catalog */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Add from full pico catalog
            </div>
            <div className="flex items-center gap-2">
              <Select value={addPickerValue} onValueChange={handleAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loading ? "Loading pico-bites…" : `Choose from ${availablePicos.length} pico-bites…`} />
                </SelectTrigger>
                <SelectContent
                  className="max-h-80 bg-popover"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <div
                    className="sticky top-0 z-10 -mx-1 -mt-1 mb-1 bg-popover px-2 pb-2 pt-1"
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        value={picoQuery}
                        onChange={(e) => setPicoQuery(e.target.value)}
                        placeholder="Search pico-bites…"
                        className="h-8 pl-7 text-xs"
                      />
                    </div>
                  </div>
                  {filteredAvailablePicos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-2 text-[10px]">{p.tag}</span>
                    </SelectItem>
                  ))}
                  {availablePicos.length === 0 && !loading && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      All pico-bites are already assigned.
                    </div>
                  )}
                  {availablePicos.length > 0 && filteredAvailablePicos.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No pico-bites match “{picoQuery}”.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" disabled title="Pick from the dropdown">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NanoBitePicoDialog;