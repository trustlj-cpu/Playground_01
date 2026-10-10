import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { strings } from '../i18n';
import { useColors } from '../lib/settings';
import { sans, serif } from '../lib/theme';
import type { Edition } from '../lib/types';
import BlockView from './BlockView';
import BreakingBar from './BreakingBar';
import Influencers from './Influencers';
import Masthead from './Masthead';
import StoryCard from './StoryCard';

interface Props {
  edition: Edition;
  refreshing: boolean;
  onRefresh: () => void;
  offline?: boolean;
  breakingPath?: string | null;
  onPlace?: () => void;
  header?: React.ReactNode;
}

export default function EditionView({ edition, refreshing, onRefresh, offline, breakingPath, onPlace, header }: Props) {
  const c = useColors();
  const S = strings(edition.lang);
  const stories = edition.stories.slice().sort((a, b) => a.rank - b.rank);
  const blocks = edition.blocks || [];
  let inflAt = blocks.findIndex((b) => b.type === 'next');
  if (inflAt < 0) inflAt = blocks.findIndex((b) => b.type === 'glos' || b.type === 'colophon');
  if (inflAt < 0) inflAt = blocks.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.mute} colors={[c.red]} progressBackgroundColor={c.paper2} />}
    >
      {header}
      <Masthead edition={edition} onPlace={onPlace} />
      {breakingPath ? <BreakingBar path={breakingPath} lang={edition.lang} /> : null}
      {offline ? <Text style={[sans(400), styles.offline, { color: c.mute }]}>{S.app.offline}</Text> : null}
      {stories.map((st, i) => (
        <View key={st.id} style={i ? [styles.rule, { borderTopColor: c.ink }] : null}>
          <StoryCard edition={edition} story={st} lead={i === 0} />
        </View>
      ))}
      <View style={[styles.rule, { borderTopColor: c.ink }]} />
      {blocks.map((b, i) => (
        <React.Fragment key={i}>
          {i === inflAt ? <Influencers items={edition.influencers || []} lang={edition.lang} /> : null}
          <BlockView block={b} lang={edition.lang} />
        </React.Fragment>
      ))}
      {inflAt >= blocks.length ? <Influencers items={edition.influencers || []} lang={edition.lang} /> : null}
      {!!edition.mast.house && (
        <Text style={[serif(edition.lang), styles.house, { color: c.ink, borderColor: c.ink }]}>{edition.mast.house}</Text>
      )}
    </ScrollView>
  );
}

export function Loading({ lang }: { lang: string }) {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.paper }]}>
      <ActivityIndicator color={c.mute} />
      <Text style={[sans(400), { color: c.mute, marginTop: 10, fontSize: 13 }]}>{strings(lang).app.loading}</Text>
    </View>
  );
}

export function Failed({ lang, onRetry, notCached }: { lang: string; onRetry: () => void; notCached?: boolean }) {
  const c = useColors();
  const A = strings(lang).app;
  return (
    <View style={[styles.center, { backgroundColor: c.paper }]}>
      <Text style={[serif(lang), { color: c.ink, fontSize: 15, textAlign: 'center', lineHeight: 22 }]}>{notCached ? A.notCached : A.loadFail}</Text>
      <Pressable onPress={onRetry} style={[styles.btn, { borderColor: c.ink }]} accessibilityRole="button">
        <Text style={[sans(600), { color: c.ink, letterSpacing: 1, fontSize: 13 }]}>{A.retry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  rule: { borderTopWidth: 1 },
  offline: { fontSize: 11, textAlign: 'center', paddingTop: 6 },
  house: { marginTop: 14, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 10, textAlign: 'center', fontStyle: 'italic', fontSize: 12, letterSpacing: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  btn: { marginTop: 16, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 10 },
});
