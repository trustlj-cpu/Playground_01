// Web: a focus scope for keysource.ts — arrow keys never leave the top-most [data-tvscope].
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

export default function FocusTrap({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <View style={style} {...({ dataSet: { tvscope: '1' } } as object)}>
      {children}
    </View>
  );
}
