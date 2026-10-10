// A row of page columns of fixed widths with a thin vertical rule in each gap (web: column-rule / border-left rule-2).
import React from 'react';
import { View } from 'react-native';
import { ColumnWidth, GAP } from '../lib/layout';
import { useColors } from '../lib/settings';

export default function Columns({ widths, children, rule = true }: { widths: number[]; children: React.ReactNode[]; rule?: boolean }) {
  const c = useColors();
  const out: React.ReactNode[] = [];
  widths.forEach((w, i) => {
    if (i)
      out.push(
        <View key={'g' + i} style={{ width: GAP, alignItems: 'center' }}>
          {rule ? <View style={{ flex: 1, width: 1, backgroundColor: c.rule2 }} /> : null}
        </View>,
      );
    out.push(
      <ColumnWidth.Provider key={'c' + i} value={w}>
        <View style={{ width: w }}>{children[i]}</View>
      </ColumnWidth.Provider>,
    );
  });
  return <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>{out}</View>;
}
