document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const u=new URL(a.href,location.href);if(u.origin!==location.origin){e.preventDefault();e.stopImmediatePropagation();if(u.protocol==='https:')parent.postMessage({type:'external',url:u.href},location.origin);}},true);
parent.postMessage({type:'page',path:location.pathname},location.origin);
