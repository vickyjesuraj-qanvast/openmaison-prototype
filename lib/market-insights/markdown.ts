/**
 * (pending modules S25 — 1.0's article page: ReactMarkdown + remark-gfm with ```chart blocks drawn by ArticleChart) An article's body, read
 * from the Markdown the editors wrote into blocks the page draws with the house type — pure and client-safe. What 1.0's articles use is
 * read: headings, paragraphs with bold · italic · code · links, lists, quotes, rules, tables, pictures and ```chart blocks (1.0's
 * ArticleChartSpec). Nothing is ever set as HTML: a block is words and links the page renders as React, and a link or a picture keeps only a
 * safe address (the app's own path, or the web over https; a link may also be mailto). A chart block the reader can't use says so in place.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; c: Inline[] }
  | { t: 'i'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'a'; href: string; c: Inline[] }

export type ChartKind = 'bar' | 'stacked-bar' | 'line' | 'area' | 'donut'
/** 1.0's ArticleChartSpec as the page draws it: the labels along the axis, each series' numbers in the same order (null where a row gave none). */
export type ChartSpec = {
  kind: ChartKind
  title: string
  subtitle: string | null
  source: string | null
  sourceUrl: string | null
  labels: string[]
  series: { key: string; label: string; values: (number | null)[] }[]
  prefix: string
  suffix: string
}

export type Block =
  | { t: 'h'; level: 2 | 3 | 4; id: string; text: string; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { t: 'quote'; paras: Inline[][] }
  | { t: 'rule' }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][]; align: ('left' | 'right' | 'center')[] }
  | { t: 'figure'; src: string; alt: string }
  | { t: 'chart'; spec: ChartSpec | null }
  | { t: 'code'; text: string }

/* ── addresses ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A link the page may open: an app path, an anchor, the web, or an email. */
export const safeHref = (h: string): string | null => {
  const v = h.trim()
  if (/^\/(?!\/)[^\s"'<>]*$/.test(v) || /^#[\w-]+$/.test(v) || /^https?:\/\/[^\s"'<>]+$/i.test(v) || /^mailto:[^\s"'<>]+$/i.test(v)) return v
  return null
}
const safePicture = (h: string): string | null => {
  const v = h.trim()
  return /^\/(?!\/)[^\s"'<>]*$/.test(v) || /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : null
}
/** An address inside the app (opens in place, with the way back) — else it opens in a new tab. */
export const isAppPath = (h: string) => h.startsWith('/') && !h.startsWith('//')

/* ── inline ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Finds `close` from `from`, skipping escaped characters; -1 when it never comes. */
function findClose(s: string, close: string, from: number): number {
  for (let i = from; i <= s.length - close.length; i++) {
    if (s[i] === '\\') { i++; continue }
    if (s.startsWith(close, i)) return i
  }
  return -1
}

/** A line's words: **bold**, *italic* / _italic_, `code`, [words](address) — escapes kept as the character. */
export function inline(src: string, depth = 0): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => { if (buf) { const last = out[out.length - 1]; if (last?.t === 'text') last.v += buf; else out.push({ t: 'text', v: buf }); buf = '' } }
  let i = 0
  while (i < src.length) {
    const ch = src[i]!
    if (ch === '\\' && i + 1 < src.length && /[\\`*_{}[\]()#+\-.!|>~]/.test(src[i + 1]!)) { buf += src[i + 1]; i += 2; continue }
    if (ch === '`') {
      const end = src.indexOf('`', i + 1)
      if (end > i + 1) { flush(); out.push({ t: 'code', v: src.slice(i + 1, end) }); i = end + 1; continue }
    }
    if (depth < 4 && ch === '!' && src[i + 1] === '[') {
      /* a picture inside a line: its words stand for it (a picture on its own line is a figure) */
      const close = findClose(src, '](', i + 2)
      const end = close >= 0 ? findClose(src, ')', close + 2) : -1
      if (close >= 0 && end >= 0) { buf += src.slice(i + 2, close); i = end + 1; continue }
    }
    if (depth < 4 && ch === '[') {
      const close = findClose(src, '](', i + 1)
      const end = close >= 0 ? findClose(src, ')', close + 2) : -1
      if (close >= 0 && end >= 0) {
        const words = src.slice(i + 1, close)
        const href = safeHref(src.slice(close + 2, end).split(/\s+"/)[0] ?? '')
        flush()
        if (href) out.push({ t: 'a', href, c: inline(words, depth + 1) })
        else out.push(...inline(words, depth + 1))
        i = end + 1
        continue
      }
    }
    if (depth < 4 && (src.startsWith('**', i) || src.startsWith('__', i))) {
      const mark = src.slice(i, i + 2)
      const end = findClose(src, mark, i + 2)
      if (end > i + 2) { flush(); out.push({ t: 'b', c: inline(src.slice(i + 2, end), depth + 1) }); i = end + 2; continue }
    }
    if (depth < 4 && (ch === '*' || ch === '_')) {
      /* an underscore marks only at a word's edge — snake_case and file_names stay as they are */
      const edge = ch === '*' || i === 0 || /[\s(["']/.test(src[i - 1]!)
      const end = edge ? findClose(src, ch, i + 1) : -1
      if (end > i + 1 && src[i + 1] !== ' ' && (ch === '*' || end + 1 >= src.length || /[\s).,;:!?"']/.test(src[end + 1]!))) {
        flush(); out.push({ t: 'i', c: inline(src.slice(i + 1, end), depth + 1) }); i = end + 1; continue
      }
    }
    buf += ch
    i++
  }
  flush()
  return out
}

/** A run's plain words (a heading's anchor, a chart cell, an answer's row). */
export function plain(c: readonly Inline[]): string {
  return c.map((x) => (x.t === 'text' || x.t === 'code' ? x.v : plain(x.c))).join('')
}

/* ── charts (1.0's ArticleChartSpec) ───────────────────────────────────────────────────────────────────────────────────────────── */

const KINDS: readonly ChartKind[] = ['bar', 'stacked-bar', 'line', 'area', 'donut']
const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** 1.0's chart block: its JSON read into what the page draws, or null when it isn't one (1.0 checked type, data, xKey and series too). A
    series colour 1.0 allowed is not carried — the house palette gives every chart its hues in one order. */
export function chartOf(raw: string): ChartSpec | null {
  let j: unknown
  try { j = JSON.parse(raw) } catch { return null }
  if (!j || typeof j !== 'object') return null
  const o = j as Record<string, unknown>
  const kind = o.type as ChartKind
  const xKey = str(o.xKey, 60)
  if (!KINDS.includes(kind) || !xKey || !Array.isArray(o.data) || !Array.isArray(o.series)) return null
  const rows = (o.data as unknown[]).filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').slice(0, 60)
  const series = (o.series as unknown[]).filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && !!str((s as Record<string, unknown>).key, 60)).slice(0, 8)
    .map((s) => ({ key: str(s.key, 60)!, label: str(s.label, 60) ?? str(s.key, 60)!, values: rows.map((r) => { const n = typeof r[str(s.key, 60)!] === 'number' ? (r[str(s.key, 60)!] as number) : Number.NaN; return Number.isFinite(n) ? n : null }) }))
  const labels = rows.map((r) => { const v = r[xKey]; return typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, 60) : '' })
  if (!rows.length || !series.length || series.every((s) => s.values.every((v) => v == null))) return null
  const sourceUrl = str(o.sourceUrl, 400)
  return {
    kind, title: str(o.title) ?? '', subtitle: str(o.subtitle, 300), source: str(o.source, 300), sourceUrl: sourceUrl && /^https?:\/\/[^\s"'<>]+$/i.test(sourceUrl) ? sourceUrl : null,
    labels, series: kind === 'donut' ? series.slice(0, 1) : series, prefix: str(o.valuePrefix, 8) ?? '', suffix: str(o.valueSuffix, 12) ?? '',
  }
}

/* ── blocks ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section'
const cellsOf = (line: string) => {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < t.length; i++) { if (t[i] === '\\' && t[i + 1] === '|') { cur += '|'; i++; continue } if (t[i] === '|') { cells.push(cur.trim()); cur = ''; continue } cur += t[i] }
  cells.push(cur.trim())
  return cells
}
const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('-')
const LIST = /^\s{0,3}([-*+]|\d{1,3}[.)])\s+(.*)$/
const IMAGE = /^\s*!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"[^"]*")?\s*\)\s*$/

/** The article's Markdown as blocks, in order. */
export function blocksOf(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: Block[] = []
  const ids = new Set<string>()
  const starts = (l: string) => /^\s{0,3}(#{1,6}\s|>|```|~~~)/.test(l) || LIST.test(l) || /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l) || IMAGE.test(l) || /^\s*\|/.test(l)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (!line.trim()) { i++; continue }
    /* a fenced block — a chart when its language says so */
    const fence = /^\s{0,3}(```|~~~)\s*([\w-]*)\s*$/.exec(line)
    if (fence) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i]!.trim().startsWith(fence[1]!)) { body.push(lines[i]!); i++ }
      i++
      if (fence[2] === 'chart') out.push({ t: 'chart', spec: chartOf(body.join('\n')) })
      else out.push({ t: 'code', text: body.join('\n') })
      continue
    }
    const h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (h) {
      const c = inline(h[2]!)
      const text = plain(c)
      let id = `s-${slug(text)}`
      for (let n = 2; ids.has(id); n++) id = `s-${slug(text)}-${n}`
      ids.add(id)
      out.push({ t: 'h', level: h[1]!.length <= 2 ? 2 : h[1]!.length === 3 ? 3 : 4, id, text, c })
      i++
      continue
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push({ t: 'rule' }); i++; continue }
    const img = IMAGE.exec(line)
    if (img) { const src = safePicture(img[2]!); if (src) out.push({ t: 'figure', src, alt: img[1]!.trim() }); i++; continue }
    if (/^\s{0,3}>/.test(line)) {
      const paras: string[][] = [[]]
      while (i < lines.length && /^\s{0,3}>/.test(lines[i]!)) {
        const t = lines[i]!.replace(/^\s{0,3}>\s?/, '')
        if (!t.trim()) paras.push([]); else paras[paras.length - 1]!.push(t.trim())
        i++
      }
      out.push({ t: 'quote', paras: paras.filter((p) => p.length).map((p) => inline(p.join(' '))) })
      continue
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && isSeparator(lines[i + 1]!)) {
      const head = cellsOf(line)
      const align = cellsOf(lines[i + 1]!).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left') as 'left' | 'right' | 'center')
      i += 2
      const rows: Inline[][][] = []
      while (i < lines.length && /^\s*\|/.test(lines[i]!)) {
        const cells = cellsOf(lines[i]!)
        rows.push(head.map((_, k) => inline(cells[k] ?? '')))
        i++
      }
      out.push({ t: 'table', head: head.map((c) => inline(c)), rows, align: head.map((_, k) => align[k] ?? 'left') })
      continue
    }
    const li = LIST.exec(line)
    if (li) {
      const ordered = /\d/.test(li[1]!)
      const start = ordered ? Number.parseInt(li[1]!, 10) || 1 : 1
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]!
        const m = LIST.exec(l)
        if (m && /\d/.test(m[1]!) === ordered) { items.push(m[2]!.trim()); i++; continue }
        /* a line under an item (indented, or a lazy continuation) carries on its words; a nested list reads as more of the item */
        if (l.trim() && items.length && (/^\s{2,}/.test(l) || !starts(l))) { items[items.length - 1] += ` ${(m ? m[2]! : l).trim()}`; i++; continue }
        break
      }
      out.push({ t: 'list', ordered, start, items: items.map((x) => inline(x)) })
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i]!.trim() && !(para.length && starts(lines[i]!))) { para.push(lines[i]!.trim()); i++ }
    out.push({ t: 'p', c: inline(para.join(' ')) })
  }
  return out
}

/** The article's sections — its second-level headings, for Maison AI's answer and the probe. */
export const sectionsOf = (blocks: readonly Block[]) => blocks.filter((b): b is Extract<Block, { t: 'h' }> => b.t === 'h' && b.level === 2)
