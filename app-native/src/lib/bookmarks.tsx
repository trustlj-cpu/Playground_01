// Bookmarks are stored on the device (AsyncStorage). Sync with the web account (/api/me/bookmarks)
// can be added later; the record shape keeps region/lang/date so a server merge is straightforward.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface ArticleBookmark {
  key: string; // region:date:lang:id
  id: string;
  region: string;
  lang: string;
  date: string;
  no: number;
  kick: string;
  hl: string;
  at: number;
}

export interface TermBookmark {
  key: string; // lang:term
  term: string;
  f: string;
  d: string;
  w: string;
  region: string;
  lang: string;
  date: string;
  at: number;
}

const KA = 'dd.bm.articles.v1';
const KT = 'dd.bm.terms.v1';

interface Ctx {
  articles: ArticleBookmark[];
  terms: TermBookmark[];
  hasArticle: (key: string) => boolean;
  hasTerm: (key: string) => boolean;
  toggleArticle: (b: Omit<ArticleBookmark, 'at'>) => void;
  toggleTerm: (b: Omit<TermBookmark, 'at'>) => void;
  removeArticle: (key: string) => void;
  removeTerm: (key: string) => void;
}

const BookmarkContext = createContext<Ctx | null>(null);

export const articleKey = (region: string, date: string, lang: string, id: string) => `${region}:${date}:${lang}:${id}`;
export const termKey = (lang: string, term: string) => `${lang}:${term}`;

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [articles, setArticles] = useState<ArticleBookmark[]>([]);
  const [terms, setTerms] = useState<TermBookmark[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet([KA, KT])
      .then(([[, a], [, t]]) => {
        if (a) setArticles(JSON.parse(a));
        if (t) setTerms(JSON.parse(t));
      })
      .catch(() => {});
  }, []);

  const saveA = (list: ArticleBookmark[]) => {
    AsyncStorage.setItem(KA, JSON.stringify(list)).catch(() => {});
    return list;
  };
  const saveT = (list: TermBookmark[]) => {
    AsyncStorage.setItem(KT, JSON.stringify(list)).catch(() => {});
    return list;
  };

  const toggleArticle = useCallback((b: Omit<ArticleBookmark, 'at'>) => {
    setArticles((l) => saveA(l.some((x) => x.key === b.key) ? l.filter((x) => x.key !== b.key) : [{ ...b, at: Date.now() }, ...l]));
  }, []);
  const toggleTerm = useCallback((b: Omit<TermBookmark, 'at'>) => {
    setTerms((l) => saveT(l.some((x) => x.key === b.key) ? l.filter((x) => x.key !== b.key) : [{ ...b, at: Date.now() }, ...l]));
  }, []);
  const removeArticle = useCallback((key: string) => setArticles((l) => saveA(l.filter((x) => x.key !== key))), []);
  const removeTerm = useCallback((key: string) => setTerms((l) => saveT(l.filter((x) => x.key !== key))), []);

  const value = useMemo<Ctx>(() => {
    const a = new Set(articles.map((x) => x.key));
    const t = new Set(terms.map((x) => x.key));
    return { articles, terms, hasArticle: (k) => a.has(k), hasTerm: (k) => t.has(k), toggleArticle, toggleTerm, removeArticle, removeTerm };
  }, [articles, terms, toggleArticle, toggleTerm, removeArticle, removeTerm]);

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmarks(): Ctx {
  const c = useContext(BookmarkContext);
  if (!c) throw new Error('BookmarkProvider missing');
  return c;
}
