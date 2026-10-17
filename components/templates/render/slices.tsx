'use client'

import type { CSSProperties, ReactNode } from 'react'
import { AFTER_TITLE, BANK_ROW_LABEL, detailsLook, mm, resolveColor, rowLinesOf, subtotalStyleOf, type ItemsSpaceKey, type BankBlock, type DetailsBlock, type ItemsBlock, type ItemsColumn, type PaymentsBlock, type SignatureBlock, type TextSourceBlock, type TitleBlock, type TotalsBlock, type TemplateDesign } from '@/lib/templates/model'
import { fieldValues, resolveFields, resolveFieldsOnly, variationTotalsLabel } from '@/lib/templates/fields'
import type { ClientView } from '@/lib/templates/client-view'
import { docEntity, docTotals, fixedWord, type DocItem, type DocTotals } from '@/lib/templates/data'
import { lineTotalMinor, printsWord, unitPriceMinor } from '@/lib/quotes/math'
import { sections, showsRemoved, type Line, type Section } from '@/lib/templates/item-sections'   // (S44F — NB-03)
import { versionInk } from '@/lib/quotes/diff'   // (S44F — NB-01)
import { kitHtml } from '@/lib/templates/kit-html'   // (S44T — call C2's print side)
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { HIGHLIGHT_KIND, htmlToPlain, isHighlight, printAsWord } from '@/lib/quotes/items-model'
import { KvTable, SignatureColumns, type RenderCtx } from './canvas'
import { moneyText, pt, ROW_PAD, textCss } from './styles'
import { escapedValues, printedLinks, sanitizeRichHtml, textPieces } from '@/lib/rich-html'   // (S44Q, triage §12.1 · row 321; S44G — NB-08 links)
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
  /** (S44T — UAT row 293) A line whose description may run on across pages: its id, when it has more than one piece to break between. */
  splitLine?: string
}
export type TableExtras = { head: ReactNode; filler: ReactNode; pageTotal: (ctx: PageCtx) => ReactNode; fillPage: boolean; pageTotals: boolean; keepGroups: boolean }
export type Built = { slices: Slice[]; tables: Record<string, TableExtras> }

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ROMAN: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]
/** i · ii · iii · iv — a line's mark in the "1 · a · i" numbering (Dane UAT, Figma 1518:77). */
const toRoman = (n: number) => { let out = ''; let left = n; for (const [v, r] of ROMAN) while (left >= v) { out += r; left -= v } return out }
/* (Projects round 5) a body the studio wrote (T&Cs, notes, a description) keeps its own words on a variation order — only the template's say "Variation order"
   (S44Q, triage §12.1) Every body drawn here passes the house allowlist, and a field's value goes in as words — a client's name is never markup.
   (S44G — NB-08) …and a link in it opens beside the quote (`printedLinks`). */
const html = (h: string, values: Record<string, string>) => ({ __html: printedLinks(sanitizeRichHtml(resolveFieldsOnly(h, escapedValues(values)))) })

/* ── items ── (S44F) the sections the table prints — `sections()` and its types — live in lib/templates/item-sections.ts, shared with the client
   projection (lib/quotes/client-quote.ts) so a client page's sums land on the very sections drawn here */
/** (UX audit Q6) One line as the client's phone reads it — the words the print gives it, nothing the print leaves out. */
export type ReadingLine = { id: string; name: string; description: string | null; qty: number; unit: string | null; unitPriceMinor: number; totalMinor: number; word: string | null; noPrice: boolean; optional: boolean }
export type ReadingSection = { id: string; label: string; totalMinor: number; lines: ReadingLine[] }
/** (S44T — UAT row 332) The payment schedule as the phone's cards end with it: each milestone, its share (or a fixed row's word), its amount. */
export type ReadingPayment = { mark: string; label: string; share: string | null; amountMinor: number | null; due: string | null }
export type ReadingSchedule = { title: string; rows: ReadingPayment[]; total: { share: string | null; amountMinor: number | null } | null }
/**
 * (UX audit Q6, REG-597's phone cards for the client) The quote's lines as the confirmation page's reading cards: the SAME sections, lines,
 * hidden-line and optional rules and amounts the printed page draws (`sections`), from the template's Items block and the quote's client
 * view — so the cards never show what the print would not. `amounts` = what the client sees priced (REG-585). `null` = the template prints
 * no Items block (the page then shows the print).
 */
export function readingSections(design: TemplateDesign, data: RenderCtx['data'], view: ClientView): { sections: ReadingSection[]; optional: ReadingLine[]; amounts: ClientView['amounts']
  /** (S44T — call C1) the sections priced after the contract — estimates, out of the total */ after: ReadingSection[]; afterTitle: string
  /** (S44T — UAT row 332) the schedule the print shows, null when it shows none */ schedule: ReadingSchedule | null } | null {
  const b = design.blocks.find((x): x is ItemsBlock => x.kind === 'items' && !x.hidden)
  if (!b) return null
  const cols = b.columns.filter((c) => c.on && view.columns[c.key] !== false)
  const { main, optional, after } = sections(b, data.items, view, data.studio.tradeNotes ?? {}, cols.some((c) => c.key === 'optional'), data.sums?.print, data.quote.version)   // (S44F — NB-03 · NB-01)
  const descriptions = view.descriptions && b.descriptions !== 'none'
  const line = (l: Line): ReadingLine => {
    const plain = l.descriptionHtml ? htmlToPlain(l.descriptionHtml) : l.description
    return {
      id: l.id, name: l.name, description: descriptions && plain ? (b.descriptions === 'first' ? plain.split('\n')[0] ?? null : plain) : null,
      qty: l.qty, unit: l.unit, unitPriceMinor: unitPriceMinor(l), totalMinor: l.noPrice ? 0 : lineTotalMinor(l),
      word: printsWord(l) ? printAsWord(l) : l.underWord ? l.underWordText ?? null : null, noPrice: l.noPrice && !l.underWord, optional: l.optional,   // (S44I — M17) a phone card says the section's word
    }
  }
  return {
    sections: main.map((s) => ({ id: s.id, label: s.label, totalMinor: s.totalMinor, lines: s.lines.filter((l) => l.change !== 'removed').map(line) })),
    optional: b.optionalSection && view.optionalWorks ? optional.map(line) : [],
    amounts: view.amounts,
    after: after.map((s) => ({ id: s.id, label: s.label, totalMinor: s.totalMinor, lines: s.lines.filter((l) => l.change !== 'removed').map(line) })),
    afterTitle: b.afterTitle?.trim() || AFTER_TITLE,
    schedule: readingSchedule(design, data, view),
  }
}

/** (S44T — UAT row 332) The schedule exactly as the Payments block prints it — its marks, its shares (or none), its amounts — or null. */
function readingSchedule(design: TemplateDesign, data: RenderCtx['data'], view: ClientView): ReadingSchedule | null {
  const p = design.blocks.find((x): x is PaymentsBlock => x.kind === 'payments' && !x.hidden)
  const pays = data.payments.filter((x) => x.change !== 'removed')   // (S44F — NB-02 (a)) a milestone a revision removed is the print's mark, not the client's schedule
  if (!p || !view.paymentSchedule || data.quote.kind === 'variation' || !pays.length) return null
  const shares = (p.pctAt ?? 'inline') !== 'none'
  const rows = pays.map((x, i) => ({ mark: payMark(p, i), label: x.description || x.name, share: shares ? (x.fixed ? fixedWord(x) : `${x.pct}%`) : null, amountMinor: p.showAmounts ? x.amountMinor : null, due: p.showDue && x.due ? x.due : null }))
  const total = p.showTotal && (shares || p.showAmounts) ? { share: shares ? `${pays.reduce((s, x) => s + (x.fixed ? 0 : x.pct), 0)}%` : null, amountMinor: p.showAmounts ? pays.reduce((s, x) => s + x.amountMinor, 0) : null } : null
  return { title: p.title ? resolveFields(p.title, fieldValues(data, docTotals(data), undefined, design.page.dateFormat)) : '', rows, total }
}

function itemsSlices(b: ItemsBlock, design: TemplateDesign, ctx: RenderCtx, view: ClientView, out: Slice[], tables: Record<string, TableExtras>, split?: ReadonlySet<string>) {
  const { brand, data, values } = ctx
  const tid = b.id
  const every = view.changes && view.changesSince === 'all'   // (S44F — NB-01) every version's marks, each in its colour
  const cols: ItemsColumn[] = b.columns.filter((c) => c.on && view.columns[c.key] !== false)
  const optCol = cols.some((c) => c.key === 'optional')   // (REG-617, parity Q-11) optional lines print in place, priced in their own column
  const descriptions = view.descriptions ? b.descriptions : 'none'
  const zeroQty = b.zeroQty === 'dash' ? '–' : ''   // (S44T — UAT row 324)
  const photos = b.photos && view.photos
  const cellStyle = textCss(b.style, brand, 'table')
  const pad = ROW_PAD[b.density]
  const bandPad = ROW_PAD[b.headingHeight ?? b.density]   // (S44T — M1, row 252) the heading band's own height; unset = the rows'
  const ink = resolveColor('ink', brand), light = resolveColor('light', brand)
  const zebra = resolveColor('band', brand)   // (Dane UAT, b-zebra) "Shade every other row" tints with the kit's band colour
  const gridAttr = b.grid ? '' : undefined
  const rowLines = rowLinesOf(b)   // (S44T — row 363) none · between rows · under every row
  const ruledAttr = !b.grid && rowLines !== 'none' ? '' : undefined
  const widths = cols.map((c) => (c.key === 'item' ? null : mm(c.width)))
  const colgroup = <colgroup>{cols.map((c, i) => <col key={c.key} style={widths[i] !== null ? { width: widths[i]! } : undefined} />)}</colgroup>
  const table = (rows: ReactNode, extra?: string) => (
    <table className={`${styles.t}${extra ? ` ${extra}` : ''}`} data-grid={gridAttr} data-ruled={ruledAttr} style={{ ...cellStyle, ['--ink' as string]: ink, ['--light' as string]: light, ['--pad' as string]: pad, ['--pad-y' as string]: pad.split(' ')[0], ['--zebra' as string]: zebra }}>{colgroup}<tbody>{rows}</tbody></table>
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
  /* The heading band's fill and ink — a highlight's colour first (REG-556), then the band's own. */
  const bandInk = (hl?: string | null): { bg: string | undefined; fg: string } => {
    const style = b.bandStyle
    const h = hlStyle(hl)
    const bg = h?.background ? String(h.background) : style === 'grey' ? resolveColor('band', brand) : style === 'accent' ? resolveColor('accent', brand) : style === 'black' ? '#000' : undefined
    const fg = h?.color ? String(h.color) : style === 'black' || style === 'accent' ? '#fff' : ink
    return { bg, fg }
  }
  /* (S44T — M2, rows 253 · 276) The sub-total rows' own text style, when the template sets one; unset, they print as they always did. */
  const subCss: CSSProperties | null = b.subtotalStyle ? (({ textAlign: _a, color, ...rest }) => (b.subtotalStyle?.color ? { ...rest, color } : rest))(textCss(subtotalStyleOf(b), brand, 'table')) : null
  /* (S44T — call C4, UAT rows 302 · 306) With the # column printing first, a section's mark stands in the # column — its width, its alignment
     and its colour — and its name starts where the lines' names start; without it, the band reads "A  Name" across as it always did. */
  const noFirst = cols[0]?.key === 'no' && cols.length > 1 ? cols[0] : null
  const bandRow = (label: string, key: string, tone: 'section' | 'optional' = 'section', hl?: string | null, amount?: ReactNode, mark = '') => {
    const last_ = cols.length - 1
    const noCol = noFirst && cols.length - 1 - (amount && last_ > 0 ? 1 : 0) >= 1 ? noFirst : null   // a name needs a column of its own
    const style = b.bandStyle
    const { bg, fg } = bandInk(hl)
    const nameCss = { ...textCss({ ...b.areaStyle, weight: 700, underline: style === 'underlined' || style === 'inline' || style === 'grey' }, brand, 'table'), color: fg }
    const text = <span style={nameCss}>{noCol || !mark ? label : `${mark}  ${label}`}</span>
    const markText = noCol && mark ? <span style={{ ...nameCss, color: hlStyle(hl)?.color ? fg : noCol.color ? resolveColor(noCol.color, brand) : fg }}>{mark}</span> : null
    const last = cols.length - 1
    const amountCss: CSSProperties = { fontWeight: subCss?.fontWeight ?? 700 }
    if (style === 'inline') return table(<tr key={key} data-band>{cols.map((c, i) => cell(c, c.key === 'no' && noCol ? markText : i === (cols.findIndex((x) => x.key === 'item')) ? text : amount && i === last && last > 0 ? <span style={amountCss}>{amount}</span> : null, { padding: bandPad }))}</tr>)
    const tone_ = tone === 'optional' ? styles.optional : undefined
    const band: CSSProperties = { background: bg, color: fg, padding: bandPad }
    const head = noCol ? <td data-band-mark style={{ ...band, textAlign: noCol.align }}>{markText}</td> : null
    const nameSpan = span - (noCol ? 1 : 0) - (amount && last > 0 ? 1 : 0)
    /* (REG-617, parity Q-21) The section's sub-total in its band: the label across, the amount in the last column's place. */
    if (amount && last > 0) return table(<tr key={key} data-band>{head}<td colSpan={nameSpan} style={band}>{text}</td><td data-band-amount style={{ ...band, textAlign: cols[last]!.align, ...amountCss }}>{amount}</td></tr>, tone_)
    return table(<tr key={key} data-band>{head}<td colSpan={nameSpan} style={band}>{text}</td></tr>, tone_)
  }
  const inset = mm(cols[0]?.key === 'no' ? cols[0].width : 0) + 4
  /* (REG-557) A formatted note prints its paragraphs and lists; a plain one its text. */
  /* (S44T — UAT row 270) Under the Item column only, when the template says so; (row 329) inside the heading's band — its fill and ink.
     (call C2) a kit colour in the note prints as the kit's. */
  const itemAt = cols.findIndex((c) => c.key === 'item')
  const noteRow = (note: string, key: string, noteHtml?: string | null, inBand?: { bg: string | undefined; fg: string }) => {
    const css: CSSProperties = { ...textCss(b.groupNoteStyle, brand, 'table'), ...(inBand ? { color: inBand.fg, background: inBand.bg } : {}) }
    const fill: CSSProperties | undefined = inBand ? { background: inBand.bg } : undefined
    const body = noteHtml ? <div className={styles.rich} dangerouslySetInnerHTML={html(kitHtml(noteHtml, brand), values)} /> : resolveFields(note, values)
    if (b.noteWidth === 'item' && itemAt >= 0 && span > 1) return table(<tr key={key} data-note>{itemAt > 0 ? <td colSpan={itemAt} style={fill} /> : null}<td style={css}>{body}</td>{span - itemAt - 1 > 0 ? <td colSpan={span - itemAt - 1} style={fill} /> : null}</tr>)
    return table(<tr key={key} data-note><td colSpan={span} style={{ ...css, paddingLeft: inset }}>{body}</td></tr>)
  }
  /* A room label under a section — or (REG-558) a sub-section's own row: numbered in the nested mode, highlighted like its lines. */
  /* (S44I — M17) a sub-section that prints a word: the word in the last column's place */
  const areaRow = (label: string, key: string, no = '', hl?: string | null, word?: string | null) => {
    const w = word && span > 1 ? 1 : 0
    const wordTd = w ? <td data-area-word style={{ ...textCss(b.areaStyle, brand, 'table'), ...hlStyle(hl), textAlign: cols[cols.length - 1]!.align }}><span className={styles.foc}>{word}</span></td> : null
    return table(<tr key={key} data-area>{no && cols[0]?.key === 'no' ? <><td style={{ ...textCss(b.areaStyle, brand, 'table'), ...(cols[0].color ? { color: resolveColor(cols[0].color, brand) } : {}), ...hlStyle(hl), textAlign: cols[0].align }}>{no}</td><td colSpan={span - 1 - w} style={{ ...textCss(b.areaStyle, brand, 'table'), ...hlStyle(hl) }}>{label}</td>{wordTd}</> : <><td colSpan={span - w} style={{ ...textCss(b.areaStyle, brand, 'table'), ...hlStyle(hl), paddingLeft: inset }}>{label}</td>{wordTd}</>}</tr>)
  }
  /* `shade` (Dane UAT, b-zebra): every other line of a section wears the band colour while the block's "Shade every other row" is on —
     section, room and note rows never count, and a highlight's fill still wins over it. */
  /* `splitHead` (S44T — UAT row 293): the line's description runs on in the rows after it, so no rule under this one. */
  const lineRow = (l: Line, no: string, key: string, hideAmount0: boolean, shade = false, splitHead = false) => {
    const hideAmount = hideAmount0 || !!l.underWord   // (S44I — M17) a line under a section's word prints no amounts
    const plain = l.descriptionHtml ? htmlToPlain(l.descriptionHtml) : l.description
    /* (S44T — M3's print half, UAT row 275) "Every line" keeps a blank line typed between two as a line of space; bullets stay tight (their
       spacing is the Descriptions style's Line height). */
    const descLines = descriptions === 'none' || !plain ? [] : descriptions === 'first' ? [plain.split('\n')[0]!] : descriptions === 'full' ? trimBlank(plain.split('\n')).map((d) => d.trim() ? d : '\u00a0') : plain.split('\n').filter(Boolean)
    /* (REG-557) A formatted description prints its own shape (lists, bold, underline) unless the template asks for the first line only.
       (S44T — call C2) …and its brand-kit colours. */
    const richDesc = descriptions !== 'none' && descriptions !== 'first' && l.descriptionHtml ? kitHtml(l.descriptionHtml, brand) : null
    const total = l.noPrice ? 0 : lineTotalMinor(l)
    const word = printsWord(l)   // (REG-555) the word stands where the amount would; "On behalf" keeps the amount
    const hl = hlStyle(l.highlight)   // (REG-556)
    /* (REG-595) A revision's marks: a removed line struck through in the kit's red, a new one marked, a changed figure with the old one struck beside it.
       (S44F — NB-01) "Every version": each mark from the line's history, in its version's colour and named by its version — a line removed two
       versions ago stays struck, a line added in version 2 still says so, a changed line strikes what it was when it came in. */
    const removed = view.changes && l.change === 'removed'
    const h = every ? l.history ?? null : null
    const addedIn = every ? h?.addedIn ?? null : null
    const changedIn = every && h?.changedIn?.length ? h.changedIn[h.changedIn.length - 1]! : null
    const removedIn = every && removed ? h?.removedIn ?? data.quote.version : null
    const added = every ? !!addedIn && !removed : view.changes && l.change === 'added'
    const was = every ? (changedIn && !removed ? h?.first ?? null : null) : view.changes && l.change === 'changed' ? l.was ?? null : null
    const markInk = (v: number | null) => (v ? resolveColor(versionInk(v), brand) : undefined)
    const st: CSSProperties | undefined = removed ? { ...hl, color: every ? markInk(removedIn) : resolveColor('red', brand), textDecoration: 'line-through' } : hl
    const wasInk: CSSProperties | undefined = every && changedIn ? { color: markInk(changedIn) } : undefined
    const strike = (m: number) => <span className={styles.was} style={wasInk}>{money(m, false, false)}</span>
    /* the marks' words after the name: "New" (as always) — or, every version, "New in v2" · "Changed in v3" · "Removed in v3" in their colours */
    const tags = every
      ? <>{added && addedIn ? <span className={styles.newMark} data-version-mark={addedIn} style={{ ['--mark' as string]: markInk(addedIn) }}>New in v{addedIn}</span> : null}{changedIn && !removed ? <span className={styles.newMark} data-version-mark={changedIn} style={{ ['--mark' as string]: markInk(changedIn) }}>Changed in v{changedIn}</span> : null}{removedIn ? <span className={styles.newMark} data-version-mark={removedIn} style={{ ['--mark' as string]: markInk(removedIn) }}>Removed in v{removedIn}</span> : null}</>
      : added ? <span className={styles.newMark}>New</span> : null
    const amount = (minor: number, zeroText: boolean) => (word ? wordCell(l) : l.printAs === 'behalf' ? <>{money(minor, l.noPrice, zeroText)}<div style={{ ...textCss(b.descriptionStyle, brand, 'small'), textAlign: 'right' }}>on behalf</div></> : money(minor, l.noPrice, zeroText))
    return table(
      <tr key={key} data-line data-line-id={l.id} data-split={splitHead || undefined} data-shade={shade || undefined} data-removed={removed || undefined} data-added={added || undefined}>
        {cols.map((c) => {
          switch (c.key) {
            case 'no': return cell(c, l.noNumber ? '' : no, st)
            case 'item': return cell(c, (
              <div className={styles.item} data-photo={photos && l.thumb ? '' : undefined}>
                {photos && l.thumb ? <img className={styles.thumb} src={l.thumb} alt="" /> : null}
                <div>
                  <div>{l.nameHtml ? <span className={styles.nameRich} dangerouslySetInnerHTML={{ __html: kitHtml(sanitizeContractHtml(l.nameHtml), brand) }} /> : l.name}{tags}</div>
                  {was && was.name !== l.name ? <div className={styles.was} style={{ ...textCss(b.descriptionStyle, brand, 'small'), ...wasInk }}>{was.name}</div> : null}
                  {richDesc ? <div className={styles.rich} style={textCss(b.descriptionStyle, brand, 'small')} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(richDesc) }} />
                    : descLines.map((d, i) => <div key={i} style={textCss(b.descriptionStyle, brand, 'small')}>{descriptions === 'bullets' && !d.startsWith('• ') ? `• ${d}` : d}</div>)}
                </div>
              </div>
            ), st)
            case 'qty': return cell(c, <>{was && was.qty !== l.qty ? <span className={styles.was} style={wasInk}>{String(was.qty)}</span> : null}{l.qty ? String(l.qty) : zeroQty}</>, st)   /* (S44T — row 324) a zero quantity: nothing, or a dash */
            case 'unit': return cell(c, l.unit ?? '', st)
            case 'qtyUnit': { const qu = (n: number) => (!n && zeroQty ? zeroQty : n && l.unit ? `${n} ${l.unit}` : l.unit ?? (n > 1 ? String(n) : '')); return cell(c, <>{was && was.qty !== l.qty ? <span className={styles.was} style={wasInk}>{qu(was.qty)}</span> : null}{qu(l.qty)}</>, st) }   /* (REG-595) the old quantity struck before the new */
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
      {cols.length > 1 ? <td colSpan={cols.length - 1} style={{ ...subCss, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: subCss?.fontWeight ?? (strong ? 700 : 400) }}>{label}</td> : null}
      {cell(cols[cols.length - 1]!, cols.length > 1 ? money(minor, false, false) : <span className={styles.amt}><span style={{ fontWeight: subCss?.fontWeight ?? (strong ? 700 : 400) }}>{label}</span>{money(minor, false, false)}</span>, subCss ?? undefined)}
    </tr>,
  )
  /* (S44T — UAT row 293) A description that runs on: the item column alone, the rest of the row empty — the last piece draws the row's rule. */
  const contRow = (l: Line, piece: DescPiece, key: string, shade: boolean, last: boolean) => table(
    <tr key={key} data-line-cont={l.id} data-line-end={last || undefined} data-shade={shade || undefined}>
      {cols.map((c) => cell(c, c.key === 'item' ? (
        <div className={styles.item} data-photo={photos && l.thumb ? '' : undefined}>
          {photos && l.thumb ? <span className={styles.thumbGap} aria-hidden /> : null}
          <div>{piece.html ? <div className={styles.rich} style={textCss(b.descriptionStyle, brand, 'small')} dangerouslySetInnerHTML={{ __html: printedLinks(kitHtml(sanitizeContractHtml(piece.html), brand)) }} /> : <div style={textCss(b.descriptionStyle, brand, 'small')}>{descriptions === 'bullets' && piece.text && !piece.text.startsWith('• ') ? `• ${piece.text}` : piece.text}</div>}</div>
        </div>
      ) : null, hlStyle(l.highlight)))}
    </tr>,
  )

  const { main, optional, after } = sections(b, data.items, view, data.studio.tradeNotes ?? {}, optCol, data.sums?.print, data.quote.version)   // (S44F — NB-03 · NB-01)
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
  /* (S44F — NB-03) a page's total is the sum of the lines on it: it prints only while the lines print their prices — under one amount per
     section or the total only it would give away what the view keeps back (and a client page has no line prices to add) */
  tables[tid] = { head, filler, pageTotal, fillPage: b.fillPage, pageTotals: b.pageTotals && view.amounts === 'lines', keepGroups: b.keepGroups }

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
  /* (S44T — M1, rows 252 · 257 · 265 · 266 · 267 · 303) The table's own spacing, in mm; every knob unset prints as before. */
  const sp = (k: ItemsSpaceKey): number | undefined => { const v = b.spacing?.[k]; return typeof v === 'number' && v > 0 ? mm(v) : undefined }
  const noteInBand = !!b.noteInBand && (b.bandStyle === 'grey' || b.bandStyle === 'accent' || b.bandStyle === 'black')   // (row 329) a band to sit in
  const markOf = (si: number) => (b.sectionLabel === 'letters' ? LETTERS[si % 26]! : b.sectionLabel === 'numbers' || nested || roman ? String(si + 1) : '')
  let prevLine = false   // the slice before was a line — (M1) "Between lines" goes before the next one
  /* `later` (S44T — call C1): the sections priced after the contract — numbered on from the main ones, out of the page totals. */
  const emit = (list: Section[], from: number, later: boolean) => list.forEach((s, k) => {
    const si = from + k
    const first = out.length
    const label = s.label
    const gk = s.id
    const subWord = s.subLabel ? ` (${s.subLabel})` : ''
    const onlyOptional = s.lines.length > 0 && s.lines.every((l) => l.optional)   // a section of optional lines only has nothing to sum
    const inBand = view.amounts === 'lines' && b.subtotals && !!s.label && subAt !== 'row' && !onlyOptional
    /* (S44I — M17) a section that prints a word: the word in the band's amount place, sub-totals on or off (not while only the total prints) */
    const bandAmount = s.word ? (view.amounts !== 'total' ? <span className={styles.amt}><span /><span className={styles.foc}>{s.word}</span></span> : undefined)
      : inBand ? <>{money(s.totalMinor, false, false)}{subWord ? <div style={{ fontWeight: 400 }}>{subWord.trim()}</div> : null}</> : undefined
    const hasNote = !!(s.note || s.noteHtml)
    if (s.label) push({ key: `${tid}:${s.id}:band`, node: bandRow(label, `${s.id}-band`, 'section', s.highlight, bandAmount, markOf(si)), groupKey: gk, groupStart: true, keepWithNext: true, breakBefore: b.groupNewPage && si > 0, padBottom: noteInBand && hasNote ? undefined : sp('underHeading') })
    if (hasNote) push({ key: `${tid}:${s.id}:note`, node: noteRow(s.note ?? '', `${s.id}-note`, s.noteHtml, noteInBand && s.label ? bandInk(s.highlight) : undefined), groupKey: gk, keepWithNext: true, padBottom: noteInBand && s.label ? sp('underNote') ?? sp('underHeading') : sp('underNote') })
    prevLine = false
    if (b.numbering === 'group' || lettered || nested || levelTwo) counter = 0
    const areas = s.areas.length ? s.areas : [{ label: '', lines: s.lines }]
    let subCounter = 0
    let shaded = 0   // the section's lines so far, for the zebra
    const levelTwoMark = (k: number) => (rooms ? (numbersMarked ? `${si + 1}.${k}` : String(k)) : LETTERS[(k - 1) % 26]!.toLowerCase())
    areas.forEach((a, ai) => {
      // A sub-section in the nested mode takes the section's next number ("1.3") and letters its lines (a, b, c).
      const areaNo = levelTwo && a.label ? levelTwoMark(++counter) : ''
      const subNo = a.sub && nested ? `${si + 1}.${++counter}` : areaNo
      /* (M1, Dyel's rule) a sub-section straight after its section's heading or note takes no space before it */
      if (a.label) { push({ key: `${tid}:${s.id}:a${ai}`, node: areaRow(a.label, `${s.id}-a${ai}`, subNo, a.highlight, view.amounts !== 'total' ? a.word : null), groupKey: gk, keepWithNext: true, padTop: ai > 0 ? sp('beforeSub') : undefined }); prevLine = false }
      if (a.sub && (a.note || a.noteHtml)) { push({ key: `${tid}:${s.id}:a${ai}:note`, node: noteRow(a.note ?? '', `${s.id}-a${ai}-note`, a.noteHtml), groupKey: gk, keepWithNext: true, padBottom: sp('underNote') }); prevLine = false }
      if (b.numbering === 'area') counter = 0
      if (a.sub || areaNo) subCounter = 0
      a.lines.forEach((l) => {
        let no = ''
        if (!l.noNumber) {   // (REG-558) a "no number" line is passed over
          if (nested) { if (a.sub) { subCounter += 1; no = LETTERS[(subCounter - 1) % 26]!.toLowerCase() } else { counter += 1; no = `${si + 1}.${counter}` } }
          else if (levelTwo) { if (areaNo) { subCounter += 1; no = rooms ? `${areaNo}.${subCounter}` : toRoman(subCounter) } else no = levelTwoMark(++counter) }
          else { counter += 1; no = b.numbering === 'none' ? '' : lettered ? `${LETTERS[si % 26]}${counter}` : String(counter) }
        }
        pushLine(l, no, gk, b.zebra && shaded++ % 2 === 1, later || l.noPrice || printsWord(l) || l.change === 'removed' || l.optional ? 0 : lineTotalMinor(l))
      })
    })
    const subLabel = s.subLabel ? ` (${s.subLabel})` : ''   // (REG-555, T-3) "Sub-total for Masonry (Approximate)"
    if (onlyOptional) { /* no sub-total or lump sum for a section of optional lines */ }
    else if (s.word) { /* (S44I — M17) a section that prints a word has no sum to print — its band says the word */ }
    else if (view.amounts === 'sections') push({ key: `${tid}:${s.id}:lump`, node: sumRow(`Lump sum${subLabel}`, s.totalMinor, `${s.id}-lump`), groupKey: gk })
    else if (view.amounts === 'lines' && b.subtotals && s.label && subAt !== 'band') push({ key: `${tid}:${s.id}:sub`, node: sumRow(`${b.subtotalLabel.replace('{section}', s.label)}${subLabel}`, s.totalMinor, `${s.id}-sub`), groupKey: gk })
    prevLine = false
    /* (M1) "Before a section" on the section's first row, whatever it is — its band, or the first of lines in no section; the estimates'
       title already stands apart from their first section */
    if ((later ? k > 0 : si > 0) && out.length > first) { const top = sp('beforeSection'); if (top) out[first] = { ...out[first]!, padTop: (out[first]!.padTop ?? 0) + top } }
  })
  /* One line's slice — or (S44T — UAT row 293) a line taller than a page: its first piece of description with the line, then a slice per
     further piece, so a page can break inside it and nothing is cut off. `split` holds the lines the document measured too tall. */
  function pushLine(l: Line, no: string, gk: string, shade: boolean, amountMinor: number, key = `${tid}:${l.id}`, rowKey = l.id) {
    const pieces = descPieces(l, descriptions)
    const padTop = prevLine ? sp('betweenLines') : undefined
    prevLine = true
    if (pieces.length > 1 && split?.has(l.id)) {
      const head = { ...l, description: pieces[0]!.text ?? null, descriptionHtml: pieces[0]!.html ?? null }
      push({ key, node: lineRow(head, no, rowKey, hideAmount, shade, true), groupKey: gk, amountMinor, padTop })
      pieces.slice(1).forEach((pc, j) => push({ key: `${key}:d${j + 1}`, node: contRow(l, pc, `${rowKey}-d${j + 1}`, shade, j === pieces.length - 2), groupKey: gk }))
      return
    }
    push({ key, node: lineRow(l, no, rowKey, hideAmount, shade), groupKey: gk, amountMinor, padTop, splitLine: pieces.length > 1 ? l.id : undefined })
  }
  emit(main, 0, false)
  if (optional.length && b.optionalSection && view.optionalWorks) {
    push({ key: `${tid}:opt:band`, node: bandRow(b.optionalTitle, 'opt-band', 'optional'), groupKey: 'optional', groupStart: true, keepWithNext: true, padTop: main.length ? sp('beforeSection') : undefined })
    prevLine = false
    optional.forEach((l, i) => pushLine(l, String(i + 1), 'optional', b.zebra && i % 2 === 1, 0, `${tid}:opt:${l.id}`, `opt-${l.id}`))
  }
  /* (S44T — call C1, UAT rows 277 · 278 · 280 · 281 · 317 · 318) The work priced after the contract: its own part after the items — a title, the
     sections lettered on from the main ones (L → M), their lines and sub-totals as the template prints them, and their own total. Never in the
     quote's total, the payment schedule or a page's total. */
  if (after.length) {
    /* the part's title reads as a heading over its sections — the column headings' words with a rule under them — never as one more band */
    const partCss: CSSProperties = { ...headStyle, textAlign: 'left', padding: pad, borderBottom: `1px solid ${ink}`, color: b.headerRow === 'black' ? ink : headStyle.color }
    push({ key: `${tid}:later:band`, node: table(<tr key="later-band" data-part><td colSpan={span} style={partCss}>{b.afterTitle?.trim() || AFTER_TITLE}</td></tr>), groupKey: 'later', groupStart: true, keepWithNext: true, padTop: sp('beforeSection') ?? mm(4) })
    prevLine = false
    emit(after, main.reduce((n, x, i) => (x.label ? i + 1 : n), 0), true)   // lettered on from the last section the print marked
    push({ key: `${tid}:later:total`, node: sumRow('Estimated total', after.reduce((sum, x) => sum + x.totalMinor, 0), 'later-total'), groupKey: 'later' })   // (invented copy)
  }
  /* (S44T — UAT row 363) "Between rows": the table's last row carries no rule under it. */
  const lastAt = out.length - 1
  if (rowLines === 'between' && out[lastAt]?.tableId === tid && !out[lastAt]!.isHead) out[lastAt] = { ...out[lastAt]!, node: <div data-last-row>{out[lastAt]!.node as ReactNode}</div> }
  /* (S44F — NB-01) Every version's marks end the table with their key: each version that left a mark here or on the schedule, in its colour. */
  if (every) {
    const printed = [...main, ...after].flatMap((x) => x.lines).concat(b.optionalSection && view.optionalWorks ? optional : [])
    const marks = new Set<number>()
    const take = (x: { change?: string; history?: { addedIn?: number; changedIn?: number[]; removedIn?: number } }) => { const hh = x.history; if (!hh) return; if (x.change === 'removed') { if (hh.removedIn) marks.add(hh.removedIn); return } if (hh.addedIn) marks.add(hh.addedIn); if (hh.changedIn?.length) marks.add(hh.changedIn[hh.changedIn.length - 1]!) }
    printed.forEach(take)
    if (view.paymentSchedule && data.quote.kind !== 'variation' && design.blocks.some((x) => x.kind === 'payments' && !x.hidden)) data.payments.filter((x) => x.change !== 'removed' || showsRemoved(x, view, data.quote.version)).forEach(take)
    const versions = [...marks].sort((a, z) => a - z)
    const keyCss = textCss({ role: 'small', color: 'grey' }, brand)
    if (versions.length) out.push({ key: `${tid}:versions`, blockId: b.id, padTop: mm(2), node: (
      <div className={styles.versionKey} data-version-key style={keyCss}>
        <span>Changes by version</span>
        {versions.map((v) => <span key={v} className={styles.versionKeyItem}><span className={styles.versionSwatch} style={{ ['--mark' as string]: resolveColor(versionInk(v), brand) }} aria-hidden />Version {v}</span>)}
      </div>
    ) })
  }
}

/* (S44T — UAT row 293) A description as the pieces a page may break between: each paragraph, list line or (plain) line. */
type DescPiece = { html?: string; text?: string }
/** A description's lines with the blank ones at its start and end dropped (the ones between stay). */
const trimBlank = (ls: string[]) => { let a = 0, z = ls.length; while (a < z && !ls[a]!.trim()) a++; while (z > a && !ls[z - 1]!.trim()) z--; return ls.slice(a, z) }
function descPieces(l: DocItem, descriptions: ItemsBlock['descriptions']): DescPiece[] {
  if (descriptions === 'none' || descriptions === 'first') return []
  if (l.descriptionHtml) {
    const out: DescPiece[] = []
    const h = l.descriptionHtml
    const re = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>|<(p|div|h[1-4]|blockquote)\b[^>]*>[\s\S]*?<\/\3>/gi
    let last = 0
    for (const m of h.matchAll(re)) {
      const gap = h.slice(last, m.index).trim(); if (gap) out.push({ html: gap })
      last = (m.index ?? 0) + m[0].length
      if (m[1]) { let n = 0; for (const li of (m[2] ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) { n++; out.push({ html: m[1].toLowerCase() === 'ol' ? `<p>${n}.&nbsp;${li[1] ?? ''}</p>` : `<ul>${li[0]}</ul>` }) } }
      else out.push({ html: m[0] })
    }
    const tail = h.slice(last).trim(); if (tail) out.push({ html: tail })
    return out
  }
  const plain = l.description ?? ''
  return descriptions === 'full' ? trimBlank(plain.split('\n')).map((t) => ({ text: t.trim() ? t : '\u00a0' })) : plain.split('\n').filter(Boolean).map((t) => ({ text: t }))
}

/* ── the other flow blocks ── */
function totalsNode(b: TotalsBlock, ctx: RenderCtx, view: ClientView, t: DocTotals): SliceNode {
  const { brand, data, values } = ctx
  const style = textCss(b.style, brand)
  const totalStyle = textCss(b.totalStyle, brand)
  const ink = resolveColor('ink', brand)
  /* (S44T — M2, UAT rows 253 · 300) Money as the block's Currency says: "S$1,234.00" (unset, as always), "$" apart from the figure, or the
     figure alone. A discount keeps its minus with the figure. */
  const cur = b.currency ?? 'S$'
  const m = (minor: number) => { const x = moneyText(minor, cur); return x.figure }
  const shown = (v: string): ReactNode => (cur === '$ ' ? <span className={styles.amt}><span>$</span><span>{v}</span></span> : v)
  return function totalsRows(pc: PageCtx) {
    const rows: { label: string; value: string; strong?: boolean }[] = []
    for (const l of b.lines) {
      if (!l.on) continue
      if (!view.subtotalBreakdown && l.key !== 'total') continue
      const label = variationTotalsLabel(l.key, resolveFields(l.label, values), values)   // (fix-D, D-08) "Change to the contract" on a variation order
      switch (l.key) {
        case 'pages': if (view.amounts === 'lines') pc.pageTotals.forEach((v, i) => rows.push({ label: label.replace('{n}', String(i + 1)), value: m(v) })); break   // (S44F — NB-03) a page's sum only while the lines print their prices
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
      <div className={styles.totals} data-layout={b.layout} data-rules={b.rules} data-apart={cur === '$ ' || undefined} style={{ width: b.layout === 'right' ? mm(b.width) : undefined, ['--ink' as string]: ink }}>
        {rows.map((r, i) => (
          <div key={i} className={styles.totRow} data-strong={r.strong || undefined} style={r.strong ? totalStyle : style}>
            <span>{r.label}</span><span>{shown(r.value)}</span>
          </div>
        ))}
      </div>
    )
  }
}

/** 1st · 2nd · 3rd · 4th … 11th · 12th · 13th · 21st (REG-618, parity Q-16). */
const ordinal = (n: number) => { const t = n % 100; const s = t >= 11 && t <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'; return `${n}${s}` }
/** A milestone's mark: 1 · A · 1st (REG-618, parity Q-16) or (S44T — UAT row 354) (a). */
const payMark = (b: Pick<PaymentsBlock, 'parens' | 'ordinals' | 'letters'>, i: number) => (b.parens ? `(${LETTERS[i % 26]!.toLowerCase()})` : b.ordinals ? ordinal(i + 1) : b.letters ? LETTERS[i % 26]! : String(i + 1))

function paymentsNode(b: PaymentsBlock, ctx: RenderCtx, view: ClientView): ReactNode {
  const { brand, data, values } = ctx
  const marked = b.letters || b.ordinals || b.parens   // the list and the cards print a mark only when it is more than a count
  /* (S44T — M6, UAT rows 355 · 310) Where the share prints — before the words (as always), in a column of its own, or not at all — and a
     fixed row's own word in its place. */
  const pctAt = b.pctAt === 'column' && b.layout !== 'table' ? 'inline' : b.pctAt ?? 'inline'
  const share = (p: (typeof data.payments)[number]) => (p.fixed ? fixedWord(p) : `${p.pct}%`)
  const foot = b.footnote?.trim() ? <div className={styles.payFoot} style={textCss({ role: 'small', color: 'grey' }, brand)}>{resolveFields(b.footnote, values)}</div> : null
  const style = textCss(b.style, brand)
  const titleStyle = textCss(b.titleStyle, brand)
  const ink = resolveColor('ink', brand)
  const title = b.title ? <div className={styles.payTitle} data-band={b.band || undefined} style={{ ...titleStyle, background: b.band ? '#000' : undefined }}>{resolveFields(b.title, values)}</div> : null
  /* (S44F — NB-02 (a)) On a revision the schedule's changes print as the lines' do: a removed milestone struck in its place (no mark, out of the
     total), a new one marked, a changed share, fee, amount or words with the old one struck before it — since the last version, or every
     version in its colour. Without changes shown, the schedule prints as it always did. */
  const rows = data.payments.filter((p) => showsRemoved(p, view, data.quote.version))
  const live = rows.filter((p) => p.change !== 'removed')
  const every = view.changes && view.changesSince === 'all'
  const marks: string[] = []
  { let n = 0; for (const p of rows) marks.push(p.change === 'removed' ? '' : payMark(b, n++)) }
  const mark = (i: number) => marks[i] ?? ''
  const rev = (p: (typeof rows)[number]) => {
    const h = every ? p.history ?? null : null
    const removed = view.changes && p.change === 'removed'
    const removedIn = every && removed ? h?.removedIn ?? data.quote.version : null
    const addedIn = every ? h?.addedIn ?? null : null
    const changedIn = every && h?.changedIn?.length ? h.changedIn[h.changedIn.length - 1]! : null
    const added = every ? !!addedIn && !removed : view.changes && p.change === 'added'
    const was = every ? (changedIn && !removed ? h?.first ?? null : null) : view.changes && p.change === 'changed' ? p.was ?? null : null
    const inkOf = (v: number | null) => (v ? resolveColor(versionInk(v), brand) : undefined)
    const rowCss: CSSProperties | undefined = removed ? { color: every ? inkOf(removedIn) : resolveColor('red', brand) } : undefined
    const wasCss: CSSProperties | undefined = every && changedIn ? { color: inkOf(changedIn) } : undefined
    const tag = every
      ? <>{added && addedIn ? <span className={styles.newMark} data-version-mark={addedIn} style={{ ['--mark' as string]: inkOf(addedIn) }}>New in v{addedIn}</span> : null}{changedIn && !removed ? <span className={styles.newMark} data-version-mark={changedIn} style={{ ['--mark' as string]: inkOf(changedIn) }}>Changed in v{changedIn}</span> : null}{removedIn ? <span className={styles.newMark} data-version-mark={removedIn} style={{ ['--mark' as string]: inkOf(removedIn) }}>Removed in v{removedIn}</span> : null}</>
      : added ? <span className={styles.newMark}>New</span> : null
    const words = p.description || p.name
    const oldWords = was && was.label !== words ? <span className={styles.was} style={wasCss}>{was.label}</span> : null
    const oldShare = was && !p.fixed && !was.fixed && was.pct !== p.pct ? <span className={styles.was} style={wasCss}>{was.pct}%</span> : null
    const oldAmount = (fmt: (minor: number) => ReactNode) => (was && was.amountMinor !== p.amountMinor ? <span className={styles.was} style={wasCss}>{fmt(was.amountMinor)}</span> : null)
    return { removed, rowCss, tag, words, oldWords, oldShare, oldAmount }
  }
  const struck = (r: ReturnType<typeof rev>, node: ReactNode) => (r.removed ? <span className={styles.payRemoved}>{node}</span> : node)
  const cur = b.currency ?? 'S$'   // (S44T — M2) the block's own Currency; unset = "S$1,234.00", as always
  const m = (minor: number): ReactNode => { const x = moneyText(minor, cur); return cur === '$ ' ? <span className={styles.amt}><span>{x.sign}</span><span>{x.figure}</span></span> : x.figure }
  const mText = (minor: number) => { const x = moneyText(minor, cur); return cur === '$ ' ? `$ ${x.figure}` : x.figure }
  /* (S44T — call C5, UAT row 294) The issuing entity's PayNow QR beside the schedule, as Bank details prints it beside the bank rows. */
  const qrSrc = b.qr ? docEntity(data)?.payNowQr ?? null : null
  const withQr = (schedule: ReactNode) => (qrSrc ? <div className={styles.payWithQr}><div className={styles.payMain}>{schedule}</div><img src={qrSrc} alt="PayNow QR" data-pay-qr style={{ width: mm(b.qrWidth ?? 26), height: mm(b.qrWidth ?? 26), objectFit: 'contain', flex: '0 0 auto' }} /></div> : schedule)
  if (!rows.length) return <div style={style}>{title}<div className={styles.muted}>No payment schedule on this quote.</div>{foot}</div>
  /* (REG-560) The Total line under the milestones — the sum of the amounts, and the percentages' sum — unless the template hides it. */
  const totalMinor = live.reduce((s, p) => s + p.amountMinor, 0), totalPct = live.reduce((s, p) => s + (p.fixed ? 0 : p.pct), 0)   // (S44T) a fixed fee has no share to add · (S44F) a removed milestone never counts
  const totalWords = [pctAt !== 'none' ? `${totalPct}%` : '', b.showAmounts ? mText(totalMinor) : ''].filter(Boolean).join(' · ')
  const totalLine = b.showTotal && totalWords ? <div className={styles.payTotal} style={{ borderTopColor: ink }}><span>Total</span><span>{totalWords}</span></div> : null
  if (b.layout === 'list') return (
    <div style={style}>{title}
      {withQr(<>
      <ol className={styles.payList} data-letters={marked || undefined}>
        {rows.map((p, i) => { const r = rev(p); return <li key={i} data-pay-change={p.change} style={r.rowCss}><span>{marked ? `${mark(i)}  ` : ''}{struck(r, <>{r.oldWords}{r.words}</>)}{pctAt !== 'none' ? <> - <b style={{ color: resolveColor('red', brand) }}>{r.oldShare}{struck(r, share(p))}</b></> : null}{b.showAmounts ? <> ({r.oldAmount(mText)}{struck(r, mText(p.amountMinor))})</> : ''}{b.showDue && p.due ? ` · ${p.due}` : ''}{r.tag}</span></li> })}
      </ol>
      {totalLine}
      </>)}
      {foot}
    </div>
  )
  if (b.layout === 'cards') return (
    <div style={style}>{title}
      {withQr(<>
      <div className={styles.payCards}>
        {rows.map((p, i) => { const r = rev(p); return <div key={i} className={styles.payCard} data-pay-change={p.change} style={{ borderColor: resolveColor('light', brand), ...r.rowCss }}><div className={styles.payPct}>{marked && mark(i) ? `${mark(i)} · ` : ''}{struck(r, p.name)}{pctAt !== 'none' ? <> · {r.oldShare}{struck(r, share(p))}</> : ''}{r.tag}</div>{b.showAmounts ? <div className={styles.payAmt}>{r.oldAmount(mText)}{struck(r, mText(p.amountMinor))}</div> : null}<div className={styles.muted}>{r.oldWords}{struck(r, p.description)}{b.showDue && p.due ? ` · ${p.due}` : ''}</div></div> })}
      </div>
      {totalLine}
      </>)}
      {foot}
    </div>
  )
  /* The table: mark · (share) · words · (due) · (amount). (S44T — UAT row 332) The Total row has a cell under every column, so with the
     amounts off its percentage stands where the shares stand — before, it took a cell of its own past the last column. */
  const showTotalRow = b.showTotal && (pctAt !== 'none' || b.showAmounts)
  return (
    <div style={style}>{title}
      {withQr(
      <table className={styles.t} data-grid={b.band ? '' : undefined} data-ruled={b.band ? undefined : ''} style={{ ['--ink' as string]: ink, ['--light' as string]: resolveColor('light', brand), ['--pad' as string]: ROW_PAD.normal }}>
        <tbody>
          {rows.map((p, i) => { const r = rev(p); return (
            <tr key={i} data-pay-change={p.change} style={r.rowCss}>
              <td style={{ width: mm(b.ordinals ? 10 : 8), textAlign: 'center' }}>{mark(i)}</td>
              {pctAt === 'column' ? <td data-pay-share style={{ width: mm(p.fixed || rows.some((x) => x.fixed) ? 22 : 14), textAlign: 'right' }}><b>{r.oldShare}{struck(r, share(p))}</b></td> : null}
              <td>{pctAt === 'inline' ? <><b>{r.oldShare}{struck(r, share(p))}</b> - </> : null}{r.oldWords}{struck(r, r.words)}{r.tag}</td>
              {b.showDue ? <td style={{ width: mm(28) }}>{p.due}</td> : null}
              {b.showAmounts ? <td style={{ width: mm(30), textAlign: 'right' }}>{r.oldAmount(m)}{struck(r, m(p.amountMinor))}</td> : null}
            </tr>
          ) })}
          {showTotalRow ? (
            <tr data-sum>
              <td />
              {pctAt === 'column' ? <td style={{ textAlign: 'right' }}>{totalPct}%</td> : null}
              <td>{pctAt === 'inline' && !b.showAmounts ? <><b>{totalPct}%</b> - </> : null}<b>Total</b></td>
              {b.showDue ? <td /> : null}
              {b.showAmounts ? <td style={{ textAlign: 'right' }}>{m(totalMinor)}</td> : null}
            </tr>
          ) : null}
        </tbody>
      </table>,
      )}
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

/* (S44Q — row 321, triage §12.15) The Terms and Notes print as written: each paragraph in its own tag (its alignment holds), a list's lines with
   their bullets or numbers (an ordered list counts on across a page break), a blank line as a line of space. A page still breaks between any two
   pieces. "Number the paragraphs" numbers the paragraphs with words — a list keeps its own marks, a blank line takes no number; a grid draws
   rows only, so a blank line there is no empty row. */
function textSourceSlices(b: TextSourceBlock, ctx: RenderCtx, out: Slice[]) {
  const { brand, data, values } = ctx
  const src = b.kind === 'terms' ? data.quote.termsHtml : data.quote.notesHtml
  const pieces = textPieces(src)
  while (pieces.length && pieces[0]!.kind === 'para' && !pieces[0]!.words) pieces.shift()   // nothing but space before the words
  while (pieces.length && pieces[pieces.length - 1]!.kind === 'para' && !(pieces[pieces.length - 1] as { words: boolean }).words) pieces.pop()
  if (!pieces.length) return
  const style = textCss(b.style, brand)
  const ink = resolveColor('ink', brand)
  if (b.title) out.push({ key: `${b.id}:title`, blockId: b.id, keepWithNext: true, node: <div className={styles.textTitle} style={textCss(b.titleStyle, brand)}>{resolveFields(b.title, values)}</div> })
  let no = 0
  pieces.forEach((p, i) => {
    const key = `${b.id}:p${i}`
    if (p.kind === 'item') {
      const li = <li style={p.align ? { textAlign: p.align as CSSProperties['textAlign'] } : undefined} dangerouslySetInnerHTML={html(p.html, values)} />
      out.push({ key, blockId: b.id, node: (
        <div className={styles.para} data-grid={b.grid ? '' : undefined} data-numbered={b.numbered ? '' : undefined} data-list={p.list} style={{ ...style, ['--ink' as string]: ink }}>
          {b.numbered ? <span className={styles.paraNo} aria-hidden /> : null}{/* numbered paragraphs: a list sits under their words, its own marks in their column */}
          {p.list === 'ol' ? <ol start={p.n}>{li}</ol> : <ul>{li}</ul>}
        </div>
      ) })
      return
    }
    if (!p.words) { if (!b.grid) out.push({ key, blockId: b.id, node: <div className={styles.para} data-blank style={style} aria-hidden>{'\u00a0'}</div> }); return }
    no++
    out.push({ key, blockId: b.id,
      node: <div className={styles.para} data-grid={b.grid ? '' : undefined} data-numbered={b.numbered ? '' : undefined} style={{ ...style, ['--ink' as string]: ink }}>{b.numbered ? <span className={styles.paraNo}>{no}</span> : null}<span dangerouslySetInnerHTML={html(p.html, values)} /></div>,
    })
  })
}

function detailsNode(b: DetailsBlock, ctx: RenderCtx): ReactNode {
  const { brand, values } = ctx
  /* (S44T — UAT rows 248 · 322, M5) A row's label or value in bold; the rows' lines — none, under the values (Form lines), or boxed cells. */
  const look = detailsLook(b)
  const kv = (rows: DetailsBlock['left']) => (
    <KvTable rows={rows} values={values} lines={look.lines} gap={1} labelWidth={b.labelWidth} valueCss={textCss(b.style, brand)} labelCss={textCss(b.labelStyle, brand)} ink={resolveColor('ink', brand)} />
  )
  if (look.layout === 'stacked') return <div>{kv([...b.left, ...b.right])}</div>
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

/** `split` (S44T — UAT row 293): the lines the document measured taller than a page — each prints its description across slices. */
export function buildSlices(design: TemplateDesign, ctx: RenderCtx, view: ClientView, totals: DocTotals, split?: ReadonlySet<string>): Built {
  const { brand, values } = ctx
  const out: Slice[] = []
  const tables: Record<string, TableExtras> = {}
  const blocks = design.blocks.filter((b) => !b.hidden && b.kind !== 'header' && b.kind !== 'footer' && b.kind !== 'cover')
  /* (gaps build B, items 7 · 14) a variation order says why it was made, and prints the studio's invoice paper: its header note before the
     lines, its terms block and footer note after everything — in the body's own text styles */
  const vo = ctx.data.quote.kind === 'variation' ? { reason: ctx.data.quote.changeReason ?? null, paper: ctx.data.quote.paper ?? null, days: ctx.data.quote.timelineDays ?? null } : null
  let voHead = !vo || (!vo.reason && !vo.paper?.header && !vo.days)
  const plain = (key: string, title: string | null, text: string): Slice => ({ key, blockId: key, node: (
    <div className={styles.textBlock} style={{ ...textCss(undefined, brand), whiteSpace: 'pre-line' }}>{title ? <div className={styles.textTitle} style={textCss({ role: 'body', weight: 700 }, brand)}>{title}</div> : null}{text}</div>
  ) })
  for (const b of blocks) {
    const start = out.length
    if (!voHead && b.kind === 'items' && vo) {
      voHead = true
      if (vo.reason) out.push(plain('vo:reason', 'Reason for the change', vo.reason))
      /* (parity map, SC-094) the days it adds to the schedule — 1.0's VO paper printed them (invented copy) */
      if (vo.days) out.push(plain('vo:days', null, `Adds ${vo.days} ${vo.days === 1 ? 'day' : 'days'} to the schedule`))
      if (vo.paper?.header) out.push(plain('vo:header', null, vo.paper.header))
    }
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
      case 'items': itemsSlices(b, design, ctx, view, out, tables, split); break
      case 'totals': out.push({ key: b.id, blockId: b.id, node: totalsNode(b, ctx, view, totals) }); break
      case 'payments': if (view.paymentSchedule && ctx.data.quote.kind !== 'variation') out.push({ key: b.id, blockId: b.id, node: paymentsNode(b, ctx, view) }); break   /* (Projects round 5) a variation order has no schedule of its own */
      case 'bank': { const node = bankNode(b, ctx); if (node) out.push({ key: b.id, blockId: b.id, node }); break }   /* (UX audit S1) an empty block leaves no slice — no gap on the client's page */
      case 'terms': if (view.terms) textSourceSlices(b, ctx, out); break
      case 'notes': if (view.notes) textSourceSlices(b, ctx, out); break
      case 'signature': if (view.signature) out.push({ key: b.id, blockId: b.id, node: <SignatureColumns columns={(b as SignatureBlock).columns} style={b.style} headingStyle={b.headingStyle} lineWeight={b.lineWeight} lineColor={b.lineColor} preamble={b.preamble} ctx={ctx} /> }); break
      /* (S44G — NB-08) a Text block's words print with their marks — bold, italic, underline, lists, links — and a run in a kit colour in the kit's colour as the kit has it today */
      case 'text': out.push({ key: b.id, blockId: b.id, node: <div className={styles.textBlock} data-box={b.box !== 'none' ? b.box : undefined} style={{ ...textCss(b.style, brand), ['--tint' as string]: resolveColor('band', brand), ['--ink' as string]: resolveColor('ink', brand) }} dangerouslySetInnerHTML={{ __html: kitHtml(html(b.html, values).__html, brand) }} /> }); break
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
  if (vo?.paper?.terms) out.push({ ...plain('vo:terms', vo.paper.termsTitle || 'Terms', vo.paper.terms), padTop: mm(4) })   // (gaps build B, item 14)
  if (vo?.paper?.acceptance) out.push({ ...plain('vo:acceptance', vo.paper.acceptance.title, `${vo.paper.acceptance.text}\n\nName ________   Signature ________   Date ________`), padTop: mm(4) })   // (parity map, MI-065) the acceptance block
  if (vo?.paper?.footer) out.push({ ...plain('vo:footer', null, vo.paper.footer), padTop: mm(3) })
  return { slices: out, tables }
}
