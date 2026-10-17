'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useRememberShape } from '@/lib/ghost-shape'
import { copyText } from '@/lib/clipboard'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { Icon } from '@/components/om/icon'
import { Button } from '@/components/ds'
import { QuotesListGhost } from '@/components/shell/list-ghosts'
import { DatePicker } from '@/components/om/date-picker'
import { carrySnackbar, useSnackbar } from '@/components/om/snackbar'
import { uploadedLine } from '@/lib/quotes/upload'   // (pending modules S12)
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { QuotesToolbar } from '@/components/leads/quotes/quotes-toolbar'
import { QuotesTable, type QuoteRowAction } from '@/components/leads/quotes/quotes-table'
import { QuotesEmpty } from '@/components/leads/quotes/quotes-empty'
import { QuotesFiltersModal } from '@/components/leads/quotes/quotes-filters-modal'
import { DeleteQuotesDialog } from '@/components/leads/quotes/delete-dialog'
import { CreateQuoteModal } from '@/components/quotes/create-quote-modal'
import { createQuoteFromDraft } from '@/app/quotes/draft-actions'
import { archiveQuote, listArchivedQuotes, unarchiveQuotes, createQuote, createQuoteFromUpload, deleteQuotes, deleteQuotesForever, emptyQuoteTrash, listDeletedQuotes, restoreQuotes, setDefaultTemplate, setQuoteDue } from '@/app/leads/quotes-actions'
import { useQuoteStatus } from '@/components/leads/quotes/use-quote-status'
import { useContractFromQuote } from '@/components/quotes/send/contract-from-quote'
import { canDeleteQuote, deletedLine } from '@/lib/quotes/policy'
import { templateDefaultBlock } from '@/lib/company/template-rules'
import { DeletedQuotesSheet } from '@/components/leads/quotes/deleted-quotes-sheet'
import { ArchivedQuotesSheet } from '@/components/leads/quotes/archived-quotes-sheet'
import type { Quote } from '@/lib/db/schema'
import { EMPTY_QUOTE_FILTERS, QUOTE_TODOS, activeQuoteFilterCount, applyQuoteFilters, nextQuoteHeadSort, quickMatch, quoteTodoCounts, searchQuotes, sortQuotesByHead, type QuoteFilters, type QuoteHeadSort, type QuoteQuick, type QuoteSortKey, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { StudioQuotesData } from '@/lib/quotes/list'
import pageStyles from '@/app/leads/leads.module.css'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { quoteColumnDefs, quoteShowApproval } from '@/components/leads/quotes/quotes-table'
import styles from './quotes-workspace.module.css'
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

/**
 * Tools › Quotes (REG-422; owner 2026-09-11: the Quotes tile "lands on a studio-wide list … with Create Quote + Client
 * field"): every quote in the studio — the Quotes tab's toolbar, table, filters, bulk bar and dialogs (components/leads/
 * quotes/*), with a Client column that links to the lead's Quotes tab, a search that also matches the client's name, and
 * Create Quote opening the modal with a Client field on top. Actions run through the tabs' shared `useRun`.
 */
export function QuotesWorkspace({ data, newTemplateId, templateId, todo }: { data: StudioQuotesData; newTemplateId?: string | null; templateId?: string | null
  /** (pending modules S22) `?todo=approval` — the Dashboard's "n quotes wait for your approval" lands on that to-do chip */ todo?: string | null }) {
  const { quotes, leads, templates, priceBookCount, approval, now } = data
  useRememberShape('tools.quotes', quotes.length === 0)   // (UX audit build) the shape this list opened on — its loading ghost draws the same one next time
  const router = useRouter()
  const xrayLock = usePlanLock('quote_xray')   // (pending modules S19 — 1.0's plan gating) Quote X-Ray is Pro
  const snackbar = useSnackbar()
  const { run, fail, refresh } = useRun()
  const nameOf = useMemo(() => new Map(quotes.map((q) => [q.id, q.leadName])), [quotes])

  const templateFilter = templateId ? templates.find((t) => t.id === templateId) ?? null : null   /* (REG-495) ?template= scopes the list */
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<QuoteFilters>(EMPTY_QUOTE_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  /* Column settings (REG-454): order · visibility · up to three pinned, kept per browser; the phone cards ignore them. */
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const showApproval = quoteShowApproval(data.quotes, approval)
  const quoteDefs = useMemo(() => quoteColumnDefs(true, showApproval), [showApproval])
  const columnPrefs = useTableColumns('studio-quotes', quoteDefs, phone)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const filterCount = activeQuoteFilterCount(filters)
  /* (UX audit Q4 · Q5) The to-do chips — waiting for my approval (an approver's), waiting on the client, expiring this week; a chip whose count
     falls to nothing lets its narrowing go (render-phase adjust). */
  const [quick, setQuick] = useState<QuoteQuick>(() => (todo === 'approval' || todo === 'waiting' || todo === 'expiring' ? todo : ''))
  const todoCounts = useMemo(() => quoteTodoCounts(quotes, now, data.canApprove && approval === 'required'), [quotes, now, data.canApprove, approval])
  if (quick && todoCounts[quick] === 0) setQuick('')
  /* (pending modules S04) the heads' own order — one sort with Filters' */
  const [headSort, setHeadSort] = useState<QuoteHeadSort>(null)
  const onSort = (key: QuoteSortKey) => { setHeadSort((h) => nextQuoteHeadSort(h, key)); setFilters((f) => (f.sort === 'newest' ? f : { ...f, sort: 'newest' })) }
  const visible = useMemo(() => {
    const base = applyQuoteFilters((templateFilter ? quotes.filter((x) => x.templateId === templateFilter.id) : quotes).filter((x) => quickMatch(x, quick, now)), filters, now)
    const q = query.trim().toLowerCase()
    return sortQuotesByHead(q ? base.filter((x) => searchQuotes([x], query).length > 0 || (nameOf.get(x.id) ?? '').toLowerCase().includes(q)) : base, headSort)
  }, [quotes, filters, query, now, nameOf, templateFilter, quick, headSort])
  const nothingMatches = quotes.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0 || quick !== '')
  const visibleIds = useMemo(() => new Set(visible.map((q) => q.id)), [visible])
  if ([...selected].some((id) => !visibleIds.has(id))) setSelected(new Set([...selected].filter((id) => visibleIds.has(id))))

  const [dueFor, setDueFor] = useState<{ quoteId: string; el: HTMLElement } | null>(null)
  const dueAnchor = useRef<HTMLElement | null>(null)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const dueQuote = dueFor ? quotes.find((q) => q.id === dueFor.quoteId) : null
  /* (REG-495) "Start a quote with this template" (the template editor, the gallery) arrives as ?new=<templateId>: the modal opens on that
     template with the Client field waiting; ?template=<id> lists the quotes on a template ("Used by n quotes"). */
  const [createOpen, setCreateOpen] = useState(!!newTemplateId)
  const [preselect, setPreselect] = useState<string | null>(newTemplateId ?? null)
  const startQuote = (templateId: string | null, clientId: string | null) => {
    if (!clientId) return
    return run('create the quote', async () => { const id = await createQuote(clientId, templateId); setCreateOpen(false); router.push(withFrom(`/quotes/${id}`, '/quotes')) }, undefined, { guard: 'create' })
  }
  /* (REG-465) Opened from Tools › Quotes, the editor's close — and a client's lead — come back to /quotes. */
  const openQuote = (quote: Quote) => router.push(withFrom(`/quotes/${quote.id}`, '/quotes'))
  /* (UX audit Q3) The row's status menu: Sent for Approval tells the approvers, the client's statuses ask first, every mark has Undo. */
  const statusChange = useQuoteStatus()
  const onStatus = (quote: Quote, status: QuoteStatus) => statusChange.change(quote, status)
  const contract = useContractFromQuote('/quotes')   /* (UX audit C6) the row's Create contract; the contract's close comes back here */
  const openDue = (quote: Quote, anchor: HTMLElement) => { dueAnchor.current = anchor; setDueFor((d) => (d?.el === anchor ? null : { quoteId: quote.id, el: anchor })) }
  /* (REG-625, parity Q-27 · Q-28) Deleted Quotes across the studio, and who may delete. */
  const [deletedOpen, setDeletedOpen] = useState(false)
  const loadDeleted = useCallback(() => listDeletedQuotes(null), [])
  const [archivedOpen, setArchivedOpen] = useState(false)   /* (sweep S1 · U-07) */
  const loadArchived = useCallback(() => listArchivedQuotes(null), [])
  const mayDelete = (q: Quote) => canDeleteQuote(data.viewer, q)
  /* (sweep S1) a soft delete answers with Undo (REG-502), and a failure names what failed */
  const removeQuotes = (ids: string[]) => { void run(ids.length > 1 ? 'delete the quotes' : 'delete the quote', async () => { const r = await deleteQuotes(ids); if (!('deleted' in r)) throw new Error(r.error); snackbar(r.deleted ? { message: deletedLine(r), actionLabel: 'Undo', onAction: () => { void restoreQuotes(ids).then(() => router.refresh(), () => snackbar({ message: 'Couldn’t restore — please try again' })) } } : { message: deletedLine(r) }) }, undefined, { refresh: true }) }
  const rowMenu = (quote: Quote, action: QuoteRowAction) => {
    if (action === 'share' || action === 'pdf' || action === 'print') {
      router.push(withFrom(`/quotes/${quote.id}/preview${action === 'share' ? '' : '?print=1'}`, '/quotes'))   /* (REG-625, E-117) */
      return
    }
    if (action === 'xray') { if (xrayLock.locked) { xrayLock.open(); return } router.push(withFrom(`/quote-x-ray?lead=${quote.leadId}&quote=${quote.id}`, '/quotes')); return }   /* (REG-639) */
    if (action === 'contract') { contract.open(quote); return }   /* (UX audit C6) */
    if (action === 'copy') {
      const url = `${window.location.origin}/quotes/${quote.id}`
      void copyText(url).then(() => snackbar({ message: 'Quote link copied' }), () => fail('copy the link'))
    } else if (action === 'archive') {
      void run('archive the quote', () => archiveQuote(quote.id), { message: 'Quote archived', actionLabel: 'Undo', onAction: () => { void run('restore the quote', () => archiveQuote(quote.id, true), 'Quote restored') } })
    } else if (action === 'delete') {
      setDeleting([quote.id])
    }
  }
  const selectedIds = [...selected]

  return (
    <PageReveal skeleton={<QuotesListGhost />}>   {/* (REG-708) the page's own ghost, as its loading.tsx */}
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeader title="Quotes" />
        <div className={styles.frame}>
          <QuotesToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)} bare={quotes.length === 0} query={query} onQuery={setQuery} searchPlaceholder="Search title, number, client…" onCreate={() => setCreateOpen(true)} onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
                         todos={QUOTE_TODOS.map((t) => ({ key: t.key, label: t.label(todoCounts[t.key]), count: todoCounts[t.key], icon: t.icon, selected: quick === t.key, onClick: () => setQuick((q) => (q === t.key ? '' : t.key)) }))}
                         onMenu={(a) => (a === 'templates' ? router.push(withFrom('/company/templates/quotes', '/quotes')) : a === 'settings' ? router.push(withFrom('/settings?section=quotes', '/quotes')) : a === 'archived' ? setArchivedOpen(true) : setDeletedOpen(true))}   /* (REG-516) Manage Templates goes to Company › Templates › Quotes */ />
          {templateFilter ? (
            <div className={styles.templateChip} role="status">
              <Icon name="style" size={18} weight={300} /> Quotes on <b>{templateFilter.name}</b>
              <Button appearance="text" onPress={() => router.replace('/quotes')}>Show all quotes</Button>
            </div>
          ) : null}
          {quotes.length === 0 ? (
            <QuotesEmpty onFromScratch={() => setCreateOpen(true)} onFromTemplate={() => setCreateOpen(true)} />
          ) : templateFilter && visible.length === 0 && !nothingMatches ? (
            /* (sweep S1) no quote prints through this template — say so, with the way back to every quote */
            <TabSearchEmpty noun="quotes" searching={false} onClearAll={() => router.replace('/quotes')} />
          ) : nothingMatches ? (
            <TabSearchEmpty noun="quotes" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_QUOTE_FILTERS); setQuick('') }} />
          ) : (
            <QuotesTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder} quotes={visible} now={now} approval={approval} canApprove={data.canApprove} canDelete={mayDelete} selected={selected} onSelect={setSelected}
                         sort={headSort} onSort={onSort}
                         onStatus={onStatus} onDue={openDue} onView={openQuote} onRowMenu={rowMenu}
                         clientOf={(q) => ({ name: nameOf.get(q.id) ?? '', href: withFrom(`/leads/${q.leadId}/quotes`, '/quotes') })} />
          )}
        </div>
        <DetailBulkBar count={selected.size} actions={[{ label: 'Delete', tone: 'danger', onClick: () => setDeleting(selectedIds) }]} onClear={() => setSelected(new Set())} />
        <ArchivedQuotesSheet open={archivedOpen} onClose={() => setArchivedOpen(false)} load={loadArchived} crumb="Tools / Quotes" showLead
                             onUnarchive={async (ids) => { const r = await orThrow(unarchiveQuotes(ids)); snackbar({ message: r.restored > 1 ? `${r.restored} quotes unarchived` : 'Quote unarchived' }); refresh() }} />
        <DeletedQuotesSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} load={loadDeleted} crumb="Tools / Quotes" showLead
                            onRestore={async (ids) => { const r = await orThrow(restoreQuotes(ids)); snackbar({ message: r.restored ? 'Quote restored' : 'Only its creator, an Owner or an Admin restores it' }); refresh() }}
                            onDeleteForever={async (ids) => { const r = await orThrow(deleteQuotesForever(ids)); snackbar({ message: r.deleted ? 'Quote deleted forever' : 'The quote stays — a contract reads it, or someone else created it' }) }}
                            onEmptyTrash={async () => { const r = await orThrow(emptyQuoteTrash(null)); snackbar({ message: `${r.deleted} ${r.deleted === 1 ? 'quote' : 'quotes'} deleted forever${r.refused ? ` — ${r.refused} kept` : ''}` }) }} />
        <DatePicker open={!!dueFor} anchorRef={dueAnchor} anchorKey={dueFor?.quoteId ?? ''} value={dueQuote?.dueAt ?? null} today={new Date(now)} label="Due date"
                    onSelect={(date) => { const q = dueQuote; setDueFor(null); if (q) void run('set the due date', () => setQuoteDue(q.id, date), date ? { message: 'Due date set — follow-up task added', actionLabel: 'View', onAction: () => router.push(withFrom(`/leads/${q.leadId}/tasks`, '/quotes')) } : 'Due date cleared') }} onClose={() => setDueFor(null)} />
        <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
        <QuotesFiltersModal open={filtersOpen} value={filters} now={now} approval={approval} onApply={setFilters}   /* (REG-464) live — the modal closes on Done */ onClose={() => setFiltersOpen(false)}
                            headSort={headSort ? ({ status: 'Status', total: 'Total', due: 'Due', created: 'Created', sent: 'Sent to client', valid: 'Valid until', updated: 'Updated', approval: 'Approval Date' } as const)[headSort.key] : null} onClearHead={() => setHeadSort(null)} />
        <CreateQuoteModal open={createOpen} leadName="" clients={leads} templates={templates} priceBookCount={priceBookCount} now={now} onClose={() => { setCreateOpen(false); setPreselect(null) }}
                          render={{ brand: data.brand, sample: data.sample, extras: data.extras }} preselect={preselect}
                          onStart={(templateId, clientId) => { void startQuote(templateId, clientId) }}
                          onSetDefault={(id) => { void run('set the default template', () => setDefaultTemplate(id), 'Default template updated', { refresh: true }) }}
                          defaultBlock={templateDefaultBlock(data.viewer)}   /* (REG-646 · verify round 3) an Owner's or an Admin's — the row says so */
                          onUpload={(read, clientId, quoteId) => { if (!clientId) return; void run('create the quote', async () => { const r = await orThrow(createQuoteFromUpload(clientId, null, read.groups, quoteId)); setCreateOpen(false); carrySnackbar(`/quotes/${r.id}`, uploadedLine(read, r.matched)); router.push(withFrom(`/quotes/${r.id}`, '/quotes')) }, undefined, { guard: 'create' })   /* (pending modules S12) said in the editor's own host — the shell's goes with the shell (carrySnackbar, Dane UAT 3.23) */ }}
                          onDraft={(brief, clientId) => { void run('draft the quote', async () => { const r = await createQuoteFromDraft({ leadId: clientId, brief }); if ('error' in r) return r; setCreateOpen(false); carrySnackbar(`/quotes/${r.id}`, 'Quote drafted by Maison AI'); router.push(withFrom(`/quotes/${r.id}`, '/quotes')); return r }, undefined, { guard: 'create' }) }} />   {/* (pending modules S04) */}
        {statusChange.dialog}
        {contract.dialog}
        <DeleteQuotesDialog open={!!deleting} count={deleting?.length ?? 1} onNo={() => setDeleting(null)}
                            onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; setSelected(new Set()); removeQuotes(ids) }} />
      </div>
    </PageReveal>
  )
}
