import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Copy, Lock, Zap } from "lucide-react";
import { toast } from "sonner";

export const APIEndpoints = () => {
  const copyCode = (code: string, name: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${name} copied to clipboard`);
  };

  const endpoints = [
    {
      method: "GET",
      path: "/v1/features/market-data",
      description: "Retrieve real-time market feature feeds for algorithmic trading",
      tier: "Professional",
      latency: "< 100ms",
      credits: 5,
      auth: "OAuth 2.0 + API Key"
    },
    {
      method: "GET",
      path: "/v1/features/health-analytics",
      description: "Access aggregated health data analytics for predictive modeling",
      tier: "Professional",
      latency: "< 100ms",
      credits: 8,
      auth: "OAuth 2.0 + API Key"
    },
    {
      method: "GET",
      path: "/v1/features/ecp-reports",
      description: "Experiential Conversion Protocol reports with blockchain provenance",
      tier: "Enterprise",
      latency: "< 100ms",
      credits: 12,
      auth: "OAuth 2.0 + API Key"
    },
    {
      method: "POST",
      path: "/v1/queries/custom",
      description: "Execute custom queries with differential privacy protection",
      tier: "Enterprise",
      latency: "< 200ms",
      credits: 15,
      auth: "OAuth 2.0 + API Key"
    },
    {
      method: "GET",
      path: "/v1/provenance/{data_id}",
      description: "Retrieve DigiRAMP blockchain anchoring ID for data provenance",
      tier: "Professional",
      latency: "< 150ms",
      credits: 3,
      auth: "OAuth 2.0 + API Key"
    },
    {
      method: "GET",
      path: "/v1/streams/realtime",
      description: "WebSocket connection for real-time data streaming (Kafka/Kinesis)",
      tier: "Enterprise",
      latency: "< 50ms",
      credits: 20,
      auth: "OAuth 2.0 + API Key"
    }
  ];

  const curlExample = `curl -X GET "https://api.idiahub.com/v1/features/market-data" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;

  const pythonExample = `import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(
    "https://api.idiahub.com/v1/features/market-data",
    headers=headers
)

data = response.json()
print(data)`;

  const nodejsExample = `const axios = require('axios');

const config = {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
};

axios.get('https://api.idiahub.com/v1/features/market-data', config)
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            API Endpoints Documentation
          </CardTitle>
          <CardDescription>
            Production endpoints with OAuth 2.0 authentication and TLS 1.3+ encryption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline"
                        className={
                          endpoint.method === "GET" 
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                        }
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    {endpoint.auth}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {endpoint.latency} latency
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {endpoint.credits} credits/call
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={
                      endpoint.tier === "Enterprise"
                        ? "bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs"
                        : "bg-primary/10 text-primary border-primary/20 text-xs"
                    }
                  >
                    {endpoint.tier} Tier
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>
            Integration examples for popular programming languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{curlExample}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-2"
                  onClick={() => copyCode(curlExample, "cURL example")}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="python" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{pythonExample}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-2"
                  onClick={() => copyCode(pythonExample, "Python example")}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="nodejs" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{nodejsExample}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-2"
                  onClick={() => copyCode(nodejsExample, "Node.js example")}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Format</CardTitle>
          <CardDescription>All responses include DigiRAMP Anchoring ID for blockchain provenance</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`{
  "data": {
    "feature_id": "market-data-2025-10-27",
    "timestamp": "2025-10-27T15:30:45Z",
    "features": {
      "payment_velocity": 0.847,
      "transaction_volume": 125000,
      "market_sentiment": "bullish"
    }
  },
  "metadata": {
    "latency_ms": 47,
    "credits_consumed": 5,
    "tier": "professional"
  },
  "provenance": {
    "digiramp_anchor_id": "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
    "blockchain": "ethereum",
    "timestamp": "2025-10-27T15:30:45Z",
    "immutable": true
  }
}`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
