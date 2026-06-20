// ============================================================================
// mcp_edge_handshake_validator.ts
// Stateless HMAC-anchored Ed25519 handshake validator. Eliminates the
// isolate-memory replay-state pattern: every challenge envelope carries its
// own server-issued MAC, so any isolate can verify any client signature
// without cross-isolate coordination.
// ============================================================================

export interface ChallengeEnvelope {
  nonce: string;
  expiresAt: number;
  argsHash: string;
  serverMac: string; // Cryptographic integrity proof of server generation
}

export interface CredentialMeta {
  signature: string; // Base64 Ed25519 signature
  challenge: ChallengeEnvelope;
  publicKeyRaw: string; // Hex-encoded raw Ed25519 public key
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a stateless challenge token using a secure internal HMAC secret.
 */
export async function generateStatelessChallenge(
  argsHash: string,
  serverSecret: string,
): Promise<ChallengeEnvelope> {
  console.log("[generateStatelessChallenge] START generating challenge token.");
  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + 10000;

  console.log(
    `[generateStatelessChallenge] EXEC: Initializing HMAC components. Nonce: ${nonce}, Expires: ${expiresAt}`,
  );
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(serverSecret);
  const messageData = encoder.encode(`${nonce}:${expiresAt}:${argsHash}`);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretKeyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    console.log(
      "[generateStatelessChallenge] EXEC: Key material imported into cryptographic subsystem context.",
    );
    const macBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const serverMac = toHex(macBuffer);
    console.log(`[generateStatelessChallenge] EXEC: Server MAC successfully derived: ${serverMac}`);
    console.log("[generateStatelessChallenge] END challenge token generated successfully.");
    return { nonce, expiresAt, argsHash, serverMac };
  } catch (err: any) {
    console.log(
      `[generateStatelessChallenge] CRITICAL ERROR inside server sign pipeline: ${err?.message}`,
    );
    console.log("[generateStatelessChallenge] END challenge token generation collapsed on fatal error.");
    throw err;
  }
}

/**
 * Validates the asymmetric signature challenge completely statelessly at the edge.
 */
export async function verifySignatureChallenge(
  args: Record<string, unknown>,
  meta: Record<string, unknown> | undefined,
  serverSecret: string,
): Promise<{ valid: boolean; error?: string }> {
  console.log("[verifySignatureChallenge] START cryptographic execution intent validation sequence.");

  if (!meta || !meta["org.paymentauth/credential"]) {
    console.log(
      "[verifySignatureChallenge] REJECTED: Mandatory org.paymentauth/credential properties omitted.",
    );
    console.log("[verifySignatureChallenge] END intent verification sequence aborted.");
    return { valid: false, error: "Cryptographic signature credential omitted from request metadata." };
  }

  const credential = meta["org.paymentauth/credential"] as CredentialMeta;
  const { signature, challenge, publicKeyRaw } = credential;
  const encoder = new TextEncoder();

  // 1. Validation Window
  console.log("[verifySignatureChallenge] START validation window assessment.");
  const now = Date.now();
  const timeDifference = now - challenge.expiresAt;
  console.log(
    `[verifySignatureChallenge] Context metrics - Clock: ${now}, Token Expiry: ${challenge.expiresAt}, Delta: ${timeDifference}ms`,
  );
  if (timeDifference > 0) {
    console.log(
      "[verifySignatureChallenge] REJECTED: Token age exceeded validation threshold window contract rules.",
    );
    console.log("[verifySignatureChallenge] END intent verification sequence aborted.");
    return { valid: false, error: "Validation window expired. Challenge is invalid." };
  }
  console.log("[verifySignatureChallenge] END validation window verified clean.");

  // 2. Server HMAC authenticity
  console.log("[verifySignatureChallenge] START server-origin message authenticity check.");
  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(serverSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const checkMacBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(`${challenge.nonce}:${challenge.expiresAt}:${challenge.argsHash}`),
    );
    const calculatedMacHex = toHex(checkMacBuffer);
    if (calculatedMacHex !== challenge.serverMac) {
      console.log(
        "[verifySignatureChallenge] REJECTED: Server MAC verification failure. Token tampered or forged externally.",
      );
      console.log("[verifySignatureChallenge] END intent verification sequence aborted.");
      return { valid: false, error: "Security exception: Invalid challenge envelope context." };
    }
    console.log("[verifySignatureChallenge] END server authenticity validated successfully.");
  } catch (macErr: any) {
    console.log(
      `[verifySignatureChallenge] ERROR stalling inside HMAC validation loop: ${macErr?.message}`,
    );
    console.log("[verifySignatureChallenge] END intent verification sequence aborted.");
    return { valid: false, error: "Internal processing breakdown during context verification." };
  }

  // 3. Argument hash equivalence
  console.log("[verifySignatureChallenge] START tracking parameter signature hash equivalence.");
  const argsBuffer = encoder.encode(JSON.stringify(args));
  const hashBuffer = await crypto.subtle.digest("SHA-256", argsBuffer);
  const calculatedHashHex = toHex(hashBuffer);
  if (calculatedHashHex !== challenge.argsHash) {
    console.log(
      `[verifySignatureChallenge] REJECTED: Argument block modified post-sign. Expected ${challenge.argsHash}, got ${calculatedHashHex}`,
    );
    console.log("[verifySignatureChallenge] END intent verification sequence aborted.");
    return { valid: false, error: "Parameter mismatch. Transmitted arguments do not match signature hash." };
  }
  console.log("[verifySignatureChallenge] END parameter hash equivalence verified.");

  // 4. Ed25519 asymmetric verification
  console.log("[verifySignatureChallenge] START importing edge key buffers.");
  try {
    const pubKeyBytes = new Uint8Array(
      publicKeyRaw.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
    const signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const verifiedMessageBytes = encoder.encode(
      `${challenge.nonce}:${challenge.expiresAt}:${challenge.argsHash}`,
    );

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      pubKeyBytes,
      { name: "Ed25519", namedCurve: "Ed25519" } as any,
      false,
      ["verify"],
    );
    const isVerified = await crypto.subtle.verify(
      { name: "Ed25519" } as any,
      cryptoKey,
      signatureBytes,
      verifiedMessageBytes,
    );
    if (!isVerified) {
      console.log(
        "[verifySignatureChallenge] REJECTED: Ed25519 payload signature checking failed verification.",
      );
      console.log("[verifySignatureChallenge] END intent verification sequence aborted.");
      return { valid: false, error: "Signature verification failed. Invalid signing key." };
    }
    console.log("[verifySignatureChallenge] SUCCESS: Handshake verified statelessly on edge perimeter.");
    console.log(
      "[verifySignatureChallenge] END cryptographic execution intent validation sequence finalized.",
    );
    return { valid: true };
  } catch (err: any) {
    console.log(
      `[verifySignatureChallenge] CRITICAL ERROR inside signature verification system parsing thread: ${err?.message}`,
    );
    console.log("[verifySignatureChallenge] END intent verification sequence aborted.");
    return { valid: false, error: `Cryptographic processing exception: ${err?.message}` };
  }
}

/** Helper: SHA-256 hex digest of arbitrary JSON-serializable args. */
export async function hashArgs(args: Record<string, unknown>): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(args)));
  return toHex(buf);
}