
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/lib/nxs.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const nxs = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const allBytes = Uint8Array.from({ length: 256 }, (_, index) => index);
for (const type of ['think', 'forge', 'cyber', 'mcp', 'vision', 'math']) {
  const sequence = nxs.buildRawSequence(type, allBytes);
  const parsed = nxs.parseNxs(nxs.compileNxs({ name: 'test', multiplier: 1, weights: type === 'math' ? nxs.DEFAULT_WEIGHTS : nxs.DEFAULT_WEIGHTS, sequenceLength: 256 }));
  assert(parsed.length > 0);
  const frame = new Uint8Array(sequence.length + 4);
  new DataView(frame.buffer).setUint32(0, sequence.length, true);
  frame.set(sequence, 4);
  const raw = nxs.parseNxs(frame);
  assert.equal(raw.length, 1);
  assert.deepEqual(raw[0].segments[1].data, allBytes);
}
for (let multiplier = 1; multiplier <= 100; multiplier++) {
  const data = nxs.compileNxs({ name: 'test', multiplier, weights: nxs.DEFAULT_WEIGHTS, sequenceLength: 256 });
  const parsed = nxs.parseNxs(data);
  assert.equal(parsed.length, multiplier * 4);
  assert.equal(data.length, parsed.reduce((sum, sequence) => sum + sequence.bytes.length + 4, 0));
  for (const sequence of parsed) {
    assert.equal(sequence.bytes[0], 255);
    assert.equal(sequence.bytes[1], 254);
    assert.equal(sequence.bytes.at(-2), 255);
    assert.equal(sequence.bytes.at(-1), 0);
  }
}
const truncated = nxs.compileNxs({ name: 'test', multiplier: 1, weights: nxs.DEFAULT_WEIGHTS, sequenceLength: 256 });
assert.throws(() => nxs.parseNxs(truncated.slice(0, -1)));
assert.throws(() => nxs.parseNxs(new Uint8Array([255, 0, 0, 0])));
fs.writeFileSync('/tmp/nexus-test.nxs', nxs.compileNxs({ name: 'test', multiplier: 1, weights: nxs.DEFAULT_WEIGHTS, sequenceLength: 256 }));
const pythonSource = fs.readFileSync('src/lib/python.ts', 'utf8');
const pythonModule = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(pythonSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText).toString('base64'));
fs.writeFileSync('/tmp/nexus-train.py', pythonModule.getPythonScript(nxs.DEFAULT_TRAINING));
console.log('NXS: 400 generated sequences validated; all 256 byte values escaped and decoded; malformed headers rejected.');

process.on("uncaughtException", error => { console.error("TEST FAILED:", error.message); process.exit(1); });
process.on("unhandledRejection", error => { console.error("TEST FAILED:", error instanceof Error ? error.message : error); process.exit(1); });
