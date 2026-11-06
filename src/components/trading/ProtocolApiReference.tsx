import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// Live IDIA Protocol API v1 (edge function `protocol-api`). Schemas show field types, not sample data.
const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/protocol-api`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

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
  `  -H "Authorization: Bearer ${ANON}" \\\n  -H "x-api-key: <YOUR_IDIA_KEY>" \\\n  -H "Content-Type: application/json"${extra}`;

const ROUTES: Route[] = [
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
          <span className="block">Live endpoints for Identity Verification and The Vulture. Amounts use 4 decimal places.</span>
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
      </CardContent>
    </Card>
  );
};
