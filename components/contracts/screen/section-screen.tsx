'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useEscapeLayer } from '@/components/om/surface'
import { ScreenBar } from '@/components/quotes/screen/screen-bar'
import styles from './section-screen.module.css'

/**
 * (Contracts on the move, P-02 — his "please check and built accordingly" 2026-10-22) One section of a contract as its own screen on a phone
 * and a touch tablet: the one bar (← back to the section list · the section's title · its controls), the body as the scroller, an optional
 * foot. Fixed over the section list; on a landscape tablet it stands beside the list's pane (`--screen-left`). The screen takes focus as it
 * opens (a keyboard tablet tabs from its bar); Esc is its back while it is the topmost surface — an Esc typed inside a field blurs the field
 * first (REG-2584's rule), so the next Esc is the one that leaves. The quote's section screen (SectionCard's screen mode) is the model.
 */
export function SectionScreen({ title, subtitle, onBack, backLabel = 'Back to the sections', trailing, foot, flush = false, full = false, children, testId = 'section-screen', titleId, as = 'h1' }: {
  title: ReactNode
  subtitle?: ReactNode
  onBack: () => void
  backLabel?: string
  /** The bar's trailing controls (a Done, the Outline). */
  trailing?: ReactNode
  /** Pinned under the body (the house foot's rules). */
  foot?: ReactNode
  /** The body is the content's own (the Document screen's toolbar and paper), no gutters. */
  flush?: boolean
  /** The whole width, the list's pane covered (the Document screen). */
  full?: boolean
  children: ReactNode
  testId?: string
  titleId?: string
  as?: 'h1' | 'h2'
}) {
  const root = useRef<HTMLElement>(null)
  useEffect(() => { root.current?.focus({ preventScroll: true }) }, [])
  const back = useCallback(() => {
    const a = document.activeElement, r = root.current
    if (a instanceof HTMLElement && r && a !== r && r.contains(a) && a.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) { a.blur(); r.focus({ preventScroll: true }); return }
    onBack()
  }, [onBack])
  useEscapeLayer(true, root, back)
  return (
    <section ref={root} className={styles.screen} data-full={full || undefined} tabIndex={-1} aria-labelledby={titleId} data-om-surface="" data-testid={testId}>
      <ScreenBar className={styles.bar} as={as} titleId={titleId} title={title} subtitle={subtitle} trailing={trailing}
                 leading={<Tooltip label={backLabel}><IconButton icon="arrow_back" label="Back" variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-kb="back" data-testid="section-back" /></Tooltip>} />
      <div className={styles.body} data-flush={flush || undefined}><div className={styles.column}>{children}</div></div>
      {foot}
    </section>
  )
}

/** The screens' shared pieces — a note at 14, a form column, a list of 56 rows. */
export const screenStyles = styles
