'use client'

import type { CSSProperties, ReactNode } from 'react'
import { mm, resolveColor, type DetailsBlock, type ItemsBlock, type ItemsColumn, type PaymentsBlock, type SignatureBlock, type TextSourceBlock, type TitleBlock, type TotalsBlock, type TemplateDesign } from '@/lib/templates/model'
import { resolveFields } from '@/lib/templates/fields'
import type { ClientView } from '@/lib/templates/client-view'
import type { DocItem, DocTotals } from '@/lib/templates/data'
import { lineTotalMinor, unitPriceMinor } from '@/lib/quotes/math'
import { UNLABELLED } from '@/lib/quotes/items-model'
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
const html = (h: string, values: Record<string, string>) => ({ __html: resolveFields(h, values) })

/** A stored HTML body as paragraphs (the rich editor writes <p>…</p>; a bare string is one paragraph). */
function paragraphs(h: string): string[] {
  const parts = h.split(/<\/p>|<\/li>|<br\s*\/?>/i).map((p) => p.replace(/<p[^>]*>|<li[^>]*>|<\/?[ou]l[^>]*>/gi, '').trim()).filter((p) => p.replace(/<[^>]+>|&nbsp;/g, '').trim() !== '')
  return parts.length ? parts : []
}

/* ── items ── */
type Line = DocItem & { noPrice: boolean }
type Area = { label: string; lines: Line[] }
type Section = { id: string; label: string; note: string | null; areas: Area[]; lines: Line[]; totalMinor: number }

function sections(b: ItemsBlock, items: DocItem[], view: ClientView): { main: Section[]; optional: Line[] } {
  const groups = items.filter((i) => i.kind === 'group')
  const declinedGroups = new Set(groups.filter((g) => g.status === 'Declined').map((g) => g.id))
  const lines: Line[] = items
    .filter((i) => i.kind === 'item' && i.status !== 'Declined' && !(i.parentId && declinedGroups.has(i.parentId)))
    .filter((i) => i.visibility !== 'hidden' || view.hiddenItems === 'no-price')
    .map((i) => ({ ...i, noPrice: i.visibility !== 'visible' }))
  const optional = lines.filter((l) => l.optional)
  const priced = lines.filter((l) => !l.optional)
  const byPos = (a: DocItem, c: DocItem) => a.position - c.position
  const noteOf = (label: string) => (b.groupNotes ? groups.find((g) => g.name.trim().toLowerCase() === label.trim().toLowerCase())?.description ?? null : null)
  let main: Section[] = []
  if (b.groupBy === 'none') {
    const top = items.filter((i) => !i.parentId).sort(byPos)
    let loose: Line[] = []
    const flushLoose = () => { if (loose.length) { main.push({ id: `loose-${main.length}`, label: '', note: null, areas: [], lines: loose, totalMinor: 0 }); loose = [] } }
    for (const t of top) {
      if (t.kind === 'group') { flushLoose(); if (t.status === 'Declined') continue; main.push({ id: t.id, label: t.name, note: b.groupNotes ? t.description : null, areas: [], lines: priced.filter((l) => l.parentId === t.id).sort(byPos), totalMinor: 0 }) }
      else { const l = priced.find((x) => x.id === t.id); if (l) loose.push(l) }
    }
    flushLoose()
  } else {
    const field = b.groupBy
    const labelOf = (l: Line) => (l[field] ?? items.find((g) => g.id === l.parentId)?.[field] ?? UNLABELLED[field])
    const order: string[] = []
    for (const l of priced.sort(byPos)) { const k = labelOf(l); if (!order.includes(k)) order.push(k) }
    main = order.map((label, i) => ({ id: `sec-${i}`, label, note: noteOf(label), areas: [], lines: priced.filter((l) => labelOf(l) === label), totalMinor: 0 }))
  }
  for (const s of main) {
    s.totalMinor = s.lines.reduce((sum, l) => sum + (l.noPrice ? 0 : lineTotalMinor(l)), 0)
    if (b.subGroupBy !== 'none') {
      const f = b.subGroupBy
      const order: string[] = []
      for (const l of s.lines) { const k = l[f] ?? ''; if (!order.includes(k)) order.push(k) }
      s.areas = order.map((label) => ({ label, lines: s.lines.filter((l) => (l[f] ?? '') === label) }))
    }
  }
  return { main: main.filter((s) => s.lines.length), optional }
}

function itemsSlices(b: ItemsBlock, design: TemplateDesign, ctx: RenderCtx, view: ClientView, out: Slice[], tables: Record<string, TableExtras>) {
  const { brand, data, values } = ctx
  const tid = b.id
  const cols: ItemsColumn[] = b.columns.filter((c) => c.on && view.columns[c.key] !== false)
  const descriptions = view.descriptions ? b.descriptions : 'none'
  const photos = b.photos && view.photos
  const cellStyle = textCss(b.style, brand, 'table')
  const pad = ROW_PAD[b.density]
  const ink = resolveColor('ink', brand), light = resolveColor('light', brand)
  const gridAttr = b.grid ? '' : undefined
  const ruledAttr = !b.grid && b.ruled ? '' : undefined
  const widths = cols.map((c) => (c.key === 'item' ? null : mm(c.width)))
  const colgroup = <colgroup>{cols.map((c, i) => <col key={c.key} style={widths[i] !== null ? { width: widths[i]! } : undefined} />)}</colgroup>
  const table = (rows: ReactNode, extra?: string) => (
    <table className={`${styles.t}${extra ? ` ${extra}` : ''}`} data-grid={gridAttr} data-ruled={ruledAttr} style={{ ...cellStyle, ['--ink' as string]: ink, ['--light' as string]: light, ['--pad' as string]: pad }}>{colgroup}<tbody>{rows}</tbody></table>
  )
  const money = (minor: number, noPrice: boolean, zeroText = true) => {
    if (noPrice) return <span className={styles.amt}><span /><span>—</span></span>
    if (minor === 0 && zeroText) { if (b.zeroAmount === 'blank') return null; if (b.zeroAmount !== '0.00') return <span className={styles.amt}><span /><span className={styles.foc}>{b.zeroAmount}</span></span> }
    const m = moneyText(minor, b.currency === 'none' ? 'none' : b.currency)
    return <span className={styles.amt}><span>{m.sign}</span><span>{m.figure}</span></span>
  }
  const cell = (c: ItemsColumn, content: ReactNode, extra?: CSSProperties) => (
    <td key={c.key} style={{ textAlign: c.align, color: c.color ? resolveColor(c.color, brand) : undefined, ...extra }}>{content}</td>
  )
  const span = cols.length || 1
  const bandRow = (label: string, key: string, tone: 'section' | 'optional' = 'section') => {
    const style = b.bandStyle
    const bg = style === 'grey' ? resolveColor('band', brand) : style === 'accent' ? resolveColor('accent', brand) : style === 'black' ? '#000' : undefined
    const fg = style === 'black' || style === 'accent' ? '#fff' : ink
    const text = <span style={{ ...textCss({ ...b.areaStyle, weight: 700, underline: style === 'underlined' || style === 'inline' || style === 'grey' }, brand, 'table'), color: fg }}>{label}</span>
    if (style === 'inline') return table(<tr key={key} data-band>{cols.map((c, i) => cell(c, i === (cols.findIndex((x) => x.key === 'item')) ? text : null))}</tr>)
    return table(<tr key={key} data-band><td colSpan={span} style={{ background: bg, color: fg, padding: pad }}>{text}</td></tr>, tone === 'optional' ? styles.optional : undefined)
  }
  const noteRow = (note: string, key: string) => table(<tr key={key}><td colSpan={span} style={{ ...textCss(b.groupNoteStyle, brand, 'table'), paddingLeft: mm(cols[0]?.key === 'no' ? cols[0].width : 0) + 4 }}>{resolveFields(note, values)}</td></tr>)
  const areaRow = (label: string, key: string) => table(<tr key={key}><td colSpan={span} style={{ ...textCss(b.areaStyle, brand, 'table'), paddingLeft: mm(cols[0]?.key === 'no' ? cols[0].width : 0) + 4 }}>{label}</td></tr>)
  const lineRow = (l: Line, no: string, key: string, hideAmount: boolean) => {
    const descLines = descriptions === 'none' || !l.description ? [] : descriptions === 'first' ? [l.description.split('\n')[0]!] : l.description.split('\n').filter(Boolean)
    const total = l.noPrice ? 0 : lineTotalMinor(l)
    return table(
      <tr key={key} data-line>
        {cols.map((c) => {
          switch (c.key) {
            case 'no': return cell(c, no)
            case 'item': return cell(c, (
              <div className={styles.item} data-photo={photos && l.thumb ? '' : undefined}>
                {photos && l.thumb ? <img className={styles.thumb} src={l.thumb} alt="" /> : null}
                <div>
                  <div>{l.name}</div>
                  {descLines.map((d, i) => <div key={i} style={textCss(b.descriptionStyle, brand, 'small')}>{descriptions === 'bullets' ? `• ${d}` : d}</div>)}
                </div>
              </div>
            ))
            case 'qty': return cell(c, l.qty ? String(l.qty) : '')
            case 'unit': return cell(c, l.unit ?? '')
            case 'qtyUnit': return cell(c, l.qty && l.unit ? `${l.qty} ${l.unit}` : l.unit ?? (l.qty > 1 ? String(l.qty) : ''))
            case 'unitPrice': return cell(c, hideAmount ? null : money(unitPriceMinor(l), l.noPrice, false))
            case 'discount': return cell(c, l.discountPct ? `${l.discountPct}%` : '')
            case 'total': return cell(c, hideAmount ? null : money(total, l.noPrice))
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

  const { main, optional } = sections(b, data.items, view)
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
  if (head) push({ key: `${tid}:head`, node: head, isHead: true, keepWithNext: true })
  let counter = 0
  main.forEach((s, si) => {
    const label = b.sectionLabel === 'letters' ? `${LETTERS[si % 26]}  ${s.label}` : b.sectionLabel === 'numbers' ? `${si + 1}  ${s.label}` : s.label
    const gk = s.id
    if (s.label) push({ key: `${tid}:${s.id}:band`, node: bandRow(label, `${s.id}-band`), groupKey: gk, groupStart: true, keepWithNext: true, breakBefore: b.groupNewPage && si > 0 })
    if (s.note) push({ key: `${tid}:${s.id}:note`, node: noteRow(s.note, `${s.id}-note`), groupKey: gk, keepWithNext: true })
    if (b.numbering === 'group') counter = 0
    const areas = s.areas.length ? s.areas : [{ label: '', lines: s.lines }]
    areas.forEach((a, ai) => {
      if (a.label) push({ key: `${tid}:${s.id}:a${ai}`, node: areaRow(a.label, `${s.id}-a${ai}`), groupKey: gk, keepWithNext: true })
      if (b.numbering === 'area') counter = 0
      a.lines.forEach((l) => {
        counter += 1
        const no = b.numbering === 'none' ? '' : String(counter)
        push({ key: `${tid}:${l.id}`, node: lineRow(l, no, l.id, b.lumpSum), groupKey: gk, amountMinor: l.noPrice ? 0 : lineTotalMinor(l) })
      })
    })
    if (b.lumpSum) push({ key: `${tid}:${s.id}:lump`, node: sumRow('Lump sum', s.totalMinor, `${s.id}-lump`), groupKey: gk })
    else if (b.subtotals && s.label) push({ key: `${tid}:${s.id}:sub`, node: sumRow(b.subtotalLabel.replace('{section}', s.label), s.totalMinor, `${s.id}-sub`), groupKey: gk })
  })
  if (optional.length && b.optionalSection && view.optionalWorks) {
    push({ key: `${tid}:opt:band`, node: bandRow(b.optionalTitle, 'opt-band', 'optional'), groupKey: 'optional', groupStart: true, keepWithNext: true })
    optional.forEach((l, i) => push({ key: `${tid}:opt:${l.id}`, node: lineRow(l, String(i + 1), `opt-${l.id}`, false), groupKey: 'optional' }))
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
        case 'additional': if (t.additionalMinor > 0) rows.push({ label, value: `−${m(t.additionalMinor)}` }); break
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

function paymentsNode(b: PaymentsBlock, ctx: RenderCtx): ReactNode {
  const { brand, data, values } = ctx
  const style = textCss(b.style, brand)
  const titleStyle = textCss(b.titleStyle, brand)
  const ink = resolveColor('ink', brand)
  const title = b.title ? <div className={styles.payTitle} data-band={b.band || undefined} style={{ ...titleStyle, background: b.band ? '#000' : undefined }}>{resolveFields(b.title, values)}</div> : null
  const rows = data.payments
  const m = (minor: number) => moneyText(minor, 'S$').figure
  if (!rows.length) return <div style={style}>{title}<div className={styles.muted}>No payment schedule on this quote.</div></div>
  if (b.layout === 'list') return (
    <div style={style}>{title}
      <ol className={styles.payList} data-letters={b.letters || undefined}>
        {rows.map((p, i) => <li key={i}><span>{b.letters ? `${LETTERS[i % 26]}  ` : ''}{p.description || p.name} - <b style={{ color: resolveColor('red', brand) }}>{p.pct}%</b>{b.showAmounts ? ` (${m(p.amountMinor)})` : ''}{b.showDue && p.due ? ` · ${p.due}` : ''}</span></li>)}
      </ol>
    </div>
  )
  if (b.layout === 'cards') return (
    <div style={style}>{title}
      <div className={styles.payCards}>
        {rows.map((p, i) => <div key={i} className={styles.payCard} style={{ borderColor: resolveColor('light', brand) }}><div className={styles.payPct}>{p.name} · {p.pct}%</div>{b.showAmounts ? <div className={styles.payAmt}>{m(p.amountMinor)}</div> : null}<div className={styles.muted}>{p.description}{b.showDue && p.due ? ` · ${p.due}` : ''}</div></div>)}
      </div>
    </div>
  )
  return (
    <div style={style}>{title}
      <table className={styles.t} data-grid={b.band ? '' : undefined} data-ruled={b.band ? undefined : ''} style={{ ['--ink' as string]: ink, ['--light' as string]: resolveColor('light', brand), ['--pad' as string]: ROW_PAD.normal }}>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i}>
              <td style={{ width: mm(8), textAlign: 'center' }}>{b.letters ? LETTERS[i % 26] : i + 1}</td>
              <td><b>{p.pct}%</b> - {p.description || p.name}</td>
              {b.showDue ? <td style={{ width: mm(28) }}>{p.due}</td> : null}
              {b.showAmounts ? <td style={{ width: mm(30), textAlign: 'right' }}>{m(p.amountMinor)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
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
