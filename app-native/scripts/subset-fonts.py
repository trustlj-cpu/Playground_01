#!/usr/bin/env python3
"""Subset the bundled Noto Serif fonts so the app ships only the glyphs it needs.

  pip install fonttools   # once
  python3 scripts/subset-fonts.py

Reads the original TTFs from node_modules/@expo-google-fonts/* and writes assets/fonts/*.ttf
(committed; src/lib/theme.ts requires them). Re-run only when upgrading the font packages.

KR: all 11,172 Hangul syllables + Jamo (news text needs arbitrary syllables), Latin, punctuation,
    and only the ~400 Hanja that Korean newspapers actually print (press names, country/party
    abbreviations, common one-letter headline words). Other Hanja fall back to the system font.
JP: kana + every character of JIS X 0208 (JIS level 1 + 2 kanji, 6,355) + Latin/punctuation.
Latin Noto Serif: Latin/Latin-Ext/Greek/Cyrillic/Vietnamese as before; only TrueType hinting is dropped.

The subset TrueType outlines are then converted to CFF (cubic, max error 1 unit of 1000/2048 em) and
subroutinised: Hangul/Kanji share many strokes, so the CJK files shrink by ~2/3 again.
Output is .otf, which expo-font loads on iOS, Android and web.

  pip install fonttools cffsubr   # once
"""
import os
import sys
import cffsubr
from fontTools import subset
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.qu2cuPen import Qu2CuPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules', '@expo-google-fonts')
OUT = os.path.join(ROOT, 'assets', 'fonts')

def rng(a, b):
    return set(range(a, b + 1))

COMMON = set()
for a, b in [
    (0x0020, 0x007E), (0x00A0, 0x024F),  # Latin-1 + Latin Extended A/B
    (0x02B0, 0x02FF), (0x0300, 0x036F),  # modifiers, combining marks
    (0x0370, 0x03FF), (0x0400, 0x04FF),  # Greek, Cyrillic (names in news)
    (0x1E00, 0x1EFF),                    # Latin Extended Additional (Vietnamese etc.)
    (0x2000, 0x206F), (0x2070, 0x209F), (0x20A0, 0x20CF), (0x2100, 0x214F), (0x2150, 0x218F),
    (0x2190, 0x21FF), (0x2200, 0x22FF), (0x2460, 0x24FF), (0x2500, 0x257F), (0x25A0, 0x25FF),
    (0x2600, 0x26FF), (0x2700, 0x27BF),
    (0x3000, 0x303F),                    # CJK symbols & punctuation
    (0x3200, 0x32FF), (0x3300, 0x33FF),  # enclosed CJK, CJK compatibility (㎞ ㎏ ㈜)
    (0xFE30, 0xFE4F), (0xFF00, 0xFFEF),  # CJK compatibility forms, half/fullwidth
]:
    COMMON |= rng(a, b)

# Hanja seen in Korean news text: press names, countries, parties, institutions, one-letter headline words.
KR_HANJA = (
    '聯合新聞經済經濟京郷鄕韓國国日報路透東亞亜朝鮮每毎通信社電子中央文化世界時事週刊放送'
    '美中日北南韓英佛獨獨露伊印濠加蘇越泰比西希土葡和蘭瑞丁諾芬墨伯亞阿歐歐洲亞洲阿中東'
    '與野靑青黨党政府軍警檢法院大統領總理首相長官議會國會選擧挙票民主自由共和保守進步'
    '前現新舊旧前後上下左右內外大小高低長短多少强弱好惡善惡正誤是非可否有無公私官民'
    '金李朴崔鄭姜趙尹張林韓吳申徐權黃安宋柳洪全高文孫梁白許劉南沈盧河丁成車具禹朱任羅辛閔'
    '一二三四五六七八九十百千萬万億兆年月日時分秒週火水木金土'
    '株價価物價金利換率稅税財銀行證券市場企業産産業輸出入貿易外交安保核兵戰戦爭争平和'
    '人口生死殺事件事故災害火災地震颱風台風雨雪熱寒病醫医藥薬學学校敎教育試驗験'
    '王族女男子父母兄弟夫妻家族婚姻愛情友敵賞罰罪刑死刑逮捕起訴判決訟訴'
    '春夏秋冬朝夕晝夜東西南北內外前後今昔古新老少'
    '對対反親非不未無否超最再初第次各全半主副準正特別本支'
    '發発表會会談約條条約協定合意決定議論說説明問題解答答案計畫画劃'
    '號号面版號外紙報道論評社說写眞眞實実際氏君様嬢翁'
    '山川江河海島湖陸空天地風雲星光'
    '色白黑黒赤靑青黃黄綠緑紅金銀銅鐵鉄'
    '心身手足目耳口頭顔首'
    '道路橋港驛駅空港都市邑面里洞區区郡縣県州省'
    '力氣気電話車船機'
)
JIS0208 = set()
for a in range(0xA1, 0xFF):
    for b in range(0xA1, 0xFF):
        try:
            JIS0208.add(ord(bytes([a, b]).decode('euc_jp')))
        except UnicodeDecodeError:
            pass

KR = COMMON | rng(0x1100, 0x11FF) | rng(0x3130, 0x318F) | rng(0xA960, 0xA97F) | rng(0xAC00, 0xD7A3) | rng(0xD7B0, 0xD7FF) | {ord(c) for c in KR_HANJA}
JP = COMMON | rng(0x3040, 0x309F) | rng(0x30A0, 0x30FF) | rng(0x31F0, 0x31FF) | JIS0208 | {ord(c) for c in '々〆ヶヵ〻'}
LATIN = COMMON - rng(0x3000, 0x33FF) - rng(0xFE30, 0xFE4F) - rng(0xFF00, 0xFFEF)

JOBS = [
    ('noto-serif-kr/400Regular/NotoSerifKR_400Regular.ttf', KR),
    ('noto-serif-kr/700Bold/NotoSerifKR_700Bold.ttf', KR),
    ('noto-serif-jp/400Regular/NotoSerifJP_400Regular.ttf', JP),
    ('noto-serif-jp/700Bold/NotoSerifJP_700Bold.ttf', JP),
    ('noto-serif/400Regular/NotoSerif_400Regular.ttf', LATIN),
    ('noto-serif/700Bold/NotoSerif_700Bold.ttf', LATIN),
    ('noto-serif/400Regular_Italic/NotoSerif_400Regular_Italic.ttf', LATIN),
]

def to_cff(font):
    """Replace glyf outlines with subroutinised CFF in place."""
    gs = font.getGlyphSet()
    hmtx = font['hmtx']
    charstrings = {}
    for g in font.getGlyphOrder():
        adv = hmtx[g][0]
        pen = T2CharStringPen(adv, gs)
        gs[g].draw(Qu2CuPen(pen, max_err=1.0, all_cubic=True))
        charstrings[g] = pen.getCharString()
        bp = BoundsPen(gs)
        gs[g].draw(bp)
        hmtx[g] = (adv, int(round(bp.bounds[0])) if bp.bounds else 0)
    name = font['name']
    ps = (name.getDebugName(6) or 'NotoSerif').replace(' ', '')
    top = {'FullName': name.getDebugName(4) or ps, 'FamilyName': name.getDebugName(1) or ps, 'Weight': name.getDebugName(2) or 'Regular'}
    for t in ['glyf', 'loca', 'fpgm', 'prep', 'cvt ', 'gasp']:
        if t in font:
            del font[t]
    fb = FontBuilder(font=font)
    fb.isTTF = False
    fb.setupCFF(ps, top, charstrings, {})
    font['maxp'].tableVersion = 0x00005000
    font.sfntVersion = 'OTTO'
    cffsubr.subroutinize(font)


def main():
    os.makedirs(OUT, exist_ok=True)
    total_in = total_out = 0
    for rel, cps in JOBS:
        src = os.path.join(NM, rel)
        dst = os.path.join(OUT, os.path.basename(rel).replace('.ttf', '.otf'))
        opts = subset.Options()
        opts.layout_features = ['*']      # keep kerning, ligatures, CJK punctuation spacing (palt/halt) etc.
        opts.hinting = False              # TrueType hinting is ignored by modern iOS/Android rasterisers
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
        a, b = os.path.getsize(src), os.path.getsize(dst)
        total_in += a
        total_out += b
        print(f'{os.path.basename(rel):40s} {a/1e6:7.2f} MB -> {b/1e6:6.2f} MB  ({len(keep)} chars)')
    print(f'{"total":40s} {total_in/1e6:7.2f} MB -> {total_out/1e6:6.2f} MB')

if __name__ == '__main__':
    sys.exit(main())
