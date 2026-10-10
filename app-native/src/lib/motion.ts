// The OS "reduce motion" setting, known synchronously at the first render (Reanimated reads it at start-up)
// and kept current while the app runs (the user can flip it in Settings and come back).
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export function useReduceMotion(): boolean {
  const initial = useReducedMotion();
  const [on, setOn] = useState(initial);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => alive && setOn(!!r))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (r) => setOn(!!r));
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return on;
}
