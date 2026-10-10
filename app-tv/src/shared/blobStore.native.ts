// Native storage for cached API JSON: one file per key in the cache directory (expo-file-system), so large
// payloads (a glossary is ~1 MB and growing) never go through AsyncStorage's per-entry / 6 MB Android limits.
import { Directory, File, Paths } from 'expo-file-system';

let dir: Directory | null = null;
function root(): Directory {
  if (!dir) {
    dir = new Directory(Paths.cache, 'dd-api-cache');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}
const fileFor = (k: string) => new File(root(), encodeURIComponent(k).replace(/%/g, '_') + '.json');

export async function blobGet(k: string): Promise<string | null> {
  const f = fileFor(k);
  return f.exists ? f.text() : null;
}
export async function blobSet(k: string, v: string): Promise<void> {
  const f = fileFor(k);
  if (!f.exists) f.create({ overwrite: true });
  f.write(v);
}
export async function blobDel(k: string): Promise<void> {
  const f = fileFor(k);
  if (f.exists) f.delete();
}
