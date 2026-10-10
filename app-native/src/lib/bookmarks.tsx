// Bookmarks live on the device (AsyncStorage) and, when signed in to the web account, sync both ways with
// the website's /api/bookmarks (src/lib/account.ts). The device copy stays the offline cache:
//  - toggles apply locally at once and are queued in an outbox that is sent when the network allows;
//  - on sign-in the device list and the account list are merged (union; device-only items are uploaded);
//  - later syncs (app start, foreground, after each toggle) take the account list as the truth, so
//    bookmarks removed on the website disappear here too, while queued local changes are kept.
// Identity on the server is (kind, region, date, ref) for articles and (kind, ref) for terms.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Account from './account';
import type { AccountUser, ServerBookmark } from './account';

export interface ArticleBookmark {
  key: string; // region:date:lang:id
  id: string;
  region: string;
  lang: string;
  date: string;
  no: number; // 0 when it came from the website (the list looks the number up in the index)
  kick: string;
  hl: string;
  url?: string; // web path of the edition page, e.g. /2026-10-10/en/
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

type Op = { m: 'POST' | 'DELETE'; b: ServerBookmark };

const KA = 'dd.bm.articles.v1';
const KT = 'dd.bm.terms.v1';
const KO = 'dd.bm.outbox.v1';
const KM = 'dd.bm.merged.v1'; // account id whose first (union) merge is done

export type SyncState = 'off' | 'idle' | 'syncing' | 'error';

interface Ctx {
  articles: ArticleBookmark[];
  terms: TermBookmark[];
  hasArticle: (key: string) => boolean;
  hasTerm: (key: string) => boolean;
  toggleArticle: (b: Omit<ArticleBookmark, 'at'>) => void;
  toggleTerm: (b: Omit<TermBookmark, 'at'>) => void;
  removeArticle: (key: string) => void;
  removeTerm: (key: string) => void;
  // account sync (inactive unless EXPO_PUBLIC_ACCOUNT_SYNC=1)
  syncEnabled: boolean;
  user: AccountUser | null;
  sync: SyncState;
  lastSync: number;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const BookmarkContext = createContext<Ctx | null>(null);

export const articleKey = (region: string, date: string, lang: string, id: string) => `${region}:${date}:${lang}:${id}`;
/** Web path of an edition page from the API's absolute url (https://…/2026-10-10/en/ → /2026-10-10/en/). */
export const webPath = (u?: string) => (u ? u.replace(/^https?:\/\/[^/]+/, '') || undefined : undefined);
export const termKey = (lang: string, term: string) => `${lang}:${term}`;

const sid = (b: Pick<ServerBookmark, 'kind' | 'region' | 'date' | 'ref'>) => (b.kind === 'term' ? `t|${b.ref}` : `a|${b.region}|${b.date}|${b.ref}`);
const aSid = (a: Omit<ArticleBookmark, 'at'>) => sid({ kind: 'article', region: a.region, date: a.date, ref: a.id });
const tSid = (t: Omit<TermBookmark, 'at'>) => sid({ kind: 'term', region: t.region, date: t.date, ref: t.term });

export const toServerArticle = (a: Omit<ArticleBookmark, 'at'>): ServerBookmark => ({
  kind: 'article',
  region: a.region,
  date: a.date,
  lang: a.lang,
  ref: a.id,
  title: a.hl,
  url: a.url ? `${a.url}#${a.id}` : '',
});
export const toServerTerm = (t: Omit<TermBookmark, 'at'>): ServerBookmark => ({
  kind: 'term',
  region: t.region,
  date: t.date,
  lang: t.lang,
  ref: t.term,
  title: t.term,
  url: '',
  note: (t.d || '').slice(0, 380),
});

const fromServerArticle = (x: ServerBookmark, prev?: ArticleBookmark): ArticleBookmark => {
  const lang = x.lang || prev?.lang || 'en';
  const url = (x.url || '').split('#')[0];
  return {
    key: prev?.key || articleKey(x.region, x.date, lang, x.ref),
    id: x.ref,
    region: x.region,
    lang,
    date: x.date,
    no: prev?.no || 0,
    kick: prev?.kick || '',
    hl: prev?.hl || x.title || x.ref,
    url: prev?.url || url || undefined,
    at: prev?.at || x.created_at || Date.now(),
  };
};
const fromServerTerm = (x: ServerBookmark, prev?: TermBookmark): TermBookmark => {
  const lang = x.lang || prev?.lang || 'en';
  return {
    key: prev?.key || termKey(lang, x.ref),
    term: x.ref,
    f: prev?.f || '',
    d: prev?.d || x.note || '',
    w: prev?.w || '',
    region: x.region || prev?.region || '',
    lang,
    date: x.date || prev?.date || '',
    at: prev?.at || x.created_at || Date.now(),
  };
};

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [articles, setArticles] = useState<ArticleBookmark[]>([]);
  const [terms, setTerms] = useState<TermBookmark[]>([]);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [sync, setSync] = useState<SyncState>(Account.ACCOUNT_SYNC ? 'idle' : 'off');
  const [lastSync, setLastSync] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // refs mirror state so the async sync code always sees the latest lists
  const A = useRef<ArticleBookmark[]>([]);
  const T = useRef<TermBookmark[]>([]);
  const outbox = useRef<Op[]>([]);
  const userRef = useRef<AccountUser | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const putA = (list: ArticleBookmark[]) => {
    A.current = list;
    setArticles(list);
    AsyncStorage.setItem(KA, JSON.stringify(list)).catch(() => {});
  };
  const putT = (list: TermBookmark[]) => {
    T.current = list;
    setTerms(list);
    AsyncStorage.setItem(KT, JSON.stringify(list)).catch(() => {});
  };
  const putO = (list: Op[]) => {
    outbox.current = list;
    AsyncStorage.setItem(KO, JSON.stringify(list)).catch(() => {});
  };

  useEffect(() => {
    (async () => {
      try {
        const [[, a], [, t], [, o]] = await AsyncStorage.multiGet([KA, KT, KO]);
        if (a) putA(JSON.parse(a));
        if (t) putT(JSON.parse(t));
        if (o) outbox.current = JSON.parse(o);
      } catch {}
      const u = await Account.savedUser();
      userRef.current = u;
      setUser(u);
      setLoaded(true);
    })();
  }, []);

  /** Send queued changes, then pull the account list and reconcile. One run at a time; a request made
   *  while a run is in flight schedules one more run afterwards. */
  const runSync = useCallback(async (): Promise<void> => {
    if (!Account.ACCOUNT_SYNC || !userRef.current) return;
    if (running.current) {
      again.current = true;
      return running.current;
    }
    const once = async () => {
      const u = userRef.current;
      if (!u) return;
      setSync('syncing');
      try {
        while (outbox.current.length) {
          const op = outbox.current[0];
          if (op.m === 'POST') await Account.addBookmark(op.b);
          else await Account.deleteBookmark(op.b);
          putO(outbox.current.slice(1));
        }
        const items = await Account.listBookmarks();
        const firstMerge = (await AsyncStorage.getItem(KM).catch(() => null)) !== String(u.id);
        const server = new Set(items.map(sid));
        // changes made while the list was in flight are still in the outbox: keep them as they are locally
        const pending = new Set(outbox.current.map((o) => sid(o.b)));

        const prevA = new Map(A.current.map((a) => [aSid(a), a]));
        const prevT = new Map(T.current.map((t) => [tSid(t), t]));
        const nextA: ArticleBookmark[] = [];
        const nextT: TermBookmark[] = [];
        const upload: ServerBookmark[] = [];
        for (const x of items) {
          const k = sid(x);
          if (pending.has(k)) continue;
          if (x.kind === 'article') nextA.push(fromServerArticle(x, prevA.get(k)));
          else if (x.kind === 'term') nextT.push(fromServerTerm(x, prevT.get(k)));
        }
        for (const [k, a] of prevA) {
          if (server.has(k) && !pending.has(k)) continue;
          if (pending.has(k)) nextA.push(a);
          else if (firstMerge) {
            nextA.push(a); // made on the device before signing in: keep and upload
            upload.push(toServerArticle(a));
          }
        }
        for (const [k, t] of prevT) {
          if (server.has(k) && !pending.has(k)) continue;
          if (pending.has(k)) nextT.push(t);
          else if (firstMerge) {
            nextT.push(t);
            upload.push(toServerTerm(t));
          }
        }
        nextA.sort((a, b) => b.at - a.at);
        nextT.sort((a, b) => b.at - a.at);
        putA(nextA);
        putT(nextT);
        for (const b of upload) await Account.addBookmark(b);
        await AsyncStorage.setItem(KM, String(u.id)).catch(() => {});
        setLastSync(Date.now());
        setSync('idle');
      } catch (e) {
        if (e instanceof Account.AuthError) {
          // token revoked or expired: back to device-only bookmarks (nothing is deleted)
          userRef.current = null;
          setUser(null);
          await Account.signOut();
          setSync('idle');
        } else setSync('error'); // offline etc.: the outbox is retried on the next sync
      }
    };
    const job = (async () => {
      do {
        again.current = false;
        await once();
      } while (again.current && userRef.current);
    })();
    running.current = job;
    try {
      await job;
    } finally {
      running.current = null;
    }
  }, []);

  useEffect(() => {
    if (!loaded || !user) return;
    runSync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') runSync();
    });
    return () => sub.remove();
  }, [loaded, user, runSync]);

  const queue = useCallback(
    (op: Op) => {
      if (!userRef.current) return;
      // a POST followed by a DELETE of the same item (or the reverse) cancels out
      const k = sid(op.b);
      const rest = outbox.current.filter((o) => sid(o.b) !== k);
      putO(rest.length < outbox.current.length ? rest : [...outbox.current, op]);
      runSync();
    },
    [runSync],
  );

  const toggleArticle = useCallback(
    (b: Omit<ArticleBookmark, 'at'>) => {
      const on = A.current.some((x) => x.key === b.key);
      putA(on ? A.current.filter((x) => x.key !== b.key) : [{ ...b, at: Date.now() }, ...A.current]);
      queue({ m: on ? 'DELETE' : 'POST', b: toServerArticle(b) });
    },
    [queue],
  );
  const toggleTerm = useCallback(
    (b: Omit<TermBookmark, 'at'>) => {
      const on = T.current.some((x) => x.key === b.key);
      putT(on ? T.current.filter((x) => x.key !== b.key) : [{ ...b, at: Date.now() }, ...T.current]);
      queue({ m: on ? 'DELETE' : 'POST', b: toServerTerm(b) });
    },
    [queue],
  );
  const removeArticle = useCallback(
    (key: string) => {
      const a = A.current.find((x) => x.key === key);
      if (a) toggleArticle(a);
    },
    [toggleArticle],
  );
  const removeTerm = useCallback(
    (key: string) => {
      const t = T.current.find((x) => x.key === key);
      if (t) toggleTerm(t);
    },
    [toggleTerm],
  );

  const signIn = useCallback(async () => {
    if (!Account.ACCOUNT_SYNC) return;
    try {
      const u = await Account.signIn();
      if (!u) return; // cancelled
      putO([]); // the first sync merges the whole device list instead
      await AsyncStorage.removeItem(KM).catch(() => {});
      userRef.current = u;
      setUser(u);
    } catch {
      setSync('error');
    }
  }, []);

  const signOut = useCallback(async () => {
    userRef.current = null;
    setUser(null);
    putO([]);
    await AsyncStorage.removeItem(KM).catch(() => {});
    await Account.signOut();
    setSync(Account.ACCOUNT_SYNC ? 'idle' : 'off'); // bookmarks stay on the device
  }, []);

  const value = useMemo<Ctx>(() => {
    const a = new Set(articles.map((x) => x.key));
    const t = new Set(terms.map((x) => x.key));
    return {
      articles,
      terms,
      hasArticle: (k) => a.has(k),
      hasTerm: (k) => t.has(k),
      toggleArticle,
      toggleTerm,
      removeArticle,
      removeTerm,
      syncEnabled: Account.ACCOUNT_SYNC,
      user,
      sync,
      lastSync,
      signIn,
      signOut,
      syncNow: runSync,
    };
  }, [articles, terms, toggleArticle, toggleTerm, removeArticle, removeTerm, user, sync, lastSync, signIn, signOut, runSync]);

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmarks(): Ctx {
  const c = useContext(BookmarkContext);
  if (!c) throw new Error('BookmarkProvider missing');
  return c;
}
