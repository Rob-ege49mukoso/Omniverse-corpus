import test from "node:test";
import assert from "node:assert/strict";
import * as nxs from "../src/lib/nxs.ts";

test("raw sequence round-trips all 256 byte values", () => {
  const payload = Uint8Array.from({ length: 256 }, (_, index) => index);
  const sequence = nxs.buildRawSequence("forge", payload);
  const framed = new Uint8Array(sequence.length + 4);
  new DataView(framed.buffer).setUint32(0, sequence.length, true);
  framed.set(sequence, 4);
  const parsed = nxs.parseNxs(framed);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].segments.length, 1);
  assert.deepEqual(parsed[0].segments[0].data, payload);
});
test("compileNxs emits the requested number of valid sequences", () => {
  for (let multiplier = 1; multiplier <= 25; multiplier += 1) {
    const bytes = nxs.compileNxs({ name: "test", multiplier, weights: nxs.DEFAULT_WEIGHTS, sequenceLength: 256 });
    const parsed = nxs.parseNxs(bytes);
    assert.equal(parsed.length, multiplier * 4);
    assert.equal(bytes.length, parsed.reduce((total, sequence) => total + sequence.bytes.length + 4, 0));
    for (const sequence of parsed) {
      assert.deepEqual([...sequence.bytes.slice(0, 2)], [255, 254]);
      assert.deepEqual([...sequence.bytes.slice(-2)], [255, 0]);
    }
  }
});
test("parseNxs rejects truncated and malformed frames", () => {
  const bytes = nxs.compileNxs({ name: "test", multiplier: 1, weights: nxs.DEFAULT_WEIGHTS, sequenceLength: 256 });
  assert.throws(() => nxs.parseNxs(bytes.slice(0, -1)));
  assert.throws(() => nxs.parseNxs(new Uint8Array([255, 0, 0, 0])));
  assert.throws(() => nxs.parseNxs(new Uint8Array()));
});
test("compileNxs handles short, zero and invalid weight arrays", () => {
  for (const weights of [[], [100], [0, 0, 0, 0, 0], [-5, 20, NaN]]) {
    const parsed = nxs.parseNxs(nxs.compileNxs({ name: "weights", multiplier: 2, weights, sequenceLength: 64 }));
    assert.equal(parsed.length, 8);
  }
});
test("file names map to the expected NXS modality", () => {
  assert.equal(nxs.inferModalityFromFilename("photo.webp", "image/webp"), "vision");
  assert.equal(nxs.inferModalityFromFilename("capture.mp4", "video/mp4"), "vision");
  assert.equal(nxs.inferModalityFromFilename("tools.json", "application/json"), "mcp");
  assert.equal(nxs.inferModalityFromFilename("model.bin"), "cyber");
  assert.equal(nxs.inferModalityFromFilename("script.py", "text/x-python"), "forge");
  assert.equal(nxs.inferModalityFromFilename("notes.md", "text/markdown"), "think");
});
