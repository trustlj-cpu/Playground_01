// Remote / focus activity clock for the lean-back idle timer (no React Native imports, unit-tested).
// Activity = any remote key, any focus change, and the app returning to the foreground — so coming
// back to the app after hours never jumps straight into lean-back mode.
type Listener = () => void;

const listeners = new Set<Listener>();
let last = Date.now();
let clock = () => Date.now();

export function markActivity() {
  last = clock();
  listeners.forEach((l) => l());
}
export const getLastActivity = () => last;
export function onActivity(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** ms left until `idleMs` of inactivity has passed (never less than `floor`). */
export function idleRemaining(idleMs: number, now = clock(), floor = 1000): number {
  return Math.max(floor, idleMs - (now - last));
}

/** AppState-like source: 'active' (back in the foreground) counts as activity. */
export interface AppStateLike {
  addEventListener: (type: 'change', l: (s: string) => void) => { remove: () => void };
}
export function resetOnForeground(appState: AppStateLike): () => void {
  const sub = appState.addEventListener('change', (s) => {
    if (s === 'active') markActivity();
  });
  return () => sub.remove();
}

/** tests only */
export function __setClock(f: () => number) {
  clock = f;
  last = f();
}
