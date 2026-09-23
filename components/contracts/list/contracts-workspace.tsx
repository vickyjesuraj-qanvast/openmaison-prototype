'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { LeadsSkeleton } from '@/components/shell/skeleton'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { ContractsToolbar } from '@/components/leads/contracts/contracts-toolbar'
import { ContractsTable, contractColumnDefs, type ContractRowAction } from '@/components/leads/contracts/contracts-table'
import { ContractsEmpty } from '@/components/leads/contracts/contracts-empty'
import { ContractsFiltersModal } from '@/components/leads/contracts/contracts-filters-modal'
import { DeleteContractsDialog } from '@/components/leads/contracts/delete-dialog'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import type { Contract } from '@/lib/db/schema'
import { EMPTY_CONTRACT_FILTERS, activeContractFilterCount, applyContractFilters, searchContracts, type ContractFilters, type ContractStatus } from '@/lib/leads/contract-filters'
import type { StudioContractsData } from '@/lib/contracts/queries'
import { signingLink } from '@/lib/contracts/model'
import { archiveContract, deleteContracts, setContractStatus } from '@/app/leads/contracts-actions'
import { createContractDoc, deleteContractsForever, emptyContractTrash, restoreContracts } from '@/app/contracts/actions'
import { fetchContractTemplateOptionsAction, fetchDeletedContractsAction } from '@/app/contracts/read-actions'
import { ContractTemplatePicker } from '@/components/contracts/contract-template-picker'
import { ImportContractDialog } from '@/components/contracts/import-contract-dialog'
import { DeletedContractsSheet } from '@/components/contracts/deleted-contracts-sheet'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import pageStyles from '@/app/leads/leads.module.css'
import styles from '@/components/quotes/list/quotes-workspace.module.css'

type Pending = { kind: 'blank' } | { kind: 'template'; templateId: string | null } | { kind: 'import'; title: string; fileName: string; signed: boolean }

/**
 * Tools › Contracts (REG-534; the quotes list's twin, REG-422): every live contract in the studio — the Contracts tab's
 * toolbar, table (plus a Lead column linking to the lead's tab), filters and dialogs — with New Contract asking which lead
 * first. Rows open the editor; Preview and Share the preview; Copy Link the signing link.
 */
export function ContractsWorkspace({ data }: { data: StudioContractsData }) {
  const { contracts, leads, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()
  const leadName = useMemo(() => new Map(contracts.map((c) => [c.id, c.leadName])), [contracts])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ContractFilters>(EMPTY_CONTRACT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const defs = useMemo(() => contractColumnDefs(true), [])
  const columnPrefs = useTableColumns('studio-contracts', defs, phone)
  const filterCount = activeContractFilterCount(filters)
  const visible = useMemo(() => searchContracts(applyContractFilters(contracts, filters, now), query), [contracts, filters, query, now])
  const nothingMatches = contracts.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const from = '/contracts'
  const openEditor = (id: string) => router.push(withFrom(`/contracts/${id}`, from))

  /* New Contract: the kind first, then the lead, then the editor. */
  const createFor = async (leadId: string, p: Pending) => {
    try {
      const id = await createContractDoc(p.kind === 'blank' ? { leadId } : p.kind === 'template' ? { leadId, templateId: p.templateId } : { leadId, upload: { fileName: p.fileName, signed: p.signed, title: p.title } })
      snackbar({ message: p.kind === 'import' ? (p.signed ? 'Signed contract imported' : 'Contract imported') : 'Contract created' })
      openEditor(id)
    } catch { fail('create the contract') }
  }
  const onNew = (kind: 'blank' | 'template' | 'import' | 'ai') => {
    if (kind === 'blank') setPending({ kind: 'blank' })
    else if (kind === 'template') setPickerOpen(true)
    else if (kind === 'import') setImportOpen(true)
    else comingSoon()   // Create with AI — Maison AI's generative side is not in this build (REG-534)
  }
  const onStatus = (c: Contract, status: ContractStatus) => { if (status !== c.status) void run('change the status', () => setContractStatus(c.id, status), `Contract marked ${status}`) }
  const rowMenu = (c: Contract, action: ContractRowAction) => {
    if (action === 'share') router.push(withFrom(`/contracts/${c.id}/preview`, from))
    else if (action === 'copy') void navigator.clipboard?.writeText(signingLink(c.id)).then(() => snackbar({ message: 'Signing link copied' }), () => fail('copy the link'))
    else if (action === 'pdf' || action === 'print') router.push(withFrom(`/contracts/${c.id}/preview?print=1`, from))
    else if (action === 'archive') void run('archive the contract', () => archiveContract(c.id), { message: 'Contract archived', actionLabel: 'Undo', onAction: () => { void run('restore the contract', () => archiveContract(c.id, true), 'Contract restored') } })
    else setDeleting([c.id])
  }
  const loadDeleted = useCallback(() => fetchDeletedContractsAction(null), [])
  const loadTemplates = useCallback(() => fetchContractTemplateOptionsAction(), [])

  return (
    <PageReveal skeleton={<LeadsSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid="contracts-workspace">
        <PageHeader title="Contracts" />
        <div className={styles.frame}>
          <ContractsToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)} query={query} onQuery={setQuery} onNew={onNew} onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
                            onMenu={(a) => (a === 'templates' ? router.push(withFrom('/company/templates/contracts', from)) : a === 'deleted' ? setDeletedOpen(true) : comingSoon())} />
          {contracts.length === 0 ? (
            <ContractsEmpty onFromScratch={() => setPending({ kind: 'blank' })} onFromTemplate={() => setPickerOpen(true)} />
          ) : nothingMatches ? (
            <TabSearchEmpty noun="contracts" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_CONTRACT_FILTERS) }} />
          ) : (
            <ContractsTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder} contracts={visible} onStatus={onStatus} onView={(c) => openEditor(c.id)} onRowMenu={rowMenu}
                            leadOf={(c) => ({ name: leadName.get(c.id) ?? '', href: withFrom(`/leads/${c.leadId}/contracts`, from) })} />
          )}
        </div>
        <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
        <ContractsFiltersModal open={filtersOpen} value={filters} now={now} onApply={setFilters} onClose={() => setFiltersOpen(false)} />
        <DeleteContractsDialog open={!!deleting} count={deleting?.length ?? 1} onNo={() => setDeleting(null)}
                               onYes={() => { const ids = deleting; setDeleting(null); if (ids) void run('delete', () => deleteContracts(ids), ids.length === 1 ? 'Contract deleted' : `${ids.length} contracts deleted`) }} />
        <ContractTemplatePicker open={pickerOpen} onClose={() => setPickerOpen(false)} load={loadTemplates}
                                onUse={(templateId) => { setPickerOpen(false); setPending({ kind: 'template', templateId }) }} onStarter={() => { setPickerOpen(false); setPending({ kind: 'template', templateId: null }) }} />
        <ImportContractDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(o) => { setImportOpen(false); setPending({ kind: 'import', ...o }) }} />
        <PickLeadDialog open={!!pending} onClose={() => setPending(null)} leads={leads} onPick={(leadId) => { const p = pending; setPending(null); if (p && leadId) void createFor(leadId, p) }} />
        <DeletedContractsSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} load={loadDeleted} crumb="Tools / Contracts" showLead
                               onRestore={(ids) => run('restore', () => restoreContracts(ids), ids.length === 1 ? 'Contract restored' : `${ids.length} contracts restored`)}
                               onDeleteForever={(ids) => run('delete', () => deleteContractsForever(ids), 'Contract deleted forever')}
                               onEmptyTrash={() => run('empty the trash', () => emptyContractTrash(null), 'Trash emptied')} />
      </div>
    </PageReveal>
  )
}
