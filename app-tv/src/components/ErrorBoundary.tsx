// Last line of defence: a render error shows a calm retry screen instead of a blank TV.
import React from 'react';
import { Text, View } from 'react-native';
import { dark } from '../shared/theme';
import FocusOwner from '../tv/FocusOwner';

interface State {
  error: Error | null;
  key: number;
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
    return (
      <FocusOwner onPress={this.retry} testID="error-boundary" style={{ flex: 1, backgroundColor: dark.paper, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 24 }}>
          <Text style={{ color: dark.head, fontSize: 36, fontWeight: '700' }}>DailyDrop.</Text>
          <Text style={{ color: dark.ink2, fontSize: 24 }}>Something went wrong. Press OK to reload.</Text>
          <Text style={{ color: dark.paper, backgroundColor: dark.red, fontSize: 22, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, overflow: 'hidden' }}>OK</Text>
        </View>
      </FocusOwner>
    );
  }
}
