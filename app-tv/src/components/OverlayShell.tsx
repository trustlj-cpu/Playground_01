// Modal layer over the current screen, like the web's .ov / .brkl: dim scrim, focus kept inside (FocusTrap),
// Back / Menu / Escape closes. No close buttons (DESIGN_RULE 5: popups close with Back, or by leaving them).
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useColors } from '../settings';
import FocusTrap from '../tv/FocusTrap';
import { RemoteKey, useBack, useRemoteKeys } from '../tv/remote';

export default function OverlayShell({
  onClose,
  onKey,
  children,
  scrim,
  style,
}: {
  onClose: () => void;
  /** remote keys while open; return true when handled (default: keys only move focus inside the overlay) */
  onKey?: (k: RemoteKey) => boolean;
  children: React.ReactNode;
  scrim?: string;
  style?: ViewStyle;
}) {
  const c = useColors();
  useBack(() => {
    onClose();
    return true;
  });
  // modal: keys go to the overlay, never to the layer below
  useRemoteKeys((k) => (onKey ? onKey(k) : false));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim || c.scrim, zIndex: 500, elevation: 500 }]}>
      <FocusTrap style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, style]}>{children}</FocusTrap>
    </View>
  );
}
