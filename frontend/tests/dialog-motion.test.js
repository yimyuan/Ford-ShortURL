import test from 'node:test';
import assert from 'node:assert/strict';
import { createDialogMotion } from '../src/shared/ui/dialog-motion.js';
function fixture() {
  let finish;
  let reject;
  const finished = new Promise((resolve, fail) => {
    finish = resolve;
    reject = fail;
  });
  const counts = { close: 0, animate: 0, cancel: 0 };
  const node = {
    open: true,
    dataset: {},
    close() {
      counts.close++;
      this.open = false;
    },
    animate() {
      counts.animate++;
      return {
        finished,
        cancel() {
          counts.cancel++;
          reject(new Error('cancelled'));
        },
      };
    },
  };
  const options = {
    reducedMotion: () => false,
    readStyle: () => ({ opacity: '1', transform: 'none', getPropertyValue: () => '160ms' }),
  };
  return { node, counts, finish, options };
}
test('dialog close waits for motion, deduplicates repeated closes and closes exactly once', async () => {
  const f = fixture();
  const motion = createDialogMotion(f.node, f.options);
  const first = motion.close();
  const second = motion.close();
  assert.equal(first, second);
  assert.equal(f.counts.close, 0);
  assert.equal(f.counts.animate, 1);
  f.finish();
  await first;
  assert.equal(f.counts.close, 1);
  assert.equal(f.node.dataset.closing, undefined);
  await motion.close();
  assert.equal(f.counts.close, 1);
});
test('unmounting or reopening cancels pending dismissal without closing the reopened dialog', async () => {
  const f = fixture();
  const motion = createDialogMotion(f.node, f.options);
  const pending = motion.close();
  motion.cancel();
  await pending;
  assert.equal(f.node.open, true);
  assert.equal(f.counts.close, 0);
  assert.equal(f.node.dataset.closing, undefined);
});
test('reduced motion and browsers without animations close immediately', async () => {
  const f = fixture();
  const motion = createDialogMotion(f.node, { ...f.options, reducedMotion: () => true });
  await motion.close();
  assert.equal(f.counts.close, 1);
  assert.equal(f.counts.animate, 0);
  const fallback = fixture();
  delete fallback.node.animate;
  await createDialogMotion(fallback.node, fallback.options).close();
  assert.equal(fallback.counts.close, 1);
});
