import test from "node:test";
import assert from "node:assert/strict";
import * as nxs from "../src/lib/nxs.ts";
test("supported local file types are assigned to a modality", () => {
  const cases = [
    ["source.ts", "text/plain", "forge"],
    ["payload.json", "application/json", "mcp"],
    ["image.png", "image/png", "vision"],
    ["recording.mp4", "video/mp4", "vision"],
    ["memory.bin", "application/octet-stream", "cyber"],
    ["journal.txt", "text/plain", "think"],
  ];
  for (const [name, mime, expected] of cases) assert.equal(nxs.inferModalityFromFilename(name, mime), expected);
});
