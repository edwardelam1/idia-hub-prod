import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const APIMonitoring = () => {
  // Mock latency data
  const latencyData = [
    { time: "00:00", p50: 35, p95: 78, p99: 145 },
    { time: "04:00", p50: 42, p95: 89, p99: 167 },
    { time: "08:00", p50: 38, p95: 82, p99: 156 },
    { time: "12:00", p50: 47, p95: 98, p99: 178 },
    { time: "16:00", p50: 44, p95: 91, p99: 169 },
    { time: "20:00", p50: 39, p95: 85, p99: 158 },
  ];

  // Mock throughput data
  const throughputData = [
    { time: "00:00", requests: 3400, success: 3387, errors: 13 },
    { time: "04:00", requests: 2800, success: 2789, errors: 11 },
    { time: "08:00", requests: 5600, success: 5581, errors: 19 },
    { time: "12:00", requests: 7200, success: 7178, errors: 22 },
    { time: "16:00", requests: 6800, success: 6779, errors: 21 },
    { time: "20:00", requests: 4500, success: 4486, errors: 14 },
  ];

  // Mock endpoint usage data
  const endpointData = [
    { endpoint: "/v1/features/market-data", calls: 45678, avg_latency: 47 },
    { endpoint: "/v1/features/health-analytics", calls: 28901, avg_latency: 52 },
    { endpoint: "/v1/provenance/{id}", calls: 12345, avg_latency: 89 },
    { endpoint: "/v1/streams/realtime", calls: 8765, avg_latency: 35 },
    { endpoint: "/v1/features/ecp-reports", calls: 5432, avg_latency: 76 },
  ];

  // Mock audit log entries
  const auditLogs = [
    { 
      timestamp: "2025-10-27 15:32:14", 
      endpoint: "/v1/features/market-data",
      method: "GET",
      status: 200,
      latency: 45,
      key: "prod-key-***7v9w",
      ip: "203.0.113.42"
    },
    { 
      timestamp: "2025-10-27 15:32:12", 
      endpoint: "/v1/features/health-analytics",
      method: "GET",
      status: 200,
      latency: 51,
      key: "prod-key-***7v9w",
      ip: "203.0.113.42"
    },
    { 
      timestamp: "2025-10-27 15:32:09", 
      endpoint: "/v1/provenance/0x3a4b",
      method: "GET",
      status: 200,
      latency: 87,
      key: "test-key-***2x4y",
      ip: "198.51.100.18"
    },
    { 
      timestamp: "2025-10-27 15:32:05", 
      endpoint: "/v1/features/market-data",
      method: "GET",
      status: 429,
      latency: 12,
      key: "dev-key-***5d7e",
      ip: "192.0.2.156"
    },
    { 
      timestamp: "2025-10-27 15:32:01", 
      endpoint: "/v1/streams/realtime",
      method: "GET",
      status: 200,
      latency: 34,
      key: "prod-key-***7v9w",
      ip: "203.0.113.42"
    },
  ];

  return (
    <div className="space-y-4">
      {/* Real-time Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-foreground">Operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All systems nominal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests/Min</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2,847</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +12.4% from avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">0.03%</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3" />
              -0.01% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">47ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                SLA: &lt;100ms
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latency Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Distribution (24h)</CardTitle>
          <CardDescription>
            p50, p95, and p99 latency percentiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis className="text-xs" label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} name="p50" />
              <Line type="monotone" dataKey="p95" stroke="#10b981" strokeWidth={2} name="p95" />
              <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} name="p99" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Throughput Chart */}
      <Card>
        <CardHeader>
          <CardTitle>API Throughput (24h)</CardTitle>
          <CardDescription>
            Total requests, successful responses, and errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis className="text-xs" label={{ value: 'Requests', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="success" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Success" />
              <Area type="monotone" dataKey="errors" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Endpoint Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Usage Statistics</CardTitle>
          <CardDescription>
            Most frequently accessed endpoints and average latency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={endpointData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="endpoint" type="category" width={200} className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="calls" fill="hsl(var(--primary))" name="API Calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log (Live)</CardTitle>
          <CardDescription>
            Real-time API access attempts and query content (SEC-S-1.4 TOMS compliance)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
              <div>Timestamp</div>
              <div className="col-span-2">Endpoint</div>
              <div>Method</div>
              <div>Status</div>
              <div>Latency</div>
              <div>API Key</div>
            </div>
            {auditLogs.map((log, index) => (
              <div key={index} className="grid grid-cols-7 gap-2 text-xs py-2 border-b hover:bg-muted/50">
                <div className="text-muted-foreground">{log.timestamp}</div>
                <div className="col-span-2 font-mono text-foreground">{log.endpoint}</div>
                <div>
                  <Badge variant="outline" className="text-xs">
                    {log.method}
                  </Badge>
                </div>
                <div>
                  <Badge 
                    variant="outline" 
                    className={
                      log.status === 200 
                        ? "bg-green-500/10 text-green-500 border-green-500/20 text-xs"
                        : "bg-red-500/10 text-red-500 border-red-500/20 text-xs"
                    }
                  >
                    {log.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground">{log.latency}ms</div>
                <div className="font-mono text-xs text-muted-foreground">{log.key}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
