
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, Download, DollarSign, TrendingUp, AlertTriangle, Calendar, FileText } from 'lucide-react';
import { useBillingData } from '@/hooks/useBillingData';

const BillingCredits = () => {
  const { 
    currentUsage, 
    billingHistory, 
    subscriptionPlan, 
    paymentMethods, 
    invoices,
    usageBreakdown,
    downloadInvoice,
    updatePaymentMethod
  } = useBillingData();

  const usagePercentage = (currentUsage.used / currentUsage.limit) * 100;
  const remainingCredits = currentUsage.limit - currentUsage.used;
  const projectedUsage = currentUsage.used * (30 / new Date().getDate());

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Credits</h1>
          <p className="text-muted-foreground">Manage your subscription, credits, and billing</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={remainingCredits > 1000 ? "default" : "destructive"}>
            {remainingCredits.toLocaleString()} Credits Remaining
          </Badge>
          <Button>
            <CreditCard className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </div>

      {/* Credit Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUsage.used.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              of {currentUsage.limit.toLocaleString()} credits
            </div>
            <Progress value={usagePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${subscriptionPlan.cost}</div>
            <div className="text-sm text-muted-foreground">{subscriptionPlan.name} Plan</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Projected Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectedUsage.toLocaleString()}</div>
            <div className={`text-sm flex items-center ${
              projectedUsage > currentUsage.limit ? 'text-red-600' : 'text-green-600'
            }`}>
              {projectedUsage > currentUsage.limit ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Over limit
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Within limit
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <div className="text-sm text-muted-foreground">days remaining</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Usage Breakdown</CardTitle>
            <CardDescription>Current month usage by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usageBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usageBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Trend</CardTitle>
            <CardDescription>Credit consumption over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billingHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#8884d8" />
                  <Bar dataKey="limit" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>Download and view your billing history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">Invoice #{invoice.number}</div>
                        <div className="text-sm text-muted-foreground">
                          {invoice.date} • {invoice.period}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">${invoice.amount}</div>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Manage your subscription plan and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <div className="font-medium text-lg">{subscriptionPlan.name} Plan</div>
                  <div className="text-muted-foreground">{subscriptionPlan.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${subscriptionPlan.cost}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Features Included:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {subscriptionPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-600 mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Usage Limits:</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Credits: {subscriptionPlan.limits.credits.toLocaleString()}/month</div>
                    <div>API Calls: {subscriptionPlan.limits.apiCalls.toLocaleString()}/month</div>
                    <div>Data Export: {subscriptionPlan.limits.dataExport}GB/month</div>
                    <div>Team Members: {subscriptionPlan.limits.teamMembers}</div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button>Upgrade Plan</Button>
                <Button variant="outline">View All Plans</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods and billing preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map(method => (
                  <div key={method.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">
                          •••• •••• •••• {method.last4}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {method.brand} • Expires {method.expiry}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {method.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add New Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingCredits;
