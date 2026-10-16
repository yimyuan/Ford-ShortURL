import { createClient } from 'redis';
import { config } from '../config.js';
let client;
let connecting;
export async function getRedis() {
  if (!config.redisUrl) throw new Error('REDIS_URL is not configured');
  if (!client) {
    client = createClient({
      url: config.redisUrl,
      disableOfflineQueue: true,
      socket: { connectTimeout: 2000, socketTimeout: 2000, reconnectStrategy: false },
    });
    client.on('error', () => console.error('Redis connection error'));
  }
  if (!client.isReady) {
    if (!connecting && !client.isOpen)
      connecting = client.connect().finally(() => {
        connecting = undefined;
      });
    if (connecting) await connecting;
    if (!client.isReady) throw new Error('Redis is not ready');
  }
  return client;
}
export async function closeRedis() {
  if (client?.isOpen) await client.close();
  client = undefined;
}
