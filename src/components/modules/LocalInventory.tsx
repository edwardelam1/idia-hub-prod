import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, AlertTriangle, TrendingDown, TrendingUp, Truck, Clock, ShoppingCart } from "lucide-react";

export const LocalInventory = () => {
  // Simulated inventory data for downtown location
  const inventoryItems = [
    {
      id: 1,
      name: "Premium Coffee Beans (Ethiopian)",
      category: "Beverages",
      currentStock: 12,
      parLevel: 50,
      unitCost: 24.99,
      supplier: "Blue Mountain Coffee Co.",
      lastOrdered: "2024-01-18",
      status: "low",
      expirationDate: "2024-03-15"
    },
    {
      id: 2,
      name: "Sandwich Wraps (12-inch)",
      category: "Food Prep",
      currentStock: 3,
      parLevel: 100,
      unitCost: 1.25,
      supplier: "Fresh Foods Supply",
      lastOrdered: "2024-01-15",
      status: "critical",
      expirationDate: "2024-01-25"
    },
    {
      id: 3,
      name: "Organic Milk (Gallon)",
      category: "Dairy",
      currentStock: 8,
      parLevel: 25,
      unitCost: 6.50,
      supplier: "Valley Dairy Farms",
      lastOrdered: "2024-01-19",
      status: "low",
      expirationDate: "2024-01-23"
    },
    {
      id: 4,
      name: "Disposable Cups (16oz)",
      category: "Supplies",
      currentStock: 500,
      parLevel: 200,
      unitCost: 0.12,
      supplier: "EcoServe Packaging",
      lastOrdered: "2024-01-10",
      status: "good",
      expirationDate: null
    },
    {
      id: 5,
      name: "Fresh Lettuce",
      category: "Produce",
      currentStock: 25,
      parLevel: 30,
      unitCost: 2.80,
      supplier: "Garden Fresh Produce",
      lastOrdered: "2024-01-20",
      status: "good",
      expirationDate: "2024-01-22"
    },
    {
      id: 6,
      name: "Sourdough Bread",
      category: "Bakery",
      currentStock: 15,
      parLevel: 40,
      unitCost: 4.50,
      supplier: "Artisan Bakery Co.",
      lastOrdered: "2024-01-19",
      status: "low",
      expirationDate: "2024-01-23"
    }
  ];

  const pendingOrders = [
    {
      id: "PO-2024-0001",
      supplier: "Blue Mountain Coffee Co.",
      items: "Premium Coffee Beans x50",
      orderDate: "2024-01-20",
      expectedDelivery: "2024-01-22",
      total: 1249.50,
      status: "confirmed"
    },
    {
      id: "PO-2024-0002",
      supplier: "Fresh Foods Supply",
      items: "Sandwich Wraps x200",
      orderDate: "2024-01-20",
      expectedDelivery: "2024-01-21",
      total: 250.00,
      status: "shipped"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "destructive";
      case "low": return "secondary";
      case "good": return "default";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critical": return <AlertTriangle className="w-4 h-4" />;
      case "low": return <TrendingDown className="w-4 h-4" />;
      case "good": return <TrendingUp className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">Across 6 categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">6</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Expected this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$8,420</div>
            <p className="text-xs text-muted-foreground">-5.2% vs last month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Stock</TabsTrigger>
          <TabsTrigger value="orders">Pending Orders</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Inventory</CardTitle>
              <CardDescription>Real-time stock levels for Downtown Location</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Par Level</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{item.parLevel}</TableCell>
                      <TableCell>${item.unitCost}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(item.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(item.status)}
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.expirationDate ? (
                          <span className={item.expirationDate < "2024-01-25" ? "text-warning" : ""}>
                            {new Date(item.expirationDate).toLocaleDateString()}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
              <CardDescription>Track incoming inventory shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.supplier}</TableCell>
                      <TableCell>{order.items}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(order.expectedDelivery).toLocaleDateString()}</TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === "shipped" ? "default" : "secondary"}>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Button>
                  <Truck className="w-4 h-4 mr-2" />
                  Create New Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Critical Stock Alerts</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-destructive">Sandwich Wraps (12-inch)</p>
                      <p className="text-sm text-muted-foreground">Only 3 units remaining - Below critical threshold</p>
                    </div>
                    <Button size="sm" variant="outline">Order Now</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-warning">Low Stock Warnings</CardTitle>
                <CardDescription>Items approaching reorder point</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-warning">Premium Coffee Beans</p>
                      <p className="text-sm text-muted-foreground">12 units remaining - Below par level of 50</p>
                    </div>
                    <Button size="sm" variant="outline">Add to Order</Button>
                  </div>
                </div>
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-warning">Organic Milk</p>
                      <p className="text-sm text-muted-foreground">8 units remaining - Expires in 2 days</p>
                    </div>
                    <Button size="sm" variant="outline">Add to Order</Button>
                  </div>
                </div>
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-warning">Sourdough Bread</p>
                      <p className="text-sm text-muted-foreground">15 units remaining - Below par level of 40</p>
                    </div>
                    <Button size="sm" variant="outline">Add to Order</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-warning">
                  <Clock className="w-5 h-5 mr-2" />
                  Expiration Alerts
                </CardTitle>
                <CardDescription>Items expiring soon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-warning">Fresh Lettuce</p>
                      <p className="text-sm text-muted-foreground">Expires tomorrow (Jan 22) - 25 units</p>
                    </div>
                    <Button size="sm" variant="outline">Mark for Sale</Button>
                  </div>
                </div>
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-warning">Organic Milk</p>
                      <p className="text-sm text-muted-foreground">Expires Jan 23 - 8 gallons</p>
                    </div>
                    <Button size="sm" variant="outline">Create Promotion</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};