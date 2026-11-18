
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Nouveau corpus', exact: true }).click();
  await page.getByRole('button', { name: 'Fichiers locaux', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles([
    { name: 'audit.c', mimeType: 'text/plain', buffer: Buffer.from('void audit(char *text) { char buffer[16]; buffer[15]=0; }') },
    { name: 'request.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'filesystem.read_file', arguments: { path: 'logs.txt' } } })) },
    { name: 'wave.rgb', mimeType: 'application/octet-stream', buffer: Buffer.from(new Uint8Array(3 * 2 * 2 * 3 * 2).map((_, index) => index % 256)) },
  ]);
  await page.locator('.input-with-suffix input').fill('local_multimodal.nxs');
  await page.getByRole('button', { name: 'Compiler le corpus', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'local_multimodal.nxs', exact: true })).toBeVisible();
  assert((await page.getByRole('dialog').innerText()).includes('3 modalités'));
  await page.getByRole('button', { name: 'Séquences', exact: true }).click();
  await expect(page.locator('.decoded-segment')).toHaveCount(3);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of ['corpora', 'pipeline', 'training', 'models', 'protocols', 'docs', 'settings', 'overview']) {
    await page.goto('http://localhost:5173/#' + hash, { waitUntil: 'networkidle' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow on ' + hash);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: local code, JSON-RPC and RGB imports; 3 sequences decoded; all 8 pages fit mobile width; no runtime errors.');
} finally { await browser.close(); }
