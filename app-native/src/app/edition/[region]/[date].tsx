import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import EditionView, { Failed, Loading } from '../../../components/EditionView';
import { paths } from '../../../lib/api';
import { findRegion, pickLang, regionName, useIndex } from '../../../lib/content';
import { useSettings } from '../../../lib/settings';
import { serif } from '../../../lib/theme';
import type { Edition } from '../../../lib/types';
import { useResource } from '../../../lib/useResource';

/** A past edition (same layout as Latest, without the live breaking ticker). */
export default function PastEdition() {
  const { region: code, date, lang: want } = useLocalSearchParams<{ region: string; date: string; lang?: string }>();
  const { settings, colors } = useSettings();
  const index = useIndex();
  const region = findRegion(index.data, code);
  const ref = region?.editions.find((e) => e.date === date);
  const lang = region ? pickLang(region, ref, want || settings.lang) : want || settings.lang;
  const ed = useResource<Edition>(region ? paths.edition(code, date, lang) : null);
  const [pulling, setPulling] = useState(false);
  const refresh = async () => {
    setPulling(true);
    await ed.refresh();
    setPulling(false);
  };
  const title = ed.data ? `${ed.data.mast.label} · ${region ? regionName(region, lang) : code}` : date;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerBackTitle: '',
          headerTitleStyle: { ...(serif(lang, 700) as object), fontSize: 15, color: colors.ink } as any,
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
        }}
      />
      {ed.data ? (
        <EditionView edition={ed.data} refreshing={pulling} onRefresh={refresh} offline={!!ed.error} />
      ) : ed.error && !ed.loading ? (
        <Failed lang={lang} onRetry={refresh} notCached />
      ) : (
        <Loading lang={lang} />
      )}
    </View>
  );
}
