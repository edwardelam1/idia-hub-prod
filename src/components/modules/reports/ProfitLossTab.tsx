import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { ProfitLoss } from "@/hooks/use-enterprise-reports";

interface Props {
  profitLoss: ProfitLoss;
  loading: boolean;
}

export const ProfitLossTab = ({ profitLoss, loading }: Props) => {
  if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>;

  const { revenue, cogs, grossProfit, operatingExpenses, netIncome, lines } = profitLoss;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  const hasData = revenue > 0 || cogs > 0 || operatingExpenses > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <BarChart3 className="w-8 h-8 mb-2" />
          <p className="text-sm">No financial data available</p>
          <p className="text-xs">GL journal entries will populate as transactions are processed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold text-primary">${revenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Gross Profit</p>
              <p className="text-lg font-bold">${grossProfit.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{grossMargin.toFixed(1)}% margin</p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Operating Expenses</p>
              <p className="text-lg font-bold text-destructive">${operatingExpenses.toFixed(2)}</p>
            </div>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net Income</p>
              <p className={`text-lg font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>${netIncome.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{netMargin.toFixed(1)}% margin</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Profit & Loss Statement</CardTitle>
          <CardDescription className="text-xs">Live P&L from General Ledger entries</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-1">
            {/* Revenue Section */}
            <div className="font-semibold text-sm py-1 border-b">Revenue</div>
            {lines.filter(l => l.type === "revenue").map((l, i) => (
              <div key={i} className="flex justify-between py-1 pl-4">
                <span className="text-sm">{l.label}</span>
                <span className="text-sm font-medium">${l.amount.toFixed(2)}</span>
              </div>
            ))}
            {lines.filter(l => l.type === "revenue").length === 0 && (
              <div className="py-1 pl-4 text-sm text-muted-foreground">No revenue entries</div>
            )}
            <div className="flex justify-between py-1 font-semibold border-t">
              <span className="text-sm">Total Revenue</span>
              <span className="text-sm">${revenue.toFixed(2)}</span>
            </div>

            {/* COGS Section */}
            <div className="font-semibold text-sm py-1 border-b mt-2">Cost of Goods Sold</div>
            {lines.filter(l => l.type === "cogs").map((l, i) => (
              <div key={i} className="flex justify-between py-1 pl-4">
                <span className="text-sm">{l.label}</span>
                <span className="text-sm font-medium text-destructive">(${l.amount.toFixed(2)})</span>
              </div>
            ))}
            {lines.filter(l => l.type === "cogs").length === 0 && (
              <div className="py-1 pl-4 text-sm text-muted-foreground">No COGS entries</div>
            )}
            <div className="flex justify-between py-1 font-semibold border-t bg-muted/30 px-2 rounded">
              <span className="text-sm">Gross Profit</span>
              <span className="text-sm">${grossProfit.toFixed(2)}</span>
            </div>

            {/* Operating Expenses Section */}
            <div className="font-semibold text-sm py-1 border-b mt-2">Operating Expenses</div>
            {lines.filter(l => l.type === "expense").map((l, i) => (
              <div key={i} className="flex justify-between py-1 pl-4">
                <span className="text-sm">{l.label}</span>
                <span className="text-sm font-medium text-destructive">(${l.amount.toFixed(2)})</span>
              </div>
            ))}
            {lines.filter(l => l.type === "expense").length === 0 && (
              <div className="py-1 pl-4 text-sm text-muted-foreground">No operating expense entries</div>
            )}

            {/* Net Income */}
            <div className={`flex justify-between py-2 font-bold border-t-2 mt-2 px-2 rounded ${netIncome >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
              <span className="text-sm">Net Income</span>
              <span className="text-sm">${netIncome.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
