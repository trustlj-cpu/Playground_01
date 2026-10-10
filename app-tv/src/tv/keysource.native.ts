// Native key source (react-native-tvos): TVEventHandler for the D-pad / Siri Remote,
// BackHandler for Android TV Back and the tvOS Menu button (captured only while something can go back).
import { BackHandler, Platform, TVEventControl, TVEventHandler, type HWEvent } from 'react-native';
import type { RemoteKey } from './remote';

const MAP: Record<string, RemoteKey> = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  swipeUp: 'up',
  swipeDown: 'down',
  swipeLeft: 'left',
  swipeRight: 'right',
  select: 'select',
  playPause: 'playPause',
};

export function installKeySource(h: { key: (k: RemoteKey) => boolean; back: () => boolean; activity: () => void }): () => void {
  const sub = TVEventHandler?.addListener?.((e: HWEvent) => {
    if (!e || e.eventType === 'blur' || e.eventType === 'pan') return;
    if (e.eventKeyAction === 1) return; // Android key-up half of a press
    h.activity();
    const k = MAP[e.eventType];
    if (k) h.key(k);
    else if (e.eventType !== 'focus' && e.eventType !== 'menu') h.key('other'); // longSelect, rewind, … (intro: any key skips)
  });
  const back = BackHandler.addEventListener('hardwareBackPress', () => {
    h.activity();
    return h.back();
  });
  return () => {
    sub?.remove();
    back.remove();
  };
}

let captured: boolean | null = null;
export function setMenuKeyCaptured(on: boolean) {
  if (!(Platform.OS === 'ios' && Platform.isTV) || captured === on) return;
  captured = on;
  try {
    if (on) TVEventControl.enableTVMenuKey();
    else TVEventControl.disableTVMenuKey();
  } catch {}
}

/** Native focus engines scroll focused views into view themselves. */
export function reveal(_el: unknown, _smooth?: boolean) {}
