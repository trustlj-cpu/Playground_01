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
import type { AccountUser } from './account';
import {
  type ArticleBookmark,
  enqueue,
  type Op,
  parseArticles,
  parseOutbox,
  parseTerms,
  reconcile,
  type TermBookmark,
  toServerArticle,
  toServerTerm,
} from './bookmarkSync';
import { warnWrite } from './cacheStore';

export type { ArticleBookmark, TermBookmark } from './bookmarkSync';
export { articleKey, termKey, webPath } from './bookmarkSync';

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
  const sending = useRef<Op | null>(null); // outbox op whose request is in flight
  const again = useRef(false);

  const putA = (list: ArticleBookmark[]) => {
    A.current = list;
    setArticles(list);
    AsyncStorage.setItem(KA, JSON.stringify(list)).catch(warnWrite('bookmarks'));
  };
  const putT = (list: TermBookmark[]) => {
    T.current = list;
    setTerms(list);
    AsyncStorage.setItem(KT, JSON.stringify(list)).catch(warnWrite('term bookmarks'));
  };
  const putO = (list: Op[]) => {
    outbox.current = list;
    AsyncStorage.setItem(KO, JSON.stringify(list)).catch(warnWrite('sync outbox'));
  };

  useEffect(() => {
    (async () => {
      try {
        const [[, a], [, t], [, o]] = await AsyncStorage.multiGet([KA, KT, KO]);
        // a bookmark tapped in the moment before storage was read is kept on top of the stored list
        const merge = <X extends { key: string }>(stored: X[] | null, now: X[]) => (stored ? [...now, ...stored.filter((x) => !now.some((y) => y.key === x.key))] : now);
        putA(merge(parseArticles(a), A.current));
        putT(merge(parseTerms(t), T.current));
        outbox.current = [...parseOutbox(o), ...outbox.current];
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
          sending.current = op;
          try {
            if (op.m === 'POST') await Account.addBookmark(op.b);
            else await Account.deleteBookmark(op.b);
          } catch (e) {
            // rejected for good (e.g. 400/404/409): drop it instead of blocking every later change forever
            if (!(e instanceof Account.ApiError && e.permanent)) throw e;
          } finally {
            sending.current = null;
          }
          // remove exactly this op: while it was in flight the outbox may have changed around it
          putO(outbox.current.filter((o) => o !== op));
        }
        const items = await Account.listBookmarks();
        const firstMerge = (await AsyncStorage.getItem(KM).catch(() => null)) !== String(u.id);
        // changes made while the list was in flight are still in the outbox: keep them as they are locally
        const r = reconcile(items, A.current, T.current, outbox.current, firstMerge);
        putA(r.articles);
        putT(r.terms);
        for (const b of r.upload) {
          try {
            await Account.addBookmark(b);
          } catch (e) {
            if (!(e instanceof Account.ApiError && e.permanent)) throw e;
          }
        }
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
      putO(enqueue(outbox.current, op, sending.current));
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
