// Modal layer over the current screen: dim scrim, focus kept inside (FocusTrap), Back closes.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../settings';
import FocusTrap from '../tv/FocusTrap';
import { useBack, useRemoteKeys } from '../tv/remote';

export default function OverlayShell({ onClose, children, align = 'center' }: { onClose: () => void; children: React.ReactNode; align?: 'center' | 'right' }) {
  const c = useColors();
  useBack(() => {
    onClose();
    return true;
  });
  // modal: keys go to the overlay's own focusables, never to the layer below
  useRemoteKeys(() => false);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, zIndex: 500, elevation: 500 }]}>
      <FocusTrap style={[StyleSheet.absoluteFill, { alignItems: align === 'center' ? 'center' : 'flex-end', justifyContent: 'center' }]}>{children}</FocusTrap>
    </View>
  );
}
