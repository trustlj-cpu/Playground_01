// DailyDrop 앱: 화면에 보이지 않는 기능만 덧붙인다(웹 요소·스타일은 건드리지 않음).
(function () {
  if (window.top !== window.self || window.__ddApp) return;
  window.__ddApp = true;
  var C = window.Capacitor, P = C && C.Plugins;
  if (!P) return;
  var HOSTS = ['dailydropnewspaper.com', 'www.dailydropnewspaper.com', 'dailydrop.kr', 'www.dailydrop.kr'];
  var PUSH_READY = false; // 애플 APNs·구글 FCM 설정을 마친 빌드에서 true 로 바꾼다(설정 없이 register 하면 네이티브 예외)

  // 외부 링크(기사 원문 등): 앱 안 브라우저로 연다
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (!/^https?:$/.test(u.protocol) || HOSTS.indexOf(u.hostname) >= 0) return;
    e.preventDefault();
    if (P.Browser) P.Browser.open({ url: u.href });
  }, true);

  // 딥링크: 웹 주소로 앱이 열리면 그 페이지로 이동
  if (P.App) P.App.addListener('appUrlOpen', function (ev) {
    try { var u = new URL(ev.url); if (HOSTS.indexOf(u.hostname) >= 0) location.href = 'https://dailydropnewspaper.com' + u.pathname + u.search + u.hash; } catch (x) {}
  });

  // 푸시: 설정이 끝난 빌드에서만 등록하고, 토큰은 피드 서버에 등록한다
  if (PUSH_READY && P.PushNotifications) {
    var N = P.PushNotifications;
    N.addListener('registration', function (t) {
      fetch('https://feed.dailydrop.kr/push/register', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: t.value, platform: C.getPlatform(), app_version: '1.0.0' }) }).catch(function () {});
    });
    N.addListener('pushNotificationActionPerformed', function (a) {
      var d = (a && a.notification && a.notification.data) || {};
      if (d.url) location.href = d.url;
    });
    N.checkPermissions().then(function (p) { return p.receive === 'prompt' ? N.requestPermissions() : p; })
      .then(function (p) { if (p.receive === 'granted') N.register(); }).catch(function () {});
  }
})();
