// Copied from app-native/src/lib/introTarget.ts (DailyDrop phone app) for the TV app — keep in sync by hand.
// Where the masthead wordmark sits on screen, so the opening animation can rise into it
// (the web version measures `.mast h1`). Masthead registers a measurer once laid out; Intro waits
// for one and measures at the moment it rises, so the rect is current.
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
type Measure = () => Promise<Rect | null>;

let measurer: Measure | null = null;
const listeners = new Set<() => void>();

export function setIntroTarget(m: Measure | null) {
  measurer = m;
  if (m) listeners.forEach((l) => l());
}

export const getIntroTarget = () => measurer;

export function onIntroTarget(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
