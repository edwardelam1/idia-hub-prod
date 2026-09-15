"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Copy, Lock, Zap, Bot, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { fetchApi } from "@/lib/api";
import { authorizeRelayerViaLife } from "@/lib/relayer-authorization";
import { supabase } from "@/integrations/supabase/client";

// --- Type Definitions ---
type Tier = "Analyst" | "Professional" | "Enterprise";
interface Endpoint {
  method: string;
  path: string;
  description: string;
  tier: Tier;
  latency: string;
  credits: number;
  auth: string;
}

const TIER_MATRIX: Record<Tier, number> = { Analyst: 1, Professional: 2, Enterprise: 3 };

const normalizeTier = (raw: string | undefined | null): Tier | null => {
  console.info(`[APIEndpoints][normalizeTier] BEGIN raw=${raw ?? "null"}`);
  try {
    const v = (raw ?? "").toLowerCase();
    if (v === "enterprise") return "Enterprise";
    if (v === "professional" || v === "prof") return "Professional";
    if (v === "analyst") return "Analyst";
    console.warn(`[APIEndpoints][normalizeTier] WARN unrecognized tier=${v}`);
    return null;
  } finally {
    console.info(`[APIEndpoints][normalizeTier] END`);
  }
};

export const APIEndpoints = () => {
  // --- Live context (real auth + credits, no mocks) ---
  const { user, subscriptionTier } = useAuth();
  const { balanceData, refreshBalance } = useSynapseCredits();

  const currentTier: Tier | null = normalizeTier(subscriptionTier as unknown as string);
  const credits = Number(balanceData?.available_credits ?? 0);

  const [baseUrl, setBaseUrl] = useState<string>("https://api.idiahub.com");

  const [endpoints, setEndpoints] = useState<Endpoint[]>([
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
  ]);

  const [mcpConfigExample, setMcpConfigExample] = useState<string>(`{
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
}`);

  const [curlExample, setCurlExample] = useState<string>(`curl -X GET "https://api.idiahub.com/v1/features/market-data" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`);

  const [pythonExample, setPythonExample] = useState<string>(`import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(
    "https://api.idiahub.com/v1/features/market-data",
    headers=headers
)

data = response.json()
print(data)`);

  const [nodejsExample, setNodejsExample] = useState<string>(`const axios = require('axios');

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
  });`);

  const [responseExample, setResponseExample] = useState<string>(
    `// Awaiting live execution...
// Click an endpoint path below to execute a live request and generate a dynamic institutional payload.`,
  );

  // --- Granular hydration: rebuild copy-paste examples against current origin ---
  useEffect(() => {
    console.info("[APIEndpoints][Hydrate] BEGIN: dynamic origin + example template hydration");
    try {
      console.info("[APIEndpoints][Hydrate][resolve_origin] BEGIN");
      if (typeof window === "undefined") {
        console.warn("[APIEndpoints][Hydrate][resolve_origin] WARN no window object — SSR path");
        return;
      }
      const origin = window.location.origin;
      console.info(`[APIEndpoints][Hydrate][resolve_origin] EXEC origin=${origin}`);
      setBaseUrl(origin);
      console.info("[APIEndpoints][Hydrate][resolve_origin] END");

      console.info("[APIEndpoints][Hydrate][template_examples] BEGIN");
      setCurlExample(
        `curl -X GET "${origin}/v1/features/market-data" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
      );
      setPythonExample(
        `import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(
    "${origin}/v1/features/market-data",
    headers=headers
)

data = response.json()
print(data)`,
      );
      setNodejsExample(
        `const axios = require('axios');

const config = {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
};

axios.get('${origin}/v1/features/market-data', config)
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });`,
      );
      console.info("[APIEndpoints][Hydrate][template_examples] END");
    } catch (error) {
      console.error("[APIEndpoints][Hydrate] CATCH: hydration failed", error);
    } finally {
      console.info("[APIEndpoints][Hydrate] END");
    }
  }, []);

  // --- Live execution against synapse-controller (server-authoritative credit burn) ---
  const executeLiveCall = async (endpoint: Endpoint) => {
    console.info(`[APIEndpoints][executeLiveCall] BEGIN method=${endpoint.method} path=${endpoint.path}`);
    const startTime = performance.now();
    try {
      console.info("[APIEndpoints][executeLiveCall][preflight_identity] BEGIN");
      const u = user as any;
      const userId = u?.user_id ?? u?.id;
      const isCsuite =
        typeof u?.role === "string" && /csuite|c-suite|god|super[-_]?admin/i.test(u.role);
      if (!userId) {
        console.error("[APIEndpoints][executeLiveCall][preflight_identity] FATAL: no authenticated user_id");
        toast.error("Sign in required to execute live calls");
        return;
      }
      console.info(
        `[APIEndpoints][executeLiveCall][preflight_identity] EXEC user_id=${userId} role=${u?.role} csuite=${isCsuite}`,
      );
      console.info("[APIEndpoints][executeLiveCall][preflight_identity] END");

      console.info("[APIEndpoints][executeLiveCall][preflight_credits] BEGIN");
      console.info(
        `[APIEndpoints][executeLiveCall][preflight_credits] EXEC required=${endpoint.credits} available=${credits} csuite_bypass=${isCsuite}`,
      );
      if (!isCsuite && credits < endpoint.credits) {
        console.error("[APIEndpoints][executeLiveCall][preflight_credits] HALT: insufficient credits");
        toast.error(`Insufficient credits — ${endpoint.credits} CR required, ${credits} available`);
        return;
      }
      console.info("[APIEndpoints][executeLiveCall][preflight_credits] END");

      console.info("[APIEndpoints][executeLiveCall][preflight_tier] BEGIN");
      if (!isCsuite && (!currentTier || TIER_MATRIX[endpoint.tier] > TIER_MATRIX[currentTier])) {
        console.error(
          `[APIEndpoints][executeLiveCall][preflight_tier] HALT tier=${currentTier} required=${endpoint.tier}`,
        );
        toast.error(`${endpoint.tier} tier required for this endpoint`);
        return;
      }
      console.info(`[APIEndpoints][executeLiveCall][preflight_tier] END csuite_bypass=${isCsuite}`);

      console.info("[APIEndpoints][executeLiveCall][invoke_controller] BEGIN");
      const referenceId = `apiep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      // Resolve buyer wallet (USDC source) from profile.
      console.info("[APIEndpoints][executeLiveCall][resolve_wallet] BEGIN");
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", userId)
        .maybeSingle();
      const buyerWallet: string | undefined = profile?.wallet_address ?? undefined;
      const useOnChain = !!buyerWallet && buyerWallet.startsWith("0x");
      console.info(
        `[APIEndpoints][executeLiveCall][resolve_wallet] EXEC wallet=${buyerWallet ?? "<none>"} useOnChain=${useOnChain}`,
      );
      console.info("[APIEndpoints][executeLiveCall][resolve_wallet] END");

      // Resolve real ACA records — controller rejects synthetic ids.
      console.info("[APIEndpoints][executeLiveCall][resolve_aca] BEGIN");
      const { data: acaRows, error: acaErr } = await supabase
        .from("user_aca_records")
        .select("id")
        .eq("platform_guid", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (acaErr || !acaRows || acaRows.length === 0) {
        console.error(
          `[APIEndpoints][executeLiveCall][resolve_aca] HALT no ACA records (err=${acaErr?.message ?? "none"})`,
        );
        toast.error("No auditable lineage on file — generate data before probing endpoints.");
        return;
      }
      const acaIds = acaRows.map((r) => r.id);
      console.info(`[APIEndpoints][executeLiveCall][resolve_aca] END count=${acaIds.length}`);

      const payload: Record<string, unknown> = {
        user_id: userId,
        client_id: referenceId,
        aca_record_ids: acaIds,
        intent_type: `API_DOC_PROBE:${endpoint.method}:${endpoint.path}`,
        query_complexity: 1.0,
        country_of_origin: "US",
        routing: useOnChain ? "on-chain" : "fiat",
        ...(useOnChain ? { buyer_wallet: buyerWallet } : {}),
      };
      console.info(`[APIEndpoints][executeLiveCall][invoke_controller] EXEC payload=${JSON.stringify(payload)}`);

      let result = await fetchApi<{
        success?: boolean;
        liability_token_hash?: string;
        financials?: Record<string, unknown>;
        audit?: Record<string, unknown>;
        error?: string;
        details?: { code?: string; spender?: string; required?: string };
        spender?: string;
      }>("/api/v1/synapse/controller", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // ====================================================================
      // APPROVAL_REQUIRED handling: prompt buyer wallet to approve relayer,
      // then retry the call once.
      // ====================================================================
      if (result?.error === "APPROVAL_REQUIRED" && useOnChain && buyerWallet) {
        console.warn("[APIEndpoints][executeLiveCall][approval_flow] BEGIN — prompting wallet approval");
        toast.message("One-time authorization required — approve in the IDIA Life app.");
        const approval = await authorizeRelayerViaLife({ owner: buyerWallet });
        if (approval.ok !== true) {
          const reason = approval.reason ?? "unknown";
          console.error(
            `[APIEndpoints][executeLiveCall][approval_flow] HALT reason=${reason}`,
          );
          toast.error(reason);
          return;
        }
        console.info(
          `[APIEndpoints][executeLiveCall][approval_flow] END alreadyAuthorized=${approval.alreadyAuthorized} — retrying charge`,
        );
        toast.success("Approval confirmed. Retrying charge…");
        result = await fetchApi("/api/v1/synapse/controller", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (result?.error) {
        throw new Error(result.error);
      }
      console.info("[APIEndpoints][executeLiveCall][invoke_controller] END");

      console.info("[APIEndpoints][executeLiveCall][measure_latency] BEGIN");
      const actualLatency = Math.round(performance.now() - startTime);
      console.info(`[APIEndpoints][executeLiveCall][measure_latency] EXEC latency_ms=${actualLatency}`);
      console.info("[APIEndpoints][executeLiveCall][measure_latency] END");

      console.info("[APIEndpoints][executeLiveCall][update_endpoint_state] BEGIN");
      setEndpoints((prev) =>
        prev.map((ep) => (ep.path === endpoint.path ? { ...ep, latency: `${actualLatency}ms` } : ep)),
      );
      console.info("[APIEndpoints][executeLiveCall][update_endpoint_state] END");

      console.info("[APIEndpoints][executeLiveCall][build_payload] BEGIN");
      const institutional = {
        status: result?.success ? 200 : 400,
        url: `${baseUrl}${endpoint.path}`,
        latency_ms: actualLatency,
        credits_consumed: endpoint.credits,
        data: result?.audit ?? {},
        financials: result?.financials ?? {},
        provenance: {
          digiramp_anchor_id: result?.liability_token_hash
            ? `0x${result.liability_token_hash}`
            : "anchor_pending",
          blockchain: "ethereum",
          timestamp: new Date().toISOString(),
          immutable: true,
        },
        headers: {
          "X-IDIA-LIABILITY-TOKEN": result?.liability_token_hash ?? "pending",
        },
      };
      setResponseExample(JSON.stringify(institutional, null, 2));
      console.info("[APIEndpoints][executeLiveCall][build_payload] END");

      console.info("[APIEndpoints][executeLiveCall][refresh_balance] BEGIN");
      await refreshBalance();
      console.info("[APIEndpoints][executeLiveCall][refresh_balance] END");

      toast.success(`Endpoint executed (${actualLatency}ms · ${endpoint.credits} CR)`);
    } catch (error: any) {
      const actualLatency = Math.round(performance.now() - startTime);
      console.error(
        `[APIEndpoints][executeLiveCall] CATCH: execution failed at ${actualLatency}ms — ${error?.message ?? error}`,
        error,
      );
      setResponseExample(
        JSON.stringify(
          {
            error: "Execution Failed",
            message: error instanceof Error ? error.message : "Unknown network error",
            target: `${baseUrl}${endpoint.path}`,
            latency_ms: actualLatency,
          },
          null,
          2,
        ),
      );
      toast.error(`Execution failed for ${endpoint.path}`);
    } finally {
      console.info(`[APIEndpoints][executeLiveCall] END path=${endpoint.path}`);
    }
  };

  const copyCode = (code: string, name: string) => {
    console.log(`[APIEndpoints][copyCode] BEGIN: User initiated clipboard write for ${name}.`);
    try {
      navigator.clipboard.writeText(code);
      toast.success(`${name} copied to clipboard`);
      console.log(`[APIEndpoints][copyCode] Success: ${name} copied to clipboard.`);
    } catch (error) {
      console.error(`[APIEndpoints][copyCode] ERROR: Failed to write ${name} to clipboard.`, error);
      toast.error(`Failed to copy ${name}`);
    } finally {
      console.log(`[APIEndpoints][copyCode] END: Clipboard operation completed.`);
    }
  };

  const _u = user as any;
  const _isCsuite =
    typeof _u?.role === "string" && /csuite|c-suite|god|super[-_]?admin/i.test(_u.role);
  const visibleEndpoints = _isCsuite
    ? endpoints
    : currentTier
      ? endpoints.filter((ep) => TIER_MATRIX[ep.tier] <= TIER_MATRIX[currentTier])
      : [];

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Live Context:</span>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          Tier: {currentTier ?? "Unverified"}
        </Badge>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          {credits.toLocaleString(undefined, { maximumFractionDigits: 2 })} CR
        </Badge>
      </div>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Agentic MCP Access (Model Context Protocol)
          </CardTitle>
          <CardDescription className="text-foreground/80">
            Connect AI assistants directly to the IDIA Data Vault. Tools automatically handle secure wrapping and
            automated credit burns for autonomous agents.
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
                  <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">execute_secure_transfer</code> -
                  Autonomous consent artifact generation
                </li>
                <li>
                  <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">verify_digiramp_anchor</code> - Check
                  blockchain provenance
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Desktop Configuration</h4>
              <div className="relative">
                <pre className="bg-background border border-border p-3 rounded-lg overflow-x-auto max-w-full text-[11px] sm:text-xs text-muted-foreground">
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
          <CardDescription>
            Institutional endpoints with DigiRAMP Anchoring and TLS 1.3+ encryption. Click a path to execute a live
            audited call.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visibleEndpoints.length === 0 && (
              <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                No endpoints available at your current tier. Upgrade to Analyst, Professional, or Enterprise to unlock
                live API access.
              </div>
            )}
            {visibleEndpoints.map((endpoint, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
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
                      <button
                        type="button"
                        onClick={() => executeLiveCall(endpoint)}
                        className="text-left text-xs sm:text-sm font-mono text-foreground hover:text-primary underline-offset-4 hover:underline transition-colors break-all"
                      >
                        {endpoint.path}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">{endpoint.description}</p>
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
            <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto max-w-full text-[11px] sm:text-sm">
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
                <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto max-w-full text-[11px] sm:text-sm">
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
                <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto max-w-full text-[11px] sm:text-sm">
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
          <CardTitle>Institutional Response Format (Live Telemetry)</CardTitle>
          <CardDescription>
            All responses include DigiRAMP Anchoring ID and X-IDIA-LIABILITY-TOKEN for blockchain provenance. Updates
            dynamically after each live endpoint execution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto max-w-full text-[11px] sm:text-sm text-muted-foreground">
            <code>{responseExample}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
