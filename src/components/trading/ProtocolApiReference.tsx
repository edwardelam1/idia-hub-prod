import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// Live IDIA Protocol API v1 (edge function `protocol-api`). Schemas show field types, not sample data.
const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/protocol-api`;
export const DOCS_URL = "https://thebigidia.com/hub/developers";
export const OPENAPI_URL = "https://thebigidia.com/openapi.json";

interface Route {
  method: "GET" | "POST";
  path: string;
  title: string;
  keyType: string;
  notes: string[];
  request?: string;
  response: string;
  errors: string;
  curl: string;
}

const H = (extra = "") =>
  `  -H "x-api-key: $IDIA_API_KEY" \\\n  -H "Content-Type: application/json"${extra}`;

const ROUTES: Route[] = [
  {
    method: "POST", path: "/v1/features/sessions?topic={topic}", title: "Start or reuse an hourly feature-feed session", keyType: "Any active IDIA API key",
    notes: ["Analyst 5 CR, Professional 15 CR, Enterprise / pure_alpha 50 CR per topic per hour. Requires an active subscription; charges are atomic and reconnects reuse the same unexpired session. No automatic renewal.", "Topics: vault_health_sync (consented aggregate availability), vault_financial_ledger (your settled ledger), vault_identity_stream (your receipt / confirmed mint counts).", "Sandbox returns no production packets, creates no session, and deducts zero credits."],
    response: `{ "status": "active", "session_id": uuid, "topic": string, "expires_at": ISO-8601, "credits_charged": number, "reused": boolean, "currency": "CRD", "billing_unit": "topic_hour", "auto_renew": false }`,
    errors: "400 invalid_topic · 401 invalid_api_key · 402 insufficient_funds · 403 tier_required",
    curl: `curl -X POST "${BASE}/v1/features/sessions?topic=vault_health_sync" \\\n${H()}`,
  },
  {
    method: "GET", path: "/v1/features/latest?topic={topic}", title: "Latest verified aggregate packet", keyType: "API key with a paid, unexpired topic session",
    notes: ["Health availability includes only staged rows backed by raw_data_id and a valid ACA hash, with latest feature_feed_health consent explicitly granted. Counts are null unless at least ten contributors qualify. No biometric values, identities or individual hashes are exposed.", "Financial metrics: settled_entries, net_credits = sum(amount), usage_credits = sum(-amount) for negative USAGE entries; status settled/completed only. Identity metrics: recorded_receipts and confirmed_liability_nfts, requiring mint flag, token id and mint transaction.", "Packets are published on source changes, deduplicated by metrics, retained seven days, and labeled source_aggregate. They are not Merkle proofs or proof of on-chain consent. CJIS sources are never queried."],
    response: `{ "topic": string, "session_id": uuid, "expires_at": ISO-8601, "packets": [{ "id": integer, "created_at": ISO-8601, "payload": { "schema_version": "1.0", "observed_at": ISO-8601, "metrics": object, "provenance": { "source": string, "status": "source_aggregate", "on_chain_proof": null, "contains_personal_identifiers": false } } }] }`,
    errors: "400 invalid_topic · 401 invalid_api_key · 403 feed_session_required",
    curl: `curl "${BASE}/v1/features/latest?topic=vault_health_sync" \\\n${H()}`,
  },
  {
    method: "GET", path: "/v1/features/stream?topic={topic}", title: "Resumable server-sent events", keyType: "API key with a paid, unexpired topic session",
    notes: ["Use fetch / an SSE client supporting x-api-key; browser EventSource cannot attach this header. Each connection lasts up to 45 seconds; reconnect with Last-Event-ID (or cursor query parameter). Reconnecting never starts or renews a paid session.", "Event feature.batch_ready carries durable packet id and JSON payload. Heartbeats are comments, not billable data. Without a cursor, the latest packet is delivered first. With a cursor, retained newer packets are replayed in ascending id order.", "Key revocation and paid-session expiry are checked every ten seconds. session.expired stops the stream. Delivery checks occur only while connected; rate limits apply to every reconnect. No packet means no source change, not fabricated activity."],
    response: `Content-Type: text/event-stream\nid: <durable-packet-id>\nevent: feature.batch_ready\ndata: <packet-payload-json>`,
    errors: "400 invalid_topic | invalid_cursor · 401 invalid_api_key · 403 feed_session_required · 429 rate_limit_exceeded",
    curl: `curl -N "${BASE}/v1/features/stream?topic=vault_health_sync" \\\n  -H "x-api-key: $IDIA_API_KEY" \\\n  -H "Last-Event-ID: $LAST_PACKET_ID"`,
  },
  {
    method: "GET",
    path: "/v1/auth/provision-status",
    title: "Provisioning & wallet pre-flight",
    keyType: "Identity Verification or mesh node key",
    notes: ["Shows which services your C-suite has provisioned, the rate applied, and your live Synapse Credit balance."],
    response: `{
  "status": "success",
  "services": {
    "identity_verification": { "provisioned": boolean, "rate_cr": number(4dp), "organization_id": uuid|null, "organization_name": string|null },
    "vulture":               { "provisioned": boolean, "rate_cr": number(4dp), "organization_id": uuid|null, "organization_name": string|null }
  },
  "wallet": { "synapse_credits_available": number(4dp) }
}`,
    errors: "401 invalid_api_key",
    curl: `curl -X GET "${BASE}/v1/auth/provision-status" \\\n${H()}`,
  },
  {
    method: "GET",
    path: "/v1/billing/balance",
    title: "Synapse Credit balance & rate cards",
    keyType: "Any IDIA key",
    notes: ["Live wallet balance (4 decimals, CRD) plus your organization's provisioned rate for each service."],
    response: `{
  "status": "success",
  "wallet": { "synapse_credits_available": number(4dp), "currency": "CRD" },
  "organization": { "organization_id": uuid|null, "organization_name": string|null },
  "rate_cards": {
    "identity_verification": { "provisioned": boolean, "rate_cr": number(4dp), "unit": "authorized_target" },
    "vulture":               { "provisioned": boolean, "rate_cr": number(4dp), "unit": "batch" }
  },
  "as_of": ISO-8601
}`,
    errors: "401 invalid_api_key · 429 rate_limit_exceeded",
    curl: `curl -X GET "${BASE}/v1/billing/balance" \\\n${H()}`,
  },
  {
    method: "POST",
    path: "/v1/utility/validate",
    title: "Identity Verification — target validation",
    keyType: "Identity Verification key",
    notes: [
      "Idempotency-Key header required; a retry with the same key returns the original answer and never double-charges.",
      "Max 1,000 targets per call. Targets: SHA-256, 64 lowercase hex chars, no 0x prefix.",
      "Charge is atomic: only authorized targets are billed at your organization's rate. Denied targets return null (Default-Deny).",
    ],
    request: `{
  "campaign_id": string (optional),
  "target_type": "hashed_ip" | "hashed_maid" | "hashed_email" | "hashed_phone" | "hashed_identifier",
  "hash_algorithm": "sha256",
  "targets": string[]  // ^[a-f0-9]{64}$, 1–1000
}`,
    response: `{
  "status": "success",
  "meta": { "total_targets": int, "opted_in": int, "opted_out_default_deny": int },
  "billing": { "rate_per_target": number(4dp), "synapse_credits_deducted": number(4dp), "remaining_balance": number(4dp) },
  "results": [
    { "target_hash": string, "consent_status": "authorized" | "denied", "guid": string|null, "liability_receipt_id": uuid|null }
  ]
}`,
    errors: `400 invalid_request | invalid_target_type | invalid_target_hash | idempotency_key_required
401 invalid_api_key · 403 not_provisioned · 413 batch_too_large
402 insufficient_funds → { "details": { "required_credits", "available_credits", "shortfall" }, "resolution_url" }`,
    curl: `curl -X POST "${BASE}/v1/utility/validate" \\\n${H(` \\\n  -H "Idempotency-Key: $(uuidgen)"`)} \\\n  -d '{"target_type":"hashed_ip","hash_algorithm":"sha256","targets":["<sha256-hex>"]}'`,
  },
  {
    method: "GET",
    path: "/v1/utility/receipts",
    title: "Receipt history (cursor-paginated)",
    keyType: "Identity Verification key",
    notes: [
      "Newest first, ordered by (timestamp, id) so pages never shift while new receipts are written.",
      "Query: limit (1–100, default 50), starting_after=<next_cursor> for older pages, ending_before=<prev_cursor> for newer pages, since / until (ISO-8601), status (anchored_l2 | ledger_recorded).",
      "Cursors are opaque — pass them back unchanged. For bulk audits, export from Hub Saved Activity or reconcile anchored ACA hashes against Base event logs.",
    ],
    response: `{
  "object": "list",
  "data": [ <same shape as the single receipt> ],
  "pagination": {
    "limit": number, "returned_count": number, "has_more": boolean,
    "next_cursor": string|null,   // older page
    "prev_cursor": string|null    // newer page
  },
  "order": "timestamp_desc",
  "bulk_audit": { "hub_export": url, "on_chain": string }
}`,
    errors: "400 invalid_limit | invalid_cursor | invalid_date | invalid_status · 401 invalid_api_key",
    curl: `curl -G "${BASE}/v1/utility/receipts" \\\n${H()} \\\n  --data-urlencode "limit=50" \\\n  --data-urlencode "since=2026-11-01T00:00:00Z"`,
  },
  {
    method: "GET",
    path: "/v1/utility/receipts/{liability_receipt_id}",
    title: "Liability Shield receipt",
    keyType: "Identity Verification key",
    notes: ["status is ledger_recorded until the receipt carries an on-chain ACA anchor, then anchored_l2. Only your organization's receipts are visible."],
    response: `{
  "liability_receipt_id": uuid,
  "status": "ledger_recorded" | "anchored_l2",
  "payment_status": string,
  "timestamp": ISO-8601,
  "enterprise_tenant_id": uuid|null,
  "masked_guid": string,   // first 4 + *** + last 4
  "synapse_credits_charged": number(4dp),
  "blockchain_proof": { "network": "base_mainnet", "aca_hash": hex } | null
}`,
    errors: "400 invalid_receipt_id · 401 invalid_api_key · 404 receipt_not_found",
    curl: `curl -X GET "${BASE}/v1/utility/receipts/<receipt_id>" \\\n${H()}`,
  },
  {
    method: "POST",
    path: "/v1/vulture/ingest",
    title: "The Vulture — sanitized ingestion",
    keyType: "Mesh node key",
    notes: [
      "Runs the same sanitize → append-only ledger → billing pipeline as the mesh intake. Max 500 records, 5 MB.",
      "compliance_framework \"cjis_strict\" isolates the batch from analytics and the Marketplace.",
    ],
    request: `{
  "dataset_name": string (optional),
  "compliance_framework": "cjis_strict" | "standard",
  "payload": [ { "source_id": string, "timestamp": unix|ISO-8601, ...fields } ]
}`,
    response: `202 {
  "status": "accepted_for_sanitization",
  "batch_id": uuid,
  "records_committed": int,
  "sanitized_hash": hex,
  "cjis_isolated": boolean,
  "billing": { "rate_cr": number, "synapse_credits_deducted": number, "status": string },
  "verification_url": url,
  "trace_id": uuid
}`,
    errors: "401 invalid key · 402 insufficient_funds · 403 not provisioned · 413 too large · 422 quarantined · 503 gateway sealed",
    curl: `curl -X POST "${BASE}/v1/vulture/ingest" \\\n${H()} \\\n  -d '{"compliance_framework":"cjis_strict","payload":[{"source_id":"<id>","timestamp":"<iso>"}]}'`,
  },
  {
    method: "GET",
    path: "/v1/vulture/verify/{batch_id}",
    title: "Merkle anchor verification (offline-auditable)",
    keyType: "Mesh node or organization key",
    notes: [
      "Proof is leaf-specific: one batch_id = one leaf. Rebuild the root from leaf_hash and sibling_hashes using the tree_rules, then compare to the Base transaction calldata.",
      "Before the hourly anchor run, status is staged_for_notarization and cryptographic_proof is null.",
    ],
    response: `{
  "batch_id": uuid,
  "status": "staged_for_notarization" | "anchoring_in_progress" | "sanitized_and_anchored",
  "sanitization_report": { "records_processed": int, "sanitized_hash": hex },
  "cryptographic_proof": {
    "hash_algorithm": "sha256",
    "tree_rules": string,
    "merkle_root": hex, "leaf_index": int, "leaf_count": int, "leaf_hash": hex,
    "sibling_hashes": [ { "position": "left" | "right", "hash": hex } ],
    "l2_anchor": { "network": "base_mainnet", "transaction_hash": hex, "block_number": int|null, "anchored_at": ISO-8601, "explorer_url": url } | null
  } | null
}`,
    errors: "400 invalid_batch_id · 401 invalid_api_key · 404 batch_not_found",
    curl: `curl -X GET "${BASE}/v1/vulture/verify/<batch_id>" \\\n${H()}`,
  },
  {
    method: "POST",
    path: "/v1/webhooks",
    title: "Register a webhook",
    keyType: "Any IDIA key",
    notes: [
      "Events: receipt.anchored_l2, wallet.credit_depleted (needs credit_threshold), telemetry.spatial_event (Vulture batch anchored).",
      "https only, max 10 active per account. signing_secret is shown once.",
      "Deliveries: anchored events are sent hourly after the Base anchor run; low-credit alerts right after the charge (once per day). Failed sends retry 5 times over ~24 h.",
    ],
    request: `{ "url": "https://…", "events": string[], "credit_threshold": number (optional) }`,
    response: `201 { "status": "success", "webhook": { "id", "url", "events", "credit_threshold", "status", "created_at" }, "signing_secret": "whsec_…" }`,
    errors: "400 invalid_request · 401 invalid_api_key",
    curl: `curl -X POST "${BASE}/v1/webhooks" \\\n${H()} \\\n  -d '{"url":"https://example.com/idia","events":["receipt.anchored_l2"]}'`,
  },
  {
    method: "GET",
    path: "/v1/webhooks",
    title: "List webhooks · DELETE /v1/webhooks/{id} · POST /v1/webhooks/test",
    keyType: "Any IDIA key",
    notes: ["DELETE disables a webhook. POST /v1/webhooks/test sends a signed webhook.test event to all (or { webhook_id }) and reports the response status."],
    response: `{ "status": "success", "webhooks": [ { "id", "url", "events", "credit_threshold", "status", "created_at" } ] }`,
    errors: "401 invalid_api_key · 404 webhook_not_found",
    curl: `curl -X GET "${BASE}/v1/webhooks" \\\n${H()}`,
  },
];

const PLATFORM_NOTES: { title: string; body: string; code?: string }[] = [
  {
    title: "Sandbox",
    body: "Send X-IDIA-Environment: sandbox on validate or ingest. Requests are validated exactly like production, but nothing is billed, stored or anchored (sandbox_mode: true, synapse_credits_deducted: 0). Sandbox validate does not query the Identity Vault, so every target returns denied.",
    code: `curl -X POST "${BASE}/v1/utility/validate" \\\n${H(` \\\n  -H "Idempotency-Key: $(uuidgen)" \\\n  -H "X-IDIA-Environment: sandbox"`)} \\\n  -d '{"target_type":"hashed_email","hash_algorithm":"sha256","targets":["<sha256-hex>"]}'`,
  },
  {
    title: "Rate limits",
    body: "120 requests per minute per key (fixed 60-second window). Every response carries X-RateLimit-Limit, X-RateLimit-Remaining and X-RateLimit-Reset (unix seconds). Over the limit: 429 rate_limit_exceeded with Retry-After and details.retry_after / reset_at.",
  },
  {
    title: "Webhook signatures",
    body: "Each delivery has X-IDIA-Signature: t=<unix>,v1=<hex>, an HMAC-SHA256 of `${t}.${rawBody}` with your signing secret. Reject mismatches or anything older than 5 minutes; dedupe on event id.",
    code: `import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyIdiaSignature(rawBody: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(\`\${parts.t}.\${rawBody}\`).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 ?? ""));
}`,
  },
  {
    title: "Verify Vulture proofs offline",
    body: "SHA-256 (not Keccak). leaf = sha256(0x00 || sanitized_hash); node = sha256(0x01 || left || right); odd nodes pair with themselves. Fold sibling_hashes from the leaf up, compare to merkle_root, then confirm the root in the Base transaction input on BaseScan.",
  },
  {
    title: "Errors",
    body: "Every error is { error: { code, message, details?, resolution_url?, trace_id } }. Quote the trace_id to support. Retry 500s with the same Idempotency-Key.",
  },
];

const copy = (text: string, label: string) => {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied`),
    () => toast.error(`Could not copy ${label}`),
  );
};

const Block = ({ label, code }: { label: string; code: string }) => (
  <div className="space-y-1 min-w-0">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Copy ${label}`} onClick={() => copy(code, label)}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
    <pre className="bg-background border border-border rounded-md p-2 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
      <code>{code}</code>
    </pre>
  </div>
);

export const ProtocolApiReference = () => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" /> IDIA Protocol API v1
        </CardTitle>
        <CardDescription className="space-y-1">
          <span className="block">Live endpoints for Identity Verification, The Vulture, billing and webhooks. Amounts use 4 decimal places.</span>
          <span className="flex flex-wrap gap-3 text-xs">
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">Developer docs</a>
            <a href={OPENAPI_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">openapi.json</a>
          </span>
          <span className="flex items-center gap-1 min-w-0">
            <code className="text-[11px] truncate">{BASE}</code>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Copy base URL" onClick={() => copy(BASE, "Base URL")}>
              <Copy className="h-3 w-3" />
            </Button>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {ROUTES.map((r) => {
          const id = `${r.method} ${r.path}`;
          return (
            <Collapsible key={id} open={open === id} onOpenChange={(o) => setOpen(o ? id : null)}>
              <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-muted/50">
                <Badge variant={r.method === "POST" ? "default" : "secondary"} className="shrink-0 text-[10px]">{r.method}</Badge>
                <span className="min-w-0 flex-1">
                  <code className="block text-xs truncate">{r.path}</code>
                  <span className="block text-[11px] text-muted-foreground truncate">{r.title}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === id ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 px-1 pt-3">
                <p className="text-xs text-muted-foreground">Key: {r.keyType}</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                  {r.notes.map((n) => <li key={n}>{n}</li>)}
                </ul>
                {r.request && <Block label="Request body" code={r.request} />}
                <Block label="Response" code={r.response} />
                <Block label="Errors" code={r.errors} />
                <Block label="cURL" code={r.curl} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        <div className="pt-2 space-y-2">
          {PLATFORM_NOTES.map((n) => (
            <Collapsible key={n.title} open={open === n.title} onOpenChange={(o) => setOpen(o ? n.title : null)}>
              <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-left hover:bg-muted/50">
                <span className="min-w-0 flex-1 text-xs font-medium">{n.title}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === n.title ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 px-1 pt-2">
                <p className="text-xs text-muted-foreground">{n.body}</p>
                {n.code && <Block label="Example" code={n.code} />}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
