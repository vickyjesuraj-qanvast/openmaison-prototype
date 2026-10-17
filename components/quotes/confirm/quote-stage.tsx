'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { readingSections } from '@/components/templates/render/slices'
import { mm, PAPER_MM, type BrandKit, type TemplateDesign } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import type { ClientView } from '@/lib/templates/client-view'
import { TemplateDocument, type Paginated } from '@/components/templates/render/document'
import { ReadingCards } from './reading-cards'
import shell from '@/components/contracts/sign/signing-page.module.css'
import styles from './confirm-page.module.css'

/**
 * (UX audit Q6 → pending modules S02) The quote as a client link shows it — the confirmation page's stage, shared with the view-only link
 * (`/quote/<token>`) so the two never drift: above 767 the print fitted to the stage, never above 1:1 (the preview's rule); on a phone the
 * reading cards, with "View as printed" for the A4. The CSS decides from the first paint — the media query answers only once it has hydrated —
 * and the print mounts on a phone only when asked for. `show` false (a link opened before the studio sent it) draws an empty stage.
 */
export function QuoteStage({ design, brand, data, view, totalMinor, show, printed, onPrinted, onPages }: {
  design: TemplateDesign; brand: BrandKit; data: DocData; view: ClientView; totalMinor: number
  show: boolean
  /** "View as printed" on a phone — the host holds it, so its own Download a copy can switch to the A4 first. */
  printed: boolean; onPrinted: (v: boolean) => void
  onPages?: (pages: number) => void
}) {
  const phone = useMediaQuery(MOBILE)
  const reading = useMemo(() => readingSections(design, data, view), [design, data, view])
  const lineCount = reading ? reading.sections.reduce((n, s) => n + s.lines.length, 0) : 0
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
  return (
    <div className={`${shell.stage} ${styles.stage}`} ref={areaRef}>
      {show ? (
        <>
          {reading ? (
            <div className={styles.phoneRead} data-printed={printed || undefined}>
              <div className={styles.readHead}>
                <span className={styles.readCount}>{printed ? `As printed${pages ? ` · ${pages} ${pages === 1 ? 'page' : 'pages'}` : ''}` : `${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`}</span>
                <Button appearance="text" iconStart={<Icon name={printed ? 'view_list' : 'description'} size={20} />} onPress={() => onPrinted(!printed)} data-testid="view-as-printed">{printed ? 'View as a list' : 'View as printed'}</Button>
              </div>
              {printed ? null : <ReadingCards sections={reading.sections} optional={reading.optional} amounts={reading.amounts} totalMinor={totalMinor} after={reading.after} afterTitle={reading.afterTitle} schedule={reading.schedule} />}   {/* (S44T — C1 · row 332) */}
            </div>
          ) : null}
          {!phone || printed || !reading ? <div className={styles.print} data-cards={reading ? '' : undefined} data-printed={printed || undefined}><TemplateDocument design={design} brand={brand} data={data} view={view} zoom={zoom} onPaginated={onPaginated} /></div> : null}
        </>
      ) : null}
    </div>
  )
}
