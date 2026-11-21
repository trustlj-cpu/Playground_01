# DailyDrop edition extras — source links + influencer box

One JSON per edition: /home/user/Playground_01/site/extras/<prefix><DATE>.json  (KR prefix is empty → site/extras/2026-10-09.json; US → site/extras/us/2026-10-09.json). Translations share it (popup data-ids are identical across languages). build.js renders it; nothing else to wire.

```json
{
 "src": {
  "<data-id of a story/popup>": [
   {"n": "<outlet name exactly as written in that popup's src text in the EDITION language>", "alt": ["<same outlet as it appears in en/ko/ja translations, e.g. Reuters, 로이터, ロイター>"], "u": "<article URL>"}
  ]
 },
 "infl": [
  {"who": "<person, in edition language or original Latin>", "where": "X | Truth Social | Threads | YouTube | Bluesky | press conference", "date": "M/D", "u": "<URL of the post or of the article reporting it>", "t": {"<edition lang>": "<one-sentence gist, ≤ 120 chars, attributed, no added claims>", "en": "...", "ko": "...", "ja": "..."}}
 ]
}
```

## src (source links) — required for every popup data-id
- Data-ids: every element with data-id in the edition HTML (stories, index items, briefs that open popups) whose A[id] entry has a src.
- 2–4 links per data-id, one per outlet actually named in that src text. URLs come ONLY from D1 `items.link` (never invent, never guess a URL pattern): `SELECT source,title,link,published_at FROM items WHERE published_at >= '<DATE-2d>' AND (title LIKE '%kw1%' OR title LIKE '%kw2%') ORDER BY tier, published_at DESC LIMIT 60` (D1 tool mcp__Cloudflare_Developer_Platform__d1_database_query, database_id 0f239386-f7cf-42ed-838d-46eb896bea87). Prefer the outlet's own domain over news.google.com redirect links when both exist; a news.google.com/rss/articles link is acceptable if it is the only one.
- `n` must be a substring of the popup's src text in the edition language so it becomes the clickable word; `alt` lists the spellings used in the translations (open the <date>.<lang>.html files and copy the outlet name as written there). If an outlet in src has no matching D1 item, skip it (no link) — do not substitute another outlet's article under its name.
- Only link an article that is about that story.

## infl (influencer box) — REQUIRED in every edition (owner 10/10): 4–6 items = 2–3 of this country's influential figures + 2–3 global figures, chosen by Jev
- From D1 field '인플루언서' (plus region-matching items mentioning X/Truth Social posts) in the 36 h before the edition: `SELECT source,title,link,region,published_at FROM items WHERE field='인플루언서' AND region IN ('<EDITION REGION>','GLB') AND published_at >= '<since>' ORDER BY tier, published_at DESC LIMIT 120`.
- ASSIGNMENT RULE (owner, judged by WHAT was said, not only who said it): (1) a statement about one country's domestic matter (its elections, parties, courts, local policy, domestic scandals) goes ONLY in that country's edition — even if the speaker is a global figure (e.g. Trump on a US Senate race → US edition only; Musk on a German party → DE edition only). (2) a statement with global impact regardless of country (oil/war/sanctions/tariffs/AI/markets/crypto/rates/pandemics) may go in ANY edition. (3) a country's domestic figure appears only in that country's edition unless the statement itself is global under (2). Prefer the edition country's items first, then global ones.
- WHO COUNTS AS AN INFLUENCER (owner 10/10): an individual whose OWN posts/channels move a large following's opinions, behaviour or markets — celebrities, entertainers, creators/YouTubers/streamers, athletes, entrepreneurs and investors (e.g. Musk, Buffett), prominent commentators/pundits/authors. Politicians count ONLY for what they personally posted on their own social account (X, Truth Social, Instagram, Facebook, YouTube, Threads, Weibo…). NOT influencers: officials speaking in an official capacity — military chiefs, ministers' briefings, parliamentary answers, speeches, government/UN/delegation statements, press conferences, court rulings, Kremlin/White House readouts. `where` must name the platform (e.g. "X", "Instagram", "YouTube", "Truth Social") or the creator's own channel/column.
- Jev selection (owner 10/10): collect 10–20 candidate statements (domestic + global, following the ASSIGNMENT RULE below), note `date -u '+%Y-%m-%d %H:%M:%S'`, then ONE D1 call: `INSERT INTO jev_terms (edition, lang, kind, term, context, created) VALUES ('<REGION>','<edition lang code>','infl','<Name, role>','<what they said, one sentence, ≤260 chars>', datetime('now')), …`; poll `SELECT term, context, p FROM jev_terms WHERE kind='infl' AND edition='<REGION>' AND created >= '<noted time>' ORDER BY p DESC` every ~60 s (≤6 min). Use Jev's highest-p statements: 2–3 domestic + 2–3 global, 4–6 total. If the window has too few '인플루언서' items, also use quoted statements by named figures in that region's other items (titles like 'X says…', 'X: «…»') — still with D1 links. Never leave the box empty.
- t: edition language + en + ko + ja (others fall back to en).

Validate: `node -e "JSON.parse(require('fs').readFileSync(F))"`; every u matches ^https?://; every n appears in the A[id].src text of the edition-language file; build (`cd site && node build.js editions.json <scratch out>`) and open one popup per file in Playwright to confirm links render (popup .src contains <a>).
