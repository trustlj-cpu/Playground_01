// Web key source — a keyboard focus layer so the TV UI is testable in a browser (react-native-web).
// Arrow keys = D-pad, Enter = select (react-native-web Pressables already press on Enter),
// Escape / Backspace = Back. Arrow keys nobody consumed move DOM focus spatially between focusable
// elements (tabindex=0) inside the top-most focus scope ([data-tvscope]), like a TV focus engine.
import type { RemoteKey } from './remote';

const KEYS: Record<string, RemoteKey> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'select',
  MediaPlayPause: 'playPause',
};
const BACK = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack']);

type Dir = 'up' | 'down' | 'left' | 'right';

function scopeRoot(): HTMLElement {
  const scopes = document.querySelectorAll<HTMLElement>('[data-tvscope]');
  return scopes[scopes.length - 1] || document.body;
}

function focusables(): HTMLElement[] {
  return Array.from(scopeRoot().querySelectorAll<HTMLElement>('[tabindex="0"]')).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** Bring a newly focused element into view like a TV list: anything that starts on the first screen
 *  snaps the page to its top (so the menu and masthead stay visible); an element taller than most of the
 *  screen (the lead story) is shown from its top; everything else is centred. */
export function reveal(el: HTMLElement, smooth = true) {
  const sp = scrollParent(el);
  if (!sp) return;
  const r = el.getBoundingClientRect();
  const top = r.top - sp.getBoundingClientRect().top + sp.scrollTop;
  const behavior = smooth ? 'smooth' : 'auto';
  const vh = sp.clientHeight;
  if (top + Math.min(r.height, vh * 0.35) < vh) sp.scrollTo({ top: 0, behavior });
  else if (r.height > vh * 0.8) sp.scrollTo({ top: Math.max(0, top - vh * 0.08), behavior });
  else el.scrollIntoView({ block: 'center', inline: 'nearest', behavior });
}

export function moveFocus(dir: Dir): boolean {
  const els = focusables();
  if (!els.length) return false;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !els.includes(cur)) {
    els[0].focus({ preventScroll: true });
    reveal(els[0]);
    return true;
  }
  const a = cur.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of els) {
    if (el === cur || cur.contains(el) || el.contains(cur)) continue;
    const b = el.getBoundingClientRect();
    let primary: number, overlapGap: number, tie: number;
    if (dir === 'right' || dir === 'left') {
      if (dir === 'right' ? !(b.left >= a.right - 4 || (b.left > a.left + 1 && b.left + b.width / 2 > a.right)) : !(b.right <= a.left + 4 || (b.right < a.right - 1 && b.left + b.width / 2 < a.left))) continue;
      primary = dir === 'right' ? Math.max(0, b.left - a.right) : Math.max(0, a.left - b.right);
      overlapGap = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      tie = Math.abs(b.top - a.top);
    } else {
      if (dir === 'down' ? !(b.top >= a.bottom - 4) : !(b.bottom <= a.top + 4)) continue;
      primary = dir === 'down' ? Math.max(0, b.top - a.bottom) : Math.max(0, a.top - b.bottom);
      overlapGap = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      tie = Math.abs(b.left - a.left);
    }
    const score = primary + overlapGap * 3 + (overlapGap > 0 ? 400 : 0) + tie * 0.01;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (!best) return false;
  best.focus({ preventScroll: true });
  reveal(best);
  return true;
}

export function installKeySource(h: { key: (k: RemoteKey) => boolean; back: () => boolean; activity: () => void }): () => void {
  if (typeof window === 'undefined') return () => {};
  const onKey = (e: KeyboardEvent) => {
    h.activity();
    if (BACK.has(e.key)) {
      if (h.back()) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    const k = KEYS[e.key];
    if (!k) {
      if (!e.metaKey && !e.ctrlKey && !e.altKey && h.key('other')) e.preventDefault(); // e.g. "any key skips the intro"
      return;
    }
    if (h.key(k)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
      e.preventDefault(); // never let the browser scroll the page itself
      moveFocus(k);
    }
  };
  window.addEventListener('keydown', onKey, true);
  return () => window.removeEventListener('keydown', onKey, true);
}

export function setMenuKeyCaptured(_on: boolean) {}
