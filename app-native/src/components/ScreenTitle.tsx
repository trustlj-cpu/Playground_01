import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../lib/settings';
import { sans, serif } from '../lib/theme';

export default function ScreenTitle({ title, sub, lang, right }: { title: string; sub?: string; lang: string; right?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.wrap, { borderBottomColor: c.ink }]}>
      <View style={styles.row}>
        <Text style={[serif(lang, 700), styles.h1, { color: c.head }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        {right}
      </View>
      {!!sub && <Text style={[sans(400), styles.sub, { color: c.mute }]}>{sub}</Text>}
    </View>
  );
}

export function formatDate(date: string, lang: string): string {
  try {
    return new Date(date + 'T12:00:00Z').toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' });
  } catch {
    return date;
  }
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  h1: { fontSize: 26, lineHeight: 34, letterSpacing: -0.5, flex: 1 },
  sub: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
