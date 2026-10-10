import React from 'react';
import { GestureResponderEvent, Platform, StyleProp, Text, TextStyle } from 'react-native';
import { useColors } from '../lib/settings';
import type { Seg } from '../lib/terms';

export interface TermTap {
  term: string;
  x: number;
  y: number;
}

/** Text with glossary terms underlined (dotted, red) — tapping a term reports its screen position. */
export default function RichText({
  segs,
  style,
  onTerm,
  selectable,
}: {
  segs: Seg[];
  style?: StyleProp<TextStyle>;
  onTerm?: (t: TermTap) => void;
  selectable?: boolean;
}) {
  const c = useColors();
  return (
    <Text style={style} selectable={selectable} android_hyphenationFrequency="normal">
      {segs.map((s, i) =>
        s.term && onTerm ? (
          <Text
            key={i}
            suppressHighlighting
            accessibilityRole={Platform.OS === 'web' ? undefined : 'button'} // a <button> would be inline-block on web and break justification
            onPress={(e: GestureResponderEvent) => {
              const ne: any = e.nativeEvent;
              (e as any).stopPropagation?.();
              (e as any).preventDefault?.();
              const x = Platform.OS === 'web' ? ne.clientX : ne.pageX;
              const y = Platform.OS === 'web' ? ne.clientY : ne.pageY;
              onTerm({ term: s.term!, x: x || 0, y: y || 0 });
            }}
            style={{
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: c.red,
            }}
          >
            {s.t}
          </Text>
        ) : (
          <React.Fragment key={i}>{s.t}</React.Fragment>
        ),
      )}
    </Text>
  );
}
