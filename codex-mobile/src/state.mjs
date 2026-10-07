export function decodeSaved(raw, editions) {
 const dates=new Set(editions.map(e=>e.date));
 try { const value=JSON.parse(raw??'[]'); return Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string'&&dates.has(x)))]:[]; } catch { return []; }
}
export function toggleSaved(saved,date){return saved.includes(date)?saved.filter(d=>d!==date):[...saved,date];}
export function externalURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
