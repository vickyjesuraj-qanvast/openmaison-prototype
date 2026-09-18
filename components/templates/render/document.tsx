'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { isCanvas, mm, mergeBrand, PAPER_MM, resolveColor, type BrandKit, type CanvasBlock, type TemplateDesign } from '@/lib/templates/model'
import { fieldValues } from '@/lib/templates/fields'
import { clientViewFromDesign, type ClientView } from '@/lib/templates/client-view'
import { docTotals, type DocData } from '@/lib/templates/data'
import { CanvasView, type Interactive, type RenderCtx } from './canvas'
import { buildSlices, type PageCtx, type Slice, type TableExtras } from './slices'
import styles from './document.module.css'

export type Paginated = { pages: number; pageOfBlock: Record<string, number> }
export type DocumentProps = {
  design: TemplateDesign
  /** The studio's kit; the design's overrides are merged here. */
  brand: BrandKit
  data: DocData
  view?: ClientView
  zoom?: number
  interactive?: Interactive
  onPaginated?: (info: Paginated) => void
  firstPageOnly?: boolean
  watermark?: string | null
  /** Print: pages at 1:1, no shadows, one per sheet (the preview's Download PDF). */
  print?: boolean
  /** "Recreate from my current quote" (REG-491): the uploaded image drawn under the first page to match against. */
  underlay?: { src: string; opacity: number } | null
  className?: string
}

type PagePlan = { cover: boolean; slices: number[]; fillers: number; fillTable: string | null; pageTotalMinor: number; pageTotalTable: string | null; headFor: string | null }

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }

/** Which body pages a header / footer canvas draws on. `first` / `not-first` count body pages (the cover is its own canvas). */
const shows = (c: CanvasBlock, bodyIndex: number) => (c.repeat === 'every' ? true : c.repeat === 'first' ? bodyIndex === 0 : bodyIndex > 0)

function plan(slices: Slice[], heights: Record<string, number>, tables: Record<string, TableExtras>, opts: { bodyH: (bodyIndex: number) => number; hasCover: boolean }): PagePlan[] {
  const pages: PagePlan[] = []
  if (opts.hasCover) pages.push({ cover: true, slices: [], fillers: 0, fillTable: null, pageTotalMinor: 0, pageTotalTable: null, headFor: null })
  let bodyIndex = 0
  let cur: PagePlan = { cover: false, slices: [], fillers: 0, fillTable: null, pageTotalMinor: 0, pageTotalTable: null, headFor: null }
  let used = 0
  const h = (k: string) => heights[k] ?? 0
  const avail = () => opts.bodyH(bodyIndex)
  const reserve = () => { const t = cur.slices.map((i) => slices[i]!.tableId).find((x) => x && tables[x]?.pageTotals); return t ? h(`pagetotal:${t}`) : 0 }
  const newPage = () => { pages.push(cur); bodyIndex += 1; cur = { cover: false, slices: [], fillers: 0, fillTable: null, pageTotalMinor: 0, pageTotalTable: null, headFor: null }; used = 0 }
  const groupHeight = (from: number) => { const g = slices[from]!.groupKey; let sum = 0; for (let j = from; j < slices.length && slices[j]!.groupKey === g; j++) sum += h(slices[j]!.key); return sum }
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i]!
    const sh = h(s.key)
    if (s.breakBefore && cur.slices.length) newPage()
    const headExtra = s.tableId && !s.isHead && cur.slices.length === 0 ? h(`head:${s.tableId}`) : 0
    const tableReserve = s.tableId && tables[s.tableId]?.pageTotals ? h(`pagetotal:${s.tableId}`) : reserve()
    const fits = (extra: number) => used + headExtra + extra <= avail() - tableReserve
    if (s.groupStart && s.tableId && tables[s.tableId]?.keepGroups && cur.slices.length) { const gh = groupHeight(i); if (!fits(gh) && gh <= avail() - tableReserve) newPage() }
    if (!fits(sh) && cur.slices.length) newPage()
    if (s.keepWithNext && i + 1 < slices.length && cur.slices.length && !fits(sh + h(slices[i + 1]!.key))) newPage()
    if (cur.slices.length === 0 && s.tableId && !s.isHead) cur.headFor = s.tableId
    cur.slices.push(i)
    used += sh + (cur.slices.length === 1 && s.tableId && !s.isHead ? h(`head:${s.tableId}`) : 0)
    if (s.amountMinor) cur.pageTotalMinor += s.amountMinor
    if (s.tableId && tables[s.tableId]?.pageTotals) cur.pageTotalTable = s.tableId
    if (s.tableId && tables[s.tableId]?.fillPage) { cur.fillTable = s.tableId; const fh = h(`filler:${s.tableId}`); cur.fillers = fh > 0 ? Math.max(0, Math.floor((avail() - tableReserve - used) / fh)) : 0 }
    else { cur.fillTable = null; cur.fillers = 0 }
  }
  if (cur.slices.length || pages.length === 0) pages.push(cur)
  return pages
}

/**
 * The document (REG-486): a template's design laid over one quote's data, paginated live. Every flow block becomes slices,
 * the slices are measured once in a hidden box the width of the page body, then packed page by page under the header
 * and over the footer canvases; the cover is its own page. `interactive` turns on selection, dragging and inline text.
 */
export function TemplateDocument({ design, brand: studioBrand, data, view, zoom = 1, interactive, onPaginated, firstPageOnly, watermark, print, underlay, className }: DocumentProps) {
  const brand = useMemo(() => mergeBrand(studioBrand, design.brand), [studioBrand, design.brand])
  const paper = PAPER_MM[design.page.paper]
  const m = design.page.margins
  const pageW = mm(paper.w), pageH = mm(paper.h)
  const bodyW = mm(paper.w - m.left - m.right)
  const totals = useMemo(() => docTotals(data), [data])
  const baseValues = useMemo(() => fieldValues(data, totals), [data, totals])
  const cv = useMemo(() => view ?? clientViewFromDesign(design), [view, design])
  const ctx: RenderCtx = useMemo(() => ({ brand, data, values: baseValues, interactive }), [brand, data, baseValues, interactive])
  const built = useMemo(() => buildSlices(design, ctx, cv, totals), [design, ctx, cv, totals])
  const header = design.blocks.find((b): b is CanvasBlock => b.kind === 'header' && !b.hidden)
  const footer = design.blocks.find((b): b is CanvasBlock => b.kind === 'footer' && !b.hidden)
  const cover = design.blocks.find((b): b is CanvasBlock => b.kind === 'cover' && !b.hidden)

  // Measure once per signature: the slices, the table extras, at the body width, in the document's own fonts.
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => { let on = true; void document.fonts?.ready.then(() => { if (on) setFontsReady(true) }); return () => { on = false } }, [])
  // The signature covers what a slice's height depends on — the flow blocks, the brand, the page, the view, the data — so a
  // header element dragged across its canvas never re-measures, and the pages keep the last measurement while a new one lands.
  const flow = useMemo(() => design.blocks.filter((b) => !isCanvas(b)), [design.blocks])
  const sig = useMemo(() => hash(JSON.stringify({ b: flow, br: design.brand, p: design.page, v: cv, n: data.items.length, q: data.quote.number, t: totals.totalMinor, w: bodyW, f: fontsReady, k: built.slices.map((s) => s.key) })), [flow, design.brand, design.page, cv, data.items.length, data.quote.number, totals.totalMinor, bodyW, fontsReady, built.slices])
  const [measured, setMeasured] = useState<{ sig: string; heights: Record<string, number> } | null>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const measuring = measured?.sig !== sig
  useLayoutEffect(() => {
    if (!measuring || !measureRef.current) return
    const heights: Record<string, number> = {}
    for (const el of measureRef.current.querySelectorAll<HTMLElement>('[data-k]')) heights[el.dataset.k!] = el.getBoundingClientRect().height
    setMeasured({ sig, heights })
  }, [measuring, sig])
  const heights = measured?.heights ?? {}

  const bodyH = (bodyIndex: number) => pageH - mm(m.top) - mm(m.bottom) - (header && shows(header, bodyIndex) ? mm(header.height) : 0) - (footer && shows(footer, bodyIndex) ? mm(footer.height) : 0)
  const pages = useMemo(() => (measured ? plan(built.slices, heights, built.tables, { bodyH, hasCover: !!cover }) : []), [measured, built, heights, cover, header, footer, pageH, m.top, m.bottom])   // eslint-disable-line react-hooks/exhaustive-deps
  const pageTotals = pages.filter((p) => !p.cover).map((p) => p.pageTotalMinor)
  const onPaginatedRef = useRef(onPaginated); useEffect(() => { onPaginatedRef.current = onPaginated })
  useEffect(() => {
    if (measuring) return
    const pageOfBlock: Record<string, number> = {}
    pages.forEach((p, i) => { for (const si of p.slices) { const b = built.slices[si]!.blockId; if (pageOfBlock[b] === undefined) pageOfBlock[b] = i } })
    if (cover) pageOfBlock[cover.id] = 0
    onPaginatedRef.current?.({ pages: pages.length, pageOfBlock })
  }, [pages, built.slices, measuring, cover])

  const dummyCtx: PageCtx = { page: 1, pages: 1, pageTotalMinor: 0, pageTotals: [] }
  const renderNode = (s: Slice, pc: PageCtx) => (typeof s.node === 'function' ? s.node(pc) : s.node)
  const sliceEl = (s: Slice, pc: PageCtx) => (
    <div key={s.key} className={styles.slice} style={{ paddingTop: s.padTop, paddingBottom: s.padBottom }}>{renderNode(s, pc)}</div>
  )
  /* A page's slices grouped by block, so one block draws one selection outline however many rows it has on the page. */
  const groups = (p: PagePlan, pc: PageCtx) => {
    const out: { blockId: string; nodes: ReactNode[] }[] = []
    const add = (blockId: string, node: ReactNode) => { const last = out[out.length - 1]; if (last && last.blockId === blockId) last.nodes.push(node); else out.push({ blockId, nodes: [node] }) }
    if (p.headFor && built.tables[p.headFor]) add(p.headFor, <div key="head" className={styles.slice}>{built.tables[p.headFor]!.head}</div>)
    for (const si of p.slices) { const s = built.slices[si]!; add(s.blockId, sliceEl(s, pc)) }
    if (p.fillTable && p.fillers > 0) for (let k = 0; k < p.fillers; k++) add(p.fillTable, <div key={`f${k}`} className={styles.slice} aria-hidden>{built.tables[p.fillTable]!.filler}</div>)
    if (p.pageTotalTable && built.tables[p.pageTotalTable]?.pageTotals) add(p.pageTotalTable, <div key="pt" className={styles.slice}>{built.tables[p.pageTotalTable]!.pageTotal(pc)}</div>)
    return out.map((g, i) => {
      const selected = interactive?.selected?.blockId === g.blockId && !interactive.selected.elementId
      return (
        <div key={`${g.blockId}-${i}`} className={styles.blockGroup} data-block-id={g.blockId} data-selected={selected || undefined}
             onPointerDown={interactive ? (e) => { e.stopPropagation(); interactive.onSelect({ blockId: g.blockId }) } : undefined}>
          {g.nodes}
        </div>
      )
    })
  }
  const pageStyle: CSSProperties = { width: pageW, height: pageH, color: resolveColor('ink', brand) }
  const shown = firstPageOnly ? pages.slice(0, 1) : pages
  const wm = watermark ?? (design.page.watermark || null)
  const bodyIndexOf: number[] = []; { let n = -1; for (const p of shown) { if (!p.cover) n += 1; bodyIndexOf.push(n) } }

  return (
    <div className={`${styles.doc}${className ? ` ${className}` : ''}`} data-print={print || undefined} style={{ ['--body-w' as string]: `${bodyW}px` }}>
      {measuring ? (
        <div ref={measureRef} className={styles.measure} style={{ width: bodyW }} aria-hidden>
          {built.slices.map((s) => <div key={s.key} data-k={s.key} className={styles.slice} style={{ paddingTop: s.padTop, paddingBottom: s.padBottom }}>{renderNode(s, dummyCtx)}</div>)}
          {Object.entries(built.tables).map(([tid, t]) => (
            <div key={tid}>
              <div data-k={`head:${tid}`}>{t.head}</div>
              <div data-k={`filler:${tid}`}>{t.filler}</div>
              <div data-k={`pagetotal:${tid}`}>{t.pageTotal(dummyCtx)}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className={styles.pages} style={{ zoom }} onPointerDown={interactive ? () => interactive.onSelect(null) : undefined}>
        {shown.map((p, i) => {
          const bodyIndex = bodyIndexOf[i] ?? 0
          const pc: PageCtx = { page: i + 1, pages: pages.length, pageTotalMinor: p.pageTotalMinor, pageTotals }
          const values = { ...baseValues, page: String(pc.page), pages: String(pc.pages) }
          const pctx: RenderCtx = { ...ctx, values }
          const showHead = !p.cover && header && shows(header, bodyIndex)
          const showFoot = !p.cover && footer && shows(footer, bodyIndex)
          const bodyTop = mm(m.top) + (showHead ? mm(header.height) : 0)
          const last = i === pages.length - 1
          return (
            <div key={i} className={styles.page} style={pageStyle} data-page={i + 1}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {underlay && i === 0 ? <img className={styles.underlay} src={underlay.src} alt="" style={{ opacity: underlay.opacity }} /> : null}
              {p.cover && cover ? (
                <div className={styles.cover}><CanvasView block={cover} ctx={pctx} width={paper.w} height={pageH} /></div>
              ) : (
                <>
                  {showHead ? <div className={styles.hdr} style={{ top: mm(m.top), left: mm(m.left) }}><CanvasView block={header} ctx={pctx} width={paper.w - m.left - m.right} /></div> : null}
                  <div className={styles.body} style={{ top: bodyTop, left: mm(m.left), width: bodyW, height: bodyH(bodyIndex) }}>
                    {groups(p, pc)}
                  </div>
                  {showFoot ? <div className={styles.ftr} style={{ bottom: mm(m.bottom), left: mm(m.left) }}><CanvasView block={footer} ctx={pctx} width={paper.w - m.left - m.right} /></div> : null}
                </>
              )}
              {wm ? <div className={styles.watermark} aria-hidden>{wm}</div> : null}
              {last && cv.branding && !p.cover ? <div className={styles.powered} style={{ bottom: Math.max(2, mm(m.bottom) / 2 - 6), right: mm(m.right) }}>Powered by OpenMaison</div> : null}
            </div>
          )
        })}
        {measured && pages.length === 0 ? <div className={styles.page} style={pageStyle} /> : null}
      </div>
    </div>
  )
}

/** A template's first page at a small size — the gallery card and the Create Quote tile. */
export function TemplateThumb({ design, brand, data, width = 160 }: { design: TemplateDesign; brand: BrandKit; data: DocData; width?: number }) {
  const paper = PAPER_MM[design.page.paper]
  const zoom = width / mm(paper.w)
  return (
    <div className={styles.thumb} style={{ width, height: Math.round(mm(paper.h) * zoom) }} aria-hidden>
      <TemplateDocument design={design} brand={brand} data={data} zoom={zoom} firstPageOnly />
    </div>
  )
}

export type { ReactNode }
