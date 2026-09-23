'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import styles from './quote-templates-gallery.module.css'

/**
 * (REG-541, owner 2026-09-23) Each Templates tab owns its "New ▾": it leads the tab toolbar's right cluster — the Tasks
 * tab's "Add Task ▾" / the Quotes tab's "Create Quote" placement and style (primary outlined) — instead of the section's
 * L1 header, where one button over five tabs read as global. The tab names the kind, the menu names the way in.
 * ≤767 the labelled primary is its glyph (REG-354) and the menu is a bottom sheet.
 */
export function LibraryNewButton({ open, onOpenChange, children, sheetTitle = 'New' }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode; sheetTitle?: string }) {
  const phone = useMediaQuery(MOBILE)
  return (
    <span className={styles.newAnchor}>
      {phone ? (
        <Tooltip label="New" disabled={open}>
          <IconButton icon="add" label="New" variant="primary" aria-haspopup="menu" aria-expanded={open} onClick={() => onOpenChange(!open)} data-testid="new-template" />
        </Tooltip>
      ) : (
        <Button variant="primary" appearance="outlined" aria-haspopup="menu" aria-expanded={open} onPress={() => onOpenChange(!open)} data-testid="new-template"
                iconEnd={<span className={styles.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}>
          New
        </Button>
      )}
      <Dropdown open={open} onClose={() => onOpenChange(false)} align="right" width={264} sheetTitle={sheetTitle}>
        {children}
      </Dropdown>
    </span>
  )
}

/** The tab's kebab beside its New ▾ (REG-502 → REG-541): Deleted Templates of this kind. */
export function LibraryKebab({ open, onOpenChange, deletedCount, onDeleted }: { open: boolean; onOpenChange: (open: boolean) => void; deletedCount: number; onDeleted: () => void }) {
  return (
    <span className={styles.kebabAnchor}>
      <Tooltip label="More options" disabled={open}>
        <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => onOpenChange(!open)} />
      </Tooltip>
      <Dropdown open={open} onClose={() => onOpenChange(false)} align="right" sheetTitle="Templates">
        <DropdownItem onSelect={() => { onOpenChange(false); onDeleted() }}>Deleted Templates{deletedCount ? ` · ${deletedCount}` : ''}</DropdownItem>
      </Dropdown>
    </span>
  )
}
