'use client'

import { useEffect, useRef, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { snackbarRise } from '@/lib/motion'
import styles from './bulk-bar.module.css'

/**
 * B1 bulk-action bar — the listing's selection bar (and the Deleted Leads sheet's).
 * (REG-729) One bulk bar: the owner's pick is the Lead Details bar (902:26567, components/leads/tasks/detail-bulk-bar.tsx) — count
 * box in subheading-m · the actions 24 apart · a 1×24 rule · the house 24 close — so this bar wears its anatomy, through its
 * stylesheet (bulk-bar.module.css composes it). It keeps its own API: a press carries its event (the Assign popover anchors to the
 * button) and each action names its key.
 */
export function BulkBar({
  count,
  actions,
  onClear,
  inset = false,
}: {
  count: number
  /** (REG-610) The press carries its event: the listing's Assign anchors a popover to the button. */
  /** `kb` (REG-713): the key that presses the action — 'delete' for ⌫, which asks first as the press does. */
  actions: { label: string; onClick: (e: MouseEvent<HTMLButtonElement>) => void; tone?: 'danger'; kb?: string }[]
  onClear: () => void
  /** Render inside a modal panel (absolute, bottom 24) instead of fixed to the viewport. */
  inset?: boolean
}) {
  /* (REG-358, user 2026-09-06: "when this is revealed push the fab button top") The bar and the Maison AI FAB
     both live on the bottom-right of a phone screen, and the bar covered it. It publishes its own height and
     its presence on the document while it is up; the FAB's stylesheet lifts itself over that (maison-fab.module.css).
     Layout is read in an effect, after paint — never during render. */
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bar.current
    if (count <= 0 || !el) return
    document.documentElement.style.setProperty('--app-bulk-bar-height', `${Math.round(el.getBoundingClientRect().height)}px`)
    document.body.setAttribute('data-om-bulk-bar', '')
    return () => {
      document.body.removeAttribute('data-om-bulk-bar')
      document.documentElement.style.removeProperty('--app-bulk-bar-height')
    }
  }, [count])

  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          ref={bar}
          className={styles.bar}
          data-inset={inset || undefined}
          role="toolbar" aria-label={`${count} selected`}
          variants={snackbarRise}
          initial="initial" animate="animate" exit="exit"
          style={{ x: '-50%' }}
        >
          <span className={styles.count}>{count}</span>
          {actions.map((a) => (
            <button key={a.label} type="button" className={styles.link} data-danger={a.tone === 'danger' || undefined} data-kb={a.kb} onClick={a.onClick}>{a.label}</button>
          ))}
          <span className={styles.rule} aria-hidden />
          <Tooltip label="Clear selection" side="top" shortcut="clear">
            <IconButton icon="close" label="Clear selection" size={24} variant="bare" iconSize={24} iconFamily="outlined" data-kb="clear" onClick={onClear} />
          </Tooltip>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
