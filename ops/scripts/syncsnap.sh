#!/bin/bash
# Sync site source files from paycheck-page checkout into app source-snapshot and rewrite PROVENANCE.json
set -e
SRC=/home/user/Playground_01
DST=/tmp/claude-0/-home-user-Playground-01/fd3bace2-4028-5ada-8da1-2ad9db95cb51/scratchpad/wt-app/codex-mobile/source-snapshot
REF=$(git -C "$SRC" rev-parse HEAD)
rm -rf "$DST/site"; mkdir -p "$DST/site/editions" "$DST/site/brand"
echo "{\"type\":\"commonjs\"}" > "$DST/site/package.json"
for f in build.js countries.json i18n.json app.json editions.json nyt.css og.png markets.json pool.json account-ui.js furigana.json; do cp "$SRC/site/$f" "$DST/site/$f"; done
cp "$SRC"/site/editions/*.html "$DST/site/editions/"; for d in "$SRC"/site/editions/*/; do r=$(basename "$d"); mkdir -p "$DST/site/editions/$r"; cp "$d"*.html "$DST/site/editions/$r/"; done
cp "$SRC"/site/brand/*.png "$SRC"/site/brand/*.svg "$SRC"/site/brand/*.woff2 "$SRC"/site/brand/*.woff "$DST/site/brand/"
[ -d "$SRC/site/extras" ] && cp -r "$SRC/site/extras" "$DST/site/extras"
python3 - "$DST" "$REF" <<'PY'
import hashlib,json,os,sys
dst,ref=sys.argv[1],sys.argv[2]
files={}
for root,_,fs in os.walk(os.path.join(dst,'site')):
    for f in fs:
        p=os.path.join(root,f); rel=os.path.relpath(p,dst)
        files[rel]=hashlib.sha256(open(p,'rb').read()).hexdigest()
json.dump({"repository":"https://github.com/trustlj-cpu/Playground_01","ref":ref,"files":files},open(os.path.join(dst,'PROVENANCE.json'),'w'),indent=2)
print("snapshot synced", ref[:8], len(files), "files")
PY
