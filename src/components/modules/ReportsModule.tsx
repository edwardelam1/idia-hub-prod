import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePosTransactions } from "@/hooks/use-pos-data";
import { useEnterpriseReports } from "@/hooks/use-enterprise-reports";
import { SalesOverviewTab } from "./reports/SalesOverviewTab";
import { LocationPerformanceTab } from "./reports/LocationPerformanceTab";
import { LaborPayrollTab } from "./reports/LaborPayrollTab";
import { MenuEngineeringTab } from "./reports/MenuEngineeringTab";
import { InventoryProcurementTab } from "./reports/InventoryProcurementTab";
import { ProfitLossTab } from "./reports/ProfitLossTab";

const PERIOD_DAYS: Record<string, number> = {
  last_7_days: 7,
  last_30_days: 30,
  last_quarter: 90,
  last_year: 365,
};

export const ReportsModule = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("last_30_days");
  const [activeTab, setActiveTab] = useState("sales");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const days = PERIOD_DAYS[selectedPeriod] || 30;
  const { summary, dailySales, categoryBreakdown, locationPerformance, loading: posLoading } = usePosTransactions(days);
  const { labor, inventory, procurement, profitLoss, menuEngineering, timeEntries, locationNames, loading: entLoading } = useEnterpriseReports(days);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = [
        "Date,Sales,Transactions,Avg Ticket",
        ...dailySales.map(d => `${d.date},$${d.sales.toFixed(2)},${d.transactions},$${d.transactions > 0 ? (d.sales / d.transactions).toFixed(2) : '0.00'}`)
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales_report_${selectedPeriod}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Report exported as CSV" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Business Analytics</h2>
            <p className="text-xs text-muted-foreground">Enterprise reporting hub — live data</p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="h-8">
              <Download className="w-3 h-3 mr-1" />Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-3 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
            <TabsTrigger value="locations" className="text-xs">Locations</TabsTrigger>
            <TabsTrigger value="labor" className="text-xs">Labor & Payroll</TabsTrigger>
            <TabsTrigger value="menu" className="text-xs">Menu Engineering</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">Inventory & Procurement</TabsTrigger>
            <TabsTrigger value="pnl" className="text-xs">Profit & Loss</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="sales" className="m-0">
            <SalesOverviewTab summary={summary} dailySales={dailySales} categoryBreakdown={categoryBreakdown} loading={posLoading} />
          </TabsContent>
          <TabsContent value="locations" className="m-0">
            <LocationPerformanceTab locationPerformance={locationPerformance} locationNames={locationNames} loading={posLoading} />
          </TabsContent>
          <TabsContent value="labor" className="m-0">
            <LaborPayrollTab labor={labor} timeEntries={timeEntries} loading={entLoading} />
          </TabsContent>
          <TabsContent value="menu" className="m-0">
            <MenuEngineeringTab items={menuEngineering} loading={entLoading} />
          </TabsContent>
          <TabsContent value="inventory" className="m-0">
            <InventoryProcurementTab inventory={inventory} procurement={procurement} loading={entLoading} />
          </TabsContent>
          <TabsContent value="pnl" className="m-0">
            <ProfitLossTab profitLoss={profitLoss} loading={entLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
