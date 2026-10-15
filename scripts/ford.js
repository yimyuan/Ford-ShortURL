#!/usr/bin/env node
import { readFile, copyFile, access, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { selectMenu } from './menu.js';
import { setTerminalTitle, withTerminalTitle } from './terminal.js';
import { parseEnv } from 'node:util';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifests = ['', 'frontend', 'backend'];
const exists = async file => { try { await access(file); return true; } catch { return false; } };
const json = async file => JSON.parse(await readFile(file, 'utf8'));
export function supportedNode(version) { return Number(version.replace(/^v/, '').split('.')[0]) >= 24; }
export function lockMatches(lock, packages) {
 if (!lock?.packages || lock.lockfileVersion < 2) return false;
 return manifests.every((name, i) => ['dependencies', 'devDependencies', 'optionalDependencies'].every(key =>
  JSON.stringify(Object.entries(packages[i][key] || {}).sort()) === JSON.stringify(Object.entries(lock.packages[name]?.[key] || {}).sort())) && Boolean(lock.packages[name]));
}
export async function ensureEnv(root = projectRoot) {
 try { await copyFile(join(root, 'backend/.env.example'), join(root, 'backend/.env'), constants.COPYFILE_EXCL); return true; }
 catch (error) { if (error.code === 'EEXIST') return false; throw error; }
}
export async function missingSettings(root = projectRoot) {
 const local = parseEnv(await readFile(join(root, 'backend/.env'), 'utf8'));
 return ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'REDIS_URL', 'JWT_SECRET', 'CSRF_SECRET'].filter(key => !(process.env[key] || local[key] || '').trim());
}
function npmCommand(args) {
 const cli = process.env.npm_execpath?.endsWith('npm-cli.js') ? process.env.npm_execpath :
  process.platform === 'win32' ? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js') : null;
 return cli ? [process.execPath, [cli, ...args]] : ['npm', args];
}
export function runProcess(command, args, { cwd = projectRoot, capture = false, timeout = 0 } = {}) {
 return new Promise(resolveResult => {
  const child = spawn(command, args, { cwd, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', windowsHide: true, detached: process.platform !== 'win32' });
  let output = '', stopped = false, timer;
  if (capture) { child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; }); }
  const stop = () => {
   if (stopped || !child.pid) return; stopped = true;
   if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    killer.on('error', () => child.kill());
    const fallback = setTimeout(() => child.kill(), 500); fallback.unref();
   }
   else { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  };
  const interrupt = () => { stop(); process.exitCode = 130; };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  if (timeout) timer = setTimeout(stop, timeout);
  const finish = code => { clearTimeout(timer); process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt); resolveResult({ code: stopped ? (process.exitCode === 130 ? 130 : 124) : code, output }); };
  child.once('error', () => finish(127)); child.once('close', code => finish(code ?? 1));
 });
}
const npm = (args, options) => { const [command, argv] = npmCommand(args); return runProcess(command, argv, options); };
export async function dependencyState(root = projectRoot, execute = npm) {
 const packages = await Promise.all(manifests.map(name => json(join(root, name, 'package.json'))));
 let lock; try { lock = await json(join(root, 'package-lock.json')); } catch {}
 const consistent = lockMatches(lock, packages);
 if (!consistent || !await exists(join(root, 'node_modules'))) return { ready: false, consistent };
 const result = await execute(['ls', '--all', '--json'], { cwd: root, capture: true, timeout: 30000 });
 return { ready: result.code === 0, consistent };
}
function help() {
 console.log('\nford install: ตรวจ Node.js/npm, lock file, dependencies และ .env ก่อนติดตั้ง');
 console.log('ford run: 1 หน้าบ้าน | 2 หลังบ้าน | 3 Build | 4 วิธีใช้ | 0 ออก');
 console.log('หลังบ้านต้องผ่าน Supabase Data API (อ่าน users/links) และ Redis PING ภายใน 15 วินาที');
 console.log('ใส่ SUPABASE_URL และ SUPABASE_SECRET_KEY จาก Supabase และ REDIS_URL แบบ rediss:// จาก Upstash ใน backend/.env');
 console.log('ใช้ Redis connection URL (TCP/TLS) ไม่ใช่ REST URL/REST Token');
 console.log('Ctrl+C หยุดเซิร์ฟเวอร์และกลับ Terminal; Build สร้าง frontend/dist/');
 console.log('ตั้งค่าลับใน .env เท่านั้น ไม่เผยแพร่ใน Git; CLI ไม่สร้างตารางหรือ Deploy');
 console.log('PowerShell ครั้งแรก: Set-Alias ford "$PWD\\ford.cmd"');
}
async function install() {
 console.log('ตรวจ Node.js: ' + process.version);
 if (!supportedNode(process.version)) { console.error('ต้องใช้ Node.js 24 ขึ้นไป'); return 1; }
 const version = await npm(['--version'], { capture: true, timeout: 10000 });
 if (version.code !== 0) { console.error('ไม่พบ npm ที่ใช้งานได้ กรุณาติดตั้ง Node.js พร้อม npm'); return 1; }
 console.log('npm: ' + version.output.trim());
 console.log(await ensureEnv() ? 'สร้าง backend/.env จาก .env.example แล้ว' : 'เก็บ backend/.env เดิมไว้');
 const missing = await missingSettings();
 if (missing.length) console.log('ค่าที่ยังต้องเติมใน backend/.env: ' + missing.join(', '));
 const state = await dependencyState();
 if (!state.ready) {
  console.log(state.consistent ? 'ติดตั้งตาม Lock File ด้วย npm ci' : 'สร้าง/ปรับ Lock File และติดตั้งด้วย npm install');
  const result = await npm([state.consistent ? 'ci' : 'install', '--fetch-retries=0', '--fetch-timeout=15000']);
  if (result.code !== 0) { console.error('ติดตั้งไม่สำเร็จ ตรวจการเชื่อม npm registry และสิทธิ์ไฟล์ แล้วลอง ford install ใหม่'); return result.code; }
  if (!(await dependencyState()).ready) { console.error('ตรวจ dependencies หลังติดตั้งไม่ผ่าน'); return 1; }
 } else console.log('Dependencies ครบแล้ว ไม่ติดตั้งซ้ำ');
 if (missing.length) { console.log('ติดตั้งพร้อมแล้ว แต่ยังต้องเติมใน backend/.env: ' + missing.join(', ')); return 0; }
 console.log('พร้อมใช้งาน (ยังไม่ได้ทดสอบการเชื่อมต่อ; เลือกรันหลังบ้านเพื่อตรวจ)');
 return 0;
}
export async function menu({ choose = selectMenu, dependencies = dependencyState, execute = npm } = {}) {
 if (!supportedNode(process.version)) { console.error('ต้องใช้ Node.js 24 ขึ้นไป'); return 1; }
  try {
  for (;;) {
   setTerminalTitle('Ford CLI');
   const choice = await choose();
   if (choice === 'cancel') return 130;
   if (choice === '0') return 0;
   if (choice === '4') { help(); continue; }
   if (!['1','2','3'].includes(choice)) { console.error('กรุณาเลือก 0–4'); return 1; }
   if (!(await dependencies()).ready) { console.error('Dependencies ยังไม่พร้อม กรุณารัน ford install ก่อน'); return 1; }
   if (choice === '2') {
    if (!await exists(join(projectRoot, 'backend/.env'))) { console.error('ยังไม่มี backend/.env กรุณารัน ford install ก่อน'); return 1; }
    const missing = (await missingSettings()).filter(k => ['SUPABASE_URL','SUPABASE_SECRET_KEY','REDIS_URL'].includes(k));
    if (missing.length) { console.error('ยังไม่ได้ตั้งค่า: ' + missing.join(', ')); return 1; }
    console.log('ตรวจ Supabase HTTPS และ Redis...');
    const check = await withTerminalTitle('Backend — Check', () => runProcess(process.execPath, ['--env-file-if-exists=.env', 'scripts/check-connections.js'], { cwd: join(projectRoot, 'backend'), timeout: 15000 }));
    if (check.code === 130) return 130;
    if (check.code !== 0) { console.error(check.code === 124 ? 'ตรวจการเชื่อมต่อเกิน 15 วินาที ยังไม่เปิดหลังบ้าน' : 'เชื่อมต่อไม่ผ่าน ยังไม่เปิดหลังบ้าน ตรวจ URL, รหัสผ่าน, TLS และเครือข่าย'); return check.code;  }
   }
   const title = choice === '2' ? 'Backend' : choice === '3' ? 'Frontend — Build' : 'Frontend';
   const result = await withTerminalTitle(title, () => execute(['run', choice === '3' ? 'build' : 'dev', '-w', choice === '2' ? 'backend' : 'frontend']));
   if (result.code === 130) return 130;
   if (result.code !== 0) { console.error('คำสั่งไม่สำเร็จ (code ' + result.code + ') ดูข้อความด้านบน'); return result.code; }
   else if (choice === '3') console.log('Build สำเร็จ: frontend/dist/ (ยังไม่ได้ Deploy)');
  }
 } catch (error) { if (error.code === 'ABORT_ERR' || error.code === 'ERR_USE_AFTER_CLOSE') return 130; throw error; }

}
export async function main(command = process.argv[2]) {
 if (command === 'install') return install();
 if (command === 'run') return menu();
 help(); return command ? 1 : 0;
}
// npm link invokes a symlink path; compare canonical filesystem paths.
const entryPath = process.argv[1] ? await realpath(resolve(process.argv[1])).catch(() => null) : null;
const modulePath = await realpath(fileURLToPath(import.meta.url));
if (entryPath === modulePath) {
 main().then(code => { process.exitCode = code; }).catch(() => { console.error('CLI เกิดข้อผิดพลาด ตรวจไฟล์ package.json/.env และสิทธิ์ใช้งาน'); process.exitCode = 1; });
}
