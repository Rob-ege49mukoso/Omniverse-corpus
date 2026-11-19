import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TRAINING } from "../src/lib/nxs.ts";
import * as python from "../src/lib/python.ts";
test("Python export returns a PyTorch architecture scaffold", () => {
  assert.equal(typeof python.getPythonScript, "function");
  const script = python.getPythonScript(DEFAULT_TRAINING);
  assert.match(script, /class OmniCoreModel/);
  assert.match(script, /TransformerEncoder/);
  assert.match(script, /CONFIG/);
  assert.match(script, /does not train without a dataset/);
});
