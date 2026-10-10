import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Failed, Loading } from '../../components/EditionView';
import ScreenTitle, { formatDate } from '../../components/ScreenTitle';
import { fmt, langName, strings } from '../../i18n';
import { findRegion, pickLang, regionName, useIndex } from '../../lib/content';
import { useSettings } from '../../lib/settings';
import { sans, serif } from '../../lib/theme';

export default function Archive() {
  const { settings, colors: c } = useSettings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const index = useIndex();
  const S = strings(settings.lang);
  const region = findRegion(index.data, settings.region);
  const [pulling, setPulling] = useState(false);

  if (!region) return index.error ? <Failed lang={settings.lang} onRetry={index.refresh} notCached /> : <Loading lang={settings.lang} />;

  const edLabel = (n: number) => fmt(S.app.edNo, { n });
  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: c.paper }}>
      <FlatList
        data={region.editions}
        keyExtractor={(e) => e.date}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ListHeaderComponent={<ScreenTitle title={S.archive} sub={regionName(region, settings.lang)} lang={settings.lang} />}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={async () => {
              setPulling(true);
              await index.refresh();
              setPulling(false);
            }}
            tintColor={c.mute}
            colors={[c.red]}
          />
        }
        renderItem={({ item, index: i }) => {
          const lang = pickLang(region, item, settings.lang);
          const latest = item.date === region.latest.date;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/edition/[region]/[date]', params: { region: region.code, date: item.date, lang } })}
              style={({ pressed }) => [styles.row, i < region.editions.length - 1 && { borderBottomColor: c.ink, borderBottomWidth: 1 }, pressed && { opacity: 0.6 }]}
              accessibilityRole="link"
            >
              <View style={styles.no}>
                <Text style={[serif(settings.lang, 700), { fontSize: 15, color: c.ink }]}>{edLabel(item.no)}</Text>
                {latest && <Text style={[sans(700), styles.badge, { color: c.red }]}>{S.app.current}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[serif(settings.lang), { fontSize: 15, lineHeight: 21, color: c.ink }]}>{formatDate(item.date, settings.lang)}</Text>
                <Text style={[sans(400), { fontSize: 11.5, color: c.mute, marginTop: 2 }]}>{item.langs.map(langName).join(' · ')}</Text>
              </View>
              <Text style={[serif(settings.lang), { color: c.mute, fontSize: 18 }]}>›</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderStyle: 'dotted' },
  no: { width: 64 },
  badge: { fontSize: 10, letterSpacing: 1.2, marginTop: 2 },
});
