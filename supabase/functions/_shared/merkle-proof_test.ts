import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { merkleProof, merkleRoot, verifyMerkleProof } from "./vulture-cjis.ts";

const leaves = ["aa", "bb", "cc", "dd", "ee"].map((c) => c.repeat(32));

Deno.test("every leaf proof recomputes the anchored Merkle root (odd tree)", async () => {
  const root = await merkleRoot(leaves);
  for (let i = 0; i < leaves.length; i++) {
    const p = await merkleProof(leaves, i);
    assertEquals(p.root, root);
    assertEquals(await verifyMerkleProof(p.leaf_hash, p.siblings), root);
  }
});

Deno.test("a single-leaf batch proves with no siblings", async () => {
  const p = await merkleProof([leaves[0]], 0);
  assertEquals(p.siblings.length, 0);
  assertEquals(p.root, await merkleRoot([leaves[0]]));
});

Deno.test("out-of-range leaf index is rejected", async () => {
  await assertRejects(() => merkleProof(leaves, 5));
});
