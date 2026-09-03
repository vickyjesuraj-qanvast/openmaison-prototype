'use client'

import { useRef, useState } from 'react'
import { Button, SearchBar } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { useSearchTarget } from '@/components/shell/search-focus'
import type { NoteKind } from '@/lib/leads/note-model'
import styles from './notes-toolbar.module.css'

/** The pill's three scopes, in the order the retired chips drew them (931:44884). */

export type NotesToolbarProps = {
  query: string
  onQuery: (q: string) => void
  onNew: (kind: NoteKind) => void
}

/**
 * Lead Details › Notes — toolbar row (REG-293, user 2026-09-02). The tab had no page-level row at all: the kind
 * chips and the search sat inside the 400 list column, so Notes started 36+24 higher than every sibling and had
 * no heading of its own.
 *
 * Built on the LEAD LISTING's toolbar (components/leads/toolbar.tsx), which the owner named as the precedent:
 * its "All Leads (24) ▾" pill is a scope filter standing where a title would, with the search beside it. Notes has
 * exactly that shape — All / Notes / Contact Log over one list — so the chips become that pill (menu items are
 * `menus.module.css` label + count rows, the StageFilterDropdown's own), and the search joins them at this level.
 * New ▾ keeps the siblings' position (first control on the right, as Add Task / New Quote).
 * Menus toggle on their own trigger (REG-153); the chevron points up while open.
 */
export function NotesToolbar({ query, onQuery, onNew }: NotesToolbarProps) {
  const [menu, setMenu] = useState<'new' | null>(null)
  // The rail search tile and the "/" key focus the page's search input (page checklist). The DS SearchBar
  // owns its <input>, so the target is resolved from the wrapper once it mounts (tasks-toolbar.tsx).
  const searchInput = useRef<HTMLInputElement | null>(null)
  useSearchTarget(searchInput)

  return (
    <div className={styles.bar}>
      {/* (REG-318, user 2026-09-02) The tab's title, as every sibling has ("All Tasks", "All Quotes"): the REG-293 scope
          pill is gone — the kind filter went back to the mock's chips in the list head (931:44884, notes-list.tsx). */}
      <h2 className={styles.title}>All Notes &amp; Logs</h2>

      <div className={styles.right}>
        <span className={styles.menuWrap}>
          {/* touchTarget: the 36px DS control takes a ≥40 target below 768 (REG-273), drawn unchanged. */}
          <Button
            variant="primary" appearance="outlined" className={styles.touchTarget}
            iconEnd={<span className={styles.chev} data-open={menu === 'new' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
            aria-haspopup="menu" aria-expanded={menu === 'new'}
            onPress={() => setMenu((m) => (m === 'new' ? null : 'new'))}
          >
            New
          </Button>
          <Dropdown open={menu === 'new'} onClose={() => setMenu(null)} align="right" width={140}>
            <DropdownItem onSelect={() => { setMenu(null); onNew('note') }}>Note</DropdownItem>
            <DropdownItem onSelect={() => { setMenu(null); onNew('contact') }}>Contact Log</DropdownItem>
          </Dropdown>
        </span>
        <span ref={(el) => { searchInput.current = el?.querySelector('input') ?? null }} className={styles.searchWrap}>
          {/* (REG-275) The box matches what a row SHOWS — title, secondary line, the printed date — plus the note's
              body as plain text. The placeholder names the fields people reach for; the aria-label is the plain name. */}
          <SearchBar
            appearance="outlined" size="md"
            placeholder="Search title, note, outcome…" aria-label="Search notes"
            value={query} onChange={onQuery}
            className={styles.search}
          />
        </span>
      </div>
    </div>
  )
}
