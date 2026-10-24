// Crazy 8 Security — eight agents that watch real platform activity.
// Scheduled sweeps gather real signals per agent; OpenAI (via Lovable AI Gateway)
// is only called when a signal is notable, so quiet periods cost nothing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { streamText } from "npm:ai@5";
import { corsFor, resolveCaller, denied, genericError } from "../_shared/edge-guard.ts";
import { createLovableAiGatewayRunIdFetch } from "./run-id.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const WINDOW_MIN = 30;

type Sev = "low" | "medium" | "high" | "critical";
const SEV_RANK: Record<Sev, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const maxSev = (a: Sev, b: Sev): Sev => (SEV_RANK[a] >= SEV_RANK[b] ? a : b);
const asSev = (v: unknown): Sev => (["low", "medium", "high", "critical"].includes(String(v).toLowerCase()) ? String(v).toLowerCase() as Sev : "low");

const AGENTS: Record<string, { name: string; role: string; persona: string }> = {
  crazy_sentinel: { name: "Crazy Sentinel", role: "Anomaly Detection", persona: "You detect anomalies in API traffic: error spikes, latency deviations and unusual call volumes." },
  crazy_oracle: { name: "Crazy Oracle", role: "Predictive Analytics", persona: "You forecast security risk from the trend of recent security events." },
  crazy_hunter: { name: "Crazy Hunter", role: "Threat Hunting", persona: "You hunt for indicators of compromise in security logs and quarantined ingestion payloads." },
  crazy_guardian: { name: "Crazy Guardian", role: "Orchestration & Response", persona: "You triage open security incidents, prioritise them and propose concrete response steps." },
  crazy_gatekeeper: { name: "Crazy Gatekeeper", role: "Identity & Access", persona: "You review privilege grants, API key creation and rejected authentication attempts." },
  crazy_shield: { name: "Crazy Shield", role: "Data Loss Prevention", persona: "You review data egress volume and per-account egress concentration for possible exfiltration." },
  crazy_mirror: { name: "Crazy Mirror", role: "Adversarial AI Defense", persona: "You assess prompt-injection and jailbreak attempts against the platform's AI assistant." },
  crazy_insight: { name: "Crazy Insight", role: "Explainable Security", persona: "You explain serious security events in plain language for non-technical operators." },
};

const log = (phase: string, edge: "START" | "END", extra?: unknown) =>
  console.log(`[Crazy8][${phase}][PHASE_${edge}]`, extra ?? "");
const logErr = (phase: string, err: unknown) =>
  console.error(`[Crazy8][${phase}][ERROR]`, err instanceof Error ? `${err.message}\n${err.stack}` : err);

// ---------------- AI analysis (OpenAI via Lovable AI Gateway) ----------------
interface Analysis { risk_level: Sev; summary: string; findings: string[]; recommended_actions: string[]; confidence: number; }

async function analyze(agent: string, eventType: string, signals: unknown): Promise<Analysis | { ai_unavailable: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { ai_unavailable: "not_configured" };
  const a = AGENTS[agent];
  log(`AI.${agent}`, "START", { eventType });
  try {
    const runId = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: GATEWAY,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runId.fetch,
    });
    const result = streamText({
      model: provider.responses(MODEL),
      system: `You are "${a.name}" (${a.role}) in the IDIA Protocol's Crazy Friend Security system. ${a.persona}
Base every statement only on the signals provided. Never invent events. Respond with a single JSON object and nothing else:
{"risk_level":"low|medium|high|critical","summary":"one sentence","findings":["..."],"recommended_actions":["..."],"confidence":0.0}
Keep findings and actions to at most 4 short items each.`,
      prompt: `Signal type: ${eventType}\nWindow: last ${WINDOW_MIN} minutes\nSignals (json):\n${JSON.stringify(signals).slice(0, 12000)}`,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = await result.text;
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    const out: Analysis = {
      risk_level: asSev(parsed.risk_level),
      summary: String(parsed.summary ?? "").slice(0, 400),
      findings: (Array.isArray(parsed.findings) ? parsed.findings : []).slice(0, 4).map((s: unknown) => String(s).slice(0, 240)),
      recommended_actions: (Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : []).slice(0, 4).map((s: unknown) => String(s).slice(0, 240)),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    };
    log(`AI.${agent}`, "END", { risk: out.risk_level });
    return out;
  } catch (err) {
    logErr(`AI.${agent}`, err);
    const status = (err as { statusCode?: number })?.statusCode;
    return { ai_unavailable: status ? `gateway_${status}` : "analysis_failed" };
  }
}

// ---------------- Event writing ----------------
async function record(db: any, agent: string, eventType: string, severity: Sev, data: Record<string, unknown>) {
  log(`DB.insert.${agent}`, "START", { eventType, severity });
  const { error } = await db.from("security_events").insert({
    agent_name: agent, action_type: eventType, severity, result_data: data, timestamp: new Date().toISOString(),
  });
  if (error) logErr(`DB.insert.${agent}`, error);
  log(`DB.insert.${agent}`, "END");
}

async function finding(db: any, agent: string, eventType: string, floor: Sev, signals: Record<string, unknown>) {
  const ai = await analyze(agent, eventType, signals);
  const severity = "risk_level" in ai ? maxSev(floor, ai.risk_level) : floor;
  await record(db, agent, eventType, severity, { signals, analysis: ai, model: MODEL });
  return severity;
}

// ---------------- Per-agent detectors (real data only) ----------------
const since = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

async function sentinel(db: any) {
  const { data = [] } = await db.from("api_metrics").select("endpoint,status_code,latency_ms").gte("timestamp", since(WINDOW_MIN)).limit(5000);
  const rows = data ?? [];
  const errors = rows.filter((r: any) => r.status_code >= 400);
  const lat = rows.map((r: any) => r.latency_ms ?? 0).sort((a: number, b: number) => a - b);
  const p95 = lat.length ? lat[Math.floor(lat.length * 0.95)] : 0;
  const byEndpoint: Record<string, number> = {};
  errors.forEach((r: any) => { byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] ?? 0) + 1; });
  const signals = { calls: rows.length, errors: errors.length, error_rate: rows.length ? +(errors.length / rows.length).toFixed(3) : 0, p95_latency_ms: p95, errors_by_endpoint: byEndpoint };
  if (errors.length >= 10 && signals.error_rate > 0.2) return finding(db, "crazy_sentinel", "api_error_spike", "medium", signals);
  if (p95 > 5000 && rows.length >= 20) return finding(db, "crazy_sentinel", "latency_anomaly", "low", signals);
  return record(db, "crazy_sentinel", "sweep_clear", "low", { signals });
}

async function gatekeeper(db: any) {
  const [roles, keys, denied] = await Promise.all([
    db.from("user_roles").select("role,created_at").gte("created_at", since(WINDOW_MIN)),
    db.from("api_keys").select("environment,created_at").gte("created_at", since(WINDOW_MIN)),
    db.from("api_metrics").select("endpoint,status_code").in("status_code", [401, 403]).gte("timestamp", since(WINDOW_MIN)).limit(5000),
  ]);
  const signals = {
    privilege_grants: (roles.data ?? []).map((r: any) => r.role),
    api_keys_created: (keys.data ?? []).length,
    rejected_auth_attempts: (denied.data ?? []).length,
  };
  if (signals.privilege_grants.length > 0) return finding(db, "crazy_gatekeeper", "privilege_change", "medium", signals);
  if (signals.rejected_auth_attempts >= 15) return finding(db, "crazy_gatekeeper", "auth_rejection_burst", "medium", signals);
  if (signals.api_keys_created >= 10) return finding(db, "crazy_gatekeeper", "api_key_burst", "low", signals);
  return record(db, "crazy_gatekeeper", "sweep_clear", "low", { signals });
}

async function shield(db: any) {
  const { data } = await db.from("egress_logs").select("user_id,data_points_count,egress_type").gte("created_at", since(WINDOW_MIN)).limit(5000);
  const rows = data ?? [];
  const perAccount: Record<string, number> = {};
  let points = 0;
  rows.forEach((r: any) => { perAccount[r.user_id] = (perAccount[r.user_id] ?? 0) + 1; points += r.data_points_count ?? 0; });
  const top = Math.max(0, ...Object.values(perAccount));
  // Account ids are never sent to the model — only counts.
  const signals = { egress_events: rows.length, data_points: points, distinct_accounts: Object.keys(perAccount).length, max_egress_per_account: top };
  if (top >= 20 || points >= 250_000) return finding(db, "crazy_shield", "egress_surge", "medium", signals);
  return record(db, "crazy_shield", "sweep_clear", "low", { signals });
}

async function hunter(db: any) {
  const [logs, quarantine] = await Promise.all([
    db.from("security_event_logs").select("protocol,event_type,severity").gte("created_at", since(WINDOW_MIN)).limit(2000),
    db.from("vulture_quarantine").select("reason_code").gte("created_at", since(WINDOW_MIN)).limit(2000),
  ]);
  const sevCount: Record<string, number> = {};
  const types: Record<string, number> = {};
  (logs.data ?? []).forEach((r: any) => { sevCount[r.severity] = (sevCount[r.severity] ?? 0) + 1; types[r.event_type] = (types[r.event_type] ?? 0) + 1; });
  const reasons: Record<string, number> = {};
  (quarantine.data ?? []).forEach((r: any) => { reasons[r.reason_code] = (reasons[r.reason_code] ?? 0) + 1; });
  const severe = (sevCount.high ?? 0) + (sevCount.critical ?? 0);
  const quarantined = (quarantine.data ?? []).length;
  const signals = { log_severity: sevCount, log_event_types: types, quarantined_payloads: quarantined, quarantine_reasons: reasons };
  if (severe > 0) return finding(db, "crazy_hunter", "threat_indicators", "high", signals);
  if (quarantined >= 5) return finding(db, "crazy_hunter", "quarantine_surge", "medium", signals);
  return record(db, "crazy_hunter", "sweep_clear", "low", { signals });
}

const INJECTION_PATTERNS: [string, RegExp][] = [
  ["ignore_instructions", /ignore\s+(all\s+|any\s+)?(previous|prior|above)\s+instructions/i],
  ["reveal_system_prompt", /(reveal|show|print|repeat).{0,20}(system|hidden)\s+prompt/i],
  ["role_override", /you\s+are\s+now\s+(a|an|in)\b|developer\s+mode|\bDAN\b/i],
  ["jailbreak", /jailbreak|bypass\s+(your\s+)?(rules|filters|safety)/i],
  ["data_exfil_request", /(dump|export|list)\s+(all\s+)?(users|wallets|private\s+keys|api\s+keys|secrets)/i],
];

async function mirror(db: any) {
  const { data } = await db.from("best_friend_messages").select("content").eq("role", "user").gte("created_at", since(WINDOW_MIN)).limit(2000);
  const rows = data ?? [];
  const hits: Record<string, number> = {};
  rows.forEach((r: any) => INJECTION_PATTERNS.forEach(([name, re]) => { if (re.test(r.content ?? "")) hits[name] = (hits[name] ?? 0) + 1; }));
  // Message text is never forwarded — only pattern counts.
  const total = Object.values(hits).reduce((a, b) => a + b, 0);
  const signals = { messages_scanned: rows.length, pattern_hits: hits };
  if (total > 0) return finding(db, "crazy_mirror", "prompt_injection_attempt", total >= 5 ? "high" : "medium", signals);
  return record(db, "crazy_mirror", "sweep_clear", "low", { signals });
}

async function oracle(db: any) {
  const { data } = await db.from("security_events").select("severity,timestamp").neq("action_type", "sweep_clear").neq("action_type", "maintenance_pulse")
    .gte("timestamp", since(7 * 24 * 60)).limit(5000);
  const days: Record<string, Record<string, number>> = {};
  (data ?? []).forEach((r: any) => { const d = r.timestamp.slice(0, 10); days[d] ??= {}; days[d][r.severity] = (days[d][r.severity] ?? 0) + 1; });
  const sev = (d: Record<string, number> | undefined) => (d?.high ?? 0) + (d?.critical ?? 0);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const signals = { daily_severity_counts: days, serious_today: sev(days[today]), serious_yesterday: sev(days[yesterday]) };
  if (signals.serious_today > 0 && signals.serious_today > signals.serious_yesterday) return finding(db, "crazy_oracle", "threat_forecast", "medium", signals);
  return record(db, "crazy_oracle", "sweep_clear", "low", { signals });
}

async function guardian(db: any) {
  const { data } = await db.from("security_events").select("agent_name,action_type,severity,timestamp").eq("resolved", false)
    .in("severity", ["high", "critical"]).gte("timestamp", since(WINDOW_MIN)).limit(200);
  const open = data ?? [];
  const signals = { new_open_incidents: open.map((r: any) => ({ agent: r.agent_name, type: r.action_type, severity: r.severity })) };
  if (open.length > 0) return finding(db, "crazy_guardian", "incident_triage", open.some((r: any) => r.severity === "critical") ? "critical" : "high", signals);
  return record(db, "crazy_guardian", "sweep_clear", "low", { signals });
}

async function insight(db: any) {
  const { data } = await db.from("security_events").select("agent_name,action_type,severity,result_data").neq("agent_name", "crazy_insight")
    .neq("agent_name", "crazy_guardian").in("severity", ["high", "critical"]).gte("timestamp", since(WINDOW_MIN)).limit(20);
  const rows = data ?? [];
  const signals = { serious_events: rows.map((r: any) => ({ agent: r.agent_name, type: r.action_type, severity: r.severity, summary: r.result_data?.analysis?.summary ?? null, signals: r.result_data?.signals ?? null })) };
  if (rows.length > 0) return finding(db, "crazy_insight", "incident_explained", "medium", signals);
  return record(db, "crazy_insight", "sweep_clear", "low", { signals: { serious_events: 0 } });
}

async function sweep(db: any) {
  const results: Record<string, string> = {};
  // Detectors first, then agents that read the detectors' output.
  for (const [name, fn] of [["crazy_sentinel", sentinel], ["crazy_gatekeeper", gatekeeper], ["crazy_shield", shield], ["crazy_hunter", hunter], ["crazy_mirror", mirror],
    ["crazy_oracle", oracle], ["crazy_guardian", guardian], ["crazy_insight", insight]] as const) {
    log(`SWEEP.${name}`, "START");
    try { await fn(db); results[name] = "ok"; } catch (err) { logErr(`SWEEP.${name}`, err); results[name] = "failed"; }
    log(`SWEEP.${name}`, "END", results[name]);
  }
  return results;
}

// ---------------- HTTP entry ----------------
Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  log("REQUEST", "START");
  const caller = await resolveCaller(req, "Crazy8");
  if (!caller) { log("REQUEST", "END", "rejected"); return denied(req, 403); }

  try {
    log("PARSE", "START");
    const body = await req.json().catch(() => ({}));
    const { agent, action, data } = body ?? {};
    log("PARSE", "END", { agent, action, caller: caller.kind });

    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

    // The legacy once-a-minute pulse carried no data; it is acknowledged and ignored.
    if (action === "maintenance_pulse") { log("REQUEST", "END", "pulse ignored"); return json({ success: true, skipped: "maintenance_pulse_retired" }); }

    if (action === "scheduled_sweep") {
      const results = await sweep(db);
      log("REQUEST", "END", results);
      return json({ success: true, results });
    }

    // Manual analysis by a super admin / security operator with explicit data.
    if (!AGENTS[agent]) return json({ error: "Unknown security agent." }, 400);
    if (typeof action !== "string" || !/^[a-z0-9_]{2,60}$/.test(action)) return json({ error: "Invalid action." }, 400);
    const severity = await finding(db, agent, action, "low", { manual: true, data: data ?? null });
    log("REQUEST", "END", { severity });
    return json({ success: true, agent: AGENTS[agent].name, action, severity });
  } catch (err) {
    logErr("REQUEST", err);
    return genericError(req, 500);
  }
});
