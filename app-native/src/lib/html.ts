// Minimal parser for the sanitized block HTML in the API (blocks[].html).
// Allowed tags: b,i,em,strong,a,br,p,ul,ol,li,span,small,table,tr,td,th — anything else is
// unwrapped (children kept), attributes other than a[href] are ignored.

export type HNode = { k: 'text'; text: string } | { k: 'el'; tag: string; href?: string; children: HNode[] };

const ALLOWED = new Set(['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'span', 'small', 'table', 'tr', 'td', 'th']);
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : all;
    }
    return ENT[e.toLowerCase()] ?? all;
  });
}

export function parseHTML(html: string): HNode[] {
  const root: HNode = { k: 'el', tag: '#root', children: [] };
  const stack: Extract<HNode, { k: 'el' }>[] = [root as Extract<HNode, { k: 'el' }>];
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)|(<)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html || ''))) {
    const top = stack[stack.length - 1];
    if (m[4] != null || m[5] != null) {
      const text = decodeEntities(m[4] ?? '<').replace(/\s+/g, ' ');
      if (text) top.children.push({ k: 'text', text });
      continue;
    }
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (!ALLOWED.has(tag)) continue; // unwrap unknown tags
    if (tag === 'br') {
      if (!close) top.children.push({ k: 'el', tag: 'br', children: [] });
      continue;
    }
    if (close) {
      const i = stack.map((n) => n.tag).lastIndexOf(tag);
      if (i > 0) stack.length = i;
      continue;
    }
    // <p> cannot contain block elements; close an open <p> when a new block starts (browser behaviour)
    if (['p', 'ul', 'ol', 'table'].includes(tag) && top.tag === 'p' && top.children.length) stack.pop();
    const href = tag === 'a' ? (m[3].match(/href\s*=\s*"(https?:[^"]+)"/i) || m[3].match(/href\s*=\s*'(https?:[^']+)'/i) || [])[1] : undefined;
    const el: Extract<HNode, { k: 'el' }> = { k: 'el', tag, href: href ? decodeEntities(href) : undefined, children: [] };
    stack[stack.length - 1].children.push(el);
    stack.push(el);
  }
  return (root as Extract<HNode, { k: 'el' }>).children;
}

export const BLOCK_TAGS = new Set(['p', 'ul', 'ol', 'li', 'table', 'tr']);

export function isBlock(n: HNode): boolean {
  return n.k === 'el' && BLOCK_TAGS.has(n.tag);
}

export function plain(nodes: HNode[]): string {
  return nodes.map((n) => (n.k === 'text' ? n.text : n.tag === 'br' ? '\n' : plain(n.children))).join('');
}
