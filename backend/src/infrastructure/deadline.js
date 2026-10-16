// Also bound injected/half-open connections that never reject on their own.
export async function withDeadline(operation, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Operation deadline exceeded')), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function withRedisDeadline(connect, operation, milliseconds) {
  const signal = AbortSignal.timeout(milliseconds);
  return withDeadline(async () => {
    const client = await connect();
    // A delayed connection must not execute a write after its caller timed out.
    signal.throwIfAborted();
    return operation(client.withCommandOptions({ abortSignal: signal }));
  }, milliseconds);
}
