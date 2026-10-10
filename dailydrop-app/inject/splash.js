// DailyDrop 앱 시작 모션. 앱이 웹 페이지를 열 때 문서 시작 시점에 주입되어, 웹 화면이 그려지기 전에 덮개가 먼저 깔린다.
// 웹 페이지의 요소·스타일은 건드리지 않고 그 위에 덮개를 잠깐 올렸다가, 웹 제호(.mast h1) 자리로 올라가며 사라진다.
// 제호 경로·소리는 빌드 때 채워진다(scripts/build.mjs).
(function () {
  if (window.top !== window.self) return;
  try { if (sessionStorage.getItem('dd_app_splash')) return; } catch (e) { return; }
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}

  function start() {
  try { startInner(); } catch (e) {}
  }
  function startInner() {
  try { sessionStorage.setItem('dd_app_splash', '1'); } catch (e) {}
  var LOGO_D = '__LOGO_D__';
  var SFX = __SFX__;
  var CHARS = [
    { right: 148, rects: [[0, 0, 154, 243]] },
    { right: 247.5, rects: [[154, 0, 93.5, 243]] },
    { right: 301, rects: [[247.5, 0, 53.5, 243]] },
    { right: 354, rects: [[301, 0, 53, 200]] },
    { right: 449, rects: [[354, 0, 95, 243], [349, 200, 5, 43]] },
    { right: 590, rects: [[449, 0, 141, 243]] },
    { right: 671, rects: [[590, 0, 76, 243], [666, 0, 5, 130]] },
    { right: 747, rects: [[671, 0, 76, 243], [666, 130, 5, 113]] },
    { right: 843, rects: [[747, 0, 96, 243]] },
    { right: 881, dot: true }
  ];
  var KEYS = ['key-underwood', 'key-mercedes-01', 'key-mercedes-03', 'key-mercedes-04', 'key-mercedes-07', 'key-mercedes-02', 'key-mercedes-05', 'key-mercedes-08', 'key-mercedes-06'];
  var PRINT_X = 881, T0 = 380, GAP = 300, STEP_AT = 120, STEP_MS = 80, HOLD = 420, RISE = 520;

  // 웹 지면과 같은 색(nyt.css 의 --paper/--ink/--logo-dot). 어두운 모드도 웹과 같은 값.
  var dark = false;
  try {
    var t = document.documentElement.getAttribute('data-theme');
    dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {}
  var PAPER = dark ? '#14130f' : '#ece4d8', INK = dark ? '#ebe4d6' : '#121212', DOT = dark ? '#e2765f' : '#9e0604';

  function sound(name, vol) { try { var a = new Audio(SFX[name]); a.volume = vol; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  function css(el, o) { for (var k in o) el.style.setProperty(k, o[k]); return el; }
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  var root = css(document.createElement('div'), { position: 'fixed', inset: '0', 'z-index': '2147483647', background: PAPER, cursor: 'pointer' });
  root.setAttribute('aria-hidden', 'true');
  var w = 'min(330px, 84vw)';
  var line = css(document.createElement('div'), { position: 'absolute', left: '50%', top: '50%', width: w, 'aspect-ratio': '894 / 243', 'margin-left': 'calc(' + w + ' / -2)', translate: '0 -50%', 'transform-origin': '0 0' });
  var jolt = css(document.createElement('div'), { width: '100%', height: '100%' });
  var svg = css(svgEl('svg', { viewBox: '0 0 894 243' }), { display: 'block', width: '100%', height: '100%', overflow: 'visible' });
  var defs = svgEl('defs', {});
  defs.appendChild(svgEl('path', { id: 'dd-app-logo', d: LOGO_D }));
  var carriage = svgEl('g', {});
  var chars = CHARS.map(function (c, i) {
    var el;
    if (c.dot) el = svgEl('circle', { cx: '863.5', cy: '168.1', r: '17.3', fill: DOT });
    else {
      var clip = svgEl('clipPath', { id: 'dd-app-ch-' + i, clipPathUnits: 'userSpaceOnUse' });
      c.rects.forEach(function (r) { clip.appendChild(svgEl('rect', { x: r[0], y: r[1], width: r[2], height: r[3] })); });
      defs.appendChild(clip);
      el = svgEl('use', { href: '#dd-app-logo', 'clip-path': 'url(#dd-app-ch-' + i + ')', fill: INK });
    }
    css(el, { opacity: '0', 'transform-box': 'fill-box', 'transform-origin': 'center bottom' });
    carriage.appendChild(el); return el;
  });
  svg.appendChild(defs); svg.appendChild(carriage); jolt.appendChild(svg); line.appendChild(jolt); root.appendChild(line);
  document.documentElement.appendChild(root);

  // 덮개는 바로 깔고, 타자 장면은 화면이 실제로 그려지기 시작한 뒤에 시작한다
  // (앱 첫 실행이 느려 화면이 멈춰 있는 동안 타이머가 쌓였다가 소리·글자가 한꺼번에 터지지 않게)
  requestAnimationFrame(function () { requestAnimationFrame(begin); });
  function begin() {
  var anims = [], timers = [];
  function A(el, kf, o) { o.fill = o.fill || 'both'; var a = el.animate(kf, o); anims.push(a); return a; }
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function shift(k) { return PRINT_X - CHARS[k].right; }

  // 캐리지: 찍기 직전엔 그 글자 오른쪽 끝이 찍히는 자리에, 찍은 뒤엔 다음 글자 자리로 한 칸 이동
  var total = T0 + GAP * (CHARS.length - 1) + STEP_AT + STEP_MS;
  var kf = [{ transform: 'translateX(' + shift(0) + 'px)', offset: 0 }];
  for (var k = 0; k < CHARS.length - 1; k++) {
    var at = T0 + GAP * k + STEP_AT;
    kf.push({ transform: 'translateX(' + shift(k) + 'px)', offset: at / total, easing: 'cubic-bezier(.2,.9,.3,1.25)' });
    kf.push({ transform: 'translateX(' + shift(k + 1) + 'px)', offset: (at + STEP_MS) / total });
  }
  kf.push({ transform: 'translateX(0px)', offset: 1 });
  A(carriage, kf, { duration: total, easing: 'linear' });

  // 타건: 활자가 종이를 때리듯 내려앉아 살짝 눌렸다 자리를 잡고, 잉크 농도가 한 번 흔들린다
  chars.forEach(function (el, k) {
    var at = T0 + GAP * k, last = k === CHARS.length - 1;
    A(el, [
      { opacity: 0, transform: 'translateY(-9px) scale(1.06)' },
      { opacity: 1, transform: 'translateY(2.5px) scale(.985)', offset: .35 },
      { opacity: .8, transform: 'translateY(0) scale(1)', offset: .6 },
      { opacity: 1, transform: 'none' }
    ], { delay: at, duration: 150, easing: 'cubic-bezier(.3,0,.2,1)' });
    A(jolt, [{ transform: 'translateY(0)' }, { transform: 'translateY(1.5px)', offset: .3 }, { transform: 'translateY(0)' }], { delay: at, duration: 110, easing: 'ease-out', fill: 'none' });
    later(at, function () { sound(last ? 'period-light' : KEYS[k % KEYS.length], last ? .8 : 1); });
    if (!last) later(at + STEP_AT, function () { sound('carriage-tick', .45); });
  });

  var finished = false;
  function target() {
    var h = document.querySelector('.mast h1');
    if (!h) return null;
    var r = h.getBoundingClientRect();
    return r.width ? r : null;
  }
  function rise() {
    if (finished) return; finished = true;
    timers.forEach(clearTimeout);
    anims.forEach(function (a) { try { a.finish(); } catch (e) {} });
    var from = line.getBoundingClientRect(), to = target();
    var move = to
      ? [{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + (to.width / from.width) + ')' }]
      : [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-40px)', opacity: 0 }];
    var m = line.animate(move, { duration: RISE, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
    m.onfinish = function () { var a = line.getBoundingClientRect(), b = target(); window.__ddSplash = b ? { dx: a.left - b.left, dy: a.top - b.top, dw: a.width - b.width } : { missed: true }; };
    root.animate([{ backgroundColor: PAPER }, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: RISE * .8, delay: RISE * .2, easing: 'ease-in-out', fill: 'forwards' });
    setTimeout(function () { var f = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }); f.onfinish = function () { root.remove(); }; }, RISE);
  }
  // 웹 페이지가 다 그려진 뒤에 올라가야 제호 위치가 정확하다
  function ready(fn) { if (document.readyState === 'complete') fn(); else addEventListener('load', fn, { once: true }); }
  later(total + HOLD, function () { ready(rise); });
  root.addEventListener('click', function () { if (!finished) { anims.forEach(function (a) { try { a.finish(); } catch (e) {} }); ready(rise); } }, { once: true });
  }
  }
  // 문서 시작 시점엔 <html> 요소가 아직 없을 수 있다: 생기는 즉시 시작
  if (document.documentElement) start();
  else new MutationObserver(function (m, o) { if (document.documentElement) { o.disconnect(); start(); } }).observe(document, { childList: true });
})();
