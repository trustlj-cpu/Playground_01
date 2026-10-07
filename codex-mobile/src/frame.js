document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const u=new URL(a.href,location.href);if(u.origin!==location.origin){e.preventDefault();e.stopImmediatePropagation();if(u.protocol==='https:')parent.postMessage({type:'external',url:u.href},location.origin);}},true);
parent.postMessage({type:'page',path:location.pathname},location.origin);

// Keep all newspaper metadata legible in the narrower native reader.
const mobileStyle=document.createElement('style');
mobileStyle.textContent='@media(max-width:480px){.dateline{flex-direction:column;align-items:flex-start;gap:4px}.dateline>*{min-width:0;max-width:100%}}';
document.head.append(mobileStyle);
