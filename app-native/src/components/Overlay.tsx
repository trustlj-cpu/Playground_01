// App-wide overlay layer (above the tab bar): article sheet, breaking list sheet, glossary tooltip.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import type { BreakingItem, Edition, GlossEntry, Story } from '../lib/types';
import ArticleView from './ArticleView';
import BreakingList from './BreakingList';
import Sheet from './Sheet';
import TermTip from './TermTip';

export interface TermInfo {
  term: string;
  entry: GlossEntry;
  x: number;
  y: number;
  region: string;
  lang: string;
  date: string;
}

interface Ctx {
  openArticle: (edition: Edition, story: Story) => void;
  openBreaking: (items: BreakingItem[], label: string, lang: string) => void;
  showTerm: (t: TermInfo) => void;
}

const OverlayContext = createContext<Ctx | null>(null);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [article, setArticle] = useState<{ edition: Edition; story: Story } | null>(null);
  const [breaking, setBreaking] = useState<{ items: BreakingItem[]; label: string; lang: string } | null>(null);
  const [tip, setTip] = useState<TermInfo | null>(null);

  const api = useMemo<Ctx>(
    () => ({
      openArticle: (edition, story) => {
        setTip(null);
        setArticle({ edition, story });
      },
      openBreaking: (items, label, lang) => setBreaking({ items, label, lang }),
      showTerm: (t) => setTip((cur) => (cur && cur.term === t.term && Math.abs(cur.y - t.y) < 4 ? null : t)),
    }),
    [],
  );

  const closeTop = useCallback(() => {
    if (tip) setTip(null);
    else if (breaking) setBreaking(null);
    else if (article) setArticle(null);
    else return false;
    return true;
  }, [tip, breaking, article]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', closeTop);
    return () => sub.remove();
  }, [closeTop]);

  return (
    <OverlayContext.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        {article && (
          <Sheet onClose={() => setArticle(null)} contentKey={article.edition.date + article.story.id}>
            <ArticleView edition={article.edition} story={article.story} />
          </Sheet>
        )}
        {breaking && (
          <Sheet onClose={() => setBreaking(null)} label={breaking.label} fit>
            <BreakingList items={breaking.items} label={breaking.label} lang={breaking.lang} />
          </Sheet>
        )}
        {tip && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TermTip info={tip} onClose={() => setTip(null)} />
          </View>
        )}
      </View>
    </OverlayContext.Provider>
  );
}

export function useOverlay(): Ctx {
  const c = useContext(OverlayContext);
  if (!c) throw new Error('OverlayProvider missing');
  return c;
}
