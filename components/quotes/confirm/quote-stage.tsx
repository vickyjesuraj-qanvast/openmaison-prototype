'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { printPaper } from '@/lib/paper-print'
import { readingSections } from '@/components/templates/render/slices'
import { mm, PAPER_MM, type BrandKit, type TemplateDesign } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import type { ClientView } from '@/lib/templates/client-view'
import { TemplateDocument, type Paginated } from '@/components/templates/render/document'
import { ReadingCards } from './reading-cards'
import { PaperViewer } from './paper-viewer'
import { useClientPhoneModel } from './client-layout'
import shell from '@/components/contracts/sign/signing-page.module.css'
import styles from './confirm-page.module.css'

/**
 * (UX audit Q6 → pending modules S02) The quote as a client link shows it — the confirmation page's stage, shared with the view-only link
 * (`/quote/<token>`) so the two never drift: on a desk (and a tablet held sideways) the print fitted to the stage, never above 1:1 (the
 * preview's rule); on the phone model (a phone, a tablet held upright — client-layout.ts) the reading cards. The CSS decides from the first
 * paint — the media query answers only once it has hydrated — and the print mounts on the phone model only inside the "As printed" viewer
 * (Quotes on the move, K4 — P-12 · A-15 · A-17: the A4 fitted to the width, pinch to zoom, never 4px type inline). `show` false (a link opened
 * before the studio sent it) draws an empty stage. The host's total card carries the line count and "View as printed" (`readingLineCount`).
 */
export function QuoteStage({ design, brand, data, view, totalMinor, show, printed, onPrinted, onPages, viewerTitle = 'As printed' }: {
  design: TemplateDesign; brand: BrandKit; data: DocData; view: ClientView; totalMinor: number
  show: boolean
  /** "View as printed" on the phone model — the host holds it, so its own Download a copy can open the viewer first. */
  printed: boolean; onPrinted: (v: boolean) => void
  onPages?: (pages: number) => void
  /** The viewer's bar: "As printed" — with the quote's number where the host has it. */
  viewerTitle?: string
}) {
  const phone = useClientPhoneModel()
  const reading = useMemo(() => readingSections(design, data, view), [design, data, view])
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setAreaW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pageW = mm(PAPER_MM[design.page.paper].w)
  const zoom = areaW ? Math.min(1, Math.max(0.3, areaW / pageW)) : 0.9
  const [pages, setPages] = useState(0)
  const onPaginated = useCallback((p: Paginated) => { setPages(p.pages); onPages?.(p.pages) }, [onPages])
  /* the viewer fits the pages to its own width — measured on its body as it opens (K4, Q-06: fit to width, pinch to zoom) */
  const [fitW, setFitW] = useState(0)
  const onFit = useCallback((w: number) => setFitW(w), [])
  const viewerZoom = fitW ? Math.min(1, Math.max(0.3, fitW / pageW)) : 0.45
  const viewer = phone && reading && printed
  return (
    <div className={`${shell.stage} ${styles.stage}`} ref={areaRef}>
      {show ? (
        <>
          {reading ? (
            <div className={styles.phoneRead} data-testid="quote-reading">
              <ReadingCards sections={reading.sections} optional={reading.optional} amounts={reading.amounts} totalMinor={totalMinor} after={reading.after} afterTitle={reading.afterTitle} schedule={reading.schedule} />   {/* (S44T — C1 · row 332) */}
            </div>
          ) : null}
          {!phone || !reading ? <div className={styles.print} data-cards={reading ? '' : undefined}><TemplateDocument design={design} brand={brand} data={data} view={view} zoom={zoom} onPaginated={onPaginated} /></div> : null}
          {viewer ? (
            <PaperViewer open onClose={() => onPrinted(false)} title={`${viewerTitle}${pages ? ` · ${pages} ${pages === 1 ? 'page' : 'pages'}` : ''}`} onDownload={() => printPaper()} onFit={onFit}>
              <div className={styles.print} data-printed=""><TemplateDocument design={design} brand={brand} data={data} view={view} zoom={viewerZoom} onPaginated={onPaginated} /></div>
            </PaperViewer>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** (K4 — P-12) How many lines the client reads — the total card's "19 lines"; 0 where the print has no items block. */
export function readingLineCount(design: TemplateDesign, data: DocData, view: ClientView): number {
  const r = readingSections(design, data, view)
  return r ? r.sections.reduce((n, s) => n + s.lines.length, 0) : 0
}
