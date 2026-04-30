import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, ArrowRight, FileText, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { autoJournalEntry, fetchJournalEntries, GL_ACCOUNTS, type GLTransactionType } from "@/lib/gl-engine";

interface Transaction {
  id: string;
  transaction_type: string;
  product_name: string;
  from_location: string | null;
  to_location: string | null;
  quantity_change: number;
  reference_document: string;
  user_name: string;
  created_at: string;
  notes: string;
}

interface GLEntry {
  id: string;
  transaction_type: string;
  description: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  created_at: string;
}

const getTypeVariant = (type: string) => {
  switch (type) {
    case 'PO_Receipt': return 'default' as const;
    case 'Order_Pick': case 'POS_Sale': return 'secondary' as const;
    case 'Transfer': return 'outline' as const;
    case 'Cycle_Count': return 'outline' as const;
    case 'Adjustment': case 'Wastage': return 'destructive' as const;
    case 'Production_Run': return 'secondary' as const;
    case 'Return': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

const formatType = (type: string) => type.replace(/_/g, ' ');

export const TransactionLedgerTab = () => {
  const [transactions] = useState<Transaction[]>([]);
  const [glEntries, setGlEntries] = useState<GLEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeView, setActiveView] = useState<'transactions' | 'journal'>('transactions');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGLEntries();
  }, []);

  const loadGLEntries = async () => {
    const businessId = await getBusinessId();
    const entries = await fetchJournalEntries(businessId);
    setGlEntries(entries as GLEntry[]);
  };

  const filtered = transactions.filter(t => {
    const matchSearch = t.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reference_document.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || t.transaction_type === filterType;
    return matchSearch && matchType;
  });

  const filteredGL = glEntries.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.debit_account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.credit_account.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || e.transaction_type === filterType;
    return matchSearch && matchType;
  });

  const handleRecordTransaction = async (data: any) => {
    const businessId = await getBusinessId();
    const txType = data.transaction_type as GLTransactionType;
    const accounts = GL_ACCOUNTS[txType];

    if (accounts) {
      await autoJournalEntry(
        businessId,
        txType,
        Math.abs(data.quantity * (data.unit_cost || 1)),
        `${formatType(txType)}: ${data.product} (${data.quantity} units)`,
        undefined,
        undefined,
        txType
      );
    }

    toast({ title: "Transaction Recorded", description: `${formatType(data.transaction_type)} logged for ${data.product}` });
    setIsRecordOpen(false);
    await loadGLEntries();
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex gap-4 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PO_Receipt">PO Receipt</SelectItem>
            <SelectItem value="Production_Run">Production Run</SelectItem>
            <SelectItem value="POS_Sale">POS Sale</SelectItem>
            <SelectItem value="Inventory_Depletion">Depletion (COGS)</SelectItem>
            <SelectItem value="Wastage">Wastage</SelectItem>
            <SelectItem value="Transfer">Transfer</SelectItem>
            <SelectItem value="Adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button
            variant={activeView === 'transactions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('transactions')}
          >
            Transactions
          </Button>
          <Button
            variant={activeView === 'journal' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('journal')}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            GL Journal
          </Button>
        </div>
        <Button size="sm" onClick={() => setIsRecordOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Record
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeView === 'transactions' ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-xs font-medium">Timestamp</th>
                  <th className="text-left p-3 text-xs font-medium">Type</th>
                  <th className="text-left p-3 text-xs font-medium">Product</th>
                  <th className="text-left p-3 text-xs font-medium">From → To</th>
                  <th className="text-right p-3 text-xs font-medium">Qty</th>
                  <th className="text-left p-3 text-xs font-medium">Reference</th>
                  <th className="text-left p-3 text-xs font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                      No transactions recorded yet. Use "Record" to log inventory movements.
                    </td>
                  </tr>
                ) : filtered.map(tx => (
                  <tr key={tx.id} className="border-t hover:bg-muted/20 transition-colors" title={tx.notes}>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant={getTypeVariant(tx.transaction_type)} className="text-[10px]">
                        {formatType(tx.transaction_type)}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm font-medium">{tx.product_name}</td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">{tx.from_location || '—'}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span>{tx.to_location || '—'}</span>
                      </div>
                    </td>
                    <td className={`p-3 text-sm text-right font-mono font-medium ${tx.quantity_change > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono text-xs">{tx.reference_document}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{tx.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* GL Journal View */
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-xs font-medium">Timestamp</th>
                  <th className="text-left p-3 text-xs font-medium">Type</th>
                  <th className="text-left p-3 text-xs font-medium">Description</th>
                  <th className="text-left p-3 text-xs font-medium">Debit Account</th>
                  <th className="text-left p-3 text-xs font-medium">Credit Account</th>
                  <th className="text-right p-3 text-xs font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredGL.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      No journal entries yet. Transactions will auto-generate GL entries.
                    </td>
                  </tr>
                ) : filteredGL.map(entry => (
                  <tr key={entry.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant={getTypeVariant(entry.transaction_type)} className="text-[10px]">
                        {formatType(entry.transaction_type)}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{entry.description}</td>
                    <td className="p-3 text-sm font-medium text-emerald-600">{entry.debit_account}</td>
                    <td className="p-3 text-sm font-medium text-destructive">{entry.credit_account}</td>
                    <td className="p-3 text-sm text-right font-mono font-medium">
                      ${parseFloat(String(entry.amount)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
            <DialogDescription>Log an inventory movement with automatic GL journal entry</DialogDescription>
          </DialogHeader>
          <RecordTransactionForm onCancel={() => setIsRecordOpen(false)} onSubmit={handleRecordTransaction} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface InventoryItemOption {
  id: string;
  name: string;
  current_stock: number;
  current_cost: number | null;
  unit_of_measure: string;
}

interface LocationOption {
  id: string;
  name: string;
}

const FIELD_VISIBILITY: Record<string, { from: boolean; to: boolean; reference: boolean }> = {
  PO_Receipt:           { from: false, to: true,  reference: true },
  Production_Run:       { from: true,  to: true,  reference: false },
  POS_Sale:             { from: true,  to: false, reference: true },
  Inventory_Depletion:  { from: true,  to: false, reference: false },
  Wastage:              { from: true,  to: false, reference: false },
  Transfer:             { from: true,  to: true,  reference: false },
  Adjustment:           { from: true,  to: false, reference: false },
};

const RecordTransactionForm = ({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (data: any) => void }) => {
  const [items, setItems] = useState<InventoryItemOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [formData, setFormData] = useState({
    transaction_type: 'PO_Receipt', product: '', product_id: '', from_location: '', to_location: '',
    quantity: 0, unit_cost: 0, reference_document: '', notes: '', unit_of_measure: ''
  });

  useEffect(() => {
    const load = async () => {
      const businessId = await getBusinessId();
      const [itemsRes, locsRes] = await Promise.all([
        supabase.from('inventory_items').select('id, name, current_stock, current_cost, unit_of_measure').eq('business_id', businessId).eq('is_active', true),
        supabase.from('business_locations').select('id, name').eq('business_id', businessId).eq('is_active', true),
      ]);
      if (itemsRes.data) setItems(itemsRes.data as InventoryItemOption[]);
      if (locsRes.data) setLocations(locsRes.data as LocationOption[]);
    };
    load();
  }, []);

  const handleProductChange = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setFormData(p => ({
        ...p,
        product: item.name,
        product_id: item.id,
        quantity: item.current_stock,
        unit_cost: item.current_cost ?? 0,
        unit_of_measure: item.unit_of_measure,
      }));
    }
  };

  const accounts = GL_ACCOUNTS[formData.transaction_type as GLTransactionType];
  const vis = FIELD_VISIBILITY[formData.transaction_type] ?? { from: true, to: true, reference: true };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Transaction Type</Label>
          <Select value={formData.transaction_type} onValueChange={(v) => setFormData(p => ({ ...p, transaction_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PO_Receipt">PO Receipt</SelectItem>
              <SelectItem value="Production_Run">Production Run</SelectItem>
              <SelectItem value="POS_Sale">POS Sale</SelectItem>
              <SelectItem value="Inventory_Depletion">Inventory Depletion</SelectItem>
              <SelectItem value="Wastage">Wastage</SelectItem>
              <SelectItem value="Transfer">Transfer</SelectItem>
              <SelectItem value="Adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Product</Label>
          <Select value={formData.product_id} onValueChange={handleProductChange}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
              {items.length === 0 ? (
                <SelectItem value="_none" disabled>No products found</SelectItem>
              ) : items.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.current_stock} {item.unit_of_measure})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {accounts && (
        <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-1">
          <div className="font-semibold text-muted-foreground uppercase">GL Journal Preview</div>
          <div className="flex justify-between">
            <span className="text-emerald-600">DR: {accounts.debit}</span>
            <span className="text-destructive">CR: {accounts.credit}</span>
          </div>
        </div>
      )}

      {(vis.from || vis.to) && (
        <div className={`grid gap-4 ${vis.from && vis.to ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {vis.from && (
            <div className="space-y-2">
              <Label>From Location</Label>
              <Select value={formData.from_location} onValueChange={(v) => setFormData(p => ({ ...p, from_location: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {locations.length === 0 ? (
                    <SelectItem value="_none" disabled>No locations configured</SelectItem>
                  ) : locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {vis.to && (
            <div className="space-y-2">
              <Label>To Location</Label>
              <Select value={formData.to_location} onValueChange={(v) => setFormData(p => ({ ...p, to_location: v }))}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  {locations.length === 0 ? (
                    <SelectItem value="_none" disabled>No locations configured</SelectItem>
                  ) : locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className={`grid gap-4 ${vis.reference ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="space-y-2">
          <Label>Quantity {formData.unit_of_measure && `(${formData.unit_of_measure})`}</Label>
          <Input type="number" value={formData.quantity} onChange={(e) => setFormData(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} required />
        </div>
        <div className="space-y-2">
          <Label>Unit Cost ($)</Label>
          <Input type="number" step="0.01" value={formData.unit_cost} onChange={(e) => setFormData(p => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))} />
        </div>
        {vis.reference && (
          <div className="space-y-2">
            <Label>Reference Document</Label>
            <Input value={formData.reference_document} onChange={(e) => setFormData(p => ({ ...p, reference_document: e.target.value }))} placeholder="PO-2024-001" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Record Transaction</Button>
      </div>
    </form>
  );
};
