// Durable copy of the (tiny) TV settings.
// tvOS has no persistent app storage except NSUserDefaults: @react-native-async-storage keeps its data in
// Caches on tvOS (RNCAsyncStorage.mm, TARGET_OS_TV) and the system may purge it, and the Documents
// directory is not available to tvOS apps for persistent files. So on iOS/tvOS the settings are mirrored
// into NSUserDefaults (React Native's Settings module, < 1 KB — well inside tvOS's 500 KB limit) and read
// back when AsyncStorage comes back empty. Android TV and the web keep AsyncStorage only (persistent there).
import { Platform, Settings } from 'react-native';

const KEY = 'dd.tv.settings.mirror';
const apple = Platform.OS === 'ios';

export function readMirror(): string | null {
  if (!apple) return null;
  try {
    const v = Settings.get(KEY);
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function writeMirror(raw: string) {
  if (!apple) return;
  try {
    Settings.set({ [KEY]: raw });
  } catch {}
}
