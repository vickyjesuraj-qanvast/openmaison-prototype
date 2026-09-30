'use client'

import { useRef, useState } from 'react'
import { DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import emptyStyles from '@/components/leads/search-empty.module.css'
import { displayDateTimeDot } from '@/lib/format'
import type { NoteFilter, NoteKind } from '@/lib/leads/note-model'
import styles from './notes-list.module.css'

export type NotesListItem = {
  id: string
  kind: NoteKind
  title: string
  secondary: string
  createdAt: Date
  /** Unsaved new note / contact log — the last item while it is being written (frame 79 / 165). */
  draft?: boolean
  /** The Contacted stage's own log (REG-265): view-only — Edit and Delete render disabled. */
  locked?: boolean
  /** (UX audit 2026-09-30, T3) A Met-stage meeting log — the same view-only row with the meeting's glyph. */
  meeting?: boolean
}

export type NotesListProps = {
  items: NotesListItem[]
  /** True while a query is on — the empty list then shows the no-results card rather than "no notes". */
  searching: boolean
  /** The no-results card's Clear All: drops the query and puts the scope back to All Notes & Logs. */
  onClearAll: () => void
  selectedId: string | null
  onSelect: (id: string) => void
  onItemMenu: (id: string, action: 'edit' | 'delete') => void
  /** (REG-318) The kind filter, drawn as the mock's head chips (931:44884) inside the column again. */
  filter: NoteFilter
  onFilter: (f: NoteFilter) => void
  /** (REG-546) The empty kind filter's own New — the toolbar's New ▾ › Note / Contact Log. */
  onNew: (kind: NoteKind) => void
}

/** Head chips (931:44884): All · Notes (sticky_note_2) · Contact Log (call_log, REG-278) — one per NoteFilter, in the mock's order. */
const FILTERS: { key: NoteFilter; label: string; icon?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'note', label: 'Notes', icon: 'sticky_note_2' },
  { key: 'contact', label: 'Contact Log', icon: 'call_log' },
]

/* (REG-293) Only the per-item kebab now — New ▾ moved to the tab's toolbar. */
type OpenMenu = { kind: 'item'; id: string } | null

/**
 * Lead Details › Notes — list column (931:44882 card, 400 wide; spec design-source/context/lead-notes/01-layout-list-editor.txt).
 * (REG-293) The column is ONLY the items now: its head — the kind chips (931:44884), New ▾ and the REG-275 search —
 * moved up to the tab's toolbar, where the lead listing keeps those same three things over its own one list.
 * Items ("Table / Cell / Two line" 360×100, H g12 p16/24): leading icon 20 · title 14/Bold + more_vert 20/Light kebab
 * (menu 931:45488 140×82 Edit · Delete) · secondary 14/Regular · date 12/Regular secondary via `displayDateTimeDot`.
 * Selected = primary-variant fill + 4px primary band at the left edge; bottom rules between items.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 * The whole item (except the kebab) is the select button.
 */
export function NotesList({ items, searching, onClearAll, selectedId, onSelect, onItemMenu, filter, onFilter, onNew }: NotesListProps) {
  const [menu, setMenu] = useState<OpenMenu>(null)
  const close = () => setMenu(null)
  /* (REG-728) One menu at a time, through the body portal, anchored to the pressed kebab — inline, it hung inside the scrolling list. */
  const kebab = useRef<HTMLElement | null>(null)
  const menuItem = menu?.kind === 'item' ? items.find((i) => i.id === menu.id) ?? null : null

  return (
    <div className={styles.column}>
      {/* (REG-318, user 2026-09-02: "bring back the quick filter tags … within the container") The mock's head (931:44884):
          the "Choice" chips with a leading icon, 36 tall, on a 68px row with a bottom rule — back inside the column, where
          REG-293 had folded them into a toolbar pill. New ▾ and the search stay in the tab's toolbar row. */}
      <div className={styles.head}>
        <div className={styles.chips} role="radiogroup" aria-label="Filter notes">
          {FILTERS.map((f) => (
            <button
              key={f.key} type="button" role="radio" aria-checked={filter === f.key}
              className={styles.chip} data-selected={filter === f.key || undefined} data-icon={f.icon ? '' : undefined}
              onClick={() => onFilter(f.key)}
            >
              {f.icon ? <Icon name={f.icon} size={16} className={styles.chipIcon} /> : null}
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {/* (REG-275) Nothing left after the chips and the query — the tabs' shared no-results card, in the column.
          The unsaved draft is never filtered out, so this only ever answers a search / filter, never "no notes". */}
      {items.length === 0 ? (
        <div className={styles.empty}>
          {searching || filter === 'all' ? (
            <TabSearchEmpty noun="notes" searching={searching} onClearAll={onClearAll} />
          ) : (
            /* (REG-546, tester feedback 2026-09-15) A kind chip with nothing behind it used to answer "No results found ·
               Clear All" beside an empty pane, which read as a dead end. The same card now names what is missing and
               offers to write it — the toolbar's New ▾ for that kind. Copy is invented. */
            <div className={emptyStyles.card} data-testid="notes-kind-empty">
              <span className={emptyStyles.title}>{filter === 'note' ? 'No notes yet' : 'No contact logs yet'}</span>
              <span className={emptyStyles.sub}>{filter === 'note' ? 'Write the first note for this lead.' : 'Log the first call or message with this lead.'}</span>
              <button type="button" className={emptyStyles.clear} onClick={() => onNew(filter)}>{filter === 'note' ? 'New note' : 'New contact log'}</button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.items} role="list" aria-label="Notes" data-kb-list="note">
          {items.map((it) => {
            const selected = it.id === selectedId
            const open = menu?.kind === 'item' && menu.id === it.id
            return (
              <div key={it.id} role="listitem" className={styles.item} data-testid="note-item" data-kb-row data-kb-id={it.id} data-selected={selected || undefined} data-draft={it.draft || undefined}>
                <button type="button" className={styles.itemMain} aria-pressed={selected} onClick={() => onSelect(it.id)} data-kb-open>
                  <Icon name={it.meeting ? 'group' : it.kind === 'contact' ? 'call_log' : 'sticky_note_2'} size={20} className={styles.itemIcon} />
                  <span className={styles.cellData}>
                    <span className={styles.titleBlock}>
                      <span className={styles.titleRow}>
                        <span className={styles.title}>{it.title}</span>
                      </span>
                      <span className={styles.secondary}>{it.secondary}</span>
                    </span>
                    <span className={styles.date}>{displayDateTimeDot(it.createdAt)}</span>
                  </span>
                </button>
                {/* Kebab sits in the title row (H g4: title · more_vert) — placed beside the select button, never inside it.
                    (REG-729) The house kebab in a head: IconButton 24 bare, a 24 glyph (it was a 20 box). */}
                <span className={styles.kebabWrap}>
                  <Tooltip label={it.kind === 'contact' ? 'Contact log actions' : 'Note actions'} disabled={open}>
                    <IconButton icon="more_vert" label={`Actions for ${it.title}`} size={24} variant="bare" iconSize={24} iconWeight={300}
                                aria-haspopup="menu" aria-expanded={open}
                                onClick={(e) => { kebab.current = e.currentTarget; setMenu((m) => (m?.kind === 'item' && m.id === it.id ? null : { kind: 'item', id: it.id })) }} />
                  </Tooltip>
                </span>
              </div>
            )
          })}
        </div>
      )}
      {/* 931:45488 — Edit · Delete, the notes family's mocked 140. A stage-logged record keeps its items visible but inert (REG-265);
          (REG-728) the reason prints in the row, under its words — a native title never shows on touch. */}
      <PortalMenu open={!!menuItem} anchor={kebab} onClose={close} align="right" width={140} role="menu" sheetTitle="Note">
        <DropdownItem disabled={menuItem?.locked} title={menuItem?.locked ? 'Logged by the Contacted stage — edit it in the Move stage window' : undefined}
                      onSelect={() => { const it = menuItem; close(); if (it) onItemMenu(it.id, 'edit') }}>Edit</DropdownItem>
        <DropdownItem tone="danger" disabled={menuItem?.locked} title={menuItem?.locked ? 'Logged by the Contacted stage — it cannot be deleted here' : undefined}
                      onSelect={() => { const it = menuItem; close(); if (it) onItemMenu(it.id, 'delete') }}>Delete</DropdownItem>
      </PortalMenu>
    </div>
  )
}
