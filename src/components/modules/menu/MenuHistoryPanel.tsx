import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { format } from "date-fns";

interface MenuHistoryEntry {
  id: string;
  item_name: string;
  action: string;
  performed_by: string;
  created_at: string;
}

const actionBadgeVariant = (action: string) => {
  switch (action) {
    case 'created': return 'default';
    case 'activated': return 'secondary';
    case 'deactivated': return 'outline';
    case 'removed': return 'destructive';
    default: return 'outline';
  }
};

interface MenuHistoryPanelProps {
  onBack: () => void;
}

export const MenuHistoryPanel = ({ onBack }: MenuHistoryPanelProps) => {
  const [entries, setEntries] = useState<MenuHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const businessId = await getBusinessId();
    const { data } = await supabase
      .from('menu_history' as any)
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      setEntries(data as any[]);
    }
    setLoading(false);
  };

  return (
    <div className="h-full max-h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center">
              <History className="w-4 h-4 mr-2" />
              Menu History
            </h2>
            <p className="text-xs text-muted-foreground">
              Track all menu item changes
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No History</h3>
              <p className="text-sm">Menu item changes will appear here</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{entry.item_name}</span>
                    <Badge variant={actionBadgeVariant(entry.action) as any} className="text-xs capitalize">
                      {entry.action}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}</span>
                    <span>·</span>
                    <span>{entry.performed_by}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
