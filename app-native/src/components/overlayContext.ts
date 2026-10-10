// The overlay API (open article sheet / breaking list / term tip) lives apart from OverlayProvider, so the
// components the provider renders (ArticleView, TermTip…) can use it without a require cycle
// (Overlay → ArticleView → Overlay, reported by Metro).
import { createContext, useContext } from 'react';
import type { BreakingItem, Edition, GlossEntry, Story } from '../lib/types';

export interface TermInfo {
  term: string;
  entry: GlossEntry;
  x: number;
  y: number;
  region: string;
  lang: string;
  date: string;
}

export interface Ctx {
  openArticle: (edition: Edition, story: Story) => void;
  openBreaking: (items: BreakingItem[], label: string, lang: string) => void;
  showTerm: (t: TermInfo) => void;
}

export const OverlayContext = createContext<Ctx | null>(null);

export function useOverlay(): Ctx {
  const c = useContext(OverlayContext);
  if (!c) throw new Error('OverlayProvider missing');
  return c;
}
