// Crazy 8 Security — eight agents, each enforcing exactly one official role.
// Scheduled sweeps gather real signals per agent; OpenAI (via Lovable AI Gateway)
// is only called when a signal is notable, so quiet periods cost nothing.
// Role map (enforced, see AGENTS.md): Sentinel=anomaly detection, Oracle=predictive threat
// modeling, Hunter=active threat hunting, Guardian=zero-trust access control,
// Gatekeeper=ingress/egress sanitization, Shield=data loss prevention,
// Mirror=adversarial red-teaming (real probes), Insight=forensic auditability.
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

type Kind = "detector" | "forecast" | "redteam" | "record";
const AGENTS: Record<string, { name: string; role: string; kind: Kind; persona: string }> = {
  crazy_sentinel: { name: "Sentinel", role: "Anomaly Detection", kind: "detector", persona: "You monitor API traffic velocity, failure rates and latency to spot abnormal usage or behavioral deviations." },
  crazy_oracle: { name: "Oracle", role: "Predictive Threat Modeling", kind: "forecast", persona: "You analyze the historical trend of alerts by agent and type to forecast emerging attack vectors and structural risks before they execute." },
  crazy_hunter: { name: "Hunter", role: "Active Threat Hunting", kind: "detector", persona: "You hunt through security logs, the credit ledger and settlement records for dormant threats, abuse patterns or unauthorized internal probing." },
  crazy_guardian: { name: "Guardian", role: "Zero-Trust Access Control", kind: "detector", persona: "You enforce least privilege: you review new admin/security role grants, API key creation and refused or permission-denied calls." },
  crazy_gatekeeper: { name: "Gatekeeper", role: "Ingress & Egress Sanitization", kind: "detector", persona: "You inspect incoming AI-assistant messages for prompt injection and outgoing data exports for unsanctioned exposure." },
  crazy_shield: { name: "Shield", role: "Data Loss Prevention", kind: "detector", persona: "You watch the quarantine airlock for unverified or legacy data and per-account export concentration that could mean exfiltration." },
  crazy_mirror: { name: "Mirror", role: "Adversarial Red-Teaming", kind: "redteam", persona: "You ran real attack probes against the live protocol. Explain which defenses failed, the impact, and how to close each gap." },
  crazy_insight: { name: "Insight", role: "Forensic Auditability", kind: "record", persona: "You write immutable, dated, plain-English incident records for enterprise CISO review." },
};

const SHAPES: Record<Kind, string> = {
  detector: `{"headline":"what happened, under 70 chars, no agent name","risk_level":"low|medium|high|critical","summary":"one sentence describing what was observed","findings":["evidence"],"recommended_actions":["step"],"confidence":0.0}`,
  forecast: `{"headline":"the trend, under 70 chars","risk_level":"low|medium|high|critical","summary":"one sentence on the trend","trend":"which area is rising and by how much","outlook":"what to expect in the next 24 hours","recommended_actions":["step"],"confidence":0.0}`,
  redteam: `{"headline":"which defense failed, under 70 chars","risk_level":"low|medium|high|critical","summary":"one sentence","findings":["each failed probe and its impact"],"recommended_actions":["how to close each gap"],"confidence":0.0}`,
  record: `{"headline":"Incident record: <the incident>, under 70 chars","risk_level":"low|medium|high|critical","summary":"one sentence","what_happened":"plain English","why_it_matters":"plain English","what_was_done":"what the agents detected/recorded so far; do not claim actions not in the signals","recommended_actions":["step"],"confidence":0.0}`,
};

const log = (phase: string, edge: "START" | "END", extra?: unknown) =>
  console.log(`[Crazy8][${phase}][PHASE_${edge}]`, extra ?? "");
const logErr = (phase: string, err: unknown) =>
  console.error(`[Crazy8][${phase}][ERROR]`, err instanceof Error ? `${err.message}\n${err.stack}` : err);

// ---------------- AI analysis (OpenAI via Lovable AI Gateway) ----------------
const str = (v: unknown, n = 400) => String(v ?? "").slice(0, n);
const list = (v: unknown) => (Array.isArray(v) ? v : []).slice(0, 4).map((s: unknown) => str(s, 240));

async function analyze(agent: string, eventType: string, signals: unknown): Promise<Record<string, unknown>> {
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
      system: `You are "${a.name}" (${a.role}) in the IDIA Protocol's Crazy 8 security swarm. ${a.persona}
Stay strictly within your role; do not restate other agents' jobs. Write for a non-technical operator.
Base every statement only on the signals provided. Never invent events. Respond with a single JSON object and nothing else, in this shape:
${SHAPES[a.kind]}
Keep lists to at most 4 short items.`,
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
    const p = match ? JSON.parse(match[0]) : {};
    const out: Record<string, unknown> = {
      kind: a.kind,
      headline: str(p.headline, 90),
      risk_level: asSev(p.risk_level),
      summary: str(p.summary),
      findings: list(p.findings),
      recommended_actions: list(p.recommended_actions),
      confidence: Math.max(0, Math.min(1, Number(p.confidence) || 0)),
    };
    if (a.kind === "forecast") { out.trend = str(p.trend); out.outlook = str(p.outlook); }
    if (a.kind === "record") { out.what_happened = str(p.what_happened, 600); out.why_it_matters = str(p.why_it_matters, 600); out.what_was_done = str(p.what_was_done, 600); }
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

async function finding(db: any, agent: string, eventType: string, floor: Sev, signals: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const ai = await analyze(agent, eventType, signals);
  const severity = "risk_level" in ai ? maxSev(floor, ai.risk_level as Sev) : floor;
  await record(db, agent, eventType, severity, { signals, analysis: ai, model: MODEL, ...extra });
  return severity;
}

// ---------------- Per-agent detectors (real data only) ----------------
const since = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

async function sentinel(db: any) {
  const { data } = await db.from("api_metrics").select("endpoint,status_code,latency_ms").gte("timestamp", since(WINDOW_MIN)).limit(5000);
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

async function guardian(db: any) {
  const [roles, keys, rejected] = await Promise.all([
    db.from("user_roles").select("role,created_at").gte("created_at", since(WINDOW_MIN)),
    db.from("api_keys").select("environment,created_at").gte("created_at", since(WINDOW_MIN)),
    db.from("api_metrics").select("endpoint,status_code").in("status_code", [401, 403]).gte("timestamp", since(WINDOW_MIN)).limit(5000),
  ]);
  const signals = {
    privilege_grants: (roles.data ?? []).map((r: any) => r.role),
    api_keys_created: (keys.data ?? []).length,
    rejected_auth_attempts: (rejected.data ?? []).length,
  };
  if (signals.privilege_grants.length > 0) return finding(db, "crazy_guardian", "admin_role_granted", "medium", signals);
  if (signals.rejected_auth_attempts >= 15) return finding(db, "crazy_guardian", "auth_rejection_burst", "medium", signals);
  if (signals.api_keys_created >= 10) return finding(db, "crazy_guardian", "api_key_burst", "low", signals);
  return record(db, "crazy_guardian", "sweep_clear", "low", { signals });
}

const INJECTION_PATTERNS: [string, RegExp][] = [
  ["ignore_instructions", /ignore\s+(all\s+|any\s+)?(previous|prior|above)\s+instructions/i],
  ["reveal_system_prompt", /(reveal|show|print|repeat).{0,20}(system|hidden)\s+prompt/i],
  ["role_override", /you\s+are\s+now\s+(a|an|in)\b|developer\s+mode|\bDAN\b/i],
  ["jailbreak", /jailbreak|bypass\s+(your\s+)?(rules|filters|safety)/i],
  ["data_exfil_request", /(dump|export|list)\s+(all\s+)?(users|wallets|private\s+keys|api\s+keys|secrets)/i],
];

async function gatekeeper(db: any) {
  const [msgs, egress] = await Promise.all([
    db.from("best_friend_messages").select("content").eq("role", "user").gte("created_at", since(WINDOW_MIN)).limit(2000),
    db.from("egress_logs").select("egress_type").gte("created_at", since(WINDOW_MIN)).limit(5000),
  ]);
  const rows = msgs.data ?? [];
  const hits: Record<string, number> = {};
  rows.forEach((r: any) => INJECTION_PATTERNS.forEach(([name, re]) => { if (re.test(r.content ?? "")) hits[name] = (hits[name] ?? 0) + 1; }));
  const egressTypes: Record<string, number> = {};
  (egress.data ?? []).forEach((r: any) => { const k = r.egress_type ?? "unlabeled"; egressTypes[k] = (egressTypes[k] ?? 0) + 1; });
  // Message text is never forwarded — only pattern counts.
  const total = Object.values(hits).reduce((a, b) => a + b, 0);
  const signals = { messages_scanned: rows.length, pattern_hits: hits, egress_events: (egress.data ?? []).length, egress_by_type: egressTypes, unlabeled_egress: egressTypes.unlabeled ?? 0 };
  if (total > 0) return finding(db, "crazy_gatekeeper", "prompt_injection_attempt", total >= 5 ? "high" : "medium", signals);
  if (signals.unlabeled_egress > 0) return finding(db, "crazy_gatekeeper", "unlabeled_egress", "medium", signals);
  return record(db, "crazy_gatekeeper", "sweep_clear", "low", { signals });
}

async function shield(db: any) {
  const [egress, quarantine] = await Promise.all([
    db.from("egress_logs").select("user_id,data_points_count").gte("created_at", since(WINDOW_MIN)).limit(5000),
    db.from("vulture_quarantine").select("reason_code").gte("created_at", since(WINDOW_MIN)).limit(2000),
  ]);
  const perAccount: Record<string, number> = {};
  let points = 0;
  (egress.data ?? []).forEach((r: any) => { perAccount[r.user_id] = (perAccount[r.user_id] ?? 0) + 1; points += r.data_points_count ?? 0; });
  const reasons: Record<string, number> = {};
  (quarantine.data ?? []).forEach((r: any) => { reasons[r.reason_code] = (reasons[r.reason_code] ?? 0) + 1; });
  // Account ids are never sent to the model — only counts.
  const signals = {
    quarantined_payloads: (quarantine.data ?? []).length, quarantine_reasons: reasons,
    egress_events: (egress.data ?? []).length, data_points: points, distinct_accounts: Object.keys(perAccount).length,
    max_egress_per_account: Math.max(0, ...Object.values(perAccount)),
  };
  if (signals.quarantined_payloads >= 5) return finding(db, "crazy_shield", "quarantine_surge", "medium", signals);
  if (signals.max_egress_per_account >= 20 || points >= 250_000) return finding(db, "crazy_shield", "egress_surge", "medium", signals);
  return record(db, "crazy_shield", "sweep_clear", "low", { signals });
}

async function hunter(db: any) {
  const [logs, ledger, repairs] = await Promise.all([
    db.from("security_event_logs").select("protocol,event_type,severity").gte("created_at", since(WINDOW_MIN)).limit(2000),
    db.from("synapse_credit_ledger").select("user_id,entry_type").gte("created_at", since(WINDOW_MIN)).limit(5000),
    db.from("settlement_ledger_repair_queue").select("phase").is("resolved_at", null).gte("created_at", since(WINDOW_MIN)).limit(500),
  ]);
  const sevCount: Record<string, number> = {};
  const types: Record<string, number> = {};
  (logs.data ?? []).forEach((r: any) => { sevCount[r.severity] = (sevCount[r.severity] ?? 0) + 1; types[r.event_type] = (types[r.event_type] ?? 0) + 1; });
  const perAccount: Record<string, number> = {};
  const entryTypes: Record<string, number> = {};
  (ledger.data ?? []).forEach((r: any) => { perAccount[r.user_id] = (perAccount[r.user_id] ?? 0) + 1; entryTypes[r.entry_type] = (entryTypes[r.entry_type] ?? 0) + 1; });
  const severe = (sevCount.high ?? 0) + (sevCount.critical ?? 0);
  const signals = {
    log_severity: sevCount, log_event_types: types,
    ledger_entries: (ledger.data ?? []).length, ledger_entry_types: entryTypes, max_ledger_entries_per_account: Math.max(0, ...Object.values(perAccount)),
    open_settlement_failures: (repairs.data ?? []).length,
  };
  if (severe > 0) return finding(db, "crazy_hunter", "threat_indicators", "high", signals);
  if (signals.open_settlement_failures >= 3) return finding(db, "crazy_hunter", "settlement_failures", "medium", signals);
  if (signals.max_ledger_entries_per_account >= 50) return finding(db, "crazy_hunter", "ledger_charge_burst", "medium", signals);
  return record(db, "crazy_hunter", "sweep_clear", "low", { signals });
}

// Mirror: real attack probes against the live system, as an outsider would try them.
const PROTECTED_TABLES = ["profiles", "user_roles", "security_events", "api_keys", "synapse_credit_ledger", "dao_votes", "liquidity_locks", "mesh_nodes"];
async function mirror(db: any) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const probes: { probe: string; blocked: boolean }[] = [];
  for (const t of PROTECTED_TABLES) {
    log(`MIRROR.read.${t}`, "START");
    const { data, error } = await anon.from(t).select("*").limit(1);
    probes.push({ probe: `signed_out_read_${t}`, blocked: !!error || !(data ?? []).length });
    log(`MIRROR.read.${t}`, "END");
  }
  const http = async (name: string, path: string, headers: Record<string, string>, expect: number[]) => {
    log(`MIRROR.${name}`, "START");
    try {
      const r = await fetch(`${url}/functions/v1/${path}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}`, ...headers }, body: JSON.stringify({ action: "probe" }) });
      await r.body?.cancel();
      probes.push({ probe: name, blocked: expect.includes(r.status) });
    } catch (err) { logErr(`MIRROR.${name}`, err); probes.push({ probe: name, blocked: true }); }
    log(`MIRROR.${name}`, "END");
  };
  await http("admin_function_without_role", "crazy-8-security", {}, [401, 403]);
  await http("forged_node_key", "mesh-telemetry-intake", { "x-api-key": "idia_mirror_invalid_probe_key" }, [400, 401, 403]);
  const failed = probes.filter((p) => !p.blocked);
  const signals = { probes_run: probes.length, probes_blocked: probes.length - failed.length, failed_probes: failed.map((p) => p.probe), probes };
  if (failed.length) return finding(db, "crazy_mirror", "red_team_breach", "critical", signals);
  return record(db, "crazy_mirror", "red_team_passed", "low", { signals });
}

async function oracle(db: any) {
  const { data } = await db.from("security_events").select("agent_name,action_type,severity,timestamp")
    .not("action_type", "in", "(sweep_clear,maintenance_pulse,red_team_passed,incident_record,incident_explained,incident_triage,threat_forecast,alerts_rising)")
    .gte("timestamp", since(7 * 24 * 60)).limit(5000);
  const days: Record<string, number> = {};
  const byAgentToday: Record<string, number> = {};
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let todayN = 0, yestN = 0;
  (data ?? []).forEach((r: any) => {
    if (!["medium", "high", "critical"].includes(String(r.severity).toLowerCase())) return;
    const d = r.timestamp.slice(0, 10); days[d] = (days[d] ?? 0) + 1;
    if (d === today) { todayN++; const k = String(r.agent_name).replace(/^crazy_/, ""); byAgentToday[k] = (byAgentToday[k] ?? 0) + 1; }
    if (d === yesterday) yestN++;
  });
  const signals = { alerts_by_day: days, alerts_today: todayN, alerts_yesterday: yestN, alerts_today_by_agent: byAgentToday };
  if (todayN > 0 && todayN > yestN) return finding(db, "crazy_oracle", "alerts_rising", "medium", signals);
  return record(db, "crazy_oracle", "sweep_clear", "low", { signals });
}

async function insight(db: any) {
  const { data } = await db.from("security_events").select("id,agent_name,action_type,severity,timestamp,result_data").neq("agent_name", "crazy_insight")
    .in("severity", ["high", "critical"]).gte("timestamp", since(WINDOW_MIN)).limit(20);
  const rows = data ?? [];
  const signals = { serious_events: rows.map((r: any) => ({ agent: r.agent_name, type: r.action_type, severity: r.severity, at: r.timestamp, summary: r.result_data?.analysis?.summary ?? null, signals: r.result_data?.signals ?? null })) };
  if (rows.length > 0) return finding(db, "crazy_insight", "incident_record", "medium", signals, { source_event_ids: rows.map((r: any) => r.id) });
  return record(db, "crazy_insight", "sweep_clear", "low", { signals: { serious_events: 0 } });
}

async function sweep(db: any) {
  const results: Record<string, string> = {};
  // Detectors and red-team first, then agents that read their output.
  for (const [name, fn] of [["crazy_sentinel", sentinel], ["crazy_guardian", guardian], ["crazy_gatekeeper", gatekeeper], ["crazy_shield", shield], ["crazy_hunter", hunter], ["crazy_mirror", mirror],
    ["crazy_oracle", oracle], ["crazy_insight", insight]] as const) {
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
