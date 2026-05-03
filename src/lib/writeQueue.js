let chain = Promise.resolve();
const pending = new Map();

export function enqueueWrite(key, task) {
  pending.set(key, task);
  chain = chain.then(async () => {
    const latest = pending.get(key);
    if (!latest) return;
    pending.delete(key);
    await latest();
  });
  return chain;
}
