'use client'

import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { gridTemplateFor, useColumnLayout, useTableColumns, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { menuSideFor } from '@/components/leads/menu-side'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { useFlagPref } from '@/lib/prefs'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Avatar } from '@/components/om/avatar'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { TextField } from '@/components/om/text-field'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useComingSoon } from '@/components/om/snackbar'
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { CompanyShell, templateTabs } from '@/components/company/company-shell'
import { ago } from '@/lib/templates/ago'
import type { TemplateKind } from '@/lib/company/sections'
import { LibraryDeletedSheet } from './library-deleted-sheet'
import { LibraryKebab, LibraryNewButton } from './library-toolbar-actions'
import gallery from './quote-templates-gallery.module.css'
import table from './templates-table.module.css'
import styles from './library-gallery.module.css'

/* (REG-538) One gallery for the simple libraries — Contracts · Tasks · T&Cs & Notes · Payments — on the Quotes gallery's shell:
   New template ▾ + the page kebab (Deleted Templates) in the header, the segment filter · search · Column settings · grid / list
   toggle toolbar, cards or the listing-model table, rename / delete dialogs, the shared Deleted sheet. Each kind supplies its
   thumb, its facts, its extra kebab rows and its actions. */

export type LibraryItem = { id: string; title: string; createdAt: Date; updatedAt: Date; author: string | null; authorColor: string | null; usedBy: number; deletedAt: Date | null }
export type LibraryKebabItem = { label: string; onSelect: () => void; tone?: 'danger'; disabled?: boolean; title?: string }
export type LibraryColumn<T> = TableColumnDef & { cell: (t: T) => ReactNode; sortable?: boolean }
export type LibraryFilter<T> = { key: string; label: string; test: (t: T) => boolean }

export type LibraryGalleryProps<T extends LibraryItem> = {
  kind: TemplateKind
  items: T[]
  deleted: T[]
  now: number
  ariaLabel: string
  /** The rows of New template ▾ (DropdownItem / DropdownDivider); `close` shuts the menu. */
  newMenu: (close: () => void) => ReactNode
  /** Segment filters after "All · n". */
  filters?: LibraryFilter<T>[]
  /** Search beyond the title (the body's words). */
  searchText?: (t: T) => string
  /** The card's picture (inside the 220 thumb band) and the list's 26×36 glyph. */
  thumb: (t: T) => ReactNode
  glyph: (t: T) => ReactNode
  /** The card's second line and the usage line. */
  meta: (t: T) => string
  usage: (t: T) => string
  chips?: (t: T) => ReactNode
  /** The list's columns between Template and Updated. */
  columns: LibraryColumn<T>[]
  tableKey: string
  onOpen: (t: T) => void
  /** (REG-538) Where the gallery was opened from (Manage Templates on a tab or an editor): the shell's Back and crumb. */
  from?: string
  /** Kind-specific rows, placed after Open. */
  kebab?: (t: T) => LibraryKebabItem[]
  onDuplicate: (t: T) => Promise<unknown> | void
  onRename: (t: T, name: string) => Promise<unknown> | void
  onDelete: (t: T) => Promise<unknown> | void
  deleteMessage: (t: T) => string
  onRestore: (ids: string[]) => Promise<unknown>
  onDeleteForever: (ids: string[]) => Promise<unknown>
  onEmptyTrash: () => Promise<unknown>
  /** Why a deleted row cannot be removed for good (the sheet keeps it). */
  keepReason?: (t: T) => string | null
  /** The sheet's third column: the kind's own fact (kind · steps · split). */
  deletedMeta: { label: string; value: (t: T) => string }
  usageWord: (t: T) => string
  empty: { title: string; help: string }
  children?: ReactNode
  /** (REG-594) Another Company section on the same gallery: its shell (title + tab strip) and what an entry is called. */
  shell?: { title: string; tabs: { label: string; href: string }[] }
  noun?: { one: string; many: string }
  /** The list's first column head (default "Template"). */
  nameLabel?: string
  /** The kebab's row (default "Deleted Templates"). */
  deletedLabel?: string
  /** The New ▾ menu's rows are the caller's; this replaces "Open" as the first kebab row (e.g. "Edit"). */
  openLabel?: string
}

export function LibraryGallery<T extends LibraryItem>(p: LibraryGalleryProps<T>) {
  const { items, deleted, now, kind } = p
  const noun = p.noun ?? { one: 'template', many: 'templates' }
  const Noun = noun.one.charAt(0).toUpperCase() + noun.one.slice(1)
  const { run } = useRun()
  const phone = useMediaQuery(MOBILE)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [listPref, setListPref] = useFlagPref(`om.${p.tableKey}.list`, false)
  const view: 'grid' | 'list' = phone || !listPref ? 'grid' : 'list'
  const [newOpen, setNewOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [cardSide, setCardSide] = useState<'up' | 'down'>('down')   /* (REG-286) measured on the press: a card near the screen's foot opens its menu upward */
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null)
  const [del, setDel] = useState<T | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const defs = useMemo<readonly TableColumnDef[]>(() => [{ key: 'name', label: p.nameLabel ?? 'Template', track: 'minmax(318px, 1fr)', locked: true }, ...p.columns.map(({ key, label, track, hidden }) => ({ key, label, track, hidden })), { key: 'updated', label: 'Updated', track: '132px' }, ...(p.shell ? [] : [{ key: 'by', label: 'Updated by', track: '200px' }])], [p.columns, p.nameLabel, p.shell])
  const columnPrefs = useTableColumns(p.tableKey, defs, phone)
  const counts = useMemo(() => Object.fromEntries((p.filters ?? []).map((f) => [f.key, items.filter(f.test).length])), [items, p.filters])
  const shown = useMemo(() => {
    const f = (p.filters ?? []).find((x) => x.key === filter)
    const base = f ? items.filter(f.test) : items
    const q = query.trim().toLowerCase()
    return q ? base.filter((t) => t.title.toLowerCase().includes(q) || (p.searchText?.(t).toLowerCase().includes(q) ?? false)) : base
  }, [items, filter, query, p])

  const rows = (t: T): LibraryKebabItem[] => [{ label: p.openLabel ?? 'Open', onSelect: () => p.onOpen(t) }, ...(p.kebab?.(t) ?? [])]
  const menu = (t: T, open: boolean, side: 'up' | 'down', onClose: () => void) => (
    <Dropdown open={open} onClose={onClose} align="right" side={side} width={264} sheetTitle={t.title}>
      {rows(t).map((it) => <DropdownItem key={it.label} onSelect={() => { onClose(); it.onSelect() }} disabled={it.disabled} title={it.title}>{it.label}</DropdownItem>)}
      <DropdownDivider />
      <DropdownItem onSelect={() => { onClose(); void run(`duplicate the ${noun.one}`, async () => { await p.onDuplicate(t) }) }}>Duplicate</DropdownItem>
      <DropdownItem onSelect={() => { onClose(); setRename({ id: t.id, name: t.title }) }}>Rename</DropdownItem>
      <DropdownDivider />
      <DropdownItem tone="danger" onSelect={() => { onClose(); setDel(t) }}>Delete</DropdownItem>
    </Dropdown>
  )
  const doRename = () => { const r = rename; if (!r || !r.name.trim()) return; const t = items.find((x) => x.id === r.id); setRename(null); if (t) void run(`rename the ${noun.one}`, async () => { await p.onRename(t, r.name.trim()) }, `${Noun} renamed`) }

  return (
    <CompanyShell title={p.shell?.title ?? 'Templates'} tabs={p.shell?.tabs ?? templateTabs()} from={p.from}>
      <div className={gallery.toolbar}>
        <div className={gallery.filters}>
          {p.filters?.length ? (
            <SegmentedButton aria-label="Show" selectedKeys={[filter]} onSelectionChange={(keys) => { const k = [...keys][0]; if (typeof k === 'string') setFilter(k) }}>
              <SegmentedButtonItem id="all">All · {items.length}</SegmentedButtonItem>
              {p.filters.map((f) => <SegmentedButtonItem key={f.key} id={f.key}>{f.label} · {counts[f.key] ?? 0}</SegmentedButtonItem>)}
            </SegmentedButton>
          ) : <span className={styles.count}>{items.length} {items.length === 1 ? noun.one : noun.many}</span>}
        </div>
        <div className={gallery.toolbarEnd}>
          {/* (REG-541) The tab's own New ▾ leads the cluster; its kebab (Deleted Templates) closes it — the tab toolbars' order. */}
          <LibraryNewButton open={newOpen} onOpenChange={setNewOpen}>{p.newMenu(() => setNewOpen(false))}</LibraryNewButton>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder={`Search ${noun.many}`} label={`Search ${noun.many}`} />
          {view === 'list' ? <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} /></Tooltip> : null}
          <span className={gallery.viewToggle}>
            <SegmentedIconToggle label="View" value={view} options={[{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'view_kanban', label: 'Grid view' }]} onChange={(v) => setListPref(v === 'list')} />
          </span>
          <LibraryKebab open={kebabOpen} onOpenChange={setKebabOpen} deletedCount={deleted.length} onDeleted={() => setDeletedOpen(true)} label={p.deletedLabel} sheetTitle={p.shell?.title} />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className={gallery.empty} role="status">
          <span className={gallery.emptyGlyph}><Icon name={kind.icon} size={40} weight={300} /></span>
          <span className={gallery.emptyTitle}>{query ? `No ${noun.many} match` : filter !== 'all' ? `Nothing under ${(p.filters ?? []).find((f) => f.key === filter)?.label ?? filter}` : p.empty.title}</span>
          <span className={gallery.emptyHelp}>{query ? 'Try another name.' : p.empty.help}</span>
        </div>
      ) : view === 'list' ? (
        <LibraryTable rows={shown} now={now} tableKey={p.tableKey} columns={columnPrefs.columns} extra={p.columns} onReorder={columnPrefs.reorder} glyph={p.glyph} chips={p.chips} onOpen={p.onOpen} menu={menu} ariaLabel={p.ariaLabel} />
      ) : (
        <div className={gallery.grid} role="list" aria-label={p.ariaLabel}>
          {shown.map((t) => (
            <div key={t.id} className={gallery.card} role="listitem" data-testid="library-card">
              <button type="button" className={gallery.open} onClick={() => p.onOpen(t)} aria-label={`Open ${t.title}`}>
                <span className={gallery.thumb}>{p.thumb(t)}</span>
                <span className={gallery.body}>
                  <span className={gallery.nameRow}><span className={gallery.name}>{t.title}</span>{p.chips?.(t)}</span>
                  <span className={gallery.meta}>{p.meta(t)}</span>
                </span>
              </button>
              <span className={gallery.usage}>{p.usage(t)} · edited {ago(t.updatedAt.getTime(), now)}{t.author ? ` by ${t.author}` : ''}</span>
              <span className={gallery.kebab}>
                <Tooltip label="More options" disabled={menuFor === t.id}>
                  <IconButton icon="more_vert" label={`More options for ${t.title}`} size={24} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuFor === t.id}
                              onClick={(e) => { if (menuFor !== t.id) setCardSide(menuSideFor(e.currentTarget, rows(t).length + 3)); setMenuFor((m) => (m === t.id ? null : t.id)) }} />
                </Tooltip>
                {menu(t, menuFor === t.id, cardSide, () => setMenuFor(null))}
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rename} onClose={() => setRename(null)} title={`Rename ${noun.one}`} size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setRename(null)}>Cancel</Button><Button isDisabled={!rename?.name.trim()} onPress={doRename}>Rename</Button></>}>
        <TextField label={`${Noun} name`} required value={rename?.name ?? ''} autoFocus onChange={(v) => setRename((r) => (r ? { ...r, name: v } : r))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doRename() } }} />
      </Dialog>
      <ConfirmDialog open={!!del} title={`Delete ${del?.title ?? noun.one}?`} confirmLabel="Delete" message={del ? p.deleteMessage(del) : ''}
                     onCancel={() => setDel(null)} onConfirm={() => { const t = del; setDel(null); if (t) void run(`delete the ${noun.one}`, async () => { await p.onDelete(t) }, { message: `${t.title} deleted`, actionLabel: 'Undo', onAction: () => { void run(`restore the ${noun.one}`, () => p.onRestore([t.id]), `${t.title} restored`) } }) }} />
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <LibraryDeletedSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} rows={deleted} crumb={`${p.shell?.title ?? 'Templates'} / ${kind.label}`} ariaLabel={p.shell ? `Deleted ${kind.label.toLowerCase()}` : `Deleted ${kind.label.toLowerCase()} templates`}
                           glyph={p.glyph} meta={p.deletedMeta} usage={p.usageWord} keepReason={p.keepReason}
                           onRestore={(ids) => run('restore', () => p.onRestore(ids), ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.title ?? Noun} restored` : `${ids.length} ${noun.many} restored`)}
                           onDeleteForever={(ids) => run('delete', () => p.onDeleteForever(ids), ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.title ?? Noun} deleted forever` : `${ids.length} ${noun.many} deleted forever`)}
                           onEmptyTrash={() => run('empty the trash', () => p.onEmptyTrash(), 'Trash emptied')} />
      {p.children}
    </CompanyShell>
  )
}

/** The list view (REG-537 / REG-538): the quote templates list's stylesheet on the listing's table model — head 56, rows 60, frozen Template, resizable, draggable, the row kebab on hover with its side measured. */
function LibraryTable<T extends LibraryItem>({ rows, now, tableKey, columns, extra, onReorder, glyph, chips, onOpen, menu, ariaLabel }: {
  rows: T[]; now: number; tableKey: string; columns: readonly TableColumn[]; extra: LibraryColumn<T>[]; onReorder: (keys: string[]) => void
  glyph: (t: T) => ReactNode; chips?: (t: T) => ReactNode; onOpen: (t: T) => void
  menu: (t: T, open: boolean, side: 'up' | 'down', onClose: () => void) => ReactNode; ariaLabel: string
}) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')
  const colWidths = useColumnWidths(tableKey)
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const [frame, overflowing] = useOverflowX()
  const sortable = (key: string) => key === 'updated' || extra.find((c) => c.key === key)?.sortable === true
  return (
    <div ref={frame} className={table.card} role="table" aria-label={ariaLabel} data-cols={tableKey} data-overflow={overflowing || undefined} data-testid="library-table"
         style={{ '--tracks': tracks } as React.CSSProperties} onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={table.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${table.hCell} ${c.key === 'name' ? table.colName : ''} ${c.pinned ? table.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={{ ...L.style(c.key), ...D.style(c.key) }} {...D.head(c.key)}>
            {sortable(c.key) ? <button type="button" className={table.hSort} onClick={comingSoon}><span className={table.hLabel}>{c.label}</span><Icon name="unfold_more" size={16} /></button> : <span className={table.hLabel}>{c.label}</span>}
            <ColumnResizer table={tableKey} column={c.key} label={c.label} min={c.key === 'name' ? 160 : 72} />
          </div>
        ))}
      </div>
      {rows.map((t) => {
        const open = menuRow === t.id
        const cell = (key: string, children: ReactNode, cls?: string) => (
          <div className={`${table.cell} ${cls ?? ''} ${L.pinned(key) ? table.pin : ''}`} role="cell" data-col={key} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{children}</div>
        )
        const render = (key: string): ReactNode => {
          if (key === 'name') return cell('name', <><span className={table.thumb} aria-hidden>{glyph(t)}</span><button type="button" className={table.name} onClick={() => onOpen(t)}>{t.title}</button>{chips?.(t)}</>, table.colName)
          if (key === 'updated') return cell('updated', ago(t.updatedAt.getTime(), now))
          if (key === 'by') return cell('by', t.author ? <><Avatar name={t.author} color={t.authorColor ?? '#666666'} size={24} tooltip={false} /><span className={table.oneLine}>{t.author}</span></> : '--', table.colBy)
          const c = extra.find((x) => x.key === key)
          return c ? cell(key, c.cell(t)) : null
        }
        return (
          <div key={t.id} className={table.row} role="row" data-testid="library-row">
            {columns.map((c) => <Fragment key={c.key}>{render(c.key)}</Fragment>)}
            <span className={table.actions} data-open={open || undefined}>
              <span className={table.actionsInner}>
                <span className={table.menuWrap}>
                  <span className={table.float}>
                    <Tooltip label="More options" disabled={open}>
                      <IconButton icon="more_vert" label={`More options for ${t.title}`} variant="primary" className={table.touchBtn} aria-haspopup="menu" aria-expanded={open}
                                  onClick={(e) => { if (!open) setMenuSide(menuSideFor(e.currentTarget, 6)); setMenuRow((m) => (m === t.id ? null : t.id)) }} />
                    </Tooltip>
                  </span>
                  {menu(t, open, menuSide, () => setMenuRow(null))}
                </span>
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
