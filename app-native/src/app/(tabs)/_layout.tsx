import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../i18n';
import { useSettings } from '../../lib/settings';
import { serif } from '../../lib/theme';

// Text-only tab bar styled like the site's top menu: serif labels, thin ink rule, active item underlined.
function PaperTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors: c, settings } = useSettings();
  const insets = useSafeAreaInsets();
  const S = strings(settings.lang);
  const labels: Record<string, string> = {
    index: S.latest,
    archive: S.archive,
    glossary: S.glossary,
    bookmarks: S.app.bookmarks,
    settings: S.settings,
  };
  return (
    <View style={[styles.bar, { backgroundColor: c.paper, borderTopColor: c.ink, paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {state.routes.map((r, i) => {
        const on = state.index === i;
        return (
          <Pressable
            key={r.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !e.defaultPrevented) navigation.navigate(r.name as never);
            }}
            style={styles.item}
          >
            <Text
              numberOfLines={1}
              style={[
                serif(settings.lang, on ? 700 : 400),
                styles.label,
                { color: on ? c.ink : c.ink2, borderBottomColor: on ? c.ink : 'transparent' },
              ]}
            >
              {labels[r.name] || r.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <PaperTabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="archive" />
      <Tabs.Screen name="glossary" />
      <Tabs.Screen name="bookmarks" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 14 },
  item: { flexShrink: 1, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 2 },
  label: { fontSize: 12.5, letterSpacing: 0.3, borderBottomWidth: 1.5, paddingBottom: 3 },
});
