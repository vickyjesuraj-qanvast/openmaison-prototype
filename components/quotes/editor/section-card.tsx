'use client'

import type { PointerEvent, ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './section-card.module.css'

/**
 * One editor section (section-top 1271:39681 / 1260:31210 / 1260:31999 …): the title group is the collapse toggle
 * (keyboard_arrow_up open, keyboard_arrow_down collapsed), the movable sections carry the drag handle the mock draws
 * before the title (drag_indicator 24 Light, on-surface-disabled), and each section's own controls sit in `actions`.
 * `onHandlePointerDown` starts the reorder drag (motion's drag controls, quote-editor.tsx) — absent, no handle is drawn.
 */
export function SectionCard({ id, title, open, onToggle, actions, onHandlePointerDown, children }: {
  id: string
  title: string
  open: boolean
  onToggle: () => void
  actions?: ReactNode
  onHandlePointerDown?: (e: PointerEvent<HTMLButtonElement>) => void
  children?: ReactNode
}) {
  const bodyId = `${id}-body`
  return (
    <section id={id} className={styles.card} data-open={open || undefined} aria-labelledby={`${id}-title`}>
      <div className={styles.top}>
        <div className={styles.label}>
          {onHandlePointerDown ? (
            <Tooltip label="Drag to reorder">
              <button type="button" className={styles.handle} aria-label={`Drag to reorder ${title}`} onPointerDown={onHandlePointerDown}>
                <Icon name="drag_indicator" size={24} weight={300} />
              </button>
            </Tooltip>
          ) : null}
          <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
            <span id={`${id}-title`} className={styles.title}>{title}</span>
            <span className={styles.chev} aria-hidden><Icon name="keyboard_arrow_up" size={20} /></span>
          </button>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {open ? <div id={bodyId} className={styles.body}>{children}</div> : null}
    </section>
  )
}
