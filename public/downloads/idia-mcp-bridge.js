#!/usr/bin/env node

/**
 * IDIA Protocol — Local MCP Bridge Script
 * --------------------------------------------------------------------------
 * Acts as a stdin/stdout JSON-RPC pipe between a local MCP client
 * (Claude Desktop, Ollama, IDE agent) and the IDIA Hub edge relay.
 *
 * Required env vars:
 *   IDIA_API_KEY        Hub-issued API key (idia_live_… / idia_test_…)
 *   IDIA_MANIFEST_URL   Full URL to your /mcp-manifest endpoint
 *   IDIA_HUB_URL        Full URL to your /mcp-edge-relay endpoint
 *
 * All trace logs are written to idia_mcp_bridge_trace.log to keep stdout
 * reserved for JSON-RPC frames.
 */

const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
const readline = require("readline");

const API_KEY = process.env.IDIA_API_KEY;
const HUB_ENDPOINT = process.env.IDIA_HUB_URL;
const MANIFEST_URL = process.env.IDIA_MANIFEST_URL;
const LOG_FILE = process.env.IDIA_BRIDGE_LOG || "idia_mcp_bridge_trace.log";
const SIGNING_PRIVATE_KEY_HEX = process.env.IDIA_SIGNING_PRIVATE_KEY || "";
const SIGNING_PUBLIC_KEY_HEX = process.env.IDIA_SIGNING_PUBLIC_KEY || "";

function logTrace(message) {
  const ts = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, `[${ts}] ${message}\n`);
  } catch (_) {
    /* never write to stdout */
  }
}

if (!API_KEY) {
  logTrace("[idia-mcp-bridge] FATAL missing IDIA_API_KEY");
  process.exit(1);
}
if (!HUB_ENDPOINT) {
  logTrace("[idia-mcp-bridge] FATAL missing IDIA_HUB_URL");
  process.exit(1);
}

logTrace("[idia-mcp-bridge] START initialization");

const enabledToolsMap = new Map();
const PREMIUM_TOOLS = new Set([
  "synapse.controller.execute",
  "settlement.circular.post",
  "billing.withdraw.crypto",
]);

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function newTraceparent() {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

function hashArgsHex(args) {
  return crypto.createHash("sha256").update(JSON.stringify(args)).digest("hex");
}

function signEd25519Hex(messageStr) {
  if (!SIGNING_PRIVATE_KEY_HEX || !SIGNING_PUBLIC_KEY_HEX) {
    throw new Error("Missing IDIA_SIGNING_PRIVATE_KEY / IDIA_SIGNING_PUBLIC_KEY env vars for premium tool");
  }
  // Build PKCS8 wrapper around raw 32-byte Ed25519 seed.
  const seed = Buffer.from(SIGNING_PRIVATE_KEY_HEX, "hex");
  if (seed.length !== 32) throw new Error("IDIA_SIGNING_PRIVATE_KEY must be 32-byte hex (Ed25519 seed)");
  const pkcs8Prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const pkcs8 = Buffer.concat([pkcs8Prefix, seed]);
  const keyObj = crypto.createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
  const sig = crypto.sign(null, Buffer.from(messageStr), keyObj);
  return sig.toString("base64");
}

function postJsonRpc(rpcPayload) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(rpcPayload);
    const url = new URL(HUB_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function buildPremiumMeta(toolName, args) {
  logTrace(`[bridge:premiumHandshake] START tool=${toolName}`);
  const challengeReq = {
    jsonrpc: "2.0",
    id: `challenge-${Date.now()}`,
    method: "tools/challenge",
    params: { name: toolName, arguments: args },
  };
  logTrace(`[bridge:premiumHandshake] EXEC requesting challenge`);
  const resp = await postJsonRpc(challengeReq);
  if (!resp || !resp.result || !resp.result.challenge) {
    throw new Error(`Challenge denied: ${JSON.stringify(resp?.error || resp)}`);
  }
  const challenge = resp.result.challenge;
  logTrace(`[bridge:premiumHandshake] EXEC signing nonce=${challenge.nonce}`);
  const message = `${challenge.nonce}:${challenge.expiresAt}:${challenge.argsHash}`;
  const signature = signEd25519Hex(message);
  logTrace(`[bridge:premiumHandshake] END signed`);
  return {
    "org.paymentauth/credential": {
      signature,
      challenge,
      publicKeyRaw: SIGNING_PUBLIC_KEY_HEX,
    },
  };
}

function httpsGetJson(url, headers) {
  return new Promise((resolve) => {
    https
      .get(url, { headers }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ ok: res.statusCode < 400, body: JSON.parse(data) });
          } catch (err) {
            logTrace(`[httpsGetJson] ERROR parse ${err.message}`);
            resolve({ ok: false, body: null });
          }
        });
      })
      .on("error", (err) => {
        logTrace(`[httpsGetJson] ERROR network ${err.message}`);
        resolve({ ok: false, body: null });
      });
  });
}

async function fetchManifestAndSync() {
  logTrace("[fetchManifestAndSync] START");
  if (!MANIFEST_URL) {
    logTrace("[fetchManifestAndSync] WARN no MANIFEST_URL — no tools advertised");
    logTrace("[fetchManifestAndSync] END (empty)");
    return;
  }
  const { ok, body } = await httpsGetJson(MANIFEST_URL, {
    Authorization: `Bearer ${API_KEY}`,
    "User-Agent": "IDIA-MCP-Bridge/1.0",
  });
  if (!ok || !body || !Array.isArray(body.tools)) {
    logTrace("[fetchManifestAndSync] WARN manifest unavailable; serving empty tool set");
    logTrace("[fetchManifestAndSync] END (failed)");
    return;
  }
  body.tools.forEach((t) => {
    if (t && t.name) {
      enabledToolsMap.set(t.name, t);
      logTrace(`[fetchManifestAndSync] EXEC cached tool=${t.name}`);
    }
  });
  logTrace(`[fetchManifestAndSync] END count=${enabledToolsMap.size}`);
}

function sendJsonRpcResponse(id, result, error = null) {
  logTrace(`[sendJsonRpcResponse] START id=${id ?? "notif"}`);
  const response = { jsonrpc: "2.0" };
  if (id !== null && id !== undefined) response.id = id;
  if (error) response.error = error;
  else response.result = result;
  const serialized = JSON.stringify(response);
  process.stdout.write(serialized + "\n");
  logTrace(`[sendJsonRpcResponse] END len=${serialized.length}`);
}

async function executeLiveEdgeRelay(id, toolName, args) {
  logTrace(`[executeLiveEdgeRelay] START tool=${toolName}`);
  let meta = { traceparent: newTraceparent() };
  if (PREMIUM_TOOLS.has(toolName)) {
    try {
      const premiumMeta = await buildPremiumMeta(toolName, args);
      meta = { ...meta, ...premiumMeta };
    } catch (err) {
      logTrace(`[executeLiveEdgeRelay] ERROR premium handshake ${err.message}`);
      sendJsonRpcResponse(id, null, { code: -32001, message: `Handshake failed: ${err.message}` });
      return;
    }
  }
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: toolName, arguments: args, _meta: meta },
  });
  const url = new URL(HUB_ENDPOINT);
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "Content-Length": Buffer.byteLength(payload),
    },
  };
  const req = https.request(options, (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      logTrace(`[executeLiveEdgeRelay] status=${res.statusCode}`);
      try {
        const parsed = JSON.parse(body);
        if (parsed.error) sendJsonRpcResponse(id, null, parsed.error);
        else sendJsonRpcResponse(id, parsed.result);
      } catch (e) {
        sendJsonRpcResponse(id, null, { code: -32603, message: "Bad gateway response" });
      }
      logTrace(`[executeLiveEdgeRelay] END id=${id}`);
    });
  });
  req.on("error", (err) => {
    logTrace(`[executeLiveEdgeRelay] ERROR ${err.message}`);
    sendJsonRpcResponse(id, null, { code: -32000, message: `Network failure: ${err.message}` });
  });
  req.write(payload);
  req.end();
}

function handleIncomingMessageFrame(line) {
  logTrace(`[handleIncomingMessageFrame] START line=${line.slice(0, 100)}`);
  if (!line.trim()) return;
  let request;
  try {
    request = JSON.parse(line);
  } catch (err) {
    logTrace(`[handleIncomingMessageFrame] ERROR parse ${err.message}`);
    sendJsonRpcResponse(null, null, { code: -32700, message: "Parse error" });
    return;
  }
  const { method, id, params } = request;
  switch (method) {
    case "initialize":
      sendJsonRpcResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "idia-mcp-bridge", version: "1.0.0" },
      });
      break;
    case "tools/list": {
      const tools = Array.from(enabledToolsMap.values()).map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      }));
      sendJsonRpcResponse(id, { tools });
      break;
    }
    case "tools/call": {
      const toolName = params?.name;
      const toolArguments = params?.arguments || {};
      if (!enabledToolsMap.has(toolName)) {
        sendJsonRpcResponse(id, null, { code: -32601, message: `Tool not in manifest: ${toolName}` });
      } else {
        executeLiveEdgeRelay(id, toolName, toolArguments);
      }
      break;
    }
    default:
      if (id !== undefined && id !== null) {
        sendJsonRpcResponse(id, null, { code: -32601, message: `Unsupported method: ${method}` });
      }
  }
  logTrace(`[handleIncomingMessageFrame] END method=${method}`);
}

async function main() {
  logTrace("[main] START");
  await fetchManifestAndSync();
  const reader = readline.createInterface({ input: process.stdin, terminal: false });
  reader.on("line", handleIncomingMessageFrame);
  process.on("SIGINT", () => {
    logTrace("[main] SIGINT shutdown");
    process.exit(0);
  });
  logTrace("[idia-mcp-bridge] END init — pipe active");
}

main();