import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Intro from '../components/Intro';
import { OverlayProvider } from '../components/Overlay';
import { BookmarkProvider } from '../lib/bookmarks';
import { IndexProvider } from '../lib/content';
import { SettingsProvider, useSettings } from '../lib/settings';
import { FONT_FILES } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { colors, ready } = useSettings();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000); // never keep the paper behind the splash because of fonts
    return () => clearTimeout(t);
  }, []);
  const go = ready && (fontsLoaded || !!fontError || timedOut);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.paper).catch(() => {});
  }, [colors.paper]);
  useEffect(() => {
    if (go) SplashScreen.hideAsync().catch(() => {});
  }, [go]);

  if (!go) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style={colors.dark ? 'light' : 'dark'} />
      <IndexProvider>
        <OverlayProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
              headerStyle: { backgroundColor: colors.paper },
              headerTintColor: colors.ink,
              headerShadowVisible: false,
            }}
          />
        </OverlayProvider>
      </IndexProvider>
      <Intro />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <BookmarkProvider>
          <Shell />
        </BookmarkProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
