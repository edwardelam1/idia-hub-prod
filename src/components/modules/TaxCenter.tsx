import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, Download, DollarSign, Receipt, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePosTransactions } from "@/hooks/use-pos-data";

const PERIOD_DAYS: Record<string, number> = {
  current_quarter: 90,
  last_quarter: 180,
  current_year: 365,
  last_year: 730,
};

export const TaxCenter = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("current_quarter");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const days = PERIOD_DAYS[selectedPeriod] || 90;
  const { summary, transactions, loading } = usePosTransactions(days);

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async (reportType: string) => {
    setIsGenerating(true);
    try {
      const content = `
Tax Report - ${reportType.toUpperCase()}
Period: ${selectedPeriod.replace(/_/g, " ")}
Generated: ${new Date().toLocaleDateString()}

=================================
SUMMARY (LIVE DATA)
=================================
Gross Sales: $${summary.totalRevenue.toFixed(2)}
Tax Collected: $${summary.totalTax.toFixed(2)}
Net Sales: $${summary.netSales.toFixed(2)}
Total Transactions: ${summary.totalTransactions}
Average Tax Rate: ${summary.avgTaxRate.toFixed(2)}%
`;
      downloadTextFile(content, `${reportType}_${selectedPeriod}_${new Date().toISOString().split("T")[0]}.txt`);
      toast({ title: "Report Generated", description: `${reportType} report downloaded` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate1099K = () => {
    const cardTxns = transactions.filter(t =>
      ["credit_card", "debit_card", "mobile_payment", "Credit Card", "Debit Card"].includes(t.payment_method)
    );
    const totalCardAmount = cardTxns.reduce((s, t) => s + (t.total_amount || 0), 0);

    const content = `
1099-K WORKSHEET (LIVE DATA)
Year: ${new Date().getFullYear()}
Generated: ${new Date().toLocaleDateString()}

=================================
CARD PAYMENT SUMMARY
=================================
Total Card Transactions: ${cardTxns.length}
Gross Card Payment Amount: $${totalCardAmount.toFixed(2)}

=================================
REPORTING REQUIREMENTS
=================================
$600+ threshold: ${totalCardAmount >= 600 ? "YES - 1099-K Required" : "NO - Below threshold"}
200+ transactions: ${cardTxns.length >= 200 ? "YES" : "NO"}

=================================
NOTES
=================================
- This worksheet is for internal use only
- Consult with tax professional for filing requirements
`;
    downloadTextFile(content, `1099K_worksheet_${new Date().getFullYear()}.txt`);
    toast({ title: "1099-K Worksheet Generated", description: "Worksheet downloaded" });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Tax & Compliance Center</h2>
            <p className="text-xs text-muted-foreground">Live tax data from POS transactions</p>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current_quarter">Current Quarter</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="current_year">Current Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 flex space-x-3">
        <div className="flex-1 space-y-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="flex items-center text-sm"><FileText className="w-4 h-4 mr-2" />Financial Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12 flex flex-col items-center justify-center text-xs" onClick={() => handleGenerateReport("profit_loss")} disabled={isGenerating}>
                  <Calculator className="w-4 h-4 mb-1" /><span>P&L Statement</span>
                </Button>
                <Button variant="outline" className="h-12 flex flex-col items-center justify-center text-xs" onClick={() => handleGenerateReport("tax_summary")} disabled={isGenerating}>
                  <Receipt className="w-4 h-4 mb-1" /><span>Tax Reports</span>
                </Button>
                <Button variant="outline" className="h-12 flex flex-col items-center justify-center text-xs" onClick={handleGenerate1099K} disabled={isGenerating}>
                  <Download className="w-4 h-4 mb-1" /><span>1099-K Worksheet</span>
                </Button>
                <Button variant="outline" className="h-12 flex flex-col items-center justify-center text-xs" onClick={() => handleGenerateReport("sales_tax")} disabled={isGenerating}>
                  <DollarSign className="w-4 h-4 mb-1" /><span>Sales Tax</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Tax Summary — {selectedPeriod.replace(/_/g, " ").toUpperCase()}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-lg font-bold text-primary">${summary.totalTax.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Sales Tax</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-lg font-bold">${summary.totalRevenue.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Gross Sales</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-lg font-bold">{summary.avgTaxRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Avg Tax Rate</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-lg font-bold">{summary.totalTransactions.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Transactions</div>
                </div>
              </div>
              {loading && <p className="text-xs text-muted-foreground mt-2 text-center">Loading live data…</p>}
            </CardContent>
          </Card>
        </div>

        <div className="w-64 space-y-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="flex items-center text-sm"><AlertTriangle className="w-4 h-4 mr-2" />Compliance</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-success/10 rounded border border-success/20">
                  <div>
                    <div className="text-xs font-medium">Sales Tax</div>
                    <div className="text-xs text-muted-foreground">{summary.totalTransactions > 0 ? "Collecting" : "No activity"}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${summary.totalTransactions > 0 ? "bg-success" : "bg-muted-foreground"}`} />
                </div>
                <div className="flex items-center justify-between p-2 bg-warning/10 rounded border border-warning/20">
                  <div>
                    <div className="text-xs font-medium">Payroll Tax</div>
                    <div className="text-xs text-muted-foreground">Due in 5 days</div>
                  </div>
                  <div className="w-2 h-2 bg-warning rounded-full" />
                </div>
                <div className="flex items-center justify-between p-2 bg-success/10 rounded border border-success/20">
                  <div>
                    <div className="text-xs font-medium">Income Tax</div>
                    <div className="text-xs text-muted-foreground">Filed</div>
                  </div>
                  <div className="w-2 h-2 bg-success rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start h-8 text-xs"><Calculator className="w-3 h-3 mr-2" />Tax Calculator</Button>
                <Button variant="outline" className="w-full justify-start h-8 text-xs"><FileText className="w-3 h-3 mr-2" />Tax Calendar</Button>
                <Button variant="outline" className="w-full justify-start h-8 text-xs"><Download className="w-3 h-3 mr-2" />Export Records</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
