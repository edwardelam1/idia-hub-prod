// Plain-English vocabulary for the Crazy Friend Security dashboard.
// Mirrors the detectors in supabase/functions/crazy-8-security; keep thresholds in sync.

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export const label = (s: string) => (s ?? '').replace(/^crazy_/, '').replace(/_/g, ' ');

export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const sevClass: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  high: 'bg-destructive/70 text-destructive-foreground',
  critical: 'bg-destructive text-destructive-foreground',
};

export const SEVERITY_MEANING: Record<string, string> = {
  low: 'Routine. Nothing needs doing.',
  medium: 'Worth a look when convenient. Not urgent.',
  high: 'Review soon. Something changed that could affect security.',
  critical: 'Act now. A serious problem may be in progress.',
};

export interface AgentInfo { name: string; title: string; watches: string; alertsWhen: string; }

export const AGENT_INFO: Record<string, AgentInfo> = {
  sentinel: {
    name: 'Sentinel', title: 'Anomaly detection',
    watches: 'API traffic velocity across the Hub in the last 30 minutes: how many requests failed and how slow the slowest ones were.',
    alertsWhen: 'At least 10 requests fail and more than 1 in 5 are failing, or the slowest 5% take over 5 seconds.',
  },
  oracle: {
    name: 'Oracle', title: 'Predictive threat modeling',
    watches: 'Seven days of alerts from every agent, by day and by area, to forecast which risk is building.',
    alertsWhen: 'Today already has more alerts than all of yesterday.',
  },
  hunter: {
    name: 'Hunter', title: 'Active threat hunting',
    watches: 'Security logs, the Synapse credit ledger and failed settlements, looking for hidden abuse or internal probing.',
    alertsWhen: 'A serious log entry appears, 3 or more settlements fail, or one account makes 50 or more ledger entries in 30 minutes.',
  },
  guardian: {
    name: 'Guardian', title: 'Zero-trust access control',
    watches: 'New admin or security roles, new API keys and refused or permission-denied requests.',
    alertsWhen: 'Anyone is given an admin or security role, 15 or more requests are refused, or 10 or more API keys are created in 30 minutes.',
  },
  gatekeeper: {
    name: 'Gatekeeper', title: 'Ingress and egress sanitization',
    watches: 'Messages coming into Best Friend AI (checked for manipulation tricks; text never leaves the database) and every data export leaving the protocol.',
    alertsWhen: 'Any message matches a known trick, or an export leaves without a recorded type.',
  },
  shield: {
    name: 'Shield', title: 'Data loss prevention',
    watches: 'The Vulture quarantine airlock for unverified or legacy data, and how much each account exports. Only counts, never account names.',
    alertsWhen: '5 or more uploads are quarantined, one account makes 20 or more exports, or more than 250,000 data points leave in 30 minutes.',
  },
  mirror: {
    name: 'Mirror', title: 'Adversarial red-teaming',
    watches: 'Every sweep it actually attacks the live protocol like an outsider: reading protected tables while signed out, calling admin-only tools without a role, and using a forged device key.',
    alertsWhen: 'Any attack gets through. That is always a critical alert.',
  },
  insight: {
    name: 'Insight', title: 'Forensic auditability',
    watches: 'Every serious alert from the other agents.',
    alertsWhen: 'There is a serious alert. It writes a dated incident record in plain language for a security officer review.',
  },
};

export const agentInfo = (raw: string): AgentInfo =>
  AGENT_INFO[label(raw)] ?? { name: label(raw), title: 'Security agent', watches: 'Platform activity.', alertsWhen: 'Something unusual happens.' };

export const EVENT_INFO: Record<string, { title: string; meaning: string }> = {
  sweep_clear: { title: 'All clear', meaning: 'The agent finished its 30-minute check and found nothing that needs attention.' },
  red_team_passed: { title: 'Red-team check: all attacks blocked', meaning: 'Mirror attacked the live protocol like an outsider and every attempt was refused.' },
  red_team_breach: { title: 'Red-team check: an attack got through', meaning: 'Mirror attacked the live protocol and at least one attempt succeeded. A defense has a gap that must be closed now.' },
  alerts_rising: { title: 'Security alerts rising', meaning: 'Oracle sees more alerts today than yesterday and forecasts where risk is building.' },
  threat_forecast: { title: 'Security alerts rising', meaning: 'Oracle sees more serious alerts today than yesterday and expects risk to stay raised.' },
  incident_record: { title: 'Incident record', meaning: 'Insight wrote a dated, plain-English record of a serious alert for audit review.' },
  incident_explained: { title: 'Incident record', meaning: 'Insight wrote a plain-English record of recent serious alerts.' },
  incident_triage: { title: 'Open serious alerts', meaning: 'Serious alerts that were still open when this was recorded (older report format).' },
  admin_role_granted: { title: 'Admin role granted to an account', meaning: 'Someone was given an admin or security role. Confirm it was intended.' },
  privilege_change: { title: 'Admin role granted to an account', meaning: 'Someone was given an admin or security role. Confirm it was intended.' },
  api_error_spike: { title: 'Many Hub requests failing', meaning: 'An unusually large share of requests to the Hub failed.' },
  latency_anomaly: { title: 'Hub responding slowly', meaning: 'The Hub took unusually long to answer some requests.' },
  auth_rejection_burst: { title: 'Burst of refused sign-ins', meaning: 'Many requests were refused for missing or wrong credentials. This can mean someone is guessing.' },
  api_key_burst: { title: 'Many new API keys created', meaning: 'An unusual number of API keys were created in a short time.' },
  egress_surge: { title: 'Unusual amount of data exported', meaning: 'More data than usual left the protocol, or one account exported far more than normal.' },
  unlabeled_egress: { title: 'Data export without a recorded type', meaning: 'Data left the protocol without being labeled, so it cannot be matched to an approved route.' },
  threat_indicators: { title: 'Serious entries in security logs', meaning: 'Hunter found serious entries in the protocol security logs.' },
  settlement_failures: { title: 'Several settlements failed', meaning: 'Hunter found payment settlements stuck in the repair queue.' },
  ledger_charge_burst: { title: 'One account flooding the ledger', meaning: 'One account made an unusual number of credit ledger entries in a short time.' },
  quarantine_surge: { title: 'Many uploads quarantined', meaning: 'The Vulture airlock refused and set aside an unusual number of uploads.' },
  prompt_injection_attempt: { title: 'Attempt to manipulate Best Friend AI', meaning: 'Someone sent Best Friend AI a message matching a known trick to make an AI ignore its rules.' },
  maintenance_pulse: { title: 'Legacy check-in', meaning: 'An old once-a-minute heartbeat that carried no data. It has been retired and is now ignored.' },
};

const PROBE_LABELS: Record<string, string> = {
  admin_function_without_role: 'Run admin security tools without a role',
  forged_node_key: 'Send data with a forged device key',
};
export const probeLabel = (p: string) =>
  PROBE_LABELS[p] ?? (p.startsWith('signed_out_read_') ? `Read ${p.slice(16).replace(/_/g, ' ')} while signed out` : label(p));

export const eventInfo = (raw: string) => EVENT_INFO[raw] ?? { title: label(raw), meaning: 'A security event recorded by this agent.' };

const SIGNAL_LABELS: Record<string, string> = {
  calls: 'Requests checked', errors: 'Failed requests', error_rate: 'Failure rate', p95_latency_ms: 'Slowest 5% took (ms)',
  errors_by_endpoint: 'Failures by address', endpoints_with_errors: 'Addresses with failures',
  privilege_grants: 'Roles granted', api_keys_created: 'API keys created', rejected_auth_attempts: 'Refused requests',
  egress_events: 'Data exports', data_points: 'Data points exported', distinct_accounts: 'Accounts exporting', max_egress_per_account: 'Most exports by one account',
  log_severity: 'Log entries by severity', log_event_types: 'Log entries by type', quarantined_payloads: 'Uploads set aside', quarantine_reasons: 'Reasons set aside',
  messages_scanned: 'Messages checked', pattern_hits: 'Tricks matched',
  daily_severity_counts: 'Serious alerts by day', serious_today: 'Serious alerts today', serious_yesterday: 'Serious alerts yesterday',
  new_open_incidents: 'Open incidents', egress_by_type: 'Exports by type', unlabeled_egress: 'Exports without a type', ledger_entries: 'Ledger entries', ledger_entry_types: 'Ledger entries by type', max_ledger_entries_per_account: 'Most ledger entries by one account', open_settlement_failures: 'Stuck settlements', probes_run: 'Attacks tried', probes_blocked: 'Attacks blocked', failed_probes: 'Attacks that got through', probes: 'Attack results', alerts_by_day: 'Alerts by day', alerts_today: 'Alerts today', alerts_yesterday: 'Alerts yesterday', alerts_today_by_agent: 'Alerts today by agent', serious_events: 'Events explained', manual: 'Manual review', data: 'Supplied data',
};
export const signalLabel = (k: string) => SIGNAL_LABELS[k] ?? label(k);

const n = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const fmt = (v: unknown) => n(v).toLocaleString();
const sumObj = (o: unknown) => (o && typeof o === 'object' ? Object.values(o as Record<string, unknown>).reduce<number>((a, b) => a + n(b), 0) : 0);

/** Plain-English narrative built only from the numbers the agent recorded. */
export function narrativeFromSignals(agentRaw: string, s: Record<string, any> | null | undefined): string {
  const sig = s ?? {};
  switch (label(agentRaw)) {
    case 'sentinel':
      if (!n(sig.calls)) return 'No requests reached the Hub in the last 30 minutes, so there was nothing to flag.';
      return `Checked ${fmt(sig.calls)} requests in the last 30 minutes. ${fmt(sig.errors)} failed (${(n(sig.error_rate) * 100).toFixed(1)}%), and the slowest 5% took ${fmt(sig.p95_latency_ms)} ms.`;
    case 'guardian': {
      const roles = Array.isArray(sig.privilege_grants) ? sig.privilege_grants : [];
      return `${roles.length ? `${roles.length} role${roles.length > 1 ? 's' : ''} granted (${roles.join(', ')}).` : 'No new admin or security roles.'} ${fmt(sig.api_keys_created)} API keys created and ${fmt(sig.rejected_auth_attempts)} requests refused.`;
    }
    case 'gatekeeper': {
      const hits = sumObj(sig.pattern_hits);
      return `Checked ${fmt(sig.messages_scanned)} incoming Best Friend AI messages: ${hits ? `${hits} matched a manipulation trick` : 'none matched a manipulation trick'}. ${fmt(sig.egress_events)} outgoing exports, ${fmt(sig.unlabeled_egress)} without a recorded type.`;
    }
    case 'shield':
      return `${fmt(sig.quarantined_payloads)} uploads held in the quarantine airlock. ${fmt(sig.egress_events)} exports by ${fmt(sig.distinct_accounts)} accounts; the busiest made ${fmt(sig.max_egress_per_account)}.`;
    case 'hunter':
      return `Searched ${fmt(sumObj(sig.log_severity))} security log entries and ${fmt(sig.ledger_entries)} credit ledger entries. ${fmt(sig.open_settlement_failures)} settlements are stuck.`;
    case 'mirror':
      if (sig.probes_run == null) return 'Older report from before red-team testing started.';
      return `Tried ${fmt(sig.probes_run)} real attacks against the live protocol. ${fmt(sig.probes_blocked)} were blocked${n(sig.probes_run) > n(sig.probes_blocked) ? ` and ${fmt(n(sig.probes_run) - n(sig.probes_blocked))} got through` : ''}.`;
    case 'oracle':
      if (sig.alerts_today != null) return `Alerts today: ${fmt(sig.alerts_today)}. Yesterday: ${fmt(sig.alerts_yesterday)}. ${n(sig.alerts_today) > n(sig.alerts_yesterday) ? 'Risk is building.' : 'No rising trend.'}`;
      return `Serious alerts today: ${fmt(sig.serious_today)}. Yesterday: ${fmt(sig.serious_yesterday)}.`;
    case 'insight': {
      const c = Array.isArray(sig.serious_events) ? sig.serious_events.length : n(sig.serious_events);
      return c ? `Incident record covering ${c} serious alert${c > 1 ? 's' : ''}.` : 'No serious alerts to record in the last 30 minutes.';
    }
    default:
      return 'This agent recorded the numbers below.';
  }
}

export const STAT_INFO: Record<string, { title: string; body: string }> = {
  Agents: { title: 'Active agents', body: 'How many of the 8 agents reported in the last hour. Every agent checks in every 30 minutes, even when everything is fine, so this should normally read 8/8. A lower number means an agent missed its check.' },
  '24h': { title: 'Events in the last 24 hours', body: 'Every event recorded in the last day, including routine "sweep clear" check-ins. On a quiet day that is about 384 (8 agents, 48 checks each).' },
  Open: { title: 'Open threats', body: 'Medium, high or critical alerts that nobody has marked resolved yet. Low alerts resolve themselves automatically. Open the Threats tab to review them.' },
  Critical: { title: 'Critical threats', body: 'The most urgent open alerts. This should be 0. Anything here needs attention right away.' },
  Live: { title: 'Live connection', body: 'Live (pulsing) means this page is connected and new events appear the moment they happen. Offline means it is reconnecting; refresh if it stays offline.' },
};

/** Title that says what happened: AI headline first, else built from recorded numbers, else the event title. */
export function eventHeadline(eventType: string, aiHeadline?: string | null, s?: Record<string, any> | null): string {
  if (aiHeadline && aiHeadline.trim()) return aiHeadline.trim();
  const sig = s ?? {};
  const base = eventInfo(eventType).title;
  if (!s) return base;
  switch (eventType) {
    case 'sweep_clear':
      if (n(sig.calls)) return `All clear: ${fmt(sig.calls)} requests checked`;
      if (n(sig.messages_scanned)) return `All clear: ${fmt(sig.messages_scanned)} messages checked`;
      return base;
    case 'red_team_passed': case 'red_team_breach':
      return `Red-team check: ${fmt(n(sig.probes_run) - n(sig.probes_blocked))} of ${fmt(sig.probes_run)} attacks got through`;
    case 'alerts_rising': return `Security alerts rising: ${fmt(sig.alerts_today)} today vs ${fmt(sig.alerts_yesterday)} yesterday`;
    case 'threat_forecast': return `Serious alerts rising: ${fmt(sig.serious_today)} today vs ${fmt(sig.serious_yesterday)} yesterday`;
    case 'api_error_spike': return `${(n(sig.error_rate) * 100).toFixed(0)}% of Hub requests failing`;
    case 'prompt_injection_attempt': { const h = sumObj(sig.pattern_hits); return `${h} message${h === 1 ? '' : 's'} tried to override Best Friend AI`; }
    case 'egress_surge': return `One account made ${fmt(sig.max_egress_per_account)} exports in 30 min`;
    case 'quarantine_surge': return `${fmt(sig.quarantined_payloads)} uploads quarantined in 30 min`;
    case 'auth_rejection_burst': return `${fmt(sig.rejected_auth_attempts)} refused requests in 30 min`;
    default: return base;
  }
}
