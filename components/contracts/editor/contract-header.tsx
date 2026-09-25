'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs, type CrumbItem } from '@/components/om/crumbs'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import styles from '@/components/quotes/editor/editor-header.module.css'
import own from './contract-editor.module.css'

/**
 * The contract editor's header (REG-534) = the quote editor's Page Header (1201:33834, its own stylesheet reused): crumb over
 * [{title} ▾] switching the lead's contracts · chips · "Saved …" · [status ▾] · the primary · actions · kebab · rule · close.
 * The reference's row (Actions ▾ · comment · automation · link · download · Preview · Send) maps onto ours: Preview and
 * the icon buttons in `actions`, the rest in the kebab. ≤1024 the foldable actions live in the kebab, as the quote's do.
 */
export function ContractHeader({ crumbs, title, siblings, currentId, onSwitch, chips, savedLabel, statusSlot, primary, actions, foldedItems, menu, onClose }: {
  /** (REG-536) Every segment with an href is a link. */
  crumbs: CrumbItem[]
  title: string
  siblings?: { id: string; title: string; status?: string }[]
  currentId?: string
  onSwitch?: (id: string) => void
  chips?: ReactNode
  savedLabel: string
  statusSlot?: ReactNode
  primary?: { label: string; onPress: () => void; disabled?: boolean; hint?: string }
  /** Icon buttons and Preview — hidden ≤1024, where `foldedItems` puts them in the kebab. */
  actions?: ReactNode
  foldedItems?: ReactNode
  /** The kebab's rows (DropdownItem / DropdownDivider). */
  menu: ReactNode
  onClose: () => void
}) {
  const [open, setOpen] = useState<'switch' | 'more' | null>(null)
  const folded = useMediaQuery(TABLET_DOWN)
  const canSwitch = !!siblings && siblings.length > 0 && !!onSwitch
  return (
    <header className={styles.header} data-testid="contract-header">
      <div className={styles.titleBlock}>
        <Crumbs className={styles.crumb} items={crumbs} />
        <div className={styles.titleRow}>
          <span className={styles.anchor}>
            {canSwitch ? (
              <button type="button" className={styles.switch} aria-haspopup="menu" aria-expanded={open === 'switch'} aria-label={`${title} — switch contract`} onClick={() => setOpen((m) => (m === 'switch' ? null : 'switch'))}>
                <h1 className={styles.title}>{title}</h1>
                <span className={styles.chev} data-open={open === 'switch' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
              </button>
            ) : <h1 className={styles.title}>{title}</h1>}
            {canSwitch ? (
              <Dropdown open={open === 'switch'} onClose={() => setOpen(null)} align="left" width={320} sheetTitle="Contracts">
                {siblings!.map((s) => (
                  <DropdownItem key={s.id} role="menuitemradio" checked={s.id === currentId} onSelect={() => { setOpen(null); if (s.id !== currentId) onSwitch!(s.id) }}>
                    <span className={styles.menuTitle}>{s.title}</span>
                    {s.status ? <span className={styles.menuSub}>{s.status}</span> : null}
                    {s.id === currentId ? <span className={styles.menuCurrent}>current</span> : null}
                  </DropdownItem>
                ))}
              </Dropdown>
            ) : null}
          </span>
          {chips ? <div className={styles.chips}>{chips}</div> : null}
          <span className={styles.saved} role="status">
            <span className={styles.savedIcon} aria-hidden><Icon name="check_circle" size={20} /></span>
            {savedLabel}
          </span>
        </div>
      </div>
      <span className={styles.send}>
        {statusSlot}
        {primary ? (
          <span className={styles.sendBtn}>
            {primary.disabled ? (
              <Tooltip label={primary.hint ?? ''} disabled={!primary.hint}><span><Button variant="primary" isDisabled>{primary.label}</Button></span></Tooltip>
            ) : <Button variant="primary" onPress={primary.onPress}>{primary.label}</Button>}
          </span>
        ) : null}
      </span>
      <div className={styles.actions}>
        {/* The quote header keeps each action in its own .foldable; ours share one, so it is a flex row on the header's 12 gap. */}
        {actions && !folded ? <span className={`${styles.foldable} ${own.headerActions}`}>{actions}</span> : null}
        <span className={styles.anchor}>
          <Tooltip label="More options" disabled={open === 'more'}>
            <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={open === 'more'} onClick={() => setOpen((m) => (m === 'more' ? null : 'more'))} />
          </Tooltip>
          <Dropdown open={open === 'more'} onClose={() => setOpen(null)} align="right" width={264} sheetTitle={title}>
            {/* (sweep S2 #23) a greyed row stays put — its press closed the menu with nothing done; an enabled row still closes it */}
            <span onClick={(e) => { const item = (e.target as HTMLElement).closest('[role^="menuitem"]'); if (item && item.getAttribute('aria-disabled') !== 'true' && !item.hasAttribute('aria-haspopup')) setOpen(null) }} style={{ display: 'contents' }}>
              {folded ? foldedItems : null}
              {menu}
            </span>
          </Dropdown>
        </span>
        <span className={`${styles.rule} ${styles.foldable}`} aria-hidden />
        <Tooltip label="Close"><IconButton icon="close" label="Close" onClick={onClose} /></Tooltip>
      </div>
    </header>
  )
}
