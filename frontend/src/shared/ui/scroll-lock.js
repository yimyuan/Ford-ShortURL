const locks = new WeakMap();
export function lockScroll(body) {
  let entry = locks.get(body);
  if (!entry) {
    entry = { count: 0, overflow: body.style.overflow };
    locks.set(body, entry);
  }
  entry.count++;
  body.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    entry.count--;
    if (entry.count === 0) {
      body.style.overflow = entry.overflow;
      locks.delete(body);
    }
  };
}
