import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Calendar, FileText, Download } from "lucide-react";
import { usePosTransactions } from "@/hooks/use-pos-data";

export const LocalReports = () => {
  const { summary, dailySales, loading } = usePosTransactions(7);

  // Calculate week-over-week values
  const bestDay = dailySales.length > 0
    ? dailySales.reduce((best, d) => d.sales > best.sales ? d : best, dailySales[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{summary.totalTransactions} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dailySales.length > 0 ? (summary.totalRevenue / dailySales.length).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Ticket</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.avgTicket.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalTax.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{summary.avgTaxRate.toFixed(1)}% avg rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Report</CardTitle>
              <CardDescription>Live revenue and transaction data (last 7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading live data…</p>
              ) : dailySales.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Transactions</TableHead>
                        <TableHead>Avg Ticket</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySales.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{new Date(day.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium text-success">${day.sales.toFixed(2)}</TableCell>
                          <TableCell>${day.tax.toFixed(2)}</TableCell>
                          <TableCell>{day.transactions}</TableCell>
                          <TableCell>${day.transactions > 0 ? (day.sales / day.transactions).toFixed(2) : "0.00"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {bestDay && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Weekly Highlights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Best Day</p>
                          <p className="font-medium">{bestDay.day} — ${bestDay.sales.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Transactions</p>
                          <p className="font-medium">{summary.totalTransactions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Average Daily</p>
                          <p className="font-medium">${(summary.totalRevenue / dailySales.length).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No sales data yet — process transactions through POS to see reports here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Key metrics from live POS data</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Revenue</TableCell>
                    <TableCell className="font-medium">${summary.totalRevenue.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Net Sales (excl. tax)</TableCell>
                    <TableCell className="font-medium">${summary.netSales.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Tax Collected</TableCell>
                    <TableCell className="font-medium">${summary.totalTax.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Average Ticket Size</TableCell>
                    <TableCell className="font-medium">${summary.avgTicket.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Transactions</TableCell>
                    <TableCell className="font-medium">{summary.totalTransactions}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
