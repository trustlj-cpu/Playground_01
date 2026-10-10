// Shared edition index (index.json) for all tabs; refreshed on foreground and every 5 minutes,
// so a new edition published on the web appears in the app without an update.
import React, { createContext, useContext } from 'react';
import { paths } from './api';
import type { EditionRef, Index, Region } from './types';
import { Resource, useResource } from './useResource';

const IndexContext = createContext<Resource<Index> | null>(null);

export function IndexProvider({ children }: { children: React.ReactNode }) {
  const res = useResource<Index>(paths.index, { pollMs: 5 * 60_000 });
  return <IndexContext.Provider value={res}>{children}</IndexContext.Provider>;
}

export function useIndex(): Resource<Index> {
  const c = useContext(IndexContext);
  if (!c) throw new Error('IndexProvider missing');
  return c;
}

export function findRegion(index: Index | null, code: string): Region | undefined {
  return index?.regions.find((r) => r.code === code) || index?.regions[0];
}

/** Language to read an edition in: the chosen one if that edition has it, else the region's first language. */
export function pickLang(region: Region, ref: Pick<EditionRef, 'langs'> | undefined, want: string): string {
  const langs = ref?.langs?.length ? ref.langs : region.langs;
  if (langs.includes(want)) return want;
  const base = want.split('-')[0];
  const near = langs.find((l) => l.split('-')[0] === base);
  if (near) return near;
  return langs.includes(region.langs[0]) ? region.langs[0] : langs[0];
}

export function regionName(r: Region, lang: string): string {
  return titleCase(r.name[lang] || r.name[lang.split('-')[0]] || r.name.en || r.code);
}

/** The API's English names are dateline capitals ("UNITED STATES"); lists read better in title case. */
export function titleCase(n: string): string {
  return /^[A-Z][A-Z .'-]+$/.test(n) && n.length > 3 ? n.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : n;
}
