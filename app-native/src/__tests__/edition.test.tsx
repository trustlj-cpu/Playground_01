import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EditionView from '../components/EditionView';
import { splitEar } from '../components/Masthead';
import { OverlayProvider } from '../components/Overlay';
import { BookmarkProvider } from '../lib/bookmarks';
import { normEdition } from '../lib/normalize';
import { SettingsProvider } from '../lib/settings';
import type { Edition } from '../lib/types';

const FIX: Record<string, unknown> = {
  KR: require('../../fixtures/app/v1/KR/2026-10-10.ko.json'),
  US: require('../../fixtures/app/v1/US/2026-10-10.en.json'),
  JP: require('../../fixtures/app/v1/JP/2026-10-10.ja.json'),
};

const metrics = { frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function Page({ edition }: { edition: Edition }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <SettingsProvider>
        <BookmarkProvider>
          <OverlayProvider>
            <EditionView edition={edition} refreshing={false} onRefresh={() => {}} />
          </OverlayProvider>
        </BookmarkProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

describe.each(['KR', 'US', 'JP'])('%s edition', (code) => {
  const ed = normEdition(JSON.parse(JSON.stringify(FIX[code])));

  it('renders every story and the article sheet opens with its popup', async () => {
    expect(ed.stories.length).toBeGreaterThan(3);
    await render(<Page edition={ed} />);
    for (const st of ed.stories) {
      expect(screen.getByLabelText([st.hl, st.dek].filter(Boolean).join('. '))).toBeTruthy();
    }
    const st = ed.stories.slice().sort((a, b) => a.rank - b.rank)[0];
    await fireEvent.press(screen.getByLabelText([st.hl, st.dek].filter(Boolean).join('. ')));
    // the sheet shows the popup's sections ("what" text) — the text exists twice now: card body and sheet
    const what = st.popup.what || st.popup.why;
    expect(what).toBeTruthy();
    const close = await screen.findAllByRole('button', { name: /닫기|Close|閉じる/ });
    expect(close.length).toBeGreaterThan(0);
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(screen.getAllByText(new RegExp(esc(what!.slice(0, 12)))).length).toBeGreaterThan(0);
  });

  it('renders a mutated edition (no glossary, no influencers, unknown blocks, no stories) without crashing', async () => {
    const m = JSON.parse(JSON.stringify(FIX[code]));
    m.glossary = null;
    m.influencers = null;
    m.blocks = [{ type: 'brand-new-box', title: 'New', html: '<p>Hello <blink>there</blink> <a href="javascript:x">x</a></p>' }];
    m.stories = m.stories.slice(0, 1);
    await render(<Page edition={normEdition(m)} />);
    expect(screen.getByText('New')).toBeTruthy();
    const m2 = JSON.parse(JSON.stringify(FIX[code]));
    delete m2.stories;
    await render(<Page edition={normEdition(m2)} />);
  });
});

it('the bookmark on a story card is reachable as an accessibility action', async () => {
  const ed = normEdition(JSON.parse(JSON.stringify(FIX.KR)));
  await render(<Page edition={ed} />);
  const st = ed.stories[0];
  const card = screen.getByLabelText([st.hl, st.dek].filter(Boolean).join('. '));
  expect(card.props.accessibilityActions.map((a: { name: string }) => a.name)).toContain('bookmark');
  expect(within(card).getAllByRole('button').length).toBeGreaterThan(0);
});

it('shows the market ears from the masthead data', async () => {
  const ed = normEdition(JSON.parse(JSON.stringify(FIX.KR)));
  expect(ed.mast.ears!.length).toBeGreaterThan(0);
  await render(<Page edition={ed} />);
  const [value] = splitEar(ed.mast.ears![0]);
  expect(screen.getAllByText(value).length).toBeGreaterThan(0);
  expect(splitEar('1,342.3원 원/달러 · 10/9')).toEqual(['1,342.3원', '원/달러 · 10/9']);
  expect(splitEar('no number here')).toEqual(['', 'no number here']);
});
