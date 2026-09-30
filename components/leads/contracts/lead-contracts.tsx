'use client'

import { useRememberShape } from '@/lib/ghost-shape'
import { leadTabShape } from '@/components/leads/detail/tab-ghost-for'
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
import { bundleMessage, contractLink, firstName, reminderMessage } from '@/lib/contracts/model'
import { moveStageHref } from '@/lib/leads/move-link'
import { archiveContract, deleteContracts, listArchivedContracts, setContractStatus, unarchiveContracts } from '@/app/leads/contracts-actions'
import { ArchivedContractsSheet } from '@/components/contracts/archived-contracts-sheet'
import { createContractDoc, deleteContractsForever, emptyContractTrash, restoreContracts, sendBundle, shareContractLink } from '@/app/contracts/actions'
import { canDeleteContract, CONTRACT_DELETE_RULE, contractsDeletedLine, unsignBlock } from '@/lib/contracts/policy'
import { bundleBlockLine, quoteSendBlock, SEND_BLOCK_WORDS, sendBlock } from '@/lib/contracts/readiness'
import { MarkSignedDialog, SendContractDialog } from '@/components/contracts/editor/dialogs'
import { markContractSigned } from '@/app/contracts/actions'
import { UnsignDialog } from '@/components/contracts/unsign-dialog'
import { SendBundleDialog } from '@/components/contracts/send-bundle-dialog'
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
  useRememberShape(leadTabShape(leadId, 'contracts'), contracts.length === 0)   // (UX audit build) the shape this list opened on — its loading ghost draws the same one next time
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail, refresh } = useRun()
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
  const [bundleOpen, setBundleOpen] = useState(false)   /* (REG-591) */
  const [creating, setCreating] = useState(false)
  const [unsign, setUnsign] = useState<{ contract: Contract; to: 'Draft' | 'Sent to Client' } | null>(null)   /* (REG-631, parity Q-04) */
  const [marking, setMarking] = useState<Contract | null>(null)   /* (sweep S2 #3) Signed from a list asks for its date and copy */
  const [archivedOpen, setArchivedOpen] = useState(false)   /* (sweep S2 · U-07) */
  const loadArchived = useCallback(() => listArchivedContracts(leadId), [leadId])
  const statusBlock = useCallback((c: Contract, to: ContractStatus) => (to !== 'Signed' && c.status === 'Signed' ? unsignBlock(c, data.viewer) : null), [data.viewer])
  const deleteBlock = useCallback((c: Contract) => (canDeleteContract(data.viewer, c) ? null : CONTRACT_DELETE_RULE), [data.viewer])   /* (REG-634, parity Q-21) */
  const bundleable = useMemo(() => contracts.filter((c) => c.status !== 'Signed'), [contracts])
  /* (UX audit C2) the quote a contract names keeps it from going out while it is a Draft under required approval — checked here first, as Send is */
  const quoteBlockOf = useCallback((c: Contract) => quoteSendBlock(c.fromQuoteId ? data.quotes[c.fromQuoteId] : null, data.approvalRequired), [data.quotes, data.approvalRequired])
  const sayQuoteBlock = (c: Contract, why: string) => snackbar({ message: why, ...(c.fromQuoteId ? { actionLabel: 'Open the quote', onAction: () => router.push(withFrom(`/quotes/${c.fromQuoteId}`, from)) } : {}) })
  /* (UX audit C4) Send together's greyed row names the document that holds it back */
  const bundleBlock = useMemo(() => bundleBlockLine(bundleable.map((c) => ({ title: c.title, why: sendBlock(c) ?? quoteBlockOf(c) }))), [bundleable, quoteBlockOf])
  /* (UX audit C5) "Awaiting signature (n)": a press narrows the list to what is out for signature, a second press lets go */
  const awaitingCount = contracts.filter((c) => c.status === 'Sent to Client').length
  const awaitingOn = filters.status.length === 1 && filters.status[0] === 'Sent to Client'
  const [remind, setRemind] = useState<{ c: Contract; open: boolean } | null>(null)   // the last one stays while the dialog closes
  const reminding = remind?.c ?? null
  const closeRemind = () => setRemind((r) => (r ? { ...r, open: false } : r))
  /* (UX audit C1) a contract marked signed leads on to Won while the lead isn't there */
  const wonNext = (c: Contract) => (data.lead.stage && data.lead.stage !== 'Won' ? { actionLabel: 'Move to Won', onAction: () => router.push(moveStageHref(leadId, 'won', { contract: c.id })) } : {})

  const openEditor = (id: string) => router.push(withFrom(`/contracts/${id}`, from))
  /* One contract per press (RACE-05), then straight into the editor. */
  const create = async (input: Omit<Parameters<typeof createContractDoc>[0], 'leadId'>, done: string) => {
    if (creating) return
    setCreating(true)
    try { const id = await createContractDoc({ leadId, ...input }); snackbar({ message: done }); openEditor(id) }
    catch { fail('create the contract') } finally { setCreating(false) }
  }
  const newBlank = () => { void create({}, 'Contract created') }

  // The `?new=1` landing (the Overview's Contract quick link, the Won step's Create Contract) and the `om:contracts:new` event both create one and open it —
  // (REG-632, parity Q-13) from the studio's default template when one is set, else the starter agreement.
  useCreateIntent({ event: CREATE_EVENTS.contracts, landing: { href: from }, onIntent: () => { void create({ templateId: 'default' }, 'Contract created') } })

  const onStatus = (contract: Contract, status: ContractStatus) => {
    if (status === contract.status) return
    if (contract.status === 'Signed' && status !== 'Signed') { setUnsign({ contract, to: status }); return }   // (REG-631, parity Q-04) asks first
    /* (sweep S2 #3) the status menu keeps Send's checks, and Signed goes through Mark as signed — its date and its copy, as the editor asks */
    if (status === 'Sent to Client' && contract.status === 'Draft') {
      const why = sendBlock(contract); if (why) { snackbar({ message: SEND_BLOCK_WORDS[why] ?? 'It can’t go out yet' }); return }
      const q = quoteBlockOf(contract); if (q) { sayQuoteBlock(contract, q); return }
    }
    if (status === 'Signed') { setMarking(contract); return }
    void run('change the status', () => setContractStatus(contract.id, status), `Contract marked ${status}`)
  }
  const rowMenu = (contract: Contract, action: ContractRowAction) => {
    if (action === 'share') router.push(withFrom(`/contracts/${contract.id}/preview`, from))
    else if (action === 'copy') {
      /* (REG-591) a bundled document's link is the bundle's. (REG-631, parity Q-07) Copying a Draft's link shares it — Sent to Client from then on. */
      /* (UX audit C8, supersedes sweep S2 #2's order) Send's checks first, then the copy, then the share — never Sent over a copy that failed */
      if (contract.status === 'Draft') {
        const why = sendBlock(contract); if (why) { snackbar({ message: SEND_BLOCK_WORDS[why] ?? 'It can’t go out yet' }); return }
        const q = quoteBlockOf(contract); if (q) { sayQuoteBlock(contract, q); return }
      }
      const write = navigator.clipboard ? navigator.clipboard.writeText(contractLink(contract)) : Promise.reject(new Error('no clipboard'))
      if (contract.status === 'Draft') void write.then(() => { void run('share the link', () => shareContractLink(contract.id), 'Signing link copied — the contract is Sent to Client now') }, () => snackbar({ message: 'Couldn’t copy the link — the contract stays a Draft' }))
      else void write.then(() => snackbar({ message: 'Signing link copied' }), () => fail('copy the link'))
    }
    else if (action === 'remind') setRemind({ c: contract, open: true })
    else if (action === 'signed') setMarking(contract)
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
      <ContractsToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)} bare={contracts.length === 0}   /* (REG-735) the empty card carries New Contract's ways in */
        query={query} onQuery={setQuery}
        onNew={(kind) => (kind === 'blank' ? newBlank() : kind === 'template' ? setPickerOpen(true) : kind === 'import' ? setImportOpen(true) : comingSoon())}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={(a) => (a === 'templates' ? router.push(withFrom('/company/templates/contracts', from)) : a === 'archived' ? setArchivedOpen(true) : a === 'deleted' ? setDeletedOpen(true) : a === 'bundle' ? setBundleOpen(true) : comingSoon())}
        bundleBlock={bundleBlock}   /* (sweep S2 #7) what can go out — (UX audit C4) and which one can't */
        awaiting={{ count: awaitingCount, on: awaitingOn, onToggle: () => setFilters((f) => ({ ...f, status: awaitingOn ? [] : ['Sent to Client'] })) }}
      />
      {contracts.length === 0 ? (
        <ContractsEmpty onFromScratch={newBlank} onFromTemplate={() => setPickerOpen(true)} onImport={() => setImportOpen(true)} names={data.nextQuote} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="contracts" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_CONTRACT_FILTERS) }} />
      ) : (
        <ContractsTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          contracts={visible}
          onStatus={onStatus}
          onView={(c) => openEditor(c.id)}
          onRowMenu={rowMenu} statusBlock={statusBlock} deleteBlock={deleteBlock} now={now}
        />
      )}
      <ArchivedContractsSheet open={archivedOpen} onClose={() => setArchivedOpen(false)} load={loadArchived} crumb={`${data.lead.name} / Contracts`}
                              onUnarchive={async (ids) => { const r = await unarchiveContracts(ids); snackbar({ message: r.restored > 1 ? `${r.restored} contracts unarchived` : 'Contract unarchived' }); refresh() }} />
      <MarkSignedDialog open={!!marking} onClose={() => setMarking(null)} today={new Date(now)}
                        onSave={async (o) => { const m = marking; if (!m) return; const ok = await run('mark the contract signed', () => markContractSigned(m.id, o), { message: `${m.title} marked Signed`, ...wonNext(m) }); if (ok) setMarking(null) }} />
      {/* (UX audit C5) Send a reminder: the Send dialog with the same link and a nudge — WhatsApp opens on the press */}
      <SendContractDialog open={!!remind?.open} onClose={closeRemind} title="Send a reminder" subtitle={reminding ? `${reminding.title} is still waiting for a signature. Send via WhatsApp opens your chat with the client, the same link in the message.` : ''}
                          link={reminding ? contractLink(reminding) : ''} defaults={{ name: reminding?.recipientName || data.lead.name, phone: reminding?.recipientPhone || data.lead.phone }}
                          draft={(name) => reminderMessage({ clientFirst: firstName(name), studio: data.studioName, title: reminding?.title ?? 'agreement', link: reminding ? contractLink(reminding) : '' })}
                          onMarkSigned={() => { const r = reminding; closeRemind(); if (r) setMarking(r) }}
                          onSend={({ name, phone, message }) => {
                            window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
                            closeRemind()
                            snackbar({ message: `Reminder sent to ${name}` })
                          }} />
      <UnsignDialog to={unsign?.to ?? null} signedAt={unsign?.contract.signedAt ?? null} onCancel={() => setUnsign(null)}
                    onConfirm={() => { const u = unsign; setUnsign(null); if (u) void run('change the status', () => setContractStatus(u.contract.id, u.to), `Contract marked ${u.to}`) }} />
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <ContractsFiltersModal
        open={filtersOpen} value={filters} now={now}
        onApply={setFilters}   /* (REG-464) live — the modal closes on Done */
        onClose={() => setFiltersOpen(false)}
      />
      <DeleteContractsDialog
        open={!!deleting} count={deleting?.length ?? 1}
        onNo={() => setDeleting(null)}
        onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; void run('delete', async () => { const r = await deleteContracts(ids); snackbar({ message: contractsDeletedLine(r) }) }) }}
      />
      <ContractTemplatePicker open={pickerOpen} onClose={() => setPickerOpen(false)} load={loadTemplates}
                              onUse={(templateId) => { setPickerOpen(false); void create({ templateId }, 'Contract created from the template') }}
                              onStarter={() => { setPickerOpen(false); newBlank() }} />
      <ImportContractDialog open={importOpen} onClose={() => setImportOpen(false)}
                            onImport={(o) => { setImportOpen(false); void create({ upload: { fileName: o.fileName, signed: o.signed, title: o.title } }, o.signed ? 'Signed contract imported' : 'Contract imported') }} />
      {/* (REG-591) Send together: the WhatsApp window opens on the press (a popup blocker eats one opened after the round trip — REG-534), then the bundle is recorded. */}
      {/* (REG-633, E-118) addressed to the documents' recipient; Copy link records the bundle so the copied link opens */}
      <SendBundleDialog open={bundleOpen} onClose={() => setBundleOpen(false)} contracts={bundleable} quoteBlock={quoteBlockOf} defaults={{ name: bundleable[0]?.recipientName || data.lead.name, phone: bundleable[0]?.recipientPhone || data.lead.phone }}
                        onShare={({ bundleId, contractIds, name, phone }) => { void run('share the link', () => sendBundle(bundleId, contractIds, { name, phone }), 'Signing link copied — the documents are Sent to Client now') }}
                        draft={(name, titles, link) => bundleMessage({ clientFirst: firstName(name), studio: data.studioName, titles, link })}
                        onSend={({ bundleId, contractIds, name, phone, message }) => {
                          setBundleOpen(false)
                          window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
                          void run('send the documents', () => sendBundle(bundleId, contractIds, { name, phone }), `${contractIds.length} documents sent under one link`)
                        }} />
      <DeletedContractsSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} load={loadDeleted} crumb="Lead Details / Contracts"
                             onRestore={(ids) => run('restore', () => restoreContracts(ids), ids.length === 1 ? 'Contract restored' : `${ids.length} contracts restored`)}
                             onDeleteForever={(ids) => run('delete', () => deleteContractsForever(ids), 'Contract deleted forever')}
                             onEmptyTrash={() => run('empty the trash', () => emptyContractTrash(leadId), 'Trash emptied')} />
    </div>
  )
}
