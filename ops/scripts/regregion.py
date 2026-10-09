#!/usr/bin/env python3
# usage: regregion.py REGION blurbs.json   (blurbs.json: {"2026-10-05": "...", ...})
import json,sys,re
R=sys.argv[1]; bl=json.load(open(sys.argv[2]))
root='/home/user/Playground_01/site/'
S='/tmp/claude-0/-home-user-Playground-01/fd3bace2-4028-5ada-8da1-2ad9db95cb51/scratchpad/ed/back7/'
mk=json.load(open(S+R+'_markets.json'))
p=root+'markets.json'; m=json.load(open(p)); m.setdefault(R,{})
for d,row in mk.items():
    m[R][d]={k:v for k,v in row.items() if isinstance(v,dict) and v.get('v') is not None}
m[R]=dict(sorted(m[R].items()))
open(p,'w').write(json.dumps(m,ensure_ascii=False,indent=1)+'\n')
p=root+'editions.json'; e=json.load(open(p))
pre=R.lower()
NO={'2026-10-05':1,'2026-10-06':2,'2026-10-07':3,'2026-10-08':4}
have={(x['date'],x.get('region') or 'KR') for x in e}
for d,b in sorted(bl.items()):
    if (d,R) in have: continue
    e.append({"date":d,"no":NO[d],"region":R,"file":f"editions/{pre}/{d}.html","blurb":b})
e.sort(key=lambda x:(x['date'],['KR','US','JP'].index(x.get('region') or 'KR') if (x.get('region') or 'KR') in ['KR','US','JP'] else 9, x.get('region') or ''))
open(p,'w').write(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
print('registered',R,len(bl),'markets',sorted(m[R]))
