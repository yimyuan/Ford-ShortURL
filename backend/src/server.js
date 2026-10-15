import { app } from './app.js';
import { config } from './config.js';
import { closeRedis } from './infrastructure/redis.js';
const server = app.listen(config.port, config.host, () => console.log('API listening on http://' + config.host + ':' + config.port));
server.on('error', (error) => { console.error('Server startup failed:', error.code); process.exitCode = 1; });
let stopping = false;
async function shutdown() {
 if (stopping) return; stopping = true;
 const deadline = setTimeout(() => process.exit(1), 10000); deadline.unref();
 server.close(async () => { await Promise.allSettled([closeRedis()]); clearTimeout(deadline); });
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
