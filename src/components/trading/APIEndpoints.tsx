import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Copy, Lock, Zap, Bot, Terminal } from "lucide-react";
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
      tier: "Analyst",
      latency: "< 100ms",
      credits: 5,
      auth: "OAuth 2.0 + API Key",
    },
    {
      method: "GET",
      path: "/v1/features/health-analytics",
      description: "Access aggregated health data analytics for predictive modeling",
      tier: "Professional",
      latency: "< 100ms",
      credits: 15,
      auth: "OAuth 2.0 + API Key",
    },
    {
      method: "GET",
      path: "/v1/features/ecp-reports",
      description: "Experiential Conversion Protocol reports with blockchain provenance",
      tier: "Enterprise",
      latency: "< 100ms",
      credits: 50,
      auth: "OAuth 2.0 + API Key",
    },
    {
      method: "POST",
      path: "/v1/queries/custom",
      description: "Execute custom queries with differential privacy protection",
      tier: "Enterprise",
      latency: "< 100ms",
      credits: 50,
      auth: "OAuth 2.0 + API Key",
    },
  ];

  const mcpConfigExample = `{
  "mcpServers": {
    "idia-vault": {
      "command": "npx",
      "args": [
        "-y",
        "@idia/mcp-server",
        "--api-key",
        "YOUR_API_KEY",
        "--environment",
        "production"
      ]
    }
  }
}`;

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

  const responseExample = `{
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
    "tier": "analyst"
  },
  "provenance": {
    "digiramp_anchor_id": "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
    "blockchain": "ethereum",
    "timestamp": "2025-10-27T15:30:45Z",
    "immutable": true
  },
  "headers": {
    "X-IDIA-LIABILITY-TOKEN": "audit_8522e971_e064_4591"
  }
}`;

  return (
    <div className="space-y-4">
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Agentic MCP Access (Model Context Protocol)
          </CardTitle>
          <CardDescription className="text-foreground/80">
            Connect AI assistants directly to the IDIA Data Vault. Tools automatically handle DELT wrapping and Synapse
            credit burns for autonomous agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Available MCP Tools
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>
                  <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">query_market_features</code> - Pull
                  real-time algo trading telemetry
                </li>
                <li>
                  <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">execute_delt_transfer</code> -
                  Autonomous consent artifact generation
                </li>
                <li>
                  <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">verify_digiramp_anchor</code> - Check
                  blockchain provenance
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Claude Desktop Configuration</h4>
              <div className="relative">
                <pre className="bg-background border border-border p-3 rounded-lg overflow-x-auto text-xs text-muted-foreground">
                  <code>{mcpConfigExample}</code>
                </pre>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => copyCode(mcpConfigExample, "MCP Config")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            REST API Consumption Matrix
          </CardTitle>
          <CardDescription>Institutional endpoints with DigiRAMP Anchoring and TLS 1.3+ encryption</CardDescription>
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
                        : endpoint.tier === "Professional"
                          ? "bg-primary/10 text-primary border-primary/20 text-xs"
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs"
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
          <CardTitle>REST Code Examples</CardTitle>
          <CardDescription>Integration examples for popular programming languages</CardDescription>
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
                  <Copy className="h-4 w-4" /> Copy
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
                  <Copy className="h-4 w-4" /> Copy
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
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Institutional Response Format</CardTitle>
          <CardDescription>
            All responses include DigiRAMP Anchoring ID and X-IDIA-LIABILITY-TOKEN for blockchain provenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm text-muted-foreground">
            <code>{responseExample}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
