'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useEscapeLayer } from '@/components/om/surface'
import { ScreenBar } from '@/components/quotes/screen/screen-bar'
import styles from './section-screen.module.css'

/**
 * (Contracts on the move, P-03 — C1's frame, C2's content; his "please check and built accordingly" 2026-10-22) **The Document screen**: the
 * contract's paper full-screen on a phone and a touch tablet (`?edit=document`). A 56 bar — ← (back to the sections) · "Document" · the
 * clause the caret is in as the sub-line ("clause 2 of 12 · saved just now") · Outline ≡ · Done — and the body is whatever the host mounts:
 * today's `DocToolbar` + `DocEditor` (components/contracts/editor/*), whose insides C2 makes the one 44-pitch tool row and the paper at
 * ≤1024. No Maison AI button over the paper (the host draws none while this screen is open — REG-2602's rule for a section screen). The
 * Outline: a sheet on a phone (the host's Drawer, today's — it closes on pick and lands the heading mid-screen) or, on a landscape tablet,
 * `pane` at the paper's left, never a drawer over the place a field is being put (P-02 · B-13). The contract template's clauses (C4, wave 2)
 * open in this same frame. Esc is its back while it is the topmost surface (a field's Esc blurs the field first).
 */
export function DocumentFrame({ title = 'Document', subtitle, onBack, onDone, backLabel = 'Back to the sections', outlineOpen = false, onOutline, pane, children, testId = 'document-screen' }: {
  title?: ReactNode
  /** One line under the title — the clause the caret is in and the save stamp. */
  subtitle?: ReactNode
  /** ← : back to the section list. */
  onBack: () => void
  /** Done: back to the record's screen (every change has saved itself). */
  onDone: () => void
  backLabel?: string
  outlineOpen?: boolean
  /** The ≡ — absent, no Outline control is drawn (a PDF has none). */
  onOutline?: () => void
  /** A landscape tablet: the Outline as a 300 pane at the paper's left while it is open. */
  pane?: ReactNode
  children: ReactNode
  testId?: string
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
    <section ref={root} className={styles.screen} data-full="" data-document-frame="" tabIndex={-1} aria-label="Document" data-om-surface="" data-testid={testId}>
      <ScreenBar className={styles.bar} title={title} subtitle={subtitle}
                 leading={<Tooltip label={backLabel}><IconButton icon="arrow_back" label="Back" variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-kb="back" data-testid="document-back" /></Tooltip>}
                 trailing={<>
                   {onOutline ? <Tooltip label={outlineOpen ? 'Hide outline' : 'Outline'} disabled={outlineOpen}><IconButton icon="list" label="Outline" variant="bare" iconSize={24} iconWeight={300} aria-pressed={outlineOpen} selected={outlineOpen} onClick={onOutline} data-testid="document-outline" /></Tooltip> : null}
                   <Button appearance="text" onPress={onDone} data-testid="document-done">Done</Button>
                 </>} />
      <div className={styles.frameRow}>
        {pane ? <aside className={styles.pane} aria-label="Outline" data-testid="document-outline-pane">{pane}</aside> : null}
        <div className={styles.body} data-flush=""><div className={styles.column}>{children}</div></div>
      </div>
    </section>
  )
}
