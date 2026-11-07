# DailyDrop edition authoring brief (shared by US / JP agents)

Template (read it fully, it is the exact structure to reproduce): /home/user/Playground_01/site/editions/2026-10-07.html
It is the Korean edition No.3. Your file must keep the SAME skeleton so the site builder (site/build.js) can post-process it:
- Keep `<title>…</title>` first line, then the Google Fonts <link>, then the big <style> block (copy it; you may change font-family names only).
- Keep `<div class="sheet"> <header> <div class="ears">…<div class="mast"><h1 lang="en">DailyDrop<i>.</i></h1><div class="sub">…</div></div>…</div> <div class="dateline">…</div> </header>` — the builder REPLACES the whole dateline and removes .sub, so their text does not matter, but the tags must exist. Brand is always the English word "DailyDrop" (never translated).
- Stories: `<article class="col cN [vr] story" tabindex="0" data-id="ID">` with `<div class="kick">CATEGORY<span>verification note</span></div>` then `<h2 class="hl">` (lead) or `<h3 class="hl">` (others), `<p class="deck">` (lead only), `<div class="body">` (2-col text, 2 paragraphs) or `<div class="one">` (1 paragraph), `<div class="more">…</div>` (hidden by CSS, keep), optional `<div class="fill">` blocks (`nums` = 3 numbers, `word` = word of the day, `briefs` = <ul class="briefs"> 6-8 one-liners with <span>source</span>).
- The `<aside class="col c1 vr index">` holds 5 `<div class="it story" data-id=…><b>headline</b><em>1-2 sentence</em><span>category · ✓ N outlets</span></div>`.
- Two `<section class="strip">` rows after `<hr class="rule-h">`: first 2 stories (c3 + c3 vr), second one c4 story with briefs fill + a c2 column with `.rumor` (3 "unverified claims" with correction) and `.next` (what to watch tomorrow / this week / for readers).
- `<div class="glos">` note, `<footer class="colophon">` two spans, then the `.tip`, `.ov` popup markup, then the <script> with `const A = {…}` (one entry per data-id: kick,title,what,why,me,a,b,say,src) and `const G = {` glossary `};` — KEEP the exact lines `  const G = {` and `  };` (two-space indent) because the builder regex-extracts it. Each G entry: "term":{f:"field",d:"definition",w:"in this story…"}. 10-20 terms that actually appear in the body text (terms are auto-linked by exact string match, so use the term exactly as it appears in your text).
- Copy the rest of the script verbatim but translate the UI strings: popup section labels (무슨 일/왜 중요한가/나에게는/두 가지 시선/이렇게 보는 쪽/저렇게 보는 쪽/데일리드롭 생각/출처/닫기), tooltip label "이 기사에서는", aria-labels.
- Grid math: main = c3 + c2(vr) + c1(vr aside) = 6 columns; strips = c3+c3 or c4+c2.
- SVG figure in one story is welcome (ink chart with real numbers) but optional; use `style="fill:var(--ink)"` tokens as the template does.

Editorial rules (house style, strictly):
- Evening front page of ONE day: 2026-10-07 local time. Stories = that day's news for that country plus global news relevant to its readers. No Korean domestic stories unless globally relevant.
- 5 main stories (1 lead with deck + 1 secondary + 3 strip) + 5 index items + 6-8 briefs + 3 rumor corrections + tomorrow items.
- Only facts you verified from at least two independent outlets (use WebSearch; the item list below is your starting pool, with links). Attribute numbers to their source. If a figure is not confirmed, say so ("not yet confirmed").
- Never copy article text. Summarize in your own words. `src` lists outlets + date, no URLs needed.
- Popups: what (facts, 5-8 sentences), why (why it matters), me (what it means for the reader), a/b (two honest viewpoints, may be empty strings), say (DailyDrop's own one-paragraph take, concrete and specific about what to watch next), src.
- Tone: calm, precise, newspaper. Short sentences. No hype words. Headlines may use a period mid-headline like the template.
- The `kick` <span> notes verification, e.g. "✓ 4 outlets · figures attributed to the company" (US) / "報道照合 ✓ 4社 · 数値は会社発表" (JP).
- Markets/tape are added by the builder; do not add a tape. The two `.ear` boxes: left = the country's main index close with change, right = main FX rate (US: 10-yr yield). Use the figures in the MARKETS section below.

Output: write the complete HTML file to the path given in your task. Validate: `node -e "const h=require('fs').readFileSync(process.argv[1],'utf8');const m=h.match(/const G = (\{[\s\S]*?\n  \});\n/);if(!m)throw 'G not found';new Function('return '+m[1])();const a=h.match(/const A = (\{[\s\S]*?\n  \});\n/);if(!a)throw 'A not found';new Function('return '+a[1])();console.log('ok', Object.keys(new Function('return '+m[1])()).length,'terms')" FILE`. Also check every data-id in the HTML has an A entry and vice versa. Then render-check with Playwright: `node -e` script using require('playwright').chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}), open file://, assert no pageerror, click first .story and confirm #ov is visible. Report the final file size and the list of headlines.
