import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ShoppingCart, Trash2, AlertTriangle, Bug, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";

export interface InventoryHistoryEntry {
  id: string;
  item_name: string;
  action: string;
  quantity: number;
  unit: string;
  created_at: string;
  note?: string;
}

const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  added: { label: "Added", icon: Plus, color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  consumed: { label: "Consumed (Sold)", icon: ShoppingCart, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  spoiled: { label: "Spoiled", icon: Bug, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  wasted: { label: "Wasted (Shrinkage)", icon: AlertTriangle, color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  removed: { label: "Removed (Deleted)", icon: Trash2, color: "bg-red-500/15 text-red-600 border-red-500/30" },
};

const actionFilters = ["all", "added", "consumed", "spoiled", "wasted", "removed"] as const;

export const InventoryHistoryTab = () => {
  const [filterAction, setFilterAction] = useState<string>("all");
  const [entries, setEntries] = useState<InventoryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const businessId = await getBusinessId();
      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setEntries(data.map((row: any) => ({
          id: row.id,
          item_name: row.item_name,
          action: row.action,
          quantity: row.quantity,
          unit: row.unit,
          created_at: row.created_at,
          note: row.note,
        })));
      }
    } catch (err) {
      console.error('Error loading inventory history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterAction === "all"
    ? entries
    : entries.filter(e => e.action === filterAction);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-4 flex-shrink-0">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actionFilters.map(f => (
              <SelectItem key={f} value={f}>
                {f === "all" ? "All Actions" : actionConfig[f].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} entries</span>
      </div>

      <div className="border rounded-lg flex-1 min-h-0 bg-card">
        <ScrollArea className="h-full">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading history...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No history entries found.</div>
            ) : (
              filtered.map(entry => {
                const config = actionConfig[entry.action] || actionConfig.added;
                const Icon = config.icon;
                const date = new Date(entry.created_at);
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{entry.item_name}</div>
                      {entry.note && (
                        <div className="text-xs text-muted-foreground truncate">{entry.note}</div>
                      )}
                    </div>
                    <Badge variant="outline" className={config.color}>
                      {entry.action === "added" ? "+" : "−"}{entry.quantity} {entry.unit}
                    </Badge>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 w-36 text-right justify-end">
                      <Clock className="w-3 h-3" />
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
