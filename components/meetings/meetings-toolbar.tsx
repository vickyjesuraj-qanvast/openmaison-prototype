'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { ScopePill } from '@/components/om/scope-pill'
import { useSheetLayout } from '@/components/om/sheet'
import styles from './meetings-toolbar.module.css'

export type NewMeetingKind = 'plan' | 'now' | 'write' | 'record'
export type MeetingTodo = 'save' | 'write'

/**
 * (pending modules S23) The meetings list's toolbar — the house tab toolbar (components/om/tab-toolbar.module.css, REG-729): the title (or a
 * project's view switch), the to-do chips while something waits (REG-666: briefs to save to the lead · meetings whose notes aren't in),
 * New Meeting ▾ (Plan a meeting · Start one now · Write one up · Upload a recording), search, Column settings, ⋮ (Deleted Meetings · Meeting
 * settings). `bare` while the list is empty: the empty card carries the ways in (REG-735). *(invented copy)*
 */
export function MeetingsToolbar({ title, bare, query, onQuery, onNew, onColumns, todos, onMenu, mayChange, hideNew = false, onReports }: {
  /** Tools › Meeting Copilot keeps New Meeting ▾ in its page header (the Tasks page's shape, REG-466) */
  hideNew?: boolean
  /** (the calm UI build 2026-10-27, 1-30 · 2-47) Tools › Meeting Copilot's door into Company › Reports › Meetings — the ⋮'s first row "Reports"
      (it was the header's outlined "Insights"); absent where the viewer doesn't read that report, or before a first meeting */
  onReports?: () => void
  title: ReactNode
  bare: boolean
  query: string; onQuery: (q: string) => void
  onNew: (k: NewMeetingKind) => void
  onColumns?: () => void
  todos: { save: number; write: number; on: MeetingTodo | null; onToggle: (k: MeetingTodo) => void }
  onMenu: (a: 'deleted' | 'settings') => void
  mayChange: boolean
}) {
  const [menu, setMenu] = useState<'more' | null>(null)
  const pick = (fn: () => void) => () => { setMenu(null); fn() }
  /* (the calm UI build 2026-10-27, 2-20 · T-15) a phone keeps the chips' words — on a line of their own under the title (meetings-toolbar.module.css);
     a tablet's bar still folds them to their glyph and count */
  const phone = useSheetLayout()
  return (
    <div className={styles.bar}>
      {typeof title === 'string' ? <h2 className={styles.title}>{title}</h2> : title}
      <div className={styles.actions}>
        {bare ? null : (<>
          {/* (the calm UI build 2026-10-27, 2-20 · 2-11 · W-127 · W-283) the chips in a studio's words, counted the house way ("Label · n") */}
          {todos.save > 0 ? <span className={styles.todo}><ScopePill tone="attention" icon="description" menu={false} label={`Summaries to save · ${todos.save}`} short={phone ? undefined : String(todos.save)} selected={todos.on === 'save'} onClick={() => todos.onToggle('save')} /></span> : null}
          {todos.write > 0 ? <span className={styles.todo}><ScopePill tone="attention" icon="notes" menu={false} label={`Needs notes · ${todos.write}`} short={phone ? undefined : String(todos.write)} selected={todos.on === 'write'} onClick={() => todos.onToggle('write')} /></span> : null}
          {mayChange && !hideNew ? <NewMeetingMenu onNew={onNew} /> : null}
          <ToolbarSearch query={query} onQuery={onQuery} placeholder="Search meetings…" label="Search meetings" />
          {onColumns ? <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={onColumns} /></Tooltip> : null}
        </>)}
        <span className={styles.menuWrap}>
          <Tooltip label="More options" disabled={menu === 'more'}>
            <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={menu === 'more'} onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))} />
          </Tooltip>
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} sheetTitle="Meetings">
            {onReports ? <DropdownItem onSelect={pick(onReports)} testId="open-insights">Reports</DropdownItem> : null}
            <DropdownItem onSelect={pick(() => onMenu('settings'))}>Meeting settings</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('deleted'))}>Deleted meetings</DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}

/** New Meeting ▾ — Plan a meeting · Start a meeting now · Write up a meeting · Upload a recording. `filled` in a page header (Tools' page). */
export function NewMeetingMenu({ onNew, filled = false }: { onNew: (k: NewMeetingKind) => void; filled?: boolean }) {
  const [open, setOpen] = useState(false)
  const sheet = useSheetLayout()
  const pick = (k: NewMeetingKind) => () => { setOpen(false); onNew(k) }
  return (
    <span className={styles.menuWrap}>
      {sheet ? (
        <Tooltip shortcut="create" label="New meeting">
          <IconButton icon="add" label="New meeting" variant="primary" aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="New meeting" onClick={() => setOpen((o) => !o)} />
        </Tooltip>
      ) : (
        <Button variant="primary" appearance={filled ? 'filled' : 'outlined'} iconEnd={<span className={styles.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="New meeting" onPress={() => setOpen((o) => !o)} data-testid="meetings-new">New meeting</Button>
      )}
      <Dropdown open={open} onClose={() => setOpen(false)} align={filled ? 'right' : 'left'} width={MENU_WIDTH.wide} sheetTitle="New meeting">
        <DropdownItem onSelect={pick('plan')} help="When and where, with a reminder">Plan a meeting</DropdownItem>
        <DropdownItem onSelect={pick('now')} help="Meeting Copilot opens now">Start a meeting now</DropdownItem>
        <DropdownItem onSelect={pick('write')} help="From your notes, after it">Write up a meeting</DropdownItem>
        <DropdownItem onSelect={pick('record')} help="Kept in Files, with its transcript">Upload a recording</DropdownItem>
      </Dropdown>
    </span>
  )
}
