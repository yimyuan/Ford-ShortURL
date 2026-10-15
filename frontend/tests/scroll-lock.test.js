import test from 'node:test';
import assert from 'node:assert/strict';
import { lockScroll } from '../src/shared/ui/scroll-lock.js';
test('nested dialogs keep background locked until the final dialog closes in either order', () => {
  for (const reverse of [false, true]) {
    const body = { style: { overflow: 'auto' } };
    const outer = lockScroll(body);
    const inner = lockScroll(body);
    assert.equal(body.style.overflow, 'hidden');
    (reverse ? outer : inner)();
    assert.equal(body.style.overflow, 'hidden');
    (reverse ? inner : outer)();
    assert.equal(body.style.overflow, 'auto');
    outer();
    inner();
    assert.equal(body.style.overflow, 'auto');
  }
});
