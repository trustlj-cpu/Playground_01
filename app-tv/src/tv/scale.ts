// 10-foot layout: every size in the app is written in 1080p pixels and multiplied by u.
// tvOS reports 1920×1080 points, Android TV usually 960×540 dp, the web build whatever the window is.
// Content stays inside a 5% overscan-safe margin on every side.
import { useWindowDimensions } from 'react-native';

export function useTV() {
  const { width, height } = useWindowDimensions();
  const u = Math.min(width / 1920, height / 1080) || 1;
  return { u, W: width, H: height, padX: Math.round(width * 0.05), padY: Math.round(height * 0.05) };
}
