import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, DollarSign, FileText } from "lucide-react";
import type { InventorySummary, ProcurementSummary } from "@/hooks/use-enterprise-reports";

interface Props {
  inventory: InventorySummary;
  procurement: ProcurementSummary;
  loading: boolean;
}

export const InventoryProcurementTab = ({ inventory, procurement, loading }: Props) => {
  if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Inventory Value</p>
              <p className="text-lg font-bold">${inventory.totalValuation.toFixed(2)}</p>
            </div>
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
              <p className="text-lg font-bold text-warning">{inventory.lowStockItems.length}</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">PO Spend</p>
              <p className="text-lg font-bold">${procurement.totalSpend.toFixed(2)}</p>
            </div>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active Suppliers</p>
              <p className="text-lg font-bold">{procurement.supplierCount}</p>
            </div>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Low Stock Items</CardTitle>
            <CardDescription className="text-xs">Items below par level requiring reorder</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 max-h-64 overflow-y-auto">
            {inventory.lowStockItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Par Level</TableHead>
                    <TableHead className="text-right">Deficit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.lowStockItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right text-warning font-medium">{item.current_stock}</TableCell>
                      <TableCell className="text-right">{item.par_level}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{item.current_stock - item.par_level}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                All items are at or above par level
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Procurement Overview</CardTitle>
            <CardDescription className="text-xs">Purchase order and supplier metrics</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Total Items Tracked</span>
                <span className="text-sm font-bold">{inventory.totalItems}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Open Purchase Orders</span>
                <Badge variant="secondary">{procurement.openPOs}</Badge>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Pending Invoices</span>
                <Badge variant={procurement.pendingInvoices > 0 ? "destructive" : "secondary"}>{procurement.pendingInvoices}</Badge>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Waste Events</span>
                <span className="text-sm font-bold">{inventory.wasteEvents}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
