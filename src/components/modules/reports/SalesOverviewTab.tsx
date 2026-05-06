import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, BarChart3 } from "lucide-react";

interface Props {
  summary: { totalRevenue: number; totalTransactions: number; avgTicket: number; totalTax: number };
  dailySales: { date: string; day: string; sales: number; transactions: number }[];
  categoryBreakdown: { name: string; value: number; percentage: number }[];
  loading: boolean;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export const SalesOverviewTab = ({ summary, dailySales, categoryBreakdown, loading }: Props) => (
  <div className="flex flex-col space-y-3">
    <div className="grid grid-cols-4 gap-3">
      <Card className="p-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold">${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>
      <Card className="p-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-bold">{summary.totalTransactions.toLocaleString()}</p>
          </div>
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>
      <Card className="p-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Avg Ticket</p>
            <p className="text-lg font-bold">${summary.avgTicket.toFixed(2)}</p>
          </div>
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>
      <Card className="p-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Tax Collected</p>
            <p className="text-lg font-bold">${summary.totalTax.toFixed(2)}</p>
          </div>
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>
    </div>

    <div className="grid lg:grid-cols-2 gap-3" style={{ height: "280px" }}>
      <Card className="h-full">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Sales Trend</CardTitle>
          <CardDescription className="text-xs">Daily sales over selected period</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 h-48">
          {dailySales.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Sales"]} />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {loading ? "Loading..." : "No sales data for this period"}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Category Breakdown</CardTitle>
          <CardDescription className="text-xs">Sales by product category</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 overflow-y-auto" style={{ maxHeight: "220px" }}>
          {categoryBreakdown.length > 0 ? (
            <div className="space-y-2">
              {categoryBreakdown.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-2 border rounded bg-card hover:bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <div>
                      <div className="text-xs font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">${item.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {loading ? "Loading..." : "No category data"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);
