# DailyDrop 타자기 효과음 출처 목록 (SOURCES)

조사일: 2026-10-10 · 대상: 실제 녹음된 수동(기계식) 타자기 소리 · 벨(bell) 소리 제외

## 먼저 읽을 것 (중요)

- 이 폴더의 `*_preview.mp3` 파일은 freesound.org가 로그인 없이 공개하는 **HQ 미리듣기 MP3**(약 100–300 kbps, 손실 압축)입니다. 원본 WAV가 아닙니다.
- 원본 소리는 모두 **CC0 1.0 (Creative Commons 0, 퍼블릭 도메인 기증)** 이라서 미리듣기 파일도 상업적 앱에 출처 표기 없이 써도 법적으로 문제는 없습니다. 다만 최종 음질을 원하면 **원본 WAV는 freesound 로그인 후 소유자가 직접 받아야** 합니다(아래 표의 URL 사용).
- 시간 표기(예: `1.51–1.64s`)는 ffmpeg `silencedetect`(-30 또는 -40 dB)로 측정한 "소리가 나는 구간"입니다. ±20 ms 정도 오차가 있으니 자를 때 앞뒤로 10–20 ms 여유를 두세요.
- 1920–50년대 기종이라고 소개된 파일: Underwood No.11(약 1925), 1920s Remington, 1930s Mercedes, 1940s Royal, Royal Quiet De Luxe, Erika 5(1940, CC BY). 나머지는 기종 미상이거나 1960–70년대 기종입니다.

## A. 다운로드한 파일 (모두 CC0, freesound 미리듣기)

| 파일명 | 종류 | 기종 | 출처 URL | 작성자 | 라이선스 | 길이 | 품질 메모 / 깨끗한 단발 구간 |
|---|---|---|---|---|---|---|---|
| underwood11_key_single_fs652588_preview.mp3 | 키(단발) | Underwood No.11, 약 1925 (단, 플래튼은 1970년대 다른 기계) | https://freesound.org/people/VishwaJay/sounds/652588/ | VishwaJay | CC0 1.0 | 1.00s | 방음부스, Zoom H4. 단발 1회 0.07–0.36s. 잡음 바닥 -80 dB, 매우 깨끗함. **최고 후보** |
| 1930s_mercedes_typing_fs434027_preview.mp3 | 키(연속, 잘라 쓰기) | 1930년대 Mercedes (독일) | https://freesound.org/people/monotraum/sounds/434027/ | monotraum | CC0 1.0 | 42.50s | Beyerdynamic M160 리본 마이크 근접, RX5 잡음 제거, 잡음 바닥 -87 dB. 타건 간격이 넓어서 자르기 쉬움. 단발 구간: 1.51–1.64, 2.88–3.01, 3.32–3.45, 3.55–3.68, 4.03–4.15, 4.78–4.90, 6.84–6.98, 8.52–8.69, 11.15–11.31, 12.03–12.14s 등 100개 이상. **최고 후보** |
| typewriter_keys6_return_fs550340_preview.mp3 | 키 6번 + 캐리지 리턴 1번 | 미상 (기계식) | https://freesound.org/people/Nox_Sound/sounds/550340/ | Nox_Sound | CC0 1.0 | 8.68s | Rode NTG4 근접, 모노, 무음 배경. 키: 0.00–0.36, 1.16–1.48, 2.35–2.66, 3.44–3.71, 4.51–4.86, 5.62–5.89s. 리턴 레버(벨 없음): 6.80–7.91s. **최고 후보(키·리턴 둘 다)** |
| remington1920s_typing_fs793351_preview.mp3 | 키(연속) + 캐리지 이동 | 1920s Remington | https://freesound.org/people/rpnelson/sounds/793351/ | rpnelson | CC0 1.0 | 18.65s | Zoom H1n, 잡음 바닥 -49 dB(약간 실내 소음). 리턴 없음, 벨 없음. 단발 구간: 1.95–2.04, 3.25–3.33, 4.28–4.37, 5.08–5.16, 6.21–6.27, 7.09–7.15, 8.82–8.91, 12.16–12.28s |
| royal_quietdeluxe_typing_fs240839_preview.mp3 | 키(연속) | Royal Quiet De Luxe (1940–50년대 모델) | https://freesound.org/people/videog/sounds/240839/ | videog | CC0 1.0 | 21.13s | Rode NTG2, 사무실. **줄 끝 벨 + 리턴 포함 → 해당 부분 쓰지 말 것**(설명상 끝부분, 대략 17.5s 이후). 단발 구간: 3.57–3.77, 6.12–6.33, 8.98–9.07, 9.26–9.34, 11.68–11.76s |
| royal1940s_typing_fs177903_preview.mp3 | 키(연속) | Royal, 태그 1940s | https://freesound.org/people/tubbers/sounds/177903/ | tubbers | CC0 1.0 | 38.04s | Yamaha Pocketrak 2대, 타건이 촘촘해서 단발 분리가 어려움. 분리 가능 구간: 16.78–17.03, 17.11–17.38s. 우선순위 낮음 |
| oldtypewriter_key_01_fs380138_preview.mp3 | 키(단발) | "classic old typewriter" (기종 미상) | https://freesound.org/people/yottasounds/sounds/380138/ | yottasounds | CC0 1.0 | 0.28s | 이미 단발로 잘려 있음. 미리듣기 피크가 0 dBFS 초과(+1.5 dB) → 클리핑 가능성, 원본 WAV 권장 |
| oldtypewriter_key_02_fs380137_preview.mp3 | 키(단발) | 위와 같음 | https://freesound.org/people/yottasounds/sounds/380137/ | yottasounds | CC0 1.0 | 0.27s | 위와 같음 (+1.3 dB) |
| oldtypewriter_key_03_fs380136_preview.mp3 | 키(단발, 가장 짧음) | 위와 같음 | https://freesound.org/people/yottasounds/sounds/380136/ | yottasounds | CC0 1.0 | 0.23s | 위와 같음 (+0.8 dB). 짧아서 마침표용 가벼운 타건 대용 가능 |
| oldtypewriter_typing_short_fs380133_preview.mp3 | 키 몇 번 | 위와 같음 | https://freesound.org/people/yottasounds/sounds/380133/ | yottasounds | CC0 1.0 | 1.66s | 0.00–1.10s 연속 타건, 1.30–1.56s 단발. 피크 +4 dB(클리핑) |
| typewriter_key_single_tamskp_fs160678_preview.mp3 | 키(단발, 매우 짧음) | 미상 | https://freesound.org/people/BMacZero/sounds/160678/ | BMacZero (원본: tams_kp #43560, 역시 CC0) | CC0 1.0 | 0.12s | 아주 짧고 날카로움. **마침표·가벼운 타건 후보** |
| antique_key_single_fs785412_preview.mp3 | 키(단발) | "antique typewriter" | https://freesound.org/people/bubblegump1977/sounds/785412/ | bubblegump1977 | CC0 1.0 | 1.41s | 소리 구간 0.32–0.48s, 레벨 낮음(피크 -17 dB). 부드럽고 가벼운 타건 → **마침표 대용 후보** |
| mechanical_typewriter_01_fs761351_preview.mp3 | 키/기계 클릭 | 미상 기계식 | https://freesound.org/people/CallFlan/sounds/761351/ | CallFlan | CC0 1.0 | 1.31s | 깨끗함(-70 dB). 클릭 3개: 0.51–0.55, 0.60–0.68, 0.90–1.00s. 작은 클릭은 **캐리지 틱 후보** |
| mechanical_typewriter_02_fs761352_preview.mp3 | 키/기계 동작 | 미상 기계식 | https://freesound.org/people/CallFlan/sounds/761352/ | CallFlan | CC0 1.0 | 1.94s | 0.20–0.30, 0.35–0.91, 1.15–1.32s |
| silver_keystroke_fs734313_preview.mp3 | 키 5번 | "Silver Typewriter" (기종 미상) | https://freesound.org/people/moodyfingers/sounds/734313/ | moodyfingers | CC0 1.0 | 3.55s | 스마트폰 녹음 + 잡음 제거. 단발: 0.15–0.46, 0.89–1.15, 1.57–1.84, 2.26–2.53, 3.01–3.26s |
| silver_spacebar_fs734318_preview.mp3 | 스페이스바 = 캐리지 한 칸 이동 | 위와 같음 | https://freesound.org/people/moodyfingers/sounds/734318/ | moodyfingers | CC0 1.0 | 2.50s | 누름/뗌 쌍 3번: 0.16–0.28 / 0.38–0.49, 1.06–1.17 / 1.27–1.39, 1.87–1.97 / 2.06–2.16s. 뗄 때 소리가 **이스케이프먼트 틱**에 가까움 |
| olimpia_space_ticks_fs852747_preview.mp3 | 스페이스(캐리지 이동) | Olympia(표기 "Olimpia"), 1970년대 | https://freesound.org/people/ikomlino/sounds/852747/ | ikomlino | CC0 1.0 | 1.61s | Sennheiser 416 + Sound Devices 442, 방송급. 0.09–0.26s 단발, 0.32–1.24s 연속 스페이스. **캐리지 틱 최고 후보**(기종은 70년대) |
| olimpia_clicks_fs852744_preview.mp3 | 짧은 기계 클릭 여러 개 | Olympia, 1970년대 | https://freesound.org/people/ikomlino/sounds/852744/ | ikomlino | CC0 1.0 | 8.03s | 방송급. 아주 짧은 클릭: 0.08–0.12, 1.12–1.13, 1.49–1.52, 1.74–1.76, 2.15–2.16, 3.52–3.53, 4.55–4.56, 7.42–7.42s → **틱 대용 후보** |
| carriage_slide_back_fs406238_preview.mp3 | 캐리지 좌우 이동(래칫 연속 틱) | 미상 | https://freesound.org/people/_stubb/sounds/406238/ | _stubb | CC0 1.0 | 6.13s | 근접 모노. 레벨 매우 낮음(피크 -33 dB) → 정규화 필요. 1.74–3.00s에 약 50 ms 간격 래칫 틱 연속(2.10, 2.18, 2.24, 2.29, 2.34, 2.38…s) — 틱 하나씩 잘라 쓸 수 있음 |
| carriage_reset_ratchet_fs868294_preview.mp3 | 캐리지 리턴(래칫 스윕) | 미상 | https://freesound.org/people/Mihacappy/sounds/868294/ | Mihacappy | CC0 1.0 | 0.79s | 폰 녹음, 배경 잡음 큼(-36 dB). 벨 없음. 짧은 리턴 스윕 |
| mechanical_line_ratchet_fs761339_preview.mp3 | 줄바꿈 래칫(플래튼 회전) | 미상 기계식 | https://freesound.org/people/CallFlan/sounds/761339/ | CallFlan | CC0 1.0 | 3.04s | 깨끗함. 0.07–1.64, 1.87–2.05, 2.17–2.64s. 이스케이프먼트가 아니라 줄 간격 래칫 소리 |
| silver_return_lever_1_fs734310_preview.mp3 | 리턴 레버 | Silver Typewriter | https://freesound.org/people/moodyfingers/sounds/734310/ | moodyfingers | CC0 1.0 | 3.32s | 짧은 레버 동작 6번(0.15–0.25, 0.68–0.79, 1.23–1.32, 1.74–1.88, 2.33–2.44, 2.89–2.99s). 캐리지 전체 스윕은 아님 |
| silver_return_lever_3_fs734312_preview.mp3 | 리턴 레버 | Silver Typewriter | https://freesound.org/people/moodyfingers/sounds/734312/ | moodyfingers | CC0 1.0 | 3.59s | 위와 비슷 |

다운로드 총량: 약 3.3 MB (23개).

## B. 다운로드하지 않은 후보 (로그인 필요 또는 라이선스상 직접 다운로드 대상 아님)

| 종류 | 기종 | 출처 URL | 작성자 | 라이선스(정확히) | 길이 | 메모 |
|---|---|---|---|---|---|---|
| 키(연속) | Erika 5, Seidel & Naumann, 1940 | https://commons.wikimedia.org/wiki/File:WWS_Typewriter.ogg | Work With Sounds / Konrad Gutkowski | **CC BY 4.0** (출처 표기 필수) | 25.90s | 1920–50년대 조건에 정확히 맞는 기계. 지시 조건(CC0/PD/Pixabay만 다운로드)에 따라 받지 않음. 쓸 경우 표기문: `"Typewriter" (Erika 5, 1940) by Work With Sounds / Konrad Gutkowski, CC BY 4.0, via Wikimedia Commons` |
| 키(연속) | Olympia, 1956 | https://freesound.org/people/AchimEngels/sounds/650986/ | AchimEngels | CC0 1.0 | 110.52s | 종이 넣기·타건·빼기. Tascam DR-05. 원본은 로그인 필요 |
| 키(연속) | 80년 된 Remington | https://freesound.org/people/vumseplutten1709/sounds/200295/ | vumseplutten1709 | CC0 1.0 | 28.89s | 마이크가 약간 멀다고 설명 |
| 키(연속) | 1940s 사무실 기계식 | https://freesound.org/people/PostProdDog/sounds/550859/ | PostProdDog | CC0 1.0 | 532.68s | 앰비언스(기침·혼잣말 섞임), 리턴 소리 포함. 단발용으로는 부적합 |
| 키(연속) | Optima (Referent Super), 1960 | https://freesound.org/people/meisterleise/sounds/843669/ | meisterleise | CC0 1.0 | 18.88s | 벨 포함 |
| 키(연속) | 오래된 기계 | https://freesound.org/people/monotraum/sounds/145534/ | monotraum | CC0 1.0 | 31.25s | 434027과 같은 작성자 |
| 키(연속) | 수동 타자기 | https://freesound.org/people/craigsmith/sounds/483335/ | craigsmith | CC0 1.0 | 20.73s | 매우 빠른 타이핑, 리턴 없음 → 분리 어려움 |
| 키(연속) | 오래된 기계 | https://freesound.org/people/tams_kp/sounds/43560/ | tams_kp | CC0 1.0 | 124.23s | 160678 단발의 원본 |
| 종이 넣기/빼기·종이 노브 | Olympia 70년대 | https://freesound.org/people/ikomlino/sounds/852746/ , /852745/ , /852749/ , /852750/ | ikomlino | CC0 1.0 | 3.7–7.8s | 같은 고음질 팩(#45600). 인트로 연출용 |
| 키 연속 | Olympia 70년대 | https://freesound.org/people/ikomlino/sounds/852748/ | ikomlino | CC0 1.0 | 19.84s | 같은 고음질 팩 |
| 마진 세팅 등 기계음 | 미상 기계식 | https://freesound.org/people/CallFlan/packs/41992/ | CallFlan | CC0 1.0 | 다양 | 팩 전체 CC0 |
| 키 연속 | 미상 | https://freesound.org/people/Soundscape_Leuphana/sounds/210295/ | Soundscape_Leuphana | CC0 1.0 | 3.44s | Zoom H1 XY |
| 리턴 레버 + 마진 릴리스 | Silver Typewriter | https://freesound.org/people/moodyfingers/sounds/734314/ | moodyfingers | CC0 1.0 | 9.83s | 리턴 스윕 전체 포함 |
| (Pixabay 미러) | 다양 | https://pixabay.com/sound-effects/search/typewriter/ | 대부분 "freesound_community" | Pixabay Content License | — | Pixabay의 "freesound_community" 항목은 위 freesound CC0 소리의 사본임(예: "Typewriter Carriage Return" = ramsamba, "ROYAL TYPEWRITER" = tubbers 177903). curl은 Cloudflare 403으로 차단되어 받지 못함. 브라우저에서 받으면 됨. Kave_msri, sea-you-later 등 개인 업로드는 실제 녹음 여부 미확인 |

## C. 제외한 것 (이유)

| 소리 | URL | 이유 |
|---|---|---|
| Vintage Typewriter Key Press Sound Effect | https://freesound.org/people/brktkrgll/sounds/856165/ | CC0이지만 **AI 생성(ElevenLabs)** 이라고 명시 → "실제 녹음" 조건 위반 |
| Typewriter's Key | https://freesound.org/people/PerMagnusLindborg/sounds/335898/ | 멤브레인 키보드를 필터링한 폴리 → 진짜 타자기 아님 |
| Toy Electronic Typewriter 시리즈 | https://freesound.org/people/sprinkleCipher/ (752744–752756) | 장난감 전자 타자기 |
| 모든 벨/딩 소리 | 318687, 406243(_stubb, Commons에도 있음), 345955, 623435, 444813, 750305 | 소유자 지시: 벨 금지 |
| Smith-Corona Prestige Auto 12 | https://commons.wikimedia.org/wiki/File:Smith-Corona_Prestige_Auto_12_typing.ogg | 전동 타자기 + CC BY 3.0 |
| IBM Selectric II, Electric Typewriter | freesound 224012, 476895 | 전동 타자기 |
| Agirre lehendakariaren idazmakina | https://commons.wikimedia.org/wiki/File:Agirre_lehendakariaren_idazmakina.mp3 | CC BY-SA 4.0(동일조건 변경허락 — 앱 사용 시 조건이 모호), 7분 길이 |
| Typewriter snippet [processed] | https://freesound.org/people/cabled_mess/sounds/360603/ | 가공(processed)된 소리 |
| BBC Sound Effects | — | 비상업 라이선스 → 사용 불가 |
| Commons의 타자기 영상(webm) | Underwood 315, Olivetti Dora, Optima M12 등 | 영상 파일, 라이선스 개별 확인 필요해 제외 |

## 추천 요약

- 키 타건 최고 3개: ① underwood11_key_single (Underwood No.11, 단발) ② 1930s_mercedes_typing (1930년대, 리본 마이크, 단발 100여 개 추출 가능) ③ typewriter_keys6_return (NTG4 근접, 단발 6개)
- 마침표/가벼운 타건: typewriter_key_single_tamskp(0.12s) 또는 antique_key_single(작고 부드러움), oldtypewriter_key_03
- 캐리지 틱: olimpia_space_ticks 0.09–0.26s (방송급 녹음) / 차선: silver_spacebar 뗌 소리, carriage_slide_back의 래칫 틱 하나
- 리턴 레버(벨 없음): typewriter_keys6_return 6.80–7.91s
