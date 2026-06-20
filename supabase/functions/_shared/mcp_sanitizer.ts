// ============================================================================
// mcp_sanitizer.ts — protocol-neutral ingress scrubber for MCP arguments.
// Tags are intentionally non-chain-specific so corporate banking compliance
// nomenclature is preserved across all downstream logs.
// ============================================================================

export const SANITIZE_RULES: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "HexadecimalAssetIdentifier", pattern: /\b0x[a-fA-F0-9]{64}\b/g },
  { tag: "ProtocolAddressBody", pattern: /\b0x[a-fA-F0-9]{40}\b/g },
  { tag: "EmailIdentifierString", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { tag: "TelephonyContactString", pattern: /(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/g },
  { tag: "GovernmentTaxIdentifier", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
];

export interface SanitizeResult {
  cleaned: Record<string, unknown>;
  flags: Array<{ tag: string; count: number }>;
}

export function sanitizeArgs(args: Record<string, unknown>): SanitizeResult {
  const flags: Array<{ tag: string; count: number }> = [];
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      let out = v;
      for (const rule of SANITIZE_RULES) {
        const m = out.match(rule.pattern);
        if (m && m.length > 0) {
          flags.push({ tag: rule.tag, count: m.length });
          out = out.replace(rule.pattern, `<${rule.tag}>`);
        }
      }
      return out;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const next: Record<string, unknown> = {};
      for (const [k, vv] of Object.entries(v as Record<string, unknown>)) next[k] = walk(vv);
      return next;
    }
    return v;
  };
  const cleaned = walk(args) as Record<string, unknown>;
  return { cleaned, flags };
}