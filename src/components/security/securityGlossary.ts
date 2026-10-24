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
    watches: 'Every request made to the Hub in the last 30 minutes: how many failed and how slow the slowest ones were.',
    alertsWhen: 'At least 10 requests fail and more than 1 in 5 requests are failing, or the slowest 5% take over 5 seconds.',
  },
  oracle: {
    name: 'Oracle', title: 'Threat forecasts',
    watches: 'The last 7 days of serious alerts, counted day by day.',
    alertsWhen: 'Today already has more serious alerts than all of yesterday, which suggests risk is rising.',
  },
  hunter: {
    name: 'Hunter', title: 'Threat hunting',
    watches: 'Protocol security logs and any uploads The Vulture refused and set aside.',
    alertsWhen: 'Any serious log entry appears, or 5 or more uploads are set aside in 30 minutes.',
  },
  guardian: {
    name: 'Guardian', title: 'Incident triage',
    watches: 'Serious alerts from the other agents that nobody has marked resolved yet.',
    alertsWhen: 'Any serious alert from the last 30 minutes is still open. It ranks them and suggests next steps.',
  },
  gatekeeper: {
    name: 'Gatekeeper', title: 'Identity and access',
    watches: 'New admin or security roles, new API keys and refused sign-in attempts.',
    alertsWhen: 'Anyone is given an admin or security role, 15 or more requests are refused, or 10 or more API keys are created in 30 minutes.',
  },
  shield: {
    name: 'Shield', title: 'Data loss prevention',
    watches: 'Data leaving the protocol through the Marketplace, Best Friend AI and the API. Only counts are checked, never account names.',
    alertsWhen: 'One account makes 20 or more exports, or more than 250,000 data points leave, in 30 minutes.',
  },
  mirror: {
    name: 'Mirror', title: 'AI manipulation defense',
    watches: 'Messages people send to Best Friend AI, checked for known tricks to make an AI misbehave. Message text never leaves the database.',
    alertsWhen: 'Any message matches a known trick. Five or more matches is a high alert.',
  },
  insight: {
    name: 'Insight', title: 'Plain-English explanations',
    watches: 'Serious alerts from Sentinel, Oracle, Hunter, Gatekeeper, Shield and Mirror.',
    alertsWhen: 'There is any serious alert to explain. It writes what happened and what to do in plain language.',
  },
};

export const agentInfo = (raw: string): AgentInfo =>
  AGENT_INFO[label(raw)] ?? { name: label(raw), title: 'Security agent', watches: 'Platform activity.', alertsWhen: 'Something unusual happens.' };

export const EVENT_INFO: Record<string, { title: string; meaning: string }> = {
  sweep_clear: { title: 'Sweep clear', meaning: 'The agent finished its 30-minute check and found nothing that needs attention.' },
  threat_forecast: { title: 'Threat forecast', meaning: 'Oracle sees more serious alerts today than yesterday and expects risk to stay raised in the near term.' },
  incident_triage: { title: 'Incident triage', meaning: 'Guardian found serious alerts that are still open, ranked them, and listed what to do first.' },
  incident_explained: { title: 'Incident explained', meaning: 'Insight rewrote the latest serious alerts in plain language so anyone can follow what happened.' },
  privilege_change: { title: 'Privilege change', meaning: 'Someone was given an admin or security role. Confirm it was intended.' },
  api_error_spike: { title: 'Error spike', meaning: 'An unusually large share of requests to the Hub failed.' },
  latency_anomaly: { title: 'Slow responses', meaning: 'The Hub took unusually long to answer some requests.' },
  auth_rejection_burst: { title: 'Refused sign-ins', meaning: 'Many requests were refused for missing or wrong credentials. This can mean someone is guessing.' },
  api_key_burst: { title: 'Many new API keys', meaning: 'An unusual number of API keys were created in a short time.' },
  egress_surge: { title: 'Data export surge', meaning: 'More data than usual left the protocol, or one account exported far more than normal.' },
  threat_indicators: { title: 'Threat indicators', meaning: 'Hunter found serious entries in the security logs.' },
  quarantine_surge: { title: 'Quarantine surge', meaning: 'The Vulture refused and set aside an unusual number of uploads.' },
  prompt_injection_attempt: { title: 'AI manipulation attempt', meaning: 'Someone sent Best Friend AI a message that matches a known trick to make an AI ignore its rules.' },
  maintenance_pulse: { title: 'Legacy check-in', meaning: 'An old once-a-minute heartbeat that carried no data. It has been retired and is now ignored.' },
};

export const eventInfo = (raw: string) => EVENT_INFO[raw] ?? { title: label(raw), meaning: 'A security event recorded by this agent.' };

const SIGNAL_LABELS: Record<string, string> = {
  calls: 'Requests checked', errors: 'Failed requests', error_rate: 'Failure rate', p95_latency_ms: 'Slowest 5% took (ms)',
  errors_by_endpoint: 'Failures by address', endpoints_with_errors: 'Addresses with failures',
  privilege_grants: 'Roles granted', api_keys_created: 'API keys created', rejected_auth_attempts: 'Refused requests',
  egress_events: 'Data exports', data_points: 'Data points exported', distinct_accounts: 'Accounts exporting', max_egress_per_account: 'Most exports by one account',
  log_severity: 'Log entries by severity', log_event_types: 'Log entries by type', quarantined_payloads: 'Uploads set aside', quarantine_reasons: 'Reasons set aside',
  messages_scanned: 'Messages checked', pattern_hits: 'Tricks matched',
  daily_severity_counts: 'Serious alerts by day', serious_today: 'Serious alerts today', serious_yesterday: 'Serious alerts yesterday',
  new_open_incidents: 'Open incidents', serious_events: 'Events explained', manual: 'Manual review', data: 'Supplied data',
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
    case 'gatekeeper': {
      const roles = Array.isArray(sig.privilege_grants) ? sig.privilege_grants : [];
      return `${roles.length ? `${roles.length} role${roles.length > 1 ? 's' : ''} granted (${roles.join(', ')}).` : 'No new admin or security roles.'} ${fmt(sig.api_keys_created)} API keys created and ${fmt(sig.rejected_auth_attempts)} requests refused.`;
    }
    case 'shield':
      return `${fmt(sig.egress_events)} data exports by ${fmt(sig.distinct_accounts)} accounts, ${fmt(sig.data_points)} data points in total. The busiest account made ${fmt(sig.max_egress_per_account)} exports.`;
    case 'hunter':
      return `${fmt(sumObj(sig.log_severity))} security log entries and ${fmt(sig.quarantined_payloads)} uploads set aside in the last 30 minutes.`;
    case 'mirror': {
      const hits = sumObj(sig.pattern_hits);
      return `Checked ${fmt(sig.messages_scanned)} Best Friend AI messages. ${hits ? `${hits} matched a known manipulation trick.` : 'None matched a known manipulation trick.'}`;
    }
    case 'oracle':
      return `Serious alerts today: ${fmt(sig.serious_today)}. Yesterday: ${fmt(sig.serious_yesterday)}. ${n(sig.serious_today) > n(sig.serious_yesterday) ? 'The trend is rising.' : 'No rising trend.'}`;
    case 'guardian': {
      const open = Array.isArray(sig.new_open_incidents) ? sig.new_open_incidents.length : 0;
      return open ? `${open} serious alert${open > 1 ? 's are' : ' is'} still open from the last 30 minutes.` : 'No serious alerts are open from the last 30 minutes.';
    }
    case 'insight': {
      const c = Array.isArray(sig.serious_events) ? sig.serious_events.length : n(sig.serious_events);
      return c ? `${c} serious event${c > 1 ? 's' : ''} explained below.` : 'No serious events to explain in the last 30 minutes.';
    }
    default:
      return 'This agent recorded the numbers below.';
  }
}

export const STAT_INFO: Record<string, { title: string; body: string }> = {
  Agents: { title: 'Active agents', body: 'How many of the 8 agents reported in the last hour. Every agent checks in every 30 minutes, even when everything is fine, so this should normally read 8/8. A lower number means an agent missed its check.' },
  '24h': { title: 'Events in the last 24 hours', body: 'Every event recorded in the last day, including routine "sweep clear" check-ins. On a quiet day that is about 384 (8 agents, 48 checks each).' },
  Open: { title: 'Open threats', body: 'Serious alerts (high or critical) that nobody has marked resolved yet. Open the Threats tab to review them.' },
  Critical: { title: 'Critical threats', body: 'The most urgent open alerts. This should be 0. Anything here needs attention right away.' },
  Live: { title: 'Live connection', body: 'Live (pulsing) means this page is connected and new events appear the moment they happen. Offline means it is reconnecting; refresh if it stays offline.' },
};
