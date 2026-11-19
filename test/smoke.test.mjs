import test from "node:test";
import assert from "node:assert/strict";
import { createDemoCorpora, formatBytes, formatNumber } from "../src/lib/nxs.ts";
test("workspace demo data and formatters expose stable values", () => {
  const corpora = createDemoCorpora();
  assert.equal(corpora.length, 3);
  assert.ok(corpora.every((corpus) => corpus.demo === true));
  assert.equal(formatBytes(0), "0 o");
  assert.equal(formatNumber(1200), "1 200");
});
