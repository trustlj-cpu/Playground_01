// Home: top menu row (Latest · Past editions · Region/Language), masthead, breaking ticker and the
// front page as a focusable grid — lead story large on the left, the others as cards.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Logo from '../components/Logo';
import Masthead from '../components/Masthead';
import StoryCard from '../components/StoryCard';
import Ticker from '../components/Ticker';
import { langName } from '../shared/i18n';
import { sans, serif } from '../shared/theme';
import type { BreakingItem, Edition } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useTV } from '../tv/scale';
import { htmlParas } from './Reader';

export const SKIP_BLOCKS = new Set(['glos', 'colophon']);

function MenuItem({ label, on, onPress, onFocus, autoFocus, testID }: { label: string; on?: boolean; onPress: () => void; onFocus?: () => void; autoFocus?: boolean; testID?: string }) {
  const c = useColors();
  const { u } = useTV();
  return (
    <Focusable onPress={onPress} onFocus={onFocus} autoFocus={autoFocus} radius={30 * u} scale={1.06} testID={testID} style={{ paddingHorizontal: 28 * u, paddingVertical: 10 * u, backgroundColor: on ? c.ink : 'transparent', borderWidth: Math.max(1, 1.5 * u), borderColor: on ? c.ink : c.rule2 }}>
      <Text style={[sans(on ? 700 : 600), { fontSize: 24 * u, color: on ? c.paper : c.ink }]}>{label}</Text>
    </Focusable>
  );
}

export interface HomeProps {
  edition: Edition | null;
  region: string;
  lang: string;
  status: string;
  error: boolean;
  breaking: BreakingItem[];
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

export default function Home(p: HomeProps) {
  const c = useColors();
  const { u, W, padX, padY } = useTV();
  const ed = p.edition;
  const lang = ed?.lang || p.lang;
  const S = tvStrings(lang);
  const CW = W - 2 * padX;
  const gap = 28 * u;
  const leadW = Math.round(CW * 0.44);
  const rightW = CW - leadW - gap;
  const cardW2 = (rightW - gap) / 2;
  const cardH = 300 * u;
  const cardW4 = (CW - 3 * gap) / 4;
  const stories = ed?.stories || [];
  const lead = stories[0];
  const right = stories.slice(1, 5);
  const rest = stories.slice(5);
  const blocks = (ed?.blocks || []).map((b, i) => ({ b, i })).filter(({ b }) => !SKIP_BLOCKS.has(b.type) && (b.title || b.html));
  const want = p.focusKey || (lead ? 'story-' + lead.id : 'menu-latest');
  const af = (k: string) => p.canFocus && want === k;
  const card = (id: string, isLead: boolean, w: number, h: number) => {
    const s = stories.find((x) => x.id === id)!;
    return (
      <View key={id} style={{ width: w }}>
        <StoryCard story={s} lang={lang} lead={isLead} height={h} autoFocus={af('story-' + id)} onFocus={() => p.onFocusKey('story-' + id)} onPress={() => p.onStory(id)} />
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingHorizontal: padX, paddingTop: padY, paddingBottom: padY + 40 * u }} showsVerticalScrollIndicator={false} testID="home">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 * u, marginBottom: 22 * u }}>
        <MenuItem label={S.latest} on={!p.pastNo} onPress={p.onLatest} testID="menu-latest" autoFocus={af('menu-latest')} onFocus={() => p.onFocusKey('menu-latest')} />
        <MenuItem label={S.archive} onPress={p.onPast} testID="menu-past" autoFocus={af('menu-past')} onFocus={() => p.onFocusKey('menu-past')} />
        <MenuItem label={`${S.settings} · ${p.region} · ${langName(p.lang)}`} onPress={p.onSettings} testID="menu-settings" autoFocus={af('menu-settings')} onFocus={() => p.onFocusKey('menu-settings')} />
        <View style={{ flex: 1 }} />
        {!!p.status && <Text style={[sans(400), { fontSize: 20 * u, color: c.mute }]}>{p.status}</Text>}
      </View>

      {!!p.pastNo && (
        <View style={{ backgroundColor: c.red, borderRadius: 6 * u, paddingHorizontal: 22 * u, paddingVertical: 10 * u, marginBottom: 18 * u }}>
          <Text style={[sans(700), { fontSize: 22 * u, color: c.paper }]}>{S.tv.viewingPast.replace('{n}', String(p.pastNo))}</Text>
        </View>
      )}

      {!ed ? (
        <View style={{ alignItems: 'center', paddingTop: 160 * u, gap: 30 * u }}>
          <Logo width={440 * u} />
          <Text style={[serif(lang), { fontSize: 30 * u, color: c.ink2 }]}>{p.error ? S.app.loadFail : S.app.loading}</Text>
          {p.error && (
            <MenuItem label={S.app.retry} onPress={p.onRetry} autoFocus={p.canFocus} testID="retry" />
          )}
        </View>
      ) : (
        <>
          <Masthead edition={ed} />
          <View style={{ marginTop: 6 * u }}>
            <Ticker items={p.breaking} lang={lang} onOpen={p.onBreaking} />
          </View>
          <View style={{ flexDirection: 'row', gap, marginTop: 34 * u }}>
            {lead && card(lead.id, true, leadW, cardH * 2 + gap)}
            <View style={{ width: rightW, flexDirection: 'row', flexWrap: 'wrap', gap }}>{right.map((s) => card(s.id, false, cardW2, cardH))}</View>
          </View>
          {rest.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, marginTop: gap }}>{rest.map((s) => card(s.id, false, cardW4, cardH))}</View>}
          {blocks.length > 0 && (
            <>
              <Text style={[sans(700), { fontSize: 22 * u, letterSpacing: 2 * u, color: c.mute, marginTop: 48 * u, marginBottom: 16 * u, borderTopWidth: Math.max(1, 2 * u), borderTopColor: c.rule, paddingTop: 14 * u }]}>
                {S.tv.more.toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                {blocks.map(({ b, i }) => (
                  <View key={i} style={{ width: cardW4 }}>
                    <Focusable onPress={() => p.onBlock(i)} autoFocus={af('block-' + i)} onFocus={() => p.onFocusKey('block-' + i)} radius={8 * u} testID={'block-' + i} style={{ height: 200 * u, padding: 22 * u, backgroundColor: c.paper2, borderWidth: Math.max(1, 1.5 * u), borderColor: c.rule2, overflow: 'hidden' }}>
                      <Text style={[serif(lang, 700), { fontSize: 28 * u, color: c.head }]} numberOfLines={1}>
                        {b.title || b.type}
                      </Text>
                      <Text style={[serif(lang), { fontSize: 22 * u, lineHeight: 33 * u, color: c.ink2, marginTop: 8 * u }]} numberOfLines={3}>
                        {htmlParas(b.html).join('  ')}
                      </Text>
                    </Focusable>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
