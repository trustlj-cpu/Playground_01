// Rewrites links that open the app (universal links / app links / dailydrop://) to app routes. See src/lib/links.ts.
import { appPathFor } from '../lib/links';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return appPathFor(path);
  } catch {
    return '/';
  }
}
