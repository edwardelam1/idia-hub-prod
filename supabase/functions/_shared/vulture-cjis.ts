// Shared CJIS rules for The Vulture intake paths (mesh-telemetry-intake,
// vulture-sanitization-agent), key lifecycle (mesh-nodes) and notarization
// (vulture-notarization-relayer). Pure functions only, so they can be unit-tested.

/** Field names whose values are replaced by a salted SHA-256 before storage. */
export const PII_KEYS: ReadonlySet<string> = new Set([
  // Consumer identifiers
  "ssn", "social_security", "name", "first_name", "last_name", "full_name", "email", "email_address",
  "issuer_id", "source_id", "target_name_pseudonym", "target_biometric_hash", "license_plate", "phone", "phone_number",
  // CJIS / Project Aziz law-enforcement identifiers
  "officer_id", "badge_number", "ori_number", "ori", "case_id", "case_number", "incident_id", "incident_number",
  "vin", "drivers_license", "driver_license", "drivers_license_number", "dl_number",
  "dob", "date_of_birth", "subject_name",
]);

export const isPiiKey = (key: string) => PII_KEYS.has(key.toLowerCase());

/** CJIS key-rotation window for mesh node credentials. */
export const NODE_KEY_TTL_DAYS = 90;

export function nodeKeyExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + NODE_KEY_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isNodeKeyExpired(expiresAt: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return true;
  const t = new Date(expiresAt).getTime();
  return !Number.isFinite(t) || t <= now.getTime();
}

/** Legacy api_keys mesh credentials have no expires_at; apply the same window from creation. */
export function isLegacyKeyExpired(createdAt: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) return true;
  return isNodeKeyExpired(nodeKeyExpiry(new Date(createdAt)), now);
}

/** Uploaded objects under `<owner>/cjis/...` are CJIS-isolated. */
export function isCjisUploadPath(objectPath: string): boolean {
  return objectPath.split("/")[1]?.toLowerCase() === "cjis";
}

/** Reads the `aal` claim from an access token that has already been validated with auth.getUser. */
export function tokenAssuranceLevel(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const claims = JSON.parse(atob(b64));
    return typeof claims.aal === "string" ? claims.aal : null;
  } catch {
    return null;
  }
}

// ---------------- Merkle tree over sanitized hashes ----------------
// leaf  = SHA-256(0x00 || sanitized_hash bytes)
// node  = SHA-256(0x01 || left || right); an odd node at any level is paired with itself.
// Domain separation prevents a leaf from being reinterpreted as an internal node.

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) throw new Error(`Invalid hex: ${hex.slice(0, 16)}…`);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function sha(prefix: number, ...parts: Uint8Array[]): Promise<Uint8Array> {
  const len = 1 + parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(len);
  buf[0] = prefix;
  let o = 1;
  for (const p of parts) { buf.set(p, o); o += p.length; }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
}

export async function merkleRoot(sanitizedHashes: string[]): Promise<string> {
  if (sanitizedHashes.length === 0) throw new Error("Cannot build a Merkle root with no leaves.");
  let level = await Promise.all(sanitizedHashes.map((h) => sha(0x00, hexToBytes(h))));
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(await sha(0x01, level[i], level[i + 1] ?? level[i]));
    }
    level = next;
  }
  return bytesToHex(level[0]);
}

/** 4-byte magic ("IDVL") + 32-byte root, sent as calldata of a zero-value self-transaction. */
export const ANCHOR_MAGIC = "4944564c";
export function anchorCalldata(rootHex: string): `0x${string}` {
  const r = rootHex.replace(/^0x/, "");
  if (r.length !== 64) throw new Error("Merkle root must be 32 bytes.");
  return `0x${ANCHOR_MAGIC}${r}`;
}
