// Last line of defence: a render error shows a calm retry screen instead of a blank TV.
// Lives outside SettingsProvider, so the language comes from the device locale and sizes from the TV scale.
import React from 'react';
import { Text, View } from 'react-native';
import { firstRunDefaults } from '../settings';
import { dark, sans, serif } from '../shared/theme';
import { tvStrings } from '../strings';
import FocusOwner from '../tv/FocusOwner';
import { useTV } from '../tv/scale';
import Logo from './Logo';

interface State {
  error: Error | null;
  key: number;
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { u } = useTV();
  let lang = 'en';
  try {
    lang = firstRunDefaults().lang;
  } catch {}
  const T = tvStrings(lang).tv;
  return (
    <FocusOwner onPress={onRetry} testID="error-boundary" style={{ flex: 1, backgroundColor: dark.paper, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 28 * u }}>
        <Logo width={440 * u} color={dark.head} dot={dark.logoDot} />
        <Text style={[serif(lang), { color: dark.ink2, fontSize: 30 * u, lineHeight: 44 * u, textAlign: 'center' }]}>{T.errBody}</Text>
        <Text style={[sans(700), { color: dark.paper, backgroundColor: dark.red, fontSize: 26 * u, paddingHorizontal: 30 * u, paddingVertical: 12 * u, overflow: 'hidden' }]}>{T.errOk}</Text>
      </View>
    </FocusOwner>
  );
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, key: 0 };
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.warn('DailyDrop TV render error', error);
  }
  retry = () => this.setState((s) => ({ error: null, key: s.key + 1 }));
  render() {
    if (!this.state.error) return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
    return <ErrorScreen onRetry={this.retry} />;
  }
}
