'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { useFlagPref } from '@/lib/prefs'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { TextField } from '@/components/om/text-field'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { CompanyShell, templateTabs } from '@/components/company/company-shell'
import { TemplateThumb } from '@/components/templates/render/document'
import { HouseStyleDialog } from './house-style-dialog'
import { RecreateDialog } from './recreate-dialog'
import { createTemplate, deleteTemplate, deleteTemplatesForever, duplicateTemplate, emptyTemplateTrash, renameTemplate, restoreTemplate, restoreTemplates, setDefaultTemplate } from '@/app/company/templates-actions'
import { DeletedTemplatesSheet } from './deleted-templates-sheet'
import { TemplateMenu, type TemplateAction } from './template-menu'
import { TEMPLATE_COLUMN_DEFS, TemplatesTable, updatedStamp } from './templates-table'
import type { TemplatesData } from '@/lib/templates/queries'
import type { TemplateSummary } from '@/lib/templates/model'
import { ago } from '@/lib/templates/ago'
import { withFrom } from '@/lib/nav'
import { LibraryKebab, LibraryNewButton } from './library-toolbar-actions'
import styles from './quote-templates-gallery.module.css'

type Filter = 'all' | 'awaiting' | 'published' | 'draft'

/**
 * Company › Templates › Quotes (REG-485): every quote template as a card — its real first page, the status (Draft ·
 * Published vN · Default), who touched it and when, how many live quotes use it — with New template ▾ (Blank · From a house
 * style · Recreate from my current quote — the one way in, owner 2026-09-18: no second Upload button) and a kebab per card. A card opens the editor.
 */
export function QuoteTemplatesGallery({ data, from }: { data: TemplatesData; from?: string }) {
  const { templates, deleted, brand, sample, now, approval } = data
  const [kebabOpen, setKebabOpen] = useState(false)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [houseOpen, setHouseOpen] = useState(false)
  const [recreateOpen, setRecreateOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  /* A dialog's payload with its own `open` flag (the Files tab's Shown<T>): the 0.14 s exit frame keeps its title and name. */
  const [rename, setRenameState] = useState<{ payload: { id: string; name: string } | null; open: boolean }>({ payload: null, open: false })
  const setRename = (v: { id: string; name: string } | null) => setRenameState((r) => (v ? { payload: v, open: true } : { ...r, open: false }))
  const [delState, setDelState] = useState<{ payload: TemplateSummary | null; open: boolean }>({ payload: null, open: false })
  const del = delState.payload
  const setDel = (v: TemplateSummary | null) => setDelState((d) => (v ? { payload: v, open: true } : { ...d, open: false }))
  const [busy, setBusy] = useState(false)
  /* (REG-505) Grid or list, remembered per browser; a phone shows the cards (the Files tab's rule, REG-354). */
  const [listPref, setListPref] = useFlagPref('om.templates.list', false)
  const phone = useMediaQuery(MOBILE)
  const view: 'grid' | 'list' = phone || !listPref ? 'grid' : 'list'
  const [columnsOpen, setColumnsOpen] = useState(false)
  const columnPrefs = useTableColumns('quote-templates', TEMPLATE_COLUMN_DEFS, phone)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return templates.filter((t) => (filter === 'all' ? true : filter === 'awaiting' ? !!t.submitted : t.status === filter)).filter((t) => !q || t.name.toLowerCase().includes(q))
  }, [templates, filter, query])
  const counts = { all: templates.length, awaiting: templates.filter((t) => !!t.submitted).length, published: templates.filter((t) => t.status === 'published').length, draft: templates.filter((t) => t.status === 'draft').length }

  const open = (id: string) => router.push(withFrom(`/templates/${id}`, '/company/templates/quotes'))   /* (REG-465) Back returns here */
  const create = async (fn: () => Promise<string>, what: string) => {
    if (busy) return
    setBusy(true)
    try { const id = await fn(); router.push(`/templates/${id}`) }
    catch { snackbar({ message: `Couldn’t ${what} — please try again` }) }
    finally { setBusy(false) }
  }
  const statusLine = (t: TemplateSummary) => {   /* the row's Updated column reads the same stamp (updatedStamp) */
    const who = t.updatedBy ? ` by ${t.updatedBy.name}` : ''
    if (t.submitted) return `Awaiting approval · ${t.submitted.by?.name ?? 'a designer'} · ${ago(t.submitted.at, now)}${t.status === 'published' ? ` · v${t.version} still prints` : ''}`   /* REG-501 */
    if (t.status === 'draft') return `Draft · edited ${ago(t.updatedAt, now)}${who}`
    return `Published v${t.version} · ${ago(updatedStamp(t), now)}${who}${t.hasDraft ? ' · unpublished changes' : ''}`
  }
  const usage = (t: TemplateSummary) => (t.usedBy === 0 ? 'Not used yet' : `Used by ${t.usedBy} quote${t.usedBy === 1 ? '' : 's'}`)
  /** The kebab's six items, on a card or a table row (template-menu.tsx). */
  const onAction = (t: TemplateSummary, a: TemplateAction) => {
    if (a === 'edit') open(t.id)
    else if (a === 'newQuote') router.push(`/quotes?new=${t.id}`)
    else if (a === 'default') void run('set the default', () => setDefaultTemplate(t.id), `${t.name} is the default template`)
    else if (a === 'duplicate') void create(() => duplicateTemplate(t.id), 'duplicate the template')
    else if (a === 'rename') setRename({ id: t.id, name: t.name })
    else setDel(t)
  }

  return (
    <CompanyShell title="Templates" tabs={templateTabs()} from={from}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
        <SegmentedButton aria-label="Show" selectedKeys={[filter]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'all' || k === 'awaiting' || k === 'published' || k === 'draft') setFilter(k) }}>
          <SegmentedButtonItem id="all">All · {counts.all}</SegmentedButtonItem>
          {approval === 'required' || counts.awaiting > 0 ? <SegmentedButtonItem id="awaiting">Awaiting approval · {counts.awaiting}</SegmentedButtonItem> : null}
          <SegmentedButtonItem id="published">Published · {counts.published}</SegmentedButtonItem>
          <SegmentedButtonItem id="draft">Drafts · {counts.draft}</SegmentedButtonItem>
        </SegmentedButton>
        </div>
        <div className={styles.toolbarEnd}>
          {/* (REG-541) The tab's own New ▾ leads the cluster: Blank · a ready-made design · upload the quote sent today (REG-500); its kebab closes it. */}
          <LibraryNewButton open={newOpen} onOpenChange={setNewOpen}>
            <DropdownItem onSelect={() => { setNewOpen(false); void create(() => createTemplate({ source: { kind: 'blank' } }), 'create the template') }}>Blank template</DropdownItem>
            <DropdownItem onSelect={() => { setNewOpen(false); setHouseOpen(true) }}>Use a ready-made design</DropdownItem>
            <DropdownDivider />
            <DropdownItem onSelect={() => { setNewOpen(false); setRecreateOpen(true) }}>Upload my existing quote</DropdownItem>
          </LibraryNewButton>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search templates" label="Search templates" />
          {/* (REG-505) Column settings for the list, then the grid / list toggle — the Files tab's toolbar order. */}
          {view === 'list' ? (
            <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} /></Tooltip>
          ) : null}
          <span className={styles.viewToggle}>
            <SegmentedIconToggle label="View" value={view}
                                 options={[{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'view_kanban', label: 'Grid view' }]}
                                 onChange={(v) => setListPref(v === 'list')} />
          </span>
          <LibraryKebab open={kebabOpen} onOpenChange={setKebabOpen} deletedCount={deleted.length} onDeleted={() => setDeletedOpen(true)} />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className={styles.empty} role="status">
          <span className={styles.emptyGlyph}><Icon name="style" size={40} weight={300} /></span>
          <span className={styles.emptyTitle}>{query ? 'No templates match' : filter === 'draft' ? 'No drafts' : filter === 'awaiting' ? 'Nothing awaiting approval' : 'No templates yet'}</span>
          <span className={styles.emptyHelp}>{query ? 'Try another name.' : 'Use a ready-made design, or upload the quote you send today and we’ll rebuild it.'}</span>
        </div>
      ) : view === 'list' ? (
        <TemplatesTable rows={shown} brand={brand} sample={sample} now={now} onOpen={(t) => open(t.id)} onRowMenu={onAction} columns={columnPrefs.columns} onReorder={columnPrefs.reorder} />
      ) : (
        <div className={styles.grid} role="list" aria-label="Quote templates">
          {shown.map((t) => (
            <div key={t.id} className={styles.card} role="listitem" data-status={t.status} data-testid="template-card">
              <button type="button" className={styles.open} onClick={() => open(t.id)} aria-label={`Open ${t.name}`}>
                <span className={styles.thumb}>
                  <span className={styles.page}><TemplateThumb design={t.design} brand={brand} data={sample} width={phone ? 150 : 200} /></span>
                  {t.submitted ? <span className={styles.ribbon} data-tone="await">Awaiting approval</span> : t.status === 'draft' ? <span className={styles.ribbon}>Draft</span> : t.hasDraft ? <span className={styles.ribbon} data-tone="edits">Unpublished changes</span> : null}
                </span>
                <span className={styles.body}>
                  <span className={styles.nameRow}>
                    <span className={styles.name}>{t.name}</span>
                    {t.isDefault ? <MetaChip>Default</MetaChip> : null}
                  </span>
                  <span className={styles.meta}>{statusLine(t)}</span>
                </span>
              </button>
              {/* (REG-495) the usage line sits outside the card's button: "Used by n quotes" is a link to Tools › Quotes scoped to the template */}
              <span className={styles.usage}>{t.usedBy > 0 ? <Link href={`/quotes?template=${t.id}`} className={styles.usedLink} aria-label={`Quotes on ${t.name}`}>{usage(t)}</Link> : usage(t)} · {t.paper}{t.sourceFile ? ' · rebuilt from your quote' : ''}</span>
              <span className={styles.kebab}>
                <Tooltip label="More options" disabled={menuFor === t.id}>
                  <IconButton icon="more_vert" label={`More options for ${t.name}`} size={24} variant="bare" iconSize={24} iconWeight={300}
                              aria-haspopup="menu" aria-expanded={menuFor === t.id} onClick={() => setMenuFor((m) => (m === t.id ? null : t.id))} />
                </Tooltip>
                <TemplateMenu t={t} open={menuFor === t.id} onClose={() => setMenuFor(null)} onPick={(a) => onAction(t, a)} />
              </span>
            </div>
          ))}
        </div>
      )}

      <HouseStyleDialog open={houseOpen} brand={brand} sample={sample} onClose={() => setHouseOpen(false)}
                        onCreate={(key, name) => { setHouseOpen(false); void create(() => createTemplate({ name, source: { kind: 'preset', key } }), 'create the template') }} />
      <RecreateDialog open={recreateOpen} brand={brand} sample={sample} onClose={() => setRecreateOpen(false)}
                      onCreate={(key, name, sourceFile) => { setRecreateOpen(false); void create(() => createTemplate({ name, source: { kind: 'preset', key, sourceFile } }), 'create the template') }} />
      <Dialog open={rename.open} onClose={() => setRename(null)} title="Rename template" size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setRename(null)}>Cancel</Button><Button isDisabled={!rename.payload?.name.trim()} onPress={() => { const r = rename.payload; if (!r) return; setRename(null); void run('rename the template', () => renameTemplate(r.id, r.name), 'Template renamed') }}>Rename</Button></>}>
        <TextField label="Template name" required value={rename.payload?.name ?? ''} autoFocus onChange={(v) => setRenameState((r) => (r.payload ? { ...r, payload: { ...r.payload, name: v } } : r))}
                   onKeyDown={(e) => { if (e.key === 'Enter' && rename.payload?.name.trim()) { e.preventDefault(); const r = rename.payload!; setRename(null); void run('rename the template', () => renameTemplate(r.id, r.name), 'Template renamed') } }} />
      </Dialog>
      <ConfirmDialog open={delState.open} title={`Delete ${del?.name ?? 'template'}?`} confirmLabel="Delete"
                     message={del?.usedBy ? `${del.usedBy} quote${del.usedBy === 1 ? ' is' : 's are'} on this template. ${del.usedBy === 1 ? 'It keeps' : 'They keep'} printing as ${del.usedBy === 1 ? 'it is' : 'they are'}; no new quote can start on it. You can restore it from Deleted Templates.` : 'No quote is on it. You can restore it from Deleted Templates.'}
                     onCancel={() => setDel(null)} onConfirm={() => { const t = del; setDel(null); if (t) void run('delete the template', () => deleteTemplate(t.id), { message: `${t.name} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the template', () => restoreTemplate(t.id), `${t.name} restored`) } }) }} />
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      {/* (REG-511) The Deleted Files sheet's twin: ids in, one snackbar per action. */}
      <DeletedTemplatesSheet open={deletedOpen} deleted={deleted} brand={brand} sample={sample} onClose={() => setDeletedOpen(false)}
                             onRestore={(ids) => run('restore', () => restoreTemplates(ids), ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.name ?? 'Template'} restored` : `${ids.length} templates restored`)}
                             onDeleteForever={(ids) => run('delete', () => deleteTemplatesForever(ids), ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.name ?? 'Template'} deleted forever` : `${ids.length} templates deleted forever`)}
                             onEmptyTrash={() => run('empty the trash', () => emptyTemplateTrash(), 'Trash emptied')} />
    </CompanyShell>
  )
}
