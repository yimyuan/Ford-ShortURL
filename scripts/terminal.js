export function setTerminalTitle(title, output = process.stdout) {
 if (!output.isTTY) return;
 const safe = title.replace(/[\x00-\x1f\x7f]/g, '');
 output.write('\x1b]0;' + safe + '\x07');
}
export async function withTerminalTitle(title, action, output = process.stdout) {
 setTerminalTitle(title, output);
 try { return await action(); } finally { setTerminalTitle('Ford CLI', output); }
}
