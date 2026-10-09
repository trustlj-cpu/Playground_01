# Run ONLY after dailydropnewspaper.com is Active in Cloudflare and attached to the dailydrop-site Worker.
# Switches the canonical site address; old hosts (dailydrop.kr, www.*, thedailydrop.today, workers.dev) 301 to it.
import re,sys
NEW='dailydropnewspaper.com'
R='/home/user/Playground_01/site/'
p=R+'src/index.js';s=open(p).read()
s=s.replace("const CANON = 'dailydrop.kr';","const CANON = '%s';\nconst OLD_HOSTS = new Set(['dailydrop.kr', 'www.dailydrop.kr', 'thedailydrop.today', 'www.thedailydrop.today', 'www.%s']);"%(NEW,NEW))
s=s.replace("if (url.hostname !== CANON && (url.hostname === 'www.' + CANON || url.hostname.endsWith('.workers.dev'))) {","if (url.hostname !== CANON && (OLD_HOSTS.has(url.hostname) || url.hostname.endsWith('.workers.dev'))) {")
open(p,'w').write(s)
p=R+'build.js';s=open(p).read();s=s.replace("const SITE = 'https://dailydrop.kr';","const SITE = 'https://%s';"%NEW);open(p,'w').write(s)
p=R+'account-ui.js';s=open(p).read();s=s.replace("(APP?'https://dailydrop.kr':'')","(APP?'https://%s':'')"%NEW);open(p,'w').write(s)
print('site switched to',NEW,'- now: grep dailydrop.kr, update app (remote.mjs/remote-pure.mjs/app.mjs/index.html CSP + tests), Google origins')
