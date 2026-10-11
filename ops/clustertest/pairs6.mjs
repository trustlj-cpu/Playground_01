import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const P=[["Dia das Crianças em Campinas: veja o que abre e o que fecha","Sesc RN abre 160 vagas gratuitas em cursos","pt","pt"],["Veja o que abre e o que fecha no feriado em Goiânia","Confira o que abre e o que fecha no feriado em Goiânia","pt","pt"]];
for(const [a,b,l1,l2] of P){const cl=clusterItems([{title:a,link:'x1',source:'s1',lang:l1},{title:b,link:'x2',source:'s2',lang:l2}]);console.log(cl.length===1?'MERGED':'split',a.slice(0,34),'|',b.slice(0,34))}
