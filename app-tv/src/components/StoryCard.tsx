// Front-page story as a focusable card. The lead story is large (headline, dek and the first paragraph).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { para, sans, serif } from '../shared/theme';
import type { Story } from '../shared/types';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useTV } from '../tv/scale';

export function kickText(k: string) {
  return (k || '').split(' · ')[0];
}

export default function StoryCard({ story, lang, lead, height, onPress, onFocus, autoFocus }: { story: Story; lang: string; lead?: boolean; height: number; onPress: () => void; onFocus?: () => void; autoFocus?: boolean }) {
  const c = useColors();
  const { u } = useTV();
  return (
    <Focusable
      onPress={onPress}
      onFocus={onFocus}
      autoFocus={autoFocus}
      scale={lead ? 1.025 : 1.05}
      radius={8 * u}
      label={story.hl}
      testID={'story-' + story.id}
      style={[styles.card, { height, padding: (lead ? 34 : 24) * u, backgroundColor: c.paper2, borderColor: c.rule2, borderWidth: Math.max(1, 1.5 * u) }]}
      focusedStyle={{ backgroundColor: c.dark ? '#25221b' : '#f5efe4' }}
    >
      <Text style={[sans(700), { fontSize: (lead ? 22 : 18) * u, letterSpacing: 1.4 * u, color: c.red, marginBottom: 10 * u }]} numberOfLines={1}>
        {kickText(story.kick).toUpperCase()}
      </Text>
      <Text style={[serif(lang, 700), { color: c.head, fontSize: (lead ? 54 : 31) * u, lineHeight: (lead ? 66 : 40) * u, letterSpacing: (lead ? -0.8 : -0.3) * u }]} numberOfLines={lead ? 4 : 3}>
        {story.hl}
      </Text>
      {!!story.dek && (
        <Text style={[serif(lang), { color: c.ink2, fontSize: (lead ? 30 : 23) * u, lineHeight: (lead ? 46 : 33) * u, marginTop: (lead ? 18 : 10) * u }]} numberOfLines={lead ? 3 : 2}>
          {story.dek}
        </Text>
      )}
      {lead && !!story.body?.[0] && (
        <View style={[styles.rule, { borderTopColor: c.rule2, marginTop: 22 * u, paddingTop: 18 * u, flex: 1 }]}>
          <Text style={[serif(lang), para(lang), { color: c.ink, fontSize: 28 * u, lineHeight: 44 * u }]} numberOfLines={6}>
            {story.body[0]}
          </Text>
        </View>
      )}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  rule: { borderTopWidth: 1, overflow: 'hidden' },
});
