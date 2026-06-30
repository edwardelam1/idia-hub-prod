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
const fsp = require("fs/promises");
const path = require("path");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const readline = require("readline");

const API_KEY = process.env.IDIA_API_KEY;
const HUB_ENDPOINT = process.env.IDIA_HUB_URL;
const MANIFEST_URL = process.env.IDIA_MANIFEST_URL;
const LOG_FILE = process.env.IDIA_BRIDGE_LOG || "idia_mcp_bridge_trace.log";
const SIGNING_PRIVATE_KEY_HEX = process.env.IDIA_SIGNING_PRIVATE_KEY || "";
const SIGNING_PUBLIC_KEY_HEX = process.env.IDIA_SIGNING_PUBLIC_KEY || "";
const VAULT_ROOT = process.env.IDIA_VAULT_ROOT ? path.resolve(process.env.IDIA_VAULT_ROOT) : "";
const LOCAL_RPC_PORT = parseInt(process.env.IDIA_BRIDGE_LOCAL_PORT || "47615", 10);
const LOCAL_RPC_ORIGINS = (process.env.IDIA_BRIDGE_ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());

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
logTrace(`[idia-mcp-bridge] VAULT_ROOT=${VAULT_ROOT || "<unset>"} LOCAL_RPC_PORT=${LOCAL_RPC_PORT}`);

const enabledToolsMap = new Map();
const PREMIUM_TOOLS = new Set([
  "synapse.controller.execute",
  "settlement.circular.post",
  "billing.withdraw.crypto",
]);
const LOCAL_VAULT_TOOLS = new Set([
  "vault.note.read",
  "vault.search",
  "vault.note.append",
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

// ===========================================================================
// Sovereign Vault — local filesystem operations. Every call is chokepoint-
// validated through resolveInsideVault() so paths cannot escape VAULT_ROOT.
// Every operation emits [START]/[END]/[ERROR] trace lines.
// ===========================================================================

function resolveInsideVault(filePath) {
  logTrace(`[START] vault.resolveInsideVault input=${filePath}`);
  try {
    if (!VAULT_ROOT) throw new Error("IDIA_VAULT_ROOT is not set");
    if (typeof filePath !== "string" || filePath.length === 0) throw new Error("filePath required");
    if (path.isAbsolute(filePath)) throw new Error("filePath must be vault-relative");
    const abs = path.resolve(VAULT_ROOT, filePath);
    const rel = path.relative(VAULT_ROOT, abs);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("path escapes vault root");
    logTrace(`[END] vault.resolveInsideVault abs=${abs}`);
    return abs;
  } catch (err) {
    logTrace(`[ERROR] vault.resolveInsideVault Silent stall prevented. Details: ${err.message}`);
    throw err;
  }
}

async function vaultReadNote(args) {
  const targetPath = resolveInsideVault(args.filePath);
  logTrace(`[START] idia-mcp-bridge: Attempting fs.readFile for path: ${targetPath}`);
  try {
    const content = await fsp.readFile(targetPath, "utf8");
    logTrace(`[END] idia-mcp-bridge: fs.readFile successful for path: ${targetPath} bytes=${content.length}`);
    return { filePath: args.filePath, content };
  } catch (err) {
    logTrace(`[ERROR] idia-mcp-bridge: fs.readFile failed. Silent stall prevented. Details: ${err.message}`);
    throw err;
  }
}

async function walkVault(dir, acc) {
  logTrace(`[START] idia-mcp-bridge: walkVault dir=${dir}`);
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        await walkVault(full, acc);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".md" || ext === ".txt" || ext === ".markdown") acc.push(full);
      }
    }
    logTrace(`[END] idia-mcp-bridge: walkVault dir=${dir} totalSoFar=${acc.length}`);
  } catch (err) {
    logTrace(`[ERROR] idia-mcp-bridge: walkVault failed. Silent stall prevented. Details: ${err.message}`);
    throw err;
  }
}

async function vaultSearch(args) {
  logTrace(`[START] idia-mcp-bridge: vaultSearch query=${JSON.stringify(args.query)} limit=${args.limit}`);
  try {
    if (!VAULT_ROOT) throw new Error("IDIA_VAULT_ROOT is not set");
    const files = [];
    await walkVault(VAULT_ROOT, files);
    const limit = Math.max(1, Math.min(args.limit || 50, 500));
    const query = String(args.query || "");
    let matcher;
    const regexMatch = query.match(/^\/(.+)\/([gimsu]*)$/);
    if (regexMatch) {
      try {
        matcher = new RegExp(regexMatch[1], regexMatch[2].includes("i") ? regexMatch[2] : regexMatch[2]);
      } catch (_) {
        matcher = null;
      }
    }
    const hits = [];
    // Empty query → return the file index only.
    if (!query) {
      for (const f of files.slice(0, limit)) {
        hits.push({ filePath: path.relative(VAULT_ROOT, f), line: 0, snippet: "" });
      }
      logTrace(`[END] idia-mcp-bridge: vaultSearch index-only count=${hits.length}`);
      return { hits };
    }
    for (const f of files) {
      if (hits.length >= limit) break;
      try {
        const text = await fsp.readFile(f, "utf8");
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          const hit = matcher ? matcher.test(ln) : ln.toLowerCase().includes(query.toLowerCase());
          if (hit) {
            hits.push({ filePath: path.relative(VAULT_ROOT, f), line: i + 1, snippet: ln.slice(0, 240) });
            if (hits.length >= limit) break;
          }
        }
      } catch (perFileErr) {
        logTrace(`[ERROR] idia-mcp-bridge: vaultSearch read-skip ${f} ${perFileErr.message}`);
      }
    }
    logTrace(`[END] idia-mcp-bridge: vaultSearch count=${hits.length}`);
    return { hits };
  } catch (err) {
    logTrace(`[ERROR] idia-mcp-bridge: vaultSearch failed. Silent stall prevented. Details: ${err.message}`);
    throw err;
  }
}

async function vaultAppendNote(args) {
  const targetPath = resolveInsideVault(args.filePath);
  logTrace(`[START] idia-mcp-bridge: Attempting fs.appendFile for path: ${targetPath}`);
  try {
    // Require existing file — append never creates a new note.
    await fsp.access(targetPath, fs.constants.F_OK);
    await fsp.appendFile(targetPath, "\n" + String(args.content || ""));
    logTrace(`[END] idia-mcp-bridge: fs.appendFile successful for path: ${targetPath}`);
    return { filePath: args.filePath, appended: true };
  } catch (err) {
    logTrace(`[ERROR] idia-mcp-bridge: fs.appendFile failed. Silent stall prevented. Details: ${err.message}`);
    throw err;
  }
}

async function dispatchVaultTool(toolName, args) {
  logTrace(`[START] idia-mcp-bridge: dispatchVaultTool ${toolName}`);
  try {
    let result;
    switch (toolName) {
      case "vault.note.read":
        result = await vaultReadNote(args || {});
        break;
      case "vault.search":
        result = await vaultSearch(args || {});
        break;
      case "vault.note.append":
        result = await vaultAppendNote(args || {});
        break;
      default:
        throw new Error(`unknown vault tool: ${toolName}`);
    }
    logTrace(`[END] idia-mcp-bridge: dispatchVaultTool ${toolName} OK`);
    return result;
  } catch (err) {
    logTrace(`[ERROR] idia-mcp-bridge: dispatchVaultTool ${toolName} ${err.message}`);
    throw err;
  }
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
  if (LOCAL_VAULT_TOOLS.has(toolName)) {
    try {
      const result = await dispatchVaultTool(toolName, args);
      sendJsonRpcResponse(id, {
        content: [{ type: "text", text: JSON.stringify(result) }],
      });
    } catch (err) {
      sendJsonRpcResponse(id, null, { code: -32010, message: `Vault op failed: ${err.message}` });
    }
    logTrace(`[executeLiveEdgeRelay] END id=${id} local-vault`);
    return;
  }
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

// ===========================================================================
// Local HTTP RPC server — browsers (e.g. the Sovereign Vault UI) post
// JSON-RPC envelopes here for tools tagged `local: true`. The cloud relay
// rejects those tools with -32004; this transport is the ONLY execution
// path for vault.* operations. CORS is configurable but defaults to "*"
// because the listener is bound to 127.0.0.1.
// ===========================================================================
function applyCors(req, res) {
  const origin = req.headers.origin || "*";
  const allow =
    LOCAL_RPC_ORIGINS.includes("*") || LOCAL_RPC_ORIGINS.includes(origin) ? origin : "null";
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Idia-Trace");
}

function startLocalRpcServer() {
  logTrace(`[START] startLocalRpcServer port=${LOCAL_RPC_PORT}`);
  try {
    const server = http.createServer((req, res) => {
      applyCors(req, res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method !== "POST" || (req.url !== "/rpc" && req.url !== "/")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        logTrace(`[localRpc] START handle bytes=${body.length}`);
        let rpc;
        try {
          rpc = JSON.parse(body);
        } catch (err) {
          logTrace(`[localRpc] ERROR parse ${err.message}`);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } }));
          return;
        }
        const id = rpc.id ?? null;
        const method = rpc.method;
        const params = rpc.params || {};
        try {
          if (method === "tools/list") {
            const tools = Array.from(enabledToolsMap.values())
              .filter((t) => LOCAL_VAULT_TOOLS.has(t.name))
              .map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", id, result: { tools } }));
            logTrace(`[localRpc] END tools/list count=${tools.length}`);
            return;
          }
          if (method !== "tools/call") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unsupported method: ${method}` } }),
            );
            return;
          }
          const toolName = params.name;
          if (!LOCAL_VAULT_TOOLS.has(toolName)) {
            logTrace(`[localRpc] REJECT non-local tool over local transport: ${toolName}`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id,
                error: { code: -32004, message: "Tool not eligible for local execution" },
              }),
            );
            return;
          }
          const result = await dispatchVaultTool(toolName, params.arguments || {});
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              result: { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result },
            }),
          );
          logTrace(`[localRpc] END tools/call ${toolName} OK`);
        } catch (err) {
          logTrace(`[localRpc] ERROR ${err.message}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32010, message: err.message } }),
          );
        }
      });
    });
    server.listen(LOCAL_RPC_PORT, "127.0.0.1", () => {
      logTrace(`[END] startLocalRpcServer listening http://127.0.0.1:${LOCAL_RPC_PORT}/rpc`);
    });
    server.on("error", (err) => {
      logTrace(`[ERROR] startLocalRpcServer ${err.message}`);
    });
  } catch (err) {
    logTrace(`[ERROR] startLocalRpcServer init failed: ${err.message}`);
  }
}

async function main() {
  logTrace("[main] START");
  await fetchManifestAndSync();
  startLocalRpcServer();
  const reader = readline.createInterface({ input: process.stdin, terminal: false });
  reader.on("line", handleIncomingMessageFrame);
  process.on("SIGINT", () => {
    logTrace("[main] SIGINT shutdown");
    process.exit(0);
  });
  logTrace("[idia-mcp-bridge] END init — pipe active");
}

main();