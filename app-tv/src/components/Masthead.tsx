// Masthead exactly as the web front page (site/nyt.css): blackletter wordmark (560 px, no ears beside it),
// the dateline between two 1 px rules (© · ▼ region, date · edition No. + morning edition time) and the
// market tape (.tape) under it. Sizes are web CSS px scaled by tv/web.ts.
import React, { useRef } from 'react';
import { Text, View } from 'react-native';
import { useColors } from '../settings';
import { uiText } from '../shared/i18n';
import { setIntroTarget } from '../shared/introTarget';
import { serif } from '../shared/theme';
import type { Edition } from '../shared/types';
import Focusable from '../tv/Focusable';
import { useWeb } from '../tv/web';
import Logo from './Logo';

export const MAST_LOGO_W = 560; // web: .mast h1{width:min(560px,78vw)}

/** "6,625.93 코스피 · 10/8 종가 · −2.62% · …" → tape cell (name, value, arrow, change), as the web's .tape .q */
export function tapeQuote(ear: string): { b: string; em: string; u: string; i: string } {
  const [head, ...rest] = ear.split(' · ');
  const m = head.match(/^(\S+)\s+(.+)$/);
  const em = m ? m[1] : head;
  const b = m ? m[2] : '';
  let u = '';
  let i = '';
  for (const r of rest) {
    const pct = r.match(/^([−+\-–]?)\s*(\d[\d.,]*%)$/);
    if (pct) {
      u = pct[1] === '+' || !pct[1] ? '▲' : '▼';
      i = pct[2];
      break;
    }
    const mv = r.match(/^(\d[\d.,]*\S*)\s+(하락|상승|down|up)$/i);
    if (mv) {
      u = /하락|down/i.test(mv[2]) ? '▼' : '▲';
      i = mv[1];
      break;
    }
  }
  return { b, em, u, i };
}

export default function Masthead({ edition, onRegion, onRegionFocus, regionAutoFocus }: { edition: Edition; onRegion?: () => void; onRegionFocus?: () => void; regionAutoFocus?: boolean }) {
  const c = useColors();
  const w = useWeb();
  const lang = edition.lang;
  const m = edition.mast;
  const edShort = (uiText(lang, 'editionShort') || m.label).replace('{n}', String(edition.no));
  const ears = (m.ears || []).filter((e) => typeof e === 'string');
  const logoRef = useRef<View>(null);
  // the opening animation rises into this wordmark
  const report = () =>
    setIntroTarget(
      () =>
        new Promise((done) => {
          const v = logoRef.current;
          if (!v) return done(null);
          v.measureInWindow((x, y, wd, h) => done(wd > 0 ? { x, y, width: wd, height: h } : null));
        }),
    );
  const ruleC = c.dark ? c.rule : c.ink; // nyt.css: .dateline border ink; dark → var(--rule)
  const [place, ...dateParts] = m.dateline.split(', ');
  const f1 = w.fs(10.5);
  const fb = w.fs(12.5);
  return (
    <View>
      {/* .ears{padding:0 0 10px} .mast h1{width:560px;margin:6px auto 0} */}
      <View style={{ alignItems: 'center', paddingBottom: w.px(10) }}>
        <View ref={logoRef} onLayout={report} collapsable={false} style={{ marginTop: w.px(6) }}>
          <Logo width={w.px(MAST_LOGO_W)} />
        </View>
      </View>
      {/* .dateline{border-top/bottom:1px;padding:5px 2px;font:11.5px serif;letter-spacing:.06em;align-items:baseline} */}
      <View testID="dateline" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: w.hair, borderBottomWidth: w.hair, borderColor: ruleC, paddingVertical: w.px(5), paddingHorizontal: w.px(2) }}>
        <Text style={[serif(lang), { fontSize: f1, letterSpacing: w.ls(0.02, f1), color: c.ink2, flex: 1 }]} numberOfLines={1}>
          © {edition.date.slice(0, 4)} DailyDrop
        </Text>
        {/* web: <details class="dd-ed"><summary>▼ region</summary> — the edition switcher */}
        <Focusable onPress={onRegion} onFocus={onRegionFocus} autoFocus={regionAutoFocus} testID="dateline-region" label={place}>
          <Text style={[serif(lang, 700), { fontSize: fb, letterSpacing: w.ls(0.1, fb), color: c.ink }]} numberOfLines={1}>
            ▼ {place}
            {dateParts.length ? ', ' + dateParts.join(', ') : ''}
          </Text>
        </Focusable>
        <Text style={[serif(lang), { fontSize: w.fs(11), color: c.ink2, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
          {edShort} {m.time}
        </Text>
      </View>
      {ears.length > 0 && (
        // .tape{display:flex;justify-content:space-between;border-bottom:1px solid var(--rule-2) (dark: --rule);padding:6px 2px 5px;font:12px serif}
        <View testID="tape" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', borderBottomWidth: w.hair, borderBottomColor: c.dark ? c.rule : c.rule2, paddingTop: w.px(6), paddingBottom: w.px(5), paddingHorizontal: w.px(2), columnGap: w.px(12), rowGap: w.px(4) }}>
          {ears.map((e, n) => {
            const q = tapeQuote(e);
            return (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'baseline', gap: w.px(6) }} testID={'tape-' + n}>
                <Text style={[serif(lang, 700), { fontSize: w.fs(11), letterSpacing: w.ls(0.02, w.fs(11)), color: c.ink }]}>{q.b}</Text>
                <Text style={[serif(lang, 700), { fontSize: w.fs(13), color: c.ink, fontVariant: ['tabular-nums'] }]}>{q.em}</Text>
                {!!q.i && (
                  <Text style={[serif(lang), { fontSize: w.fs(11), color: c.ink2, fontVariant: ['tabular-nums'] }]}>
                    {q.u} {q.i}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
