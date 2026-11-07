// Opaque, deterministic keyset cursors for receipt history paging.
// Order is (created_at DESC, id DESC); a cursor encodes the boundary row so pages never shift
// when new receipts are written while a client is paging.

export const RECEIPT_PAGE_DEFAULT = 50;
export const RECEIPT_PAGE_MAX = 100;

export type Cursor = { c: string; i: string };

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));

export function encodeCursor(createdAt: string, id: string) {
  return b64url(JSON.stringify({ c: createdAt, i: id }));
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const v = JSON.parse(unb64url(raw));
    if (typeof v?.c !== "string" || Number.isNaN(Date.parse(v.c))) return null;
    if (typeof v?.i !== "string" || !/^[0-9a-f-]{36}$/i.test(v.i)) return null;
    return { c: v.c, i: v.i };
  } catch {
    return null;
  }
}

export function parseLimit(raw: string | null): number | null {
  if (raw === null || raw === "") return RECEIPT_PAGE_DEFAULT;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= RECEIPT_PAGE_MAX ? n : null;
}

/** PostgREST `or` filter selecting rows strictly older (dir=older) or newer than the cursor row. */
export function keysetFilter(cur: Cursor, dir: "older" | "newer") {
  const op = dir === "older" ? "lt" : "gt";
  return `created_at.${op}."${cur.c}",and(created_at.eq."${cur.c}",id.${op}.${cur.i})`;
}
