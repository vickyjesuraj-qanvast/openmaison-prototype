'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import type { NoteKind } from '@/lib/leads/note-model'
import styles from './notes-toolbar.module.css'

export type NotesToolbarProps = {
  query: string
  onQuery: (q: string) => void
  onNew: (kind: NoteKind) => void
  /** (simplify S-03 · Q-02) On a project: the Files & notes group's view switch in the "All Notes & Logs" title's place. */
  views?: ReactNode
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
export function NotesToolbar({ query, onQuery, onNew, views }: NotesToolbarProps) {
  const [menu, setMenu] = useState<'new' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  return (
    <div className={styles.bar}>
      {/* (REG-318, user 2026-09-02) The tab's title, as every sibling has ("All Tasks", "All Quotes"): the REG-293 scope
          pill is gone — the kind filter went back to the mock's chips in the list head (931:44884, notes-list.tsx). */}
      {views ?? <h2 className={styles.title}>All Notes &amp; Logs</h2>}

      <div className={styles.actions}>
        <span className={styles.menuWrap}>
          {/* touchTarget: the 36px DS control takes a ≥40 target below 768 (REG-273), drawn unchanged. */}
          {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon;
              the menu, its title and every action behind it are the same. */}
          {sheet ? (
            <Tooltip shortcut="create" label="New">
              <IconButton icon="add" label="New" variant="primary"
                          aria-haspopup="menu" aria-expanded={menu === 'new'} data-kb="create" data-kb-label="New"
                          onClick={() => setMenu((m) => (m === 'new' ? null : 'new'))} />
            </Tooltip>
          ) : (
            <Button
              variant="primary" appearance="outlined" className={styles.touchTarget}
              iconEnd={<span className={styles.chev} data-open={menu === 'new' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              aria-haspopup="menu" aria-expanded={menu === 'new'} data-kb="create" data-kb-label="New"
              onPress={() => setMenu((m) => (m === 'new' ? null : 'new'))}
            >
              New
            </Button>
          )}
          <Dropdown open={menu === 'new'} onClose={() => setMenu(null)} align="right" width={140} sheetTitle="New">
            <DropdownItem onSelect={() => { setMenu(null); onNew('note') }}>Note</DropdownItem>
            <DropdownItem onSelect={() => { setMenu(null); onNew('contact') }}>Contact Log</DropdownItem>
          </Dropdown>
        </span>
        {/* (REG-275) The box matches what a row SHOWS — title, secondary line, the printed date — plus the note's
            body as plain text. The placeholder names the fields people reach for; the aria-label is the plain name. */}
        <ToolbarSearch query={query} onQuery={onQuery} placeholder="Search title, note, outcome…" label="Search notes" />
      </div>
    </div>
  )
}
