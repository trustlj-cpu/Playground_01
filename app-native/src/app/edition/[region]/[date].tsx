import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import EditionView, { Failed, Loading } from '../../../components/EditionView';
import { paths } from '../../../lib/api';
import { pickLang, regionName, useIndex } from '../../../lib/content';
import { strings } from '../../../i18n';
import { normEdition } from '../../../lib/normalize';
import { useSettings } from '../../../lib/settings';
import { serif } from '../../../lib/theme';
import type { Edition } from '../../../lib/types';
import { useResource } from '../../../lib/useResource';

/** A past edition (same layout as Latest, without the live breaking ticker). */
export default function PastEdition() {
  const { region: code, date, lang: want } = useLocalSearchParams<{ region: string; date: string; lang?: string }>();
  const { settings, colors } = useSettings();
  const index = useIndex();
  // route params can come from a deep link: only a region the index lists and a real date are loaded
  // (findRegion would fall back to the first region, so match the code exactly)
  const region = index.data?.regions.find((r) => r.code === String(code || '').toUpperCase());
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || ''));
  const ref = region?.editions.find((e) => e.date === date);
  const lang = region ? pickLang(region, ref, typeof want === 'string' ? want : settings.lang) : settings.lang;
  const invalid = !!index.data && (!region || !validDate);
  const ed = useResource<Edition>(region && validDate ? paths.edition(region.code, date, lang) : null, { parse: normEdition });
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
          headerBackTitle: strings(settings.lang).latest, // never the route name "(tabs)"
          headerTitleStyle: { ...(serif(lang, 700) as object), fontSize: 15, color: colors.ink } as any,
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
        }}
      />
      {ed.data ? (
        <EditionView edition={ed.data} refreshing={pulling} onRefresh={refresh} offline={!!ed.error} />
      ) : invalid || (index.error && !index.data) || (ed.error && !ed.loading) ? (
        <Failed lang={lang} onRetry={refresh} notCached />
      ) : (
        <Loading lang={lang} />
      )}
    </View>
  );
}
