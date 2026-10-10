// SwiftPM 이 Capacitor 바이너리를 원격에서 받다 멈추는 문제 회피: 공식 8.5.2 릴리스를 SHA-256 검증해 둔 로컬 사본(native-packages)으로 연결.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
// 로컬 사본이 없는 맥(새로 받은 저장소)에서는 공식 원격 패키지를 그대로 쓴다
const local = fs.existsSync(path.join(root, 'native-packages/capacitor-swift-pm/Package.swift'));
const files = ['ios/App/CapApp-SPM/Package.swift', ...fs.readdirSync(path.join(root, 'node_modules/@capacitor')).map(d => `node_modules/@capacitor/${d}/Package.swift`)];
for (const f of files) {
  const p = path.join(root, f); if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  const s = local
    ? src.replace(/\.package\(url: "https:\/\/github.com\/ionic-team\/capacitor-swift-pm\.git", (?:exact|from): "[^"]+"\)/g, '.package(name: "capacitor-swift-pm", path: "../../../native-packages/capacitor-swift-pm")')
    : src.replace(/\.package\(name: "capacitor-swift-pm", path: "[^"]+"\)/g, '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.2")');
  fs.writeFileSync(p, s);
}
console.log(local ? 'Using local Capacitor 8.5.2 artifacts with verified official checksums' : 'native-packages 없음: 공식 원격 capacitor-swift-pm 8.5.2 사용');
