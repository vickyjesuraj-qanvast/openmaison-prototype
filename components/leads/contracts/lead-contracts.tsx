'use client'

import { useMemo, useState } from 'react'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { Contract } from '@/lib/db/schema'
import { EMPTY_CONTRACT_FILTERS, activeContractFilterCount, applyContractFilters, searchContracts, type ContractFilters, type ContractStatus } from '@/lib/leads/contract-filters'
import type { LeadContractsData } from '@/lib/leads/contracts'
import { archiveContract, createContract, deleteContracts, setContractStatus } from '@/app/leads/contracts-actions'
import { ContractsToolbar } from './contracts-toolbar'
import { ContractsTable, type ContractRowAction } from './contracts-table'
import { ContractsEmpty } from './contracts-empty'
import { ContractsFiltersModal } from './contracts-filters-modal'
import { DeleteContractsDialog } from './delete-dialog'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { CONTRACT_COLUMN_DEFS } from './contracts-table'
import styles from './lead-contracts.module.css'

/**
 * Lead Details › Contracts (section 931-38609: 111 empty 931:38610 · 112 listing 931:38666): the tab's state —
 * toolbar, table or empty state, status changes, the row / header menus, filters and delete. The Quotes tab without the
 * selection + bulk bar and the due picker (the Contracts table has no selection column and no Due column — spec
 * design-source/context/lead-contracts/01-listing-empty.txt). Actions run through the tabs' shared `useRun`; the `?new=1`
 * landing and the `om:contracts:new` event through `useCreateIntent`.
 * The contract editor has no mock — "View", Preview and Share, PDF, Print, templates and settings answer coming soon.
 * Plan: design-source/context/lead-contracts/00-build-plan.md (REG-177…179).
 */
export function LeadContracts({ leadId, data }: { leadId: string; data: LeadContractsData }) {
  const { contracts, now } = data
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()

  /* ── list state ── */
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ContractFilters>(EMPTY_CONTRACT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  /* Column settings (REG-454): order · visibility · up to three pinned, kept per browser; the phone cards ignore them. */
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const columnPrefs = useTableColumns('lead-contracts', CONTRACT_COLUMN_DEFS, phone)
  const filterCount = activeContractFilterCount(filters)
  const visible = useMemo(() => searchContracts(applyContractFilters(contracts, filters, now), query), [contracts, filters, query, now])
  // Search / filters that match nothing → the listing's "No results found" card (T6); the bare head never shows.
  const nothingMatches = contracts.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0)

  /* ── overlays ── */
  const [deleting, setDeleting] = useState<string[] | null>(null)

  // One draft per press: a double click / a double event cannot create two (RACE-05).
  const newContract = () => run('create the contract', () => createContract(leadId), 'Contract created', { guard: 'create' })

  // Kept for parity with the Quotes tab: a `?new=1` landing creates one draft, then the param is dropped;
  // an `om:contracts:new` window event (e.g. a future Create quick link › Contract) creates a draft on this tab.
  useCreateIntent({ event: CREATE_EVENTS.contracts, landing: { href: `/leads/${leadId}/contracts` }, onIntent: () => { void newContract() } })

  const onStatus = (contract: Contract, status: ContractStatus) => {
    if (status === contract.status) return
    void run('change the status', () => setContractStatus(contract.id, status), `Contract marked ${status}`)
  }
  const rowMenu = (contract: Contract, action: ContractRowAction) => {
    if (action === 'copy') {
      const url = `${window.location.origin}/leads/${leadId}/contracts?open=${contract.id}`
      void navigator.clipboard?.writeText(url).then(() => snackbar({ message: 'Link copied' }), () => fail('copy the link'))
    } else if (action === 'archive') {
      // The Undo snackbar rides with the success (RACE-03): a failed archive shows only "Couldn’t archive the contract".
      void run('archive the contract', () => archiveContract(contract.id), { message: 'Contract archived', actionLabel: 'Undo', onAction: () => { void run('restore the contract', () => archiveContract(contract.id, true), 'Contract restored') } })
    } else if (action === 'delete') {
      setDeleting([contract.id])
    } else {
      comingSoon()   // Preview and Share · Download as PDF · Print — no mock beyond the menu item
    }
  }

  return (
    <div className={styles.tab}>
      <ContractsToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)}
        query={query} onQuery={setQuery}
        onNew={(kind) => (kind === 'blank' ? void newContract() : comingSoon())}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={comingSoon}
      />
      {contracts.length === 0 ? (
        <ContractsEmpty onFromScratch={() => { void newContract() }} onFromTemplate={comingSoon} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="contracts" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_CONTRACT_FILTERS) }} />
      ) : (
        <ContractsTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          contracts={visible}
          onStatus={onStatus}
          onView={comingSoon}
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
    </div>
  )
}
