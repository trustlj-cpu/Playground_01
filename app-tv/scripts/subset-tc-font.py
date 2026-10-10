#!/usr/bin/env python3
"""Subset Noto Serif TC for the zh-TW (Taiwan) edition of the TV app.

  pip install fonttools cffsubr        # once
  npm pack @expo-google-fonts/noto-serif-tc && tar xzf expo-google-fonts-noto-serif-tc-*.tgz
  python3 scripts/subset-tc-font.py --src package --editions ../../Playground_01/site/editions/tw

Without arguments it reads node_modules/@expo-google-fonts/noto-serif-tc and ../site/editions/tw.
Writes assets/fonts/NotoSerifTC_400Regular.otf and NotoSerifTC_700Bold.otf (committed; src/shared/theme.ts).

Characters: Latin / punctuation (same COMMON set as app-native/scripts/subset-fonts.py), bopomofo,
every Big5 level-1 hanzi (A440–C67E, 5,401 common characters), and every character that appears in the
Taiwan edition HTML files (catches the level-2 characters real news uses). Re-run when the TW edition
starts showing tofu (the font falls back to the system font for anything missing).
Outlines are converted to subroutinised CFF like the KR/JP fonts.
"""
import argparse
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, '..', 'app-native', 'scripts'))


def rng(a, b):
    return set(range(a, b + 1))


COMMON = set()
for a, b in [
    (0x0020, 0x007E), (0x00A0, 0x024F), (0x02B0, 0x02FF), (0x0300, 0x036F), (0x0370, 0x03FF), (0x0400, 0x04FF),
    (0x1E00, 0x1EFF), (0x2000, 0x206F), (0x2070, 0x209F), (0x20A0, 0x20CF), (0x2100, 0x214F), (0x2150, 0x218F),
    (0x2190, 0x21FF), (0x2200, 0x22FF), (0x2460, 0x24FF), (0x2500, 0x257F), (0x25A0, 0x25FF), (0x2600, 0x26FF),
    (0x2700, 0x27BF), (0x3000, 0x303F), (0x3100, 0x312F), (0x31A0, 0x31BF),  # CJK punctuation, bopomofo
    (0x3200, 0x32FF), (0x3300, 0x33FF), (0xFE30, 0xFE4F), (0xFF00, 0xFFEF),
]:
    COMMON |= rng(a, b)


def big5_level1():
    out = set()
    for lead in range(0xA4, 0xC7):
        for trail in list(range(0x40, 0x7F)) + list(range(0xA1, 0xFF)):
            if lead == 0xC6 and trail > 0x7E:
                break
            try:
                out.add(ord(bytes([lead, trail]).decode('big5')))
            except UnicodeDecodeError:
                pass
    return out


def edition_chars(d):
    s = set()
    for f in glob.glob(os.path.join(d, '*.html')):
        with open(f, encoding='utf-8') as fh:
            s |= {ord(c) for c in fh.read()}
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=os.path.join(ROOT, 'node_modules', '@expo-google-fonts', 'noto-serif-tc'))
    ap.add_argument('--editions', default=os.path.join(ROOT, '..', 'site', 'editions', 'tw'))
    a = ap.parse_args()
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from importlib import import_module
    to_cff = import_module('subset-fonts').to_cff  # same CFF conversion as the phone app

    ed = edition_chars(a.editions)
    if not ed:
        print('warning: no edition HTML found in', a.editions, file=sys.stderr)
    cps = COMMON | big5_level1() | {c for c in ed if c >= 0x2E80}
    out = os.path.join(ROOT, 'assets', 'fonts')
    for w in ['400Regular', '700Bold']:
        src = os.path.join(a.src, w, f'NotoSerifTC_{w}.ttf')
        dst = os.path.join(out, f'NotoSerifTC_{w}.otf')
        opts = subset.Options()
        opts.layout_features = ['*']
        opts.hinting = False
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.glyph_names = False
        opts.drop_tables += ['DSIG']
        font = TTFont(src)
        cmap = font.getBestCmap()
        keep = [c for c in cps if c in cmap]
        s = subset.Subsetter(opts)
        s.populate(unicodes=keep)
        s.subset(font)
        to_cff(font)
        font.save(dst)
        print(f'{os.path.basename(dst):32s} {os.path.getsize(src)/1e6:6.2f} MB -> {os.path.getsize(dst)/1e6:5.2f} MB  ({len(keep)} chars)')


if __name__ == '__main__':
    sys.exit(main())
