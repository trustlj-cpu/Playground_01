// Share one download between background prefetch and an immediate user tap.
export function createSingleFlight() {
  const pending = new Map();
  return (key, load) => {
    if (pending.has(key)) return pending.get(key);
    const work = Promise.resolve().then(load).finally(() => pending.delete(key));
    pending.set(key, work);
    return work;
  };
}
