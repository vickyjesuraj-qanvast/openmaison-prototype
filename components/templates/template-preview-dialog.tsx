'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { Dialog } from '@/components/om/dialog'
import { TemplateDocument } from '@/components/templates/render/document'
import { PAPER_MM, mm, type BrandKit, type TemplateDesign } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import styles from './template-preview-dialog.module.css'

/**
 * A template design at reading size (REG-512, owner 2026-09-18: "the preview would be a different window because users
 * can't really read/decide anything in this small window"): the design's every page at 100%, or fitted to the scroller
 * when it is narrower than a page, drawn live with the brand kit and the sample quote. `onPages` reports the page count
 * for the caller's subtitle. Fills the dialog body it sits in (the Choose a ready-made design dialog's preview state).
 */
export function TemplatePreviewPages({ paper, design, brand, sample, onPages }: {
  paper: TemplateDesign['page']['paper']; design: TemplateDesign; brand: BrandKit; sample: DocData; onPages?: (n: number) => void
}) {
  const [width, setWidth] = useState(0)
  /* The scroller's width, read after layout through a ResizeObserver (never in render). */
  const scroller = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const pagePx = mm(PAPER_MM[paper].w)
  const zoom = width ? Math.min(1, (width - 48) / pagePx) : 1
  return (
    <div ref={scroller} className={styles.pages} data-testid="template-preview-pages">
      <div className={styles.doc} style={{ width: Math.round(pagePx * zoom) }}>
        <TemplateDocument design={design} brand={brand} data={sample} zoom={zoom} onPaginated={({ pages: n }) => onPages?.(n)} />
      </div>
    </div>
  )
}

/** The pages in their own xxl window (fluid, 48 on every side) — for a caller with no dialog of its own to host them. */
export function TemplatePreviewDialog({ open, onClose, title, paper, design, brand, sample, footer, nested }: {
  open: boolean; onClose: () => void; title: string; paper: TemplateDesign['page']['paper']
  design: TemplateDesign; brand: BrandKit; sample: DocData; footer: ReactNode; nested?: boolean
}) {
  const [pages, setPages] = useState(0)
  return (
    <Dialog open={open} onClose={onClose} title={title} size="modal" fluid nested={nested} portal
            subtitle={`${paper}${pages ? ` · ${pages} page${pages === 1 ? '' : 's'}` : ''} · drawn with your brand and a sample quote`}
            footer={footer}>
      <TemplatePreviewPages paper={paper} design={design} brand={brand} sample={sample} onPages={(n) => setPages((c) => (c === n ? c : n))} />
    </Dialog>
  )
}
