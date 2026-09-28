'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchBar } from '@/components/ds'
import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import { useSearchTarget } from '@/components/shell/search-focus'
import { SlashSlot } from '@/components/om/slash-slot'
import styles from './toolbar-search.module.css'

/**
 * The tab toolbars' search box (Tasks · Quotes · Contracts · Files · Notes), with the mobile canvas' collapse
 * (REG-354): ≥768 it is the DS SearchBar the mocks draw, 280 wide in the toolbar row; ≤767 the row has no space
 * for it, so it is a search glyph that opens the box on its own full-width row and folds back when it is left
 * empty — exactly what the listing toolbar does (REG-298). The rail's search tile and the "/" key still reach
 * it: they focus the input, and open it first when it is folded away.
 */
export function ToolbarSearch({
  query, onQuery, placeholder, label,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder: string
  /** Accessible name for the box and its glyph ("Search tasks"). */
  label: string
}) {
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement | null>(null)
  const reveal = useCallback(() => setOpen(true), [])
  useSearchTarget(input, reveal)
  useEffect(() => { if (open) input.current?.focus() }, [open])
  return (
    <>
      {/* (REG-375) The glyph is the box, folded — it leaves when the box arrives, instead of sitting lit beside
          its own open field and pushing the row onto a third line. */}
      {open || query !== '' ? null : (
        <Tooltip label={label}>
          <IconButton icon="search" label={label} className={styles.btn} onClick={() => setOpen(true)} />
        </Tooltip>
      )}
      {/* `data-om-search-open` is the toolbars' hook: while the box has the row, the section title steps aside. */}
      <span ref={(el) => { input.current = el?.querySelector('input') ?? null }} className={styles.wrap}
            data-open={open || query !== '' || undefined}
            data-om-search-open={open || query !== '' || undefined}
            onBlurCapture={(e) => { if (query === '' && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false) }}>
        <SlashSlot empty={query === ''}><SearchBar appearance="outlined" size="md" placeholder={placeholder} aria-label={label}
                   value={query} onChange={onQuery} className={styles.field} /></SlashSlot>
      </span>
    </>
  )
}
