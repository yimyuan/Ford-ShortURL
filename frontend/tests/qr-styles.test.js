import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultQrStyle,
  qrStyleError,
  qrStyleWarning,
  sameQrStyle,
} from '../src/features/links/qr-style.js';
import { getLinkQr, saveLinkQr } from '../src/features/links/api.js';

test('QR colors are unrestricted with non-blocking contrast warnings', () => {
  for (const shape of ['square', 'rounded', 'dots'])
    assert.equal(qrStyleError({ ...defaultQrStyle, shape }), '');
  assert.equal(sameQrStyle(defaultQrStyle, { ...defaultQrStyle, shape: 'dots' }), false);
  assert.equal(
    sameQrStyle(defaultQrStyle, {
      dark: defaultQrStyle.dark,
      light: defaultQrStyle.light,
      size: 512,
    }),
    true,
  );
  for (const style of [
    { ...defaultQrStyle, dark: '#ffffff', light: '#000000' },
    { ...defaultQrStyle, dark: '#aaaaaa' },
  ]) {
    assert.equal(qrStyleError(style), '');
    assert.ok(qrStyleWarning(style));
  }
  for (const style of [
    { ...defaultQrStyle, light: 'transparent' },
    { ...defaultQrStyle, size: 99999 },
    { ...defaultQrStyle, shape: 'logo' },
  ])
    assert.ok(qrStyleError(style));
});

test('QR previews/downloads encode the style safely; saving requires explicit confirmation and revision', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    calls.push({ path, options });
    return options.method === 'PATCH'
      ? new Response(JSON.stringify({ qrStyle: defaultQrStyle, qrVersion: '5' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      : new Response('png', { headers: { 'Content-Type': 'image/png' } });
  });
  const controller = new AbortController();
  assert.equal(
    await (
      await getLinkQr('id', {
        style: { ...defaultQrStyle, shape: 'dots' },
        format: 'png',
        signal: controller.signal,
      })
    ).text(),
    'png',
  );
  const url = new URL(calls[0].path, 'https://example.com');
  assert.equal(url.searchParams.get('dark'), '#111827');
  assert.equal(url.searchParams.get('format'), 'png');
  assert.equal(url.searchParams.get('size'), '512');
  assert.equal(url.searchParams.get('shape'), 'dots');
  assert.equal(url.hash, '');
  assert.equal(calls[0].options.signal.aborted, false);
  controller.abort();
  assert.equal(calls[0].options.signal.aborted, true);
  await saveLinkQr('id', defaultQrStyle, '4');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    style: defaultQrStyle,
    version: '4',
    confirmed: true,
  });
});
