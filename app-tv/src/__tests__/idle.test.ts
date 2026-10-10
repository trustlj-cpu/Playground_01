import { __setClock, getLastActivity, idleRemaining, markActivity, onActivity, resetOnForeground } from '../tv/activity';

function fakeAppState() {
  let l: ((s: string) => void) | null = null;
  return {
    addEventListener: (_: 'change', f: (s: string) => void) => {
      l = f;
      return { remove: () => (l = null) };
    },
    emit: (s: string) => l?.(s),
  };
}

describe('lean-back idle timer (T5)', () => {
  let now = 1_000_000;
  beforeEach(() => {
    now = 1_000_000;
    __setClock(() => now);
  });

  it('coming back to the foreground restarts the idle clock', () => {
    const app = fakeAppState();
    const off = resetOnForeground(app);
    now += 3 * 60 * 60_000; // three hours in the background
    expect(idleRemaining(60_000)).toBe(1000); // without the reset: lean-back within 1 s (the bug)
    app.emit('background');
    expect(idleRemaining(60_000)).toBe(1000);
    app.emit('active');
    expect(getLastActivity()).toBe(now);
    expect(idleRemaining(60_000)).toBe(60_000);
    off();
  });

  it('focus changes and keys count as activity and re-arm listeners', () => {
    const seen: number[] = [];
    const off = onActivity(() => seen.push(now));
    now += 50_000;
    expect(idleRemaining(60_000)).toBe(10_000);
    markActivity(); // Focusable.onFocus / any remote key
    expect(idleRemaining(60_000)).toBe(60_000);
    expect(seen).toEqual([now]);
    off();
  });
});
