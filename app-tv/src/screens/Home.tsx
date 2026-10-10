// Home = the web front page (site/build.js NAV + edition sheet + nyt.css), scaled uniformly (tv/web.ts):
// top menu (.dd-nav), masthead + dateline + market tape, breaking bar (.brk), then the six-column grid —
// lead story (c3, h2, deck, two-column body) | second story (c2) | "Inside" index (c1) — further stories,
// the edition's boxes (.fill / .rumor / .next) and the colophon. Only the remote mechanics are TV's own:
// every story, index item and box is focusable (web keyboard focus outline) and OK opens it.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Logo from '../components/Logo';
import Masthead from '../components/Masthead';
import Ticker from '../components/Ticker';
import { deckStyle, hlStyle, Kick, Paras, Termed, WebBlock } from '../components/WebParts';
import { kickText } from '../components/WebParts';
import { uiText } from '../shared/i18n';
import { sans, serif } from '../shared/theme';
import type { Block, Edition, Story } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useWeb } from '../tv/web';

export const SKIP_BLOCKS = new Set(['glos', 'colophon']);
const INDEX_N = 5; // stories 3–7 in the right-hand index column, as on the web

export interface HomeProps {
  edition: Edition | null;
  region: string;
  lang: string;
  status: string;
  error: boolean;
  /** a past edition is requested but not on this device and the network is down */
  offlineNotCached?: boolean;
  newEditionNo?: number | null;
  onNewEdition?: () => void;
  pastNo: number | null;
  focusKey: string | null;
  canFocus: boolean;
  onFocusKey: (k: string) => void;
  onStory: (id: string) => void;
  onBlock: (i: number) => void;
  onBreaking: () => void;
  onLatest: () => void;
  onPast: () => void;
  onSettings: () => void;
  onRetry: () => void;
}

/** .dd-nav: serif 12.5px, letter-spacing .06em, links 16px apart (8px 4px padding), current one underlined */
function Nav(p: HomeProps & { af: (k: string) => boolean }) {
  const c = useColors();
  const w = useWeb();
  const lang = p.edition?.lang || p.lang;
  const S = tvStrings(lang);
  const f = w.fs(12.5);
  const link = (key: string, label: string, onPress: () => void, current?: boolean) => (
    <Focusable key={key} testID={key} onPress={onPress} autoFocus={p.af(key)} onFocus={() => p.onFocusKey(key)} style={{ paddingVertical: w.px(8), paddingHorizontal: w.px(4) }}>
      <Text style={[serif(lang, current ? 700 : 400), { fontSize: f, letterSpacing: w.ls(0.06, f), color: c.ink }, current && { textDecorationLine: 'underline' }]}>{label}</Text>
    </Focusable>
  );
  const lf = w.fs(10);
  return (
    <View testID="nav" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: w.px(1), paddingHorizontal: w.px(12), borderBottomWidth: w.hair, borderBottomColor: c.rule, gap: w.px(12) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: w.px(16) - w.px(8) }}>
        {link('menu-latest', S.latest, p.onLatest, !p.pastNo)}
        {link('menu-past', S.archive, p.onPast, !!p.pastNo)}
        {link('menu-settings', S.settings, p.onSettings)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: w.px(10) }}>
        {!!p.status && <Text style={[sans(400), { fontSize: w.fs(13), color: c.mute }]}>{p.status}</Text>}
        {!!p.newEditionNo && (
          // a new edition arrived while reading: the web's .house label style (red text, 1 px red border)
          <Focusable testID="menu-new" onPress={p.onNewEdition!} autoFocus={p.af('menu-new')} onFocus={() => p.onFocusKey('menu-new')}>
            <Text style={[sans(400), { fontSize: w.fs(12), letterSpacing: w.ls(0.04, w.fs(12)), color: c.red, borderWidth: w.hair, borderColor: c.red, paddingVertical: w.px(7), paddingHorizontal: w.px(10) }]}>
              {S.tv.newEdition.replace('{n}', String(p.newEditionNo))}
            </Text>
          </Focusable>
        )}
        {/* .dd-lang summary{border:1px solid var(--rule);padding:3px 5px;font-size:10px;letter-spacing:.06em;opacity:.85} + ' ▾' */}
        <Focusable testID="menu-lang" onPress={p.onSettings} autoFocus={p.af('menu-lang')} onFocus={() => p.onFocusKey('menu-lang')}>
          <Text style={[serif(lang), { fontSize: lf, letterSpacing: w.ls(0.06, lf), color: c.ink, opacity: 0.85, borderWidth: w.hair, borderColor: c.rule, paddingVertical: w.px(3), paddingHorizontal: w.px(5) }]}>
            {uiText(lang, 'langcode') || lang.toUpperCase()} ▾
          </Text>
        </Focusable>
      </View>
    </View>
  );
}

export default function Home(p: HomeProps) {
  const c = useColors();
  const w = useWeb();
  const ed = p.edition;
  const lang = ed?.lang || p.lang;
  const S = tvStrings(lang);
  const g = w.px(22);
  const col = (w.CW - 5 * g) / 6;
  const span = (n: number) => n * col + (n - 1) * g;
  const stories = ed?.stories || [];
  const lead = stories[0];
  const second = stories[1];
  const index = stories.slice(2, 2 + INDEX_N);
  const rest = stories.slice(2 + INDEX_N);
  const allBlocks = (ed?.blocks || []).map((b, i) => ({ b, i }));
  const nums = allBlocks.find(({ b }) => b.type === 'nums');
  const word = allBlocks.find(({ b }) => b.type === 'fill' && /^<b>/.test(b.html.trim()));
  const boxes = allBlocks.filter(({ b }) => !SKIP_BLOCKS.has(b.type) && b !== nums?.b && b !== word?.b && (b.title || b.html));
  const colophon = allBlocks.find(({ b }) => b.type === 'colophon');

  const want = p.focusKey || (lead ? 'story-' + lead.id : !ed && p.error ? 'retry' : 'menu-latest'); // one initial focus only
  const af = (k: string) => p.canFocus && want === k;
  const used = new Set<string>(); // glossary terms: first occurrence on the page
  const vr = { borderLeftWidth: w.hair, borderLeftColor: c.rule2, paddingLeft: g - w.hair, marginLeft: -g / 2, width: undefined as number | undefined };

  const storyCol = (s: Story, big: boolean, width: number, isVr: boolean, fill?: { b: Block }, twoCols?: boolean) => (
    <View key={s.id} style={[{ width: isVr ? width + g / 2 : width }, isVr && vr]}>
      <Focusable testID={'story-' + s.id} label={s.hl} autoFocus={af('story-' + s.id)} onFocus={() => p.onFocusKey('story-' + s.id)} onPress={() => p.onStory(s.id)}>
        <Kick kick={s.kick} lang={lang} />
        <Termed text={s.hl} glossary={ed?.glossary} used={used} style={hlStyle(w, lang, big, c.head)} />
        {!!s.dek && <Termed text={s.dek} glossary={ed?.glossary} used={used} style={deckStyle(w, lang, c.ink2)} />}
        <Paras paras={s.body || []} lang={lang} glossary={ed?.glossary} used={used} cols={twoCols ? 2 : 1} />
      </Focusable>
      {fill && (
        // .fill{margin-top:14px;padding-top:12px;border-top:1px solid var(--rule-2)}
        <View style={{ marginTop: w.px(14), paddingTop: w.px(12), borderTopWidth: w.hair, borderTopColor: c.rule2 }}>
          <WebBlock block={fill.b} lang={lang} />
        </View>
      )}
    </View>
  );

  const ruleH = <View style={{ borderTopWidth: w.hair, borderTopColor: c.ink, marginTop: w.px(14), marginBottom: w.px(12) }} />;
  const pairs = <T,>(xs: T[]) => xs.reduce<T[][]>((a, x, i) => (i % 2 ? a[a.length - 1].push(x) : a.push([x]), a), []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingHorizontal: w.padX, paddingTop: w.padY, paddingBottom: w.padY + w.px(40) }} showsVerticalScrollIndicator={false} testID="home">
      <Nav {...p} af={af} />

      {!!p.pastNo && (
        // past edition notice in the web's .house style
        <Text style={[sans(400), { fontSize: w.fs(12), letterSpacing: w.ls(0.04, w.fs(12)), color: c.red, borderWidth: w.hair, borderColor: c.red, paddingVertical: w.px(7), paddingHorizontal: w.px(10), textAlign: 'center', marginTop: w.px(10) }]} testID="past-notice">
          {S.tv.viewingPast.replace('{n}', String(p.pastNo))}
        </Text>
      )}

      {!ed ? (
        <View style={{ alignItems: 'center', paddingTop: w.px(80), gap: w.px(16) }}>
          <Logo width={w.px(330)} />
          <Text style={[serif(lang), { fontSize: w.fs(15), color: c.ink2, textAlign: 'center' }]} testID="home-status">
            {p.offlineNotCached ? S.app.notCached : p.error ? S.app.loadFail : S.app.loading}
          </Text>
          {p.error && (
            // web button (settings .tsize button): 1 px ink border, 12px, padding 4px 10px
            <Focusable onPress={p.onRetry} autoFocus={af('retry')} onFocus={() => p.onFocusKey('retry')} testID="retry">
              <Text style={[sans(400), { fontSize: w.fs(12), color: c.ink, borderWidth: w.hair, borderColor: c.ink, paddingVertical: w.px(4), paddingHorizontal: w.px(10) }]}>{S.app.retry}</Text>
            </Focusable>
          )}
        </View>
      ) : (
        <>
          <View style={{ marginTop: w.px(10) }}>
            <Masthead edition={ed} onRegion={p.onSettings} regionAutoFocus={af('dateline-region')} onRegionFocus={() => p.onFocusKey('dateline-region')} />
          </View>
          <Ticker lang={lang} onOpen={p.onBreaking} autoFocus={af('ticker')} onFocus={() => p.onFocusKey('ticker')} />

          {/* .grid{grid-template-columns:repeat(6,1fr);gap:0 22px;margin-top:12px} */}
          <View style={{ flexDirection: 'row', gap: g, marginTop: w.px(12), alignItems: 'flex-start' }}>
            {lead && storyCol(lead, true, span(3), false, nums, true)}
            {second && storyCol(second, false, span(2), true, word)}
            {index.length > 0 && (
              <View style={[{ width: span(1) + g / 2 }, vr]} testID="index">
                <View style={{ borderBottomWidth: w.hair, borderBottomColor: c.ink, paddingBottom: w.px(3), marginBottom: w.px(8) }}>
                  <Text style={[serif(lang, 700), { fontSize: w.fs(11.5), letterSpacing: w.ls(0.14, w.fs(11.5)), color: c.ink }]}>{S.tv.inside}</Text>
                </View>
                {index.map((s, i) => (
                  <Focusable key={s.id} testID={'story-' + s.id} label={s.hl} autoFocus={af('story-' + s.id)} onFocus={() => p.onFocusKey('story-' + s.id)} onPress={() => p.onStory(s.id)}>
                    {/* .index .it{padding:8px 0;border-bottom:1px dotted var(--rule-2)} b{15.5px/1.35} em{sans 12.5px/1.5 ink-2} span{sans 11.5px mute} */}
                    <View style={[{ paddingVertical: w.px(8) }, i < index.length - 1 && { borderBottomWidth: w.hair, borderStyle: 'dotted', borderBottomColor: c.rule2 }]}>
                      <Text style={[serif(lang, 700), { fontSize: w.fs(15.5), lineHeight: w.fs(15.5) * 1.35, letterSpacing: w.ls(-0.02, w.fs(15.5)), color: c.head }]}>{s.hl}</Text>
                      {!!s.dek && <Text style={[sans(400), { fontSize: w.fs(12.5), lineHeight: w.fs(12.5) * 1.5, color: c.ink2, marginTop: w.px(4), marginBottom: w.px(3) }]}>{s.dek}</Text>}
                      <Text style={[sans(400), { fontSize: w.fs(11.5), color: c.mute }]}>{s.kick}</Text>
                    </View>
                  </Focusable>
                ))}
              </View>
            )}
          </View>

          {pairs(rest).map((row, r) => (
            <React.Fragment key={'r' + r}>
              {ruleH}
              <View style={{ flexDirection: 'row', gap: g, alignItems: 'flex-start' }}>{row.map((s, i) => storyCol(s, false, span(3), i > 0))}</View>
            </React.Fragment>
          ))}

          {pairs(boxes).map((row, r) => (
            <React.Fragment key={'b' + r}>
              {ruleH}
              <View style={{ flexDirection: 'row', gap: g, alignItems: 'flex-start' }}>
                {row.map(({ b, i }, k) => (
                  <View key={i} style={[{ width: k ? span(3) + g / 2 : span(3) }, k > 0 && vr]}>
                    <Focusable onPress={() => p.onBlock(i)} autoFocus={af('block-' + i)} onFocus={() => p.onFocusKey('block-' + i)} testID={'block-' + i}>
                      <WebBlock block={b} lang={lang} />
                    </Focusable>
                  </View>
                ))}
              </View>
            </React.Fragment>
          ))}

          {colophon && (
            // nyt.css .colophon{border-top:1px solid var(--ink);margin-top:16px;padding-top:6px;font:11px serif;letter-spacing:.04em;color:var(--ink-2)}
            <View style={{ borderTopWidth: w.hair, borderTopColor: c.ink, marginTop: w.px(16), paddingTop: w.px(6), flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: w.px(6) }}>
              {colophonParts(colophon.b.html).map((t, i) => (
                <Text key={i} style={[serif(lang), { fontSize: w.fs(11), letterSpacing: w.ls(0.04, w.fs(11)), color: c.ink2 }]}>
                  {t}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function colophonParts(html: string): string[] {
  return (html.match(/<span>([\s\S]*?)<\/span>/g) || [html]).map((s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()).filter(Boolean);
}

export { kickText };
