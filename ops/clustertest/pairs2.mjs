import { tokenList, clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const P=[["Lara Fabian annule en dernière minute son concert","Où partir en dernière minute pour les vacances de la Toussaint","fr"],
["Breaking: Big Fire reported in Fresno County","Breaking: Alderpoint Rd Blocksburg Fire grows to 200 acres","en"],
["Breaking News: Jahr 2026 endet glänzend für Anleger","Tennis: Zverev übersteht Schreckmoment in Shanghai","de"],
["Sube la tensión y el malestar en el Frente Amplio","Sumar elige a su líder como referente para las generales","es"]];
for(const [a,b,l] of P){const A=tokenList(a,l),B=new Set(tokenList(b,l));const cl=clusterItems([{title:a,link:'x1',source:'s1',lang:l},{title:b,link:'x2',source:'s2',lang:l}]);console.log(cl.length===1?'MERGED':'split',JSON.stringify(A.filter(x=>B.has(x))),a.slice(0,30))}
