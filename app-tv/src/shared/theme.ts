// Copied from app-native/src/lib/theme.ts (DailyDrop phone app) for the TV app — keep in sync by hand.
// Design tokens copied from the website (site/nyt.css): warm newsprint, black ink, brick-red accent.
import { Platform, TextStyle } from 'react-native';

export interface Palette {
  paper: string;
  paper2: string;
  ink: string;
  ink2: string;
  mute: string;
  rule: string;
  rule2: string;
  red: string;
  head: string; // headline ink (slightly brighter than body in dark mode)
  logoDot: string;
  scrim: string;
  dark: boolean;
}

export const light: Palette = {
  paper: '#ece4d8',
  paper2: '#e3dacb',
  ink: '#121212',
  ink2: '#363636',
  mute: '#6f6f6f',
  rule: '#121212',
  rule2: '#d2c9ba',
  red: '#8d2f22',
  head: '#121212',
  logoDot: '#9e0604',
  scrim: 'rgba(20,18,14,0.55)',
  dark: false,
};

export const dark: Palette = {
  paper: '#14130f',
  paper2: '#1c1a15',
  ink: '#ebe4d6',
  ink2: '#c7bfaf',
  mute: '#8d8576',
  rule: '#bfb6a3',
  rule2: '#2f2b24',
  red: '#e2765f',
  head: '#f3eee3',
  logoDot: '#d2654f',
  scrim: 'rgba(0,0,0,0.6)',
  dark: true,
};

// Fonts: Noto Serif KR / JP / (Latin) Noto Serif, two weights each, subset + converted to CFF by
// scripts/subset-fonts.py (45.8 MB of TTF → 13.6 MB). Custom fonts in React Native select weight by
// family name, so each weight is its own family.
export const FONT_FILES = {
  NotoSerifKR_400Regular: require('../../assets/fonts/NotoSerifKR_400Regular.otf'),
  NotoSerifKR_700Bold: require('../../assets/fonts/NotoSerifKR_700Bold.otf'),
  NotoSerifJP_400Regular: require('../../assets/fonts/NotoSerifJP_400Regular.otf'),
  NotoSerifJP_700Bold: require('../../assets/fonts/NotoSerifJP_700Bold.otf'),
  NotoSerif_400Regular: require('../../assets/fonts/NotoSerif_400Regular.otf'),
  NotoSerif_700Bold: require('../../assets/fonts/NotoSerif_700Bold.otf'),
  NotoSerif_400Regular_Italic: require('../../assets/fonts/NotoSerif_400Regular_Italic.otf'),
};

const familyFor = (lang: string) => {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('ko')) return 'NotoSerifKR';
  if (l.startsWith('ja') || l.startsWith('zh')) return 'NotoSerifJP';
  if (/^(hi|th|ar|he|uk)/.test(l)) return null; // scripts the bundled serifs don't cover → system serif fallback
  return 'NotoSerif';
};

export function serif(lang: string, weight: 400 | 700 = 400, italic = false): TextStyle {
  const fam = familyFor(lang);
  if (!fam) return { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }), fontWeight: weight === 700 ? '700' : '400', fontStyle: italic ? 'italic' : 'normal' };
  if (italic && fam === 'NotoSerif' && weight === 400) return { fontFamily: 'NotoSerif_400Regular_Italic' };
  return { fontFamily: `${fam}_${weight === 700 ? '700Bold' : '400Regular'}`, fontStyle: italic ? 'italic' : 'normal' };
}

/** Sans labels use the platform UI font (the site uses Noto Sans KR / system sans). */
export function sans(weight: 400 | 600 | 700 = 400): TextStyle {
  return { fontFamily: Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif', default: undefined }), fontWeight: weight === 400 ? '400' : weight === 600 ? '600' : '700' };
}

/** Languages whose lines may break between any two characters (CJK). */
export const isCJK = (lang: string) => /^(ko|ja|zh)/.test(lang || '');

/** Paragraph alignment like the web: justified with syllable-level breaks for Korean/Japanese/Chinese.
 *  Latin text is justified only where the platform hyphenates (Android); elsewhere ragged-right avoids rivers. */
export function para(lang: string): TextStyle {
  if (isCJK(lang)) {
    return Platform.OS === 'web' ? ({ textAlign: 'justify', wordBreak: lang.startsWith('ko') ? 'break-all' : 'normal', lineBreak: 'strict' } as TextStyle) : { textAlign: 'justify' };
  }
  return Platform.OS === 'android' ? { textAlign: 'justify' } : { textAlign: 'left' };
}
