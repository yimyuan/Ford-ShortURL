import test from 'node:test';
import assert from 'node:assert/strict';
import { completeLogin, getRoute, isAdmin, paths, navigate } from '../src/app/navigation.js';
test('hash navigation preserves the page session and replacement notifies the router', (t) => {
  const previous = globalThis.window;
  const calls = [];
  globalThis.window = {
    location: { pathname: '/Ford-ShortURL/', hash: '#/' },
    history: {
      replaceState(_state, _title, hash) {
        calls.push(hash);
      },
    },
    dispatchEvent(event) {
      calls.push(event.type);
    },
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
  navigate(paths.myLinks);
  assert.equal(window.location.hash, '#/my-links');
  navigate(paths.admin, { replace: true });
  assert.deepEqual(calls, ['#/admin', 'hashchange']);
});

test('admin login always redirects and never resumes a pending user link creation', async () => {
  const redirects = [];
  await completeLogin(
    { id: 'admin', role: 'admin' },
    () => assert.fail('Admin must not create a pending link'),
    (...args) => redirects.push(args),
  );
  assert.deepEqual(redirects, [[paths.admin, { replace: true }]]);
});

test('normal user login resumes its action once without an admin redirect', async () => {
  let resumed = 0;
  await completeLogin(
    { id: 'user', role: 'user' },
    async (user) => {
      assert.equal(user.id, 'user');
      resumed++;
    },
    () => assert.fail('User must stay on the public page'),
  );
  assert.equal(resumed, 1);
});

test('route aliases, trailing slashes and unknown paths follow the central policy', () => {
  assert.equal(getRoute('/'), 'home');
  assert.equal(getRoute('/user/'), 'home');
  assert.equal(getRoute('/admin/'), 'admin');
  assert.equal(getRoute('/my-links/'), 'my-links');
  assert.equal(paths.myLinks, '#/my-links');
  assert.equal(getRoute('#/my-links/'), 'my-links');
  assert.equal(getRoute('#/#how-it-works'), 'home');
  assert.equal(getRoute('/missing'), 'not-found');
  assert.equal(isAdmin({ role: 'user' }), false);
  assert.equal(isAdmin(null), false);
});
