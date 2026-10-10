import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditionView, { Failed, Loading } from '../../components/EditionView';
import { paths } from '../../lib/api';
import { findRegion, pickLang, useIndex } from '../../lib/content';
import { useSettings } from '../../lib/settings';
import type { Edition } from '../../lib/types';
import { useResource } from '../../lib/useResource';

export default function Latest() {
  const { settings, colors } = useSettings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const index = useIndex();
  const region = findRegion(index.data, settings.region);
  const ref = region?.editions.find((e) => e.date === region.latest.date) || region?.editions[0];
  const lang = region ? pickLang(region, ref, settings.lang) : settings.lang;
  const path = region && ref ? paths.edition(region.code, ref.date, lang) : null;
  const ed = useResource<Edition>(path, { keepPrevious: true });

  const [pulling, setPulling] = useState(false);
  const refresh = async () => {
    setPulling(true);
    await Promise.all([index.refresh(), ed.refresh()]);
    setPulling(false);
  };

  // keepPrevious: while a newer edition of the same paper loads, keep the old one on screen —
  // but never show another region/language's paper in place of the chosen one
  const shown = ed.data && region && ed.data.region === region.code && ed.data.lang === lang ? ed.data : null;
  let body: React.ReactNode;
  if (shown) {
    body = (
      <EditionView
        edition={shown}
        refreshing={pulling}
        onRefresh={refresh}
        offline={!!ed.error}
        breakingPath={shown.breaking || `/api/breaking.json?region=${shown.region}&lang=${shown.lang}`}
        onPlace={() => router.navigate('/settings')}
      />
    );
  } else if ((index.error && !index.data) || (ed.error && !ed.loading)) {
    body = <Failed lang={settings.lang} onRetry={refresh} notCached={!!ed.error || !!index.error} />;
  } else {
    body = <Loading lang={settings.lang} />;
  }
  return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.paper }}>{body}</View>;
}
