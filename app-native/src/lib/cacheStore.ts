// Where the device copies of API responses live.
// Native: one file per response under <documents>/dd-cache/ (expo-file-system). Glossaries are ~1 MB each and
// growing, editions ~50 KB; keeping them in AsyncStorage (Android's SQLite store is capped at 6 MB) would fill
// it and then silently break every other write — settings and bookmarks included. AsyncStorage keeps only the
// small index. Web (react-native-web): AsyncStorage = localStorage, with a smaller budget.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface BlobStore {
  get(key: string): Promise<string | null>;
  set(key: string, text: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const safeName = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_') + '.json';

function fileStore(): BlobStore {
  // required lazily so the web bundle and tests can substitute it
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FS = require('expo-file-system') as typeof import('expo-file-system');
  let dir: InstanceType<typeof FS.Directory> | null = null;
  const folder = () => {
    if (!dir) {
      dir = new FS.Directory(FS.Paths.document, 'dd-cache');
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    }
    return dir;
  };
  const file = (key: string) => new FS.File(folder(), safeName(key));
  return {
    async get(key) {
      const f = file(key);
      return f.exists ? await f.text() : null;
    },
    async set(key, text) {
      file(key).write(text);
    },
    async remove(key) {
      const f = file(key);
      if (f.exists) f.delete();
    },
  };
}

const PREFIX = 'dd.cache.v2:';
function asyncStorageStore(): BlobStore {
  return {
    get: (key) => AsyncStorage.getItem(PREFIX + key),
    set: (key, text) => AsyncStorage.setItem(PREFIX + key, text),
    remove: (key) => AsyncStorage.removeItem(PREFIX + key),
  };
}

let store: BlobStore | null = null;
export function blobStore(): BlobStore {
  if (!store) {
    try {
      store = Platform.OS === 'web' ? asyncStorageStore() : fileStore();
    } catch {
      store = asyncStorageStore();
    }
  }
  return store;
}
/** for tests */
export function setBlobStore(s: BlobStore | null) {
  store = s;
}

/** Total bytes the cached copies may use: least recently written copies go first. */
export const CACHE_BUDGET = Platform.OS === 'web' ? 3_000_000 : 40_000_000;

/** Failed writes of settings / bookmarks: logged (they used to vanish in `.catch(() => {})`). With the API cache
 *  out of AsyncStorage these should not happen any more; the in-memory state stays correct for the session. */
export const warnWrite = (what: string) => (e: unknown) => {
  console.warn(`[storage] ${what} not saved`, e);
};
