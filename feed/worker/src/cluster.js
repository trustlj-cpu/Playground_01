// 같은 사건 묶기. 보수적: 대표(lead) 토큰과 비교(연쇄 병합 방지), 일반어 제외, 라틴 토큰은 정확 일치만.
const STOP = new Set(`the a an and or of to in on for with by from at as is are was be this that it its vs via amid after before over under into about says said say new will may could would should has have had not no up down out more most less than then here how first why what when where who which while also just like back make made get got one two three day days immediate immediately confirmation confirmed confirms confirm claim claims claimed responsibility statement statements ballistic missile missiles drone drones rocket rockets shelling airstrike airstrikes time news live update updates report reports watch video photos opinion analysis exclusive breaking today tonight week year years month top best deals deal prime big your their our his her they them been were into onto off per vs amid among between against during within without around every some any all each other another same still even much many few own man men woman women city case cases open opens death dies dead died join joins wins win won hit hits record high highs low lows rises rise falls fall gains gain drops drop climbs surge surges slips slip stall stalls move moves live update updates latest market markets stocks stock shares price prices week weekly daily month monthly review preview since until after before says said say told tells telling told according minister secretary state department spokesman spokesperson spokeswoman official officials spending cuts cut pass passes passed ready prepared senate race races election elections vote votes voters poll polls campaign candidate candidates january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday attack attacks attacked strike strikes struck killed kills dead deaths wounded injured forces troops military army leader leaders president vice prime minister secretary chancellor governor senator warns warning warned threat threatens index indices indicator survey actual forecast previous consensus estimate estimates reading readings data central bank banks reserves holdings billion million trillion bln mln trln yield yields bonds bond rate rates lower higher ahead focus clues edges open opens opened find finds self multi agent agents llm llms model models language learning approach approaches towards based large small novel framework method methods benchmark benchmarking policy optimization preserving robust efficient scalable neural network networks deep training inference generative transformer transformers liveblog केंद्रीय मंत्री श्री श्रीमती राज्य सरकार accused bail granted charged denied refused faces debate debates takeaways sparks fiery personal 不正アクセス 個人情報 情報漏洩 情報漏えい 漏洩 漏えい 可能性 不正 アクセス 個人情報漏 万件 億件 ユーザー 情報 システム
का की के में है हैं से और को पर ने लिए बाद साथ कहा कहना गया गई गए दिया किया करने करेंगे कर रहा रही रहे होगा हुआ हुई यह वह ये वे भी नहीं तक एक अब जब तो ही था थी थे नया नई नए आज कल खबर ख़बर ताजा ताज़ा लाइव अपडेट ब्रेकिंग न्यूज़ न्यूज वीडियो कोई कुछ सभी अपने अपनी बीच लेकर बताया दौरान बार बात बड़ा बड़ी सरकार मंत्री प्रधानमंत्री राष्ट्रपति रेट दर दरें
및 등 의 을 를 이 가 은 는 에 에서 로 으로 와 과 도 만 더 또 대한 위한 관련 통해 대해 장관 차관 총리 대통령 청장 위원장 의원 대표 회장 사장 국장 지사 교수 감독 부총재보 부총재 총재 원장 시장 군수 구청장 장관은 장관이 대통령은 대통령이 고래 whale whales 속보 단독 종합 영상 포토 사진 기자 경찰 수사 조사 체포 소환 논란 파장 발언 대가 할인 파격 무슨 발매 싱글 신곡 컴백 앨범 음원 활동 목표가 목표주가 증권 증권사 보고서 컨센서스 실적 분기 특징주 장초반 강세 약세 상향 하향 상회 하회 추정치 기대감 하나증권 kb증권 nh투자증권 삼성증권 미래에셋 키움증권 신한투자증권 대신증권 한국투자증권 유안타증권 메리츠증권 매수 매도 주가 종목 시장 금리 영업익 매출 순이익 어닝 인상 인하 동결 전망 예상 가능성 우려 기대 영향 확대 축소 감소 증가 급등 급락 상승 하락 최고 최저 사상 역대 처음 첫 아파트 주택 부동산 집값 가격 경매 매매 전세 월세 거래 지역 서울시 수도권 두 세 네 하나 둘 셋 올해 내년 작년 지난해 이번주 다음주 오늘 내일 어제 현재 최근 뉴스 오늘 내일 어제 발표 확인 가능 전망 이번 지난 올해 내년 작년 최고 최대 최초 역대 처음 다시 계속 위해 때문 이후 이전 전체 관계자 입장 밝혔다 밝혀 나타났다 것으로 한다 했다 있다 없다 된다 됐다 한국 미국 정부 국내 세계 글로벌 시장 기업 업계 사람 사용 서비스 공개 출시 진행 예정 추진 검토 논란 우려 기대 효과 결과 이유 방법 상황 문제 rose rises rise rising fell falls fall falling climbed climbs climb jumped jumps jump slipped slips slip dropped drops gained gains gain eased eases ease surged surges surge plunged plunges tumbled tumbles edged edges steady unchanged surging soaring plunging tumbling sliding slumping rallying house remarks 発表 政府 会見 記者 速報 写真 動画 解説 午前 午後 今日 明日 昨日 今年 来年 去年 日本 国内 海外 世界 東京 大阪 ニュース 時事 共同 朝日 毎日 読売 日経 産経 関連 可能性 方針 見通し 予定 対応 影響 問題 発生 確認 開始 終了 決定 検討 強調 指摘 表明 説明 報道 取材 調査 捜査 逮捕 死亡 負傷 以上 以下 前年 同期 前月 比較 増加 減少 上昇 下落 最高 最低 過去 初めて 手機比較 規格表 效能 比較 中國版 評測 開箱`.split(/\s+/));
const SYN = { '한은': '한국은행', '연준': 'fed', 'fomc': 'fed', '코스피': 'kospi', '美': '미국', '中': '중국', '日': '일본', 'trump': '트럼프', 'bitcoin': '비트코인', 'btc': '비트코인', 'samsung': '삼성전자', '삼성': '삼성전자', 'nvidia': '엔비디아', '소비자물가': '물가', '물가상승률': '물가', '트럼프': '트럼프', 'ezb': 'ecb', 'bce': 'ecb', 'आरबीआई': 'rbi', 'मोदी': 'modi', 'ट्रंप': '트럼프', 'ट्रम्प': '트럼프', 'élysée': 'elysee', 'copom': 'bcb', 'bankitalia': 'bdi', 'eeuu': 'america', 'eua': 'america' };
// 여러 단어로 된 기관명 → 약어(약한 2~3자 토큰, 원문 약어와 같은 취급). 제목(소문자·NFC)에 구절이 있으면 약어 토큰을 덧붙인다(원 단어 토큰은 그대로).
const PHRASE = [['premier league', 'premierleague'], ['supreme court', 'supremecourt'], ['high court', 'highcourt'], ['green card', 'greencard'], ['green cards', 'greencard'], ['green party', 'greenparty'], ['greens party', 'greenparty'], ['bank of england', 'boe'], ['reserve bank of india', 'rbi'], ['reserve bank of australia', 'rba'], ['bank of canada', 'boc'], ['banque du canada', 'boc'], ['banque de france', 'bdf'], ['european central bank', 'ecb'], ['europäische zentralbank', 'ecb'], ['europäischen zentralbank', 'ecb'], ['banque centrale européenne', 'ecb'], ['रिज़र्व बैंक', 'rbi'], ['रिजर्व बैंक', 'rbi'], ['monetary authority of singapore', 'mas'], ['banco central do brasil', 'bcb'], ['banco central europeu', 'ecb'], ['banco central europeo', 'ecb'], ['banca centrale europea', 'ecb'], ['europese centrale bank', 'ecb'], ['banco de méxico', 'banxico'], ['banco de mexico', 'banxico'], ["banca d'italia", 'bdi'], ['banca d’italia', 'bdi'], ['banco de españa', 'bde'], ['de nederlandsche bank', 'dnb'], ['schweizerische nationalbank', 'snb'], ['banque nationale suisse', 'snb'], ['banca nazionale svizzera', 'snb'], ['reserva federal', 'fed'], ['riserva federale', 'fed'], ['estados unidos', 'america'], ['stati uniti', 'america'], ['verenigde staten', 'america']];
// 언어별 기능어·일반어(lang 이 있을 때만 적용 — 'pour'·'direct'처럼 영어 단어와 겹치는 것이 있어 전역 STOP에 넣지 않는다)
const LANG_STOP = {
  de: new Set('künstliche der die das und bank banken zins zinsen ein eine einen einem einer eines mit für von zu im den dem des ist sind war wird werden wurde nach bei auf aus über unter nicht auch noch wie als vor gegen neue neuer neues neuen mehr sich sein seine ihre ihr zum zur bis durch heute gestern morgen jahr jahre jahren prozent liveblog ticker live-ticker liveticker newsblog eilmeldung live news aktuell aktuelle exklusiv kommentar analyse video interview laut soll sollen will kann muss jetzt erst erste ersten zwei drei vier milliarden millionen euro kanzler kanzlerin minister ministerin präsident präsidentin chef chefin januar februar märz april juni juli august september oktober november dezember montag dienstag mittwoch donnerstag freitag samstag sonntag'.split(' ')),
  fr: new Set('états-unis états unis comment obtenir billets dernière minute le la les des du de et en un une pour sur banque banques centrale taux au aux dans est sont par avec plus pas qui que ont été être après avant contre selon face sous entre leur leurs cette ces son ses nouveau nouvelle nouvelles direct vidéo vidéos photos info infos actualité alerte exclusif annonce annonces annoncé déclare veut faut fait faire peut deux trois premier première milliards millions euros ministre président présidente chef janvier février mars avril juin juillet août septembre octobre novembre décembre lundi mardi mercredi jeudi vendredi samedi dimanche'.split(' ')),
  pt: new Set('o a os as um uma uns umas de do da dos das e em no na nos nas por pelo pela pelos pelas para com sem sobre entre após antes contra até desde que quem qual quais como mais menos muito muita não sim já ainda também seu sua seus suas ele ela eles elas este esta esse essa isso isto aquele novo nova novos novas banco bancos central juros taxa taxas ser estar está estão foi foram será vai pode deve diz dizem afirma anuncia hoje ontem amanhã agora ano anos mês semana dois duas três primeiro primeira bilhões milhões reais real ministro ministra presidente presidenta governo vídeo vídeos fotos ao vivo urgente exclusivo análise opinião entrevista janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro segunda terça quarta quinta sexta sábado domingo resultado resultados concurso números sorteados sorteio confira previsão tempo sol nuvens muitas algumas chuva pancadas aumento calor frio temperatura'.split(' ')),
  es: new Set('categoría el la los las un una unos unas de del al y e o en por para con sin sobre entre tras ante antes contra hasta desde que quien cual cuales como más menos muy no sí ya aún también su sus este esta estos estas ese esa eso esto nuevo nueva nuevos nuevas banco bancos central tipos tasa tasas ser estar está están fue fueron será va puede debe dice dicen afirma anuncia hoy ayer mañana ahora año años mes semana dos tres primer primero primera millones euros pesos ministro ministra presidente presidenta gobierno vídeo video fotos directo última hora urgente exclusiva análisis opinión entrevista enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre lunes martes miércoles jueves viernes sábado domingo resultados resultado sorteo números ganadores'.split(' ')),
  it: new Set('il lo la i gli le un uno una di del dello della dei degli delle dell dall nell sull quest anch a al allo alla ai agli alle da dal dalla dai in nel nella nei con su sul sulla per tra fra e ed o che chi come più meno molto non già ancora anche suo sua suoi sue questo questa questi queste quello quella nuovo nuova nuovi nuove banca banche centrale tassi tasso essere stato stata sono era sarà può deve dice dicono afferma annuncia oggi ieri domani adesso anno anni mese settimana due tre primo prima miliardi milioni euro ministro ministra presidente premier governo video foto diretta live ultim ultime ultima notizie esclusiva analisi opinione intervista gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre lunedì martedì mercoledì giovedì venerdì sabato domenica'.split(' ')),
  nl: new Set('de het een en of in op aan van voor met bij uit over onder naar tot door om na tegen tussen zonder dat die dit deze wie wat hoe meer minder veel niet geen ook nog al zijn haar hun hij zij ze wordt worden werd werden is was zal kan moet wil zegt zeggen meldt nieuw nieuwe bank banken centrale rente vandaag gisteren morgen nu jaar jaren maand week twee drie eerste miljard miljoen euro minister premier president kabinet regering video foto live liveblog update nieuws exclusief analyse opinie interview januari februari maart april mei juni juli augustus september oktober november december maandag dinsdag woensdag donderdag vrijdag zaterdag zondag'.split(' ')),
};
// 중국어(번체) 일반어 2자 토큰 — 바이그램은 모두 '강한' 토큰이라 흔한 서술어가 겹치면 오병합된다
const ZH_STOP = new Set('連假 首日 營收 營業額 月減 月增 年減 年增 創新高 新高 歷史 同期 前三季 第三季 第3季 上半年 下半年 季報 月報 表現 看好 獲利 出貨 動能 強勁 預期 優於 飆增 大增 成長 衰退 快訊 快讯 最新 即時 獨家 直播 影音 圖輯 新聞 記者 報導 報道 表示 指出 宣布 強調 今天 今日 昨天 明天 今年 去年 明年 目前 一個 我們 他們 什麼 沒有 可能 已經 因為 如果 但是 這個 相關 重要 持續 發布 公布 消息 民眾 國內 國際 總統 總理 部長 院長 主席 首相 政府 官員 立委 市長 上漲 下跌 大漲 大跌 新高 新低 億元 萬元 美元 台股 股市 市場 影響 可能 回應 曝光 網友 不是 一年 今年 首度 首次 再度 正式 完成 開始 提出 進行 推動 預計 預估 傳出 痛批 怒批 喊話 有望'.split(' '));
// 중국어 문장 분절자: 이 글자에서 끊고 남은 조각만 바이그램(的·在·是…를 낀 가짜 바이그램 방지)
const ZH_SPLIT = /[的在是了和與与及將将對对為为從从被把也都就而並并於于]/u;
// 중국어 표기 정규화·기관/지명 → 기존 토큰(지명은 GEO 영어형으로 모아 약한 토큰이 되게). 2자는 바이그램 단위로, 3자 이상은 구절로 먼저 떼어 낸다.
const ZH_SYN = { '臺灣': 'taiwan', '台灣': 'taiwan', '台湾': 'taiwan', '臺北': 'taipei', '台北': 'taipei', '美國': 'america', '美国': 'america', '中國': 'china', '中国': 'china', '韓國': 'korea', '韩国': 'korea', '南韓': 'korea', '北韓': '북한', '日本': 'japan', '英國': 'britain', '德國': 'germany', '法國': 'france', '印度': 'india', '澳洲': 'australia', '北京': 'beijing', '華府': 'washington', '倫敦': 'london', '巴黎': 'paris', '柏林': 'berlin', '東京': 'tokyo', '伊朗': 'iran', '歐洲': 'europe', '川普': '트럼프', '中共': 'china' };
const ZH_PHRASE = [['中央銀行', '央行'], ['中央银行', '央行'], ['歐洲央行', 'ecb'], ['欧洲央行', 'ecb'], ['英國央行', 'boe'], ['英格蘭銀行', 'boe'], ['印度央行', 'rbi'], ['澳洲央行', 'rba'], ['加拿大央行', 'boc'], ['德國央行', 'bundesbank'], ['法國央行', 'bdf'], ['聯準會', 'fed'], ['美聯儲', 'fed'], ['美联储', 'fed'], ['聯儲局', 'fed'], ['特朗普', '트럼프'], ['加拿大', 'canada'], ['澳大利亞', 'australia'], ['烏克蘭', 'ukraine'], ['俄羅斯', 'russia'], ['以色列', 'israel'], ['莫斯科', 'moscow'], ['新德里', 'delhi'], ['渥太華', 'ottawa'], ['坎培拉', 'canberra'], ['華盛頓', 'washington'], ['中華民國', 'taiwan']];

const PREFIX = /^(?:(?:live-?ticker|liveblog|newsblog|financialjuice|odd lots|breaking|exclusive|watch|live|update|opinion|analysis|explainer|factbox|속보|단독|종합|포토|영상|르포|사설|칼럼|기고|인터뷰|eilmeldung|en direct|direct|exclusif|vidéo|快訊|快讯|即時|獨家|速報)\s*[:：|·／-]|(?:en )?direct\s*\.)\s*/i;
const TAG = /[\[［【〈＜<]\s*(?:速報|快訊|快讯|最新|即時|獨家|live|direct|en direct|eilmeldung)\s*[\]］】〉＞>]/gi; // 꼬리표 괄호(괄호 전체 제거 규칙이 못 잡는 전각·꺾쇠 변형)
const ACR_STOP = new Set('us uk eu un the and for its new top says said day big how why who may can has had are was one two ceo pm mr ms dr we he it in on at to of by'.split(' '));
// 독일어·프랑스어 문두 대문자 기능어(Ce qu'il… / Die Bahn… / Le Paris…)는 약어가 아니다 — lang 이 de/fr 일 때만(영어 'LA' 등은 종전대로)
const LANG_ACR_STOP = { de: new Set('der die das den dem des ein im am um zu an auf aus bei mit von vor für was wie wer wo ob so da es er sie wir ihr'.split(' ')), fr: new Set('le la les un une des du de au aux en et ce ces il ils elle on qui que ou où par sur pas son sa ses mon ma un'.split(' ')), pt: new Set('o a os as um de do da dos das no na nos nas em ao aos por que se seu sua ele ela já não'.split(' ')), es: new Set('el la los las un una de del al en lo le les se que su sus por con ya no él'.split(' ')), it: new Set('il lo la le gli un una di del da dal in nel con su per tra che chi se si non già ma'.split(' ')), nl: new Set('de het een in op aan van met bij uit om na en of als dat die dit wie wat hoe er we ze zij hij is'.split(' ')) };
const nfc = t => String(t || '').normalize('NFC');
const normCase = t => nfc(t).replace(TAG, ' ').replace(/\[.*?\]|\(.*?\)|【.*?】/g, ' ').trim().replace(PREFIX, '').replace(/\s+[-|–—]\s+(?:(?!\s[-|–—]\s)[^|–—]){2,40}$/, '').replace(/\s+/g, ' ').trim();
// 매체·섹션 꼬리표 제거: '… | 政治・経済 | 東洋経済オンライン', '… - 연합뉴스TV' 같은 꼬리는 같은 매체 기사끼리 묶이게 만든다
export const stripTail = t => String(t).replace(/(\s*[|｜]\s*[^|｜]{1,32})+\s*$/u, '').replace(/^(.{12,}?)\s+[-–]\s+(\S+(?:\s\S+){0,2})$/u, (m, head, tail) => tail.length <= 28 ? head : m);
export const normTitle = t => normCase(stripTail(t)).toLowerCase();
export function tokenList(t, lang) { return [...tokens(t, lang)]; } // 삽입 순서 = 제목 내 등장 순서
// 라틴 문자(악센트 포함: é è ü ö ß ç ğ…) — 전각 로마자(ＮＹ·Ｓ＆Ｐ)는 종전처럼 제외(일본어 제목 동작 유지)
const LAT = '(?:(?![\\uFF00-\\uFFEF])\\p{Script=Latin})';
const TOKEN_RE = new RegExp(`\\d{1,4}-[A-Za-z]{2,}|[가-힣]{2,}|[\\u4e00-\\u9fff]{2,}|[\\u30a0-\\u30ff]{2,}|${LAT}(?:${LAT}|\\p{M}|[0-9'&.-]){3,}|[\\p{Script=Devanagari}\\u200c\\u200d]{2,}|\\d{3,}`, 'gu');
const isZh = lang => /^zh/i.test(String(lang || ''));
const isDeva = w => /^[\p{Script=Devanagari}‌‍]+$/u.test(w);
const isHan2 = w => /^[\u4e00-\u9fff]{2}$/.test(w);
// 중국어(띄어쓰기 없음) 한자 연속열 → 구절 사전 치환 + 기능어에서 끊기 + 2자 바이그램. 일본어는 종전대로 연속열 통째(가나가 단어 경계 역할).
const ZH_DICT = new Map([...ZH_STOP].map(w => [w, null])); for (const [k, v] of Object.entries(ZH_SYN)) ZH_DICT.set(k, v); for (const [k, v] of ZH_PHRASE) ZH_DICT.set(k, v);
const ZH_MAXLEN = Math.max(...[...ZH_DICT.keys()].map(k => k.length));
function zhParts(run) {
  const out = []; let piece = '';
  const flush = () => { for (let i = 0; i + 2 <= piece.length; i++) out.push(piece.slice(i, i + 2)); piece = ''; };
  for (let i = 0; i < run.length;) {
    let hit = 0; for (let L = Math.min(ZH_MAXLEN, run.length - i); L >= 2; L--) if (ZH_DICT.has(run.slice(i, i + L))) { hit = L; break; }
    if (hit) { flush(); const c = ZH_DICT.get(run.slice(i, i + hit)); if (c) out.push(c); i += hit; continue; } // 사전어(최장 일치): 정규형 토큰 1개로, 일반어는 버리고 그 자리에서 끊는다
    if (ZH_SPLIT.test(run[i])) flush(); else piece += run[i];
    i++;
  }
  flush(); return out;
}
export function tokens(t, lang) {
  const out = new Set();
  const lg = String(lang || '').toLowerCase().split('-')[0], zh = isZh(lang), ls = LANG_STOP[lg], las = LANG_ACR_STOP[lg];
  let nt = normTitle(t);
  const extra = new Set(); for (const [p, c] of PHRASE) if (nt.includes(p)) { extra.add(c); nt = nt.split(p).join(' '); } // 구절은 약어 하나로만 남긴다('reserve bank of india/australia'의 reserve·bank 가 서로 겹치지 않게)
  const raw = nt.match(TOKEN_RE) || [];
  const parts = []; for (const w of raw) { if (zh && /^[\u4e00-\u9fff]+$/.test(w)) { parts.push(...zhParts(w)); continue; } parts.push(w); if (w.includes('-')) for (const p of w.split('-')) if (p.length >= 4) parts.push(p); }
  // 2~3자 약어(BoE·SNB·Fed·ECB·FX)는 원문 대소문자에서만 식별 — 소문자화 전 제목에서 뽑아 약한 토큰으로 추가. 악센트 글자에 붙은 조각(Orbán→'orb', Niño→'ni')은 약어가 아니다
  const acr = new Set((normCase(t).match(/(?<![A-Za-z0-9&.'가-힣\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF\u0300-\u036F-])[A-Z][A-Za-z]{1,2}(?![A-Za-z0-9&.'가-힣\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF\u0300-\u036F-])/g) || []).map(x => x.toLowerCase()).filter(x => !ACR_STOP.has(x) && !(las && las.has(x))));
  for (const x of extra) acr.add(x);
  for (const w1 of [...parts, ...acr]) {
    let w0 = w1.replace(/^[.'&-]+|[.'&-]+$/g, '').replace(/'s$/, '');
    if (lang && /^fr/i.test(lang)) w0 = w0.replace(/^(?:l|d|j|m|n|s|t|c|qu|jusqu|lorsqu|puisqu)'(?=\p{L}{2})/u, ''); // 프랑스어 엘리전(l'Élysée·d'Ottawa)
    else if (lang && /^it/i.test(lang)) w0 = w0.replace(/^(?:l|d|c|un|dell|dall|nell|sull|all|coll|quest|quell|anch|sant|tutt)'(?=\p{L}{2})/u, ''); // 이탈리아어 엘리전(l'Italia·dell'Ue)
    if (!w0 || (!isKo(w0) && w0.length < (isDeva(w0) ? 3 : 4) && !acr.has(w0))) continue; // 한국어는 2자부터, 라틴은 4자부터(원문 약어 예외), 데바나가리는 3자(코드포인트)부터
    const w = SYN[w0] || w0;
    if (STOP.has(w) || (ls && ls.has(w))) continue;
    if (/^\d+$/.test(w) && w.length === 4 && +w >= 1990 && +w <= 2100) continue; // 연도
    out.add(w);
  }
  return out;
}
const isKo = w => /^[가-힣]+$/.test(w) || /^[\u4e00-\u9fff\u30a0-\u30ff]+$/.test(w); // 한글 또는 일본어(한자·가타카나) 토큰
const GEO = new Set('트럼프 trump biden 바이든 russia russian ukraine ukrainian china chinese taiwan japan japanese korea korean north south iran iranian israel israeli gaza palestinian europe european france french germany german britain british england spain spanish italy india indian brazil saudi arabia yemen houthi houthis syria iraq turkey turkish america american asian asia african africa sudan sudanese occupied west nigeria nigerian hong kong hongkong taipei shanghai singapore washington beijing moscow kyiv tokyo seoul london paris berlin 미국 중국 일본 북한 한국 러시아 우크라이나 이란 이스라엘 유럽 대만 인도 브라질 사우디 예멘 후티 중동 서울 워싱턴 베이징 모스크바 도쿄 ottawa canberra delhi westminster downing bundestag élysée elysee deutschland frankreich inde indien canada canadian kanada australia australian australien australie allemagne royaume-uni großbritannien britannique europa européen européenne europäische europäischen brasil brazil brasileiro brasileira brasileiros brasília brasilia méxico mexico mexicano mexicana mexicanos italia italy italiano italiana italiani roma rome milano milan españa spain español española españoles madrid barcelona nederland netherlands nederlandse dutch amsterdam rotterdam schweiz suisse svizzera switzerland swiss schweizer zürich zurich genève geneva bern singapura singaporean estados unidos stati uniti verenigde staten europeo europea europeu europese europei rusia rússia rusland ucrania ucrânia ucraina oekraïne cina chino chinês chinesa alemania alemanha germania duitsland francia frança frankrijk israele irán 台北 臺北 台灣 臺灣 美國 中國 韓國 美国 भारत दिल्ली अमेरिका चीन पाकिस्तान रूस'.split(' '));
// 두 토큰 집합의 '의미 있는' 겹침 수. 한국어는 3자 이상 부분 일치 허용(소비자물가⊃물가 X: 2자 금지), 라틴은 정확 일치만.
// df: 이번 묶음 입력 전체에서 토큰이 등장한 제목 수. 희귀 토큰(≤3개 제목)이 두 제목 모두 앞 2토큰(주어 자리)에 있으면 하나만 겹쳐도 같은 사건 신호.
// 한 시간에 8개 이상 제목에 나오는 '뜨거운' 토큰(삼성전자·반도체·누리호·AI)끼리만 겹치면 같은 사건 근거로 부족 — 뜨겁지 않은 강한 토큰이 최소 1개는 있어야 함
const isHot = (x, df) => df && (df.get(x) || 0) >= 8;
const isRare = (x, df) => df && (df.get(x) || 0) <= 3 && !GEO.has(x) && (isKo(x) ? x.length >= 3 : (x.length >= 5 || /\d/.test(x)));
// zh: 한쪽이라도 중국어(바이그램) 제목이면, 이어지는 바이그램 사슬(台積·積電 = '台積電' 한 단어)을 단어 하나 분량으로 센다 — 3자 이름 하나가 '강한 2개'로 계산돼 인물만 같은 다른 사건이 묶이는 것 방지. 사슬 길이 k → ceil(k/2)개로 인정
const zhChainOver = (a, b, df) => {
  const m = []; for (const x of a) if (b.has(x) && !GEO.has(x) && isHan2(x)) m.push(x);
  if (m.length < 2) return { all: 0, cool: 0 };
  const par = m.map((_, i) => i); const f = i => par[i] === i ? i : (par[i] = f(par[i]));
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) if (i !== j && m[i][1] === m[j][0]) par[f(i)] = f(j);
  const comp = new Map(); m.forEach((x, i) => { const r = f(i); const c = comp.get(r) || { k: 0, cool: 0 }; c.k++; if (!isHot(x, df)) c.cool++; comp.set(r, c); });
  let all = 0, cool = 0; for (const c of comp.values()) { all += Math.floor(c.k / 2); cool += Math.floor(c.cool / 2); }
  return { all, cool };
};
export function shared(a, b, df, leadA, leadB, zh) {
  let n = 0, strong = 0, rare = 0, exact = 0, nonGeo = 0, strongCool = 0;
  for (const x of a) if (b.has(x)) { n++; if (!GEO.has(x)) nonGeo++; if (!GEO.has(x) && (isKo(x) || x.length >= 4 || /\d/.test(x) || isDeva(x))) exact++; if (!GEO.has(x) && (x.length >= 4 || /\d/.test(x) || isDeva(x) || (isKo(x) && (x.length >= 3 || /^[\u4e00-\u9fff]+$/.test(x))))) { strong++; if (!isHot(x, df)) strongCool++; } if (isRare(x, df) && leadA && leadB && leadA.has(x) && leadB.has(x)) rare++; }
  for (const x of a) if (!b.has(x) && isKo(x) && x.length >= 3) for (const y of b) if (!a.has(y) && isKo(y) && y.length >= 3 && (x.includes(y) || y.includes(x))) { n++; nonGeo++; break; }
  if (zh) { const o = zhChainOver(a, b, df); n -= o.all; nonGeo -= o.all; exact -= o.all; strong -= o.all; strongCool = Math.min(strong, strongCool - o.cool); }
  return { n, strong, rare, exact, nonGeo, strongCool }; // strongCool: 이번 입력에서 8개 미만 제목에 나오는 강한 토큰 수 // exact: 부분일치·지명·2~3자 약어 제외 정확 겹침, nonGeo: 지명 제외 겹침
}
// 같은 분야: 강한 토큰(지명 제외, 4자+/숫자/한국어) 2개, 또는 3개 겹침 중 강한 것 1개 이상. 다른 분야: 3개 이상 전부 강한 토큰.
const BROAD = new Set(['한국뉴스', '미국뉴스', '일본뉴스', '국제', '금융경제', '테크', '인플루언서', '트렌드', '사회', '문화', '정치', '경제']);
// 같은 좁은 분야: 강한 2개 또는 3개 겹침+강한 1개. 넓은 분야(종합 뉴스): 강한 2개 또는 4개 겹침+강한 1개. 다른 분야: 3개 전부 강한 토큰.
// 짧은 정형 제목(각 4토큰 이하: 데이터 표·지표 안내)은 한쪽에만 있는 토큰(한국어 부분일치 없음)이 하나라도 있으면 다른 항목 — BoE/SNB 금리확률, 30/60일 상관행렬, 코스닥×기관/거래소×외국인 표
const onlyIn = (a, b) => { let k = 0; for (const x of a) { if (b.has(x)) continue; let part = false; if (isKo(x) && x.length >= 3) for (const y of b) if (isKo(y) && y.length >= 3 && (x.includes(y) || y.includes(x))) { part = true; break; } if (!part) k++; } return k; };
const shortDistinct = (A, B) => A.toks.size <= 4 && B.toks.size <= 4 && (onlyIn(A.toks, B.toks) > 0 || onlyIn(B.toks, A.toks) > 0);
// 같은 속보 티커(FinancialJuice) 두 줄에 서로 다른 수치만 있으면 각각 다른 데이터 포인트(ECB 회사채 213.5bn vs 공공채 1,654.8bn, 독일 산업생산 MoM vs YoY) — 정확 겹침 3개 미만이면 묶지 않음. 수치 없는 발언 인용(같은 연설의 여러 줄)은 그대로 묶인다
const figs = t => new Set((String(t || '').match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[,.]+$/, '')));
const tickerDiff = (A, B) => { if (!A.it || !B.it || A.it.source !== B.it.source || !/financialjuice/i.test(String(A.it.source || '') + String(A.it.link || ''))) return false; const fa = figs(A.it.title), fb = figs(B.it.title); return fa.size > 0 && fb.size > 0 && ![...fa].some(x => fb.has(x)); };
const same = (A, B, df) => { if (shortDistinct(A, B)) return false; const s = shared(A.toks, B.toks, df, A.lead, B.lead, A.zh || B.zh); if (A.field !== B.field) return s.n >= 3 && s.strong >= 3; const broad = BROAD.has(A.field); if (tickerDiff(A, B) && s.exact < 3) return false; return (s.n >= 2 && s.strong >= 2 && s.strongCool >= 1) || (s.nonGeo >= (broad ? 4 : 3) && s.strong >= 1) || (s.rare >= 1 && s.exact >= 2); }; // 희귀 주어 규칙은 부분일치(총괄부회장에⊃총괄) 불인정 // 희귀 주어 + 다른 겹침 1개 이상(같은 인물의 다른 사건 분리)
export function clusterItems(items) {
  const rows = items.map(it => { const list = tokenList(it.title, it.lang); return { it, toks: new Set(list), lead: new Set(list.slice(0, 2)), field: it.field, zh: isZh(it.lang) }; });
  const df = new Map(); rows.forEach(r => r.toks.forEach(t => df.set(t, (df.get(t) || 0) + 1)));
  // 토큰 많은(정보량 큰) 제목이 대표가 되도록 정렬
  const key = r => String(r.it.id || '') + '\u0000' + String(r.it.title || '');
  const order = rows.map((_, i) => i).sort((i, j) => rows[j].toks.size - rows[i].toks.size || (key(rows[i]) < key(rows[j]) ? -1 : key(rows[i]) > key(rows[j]) ? 1 : 0));
  const clusters = []; // {lead, members}
  for (const i of order) {
    const r = rows[i];
    // 예측시장·시세 항목은 계약/질문·기간이 달라도 이름이 겹치므로 묶지 않는다(각자 단독)
    // 예측시장·시세·논문(arXiv)은 항목 하나가 곧 독립 단위 — 같은 주제라도 묶지 않는다
    const solo = r.field === '예측시장' || /^\[(예측|코인)\]/.test(String(r.it.title)) || /arxiv/i.test(String(r.it.source || '')) || /arxiv\.org/i.test(String(r.it.link || ''));
    if (solo || r.toks.size < 2) { clusters.push({ lead: { ...r, toks: new Set() }, members: [r] }); continue; }
    let best = null, bestN = 0;
    for (const c of clusters) { if (c.lead.toks.size < 2 || !same(c.lead, r, df)) continue; const s = shared(c.lead.toks, r.toks, df, c.lead.lead, r.lead, c.lead.zh || r.zh).n; if (s > bestN) { best = c; bestN = s; } }
    // 대표와는 안 맞아도 구성원과 거의 같은 제목(지명 제외 정확 겹침 3개 이상, 같은 분야)이면 합류 — 우주청/우주청장 "6호 교신 확인" 같은 동일 발언의 다른 표기. 연쇄 병합 방지를 위해 기준을 높게 둠
    if (!best) for (const c of clusters) { if (c.lead.toks.size < 2) continue; for (const m of c.members) { if (m.field !== r.field || shortDistinct(m, r)) continue; const s = shared(m.toks, r.toks, df, m.lead, r.lead, m.zh || r.zh); if (s.exact >= 3 && s.strong >= 2 && s.n > bestN) { best = c; bestN = s.n; } } }
    if (best) best.members.push(r); else clusters.push({ lead: r, members: [r] });
  }
  const out = [];
  for (const c of clusters) {
    const g = c.members.map(m => m.it);
    const srcs = [...new Set(g.map(x => x.source))]; const ab = new Set(g.filter(x => 'AB'.includes(x.tier)).map(x => x.source));
    const status = ab.size >= 2 ? '복수 수집 경로(A/B ' + ab.size + '곳) — 독립성·사실 확인 필요' : ab.size === 1 ? '단일 수집 경로 — 원자료 확인 필요' : g.some(x => x.tier === 'C') ? '분석/블로그 — 1차 자료 대조 필요' : '미확인(커뮤니티·트렌드) — 팩트체크 필수';
    const kw = new Map(); c.members.forEach(m => m.toks.forEach(t => kw.set(t, (kw.get(t) || 0) + 1)));
    g.sort((a, b) => String(a.tier).localeCompare(String(b.tier)) || String(b.published_at || '').localeCompare(String(a.published_at || '')) || String(a.id || a.title).localeCompare(String(b.id || b.title)));
    const fieldCount = new Map(); g.forEach(x => fieldCount.set(x.field, (fieldCount.get(x.field) || 0) + 1));
    const top = (k) => { const m = new Map(); g.forEach(x => { if (x[k]) m.set(x[k], (m.get(x[k]) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null; };
    out.push({ topic: c.lead.it.title, keywords: [...kw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]), field: [...fieldCount.entries()].sort((a, b) => b[1] - a[1])[0][0], region: top('region'), lang: top('lang'), n_items: g.length, n_sources: srcs.length, sources: srcs, tier_best: g.map(x => x.tier).sort()[0], status, items: g.map(x => ({ title: x.title, source: x.source, link: x.link, tier: x.tier, published_at: x.published_at, region: x.region || null, lang: x.lang || null })) });
  }
  out.sort((a, b) => b.n_sources - a.n_sources || b.n_items - a.n_items || (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0));
  return out;
}
