'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { Contract } from '@/lib/db/schema'
import { EMPTY_CONTRACT_FILTERS, activeContractFilterCount, applyContractFilters, searchContracts, type ContractFilters, type ContractStatus } from '@/lib/leads/contract-filters'
import type { LeadContractsData } from '@/lib/leads/contracts'
import { withFrom } from '@/lib/nav'
import { signingLink } from '@/lib/contracts/model'
import { archiveContract, deleteContracts, setContractStatus } from '@/app/leads/contracts-actions'
import { createContractDoc, deleteContractsForever, emptyContractTrash, restoreContracts } from '@/app/contracts/actions'
import { fetchContractTemplateOptionsAction, fetchDeletedContractsAction } from '@/app/contracts/read-actions'
import { ContractTemplatePicker } from '@/components/contracts/contract-template-picker'
import { ImportContractDialog } from '@/components/contracts/import-contract-dialog'
import { DeletedContractsSheet } from '@/components/contracts/deleted-contracts-sheet'
import { ContractsToolbar } from './contracts-toolbar'
import { ContractsTable, contractColumnDefs, type ContractRowAction } from './contracts-table'
import { ContractsEmpty } from './contracts-empty'
import { ContractsFiltersModal } from './contracts-filters-modal'
import { DeleteContractsDialog } from './delete-dialog'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import styles from './lead-contracts.module.css'

/**
 * Lead Details › Contracts (section 931-38609: 111 empty 931:38610 · 112 listing 931:38666): the tab's state — toolbar,
 * table or empty state, status changes, the row / header menus, filters and delete. The Quotes tab without the selection +
 * bulk bar and the due picker (spec design-source/context/lead-contracts/01-listing-empty.txt).
 * (REG-534) Every ingress now lands somewhere: View and From Blank open the contract editor (`/contracts/[id]`), From Template
 * the picker, Import from File the import dialog, Preview and Share the preview, Copy Link the signing link, PDF / Print the
 * preview's print, Manage Templates the Company gallery, Deleted Contracts the sheet. Create with AI and Contracts Settings
 * still answer coming soon. Plan: design-source/context/lead-contracts/00-build-plan.md (REG-177…179).
 */
export function LeadContracts({ leadId, data }: { leadId: string; data: LeadContractsData }) {
  const { contracts, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()
  const from = `/leads/${leadId}/contracts`

  /* ── list state ── */
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ContractFilters>(EMPTY_CONTRACT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const defs = useMemo(() => contractColumnDefs(false), [])
  const columnPrefs = useTableColumns('lead-contracts', defs, phone)
  const filterCount = activeContractFilterCount(filters)
  const visible = useMemo(() => searchContracts(applyContractFilters(contracts, filters, now), query), [contracts, filters, query, now])
  const nothingMatches = contracts.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0)

  /* ── overlays ── */
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const openEditor = (id: string) => router.push(withFrom(`/contracts/${id}`, from))
  /* One contract per press (RACE-05), then straight into the editor. */
  const create = async (input: Omit<Parameters<typeof createContractDoc>[0], 'leadId'>, done: string) => {
    if (creating) return
    setCreating(true)
    try { const id = await createContractDoc({ leadId, ...input }); snackbar({ message: done }); openEditor(id) }
    catch { fail('create the contract') } finally { setCreating(false) }
  }
  const newBlank = () => { void create({}, 'Contract created') }

  // The `?new=1` landing (the Overview's Contract quick link, the Won step's Create Contract) and the `om:contracts:new` event both create one and open it.
  useCreateIntent({ event: CREATE_EVENTS.contracts, landing: { href: from }, onIntent: () => { newBlank() } })

  const onStatus = (contract: Contract, status: ContractStatus) => {
    if (status === contract.status) return
    void run('change the status', () => setContractStatus(contract.id, status), `Contract marked ${status}`)
  }
  const rowMenu = (contract: Contract, action: ContractRowAction) => {
    if (action === 'share') router.push(withFrom(`/contracts/${contract.id}/preview`, from))
    else if (action === 'copy') void navigator.clipboard?.writeText(signingLink(contract.id)).then(() => snackbar({ message: 'Signing link copied' }), () => fail('copy the link'))
    else if (action === 'pdf' || action === 'print') router.push(withFrom(`/contracts/${contract.id}/preview?print=1`, from))
    else if (action === 'archive') {
      // The Undo snackbar rides with the success (RACE-03): a failed archive shows only "Couldn’t archive the contract".
      void run('archive the contract', () => archiveContract(contract.id), { message: 'Contract archived', actionLabel: 'Undo', onAction: () => { void run('restore the contract', () => archiveContract(contract.id, true), 'Contract restored') } })
    } else setDeleting([contract.id])
  }
  const loadDeleted = useCallback(() => fetchDeletedContractsAction(leadId), [leadId])
  const loadTemplates = useCallback(() => fetchContractTemplateOptionsAction(), [])

  return (
    <div className={styles.tab}>
      <ContractsToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)}
        query={query} onQuery={setQuery}
        onNew={(kind) => (kind === 'blank' ? newBlank() : kind === 'template' ? setPickerOpen(true) : kind === 'import' ? setImportOpen(true) : comingSoon())}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={(a) => (a === 'templates' ? router.push('/company/templates/contracts') : a === 'deleted' ? setDeletedOpen(true) : comingSoon())}
      />
      {contracts.length === 0 ? (
        <ContractsEmpty onFromScratch={newBlank} onFromTemplate={() => setPickerOpen(true)} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="contracts" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_CONTRACT_FILTERS) }} />
      ) : (
        <ContractsTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          contracts={visible}
          onStatus={onStatus}
          onView={(c) => openEditor(c.id)}
          onRowMenu={rowMenu}
        />
      )}
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <ContractsFiltersModal
        open={filtersOpen} value={filters} now={now}
        onApply={setFilters}   /* (REG-464) live — the modal closes on Done */
        onClose={() => setFiltersOpen(false)}
      />
      <DeleteContractsDialog
        open={!!deleting} count={deleting?.length ?? 1}
        onNo={() => setDeleting(null)}
        onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; void run('delete', () => deleteContracts(ids), ids.length === 1 ? 'Contract deleted' : `${ids.length} contracts deleted`) }}
      />
      <ContractTemplatePicker open={pickerOpen} onClose={() => setPickerOpen(false)} load={loadTemplates}
                              onUse={(templateId) => { setPickerOpen(false); void create({ templateId }, 'Contract created from the template') }}
                              onStarter={() => { setPickerOpen(false); newBlank() }} />
      <ImportContractDialog open={importOpen} onClose={() => setImportOpen(false)}
                            onImport={(o) => { setImportOpen(false); void create({ upload: { fileName: o.fileName, signed: o.signed, title: o.title } }, o.signed ? 'Signed contract imported' : 'Contract imported') }} />
      <DeletedContractsSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} load={loadDeleted} crumb="Lead Details / Contracts"
                             onRestore={(ids) => run('restore', () => restoreContracts(ids), ids.length === 1 ? 'Contract restored' : `${ids.length} contracts restored`)}
                             onDeleteForever={(ids) => run('delete', () => deleteContractsForever(ids), 'Contract deleted forever')}
                             onEmptyTrash={() => run('empty the trash', () => emptyContractTrash(leadId), 'Trash emptied')} />
    </div>
  )
}
