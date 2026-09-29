'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { TemplateDocument, type Paginated } from '@/components/templates/render/document'
import { mm, PAPER_MM, type BrandKit, type TemplateDesign } from '@/lib/templates/model'
import type { ClientView } from '@/lib/templates/client-view'
import type { DocData } from '@/lib/templates/data'
import styles from './client-view-pane.module.css'

/**
 * (REG-497) Client view, live: the quote drawn through its template as it is built — the same renderer as the Preview and
 * the PDF, redrawn from the editor's own lines, fields and schedule. Beside the sections on a desktop, a drawer on a tablet.
 */
export function ClientViewPane({ data, design, brand, templateName, version, view, onOpenPreview, onClose, bare = false }: {
  /** (sweep S1) inside the Drawer (≤1024) the drawer's head names it and closes it — the pane's own head would say it twice */
  bare?: boolean
  data: DocData; design: TemplateDesign; brand: BrandKit; templateName: string; version: number | null; /** (REG-538) the quote's own client-view switches, as Preview draws them */ view?: ClientView; onOpenPreview: () => void; onClose: () => void
}) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setAreaW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [pages, setPages] = useState(0)
  const onPaginated = useCallback((p: Paginated) => setPages(p.pages), [])
  const zoom = areaW ? Math.min(0.8, Math.max(0.25, (areaW - 24) / mm(PAPER_MM[design.page.paper].w))) : 0.45
  return (
    <div className={styles.pane} data-testid="client-view-pane">
      {bare ? <span className={styles.sub} data-bare="">{templateName}{version ? ` · v${version}` : ''}{pages ? ` · ${pages} page${pages === 1 ? '' : 's'}` : ''}</span> : (
        <div className={styles.head}>
          <span className={styles.headText}>
            <span className={styles.title}>Client view</span>
            <span className={styles.sub}>{templateName}{version ? ` · v${version}` : ''}{pages ? ` · ${pages} page${pages === 1 ? '' : 's'}` : ''}</span>
          </span>
          <Tooltip label="Close client view"><IconButton icon="close" label="Close client view" size={24} variant="bare" iconSize={24} iconFamily="outlined" onClick={onClose} /></Tooltip>   {/* (REG-729) the house close: the 24 outlined glyph (the Drawer's) */}
        </div>
      )}
      <div ref={areaRef} className={styles.area}>
        <TemplateDocument design={design} brand={brand} data={data} view={view} zoom={zoom} onPaginated={onPaginated} />
      </div>
      <div className={styles.foot}>
        <span className={styles.note}><Icon name="info" size={16} weight={300} /> Redraws as you build. Cost and markup never print.</span>
        <Button appearance="text" iconEnd={<Icon name="open_in_new" size={18} />} onPress={onOpenPreview}>Open Preview</Button>
      </div>
    </div>
  )
}
