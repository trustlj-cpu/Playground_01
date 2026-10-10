// Native TV: keep focus inside an overlay (TVFocusGuideView traps focus on tvOS and Android TV).
import React from 'react';
import { StyleProp, TVFocusGuideView, ViewStyle } from 'react-native';

export default function FocusTrap({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <TVFocusGuideView style={style} autoFocus trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
      {children}
    </TVFocusGuideView>
  );
}
