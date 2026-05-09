import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Copy, Lock, Zap, Bot, Terminal } from "lucide-react";
import { toast } from "sonner";

interface Endpoint {
  method: string;
  path: string;
  description: string;
  tier: string;
  latency: string;
  credits: number;
  auth: string;
}

interface MCPTool {
  name: string;
  description: string;
}

interface CodeExamples {
  mcpConfig: string;
  curl: string;
  python: string;
  nodejs: string;
  response: string;
}

interface APIPayload {
  endpoints: Endpoint[];
  mcpTools: MCPTool[];
  codeExamples: CodeExamples;
}

export const APIEndpoints = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [examples, setExamples] = useState<CodeExamples>({
    mcpConfig: "",
    curl: "",
    python: "",
    nodejs: "",
    response: "",
  });

  useEffect(() => {
    const fetchDynamicContent = async () => {
      console.info("[APIEndpoints][fetchDynamicContent] BEGIN: Initiating component mount data fetch sequence.");
      try {
        console.info("[APIEndpoints][fetchDynamicContent] Attempting fetch to internal API route: /api/v1/documentation/endpoints");
        const response = await fetch("/api/v1/documentation/endpoints");
        console.info(`[APIEndpoints][fetchDynamicContent] Network response received. Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          console.error(`[APIEndpoints][fetchDynamicContent] HTTP Error encountered. Code: ${response.status}. Initiating throw.`);
          throw new Error(`HTTP fetch failed with status: ${response.status}`);
        }

        console.info("[APIEndpoints][fetchDynamicContent] Parsing JSON payload from stream.");
        const data: APIPayload = await response.json();
        console.info("[APIEndpoints][fetchDynamicContent] JSON payload successfully parsed. Validating data structures.");

        if (data.endpoints) {
          console.info("[APIEndpoints][fetchDynamicContent] Mapping database endpoints to state.");
          setEndpoints(data.endpoints);
        } else {
          console.warn("[APIEndpoints][fetchDynamicContent] Warning: 'endpoints' array missing from database payload.");
        }

        if (data.mcpTools) {
          console.info("[APIEndpoints][fetchDynamicContent] Mapping MCP tools to state.");
          setMcpTools(data.mcpTools);
        } else {
          console.warn("[APIEndpoints][fetchDynamicContent] Warning: 'mcpTools' array missing from database payload.");
        }

        if (data.codeExamples) {
          console.info("[APIEndpoints][fetchDynamicContent] Mapping code examples to state.");
          setExamples(data.codeExamples);
        } else {
          console.warn("[APIEndpoints][fetchDynamicContent] Warning: 'codeExamples' object missing from database payload.");
        }

        console.info("[APIEndpoints][fetchDynamicContent] State mutation complete. Component ready.");
      } catch (error) {
        console.error("[APIEndpoints][fetchDynamicContent] FATAL EXCEPTION: Caught error during data fetch sequence.", error);
        toast.error("Failed to synchronize live API data from the database.");
      } finally {
        console.info("[APIEndpoints][fetchDynamicContent] END: Data fetch sequence terminated.");
      }
    };

    fetchDynamicContent();
  }, []);

  const copyCode = (code: string, name: string) => {
    console.info(`[APIEndpoints][copyCode] BEGIN: User initiated clipboard write for ${name}`);
    try {
      if (!code) {
        console.warn(`[APIEndpoints][copyCode] Warning: Target payload for ${name} is empty.`);
      }
      navigator.clipboard.writeText(code);
      toast.success(`${name} copied to clipboard`);
      console.info(`[APIEndpoints][copyCode] Successfully wrote ${name} to clipboard.`);
    } catch (error) {
      console.error(`[APIEndpoints][copyCode] FAILED: Exception caught writing ${name} to clipboard.`, error);
      toast.error(`Failed to copy ${name}`);
    } finally {
      console.info(`[APIEndpoints][copyCode] END: Clipboard write sequence terminated.`);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Agentic MCP Access (Model Context Protocol)
          </CardTitle>
          <CardDescription className="text-foreground/80">
            Connect AI assistants directly to the IDIA Data Vault. Tools automatically handle secure protocol wrapping
            and automated compute credit burns for autonomous agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Available MCP Tools
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                {mcpTools.length > 0 ? (
                  mcpTools.map((tool, index) => (
                    <li key={index}>
                      <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">{tool.name}</code> -{" "}
                      {tool.description}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground italic">Syncing real-time MCP tools...</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Claude Desktop Configuration</h4>
              <div className="relative">
                <pre className="bg-background border border-border p-3 rounded-lg overflow-x-auto text-xs text-muted-foreground">
                  <code>{examples.mcpConfig || "Loading configuration..."}</code>
                </pre>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => copyCode(examples.mcpConfig, "MCP Config")}
                  disabled={!examples.mcpConfig}
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
            {endpoints.length > 0 ? (
              endpoints.map((endpoint, index) => (
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
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">Synchronizing endpoint matrix...</p>
            )}
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
                  <code>{examples.curl || "Loading..."}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-2"
                  onClick={() => copyCode(examples.curl, "cURL example")}
                  disabled={!examples.curl}
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="python" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{examples.python || "Loading..."}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-2"
                  onClick={() => copyCode(examples.python, "Python example")}
                  disabled={!examples.python}
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="nodejs" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{examples.nodejs || "Loading..."}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-2"
                  onClick={() => copyCode(examples.nodejs, "Node.js example")}
                  disabled={!examples.nodejs}
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
            <code>{examples.response || "Loading..."}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
