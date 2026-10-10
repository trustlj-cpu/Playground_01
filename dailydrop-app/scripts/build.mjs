// 앱 번들(www/) = 웹 빌드 결과물 그대로(오프라인 사본) + 시작 모션 주입 스크립트(dd-splash.js).
// 웹 소스는 같은 저장소 paycheck-page 의 site/ (기본: ../../Playground_01/site, DD_SITE 로 바꿀 수 있음).
// 웹 파일은 한 글자도 고치지 않는다. 온라인일 때 앱은 실제 사이트(capacitor.config.json server.url)를 연다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const site = path.resolve(process.env.DD_SITE || path.join(root, '../../Playground_01/site'));
const www = path.join(root, 'www');
if (!fs.existsSync(path.join(site, 'build.js'))) throw new Error(`웹 소스를 찾지 못했습니다: ${site}`);

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
execFileSync(process.execPath, ['build.js', 'editions.json', www], { cwd: site, stdio: 'inherit' });

// 시작 모션: 제호 경로와 실제 타자기 소리(CC0, inject/sfx/SOURCES.md)를 채워 넣는다
const { LOGO_D } = await import(path.join(root, 'inject/logo-path.mjs'));
const sfx = {};
for (const f of fs.readdirSync(path.join(root, 'inject/sfx'))) {
  if (!f.endsWith('.mp3')) continue;
  sfx[f.replace(/\.mp3$/, '')] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(root, 'inject/sfx', f)).toString('base64');
}
const js = fs.readFileSync(path.join(root, 'inject/splash.js'), 'utf8')
  .replace("var LOGO_D = '__LOGO_D__';", () => 'var LOGO_D = ' + JSON.stringify(LOGO_D) + ';')
  .replace('var SFX = __SFX__;', () => 'var SFX = ' + JSON.stringify(sfx) + ';');
if (js.includes('__SFX__') || js.includes('__LOGO_D__')) throw new Error('시작 모션: 제호·소리 자리 채우기 실패');
fs.writeFileSync(path.join(www, 'dd-splash.js'), js);
fs.copyFileSync(path.join(root, 'inject/app.js'), path.join(www, 'dd-app.js'));
console.log('www ready:', fs.readdirSync(www).length, 'entries; splash', (js.length / 1024).toFixed(0) + 'KB');
