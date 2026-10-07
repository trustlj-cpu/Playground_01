import { Preferences } from '@capacitor/preferences';

// A WebView reload can lose an in-flight native reply. Only retry reads:
// writes must never be repeated without knowing whether they committed.
export async function readPreference(key, { get = options => Preferences.get(options), timeoutMs = 2000 } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let timer;
    const pending = Symbol('no native reply');
    try {
      const result = await Promise.race([
        get({ key }),
        new Promise(resolve => { timer = setTimeout(() => resolve(pending), timeoutMs); }),
      ]);
      if (result !== pending) return result;
    } finally { clearTimeout(timer); }
  }
  throw new Error('Preference read timed out');
}
