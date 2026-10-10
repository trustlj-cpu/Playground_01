import { useFonts } from 'expo-font';
import { type ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getLocales } from 'expo-localization';
import { strings } from '../i18n';
import { clearCache } from '../lib/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Intro from '../components/Intro';
import { OverlayProvider } from '../components/Overlay';
import { BookmarkProvider } from '../lib/bookmarks';
import { IndexProvider } from '../lib/content';
import { SettingsProvider, useSettings } from '../lib/settings';
import { FONT_FILES, light, sans, serif } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// A screen opened straight from a link (e.g. a past edition) still gets the tabs underneath it, so "back"
// lands on the paper instead of leaving the app or showing an empty history.
export const unstable_settings = { initialRouteName: '(tabs)' };

function Shell() {
  const { colors, ready, settings } = useSettings();
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
          >
            {/* its title is the iOS back-button label on pushed screens (otherwise the route name "(tabs)") */}
            <Stack.Screen name="(tabs)" options={{ title: strings(settings.lang).latest }} />
          </Stack>
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

/** Last line of defence: a render crash (e.g. a cached copy the screens cannot draw) shows this instead of a
 *  blank app; "try again" drops the cached API copies first so the same copy cannot crash the next launch. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  let lang = 'en';
  try {
    lang = getLocales()[0]?.languageTag || 'en';
  } catch {}
  const A = strings(lang).app;
  if (__DEV__) console.error(error);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: light.paper }}>
      <Text style={[serif(lang), { color: light.ink, fontSize: 15, lineHeight: 22, textAlign: 'center' }]}>{A.crash}</Text>
      <Pressable
        onPress={() => {
          clearCache().finally(() => retry());
        }}
        accessibilityRole="button"
        style={{ marginTop: 16, borderWidth: 1, borderColor: light.ink, paddingHorizontal: 22, paddingVertical: 10 }}
      >
        <Text style={[sans(600), { color: light.ink, letterSpacing: 1, fontSize: 13 }]}>{A.retry}</Text>
      </Pressable>
    </View>
  );
}
