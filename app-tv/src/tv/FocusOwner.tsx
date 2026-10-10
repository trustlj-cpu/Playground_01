// A full-screen container that takes the remote's focus for a modal screen (reader, lean-back, intro),
// so the native focus engine has nothing else to move to and OK presses land here.
import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleProp, View, ViewStyle } from 'react-native';

export default function FocusOwner({ autoFocus = true, onPress, style, children, testID }: { autoFocus?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; children?: React.ReactNode; testID?: string }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS === 'web' && autoFocus) {
      const t = setTimeout(() => (ref.current as unknown as HTMLElement | null)?.focus?.({ preventScroll: true }), 20);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);
  return (
    <Pressable
      ref={ref}
      testID={testID}
      hasTVPreferredFocus={autoFocus}
      onPress={onPress}
      style={[style, Platform.OS === 'web' ? ({ outlineStyle: 'none', cursor: 'default' } as any) : null]}
      {...({ dataSet: { tvscope: '1' } } as object)}
    >
      {children}
    </Pressable>
  );
}
