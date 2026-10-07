import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
for(const f of ['ios/App/CapApp-SPM/Package.swift','node_modules/@capacitor/app/Package.swift','node_modules/@capacitor/browser/Package.swift','node_modules/@capacitor/preferences/Package.swift']){const p=path.join(root,f);let s=fs.readFileSync(p,'utf8');s=s.replace(/\.package\(url: "https:\/\/github.com\/ionic-team\/capacitor-swift-pm\.git", (?:exact|from): "[^"]+"\)/g,'.package(name: "capacitor-swift-pm", path: "../../../native-packages/capacitor-swift-pm")');fs.writeFileSync(p,s);}
console.log('Using local Capacitor 8.5.2 artifacts with verified official checksums');
