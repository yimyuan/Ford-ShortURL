// Retain the same intent across network failures and reloads in this tab.
// A new payload/account gets a new key. Storage failure still permits in-memory retries.
export function createCreationIntent(storage) {
  let current;
  const slot = 'shorturl.creation-intent';
  return {
    key(userId, originalUrl, customCode) {
      const payload = JSON.stringify([userId, originalUrl, customCode]);
      if (!current) {
        try {
          current = JSON.parse(storage?.getItem(slot) || 'null');
        } catch {
          /* unavailable */
        }
      }
      if (current?.payload !== payload || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(current?.key || '')) {
        current = { payload, key: globalThis.crypto.randomUUID() };
        try {
          storage?.setItem(slot, JSON.stringify(current));
        } catch {
          /* unavailable */
        }
      }
      return current.key;
    },
    clear() {
      current = null;
      try {
        storage?.removeItem(slot);
      } catch {
        /* unavailable */
      }
    },
  };
}
