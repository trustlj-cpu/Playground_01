// Shape checks for API responses before they are shown or cached: a broken deploy or a captive-portal
// HTML page must never replace the last good copy on the device.
const obj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown) => typeof x === 'string';
const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
const optStr = (x: unknown) => x == null || typeof x === 'string';
const strs = (x: unknown) => Array.isArray(x) && x.every(str);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Every field the TV reads is checked here (Home, Reader, Editions, Settings, ticker), so a partial or
// renamed field from a broken deploy is rejected (and the last good copy kept) instead of crashing a screen.
function isIndex(d: any) {
  return (
    obj(d) && Array.isArray(d.regions) && d.regions.length > 0 &&
    d.regions.every(
      (r: any) =>
        obj(r) && str(r.code) && obj(r.name) && strs(r.langs) && r.langs.length > 0 && optStr(r.tz) &&
        obj(r.latest) && str(r.latest.date) && DATE.test(r.latest.date) && num(r.latest.no) &&
        Array.isArray(r.editions) && r.editions.every((e: any) => obj(e) && str(e.date) && DATE.test(e.date) && num(e.no) && strs(e.langs)),
    )
  );
}
function isEdition(d: any) {
  return (
    obj(d) && str(d.region) && str(d.lang) && str(d.date) && DATE.test(d.date) && num(d.no) && optStr(d.breaking) &&
    obj(d.mast) && str(d.mast.dateline) && str(d.mast.label) && str(d.mast.time) && (d.mast.ears == null || Array.isArray(d.mast.ears)) &&
    Array.isArray(d.stories) &&
    d.stories.every((s: any) => obj(s) && str(s.id) && str(s.hl) && str(s.kick) && optStr(s.dek) && strs(s.body) && (s.popup == null || (obj(s.popup) && Object.values(s.popup).every(optStr)))) &&
    (d.blocks == null || (Array.isArray(d.blocks) && d.blocks.every((b: any) => obj(b) && str(b.type) && str(b.html) && optStr(b.title)))) &&
    (d.glossary == null || (obj(d.glossary) && Object.values(d.glossary).every((g: any) => obj(g) && str(g.d) && optStr(g.f) && optStr(g.w))))
  );
}
function isBreaking(d: any) {
  return obj(d) && Array.isArray(d.items) && d.items.every((i: any) => obj(i) && str(i.t) && str(i.u) && optStr(i.s) && optStr(i.at));
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
