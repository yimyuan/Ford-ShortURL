import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('custom-name input belongs to the confirmation dialog, with duplicate errors and busy protection', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const { default: Hero } = await server.ssrLoadModule(
      '/src/features/home/components/HomeHero.jsx',
    );
    const { default: Dialog } = await server.ssrLoadModule(
      '/src/features/links/components/CreateLinkDialog.jsx',
    );
    const model = {
      url: 'https://example.com/long',
      customCode: 'summer-sale',
      nameDialog: { current: null },
      urlInput: { current: null },
      creating: false,
      confirmCreate() {},
      closeNameDialog() {},
      shorten() {},
      setCustomCode() {},
      setNameError() {},
      setError() {},
      setUrl() {},
      setResult() {},
    };
    const hero = renderToStaticMarkup(createElement(Hero, { model }));
    assert.ok(!hero.includes('id="custom-code"'));
    const render = (changes) =>
      renderToStaticMarkup(createElement(Dialog, { model: { ...model, ...changes } }));
    const html = render({});
    assert.match(html, /<dialog/);
    assert.match(html, /id="custom-code"/);
    assert.match(html, /summer-sale/);
    assert.match(html, /ยืนยันสร้างลิงก์/);
    assert.match(html, /ใช้ชื่อสุ่ม/);
    assert.match(html, /เปลี่ยนชื่อลิงก์ไม่ได้/);
    assert.match(render({ error: 'ชื่อนี้ถูกใช้แล้ว' }), /role="alert"[^>]*>ชื่อนี้ถูกใช้แล้ว/);
    const busy = render({ creating: true });
    assert.match(busy, /type="submit"[^>]*disabled=""/);
    assert.match(busy, /กำลังสร้าง…/);
  } finally {
    await server.close();
  }
});
