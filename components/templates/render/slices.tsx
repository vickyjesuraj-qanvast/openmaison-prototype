'use client'

import type { CSSProperties, ReactNode } from 'react'
import { BANK_ROW_LABEL, mm, resolveColor, type BankBlock, type DetailsBlock, type ItemsBlock, type ItemsColumn, type PaymentsBlock, type SignatureBlock, type TextSourceBlock, type TitleBlock, type TotalsBlock, type TemplateDesign } from '@/lib/templates/model'
import { resolveFields } from '@/lib/templates/fields'
import type { ClientView } from '@/lib/templates/client-view'
import { docEntity, type DocItem, type DocTotals } from '@/lib/templates/data'
import { lineTotalMinor, printsWord, unitPriceMinor, lineCostMinor } from '@/lib/quotes/math'
import { HIGHLIGHT_KIND, htmlToPlain, isHighlight, printAsWord, UNLABELLED } from '@/lib/quotes/items-model'
import { SignatureColumns, type RenderCtx } from './canvas'
import { moneyText, pt, ROW_PAD, textCss } from './styles'
import styles from './document.module.css'

export type PageCtx = { page: number; pages: number; pageTotalMinor: number; pageTotals: number[] }
export type SliceNode = ReactNode | ((ctx: PageCtx) => ReactNode)
export type Slice = {
  key: string
  blockId: string
  node: SliceNode
  breakBefore?: boolean
  keepWithNext?: boolean
  /** Rows of one table: the head repeats on a continuation page, the rows add to the page total, the page can fill with empty rows. */
  tableId?: string
  isHead?: boolean
  amountMinor?: number
  groupKey?: string
  groupStart?: boolean
  padTop?: number
  padBottom?: number
}
export type TableExtras = { head: ReactNode; filler: ReactNode; pageTotal: (ctx: PageCtx) => ReactNode; fillPage: boolean; pageTotals: boolean; keepGroups: boolean }
export type Built = { slices: Slice[]; tables: Record<string, TableExtras> }

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ROMAN: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]
/** i · ii · iii · iv — a line's mark in the "1 · a · i" numbering (Dane UAT, Figma 1518:77). */
const toRoman = (n: number) => { let out = ''; let left = n; for (const [v, r] of ROMAN) while (left >= v) { out += r; left -= v } return out }
const html = (h: string, values: Record<string, string>) => ({ __html: resolveFields(h, values) })

/** A stored HTML body as paragraphs (the rich editor writes <p>…</p>; a bare string is one paragraph). */
function paragraphs(h: string): string[] {
  const parts = h.split(/<\/p>|<\/li>|<br\s*\/?>/i).map((p) => p.replace(/<p[^>]*>|<li[^>]*>|<\/?[ou]l[^>]*>/gi, '').trim()).filter((p) => p.replace(/<[^>]+>|&nbsp;/g, '').trim() !== '')
  return parts.length ? parts : []
}

/* ── items ── */
type Line = DocItem & { noPrice: boolean }
/** A run of lines under a label — a room under a trade, or (REG-558) a sub-section with its own note and highlight. */
type Area = { label: string; lines: Line[]; sub?: boolean; note?: string | null; noteHtml?: string | null; highlight?: string | null }
type Section = { id: string; label: string; note: string | null; noteHtml?: string | null; areas: Area[]; lines: Line[]; totalMinor: number; /** (REG-555, T-3) the word beside the sub-total */ subLabel?: string | null; highlight?: string | null }

/** `tradeNotes` = the studio's note per trade (REG-617, parity Q-08); `inPlace` = the Optional price column prints: optional lines stay in their sections (Q-11). */
function sections(b: ItemsBlock, items: DocItem[], view: ClientView, tradeNotes: Record<string, string>, inPlace: boolean): { main: Section[]; optional: Line[] } {
  const groups = items.filter((i) => i.kind === 'group')
  const declinedGroups = new Set(groups.filter((g) => g.status === 'Declined').map((g) => g.id))
  const underDeclined = (i: DocItem): boolean => { let cur = i.parentId; const seen = new Set<string>(); while (cur && !seen.has(cur)) { if (declinedGroups.has(cur)) return true; seen.add(cur); cur = items.find((x) => x.id === cur)?.parentId ?? null } return false }
  const rawLines: Line[] = items
    .filter((i) => i.kind === 'item' && i.status !== 'Declined' && !underDeclined(i))
    .filter((i) => i.visibility !== 'hidden' || view.hiddenItems === 'no-price')
    .filter((i) => view.changes || i.change !== 'removed')   // (REG-595) the removed lines print only while the quote shows its changes
    .map((i) => ({ ...i, noPrice: i.visibility !== 'visible' }))
  /* (REG-585) A section that prints as one line: its lines fold into one priced line — the section's name, its description, its sum —
     at the section's own place; the studio keeps every line inside. A folded section inside a folded one folds with it. */
  const parentOf = new Map(items.map((i) => [i.id, i.parentId ?? null]))
  const chain = (id: string): string[] => { const out: string[] = []; let cur = parentOf.get(id) ?? null; const seen = new Set<string>(); while (cur && !seen.has(cur)) { out.push(cur); seen.add(cur); cur = parentOf.get(cur) ?? null } return out }
  const rolled = groups.filter((g) => g.printOneLine && g.status !== 'Declined' && !underDeclined(g))
  const rolledIds = new Set(rolled.map((g) => g.id))
  const underRolled = (id: string) => chain(id).some((a) => rolledIds.has(a))
  const rollup = (g: DocItem): Line => {
    const under = rawLines.filter((l) => !l.optional && l.change !== 'removed' && chain(l.id).includes(g.id))
    const total = under.reduce((s, l) => s + (l.noPrice || printsWord(l) ? 0 : lineTotalMinor(l)), 0)
    const cost = under.reduce((s, l) => s + lineCostMinor(l), 0)
    return { ...g, kind: 'item', qty: 1, unit: null, costMinor: cost, markupMinor: total - cost, discountPct: 0, gstPct: 9, visibility: 'visible', optional: false, printAs: null, printAsText: null, noNumber: false, noPrice: false }
  }
  const lines: Line[] = [...rawLines.filter((l) => !underRolled(l.id)), ...rolled.filter((g) => !underRolled(g.id)).map(rollup)]
  const optional = inPlace ? [] : lines.filter((l) => l.optional)
  const priced = lines.filter((l) => !l.optional || (inPlace && view.optionalWorks))
  const byPos = (a: DocItem, c: DocItem) => a.position - c.position
  const groupOf = (label: string) => groups.find((g) => g.name.trim().toLowerCase() === label.trim().toLowerCase())
  /* (REG-617, parity Q-08) A section with no note of its own prints its trade's note from Settings › Quotes › Trades. */
  const tradeNote = (label: string) => tradeNotes[label.trim().toLowerCase()] || null
  const ownNote = (g: DocItem | undefined) => !!g && !!((g.description ?? '').trim() || g.descriptionHtml)
  const noteOf = (label: string) => { if (!b.groupNotes) return null; const g = groupOf(label); return ownNote(g) ? g!.description ?? null : tradeNote(label) }
  let main: Section[] = []
  if (b.groupBy === 'none') {
    const top = items.filter((i) => !i.parentId).sort(byPos)
    let loose: Line[] = []
    const flushLoose = () => { if (loose.length) { main.push({ id: `loose-${main.length}`, label: '', note: null, areas: [], lines: loose, totalMinor: 0 }); loose = [] } }
    for (const t of top) {
      if (t.kind === 'group' && !t.printOneLine) {
        flushLoose(); if (t.status === 'Declined') continue
        // (REG-558) The section's rows in order: runs of its own lines, and each sub-section as an area with its lines.
        const kids = items.filter((i) => i.parentId === t.id).sort(byPos)
        const areas: Area[] = []
        const own: Line[] = []
        let run: Line[] = []
        const flushRun = () => { if (run.length) { areas.push({ label: '', lines: run }); run = [] } }
        for (const k of kids) {
          if (k.kind === 'group' && !k.printOneLine) { if (k.status === 'Declined') continue; flushRun(); const sl = priced.filter((l) => l.parentId === k.id).sort(byPos); if (sl.length) areas.push({ label: k.name, lines: sl, sub: true, note: b.groupNotes ? k.description : null, noteHtml: b.groupNotes ? k.descriptionHtml : null, highlight: k.highlight }) }
          else { const l = priced.find((x) => x.id === k.id); if (l) { run.push(l); own.push(l) } }
        }
        flushRun()
        const hasSubs = areas.some((a) => a.sub)
        const all = areas.flatMap((a) => a.lines)
        main.push({ id: t.id, label: t.name, note: b.groupNotes ? (ownNote(t) ? t.description : tradeNote(t.name)) : null, noteHtml: b.groupNotes && ownNote(t) ? t.descriptionHtml : null, areas: hasSubs ? areas : [], lines: hasSubs ? all : own, totalMinor: 0, subLabel: t.printAsText, highlight: t.highlight })
      }
      else { const l = priced.find((x) => x.id === t.id); if (l) loose.push(l) }
    }
    flushLoose()
  } else {
    const field = b.groupBy
    const labelOf = (l: Line) => (l[field] ?? items.find((g) => g.id === l.parentId)?.[field] ?? UNLABELLED[field])
    const order: string[] = []
    for (const l of priced.sort(byPos)) { const k = labelOf(l); if (!order.includes(k)) order.push(k) }
    // A label bucket that matches one of the quote's sections by name carries that section's note, sub-total label and highlight (REG-555 · REG-556).
    main = order.map((label, i) => ({ id: `sec-${i}`, label, note: noteOf(label), noteHtml: b.groupNotes && ownNote(groupOf(label)) ? groupOf(label)?.descriptionHtml ?? null : null, areas: [], lines: priced.filter((l) => labelOf(l) === label), totalMinor: 0, subLabel: groupOf(label)?.printAsText ?? null, highlight: groupOf(label)?.highlight ?? null }))
  }
  for (const s of main) {
    s.totalMinor = s.lines.reduce((sum, l) => sum + (l.noPrice || printsWord(l) || l.change === 'removed' || l.optional ? 0 : lineTotalMinor(l)), 0)   // an optional line printed in place never counts (REG-492)
    if (b.subGroupBy !== 'none' && !s.areas.length) {
      const f = b.subGroupBy
      const order: string[] = []
      for (const l of s.lines) { const k = l[f] ?? ''; if (!order.includes(k)) order.push(k) }
      s.areas = order.map((label) => ({ label, lines: s.lines.filter((l) => (l[f] ?? '') === label) }))
    }
  }
  return { main: main.filter((s) => s.lines.length), optional }
}

/** (UX audit Q6) One line as the client's phone reads it — the words the print gives it, nothing the print leaves out. */
export type ReadingLine = { id: string; name: string; description: string | null; qty: number; unit: string | null; unitPriceMinor: number; totalMinor: number; word: string | null; noPrice: boolean; optional: boolean }
export type ReadingSection = { id: string; label: string; totalMinor: number; lines: ReadingLine[] }
/**
 * (UX audit Q6, REG-597's phone cards for the client) The quote's lines as the confirmation page's reading cards: the SAME sections, lines,
 * hidden-line and optional rules and amounts the printed page draws (`sections`), from the template's Items block and the quote's client
 * view — so the cards never show what the print would not. `amounts` = what the client sees priced (REG-585). `null` = the template prints
 * no Items block (the page then shows the print).
 */
export function readingSections(design: TemplateDesign, data: RenderCtx['data'], view: ClientView): { sections: ReadingSection[]; optional: ReadingLine[]; amounts: ClientView['amounts'] } | null {
  const b = design.blocks.find((x): x is ItemsBlock => x.kind === 'items' && !x.hidden)
  if (!b) return null
  const cols = b.columns.filter((c) => c.on && view.columns[c.key] !== false)
  const { main, optional } = sections(b, data.items, view, data.studio.tradeNotes ?? {}, cols.some((c) => c.key === 'optional'))
  const descriptions = view.descriptions && b.descriptions !== 'none'
  const line = (l: Line): ReadingLine => {
    const plain = l.descriptionHtml ? htmlToPlain(l.descriptionHtml) : l.description
    return {
      id: l.id, name: l.name, description: descriptions && plain ? (b.descriptions === 'first' ? plain.split('\n')[0] ?? null : plain) : null,
      qty: l.qty, unit: l.unit, unitPriceMinor: unitPriceMinor(l), totalMinor: l.noPrice ? 0 : lineTotalMinor(l),
      word: printsWord(l) ? printAsWord(l) : null, noPrice: l.noPrice, optional: l.optional,
    }
  }
  return {
    sections: main.map((s) => ({ id: s.id, label: s.label, totalMinor: s.totalMinor, lines: s.lines.filter((l) => l.change !== 'removed').map(line) })),
    optional: b.optionalSection && view.optionalWorks ? optional.map(line) : [],
    amounts: view.amounts,
  }
}

function itemsSlices(b: ItemsBlock, design: TemplateDesign, ctx: RenderCtx, view: ClientView, out: Slice[], tables: Record<string, TableExtras>) {
  const { brand, data, values } = ctx
  const tid = b.id
  const cols: ItemsColumn[] = b.columns.filter((c) => c.on && view.columns[c.key] !== false)
  const optCol = cols.some((c) => c.key === 'optional')   // (REG-617, parity Q-11) optional lines print in place, priced in their own column
  const descriptions = view.descriptions ? b.descriptions : 'none'
  const photos = b.photos && view.photos
  const cellStyle = textCss(b.style, brand, 'table')
  const pad = ROW_PAD[b.density]
  const ink = resolveColor('ink', brand), light = resolveColor('light', brand)
  const zebra = resolveColor('band', brand)   // (Dane UAT, b-zebra) "Shade every other row" tints with the kit's band colour
  const gridAttr = b.grid ? '' : undefined
  const ruledAttr = !b.grid && b.ruled ? '' : undefined
  const widths = cols.map((c) => (c.key === 'item' ? null : mm(c.width)))
  const colgroup = <colgroup>{cols.map((c, i) => <col key={c.key} style={widths[i] !== null ? { width: widths[i]! } : undefined} />)}</colgroup>
  const table = (rows: ReactNode, extra?: string) => (
    <table className={`${styles.t}${extra ? ` ${extra}` : ''}`} data-grid={gridAttr} data-ruled={ruledAttr} style={{ ...cellStyle, ['--ink' as string]: ink, ['--light' as string]: light, ['--pad' as string]: pad, ['--zebra' as string]: zebra }}>{colgroup}<tbody>{rows}</tbody></table>
  )
  const money = (minor: number, noPrice: boolean, zeroText = true) => {
    if (noPrice) return <span className={styles.amt}><span /><span>—</span></span>
    if (minor === 0 && zeroText) { if (b.zeroAmount === 'blank') return null; if (b.zeroAmount !== '0.00') return <span className={styles.amt}><span /><span className={styles.foc}>{b.zeroAmount}</span></span> }
    const m = moneyText(minor, b.currency === 'none' ? 'none' : b.currency)
    return <span className={styles.amt}><span>{m.sign}</span><span>{m.figure}</span></span>
  }
  /* (REG-555) The word a line prints in place of its amount, bold like the zero-amount word; "On behalf" keeps its amount and adds the note. */
  const wordCell = (l: Line) => <span className={styles.amt}><span /><span className={styles.foc}>{printAsWord(l)}</span></span>
  const cell = (c: ItemsColumn, content: ReactNode, extra?: CSSProperties) => (
    <td key={c.key} style={{ textAlign: c.align, color: c.color ? resolveColor(c.color, brand) : undefined, ...extra }}>{content}</td>
  )
  /* (REG-556) Highlight: an ink colours the row's words, a fill tints its cells — the kit's colour either way. */
  const hlStyle = (key: string | null | undefined): CSSProperties | undefined => {
    if (!isHighlight(key)) return undefined
    const c = resolveColor(key, brand)
    return HIGHLIGHT_KIND[key] === 'fill' ? { background: c } : { color: c }
  }
  const span = cols.length || 1
  const bandRow = (label: string, key: string, tone: 'section' | 'optional' = 'section', hl?: string | null, amount?: ReactNode) => {
    const style = b.bandStyle
    const h = hlStyle(hl)
    const bg = h?.background ? String(h.background) : style === 'grey' ? resolveColor('band', brand) : style === 'accent' ? resolveColor('accent', brand) : style === 'black' ? '#000' : undefined
    const fg = h?.color ? String(h.color) : style === 'black' || style === 'accent' ? '#fff' : ink
    const text = <span style={{ ...textCss({ ...b.areaStyle, weight: 700, underline: style === 'underlined' || style === 'inline' || style === 'grey' }, brand, 'table'), color: fg }}>{label}</span>
    const last = cols.length - 1
    if (style === 'inline') return table(<tr key={key} data-band>{cols.map((c, i) => cell(c, i === (cols.findIndex((x) => x.key === 'item')) ? text : amount && i === last && last > 0 ? <span style={{ fontWeight: 700 }}>{amount}</span> : null))}</tr>)
    /* (REG-617, parity Q-21) The section's sub-total in its band: the label across, the amount in the last column's place. */
    if (amount && last > 0) return table(<tr key={key} data-band><td colSpan={span - 1} style={{ background: bg, color: fg, padding: pad }}>{text}</td><td data-band-amount style={{ background: bg, color: fg, padding: pad, textAlign: cols[last]!.align, fontWeight: 700 }}>{amount}</td></tr>, tone === 'optional' ? styles.optional : undefined)
    return table(<tr key={key} data-band><td colSpan={span} style={{ background: bg, color: fg, padding: pad }}>{text}</td></tr>, tone === 'optional' ? styles.optional : undefined)
  }
  const inset = mm(cols[0]?.key === 'no' ? cols[0].width : 0) + 4
  /* (REG-557) A formatted note prints its paragraphs and lists; a plain one its text. */
  const noteRow = (note: string, key: string, noteHtml?: string | null) => table(<tr key={key}><td colSpan={span} style={{ ...textCss(b.groupNoteStyle, brand, 'table'), paddingLeft: inset }}>{noteHtml ? <div className={styles.rich} dangerouslySetInnerHTML={html(noteHtml, values)} /> : resolveFields(note, values)}</td></tr>)
  /* A room label under a section — or (REG-558) a sub-section's own row: numbered in the nested mode, highlighted like its lines. */
  const areaRow = (label: string, key: string, no = '', hl?: string | null) => table(<tr key={key} data-area>{no && cols[0]?.key === 'no' ? <><td style={{ ...textCss(b.areaStyle, brand, 'table'), ...hlStyle(hl), textAlign: cols[0].align }}>{no}</td><td colSpan={span - 1} style={{ ...textCss(b.areaStyle, brand, 'table'), ...hlStyle(hl) }}>{label}</td></> : <td colSpan={span} style={{ ...textCss(b.areaStyle, brand, 'table'), ...hlStyle(hl), paddingLeft: inset }}>{label}</td>}</tr>)
  /* `shade` (Dane UAT, b-zebra): every other line of a section wears the band colour while the block's "Shade every other row" is on —
     section, room and note rows never count, and a highlight's fill still wins over it. */
  const lineRow = (l: Line, no: string, key: string, hideAmount: boolean, shade = false) => {
    const plain = l.descriptionHtml ? htmlToPlain(l.descriptionHtml) : l.description
    const descLines = descriptions === 'none' || !plain ? [] : descriptions === 'first' ? [plain.split('\n')[0]!] : plain.split('\n').filter(Boolean)
    /* (REG-557) A formatted description prints its own shape (lists, bold, underline) unless the template asks for the first line only. */
    const richDesc = descriptions !== 'none' && descriptions !== 'first' && l.descriptionHtml ? l.descriptionHtml : null
    const total = l.noPrice ? 0 : lineTotalMinor(l)
    const word = printsWord(l)   // (REG-555) the word stands where the amount would; "On behalf" keeps the amount
    const hl = hlStyle(l.highlight)   // (REG-556)
    /* (REG-595) A revision's marks: a removed line struck through in the kit's red, a new one marked, a changed figure with the old one struck beside it. */
    const removed = view.changes && l.change === 'removed'
    const added = view.changes && l.change === 'added'
    const was = view.changes && l.change === 'changed' ? l.was ?? null : null
    const st: CSSProperties | undefined = removed ? { ...hl, color: resolveColor('red', brand), textDecoration: 'line-through' } : hl
    const strike = (m: number) => <span className={styles.was}>{money(m, false, false)}</span>
    const amount = (minor: number, zeroText: boolean) => (word ? wordCell(l) : l.printAs === 'behalf' ? <>{money(minor, l.noPrice, zeroText)}<div style={{ ...textCss(b.descriptionStyle, brand, 'small'), textAlign: 'right' }}>on behalf</div></> : money(minor, l.noPrice, zeroText))
    return table(
      <tr key={key} data-line data-shade={shade || undefined} data-removed={removed || undefined} data-added={added || undefined}>
        {cols.map((c) => {
          switch (c.key) {
            case 'no': return cell(c, l.noNumber ? '' : no, st)
            case 'item': return cell(c, (
              <div className={styles.item} data-photo={photos && l.thumb ? '' : undefined}>
                {photos && l.thumb ? <img className={styles.thumb} src={l.thumb} alt="" /> : null}
                <div>
                  <div>{l.name}{added ? <span className={styles.newMark}>New</span> : null}</div>
                  {was && was.name !== l.name ? <div className={styles.was} style={textCss(b.descriptionStyle, brand, 'small')}>{was.name}</div> : null}
                  {richDesc ? <div className={styles.rich} style={textCss(b.descriptionStyle, brand, 'small')} dangerouslySetInnerHTML={{ __html: richDesc }} />
                    : descLines.map((d, i) => <div key={i} style={textCss(b.descriptionStyle, brand, 'small')}>{descriptions === 'bullets' && !d.startsWith('• ') ? `• ${d}` : d}</div>)}
                </div>
              </div>
            ), st)
            case 'qty': return cell(c, <>{was && was.qty !== l.qty ? <span className={styles.was}>{String(was.qty)}</span> : null}{l.qty ? String(l.qty) : ''}</>, st)
            case 'unit': return cell(c, l.unit ?? '', st)
            case 'qtyUnit': { const qu = (n: number) => (n && l.unit ? `${n} ${l.unit}` : l.unit ?? (n > 1 ? String(n) : '')); return cell(c, <>{was && was.qty !== l.qty ? <span className={styles.was}>{qu(was.qty)}</span> : null}{qu(l.qty)}</>, st) }   /* (REG-595) the old quantity struck before the new */
            case 'unitPrice': return cell(c, hideAmount ? null : word ? null : <>{was && was.unitPriceMinor !== unitPriceMinor(l) ? strike(was.unitPriceMinor) : null}{amount(unitPriceMinor(l), false)}</>, st)
            case 'discount': return cell(c, l.discountPct && !word ? `${l.discountPct}%` : '', st)
            /* (REG-617, parity Q-11) With the Optional price column on, an optional line's price stands there and its Total stays empty — out of every sum. */
            case 'optional': return cell(c, hideAmount || !l.optional ? null : <>{was && was.totalMinor !== total ? strike(was.totalMinor) : null}{amount(total, true)}</>, st)
            case 'total': return cell(c, hideAmount || (optCol && l.optional) ? null : <>{was && was.totalMinor !== total ? strike(was.totalMinor) : null}{amount(total, true)}</>, st)
          }
        })}
      </tr>,
    )
  }
  /* A sum row: the label runs right across every column before the amount, so a long "Sub-total for Masonry Works" never meets its figure. */
  const sumRow = (label: string, minor: number, key: string, strong = true) => table(
    <tr key={key} data-sum>
      {cols.length > 1 ? <td colSpan={cols.length - 1} style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: strong ? 700 : 400 }}>{label}</td> : null}
      {cell(cols[cols.length - 1]!, cols.length > 1 ? money(minor, false, false) : <span className={styles.amt}><span style={{ fontWeight: strong ? 700 : 400 }}>{label}</span>{money(minor, false, false)}</span>)}
    </tr>,
  )

  const { main, optional } = sections(b, data.items, view, data.studio.tradeNotes ?? {}, optCol)
  const headStyle = textCss(b.headerStyle, brand, 'small')
  const headBg = b.headerRow === 'band' ? resolveColor('band', brand) : b.headerRow === 'black' ? '#000' : undefined
  const head = b.headerRow === 'none' ? null : table(
    <tr data-head>{cols.map((c) => cell(c, resolveFields(c.label, values), { ...headStyle, textAlign: c.key === 'item' ? (b.headerStyle.align ?? 'left') : c.align, background: headBg, borderBottom: b.headerRow === 'ruled' ? `1px solid ${ink}` : undefined, color: b.headerRow === 'black' ? '#fff' : headStyle.color }))}</tr>,
  )
  const filler = table(<tr data-fill>{cols.map((c) => cell(c, ' '))}</tr>)
  const pageTotal = (pc: PageCtx) => table(
    <tr data-sum>
      {cols.length > 1 ? <td colSpan={cols.length - 1} style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{b.pageTotalLabel.replace('{n}', String(pc.page))}</td> : null}
      {cell(cols[cols.length - 1]!, money(pc.pageTotalMinor, false, false))}
    </tr>,
  )
  tables[tid] = { head, filler, pageTotal, fillPage: b.fillPage, pageTotals: b.pageTotals, keepGroups: b.keepGroups }

  const push = (s: Omit<Slice, 'blockId' | 'tableId'>) => out.push({ ...s, blockId: b.id, tableId: tid })
  const hideAmount = view.amounts !== 'lines'   // (REG-585) one amount per section, or the total only: no price on the lines
  if (head) push({ key: `${tid}:head`, node: head, isHead: true, keepWithNext: true })
  let counter = 0
  const nested = b.numbering === 'nested'   // (REG-558) 1 · 1.1 · a b c
  const lettered = b.numbering === 'lettered'   // (REG-617, parity Q-10) A1 · A2 · B1
  /* (Dane UAT, Figma 1518:77) The room rows take numbers too: "rooms" = B · 1 Kitchen · 1.1 (with sections marked 1 · 2 · 3: 1 · 1.1 Kitchen
     · 1.1.1), "roman" = 1 · a · i. Inside a section the rooms — and any lines of its own beside them — count 1, 2, 3 (or a, b, c), and a
     room's lines count under it. */
  const rooms = b.numbering === 'rooms', roman = b.numbering === 'roman'
  const levelTwo = rooms || roman
  const numbersMarked = b.sectionLabel === 'numbers'
  const subAt = b.subtotalAt ?? 'row'
  main.forEach((s, si) => {
    const label = b.sectionLabel === 'letters' ? `${LETTERS[si % 26]}  ${s.label}` : b.sectionLabel === 'numbers' || nested || roman ? `${si + 1}  ${s.label}` : s.label
    const gk = s.id
    const subWord = s.subLabel ? ` (${s.subLabel})` : ''
    const onlyOptional = s.lines.length > 0 && s.lines.every((l) => l.optional)   // a section of optional lines only has nothing to sum
    const inBand = view.amounts === 'lines' && b.subtotals && !!s.label && subAt !== 'row' && !onlyOptional
    const bandAmount = inBand ? <>{money(s.totalMinor, false, false)}{subWord ? <div style={{ fontWeight: 400 }}>{subWord.trim()}</div> : null}</> : undefined
    if (s.label) push({ key: `${tid}:${s.id}:band`, node: bandRow(label, `${s.id}-band`, 'section', s.highlight, bandAmount), groupKey: gk, groupStart: true, keepWithNext: true, breakBefore: b.groupNewPage && si > 0 })
    if (s.note || s.noteHtml) push({ key: `${tid}:${s.id}:note`, node: noteRow(s.note ?? '', `${s.id}-note`, s.noteHtml), groupKey: gk, keepWithNext: true })
    if (b.numbering === 'group' || lettered || nested || levelTwo) counter = 0
    const areas = s.areas.length ? s.areas : [{ label: '', lines: s.lines }]
    let subCounter = 0
    let shaded = 0   // the section's lines so far, for the zebra
    const levelTwoMark = (k: number) => (rooms ? (numbersMarked ? `${si + 1}.${k}` : String(k)) : LETTERS[(k - 1) % 26]!.toLowerCase())
    areas.forEach((a, ai) => {
      // A sub-section in the nested mode takes the section's next number ("1.3") and letters its lines (a, b, c).
      const areaNo = levelTwo && a.label ? levelTwoMark(++counter) : ''
      const subNo = a.sub && nested ? `${si + 1}.${++counter}` : areaNo
      if (a.label) push({ key: `${tid}:${s.id}:a${ai}`, node: areaRow(a.label, `${s.id}-a${ai}`, subNo, a.highlight), groupKey: gk, keepWithNext: true })
      if (a.sub && (a.note || a.noteHtml)) push({ key: `${tid}:${s.id}:a${ai}:note`, node: noteRow(a.note ?? '', `${s.id}-a${ai}-note`, a.noteHtml), groupKey: gk, keepWithNext: true })
      if (b.numbering === 'area') counter = 0
      if (a.sub || areaNo) subCounter = 0
      a.lines.forEach((l) => {
        let no = ''
        if (!l.noNumber) {   // (REG-558) a "no number" line is passed over
          if (nested) { if (a.sub) { subCounter += 1; no = LETTERS[(subCounter - 1) % 26]!.toLowerCase() } else { counter += 1; no = `${si + 1}.${counter}` } }
          else if (levelTwo) { if (areaNo) { subCounter += 1; no = rooms ? `${areaNo}.${subCounter}` : toRoman(subCounter) } else no = levelTwoMark(++counter) }
          else { counter += 1; no = b.numbering === 'none' ? '' : lettered ? `${LETTERS[si % 26]}${counter}` : String(counter) }
        }
        push({ key: `${tid}:${l.id}`, node: lineRow(l, no, l.id, hideAmount, b.zebra && shaded++ % 2 === 1), groupKey: gk, amountMinor: l.noPrice || printsWord(l) || l.change === 'removed' || l.optional ? 0 : lineTotalMinor(l) })
      })
    })
    const subLabel = s.subLabel ? ` (${s.subLabel})` : ''   // (REG-555, T-3) "Sub-total for Masonry (Approximate)"
    if (onlyOptional) { /* no sub-total or lump sum for a section of optional lines */ }
    else if (view.amounts === 'sections') push({ key: `${tid}:${s.id}:lump`, node: sumRow(`Lump sum${subLabel}`, s.totalMinor, `${s.id}-lump`), groupKey: gk })
    else if (view.amounts === 'lines' && b.subtotals && s.label && subAt !== 'band') push({ key: `${tid}:${s.id}:sub`, node: sumRow(`${b.subtotalLabel.replace('{section}', s.label)}${subLabel}`, s.totalMinor, `${s.id}-sub`), groupKey: gk })
  })
  if (optional.length && b.optionalSection && view.optionalWorks) {
    push({ key: `${tid}:opt:band`, node: bandRow(b.optionalTitle, 'opt-band', 'optional'), groupKey: 'optional', groupStart: true, keepWithNext: true })
    optional.forEach((l, i) => push({ key: `${tid}:opt:${l.id}`, node: lineRow(l, String(i + 1), `opt-${l.id}`, hideAmount, b.zebra && i % 2 === 1), groupKey: 'optional' }))
  }
}

/* ── the other flow blocks ── */
function totalsNode(b: TotalsBlock, ctx: RenderCtx, view: ClientView, t: DocTotals): SliceNode {
  const { brand, data, values } = ctx
  const style = textCss(b.style, brand)
  const totalStyle = textCss(b.totalStyle, brand)
  const ink = resolveColor('ink', brand)
  const m = (minor: number) => { const x = moneyText(minor, 'S$'); return x.figure }
  return function totalsRows(pc: PageCtx) {
    const rows: { label: string; value: string; strong?: boolean }[] = []
    for (const l of b.lines) {
      if (!l.on) continue
      if (!view.subtotalBreakdown && l.key !== 'total') continue
      const label = resolveFields(l.label, values)
      switch (l.key) {
        case 'pages': pc.pageTotals.forEach((v, i) => rows.push({ label: label.replace('{n}', String(i + 1)), value: m(v) })); break
        case 'subtotal': rows.push({ label, value: m(t.subtotalMinor) }); break
        case 'discount': if (t.discountMinor > 0) rows.push({ label, value: `−${m(t.discountMinor)}` }); break
        case 'additional': {
          // (REG-559) The additional discount, then every named discount on its own line — its word as typed on the quote.
          const named = t.discountLines.reduce((s, d) => s + d.minor, 0)
          if (t.additionalMinor - named > 0) rows.push({ label, value: `−${m(t.additionalMinor - named)}` })
          for (const d of t.discountLines) if (d.minor > 0) rows.push({ label: d.label || label, value: `−${m(d.minor)}` })
          break
        }
        case 'gst': if (data.quote.gstEnabled) rows.push({ label, value: m(t.gstMinor) }); break
        case 'total': rows.push({ label, value: m(t.totalMinor), strong: true }); break
      }
    }
    return (
      <div className={styles.totals} data-layout={b.layout} data-rules={b.rules} style={{ width: b.layout === 'right' ? mm(b.width) : undefined, ['--ink' as string]: ink }}>
        {rows.map((r, i) => (
          <div key={i} className={styles.totRow} data-strong={r.strong || undefined} style={r.strong ? totalStyle : style}>
            <span>{r.label}</span><span>{r.value}</span>
          </div>
        ))}
      </div>
    )
  }
}

/** 1st · 2nd · 3rd · 4th … 11th · 12th · 13th · 21st (REG-618, parity Q-16). */
const ordinal = (n: number) => { const t = n % 100; const s = t >= 11 && t <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'; return `${n}${s}` }

function paymentsNode(b: PaymentsBlock, ctx: RenderCtx): ReactNode {
  const { brand, data, values } = ctx
  const mark = (i: number) => (b.ordinals ? ordinal(i + 1) : b.letters ? LETTERS[i % 26]! : String(i + 1))   // (REG-618, parity Q-16)
  const foot = b.footnote?.trim() ? <div className={styles.payFoot} style={textCss({ role: 'small', color: 'grey' }, brand)}>{resolveFields(b.footnote, values)}</div> : null
  const style = textCss(b.style, brand)
  const titleStyle = textCss(b.titleStyle, brand)
  const ink = resolveColor('ink', brand)
  const title = b.title ? <div className={styles.payTitle} data-band={b.band || undefined} style={{ ...titleStyle, background: b.band ? '#000' : undefined }}>{resolveFields(b.title, values)}</div> : null
  const rows = data.payments
  const m = (minor: number) => moneyText(minor, 'S$').figure
  if (!rows.length) return <div style={style}>{title}<div className={styles.muted}>No payment schedule on this quote.</div>{foot}</div>
  /* (REG-560) The Total line under the milestones — the sum of the amounts, and the percentages' sum — unless the template hides it. */
  const totalMinor = rows.reduce((s, p) => s + p.amountMinor, 0), totalPct = rows.reduce((s, p) => s + p.pct, 0)
  const totalLine = b.showTotal ? <div className={styles.payTotal} style={{ borderTopColor: ink }}><span>Total</span><span>{totalPct}%{b.showAmounts ? ` · ${m(totalMinor)}` : ''}</span></div> : null
  if (b.layout === 'list') return (
    <div style={style}>{title}
      <ol className={styles.payList} data-letters={b.letters || b.ordinals || undefined}>
        {rows.map((p, i) => <li key={i}><span>{b.letters || b.ordinals ? `${mark(i)}  ` : ''}{p.description || p.name} - <b style={{ color: resolveColor('red', brand) }}>{p.pct}%</b>{b.showAmounts ? ` (${m(p.amountMinor)})` : ''}{b.showDue && p.due ? ` · ${p.due}` : ''}</span></li>)}
      </ol>
      {totalLine}
      {foot}
    </div>
  )
  if (b.layout === 'cards') return (
    <div style={style}>{title}
      <div className={styles.payCards}>
        {rows.map((p, i) => <div key={i} className={styles.payCard} style={{ borderColor: resolveColor('light', brand) }}><div className={styles.payPct}>{b.letters || b.ordinals ? `${mark(i)} · ` : ''}{p.name} · {p.pct}%</div>{b.showAmounts ? <div className={styles.payAmt}>{m(p.amountMinor)}</div> : null}<div className={styles.muted}>{p.description}{b.showDue && p.due ? ` · ${p.due}` : ''}</div></div>)}
      </div>
      {totalLine}
      {foot}
    </div>
  )
  return (
    <div style={style}>{title}
      <table className={styles.t} data-grid={b.band ? '' : undefined} data-ruled={b.band ? undefined : ''} style={{ ['--ink' as string]: ink, ['--light' as string]: resolveColor('light', brand), ['--pad' as string]: ROW_PAD.normal }}>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i}>
              <td style={{ width: mm(b.ordinals ? 10 : 8), textAlign: 'center' }}>{mark(i)}</td>
              <td><b>{p.pct}%</b> - {p.description || p.name}</td>
              {b.showDue ? <td style={{ width: mm(28) }}>{p.due}</td> : null}
              {b.showAmounts ? <td style={{ width: mm(30), textAlign: 'right' }}>{m(p.amountMinor)}</td> : null}
            </tr>
          ))}
          {b.showTotal ? (
            <tr data-sum>
              <td />
              <td><b>Total</b></td>
              {b.showDue ? <td /> : null}
              {b.showAmounts ? <td style={{ textAlign: 'right' }}>{m(totalMinor)}</td> : <td style={{ textAlign: 'right' }}>{totalPct}%</td>}
            </tr>
          ) : null}
        </tbody>
      </table>
      {foot}
    </div>
  )
}

/** (REG-562) The rows a Bank details block prints for the document's entity — none when the entity has no bank details. */
export function bankRows(data: RenderCtx['data']): { entity: ReturnType<typeof docEntity>; filled: boolean } {
  const e = docEntity(data)
  return { entity: e, filled: !!e && !!(e.bankName || e.accountName || e.accountNo || e.swift || e.payNow || e.payNowQr) }
}

/** (REG-562) Bank details: the issuing entity's bank, account name and number, PayNow — and its QR beside, when uploaded.
 *  (UX audit S1) With nothing to print, the block prints nothing on the client's pages — Preview, the confirmation and signing links; the
 *  "add them in Company › Profile" hint is the template editor's alone (its canvas is interactive), and Preview's readiness names the gap. */
function bankNode(b: BankBlock, ctx: RenderCtx): ReactNode {
  const { brand, data, values } = ctx
  const e = docEntity(data)
  if (!ctx.interactive && !bankRows(data).filled) return null
  const style = textCss(b.style, brand)
  // (REG-618, parity Q-24) The studio's own words for each row, and the SWIFT code beside the account.
  const word = (k: keyof typeof BANK_ROW_LABEL) => resolveFields(b.labels?.[k]?.trim() || BANK_ROW_LABEL[k], values)
  const rows: [string, string][] = e ? ([[word('bank'), e.bankName], [word('accountName'), e.accountName], [word('accountNo'), e.accountNo], [word('swift'), e.swift], [word('payNow'), e.payNow]] as [string, string][]).filter((r) => !!r[1]) : []
  const title = b.title ? <div className={styles.textTitle} style={textCss(b.titleStyle, brand)}>{resolveFields(b.title, values)}</div> : null
  const body = rows.length ? (
    <table className={styles.kv} style={{ borderSpacing: `0 ${mm(0.6)}px` }}><tbody>
      {rows.map(([k, v]) => <tr key={k}><td className={styles.kvLabel} style={{ width: mm(30), opacity: .75 }}>{k}</td><td>{v}</td></tr>)}
    </tbody></table>
  ) : ctx.interactive ? <div className={styles.muted}>{e ? `No bank details for ${e.name} yet — add them in Company › Profile.` : 'No issuing entity.'}</div> : null
  const qr = b.qr && e?.payNowQr ? <img src={e.payNowQr} alt="PayNow QR" style={{ width: mm(b.qrWidth), height: mm(b.qrWidth), objectFit: 'contain', flex: '0 0 auto' }} /> : null
  return (
    <div className={styles.textBlock} data-box={b.box !== 'none' ? b.box : undefined} style={{ ...style, ['--tint' as string]: resolveColor('band', brand), ['--ink' as string]: resolveColor('ink', brand) }}>
      {title}
      <div className={styles.bank} data-layout={b.layout}>{body}{qr}</div>
    </div>
  )
}

function textSourceSlices(b: TextSourceBlock, ctx: RenderCtx, out: Slice[]) {
  const { brand, data, values } = ctx
  const src = b.kind === 'terms' ? data.quote.termsHtml : data.quote.notesHtml
  const paras = paragraphs(src)
  if (!paras.length) return
  const style = textCss(b.style, brand)
  const ink = resolveColor('ink', brand)
  if (b.title) out.push({ key: `${b.id}:title`, blockId: b.id, keepWithNext: true, node: <div className={styles.textTitle} style={textCss(b.titleStyle, brand)}>{resolveFields(b.title, values)}</div> })
  paras.forEach((p, i) => out.push({
    key: `${b.id}:p${i}`, blockId: b.id,
    node: <div className={styles.para} data-grid={b.grid ? '' : undefined} data-numbered={b.numbered ? '' : undefined} style={{ ...style, ['--ink' as string]: ink }}>{b.numbered ? <span className={styles.paraNo}>{i + 1}</span> : null}<span dangerouslySetInnerHTML={html(p, values)} /></div>,
  }))
}

function detailsNode(b: DetailsBlock, ctx: RenderCtx): ReactNode {
  const { brand, values } = ctx
  const kv = (rows: DetailsBlock['left']) => (
    <table className={styles.kv} style={{ ...textCss(b.style, brand), borderSpacing: `0 ${mm(1)}px` }}><tbody>
      {rows.map((r) => <tr key={r.id}><td className={styles.kvLabel} style={{ ...textCss(b.labelStyle, brand), width: mm(b.labelWidth) }}>{resolveFields(r.label, values)}</td><td style={{ borderBottom: b.layout === 'form' ? `1px solid ${resolveColor('ink', brand)}` : undefined }}>{resolveFields(r.value, values) || ' '}</td></tr>)}
    </tbody></table>
  )
  if (b.layout === 'stacked') return <div>{kv([...b.left, ...b.right])}</div>
  return <div className={styles.detailsCols}>{kv(b.left)}{kv(b.right)}</div>
}

function EditableLine({ text, field, block, ctx, className, style }: { text: string; field: 'title' | 'subject' | 'intro'; block: TitleBlock; ctx: RenderCtx; className?: string; style: CSSProperties }) {
  const { values, interactive } = ctx
  if (!interactive) return <div className={className} style={style}>{resolveFields(text, values)}</div>
  return (
    <div className={className} style={style} data-editable contentEditable suppressContentEditableWarning
         onFocus={(e) => { e.currentTarget.textContent = text }}
         onBlur={(e) => { const v = e.currentTarget.innerText; e.currentTarget.textContent = resolveFields(v, values); interactive.onEditText(block.id, null, field, v) }}
         onKeyDown={(e) => { if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur() }}>
      {resolveFields(text, values)}
    </div>
  )
}

export function buildSlices(design: TemplateDesign, ctx: RenderCtx, view: ClientView, totals: DocTotals): Built {
  const { brand, values } = ctx
  const out: Slice[] = []
  const tables: Record<string, TableExtras> = {}
  const blocks = design.blocks.filter((b) => !b.hidden && b.kind !== 'header' && b.kind !== 'footer' && b.kind !== 'cover')
  for (const b of blocks) {
    const start = out.length
    switch (b.kind) {
      case 'details': out.push({ key: b.id, blockId: b.id, node: detailsNode(b, ctx) }); break
      case 'title': {
        const tb = b as TitleBlock
        out.push({ key: b.id, blockId: b.id, node: (
          <div className={styles.titleBlock}>
            {tb.title ? <EditableLine text={tb.title} field="title" block={tb} ctx={ctx} style={textCss(tb.titleStyle, brand, 'heading')} /> : null}
            {tb.subject ? <EditableLine text={tb.subject} field="subject" block={tb} ctx={ctx} style={{ ...textCss(tb.subjectStyle, brand), marginTop: tb.title ? mm(2) : 0 }} /> : null}
            {tb.intro ? <EditableLine text={tb.intro} field="intro" block={tb} ctx={ctx} style={{ ...textCss(tb.introStyle, brand), marginTop: mm(1.5), whiteSpace: 'pre-line' }} /> : null}
          </div>
        ) })
        break
      }
      case 'items': itemsSlices(b, design, ctx, view, out, tables); break
      case 'totals': out.push({ key: b.id, blockId: b.id, node: totalsNode(b, ctx, view, totals) }); break
      case 'payments': if (view.paymentSchedule) out.push({ key: b.id, blockId: b.id, node: paymentsNode(b, ctx) }); break
      case 'bank': { const node = bankNode(b, ctx); if (node) out.push({ key: b.id, blockId: b.id, node }); break }   /* (UX audit S1) an empty block leaves no slice — no gap on the client's page */
      case 'terms': if (view.terms) textSourceSlices(b, ctx, out); break
      case 'notes': if (view.notes) textSourceSlices(b, ctx, out); break
      case 'signature': if (view.signature) out.push({ key: b.id, blockId: b.id, node: <SignatureColumns columns={(b as SignatureBlock).columns} style={b.style} headingStyle={b.headingStyle} lineWeight={b.lineWeight} lineColor={b.lineColor} preamble={b.preamble} ctx={ctx} /> }); break
      case 'text': out.push({ key: b.id, blockId: b.id, node: <div className={styles.textBlock} data-box={b.box !== 'none' ? b.box : undefined} style={{ ...textCss(b.style, brand), ['--tint' as string]: resolveColor('band', brand), ['--ink' as string]: resolveColor('ink', brand) }} dangerouslySetInnerHTML={html(b.html, values)} /> }); break
      case 'image': out.push({ key: b.id, blockId: b.id, node: (
        <div style={{ textAlign: b.align }}>
          <img src={b.src === 'logo' ? brand.logo ?? '' : b.src === 'stamp' ? brand.stamp ?? '' : b.src} alt="" style={{ width: mm(b.width), display: 'inline-block' }} />
          {b.caption ? <div className={styles.caption} style={{ ...textCss({ role: 'small', weight: 700 }, brand), width: mm(b.width), display: 'inline-block' }}>{resolveFields(b.caption, values)}</div> : null}
        </div>
      ) }); break
      case 'divider': out.push({ key: b.id, blockId: b.id, node: <div className={styles.rule} style={{ borderTopWidth: pt(b.weight), borderTopColor: resolveColor(b.color, brand) }} /> }); break
      case 'spacer': out.push({ key: b.id, blockId: b.id, node: <div style={{ height: mm(b.height) }} /> }); break
      case 'pagebreak': out.push({ key: b.id, blockId: b.id, node: <div className={styles.pageBreakMark} />, breakBefore: true }); break
      case 'badges': out.push({ key: b.id, blockId: b.id, node: <div className={styles.badges} style={{ justifyContent: b.align === 'center' ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start', height: mm(b.height), gap: mm(2) }}>{(b.items.length ? b.items : brand.badges).map((x, i) => <img key={i} src={x} alt="" />)}</div> }); break
    }
    const first = out[start], last = out[out.length - 1]
    if (first && out.length > start) {
      if (b.startNewPage) first.breakBefore = true
      if (b.spaceBefore) first.padTop = mm(b.spaceBefore)
      if (b.keepWithNext && last) last.keepWithNext = true
      if (b.spaceAfter && last) last.padBottom = mm(b.spaceAfter)
      if (!first.padTop && start > 0) first.padTop = mm(b.kind === 'items' ? 3 : 3.5)
    }
  }
  return { slices: out, tables }
}
