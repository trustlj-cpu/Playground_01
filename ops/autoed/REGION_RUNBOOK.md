# DailyDrop — country edition runbook (Phase 1: GB, DE, FR, IN, AU, CA, TW · Phase 2: SG, BR, MX, IT, ES, NL, CH)

Owner rules: every edition publishes at 06:00 LOCAL time as the morning edition (조간 / Morning / 朝刊 …); one shared issue number per date for all countries, same as the Korean edition (2026-10-05 = No. 1, +1 per day; site/build.js enforces it). Each edition = that country's domestic news + global news relevant to its readers. Only facts confirmed by two or more outlets; the rest goes to the rumor block. Never post credentials.

Region facts (site/countries.json is the source of truth):
| Region | Prefix | Edition language | Time zone | Ears (left / right) | Tape keys |
|---|---|---|---|---|---|
| GB | gb/ | en (British spelling) | Europe/London | FTSE 100 / GBP-USD | ftse, gbpusd, sp500, wti, gold |
| DE | de/ | de | Europe/Berlin | DAX / EUR-USD | dax, eurusd, sp500, wti, gold |
| FR | fr/ | fr | Europe/Paris | CAC 40 / EUR-USD | cac40, eurusd, sp500, wti, gold |
| IN | in/ | en (Indian English) | Asia/Kolkata | Nifty 50 / USD-INR | nifty, usdinr, sp500, wti, gold |
| AU | au/ | en (Australian spelling) | Australia/Sydney | S&P/ASX 200 / AUD-USD | asx200, audusd, sp500, wti, gold |
| CA | ca/ | en | America/Toronto | S&P/TSX / USD-CAD | tsx, usdcad, sp500, wti, gold |
| TW | tw/ | zh-TW | Asia/Taipei | TAIEX / USD-TWD | taiex, usdtwd, sp500, wti, gold |
| SG | sg/ | en (Singapore English, British spelling) | Asia/Singapore | STI / USD-SGD | sti, usdsgd, sp500, wti, gold |
| BR | br/ | pt (Brazilian Portuguese) | America/Sao_Paulo | Ibovespa / USD-BRL | ibovespa, usdbrl, sp500, wti, gold |
| MX | mx/ | es (Mexican Spanish) | America/Mexico_City | S&P/BMV IPC / USD-MXN | ipc, usdmxn, sp500, wti, gold |
| IT | it/ | it | Europe/Rome | FTSE MIB / EUR-USD | ftsemib, eurusd, sp500, wti, gold |
| ES | es/ | es (Castilian) | Europe/Madrid | IBEX 35 / EUR-USD | ibex35, eurusd, sp500, wti, gold |
| NL | nl/ | nl | Europe/Amsterdam | AEX / EUR-USD | aex, eurusd, sp500, wti, gold |
| CH | ch/ | de (Swiss Standard German: no ß, write ss) | Europe/Zurich | SMI / USD-CHF | smi, usdchf, sp500, wti, gold |
| ID | id/ | id | Asia/Jakarta | IDX Composite / USD-IDR | (see site/countries.json tape) |
| VN | vn/ | vi | Asia/Ho_Chi_Minh | VN-Index / USD-VND | (countries.json) |
| TH | th/ | th | Asia/Bangkok | SET / USD-THB | (countries.json) |
| PH | ph/ | en (Philippine English) | Asia/Manila | PSEi / USD-PHP | (countries.json) |
| MY | my/ | en (Malaysian usage) | Asia/Kuala_Lumpur | FBM KLCI / USD-MYR | klci, usdmyr, sp500, wti, gold |
| HK | hk/ | zh-HK (Traditional Chinese, Hong Kong usage) | Asia/Hong_Kong | Hang Seng / USD-HKD | hsi, usdhkd, sp500, wti, gold |
| NZ | nz/ | en (NZ spelling) | Pacific/Auckland | S&P/NZX 50 / NZD-USD | nzx50, nzdusd, sp500, wti, gold |
| PK | pk/ | en (Pakistani usage) | Asia/Karachi | KSE-100 / USD-PKR | kse100, usdpkr, sp500, wti, gold |
| AE | ae/ | ar | Asia/Dubai | DFM General / USD-AED | (countries.json) |
| SA | sa/ | ar | Asia/Riyadh | TASI / USD-SAR | (countries.json) |
| IL | il/ | he | Asia/Jerusalem | TA-35 / USD-ILS | (countries.json) |
| TR | tr/ | tr | Europe/Istanbul | BIST 100 / USD-TRY | (countries.json) |
| EG | eg/ | ar (EGX trades Sun–Thu) | Africa/Cairo | EGX30 / USD-EGP | egx30, usdegp, sp500, wti, gold |
| KE | ke/ | en (Kenyan usage) | Africa/Nairobi | NASI / USD-KES | nasi, usdkes, sp500, wti, gold |
| UA | ua/ | uk | Europe/Kyiv | PFTS / USD-UAH | (countries.json) |
| PL | pl/ | pl | Europe/Warsaw | WIG20 / USD-PLN | wig20, usdpln, sp500, wti, gold |
| ZA | za/ | en (South African) | Africa/Johannesburg | JSE All Share / USD-ZAR | jse, usdzar, sp500, wti, gold |
| NG | ng/ | en (Nigerian) | Africa/Lagos | NGX ASI / USD-NGN | ngx, usdngn, sp500, wti, gold |
| AT | at/ | de (Austrian usage) | Europe/Vienna | ATX / EUR-USD (ECB ref.) | atx, eurusd, sp500, wti, gold |
| BE | be/ | nl (Flemish; cover all Belgium) | Europe/Brussels | BEL 20 / EUR-USD (ECB ref.) | bel20, eurusd, sp500, wti, gold |
| IE | ie/ | en (Irish usage) | Europe/Dublin | ISEQ / EUR-USD (ECB ref.) | iseq, eurusd, sp500, wti, gold |
| PT | pt/ | pt (European Portuguese, never Brazilian) | Europe/Lisbon | PSI / EUR-USD (ECB ref.) | psi, eurusd, sp500, wti, gold |
| AR | ar/ | es (Argentine) | America/Argentina/Buenos_Aires | S&P Merval / USD-ARS | merval, usdars, sp500, wti, gold |
| CL | cl/ | es (Chilean) | America/Santiago | S&P IPSA / USD-CLP | ipsa, usdclp, sp500, wti, gold |
| CO | co/ | es (Colombian) | America/Bogota | MSCI COLCAP / USD-COP | colcap, usdcop, sp500, wti, gold |
| PE | pe/ | es (Peruvian) | America/Lima | S&P/BVL Peru General / USD-PEN | spbvl, usdpen, sp500, wti, gold |

Steps for one region (DATE = the local edition date, NO = shared number):
1. Items: query D1 dailydrop-feed (0f239386-f7cf-42ed-838d-46eb896bea87): `items` where region IN (REGION,'GLB') and collected_at within the last ~30h, tiers A/B first; plus that window's `hourly` digest clusters with this region. Dump to scratchpad/ed/MMDD/<region>_items.txt. Feeds are new and thin for CA/AU — supplement with WebSearch of that country's main outlets.
2. Markets: read D1 `quotes` (k, v, chg, ts). Write site/markets.json MARKETS[REGION][DATE] with every tape key = previous close (asof = local date of ts, e.g. "10/8"). chg units: indices, rate pairs and other FX pairs (gbpusd, eurusd, audusd, usdinr, usdcad, usdtwd, usdsgd, usdbrl, usdmxn, usdchf) = percent; usdkrw/usdjpy = absolute; us10y = percentage points. Ears use the same figures.
3. Edition agent (one per region, launch immediately; relaunch at once on failure and tell the party): brief = scratchpad/ed/BRIEF.md. Template = the region's previous edition if it exists, otherwise site/editions/us/<latest>.html for structure, rewritten fully in the edition language (fonts: de/fr/pt/es/it/nl like the EN preset in scratchpad/ed/TRANSLATE.md; zh-TW = Noto Serif TC / Noto Sans TC with `word-break:normal;overflow-wrap:anywhere;line-break:strict`). All labels (fills, index header, rumor/what-to-watch, house line, colophon, popup labels) in the edition language. Output site/editions/<prefix>/<DATE>.html. Lead ≈ 450–550 words (zh-TW ≈ 900–1,100 字), side ≈ 220–300 words, briefs one line. Validate: BRIEF's node A/G check + Playwright 390 and 1280 (executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome): 0 page errors, no horizontal overflow, first .story opens #ov.
4. Fillers: site/pool.json key 'REGION:DATE', 10–16 one-line briefs in the edition language with source.
5. Translations (free-only, translation desk session session_01VqETePG6o1uBNtmku4NWm5): commit and push ONLY the edition HTML (unregistered = not published), then send_message "JOB: site/editions/<prefix>/<DATE>.html -> ko, ja" (+ ", en" if the edition language is not English). The builder auto-detects <DATE>.<lang>.html files. If nothing lands within 60 min, fall back to in-session translation Agents.
6. Publish at 06:00 local — SCHEDULED (owner rule 10/9: never depend on the session being alive at 06:00): as soon as the edition validates, register it in site/editions.json with "publish_at": "<06:00 local as UTC ISO, e.g. 2026-10-10T04:00:00Z for Paris>" plus date/no/region/file/blurb, add markets/pool rows, build locally and smoke-check, then pull --rebase and push IMMEDIATELY. The deploy pre-builds it (site/schedule.js) and the site Worker reveals the country's front page and that edition's pages at publish_at by itself. Target: pushed at least 2 hours before 06:00 local. If already past 06:00, omit publish_at and push at once (say so in the party). Commit site/extras/<prefix><DATE>.json (source links + influencer box, see scratchpad/ed/EXTRAS.md) in the same commit as the registration.
7. After pushing: sync the app snapshot (scratchpad/syncsnap.sh, npm run build + npm test in scratchpad/wt-app/codex-mobile, push app-mobile); post to the party in Korean: link https://dailydrop.kr/<prefix>/, the lead headline (with a Korean gloss), tokens_total.

Several regions in one run (EU group: DE, FR, GB): run steps 1–5 for each in parallel; DE/FR publish at 06:00 Paris/Berlin, GB at 06:00 London (one hour later).

Owner rule (10/8): every edition's No. 1 is 2026-10-05. Whenever a new country edition launches, publish its back issues from No. 1 (2026-10-05) up to the current issue as well, so every country's archive starts at No. 1 (template prompt: scratchpad/ed/back7/PROMPT.md).

## Rules added 10/11 (all regions)
- U.S. closes: use the latest COMPLETED U.S. session before 05:00 local. For NZ (06:00 = ~17:00 UTC previous day) that is TWO U.S. sessions back from the NZ calendar date.
- Events after 05:00 local never appear except as "what to watch". Check the event's own local time (e.g. a Saturday strike in Saudi Arabia is after a Saturday-06:00 NZ/Asia cut-off).
- When local market data cannot be confirmed from two sources, the ear shows "—" (never invent); ECB reference rate may be used for EUR-USD (label it).
- Thin local coverage: 3 main stories with 2+ outlets each is acceptable; single-source items must be labelled. Rumor block only real circulating claims (0–3). Influencer box: own posts on a named platform only.
- Paragraphs stay justified as in the template. Glossary w notes describe this issue only.
- (10/12 KR correction) Separate the EVENT date from the REPORT date: "X happened, it emerged on the 11th" vs "X happened on the 11th". Never write "on <date>" unless the article states the event happened that day. Never write "not reported" for a figure unless 2+ outlets were checked and none gave it.
