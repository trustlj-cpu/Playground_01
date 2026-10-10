// Shapes of the static JSON API (see ops/app/API.md on the main branch).

export type LangMap = Record<string, string>;

export interface EditionRef {
  date: string;
  no: number;
  langs: string[];
}

export interface Region {
  code: string;
  name: LangMap;
  prefix: string;
  langs: string[];
  tz: string;
  latest: { date: string; no: number };
  editions: EditionRef[];
}

export interface Index {
  v: number;
  generated: string;
  regions: Region[];
}

export interface Popup {
  kick?: string;
  title?: string;
  what?: string;
  why?: string;
  me?: string;
  a?: string;
  b?: string;
  say?: string;
  src?: string;
}

export interface Story {
  id: string;
  rank: number;
  kick: string;
  hl: string;
  dek: string;
  body: string[];
  popup: Popup;
}

export interface Block {
  type: 'nums' | 'next' | 'strip' | 'rumor' | 'one' | 'fill' | 'glos' | 'colophon' | 'other' | string;
  title?: string;
  html: string;
}

export interface GlossEntry {
  f: string;
  d: string;
  w: string;
}

export interface Influencer {
  who: string;
  where?: string;
  date?: string;
  u: string;
  t: string;
}

export interface Edition {
  v: number;
  region: string;
  lang: string;
  date: string;
  no: number;
  publishAt: string;
  url: string;
  mast: { label: string; dateline: string; time: string; house?: string; ears?: string[] };
  stories: Story[];
  blocks: Block[];
  glossary: Record<string, GlossEntry>;
  influencers: Influencer[];
  sources?: unknown[];
  breaking?: string;
}

export interface GlossaryTerm extends GlossEntry {
  term: string;
  region: string;
  date: string;
}

export interface GlossaryFile {
  terms: GlossaryTerm[];
}

export interface BreakingItem {
  t: string;
  u: string;
  s?: string;
  at?: string;
}
