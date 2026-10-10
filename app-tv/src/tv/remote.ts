// One place for remote-control input on every platform.
//  - Arrow/select keys go to the top-most active key layer (useRemoteKeys) — a modal layer such as the
//    reader or the lean-back screen consumes them. When no layer consumes an arrow key the platform's own
//    focus engine moves focus (tvOS / Android TV), or on the web the spatial-navigation layer in keysource.ts.
//  - Back (Android TV back, tvOS Menu, Escape/Backspace on the web) goes to the top-most useBack handler.
//    With none registered the platform default runs (tvOS Menu / Android back leave the app on Home).
//  - Every key counts as activity (used by the lean-back idle timer).
import { useEffect, useRef } from 'react';
import { installKeySource, setMenuKeyCaptured } from './keysource';

export type RemoteKey = 'up' | 'down' | 'left' | 'right' | 'select' | 'playPause' | 'other';
type Entry<T> = { fn: { current: T } };

const keyStack: Entry<(k: RemoteKey) => boolean>[] = [];
const backStack: Entry<() => boolean>[] = [];
const activityListeners = new Set<() => void>();
let lastActivity = Date.now();

export function markActivity() {
  lastActivity = Date.now();
  activityListeners.forEach((l) => l());
}
export const getLastActivity = () => lastActivity;
export function onActivity(l: () => void): () => void {
  activityListeners.add(l);
  return () => {
    activityListeners.delete(l);
  };
}

function dispatchKey(k: RemoteKey): boolean {
  const top = keyStack[keyStack.length - 1];
  return top ? top.fn.current(k) : false;
}

function dispatchBack(): boolean {
  for (let i = backStack.length - 1; i >= 0; i--) if (backStack[i].fn.current()) return true;
  return false;
}

/** Modal key layer: while active it receives remote keys first; return true to consume. */
export function useRemoteKeys(handler: (k: RemoteKey) => boolean, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const e = { fn: ref };
    keyStack.push(e);
    return () => {
      const i = keyStack.indexOf(e);
      if (i >= 0) keyStack.splice(i, 1);
    };
  }, [active]);
}

/** Back / Menu / Escape handler; return true when handled. */
export function useBack(handler: () => boolean, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const e = { fn: ref };
    backStack.push(e);
    setMenuKeyCaptured(true);
    return () => {
      const i = backStack.indexOf(e);
      if (i >= 0) backStack.splice(i, 1);
      setMenuKeyCaptured(backStack.length > 0);
    };
  }, [active]);
}

/** Mount once at the root. */
export function useRemoteSource() {
  useEffect(() => installKeySource({ key: dispatchKey, back: dispatchBack, activity: markActivity }), []);
}
