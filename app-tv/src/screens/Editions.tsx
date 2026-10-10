// Past editions of the selected region as a focusable grid; OK opens that edition on Home.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { langName } from '../shared/i18n';
import { regionName } from '../shared/content';
import { sans, serif } from '../shared/theme';
import type { Region } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useBack } from '../tv/remote';
import { useTV } from '../tv/scale';

export function longDate(date: string, lang: string) {
  try {
    return new Date(date + 'T12:00:00Z').toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' });
  } catch {
    return date;
  }
}

export default function Editions({ region, lang, current, onPick, onClose }: { region: Region; lang: string; current: string; onPick: (date: string) => void; onClose: () => void }) {
  const c = useColors();
  const { u, padX, padY } = useTV();
  const S = tvStrings(lang);
  useBack(() => {
    onClose();
    return true;
  });
  const cols = 3;
  const gap = 28 * u;
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }} testID="editions">
      <ScrollView contentContainerStyle={{ paddingHorizontal: padX, paddingTop: padY, paddingBottom: padY + 40 * u }}>
        <Text style={[sans(700), { fontSize: 24 * u, letterSpacing: 2 * u, color: c.red }]}>{regionName(region, lang).toUpperCase()}</Text>
        <Text style={[serif(lang, 700), { fontSize: 64 * u, color: c.head, marginTop: 6 * u, marginBottom: 36 * u }]}>{S.archive}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {region.editions.map((e, i) => {
            const isLatest = e.date === region.latest.date;
            return (
              <View key={e.date} style={{ width: `${(100 - 2) / cols}%` as any }}>
                <Focusable
                  autoFocus={e.date === current || (!region.editions.some((x) => x.date === current) && i === 0)}
                  onPress={() => onPick(e.date)}
                  radius={10 * u}
                  testID={'edition-' + e.date}
                  style={{ padding: 30 * u, minHeight: 190 * u, backgroundColor: c.paper2, borderWidth: Math.max(1, 1.5 * u), borderColor: e.date === current ? c.red : c.rule2 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 * u }}>
                    <Text style={[serif(lang, 700), { fontSize: 44 * u, color: c.head }]}>{S.app.edNo.replace('{n}', String(e.no))}</Text>
                    {isLatest && (
                      <Text style={[sans(700), { fontSize: 18 * u, letterSpacing: 1.4 * u, color: c.paper, backgroundColor: c.red, paddingHorizontal: 10 * u, paddingVertical: 3 * u, borderRadius: 4 * u, overflow: 'hidden' }]}>
                        {S.tv.latestTag.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={[serif(lang), { fontSize: 28 * u, color: c.ink, marginTop: 10 * u }]}>{longDate(e.date, lang)}</Text>
                  <Text style={[sans(400), { fontSize: 21 * u, color: c.mute, marginTop: 10 * u }]}>{e.langs.map(langName).join(' · ')}</Text>
                </Focusable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
