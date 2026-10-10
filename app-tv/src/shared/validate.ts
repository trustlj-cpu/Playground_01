// Shape checks for API responses before they are shown or cached: a broken deploy or a captive-portal
// HTML page must never replace the last good copy on the device.
const obj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown) => typeof x === 'string';

function isIndex(d: any) {
  return obj(d) && Array.isArray(d.regions) && d.regions.length > 0 && d.regions.every((r: any) => obj(r) && str(r.code) && Array.isArray(r.langs) && obj(r.latest) && str(r.latest.date) && Array.isArray(r.editions));
}
function isEdition(d: any) {
  return (
    obj(d) && str(d.region) && str(d.lang) && str(d.date) && obj(d.mast) && str(d.mast.dateline) &&
    Array.isArray(d.stories) && d.stories.every((s: any) => obj(s) && str(s.id) && str(s.hl) && Array.isArray(s.body)) &&
    (d.blocks == null || Array.isArray(d.blocks)) && (d.glossary == null || obj(d.glossary))
  );
}
function isBreaking(d: any) {
  return obj(d) && Array.isArray(d.items) && d.items.every((i: any) => obj(i) && str(i.t));
}
function isGlossary(d: any) {
  return obj(d) && Array.isArray(d.terms);
}

/** True when `data` has the shape the API documents for `path` (unknown paths only need to be JSON objects). */
export function validFor(path: string, data: unknown): boolean {
  try {
    if (path === 'index.json') return isIndex(data);
    if (path.includes('breaking.json')) return isBreaking(data);
    if (path.startsWith('glossary/')) return isGlossary(data);
    if (/^[A-Z]{2}\/\d{4}-\d{2}-\d{2}\.[\w-]+\.json$/.test(path)) return isEdition(data);
    return obj(data);
  } catch {
    return false;
  }
}

export class ShapeError extends Error {
  constructor(path: string) {
    super('Unexpected API response for ' + path);
  }
}
