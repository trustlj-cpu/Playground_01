// Past editions = the web archive page (site/build.js /archive/: h1 + .card per edition, BASECSS),
// laid out as a 3-column grid for the D-pad. OK opens that edition on Home.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { langName } from '../shared/i18n';
import { regionName } from '../shared/content';
import { sans, serif } from '../shared/theme';
import type { Region } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { cellWidth } from '../tv/grid';
import { useBack } from '../tv/remote';
import { useWeb } from '../tv/web';

export function longDate(date: string, lang: string) {
  try {
    return new Date(date + 'T12:00:00Z').toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' });
  } catch {
    return date;
  }
}

export const EDITION_COLS = 3;

export default function Editions({ region, lang, current, latest, onPick, onClose }: { region: Region; lang: string; current: string; latest?: string; onPick: (date: string) => void; onClose: () => void }) {
  const c = useColors();
  const w = useWeb();
  const S = tvStrings(lang);
  useBack(() => {
    onClose();
    return true;
  });
  const gap = w.px(14); // .card{margin:14px 0}
  const ring = w.px(4) + Math.max(2, w.px(2));
  const cellW = cellWidth(w.CW - 2 * ring, EDITION_COLS, gap); // exact pixels: 3 cells + 2 gaps never wrap
  const fb = w.fs(19);
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }} testID="editions">
      <ScrollView contentContainerStyle={{ paddingHorizontal: w.padX + ring, paddingTop: w.padY, paddingBottom: w.padY + w.px(40) }}>
        {/* main h1{font-size:30px;font-weight:900;letter-spacing:-.03em;line-height:1.25;margin:0 0 6px} */}
        <Text style={[serif(lang, 700), { fontSize: w.fs(30), letterSpacing: w.ls(-0.03, w.fs(30)), lineHeight: w.fs(30) * 1.25, color: c.head, marginBottom: w.px(6) }]}>{S.archive}</Text>
        <Text style={[sans(400), { fontSize: w.fs(13), color: c.mute, marginBottom: w.px(14) }]}>{regionName(region, lang)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }} testID="editions-grid">
          {region.editions.map((e, i) => {
            const isLatest = e.date === (latest || region.latest.date);
            return (
              <View key={e.date} style={{ width: cellW }}>
                <Focusable
                  autoFocus={e.date === current || (!region.editions.some((x) => x.date === current) && i === 0)}
                  onPress={() => onPick(e.date)}
                  testID={'edition-' + e.date}
                  // .card{border:1px solid var(--rule);padding:16px 18px;background:rgba(0,0,0,.02)} :hover{border-color:var(--red)}
                  style={{ paddingVertical: w.px(16), paddingHorizontal: w.px(18), backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: w.hair, borderColor: e.date === current ? c.red : c.rule3 }}
                >
                  <Text style={[serif(lang, 700), { fontSize: fb, color: c.head, marginBottom: w.px(4) }]}>
                    {S.app.edNo.replace('{n}', String(e.no))}
                    {isLatest ? ' · ' + S.latest : ''}
                  </Text>
                  {/* .cdt{font-size:.8em;font-weight:400;margin-top:2px;opacity:.85} */}
                  <Text style={[serif(lang), { fontSize: w.fs(19 * 0.8), color: c.ink, opacity: 0.85, marginTop: w.px(2) }]}>{longDate(e.date, lang)}</Text>
                  <Text style={[sans(400), { fontSize: w.fs(13), color: c.mute, marginTop: w.px(4) }]}>{e.langs.map(langName).join(' · ')}</Text>
                </Focusable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
