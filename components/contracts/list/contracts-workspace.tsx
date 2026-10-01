'use client'

import { useRememberShape } from '@/lib/ghost-shape'
import { copyText } from '@/lib/clipboard'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { ContractsListGhost } from '@/components/shell/list-ghosts'
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
import { bundleMessage, contractLink, firstName, reminderMessage } from '@/lib/contracts/model'
import { moveStageHref } from '@/lib/leads/move-link'
import { SendBundleDialog } from '@/components/contracts/send-bundle-dialog'
import { archiveContract, deleteContracts, listArchivedContracts, setContractStatus, unarchiveContracts } from '@/app/leads/contracts-actions'
import { ArchivedContractsSheet } from '@/components/contracts/archived-contracts-sheet'
import { createContractDoc, deleteContractsForever, emptyContractTrash, restoreContracts, sendBundle, shareContractLink } from '@/app/contracts/actions'
import { canDeleteContract, CONTRACT_DELETE_RULE, contractsDeletedLine, unsignBlock } from '@/lib/contracts/policy'
import { bundleBlockLine, quoteSendBlock, SEND_BLOCK_WORDS, sendBlock } from '@/lib/contracts/readiness'
import { MarkSignedDialog, SendContractDialog } from '@/components/contracts/editor/dialogs'
import { markContractSigned } from '@/app/contracts/actions'
import { UnsignDialog } from '@/components/contracts/unsign-dialog'
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
  useRememberShape('tools.contracts', contracts.length === 0)   // (UX audit build) the shape this list opened on — its loading ghost draws the same one next time
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail, refresh } = useRun()
  const leadName = useMemo(() => new Map(contracts.map((c) => [c.id, c.leadName])), [contracts])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ContractFilters>(EMPTY_CONTRACT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const defs = useMemo(() => contractColumnDefs(true), [])
  const columnPrefs = useTableColumns('studio-contracts', defs, phone)
  const filterCount = activeContractFilterCount(filters)
  /* (REG-634, contracts parity E-125) the studio list searches the lead's name as well */
  const visible = useMemo(() => searchContracts(applyContractFilters(contracts, filters, now), query, (c) => c.leadName), [contracts, filters, query, now])
  const nothingMatches = contracts.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [creating, setCreating] = useState(false)   /* (Dane UAT 8.02) the lead question reads "Creating…" until the editor takes over */
  const [unsign, setUnsign] = useState<{ contract: Contract; to: 'Draft' | 'Sent to Client' } | null>(null)   /* (REG-631, parity Q-04) */
  const [marking, setMarking] = useState<Contract | null>(null)   /* (sweep S2 #3) Signed from a list asks for its date and copy */
  const [archivedOpen, setArchivedOpen] = useState(false)   /* (sweep S2 · U-07) */
  const loadArchived = useCallback(() => listArchivedContracts(null), [])
  /* (REG-634, parity E-125) Send together from the studio list: the lead first (those with two or more documents to sign), then the tab's dialog. */
  const bundleable = useMemo(() => contracts.filter((c) => c.status !== 'Signed'), [contracts])
  /* (UX audit C2) the quote a contract names keeps it from going out while it is a Draft under required approval — checked here first, as Send is */
  const quoteBlockOf = useCallback((c: Contract) => quoteSendBlock(c.fromQuoteId ? data.quotes[c.fromQuoteId] : null, data.approvalRequired), [data.quotes, data.approvalRequired])
  const sayQuoteBlock = (c: Contract, why: string) => snackbar({ message: why, ...(c.fromQuoteId ? { actionLabel: 'Open the quote', onAction: () => router.push(withFrom(`/quotes/${c.fromQuoteId}`, '/contracts')) } : {}) })
  const bundleLeads = useMemo(() => leads.filter((l) => bundleable.filter((c) => c.leadId === l.id && !sendBlock(c) && !quoteBlockOf(c)).length >= 2), [leads, bundleable, quoteBlockOf])   // (sweep S2 #7) two that can go out
  /* (UX audit C4) Send together's greyed row names what holds it back — on the first lead with two or more documents to sign */
  const bundleBlock = useMemo(() => {
    if (bundleLeads.length) return null
    const held = leads.map((l) => bundleable.filter((c) => c.leadId === l.id)).find((docs) => docs.length >= 2)
    return held ? bundleBlockLine(held.map((c) => ({ title: `${c.title} (${c.leadName})`, why: sendBlock(c) ?? quoteBlockOf(c) }))) : 'needs a lead with two documents ready to go'
  }, [bundleLeads, leads, bundleable, quoteBlockOf])
  /* (UX audit C5) "Awaiting signature (n)" — a press narrows the list to what is out for signature, a second press lets go */
  const awaitingCount = contracts.filter((c) => c.status === 'Sent to Client').length
  const awaitingOn = filters.status.length === 1 && filters.status[0] === 'Sent to Client'
  const [remind, setRemind] = useState<{ c: (typeof contracts)[number]; open: boolean } | null>(null)   // the last one stays while the dialog closes
  const reminding = remind?.c ?? null
  const closeRemind = () => setRemind((r) => (r ? { ...r, open: false } : r))
  /* (UX audit C1) a contract marked signed leads on to Won while its lead isn't there */
  const wonNext = (c: Contract) => { const stage = contracts.find((x) => x.id === c.id)?.leadStage; return stage && stage !== 'Won' ? { actionLabel: 'Move to Won', onAction: () => router.push(moveStageHref(c.leadId, 'won', { contract: c.id })) } : {} }
  const [bundlePick, setBundlePick] = useState(false)
  const [bundleLead, setBundleLead] = useState<string | null>(null)
  const bundleDocs = useMemo(() => bundleable.filter((c) => c.leadId === bundleLead), [bundleable, bundleLead])
  const statusBlock = useCallback((c: Contract, to: ContractStatus) => (to !== 'Signed' && c.status === 'Signed' ? unsignBlock(c, data.viewer) : null), [data.viewer])
  const deleteBlock = useCallback((c: Contract) => (canDeleteContract(data.viewer, c) ? null : CONTRACT_DELETE_RULE), [data.viewer])   /* (REG-634, parity Q-21) */
  const from = '/contracts'
  const openEditor = (id: string) => router.push(withFrom(`/contracts/${id}`, from))

  /* New Contract: the kind first, then the lead, then the editor. (Dane UAT 8.02, REG-659) The lead question stays, reading "Creating…", until
     the contract exists and its editor takes over the page; a refusal leaves it open to try again. One contract per press (RACE-05). */
  const createFor = async (leadId: string, p: Pending) => {
    if (creating) return
    setCreating(true)
    try {
      const id = await createContractDoc(p.kind === 'blank' ? { leadId } : p.kind === 'template' ? { leadId, templateId: p.templateId } : { leadId, upload: { fileName: p.fileName, signed: p.signed, title: p.title } })
      snackbar({ message: p.kind === 'import' ? (p.signed ? 'Signed contract imported' : 'Contract imported') : 'Contract created' })
      openEditor(id)
    } catch { fail('create the contract'); setCreating(false) }
  }
  const onNew = (kind: 'blank' | 'template' | 'import' | 'ai') => {
    if (kind === 'blank') setPending({ kind: 'blank' })
    else if (kind === 'template') setPickerOpen(true)
    else if (kind === 'import') setImportOpen(true)
    else comingSoon()   // Create with AI — Maison AI's generative side is not in this build (REG-534)
  }
  const onStatus = (c: Contract, status: ContractStatus) => {
    if (status === c.status) return
    if (c.status === 'Signed' && status !== 'Signed') { setUnsign({ contract: c, to: status }); return }   // (REG-631, parity Q-04) asks first
    /* (sweep S2 #3) the status menu keeps Send's checks, and Signed goes through Mark as signed — its date and its copy, as the editor asks */
    if (status === 'Sent to Client' && c.status === 'Draft') {
      const why = sendBlock(c); if (why) { snackbar({ message: SEND_BLOCK_WORDS[why] ?? 'It can’t go out yet' }); return }
      const q = quoteBlockOf(c); if (q) { sayQuoteBlock(c, q); return }
    }
    if (status === 'Signed') { setMarking(c); return }
    void run('change the status', () => setContractStatus(c.id, status), `Contract marked ${status}`)
  }
  const rowMenu = (c: Contract, action: ContractRowAction) => {
    if (action === 'share') router.push(withFrom(`/contracts/${c.id}/preview`, from))
    else if (action === 'copy') {
      /* (REG-631, parity Q-07) Copying a Draft's link shares it — Sent to Client from then on. (REG-633, E-118: a bundled document copies the bundle's link) */
      /* (UX audit C8, supersedes sweep S2 #2's order) Send's checks first, then the copy, then the share — never Sent over a copy that failed */
      if (c.status === 'Draft') {
        const why = sendBlock(c); if (why) { snackbar({ message: SEND_BLOCK_WORDS[why] ?? 'It can’t go out yet' }); return }
        const q = quoteBlockOf(c); if (q) { sayQuoteBlock(c, q); return }
      }
      const write = copyText(contractLink(c))
      if (c.status === 'Draft') void write.then(() => { void run('share the link', () => shareContractLink(c.id), 'Signing link copied — the contract is Sent to Client now') }, () => snackbar({ message: 'Couldn’t copy the link — the contract stays a Draft' }))
      else void write.then(() => snackbar({ message: 'Signing link copied' }), () => fail('copy the link'))
    }
    else if (action === 'remind') setRemind({ c: contracts.find((x) => x.id === c.id) ?? { ...c, leadName: '', leadStage: '' }, open: true })
    else if (action === 'signed') setMarking(c)
    else if (action === 'pdf' || action === 'print') router.push(withFrom(`/contracts/${c.id}/preview?print=1`, from))
    else if (action === 'archive') void run('archive the contract', () => archiveContract(c.id), { message: 'Contract archived', actionLabel: 'Undo', onAction: () => { void run('restore the contract', () => archiveContract(c.id, true), 'Contract restored') } })
    else setDeleting([c.id])
  }
  const loadDeleted = useCallback(() => fetchDeletedContractsAction(null), [])
  const loadTemplates = useCallback(() => fetchContractTemplateOptionsAction(), [])

  return (
    <PageReveal skeleton={<ContractsListGhost />}>   {/* (REG-708) the page's own ghost, as its loading.tsx */}
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid="contracts-workspace">
        <PageHeader title="Contracts" />
        <div className={styles.frame}>
          <ContractsToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)} bare={contracts.length === 0} query={query} onQuery={setQuery} onNew={onNew} onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
                            onMenu={(a) => (a === 'templates' ? router.push(withFrom('/company/templates/contracts', from)) : a === 'archived' ? setArchivedOpen(true) : a === 'deleted' ? setDeletedOpen(true) : a === 'bundle' ? setBundlePick(true) : comingSoon())}
                            bundleBlock={bundleBlock}   /* (UX audit C4) */
                            awaiting={{ count: awaitingCount, on: awaitingOn, onToggle: () => setFilters((f) => ({ ...f, status: awaitingOn ? [] : ['Sent to Client'] })) }} />
          {contracts.length === 0 ? (
            <ContractsEmpty onFromScratch={() => setPending({ kind: 'blank' })} onFromTemplate={() => setPickerOpen(true)} onImport={() => onNew('import')} />
          ) : nothingMatches ? (
            <TabSearchEmpty noun="contracts" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_CONTRACT_FILTERS) }} />
          ) : (
            <ContractsTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder} contracts={visible} onStatus={onStatus} onView={(c) => openEditor(c.id)} onRowMenu={rowMenu} statusBlock={statusBlock} deleteBlock={deleteBlock} now={now}
                            leadOf={(c) => ({ name: leadName.get(c.id) ?? '', href: withFrom(`/leads/${c.leadId}/contracts`, from) })} />
          )}
        </div>
        <PickLeadDialog open={bundlePick} onClose={() => setBundlePick(false)} leads={bundleLeads} title="Send together — which lead?" onPick={(leadId) => { setBundlePick(false); setBundleLead(leadId) }} />
        <SendBundleDialog open={!!bundleLead} onClose={() => setBundleLead(null)} contracts={bundleDocs} quoteBlock={quoteBlockOf}
                          defaults={{ name: bundleDocs[0]?.recipientName || bundleDocs[0]?.leadName || '', phone: bundleDocs[0]?.recipientPhone || '' }}
                          draft={(name, titles, link) => bundleMessage({ clientFirst: firstName(name), studio: data.studioName, titles, link })}
                          onShare={({ bundleId, contractIds, name, phone }) => { void run('share the link', () => sendBundle(bundleId, contractIds, { name, phone }), 'Signing link copied — the documents are Sent to Client now') }}
                          onSend={({ bundleId, contractIds, name, phone, message }) => {
                            setBundleLead(null)
                            window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
                            void run('send the documents', () => sendBundle(bundleId, contractIds, { name, phone }), `${contractIds.length} documents sent under one link`)
                          }} />
        <ArchivedContractsSheet open={archivedOpen} onClose={() => setArchivedOpen(false)} load={loadArchived} crumb="Tools / Contracts" showLead
                              onUnarchive={async (ids) => { const r = await unarchiveContracts(ids); snackbar({ message: r.restored > 1 ? `${r.restored} contracts unarchived` : 'Contract unarchived' }); refresh() }} />
      <MarkSignedDialog open={!!marking} onClose={() => setMarking(null)} today={new Date(now)}
                        onSave={async (o) => { const m = marking; if (!m) return; const ok = await run('mark the contract signed', () => markContractSigned(m.id, o), { message: `${m.title} marked Signed`, ...wonNext(m) }); if (ok) setMarking(null) }} />
      {/* (UX audit C5) Send a reminder: the Send dialog with the same link and a nudge — WhatsApp opens on the press */}
      <SendContractDialog open={!!remind?.open} onClose={closeRemind} title="Send a reminder" subtitle={reminding ? `${reminding.title} is still waiting for a signature. Send via WhatsApp opens your chat with the client, the same link in the message.` : ''}
                          link={reminding ? contractLink(reminding) : ''} defaults={{ name: reminding?.recipientName || reminding?.leadName || '', phone: reminding?.recipientPhone || '' }}
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
        <ContractsFiltersModal open={filtersOpen} value={filters} now={now} onApply={setFilters} onClose={() => setFiltersOpen(false)} />
        <DeleteContractsDialog open={!!deleting} count={deleting?.length ?? 1} onNo={() => setDeleting(null)}
                               onYes={() => { const ids = deleting; setDeleting(null); if (ids) void run('delete', async () => { const r = await deleteContracts(ids); snackbar({ message: contractsDeletedLine(r) }) }) }} />
        <ContractTemplatePicker open={pickerOpen} onClose={() => setPickerOpen(false)} load={loadTemplates}
                                onUse={(templateId) => { setPickerOpen(false); setPending({ kind: 'template', templateId }) }} onStarter={() => { setPickerOpen(false); setPending({ kind: 'template', templateId: null }) }} />
        <ImportContractDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(o) => { setImportOpen(false); setPending({ kind: 'import', ...o }) }} />
        <PickLeadDialog open={!!pending} onClose={() => setPending(null)} leads={leads} busy={creating} onPick={(leadId) => { const p = pending; if (p && leadId) void createFor(leadId, p) }} />
        <DeletedContractsSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} load={loadDeleted} crumb="Tools / Contracts" showLead
                               onRestore={(ids) => run('restore', () => restoreContracts(ids), ids.length === 1 ? 'Contract restored' : `${ids.length} contracts restored`)}
                               onDeleteForever={(ids) => run('delete', () => deleteContractsForever(ids), 'Contract deleted forever')}
                               onEmptyTrash={() => run('empty the trash', () => emptyContractTrash(null), 'Trash emptied')} />
      </div>
    </PageReveal>
  )
}
