import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
export const menuItems = [
 { value: '1', label: 'รันหน้าบ้าน' },
 { value: '2', label: 'รันหลังบ้าน — ตรวจ Supabase / Redis ก่อน' },
 { value: '3', label: 'Build หน้าบ้าน' },
 { value: '4', label: 'ดูวิธีใช้' },
 { value: '0', label: 'ออก' }
];
const initialized = new WeakSet();
export async function selectMenu(input = process.stdin, output = process.stdout) {
 // Keep piped invocation usable for automation; interactive terminals use arrows.
 if (!input.isTTY || !output.isTTY) {
  output.write('\nFORD CLI v1.0 — Short URL\n' + menuItems.map(i => i.value + '. ' + i.label).join('\n') + '\n');
  const lines = createInterface({ input, output });
  try { return (await lines.question('เลือก > ')).trim(); } finally { lines.close(); }
 }
 if (!initialized.has(input)) { emitKeypressEvents(input); initialized.add(input); }
 return new Promise(resolve => {
  let selected = 0, drawn = false;
  const wasRaw = Boolean(input.isRaw);
  const render = () => {
   if (drawn) output.write('\x1b[' + (menuItems.length + 1) + 'A');
   output.write('\x1b[2K\rใช้ ↑ ↓ เลือก แล้วกด Enter · Ctrl+C ออก\n');
   for (const [index, item] of menuItems.entries()) {
    output.write('\x1b[2K\r' + (index === selected ? '\x1b[36m❯ ' : '  ') + item.label + (index === selected ? '\x1b[0m' : '') + '\n');
   }
   drawn = true;
  };
  const cleanup = () => {
   input.removeListener('keypress', onKey); input.removeListener('end', onEnd);
   input.setRawMode(wasRaw); input.pause(); output.write('\x1b[0m\x1b[?25h');
  };
  const finish = value => { cleanup(); resolve(value); };
  const onEnd = () => finish('0');
  const onKey = (_text, key = {}) => {
   if (key.ctrl && key.name === 'c') return finish('cancel');
   if (key.name === 'escape') return finish('0');
   if (key.name === 'up') selected = (selected - 1 + menuItems.length) % menuItems.length;
   else if (key.name === 'down') selected = (selected + 1) % menuItems.length;
   else if (key.name === 'return' || key.name === 'enter') { output.write('เลือก: ' + menuItems[selected].label + '\n'); return finish(menuItems[selected].value); }
   else return;
   render();
  };
  input.setRawMode(true); input.resume();
  input.on('keypress', onKey); input.once('end', onEnd);
  output.write('\nFORD CLI v1.0 — Short URL\n\x1b[?25l'); render();
 });
}
