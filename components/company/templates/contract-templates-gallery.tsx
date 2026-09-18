'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { SegmentedIconToggle } from '@/components/om/segmented'
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
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { CompanyShell, templateTabs } from '@/components/company/company-shell'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import { excerptOf } from '@/lib/contracts/tokens'
import { ago } from '@/lib/templates/ago'
import { displayDate } from '@/lib/format'
import type { ContractTemplateRow, ContractTemplatesData } from '@/lib/contracts/queries'
import { contractFromTemplate, createContractTemplate, deleteContractTemplate, deleteContractTemplatesForever, duplicateContractTemplate, emptyContractTemplateTrash, renameContractTemplate, restoreContractTemplates } from '@/app/company/contract-templates-actions'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import type { TokenValues } from '@/lib/contracts/tokens'
import { CONTRACT_TEMPLATE_COLUMN_DEFS, ContractTemplatesTable } from './contract-templates-table'
import gallery from './quote-templates-gallery.module.css'
import styles from './contract-templates-gallery.module.css'

type Action = 'open' | 'newContract' | 'duplicate' | 'rename' | 'delete'

/**
 * Company › Templates › Contracts (REG-534): the Quotes gallery's shell (its stylesheet reused) on a simple library — cards
 * with a paper thumbnail, the name, "Edited … · Used by n"; New template ▾ (Blank · Studio agreement); the grid / list toggle;
 * the kebab with Deleted Templates. Open lands in the contract template editor. No versions, no approval (owner 2026-09-18).
 */
export function ContractTemplatesGallery({ data, brand, studio, values }: { data: ContractTemplatesData; brand: BrandKit; studio: StudioDetails; values: TokenValues }) {
  const { templates, deleted, leads, now } = data
  const router = useRouter()
  const { run, fail } = useRun()
  const phone = useMediaQuery(MOBILE)
  const [query, setQuery] = useState('')
  const [listPref, setListPref] = useFlagPref('om.contract-templates.list', false)
  const view: 'grid' | 'list' = phone || !listPref ? 'grid' : 'list'
  /* (REG-537) The Quotes gallery's toolbar: a segment filter on the left, Column settings + the view toggle on the right. */
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const columnPrefs = useTableColumns('contract-templates', CONTRACT_TEMPLATE_COLUMN_DEFS, phone)
  const counts = useMemo(() => ({ all: templates.length, used: templates.filter((t) => t.usedBy > 0).length, unused: templates.filter((t) => t.usedBy === 0).length }), [templates])
  const [newOpen, setNewOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null)
  const [del, setDel] = useState<ContractTemplateRow | null>(null)
  const [pickFor, setPickFor] = useState<string | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [busyDeleted, setBusyDeleted] = useState(false)
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); const base = filter === 'used' ? templates.filter((t) => t.usedBy > 0) : filter === 'unused' ? templates.filter((t) => t.usedBy === 0) : templates; return q ? base.filter((t) => t.title.toLowerCase().includes(q) || excerptOf(t.body, 400).toLowerCase().includes(q)) : base }, [templates, query, filter])
  const open = useCallback((id: string) => router.push(`/templates/contracts/${id}?from=${encodeURIComponent('/company/templates/contracts')}`), [router])
  const create = async (fn: () => Promise<string>, what: string) => { try { open(await fn()) } catch { fail(what) } }
  const onAction = (t: ContractTemplateRow, a: Action) => {
    setMenuFor(null)
    if (a === 'open') open(t.id)
    else if (a === 'newContract') setPickFor(t.id)
    else if (a === 'duplicate') void create(() => duplicateContractTemplate(t.id), 'duplicate the template')
    else if (a === 'rename') setRename({ id: t.id, name: t.title })
    else setDel(t)
  }
  const usage = (t: ContractTemplateRow) => (t.usedBy === 0 ? 'Not used yet' : `Used by ${t.usedBy} ${t.usedBy === 1 ? 'contract' : 'contracts'}`)
  const menu = (t: ContractTemplateRow, open: boolean = menuFor === t.id, side: 'up' | 'down' = 'down', onClose: () => void = () => setMenuFor(null)) => (
    <Dropdown open={open} onClose={onClose} align="right" side={side} width={264} sheetTitle={t.title}>
      <DropdownItem onSelect={() => onAction(t, 'open')}>Open</DropdownItem>
      <DropdownItem onSelect={() => onAction(t, 'newContract')}>New contract from this template</DropdownItem>
      <DropdownDivider />
      <DropdownItem onSelect={() => onAction(t, 'duplicate')}>Duplicate</DropdownItem>
      <DropdownItem onSelect={() => onAction(t, 'rename')}>Rename</DropdownItem>
      <DropdownDivider />
      <DropdownItem tone="danger" onSelect={() => onAction(t, 'delete')}>Delete</DropdownItem>
    </Dropdown>
  )

  return (
    <CompanyShell title="Templates" tabs={templateTabs()} actions={
      <span className={gallery.newAnchor}>
        <Button iconStart={<Icon name="add" size={20} />} iconEnd={<Icon name="keyboard_arrow_down" size={20} />} onPress={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen}>New template</Button>
        <Dropdown open={newOpen} onClose={() => setNewOpen(false)} align="right" width={264} sheetTitle="New template">
          <DropdownItem onSelect={() => { setNewOpen(false); void create(() => createContractTemplate({ source: { kind: 'blank' } }), 'create the template') }}>Blank template</DropdownItem>
          <DropdownItem onSelect={() => { setNewOpen(false); void create(() => createContractTemplate({ source: { kind: 'starter' } }), 'create the template') }}>From the studio agreement</DropdownItem>
        </Dropdown>
        <span className={gallery.kebabAnchor}>
          <Tooltip label="More options" disabled={kebabOpen}><IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} /></Tooltip>
          <Dropdown open={kebabOpen} onClose={() => setKebabOpen(false)} align="right" sheetTitle="Templates">
            <DropdownItem onSelect={() => { setKebabOpen(false); setDeletedOpen(true) }}>Deleted Templates{deleted.length ? ` · ${deleted.length}` : ''}</DropdownItem>
          </Dropdown>
        </span>
      </span>
    }>
      <div className={gallery.toolbar}>
        <div className={gallery.filters}>
          <SegmentedButton aria-label="Show" selectedKeys={[filter]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'all' || k === 'used' || k === 'unused') setFilter(k) }}>
            <SegmentedButtonItem id="all">All · {counts.all}</SegmentedButtonItem>
            <SegmentedButtonItem id="used">In use · {counts.used}</SegmentedButtonItem>
            <SegmentedButtonItem id="unused">Not used yet · {counts.unused}</SegmentedButtonItem>
          </SegmentedButton>
        </div>
        <div className={gallery.toolbarEnd}>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search templates" label="Search templates" />
          {view === 'list' ? (
            <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} /></Tooltip>
          ) : null}
          <span className={gallery.viewToggle}>
            <SegmentedIconToggle label="View" value={view} options={[{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'view_kanban', label: 'Grid view' }]} onChange={(v) => setListPref(v === 'list')} />
          </span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className={gallery.empty} role="status">
          <span className={gallery.emptyGlyph}><Icon name="contract" size={40} weight={300} /></span>
          <span className={gallery.emptyTitle}>{query ? 'No templates match' : filter === 'used' ? 'No template is in use' : filter === 'unused' ? 'Every template is in use' : 'No contract templates yet'}</span>
          <span className={gallery.emptyHelp}>{query ? 'Try another name.' : 'Start from the studio agreement, or save any contract as a template from its editor.'}</span>
        </div>
      ) : view === 'list' ? (
        <ContractTemplatesTable rows={shown} now={now} onOpen={(t) => open(t.id)} columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
                                menu={(t, isOpen, side, onClose) => menu(t, isOpen, side, onClose)} />
      ) : (
        <div className={gallery.grid} role="list" aria-label="Contract templates">
          {shown.map((t) => (
            <div key={t.id} className={gallery.card} role="listitem" data-testid="contract-template-card">
              <button type="button" className={gallery.open} onClick={() => open(t.id)} aria-label={`Open ${t.title}`}>
                <span className={gallery.thumb}>
                  <span className={styles.thumbPage}><span className={styles.thumbScale}><ContractPaper html={t.body} values={values} brand={brand} studio={studio} studioSignature={null} client={null} compact width={600} /></span></span>
                </span>
                <span className={gallery.body}>
                  <span className={gallery.nameRow}><span className={gallery.name}>{t.title}</span>{t.usedBy > 0 ? <MetaChip>In use</MetaChip> : null}</span>
                  <span className={gallery.meta}>Edited {ago(t.updatedAt.getTime(), now)}{t.author ? ` by ${t.author}` : ''}</span>
                </span>
              </button>
              <span className={gallery.usage}>{usage(t)}</span>
              <span className={gallery.kebab}>
                <Tooltip label="More options" disabled={menuFor === t.id}><IconButton icon="more_vert" label={`More options for ${t.title}`} size={24} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuFor === t.id} onClick={() => setMenuFor((m) => (m === t.id ? null : t.id))} /></Tooltip>
                {menu(t)}
              </span>
            </div>
          ))}
        </div>
      )}

      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <PickLeadDialog open={!!pickFor} onClose={() => setPickFor(null)} leads={leads} onPick={(leadId) => { const id = pickFor; setPickFor(null); if (id) void contractFromTemplate(id, leadId).then((cid) => router.push(`/contracts/${cid}?from=${encodeURIComponent('/company/templates/contracts')}`), () => fail('create the contract')) }} />
      <Dialog open={!!rename} onClose={() => setRename(null)} title="Rename template" size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setRename(null)}>Cancel</Button><Button isDisabled={!rename?.name.trim()} onPress={() => { const r = rename; if (!r) return; setRename(null); void run('rename the template', () => renameContractTemplate(r.id, r.name), 'Template renamed') }}>Rename</Button></>}>
        <TextField label="Template name" required value={rename?.name ?? ''} autoFocus onChange={(v) => setRename((r) => (r ? { ...r, name: v } : r))}
                   onKeyDown={(e) => { if (e.key === 'Enter' && rename?.name.trim()) { e.preventDefault(); const r = rename; setRename(null); void run('rename the template', () => renameContractTemplate(r.id, r.name), 'Template renamed') } }} />
      </Dialog>
      <ConfirmDialog open={!!del} title={`Delete ${del?.title ?? 'template'}?`} confirmLabel="Delete"
                     message={del?.usedBy ? `${del.usedBy} ${del.usedBy === 1 ? 'contract keeps its' : 'contracts keep their'} own copy of the document. You can restore the template from Deleted Templates.` : 'You can restore it from Deleted Templates.'}
                     onCancel={() => setDel(null)} onConfirm={() => { const t = del; setDel(null); if (t) void run('delete the template', () => deleteContractTemplate(t.id), { message: `${t.title} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the template', () => restoreContractTemplates([t.id]), `${t.title} restored`) } }) }} />
      {/* Deleted Templates: the sheet's shell on the library's rows — Restore · Delete forever · Empty Trash. */}
      <Dialog open={deletedOpen} onClose={() => setDeletedOpen(false)} title="Deleted Templates" eyebrow="Company / Templates / Contracts" size="modal" width={1200} height={560} portal
              footer={<Button variant="secondary" appearance="outlined" onPress={() => setDeletedOpen(false)}>Close</Button>}>
        <div className={styles.deletedHead}>
          <span className={styles.excerpt}>Deleted templates stay here until you delete them forever.</span>
          <Button variant="secondary" appearance="outlined" isDisabled={!deleted.length || busyDeleted} onPress={() => { setBusyDeleted(true); void run('empty the trash', () => emptyContractTemplateTrash(), 'Trash emptied').finally(() => setBusyDeleted(false)) }}>Empty Trash</Button>
        </div>
        <div className={styles.table} role="table" aria-label="Deleted templates" data-testid="deleted-contract-templates">
          <div className={styles.row} role="row" data-head=""><span role="columnheader" className={styles.cell}>Template</span><span role="columnheader" className={styles.cell}>Deleted</span><span role="columnheader" className={styles.cell}>By</span><span role="columnheader" className={styles.cell}>Used by</span><span role="columnheader" className={`${styles.cell} ${styles.actionsCell}`}>Actions</span></div>
          {deleted.length === 0 ? <div className={styles.emptyRow} role="status">No deleted templates.</div> : deleted.map((t) => (
            <div key={t.id} className={styles.row} role="row">
              <span role="cell" className={`${styles.cell} ${styles.titleCell}`}><span className={styles.titleText}>{t.title}</span></span>
              <span role="cell" className={styles.cell}>{t.deletedAt ? displayDate(t.deletedAt) : '-'}</span>
              <span role="cell" className={styles.cell}>{t.author ?? '-'}</span>
              <span role="cell" className={styles.cell}>{t.usedBy}</span>
              <span role="cell" className={`${styles.cell} ${styles.actionsCell}`}>
                <Button variant="secondary" appearance="outlined" isDisabled={busyDeleted} onPress={() => { void run('restore', () => restoreContractTemplates([t.id]), `${t.title} restored`) }}>Restore</Button>
                <Button variant="secondary" appearance="outlined" isDisabled={busyDeleted} onPress={() => { void run('delete', () => deleteContractTemplatesForever([t.id]), `${t.title} deleted forever`) }}>Delete Forever</Button>
              </span>
            </div>
          ))}
        </div>
      </Dialog>
    </CompanyShell>
  )
}
