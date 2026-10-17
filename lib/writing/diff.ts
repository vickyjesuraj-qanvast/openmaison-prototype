/**
 * (pending modules S29) A proposal's changes marked in place: the new text with the words it adds in <ins> and the words it takes out in
 * <del>, set just after the word they followed — read word by word (a chip or a picture counts as one word; the shape — paragraphs,
 * headings, bold — is the new text's). A longest-common-run over the words; past a size the browser shouldn't spend on (two long contracts),
 * null — the dialog then shows Before and After alone. Pure and client-safe.
 */
import { partsOf } from './html'

type Tok = { k: 'tag' | 'sp' | 'w'; s: string }
function toks(html: string): Tok[] {
  const out: Tok[] = []
  for (const p of partsOf(html)) {
    if (p.k === 'tag') { out.push({ k: 'tag', s: p.s }); continue }
    if (p.k === 'atom') { out.push({ k: 'w', s: p.s }); continue }
    for (const piece of p.s.split(/((?:\s|&nbsp;)+)/)) if (piece) out.push({ k: /^(?:\s|&nbsp;)+$/.test(piece) ? 'sp' : 'w', s: piece })
  }
  return out
}

/** Past this many word pairs the table would cost the browser too much memory (a Uint16 cell each). */
const LIMIT = 4_000_000

type Op = { t: 'keep' | 'ins'; b: number } | { t: 'del'; a: number }
function align(a: readonly string[], b: readonly string[]): Op[] | null {
  /* the common head and tail first — most proposals change little */
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++
  const A = a.slice(head, a.length - tail), B = b.slice(head, b.length - tail)
  const n = A.length, m = B.length
  if (n * m > LIMIT) return null
  const L = new Uint16Array((n + 1) * (m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    L[i * (m + 1) + j] = A[i] === B[j] ? L[(i + 1) * (m + 1) + j + 1]! + 1 : Math.max(L[(i + 1) * (m + 1) + j]!, L[i * (m + 1) + j + 1]!)
  }
  const ops: Op[] = []
  for (let k = 0; k < head; k++) ops.push({ t: 'keep', b: k })
  let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { ops.push({ t: 'keep', b: head + j }); i++; j++ }
    /* on a tie the old words go first: "~~qtn~~ quotation" reads as a correction */
    else if (i < n && (j >= m || L[(i + 1) * (m + 1) + j]! >= L[i * (m + 1) + j + 1]!)) { ops.push({ t: 'del', a: head + i }); i++ }
    else { ops.push({ t: 'ins', b: head + j }); j++ }
  }
  for (let k = 0; k < tail; k++) ops.push({ t: 'keep', b: b.length - tail + k })
  return ops
}

const BLOCK_OPEN = /^<\s*(p|div|li|h[1-6]|blockquote|tr|td|th)\b/i
/** Each word's block: how many paragraphs, items or headings opened before it. */
function blockIndex(ts: readonly Tok[]): number[] {
  const out: number[] = []
  let k = 0
  for (const t of ts) { if (t.k === 'tag' && BLOCK_OPEN.test(t.s)) k++; else if (t.k === 'w') out.push(k) }
  return out
}

/** The new text with its changes marked, or null when the texts are too long to compare here. */
export function markChanges(before: string, after: string): string | null {
  const A = toks(before), B = toks(after)
  const aw = A.filter((t) => t.k === 'w'), bwIdx: number[] = []
  B.forEach((t, i) => { if (t.k === 'w') bwIdx.push(i) })
  const raw = align(aw.map((t) => t.s), bwIdx.map((i) => B[i]!.s))
  if (!raw) return null
  /* a run of changes between two kept words, ordered block by block — each paragraph's or item's own removals beside its own additions —
     so "tv" → "TV" in the second item never reads as a removal at the end of the first */
  const ab = blockIndex(A), bb = blockIndex(B)
  const ops: Op[] = []
  for (let k = 0; k < raw.length;) {
    if (raw[k]!.t === 'keep') { ops.push(raw[k]!); k++; continue }
    let e = k
    while (e < raw.length && raw[e]!.t !== 'keep') e++
    const run = raw.slice(k, e).map((op, n) => ({ op, n, key: op.t === 'del' ? ab[op.a]! : bb[op.b]!, del: op.t === 'del' ? 0 : 1 }))
    run.sort((x, y) => x.key - y.key || x.del - y.del || x.n - y.n)
    ops.push(...run.map((r) => r.op))
    k = e
  }
  let out = '', pos = 0, emitted = false, inIns = false
  let gone: string[] = []
  /* after a word: " ~~gone~~"; before the words that replace it: "~~gone~~ " */
  const flush = (after: boolean) => { if (gone.length) { out += after ? ` <del>${gone.join(' ')}</del>` : `<del>${gone.join(' ')}</del> `; gone = [] } }
  for (const op of ops) {
    if (op.t === 'del') { gone.push(aw[op.a]!.s); continue }
    const target = bwIdx[op.b]!
    /* what sits between the last word and this one: spaces stay inside a run of added words, a tag closes it */
    const between = B.slice(pos, target)
    const onlySpace = between.every((t) => t.k === 'sp')
    if (inIns && !(op.t === 'ins' && onlySpace && !gone.length)) { out += '</ins>'; inIns = false }
    /* a removal stays after the word it followed; a replaced word sits just before the words that replace it */
    const beforeNext = op.t === 'ins' || !emitted
    if (!beforeNext) flush(true)
    out += between.map((t) => t.s).join('')
    if (beforeNext) flush(false)
    if (op.t === 'ins') { if (!inIns) { out += '<ins>'; inIns = true } }
    out += B[target]!.s
    pos = target + 1
    emitted = true
  }
  if (inIns) out += '</ins>'
  flush(true)
  out += B.slice(pos).map((t) => t.s).join('')
  return out
}
