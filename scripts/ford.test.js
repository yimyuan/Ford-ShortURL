import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { supportedNode, lockMatches, ensureEnv, dependencyState, runProcess, projectRoot, menu, missingSettings } from './ford.js';
const packages = [{}, { dependencies: { react: '^19.2.0' } }, { dependencies: { express: '^5.1.0' } }];
const lock = { lockfileVersion: 3, packages: { '': packages[0], frontend: packages[1], backend: packages[2] } };
test('Node compatibility and stale lock detection', () => {
 assert.equal(supportedNode('v24.15.0'), true); assert.equal(supportedNode('v22.12.0'), false);
 assert.equal(lockMatches(lock, packages), true);
 assert.equal(lockMatches(lock, [{}, { dependencies: { react: '^20.0.0' } }, packages[2]]), false);
 assert.equal(lockMatches({ packages: {} }, packages), false);
});
test('env copy never overwrites existing credentials', async () => {
 const root = await mkdtemp(join(tmpdir(), 'ford-env-test-'));
 try {
  await mkdir(join(root, 'backend')); await writeFile(join(root, 'backend/.env.example'), 'REDIS_URL=\n');
  assert.equal(await ensureEnv(root), true);
  await writeFile(join(root, 'backend/.env'), 'REDIS_URL=keep-existing\n');
  assert.equal(await ensureEnv(root), false);
  assert.equal(await readFile(join(root, 'backend/.env'), 'utf8'), 'REDIS_URL=keep-existing\n');
 } finally { await rm(root, { recursive: true, force: true }); }
});
test('ready dependencies skip installation; npm validation failure is not ready', async () => {
 const root = await mkdtemp(join(tmpdir(), 'ford-deps-test-'));
 try {
  for (const [i, folder] of ['', 'frontend', 'backend'].entries()) {
   await mkdir(join(root, folder), { recursive: true }); await writeFile(join(root, folder, 'package.json'), JSON.stringify(packages[i]));
  }
  await mkdir(join(root, 'node_modules')); await writeFile(join(root, 'package-lock.json'), JSON.stringify(lock));
  assert.deepEqual(await dependencyState(root, async () => ({ code: 0 })), { ready: true, consistent: true });
  assert.equal((await dependencyState(root, async () => ({ code: 1 }))).ready, false);
  await writeFile(join(root, 'package-lock.json'), '{}');
  assert.deepEqual(await dependencyState(root, async () => { throw Error('Should not run npm ls'); }), { ready: false, consistent: false });
 } finally { await rm(root, { recursive: true, force: true }); }
});
test('child process failures and timeouts are returned correctly', async () => {
 assert.equal((await runProcess(process.execPath, ['-e', 'process.exit(7)'], { capture: true })).code, 7);
 assert.equal((await runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { capture: true, timeout: 150 })).code, 124);
});

test('CLI starts through a linked project path like npm link', async () => {
 const temp = await mkdtemp(join(tmpdir(), 'ford-link-test-'));
 const linked = join(temp, 'linked-project');
 try {
  await symlink(projectRoot, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const result = spawnSync(process.execPath, [join(linked, 'scripts/ford.js'), 'run'], { cwd: temp, input: '0\n', encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0); assert.match(result.stdout, /FORD CLI v1.0/);
 } finally { await rm(linked, { force: true, recursive: true }); await rm(temp, { force: true, recursive: true }); }
});

import { PassThrough } from 'node:stream';
import { selectMenu } from './menu.js';

function terminal() {
 const input = new PassThrough(), output = new PassThrough();
 input.isTTY = output.isTTY = true; input.isRaw = false;
 input.setRawMode = raw => { input.isRaw = raw; };
 let screen = ''; output.on('data', b => { screen += b; });
 return { input, output, screen: () => screen };
}
test('arrows select Backend then Enter and restore terminal', async () => {
 const tty = terminal(); const selected = selectMenu(tty.input, tty.output);
 assert.equal(tty.input.isRaw, true);
 tty.input.emit('keypress', '', { name: 'down' }); tty.input.emit('keypress', '', { name: 'return' });
 assert.equal(await selected, '2'); assert.equal(tty.input.isRaw, false);
 assert.equal(tty.input.listenerCount('keypress'), 0); assert.match(tty.screen(), /\x1b\[\?25h/);
 tty.input.destroy(); tty.output.destroy();
});
test('Up wraps to Exit and Ctrl+C cancels without leaving raw mode', async () => {
 const tty = terminal(); let selected = selectMenu(tty.input, tty.output);
 tty.input.emit('keypress', '', { name: 'up' }); tty.input.emit('keypress', '', { name: 'return' });
 assert.equal(await selected, '0');
 selected = selectMenu(tty.input, tty.output); tty.input.emit('keypress', '', { name: 'c', ctrl: true });
 assert.equal(await selected, 'cancel'); assert.equal(tty.input.isRaw, false);
 tty.input.destroy(); tty.output.destroy();
});

test('dependency failure exits without reopening the menu', async () => {
 let choices = 0;
 const code = await menu({ choose: async () => { choices++; return '1'; }, dependencies: async () => ({ ready: false }), execute: async () => { throw Error('Must not launch'); } });
 assert.equal(code, 1); assert.equal(choices, 1);
});
test('frontend or build command failure exits with its code', async () => {
 for (const choice of ['1', '3']) {
  let choices = 0;
  const code = await menu({ choose: async () => { choices++; return choice; }, dependencies: async () => ({ ready: true }), execute: async () => ({ code: 7 }) });
  assert.equal(code, 7); assert.equal(choices, 1);
 }
});


test('backend setup requires Supabase URL and secret instead of PostgreSQL URI', async () => {
 const root = await mkdtemp(join(tmpdir(), 'ford-supabase-test-'));
 const keys = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'REDIS_URL', 'JWT_SECRET', 'CSRF_SECRET'];
 const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
 try {
  for (const key of keys) delete process.env[key];
  await mkdir(join(root, 'backend'));
  await writeFile(join(root, 'backend/.env'), 'DATABASE_URL=obsolete\nREDIS_URL=redis://localhost\nJWT_SECRET=test\nCSRF_SECRET=test\n');
  assert.deepEqual(await missingSettings(root), ['SUPABASE_URL', 'SUPABASE_SECRET_KEY']);
  await writeFile(join(root, 'backend/.env'), 'SUPABASE_URL=https://example.supabase.co\nSUPABASE_SECRET_KEY=sb_secret_test\nREDIS_URL=redis://localhost\nJWT_SECRET=test\nCSRF_SECRET=test\n');
  assert.deepEqual(await missingSettings(root), []);
 } finally {
  for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
  await rm(root, { recursive: true, force: true });
 }
});
