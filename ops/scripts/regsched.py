#!/usr/bin/env python3
# usage: regsched.py REGION DATE NO PUBLISH_AT_ISO|- META_JSON   — registers an edition (+markets/pool rows) with publish_at
import json,sys
R,D,NO,AT,MF=sys.argv[1:6]
root='/home/user/Playground_01/site/'
mt=json.load(open(MF))
pre={c['code']:c['prefix'] for c in json.load(open(root+'countries.json'))}[R]
m=json.load(open(root+'markets.json'))
if R=='KR': m[D]=mt.get('markets',{})
else: m.setdefault(R,{})[D]=mt.get('markets',{})
json.dump(m,open(root+'markets.json','w'),ensure_ascii=False,indent=1);open(root+'markets.json','a').write('\n')
if mt.get('pool'):
    p=json.load(open(root+'pool.json'));import re as _re
    _cv=lambda x: x if isinstance(x,dict) else ((lambda m: {'t':m.group(1).strip(),'s':m.group(2).strip()} if m else {'t':str(x).strip()})(_re.match(r'^(.*?)\s*\(([^()]{1,40})\)\s*$',str(x))))
    p[D if R=='KR' else f'{R}:{D}']=[_cv(x) for x in mt['pool']]
    json.dump(p,open(root+'pool.json','w'),ensure_ascii=False,indent=1);open(root+'pool.json','a').write('\n')
e=[x for x in json.load(open(root+'editions.json')) if not (x['date']==D and (x.get('region') or 'KR')==R)]
x={"date":D,"no":int(NO),"file":f"editions/{pre}{D}.html","blurb":mt.get('blurb','')}
if R!='KR': x['region']=R
if AT!='-': x['publish_at']=AT
e.append(x)
e.sort(key=lambda x:(x['date'],['KR','US','JP'].index(x.get('region') or 'KR') if (x.get('region') or 'KR') in ['KR','US','JP'] else 9, x.get('region') or ''))
open(root+'editions.json','w').write(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
print('registered',R,D,NO,AT,'markets',sorted(mt.get('markets',{})))
