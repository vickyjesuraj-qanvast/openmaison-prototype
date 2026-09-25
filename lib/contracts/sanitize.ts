/**
 * (REG-631, contracts parity §8.2 gap 8 — E-130) The contract document's HTML allowlist, on the server before a save and in the renderer
 * before a print. 1.0 ran every contract through one allowlist (A-54); 2.0 stripped only scripts, double-quoted handlers and
 * `javascript:`, so `<iframe>`, `<style>` or a single-quoted handler reached the public signing page. This keeps exactly what the
 * editor makes — blocks, marks, lists, links, pictures, the Smart Text chips and the signature fields — and turns every other `<` into
 * text. Pure: no DOM, runs on the server and in the browser.
 */

/** The largest document a save accepts: a page of text plus a 1.5 MB picture as base64 fits well inside. Bigger is refused, never cut. */
export const CONTRACT_HTML_MAX = 4_000_000

const TAGS: Record<string, readonly string[]> = {
  p: ['style'], div: ['style'], br: [], hr: [], h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'],
  b: [], strong: [], i: [], em: [], u: [], s: [], strike: [], mark: ['style'], blockquote: ['style'],
  ul: ['style'], ol: ['style'], li: ['style'],
  a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'style'],
  span: ['class', 'data-token', 'data-sign', 'contenteditable', 'style'],
}
/** Blocks whose content goes with them — never text a client should read. */
const DROP_WHOLE = /<(script|style|iframe|object|embed|template|noscript|svg|math|textarea|select|form|frameset|applet|title|head)\b[\s\S]*?<\/\1\s*>/gi
const CLASSES = new Set(['om-token', 'om-sign', 'om-token-value'])
const STYLE_PROPS = new Set(['text-align', 'background-color', 'color', 'font-weight', 'font-style', 'text-decoration', 'width', 'height', 'max-width'])
const SAFE_VALUE = /^[#a-z0-9\s.,%()-]+$/i

const quote = (v: string) => v.replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const decode = (v: string) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

function cleanStyle(v: string): string {
  return v.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':'); if (i < 0) return ''
    const prop = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).trim()
    return STYLE_PROPS.has(prop) && SAFE_VALUE.test(val) && !/url|expression|javascript/i.test(val) ? `${prop}: ${val}` : ''
  }).filter(Boolean).join('; ')
}
function cleanAttr(tag: string, name: string, raw: string): string | null {
  const v = decode(raw).replace(/[\x00-\x20\x7f]+/g, () => (name === 'alt' || name === 'style' || name === 'class' || name === 'rel' ? ' ' : '')).trim()
  switch (name) {
    case 'href': return /^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(v) ? v : null
    case 'src': return tag === 'img' && (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(v) || /^https?:\/\//i.test(v)) ? v : null
    case 'target': return v === '_blank' ? v : null
    case 'rel': return /^(noopener|noreferrer|nofollow)(\s+(noopener|noreferrer|nofollow))*$/i.test(v) ? v : null
    case 'class': { const kept = v.split(/\s+/).filter((c) => CLASSES.has(c)); return kept.length ? kept.join(' ') : null }
    case 'data-token': return /^[a-zA-Z.]{1,40}$/.test(v) ? v : null
    case 'data-sign': return /^[a-z-]{1,40}$/.test(v) ? v : null
    case 'contenteditable': return v === 'false' ? v : null
    case 'width': case 'height': return /^\d{1,4}(px|%)?$/.test(v) ? v : null
    case 'style': { const s = cleanStyle(v); return s || null }
    case 'alt': return v.slice(0, 200)
    default: return null
  }
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

/** The document with only the editor's own markup left; anything else becomes text. */
export function sanitizeContractHtml(html: string | null | undefined): string {
  if (!html) return ''
  const src = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<![^>]*>/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(DROP_WHOLE, '')
  let out = '', last = 0
  for (const m of src.matchAll(TAG)) {
    out += src.slice(last, m.index).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    last = m.index + m[0].length
    const tag = m[2]!.toLowerCase(), closing = m[1] === '/'
    const allowed = TAGS[tag]
    if (!allowed) continue
    if (closing) { if (tag !== 'br' && tag !== 'hr' && tag !== 'img') out += `</${tag}>`; continue }
    const attrs: string[] = []
    for (const a of (m[3] ?? '').matchAll(ATTR)) {
      const name = a[1]!.toLowerCase()
      if (!allowed.includes(name)) continue
      const v = cleanAttr(tag, name, a[2] ?? a[3] ?? a[4] ?? '')
      if (v !== null) attrs.push(`${name}="${quote(v)}"`)
    }
    out += `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`
  }
  out += src.slice(last).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return out
}
