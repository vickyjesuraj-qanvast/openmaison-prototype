'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useRememberShape } from '@/lib/ghost-shape'
import { copyText } from '@/lib/clipboard'
import { leadTabShape } from '@/components/leads/detail/tab-ghost-for'
import { useCallback, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { DatePicker } from '@/components/om/date-picker'
import { carrySnackbar, useSnackbar } from '@/components/om/snackbar'
import { uploadedLine } from '@/lib/quotes/upload'   // (pending modules S12)
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { Quote } from '@/lib/db/schema'
import { EMPTY_QUOTE_FILTERS, QUOTE_TODOS, activeQuoteFilterCount, applyQuoteFilters, nextQuoteHeadSort, quickMatch, quoteTodoCounts, searchQuotes, sortQuotesByHead, type QuoteFilters, type QuoteHeadSort, type QuoteQuick, type QuoteSortKey, type QuoteStatus } from '@/lib/leads/quote-filters'
import { useQuoteStatus } from './use-quote-status'
import { useContractFromQuote } from '@/components/quotes/send/contract-from-quote'
import type { QuoteApproval } from '@/lib/settings/types'
import type { LeadQuotesData } from '@/lib/leads/quotes'
import { createQuoteFromDraft } from '@/app/quotes/draft-actions'
import { archiveQuote, listArchivedQuotes, unarchiveQuotes, createQuote, createQuoteFromUpload, deleteQuotes, deleteQuotesForever, emptyQuoteTrash, listDeletedQuotes, restoreQuotes, setDefaultTemplate, setQuoteDue } from '@/app/leads/quotes-actions'
import { canDeleteQuote, deletedLine } from '@/lib/quotes/policy'
import { templateDefaultBlock } from '@/lib/company/template-rules'
import { ArchivedQuotesSheet } from './archived-quotes-sheet'
import { DeletedQuotesSheet } from './deleted-quotes-sheet'
import { CreateQuoteModal } from '@/components/quotes/create-quote-modal'
import { QuotesToolbar } from './quotes-toolbar'
import { QuotesTable, type QuoteRowAction } from './quotes-table'
import { QuotesEmpty } from './quotes-empty'
import { QuotesFiltersModal } from './quotes-filters-modal'
import { DeleteQuotesDialog } from './delete-dialog'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { quoteColumnDefs, quoteShowApproval } from './quotes-table'
import styles from './lead-quotes.module.css'
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

/**
 * Lead Details › Quotes (910-36240): the tab's state — toolbar, table or empty state, selection + bulk bar, status
 * changes, due dates, the row / header menus, filters and delete. Every new-quote path (Create Quote, the empty state,
 * the Overview card, the Quote quick link, the Won wizard — the last three land here with `?new=1` or the
 * `om:quotes:new` event) opens the Create Quote modal (REG-405 / REG-412); a tile creates the Draft and opens the quote
 * editor (`/quotes/<id>`, Figma 1271:40301), as does the row's View. Preview and Share, PDF, Print, templates and
 * settings still answer coming soon. Actions run through the tabs' shared `useRun`.
 * Specs: design-source/context/lead-quotes/.
 */
export function LeadQuotes({ leadId, leadName, data, approval, canApprove = true, viewer = null }: { leadId: string; leadName: string; data: LeadQuotesData; approval: QuoteApproval; /** (REG-624) */ canApprove?: boolean; /** (REG-625) who is looking — Delete follows its rule */ viewer?: { id: string; role: string } | null }) {
  const { quotes, templates, priceBookCount, now } = data
  useRememberShape(leadTabShape(leadId, 'quotes'), quotes.length === 0)   // (UX audit build) the shape this list opened on — its loading ghost draws the same one next time
  const router = useRouter()
  const xrayLock = usePlanLock('quote_xray')   // (pending modules S19 — 1.0's plan gating) Quote X-Ray is Pro
  const snackbar = useSnackbar()
  const { run, fail, refresh } = useRun()

  /* ── list state ── */
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<QuoteFilters>(EMPTY_QUOTE_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  /* Column settings (REG-454): order · visibility · up to three pinned, kept per browser; the phone cards ignore them. */
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const showApproval = quoteShowApproval(data.quotes, approval)
  const quoteDefs = useMemo(() => quoteColumnDefs(false, showApproval), [showApproval])
  const columnPrefs = useTableColumns('lead-quotes', quoteDefs, phone)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const filterCount = activeQuoteFilterCount(filters)
  /* (UX audit Q4 · Q5) The to-do chips: waiting for my approval (an approver's, while the studio asks for approval), waiting on the client,
     expiring this week. A chip whose count falls to nothing lets its narrowing go (render-phase adjust). */
  const [quick, setQuick] = useState<QuoteQuick>('')
  const todoCounts = useMemo(() => quoteTodoCounts(quotes, now, canApprove && approval === 'required'), [quotes, now, canApprove, approval])
  if (quick && todoCounts[quick] === 0) setQuick('')
  /* (pending modules S04) the heads' own order — one sort with Filters' (a head's sort sets Filters' back to Newest first; Filters' takes the head's off) */
  const [headSort, setHeadSort] = useState<QuoteHeadSort>(null)
  const onSort = (key: QuoteSortKey) => { setHeadSort((h) => nextQuoteHeadSort(h, key)); setFilters((f) => (f.sort === 'newest' ? f : { ...f, sort: 'newest' })) }
  const visible = useMemo(() => sortQuotesByHead(searchQuotes(applyQuoteFilters(quotes.filter((q) => quickMatch(q, quick, now)), filters, now), query), headSort), [quotes, filters, query, now, quick, headSort])
  // Search / filters that match nothing → the listing's "No results found" card (T6); the bare head never shows.
  const nothingMatches = quotes.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0 || quick !== '')
  // Selection follows the visible set (render-phase adjust).
  const visibleIds = useMemo(() => new Set(visible.map((q) => q.id)), [visible])
  if ([...selected].some((id) => !visibleIds.has(id))) setSelected(new Set([...selected].filter((id) => visibleIds.has(id))))

  /* ── overlays ── */
  const [dueFor, setDueFor] = useState<{ quoteId: string; el: HTMLElement } | null>(null)
  const dueAnchor = useRef<HTMLElement | null>(null)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const dueQuote = dueFor ? quotes.find((q) => q.id === dueFor.quoteId) : null

  /* The Create Quote modal (REG-412). A tile creates ONE Draft per press — a double click cannot create two (RACE-05) —
     from the chosen template (null = Blank Quote) and opens it in the editor. */
  const [createOpen, setCreateOpen] = useState(false)
  const openCreate = () => setCreateOpen(true)
  const startQuote = (templateId: string | null) => run('create the quote', async () => { const id = await createQuote(leadId, templateId); setCreateOpen(false); router.push(withFrom(`/quotes/${id}`, here)) }, undefined, { guard: 'create' })
  /* (REG-465) The editor carries this tab's own URL (folder-free, origin and all) so its close comes straight back here. */
  const pathname = usePathname(); const search = useSearchParams().toString()
  const here = search ? `${pathname}?${search}` : pathname
  const openQuote = (quote: Quote) => router.push(withFrom(`/quotes/${quote.id}`, here))

  // Overview › QUOTES card, the Quote quick link and the Won wizard land here with ?new=1 (consumed once, then the
  // param is dropped); Create quick links › Quote on this tab raises `om:quotes:new`. Both open the modal.
  useCreateIntent({ event: CREATE_EVENTS.quotes, landing: { href: `/leads/${leadId}/quotes` }, onIntent: openCreate })

  /* (UX audit Q3) The row's status menu: Sent for Approval tells the approvers, the client's statuses ask first, every mark has Undo. */
  const statusChange = useQuoteStatus()
  const onStatus = (quote: Quote, status: QuoteStatus) => statusChange.change(quote, status)
  /* (UX audit C6) The row's Create contract — the editor kebab's picker; the contract's close comes back to this tab. */
  const contract = useContractFromQuote(here)
  const openDue = (quote: Quote, anchor: HTMLElement) => { dueAnchor.current = anchor; setDueFor((d) => (d?.el === anchor ? null : { quoteId: quote.id, el: anchor })) }
  /* (REG-625, parity Q-27 · Q-28) Deleted Quotes, and who may delete. */
  const [deletedOpen, setDeletedOpen] = useState(false)
  const loadDeleted = useCallback(() => listDeletedQuotes(leadId), [leadId])
  const [archivedOpen, setArchivedOpen] = useState(false)   /* (sweep S1 · U-07) */
  const loadArchived = useCallback(() => listArchivedQuotes(leadId), [leadId])
  const mayDelete = (q: Quote) => !viewer || canDeleteQuote(viewer, q)
  /* (sweep S1) a soft delete answers with Undo (REG-502), and a failure names what failed */
  const removeQuotes = (ids: string[]) => { void run(ids.length > 1 ? 'delete the quotes' : 'delete the quote', async () => { const r = await deleteQuotes(ids); if (!('deleted' in r)) throw new Error(r.error); snackbar(r.deleted ? { message: deletedLine(r), actionLabel: 'Undo', onAction: () => { void restoreQuotes(ids).then(() => refresh(), () => snackbar({ message: 'Couldn’t restore — please try again' })) } } : { message: deletedLine(r) }) }) }
  const rowMenu = (quote: Quote, action: QuoteRowAction) => {
    if (action === 'share' || action === 'pdf' || action === 'print') {
      /* (REG-625, parity §8.2 · E-117) the row's Preview and Share · Download as PDF · Print open what the editor's own kebab opens */
      router.push(withFrom(`/quotes/${quote.id}/preview${action === 'share' ? '' : '?print=1'}`, here))
    } else if (action === 'contract') {
      contract.open(quote)
    } else if (action === 'xray') {
      if (xrayLock.locked) { xrayLock.open(); return }   // (pending modules S19) Quote X-Ray is Pro
      router.push(withFrom(`/quote-x-ray?lead=${quote.leadId}&quote=${quote.id}`, here))   /* (REG-639) Quote X-Ray on this quote, back to this tab */
    } else if (action === 'copy') {
      const url = `${window.location.origin}/quotes/${quote.id}`   /* (REG-625, E-117) the quote's own address — "?open=" was read by nothing */
      void copyText(url).then(() => snackbar({ message: 'Quote link copied' }), () => fail('copy the link'))
    } else if (action === 'archive') {
      // The Undo snackbar rides with the success (RACE-03): a failed archive shows only "Couldn’t archive the quote".
      void run('archive the quote', () => archiveQuote(quote.id), { message: 'Quote archived', actionLabel: 'Undo', onAction: () => { void run('restore the quote', () => archiveQuote(quote.id, true), 'Quote restored') } })
    } else if (action === 'delete') {
      setDeleting([quote.id])
    }
  }
  const selectedIds = [...selected]

  return (
    <div className={styles.tab}>
      <QuotesToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)} bare={quotes.length === 0}   /* (REG-735) the empty card carries Create */
        todos={QUOTE_TODOS.map((t) => ({ key: t.key, label: t.label(todoCounts[t.key]), count: todoCounts[t.key], icon: t.icon, selected: quick === t.key, onClick: () => setQuick((q) => (q === t.key ? '' : t.key)) }))}
        query={query} onQuery={setQuery}
        onCreate={openCreate}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={(a) => (a === 'templates' ? router.push(withFrom('/company/templates/quotes', `/leads/${leadId}/quotes`)) : a === 'settings' ? router.push(withFrom('/settings?section=quotes', `/leads/${leadId}/quotes`)) : a === 'archived' ? setArchivedOpen(true) : setDeletedOpen(true))}   /* (REG-516) Manage Templates goes to Company › Templates › Quotes; (REG-625) Quotes Settings → Settings › Quotes, Deleted Quotes → the sheet */
      />
      {quotes.length === 0 ? (
        /* (UX audit Q12, supersedes REG-412 here) From Scratch makes the blank quote at once — the Blank Quote tile's quote; From Template keeps the modal. */
        <QuotesEmpty onFromScratch={() => { void startQuote(null) }} onFromTemplate={openCreate} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="quotes" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_QUOTE_FILTERS); setQuick('') }} />
      ) : (
        <QuotesTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          quotes={visible} now={now} approval={approval} canApprove={canApprove} canDelete={mayDelete}
          sort={headSort} onSort={onSort}
          selected={selected} onSelect={setSelected}
          onStatus={onStatus}
          onDue={openDue}
          onView={openQuote}
          onRowMenu={rowMenu}
        />
      )}
      <DetailBulkBar
        count={selected.size}
        actions={[{ label: 'Delete', tone: 'danger', onClick: () => setDeleting(selectedIds) }]}
        onClear={() => setSelected(new Set())}
      />
      <DatePicker
        open={!!dueFor}
        anchorRef={dueAnchor}
        anchorKey={dueFor?.quoteId ?? ''}
        value={dueQuote?.dueAt ?? null}
        today={new Date(now)}
        label="Due date"
        onSelect={(date) => { const q = dueQuote; setDueFor(null); if (q) void run('set the due date', () => setQuoteDue(q.id, date), date ? { message: 'Due date set — follow-up task added', actionLabel: 'View', onAction: () => router.push(withFrom(`/leads/${leadId}/tasks`, here)) } : 'Due date cleared') }}   /* (REG-329) as the Tasks due picker */
        onClose={() => setDueFor(null)}
      />
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <QuotesFiltersModal
        open={filtersOpen} value={filters} now={now} approval={approval}
        onApply={setFilters}   /* (REG-464) live — the modal closes on Done */
        headSort={headSort ? ({ status: 'Status', total: 'Total', due: 'Due', created: 'Created', sent: 'Sent to client', valid: 'Valid until', updated: 'Updated', approval: 'Approval Date' } as const)[headSort.key] : null} onClearHead={() => setHeadSort(null)}
        onClose={() => setFiltersOpen(false)}
      />
      <CreateQuoteModal
        open={createOpen} leadName={leadName} leadId={leadId} templates={templates} priceBookCount={priceBookCount} now={now}
        render={{ brand: data.brand, sample: data.sample, extras: data.extras }}
        onClose={() => setCreateOpen(false)}
        onStart={(templateId) => { void startQuote(templateId) }}
        onSetDefault={(id) => { void run('set the default template', () => setDefaultTemplate(id), 'Default template updated', { refresh: true }) }}
        defaultBlock={viewer ? templateDefaultBlock(viewer) : null}   /* (REG-646 · verify round 3) an Owner's or an Admin's — the row says so */
        onUpload={(read, _client, quoteId) => { void run('create the quote', async () => { const r = await orThrow(createQuoteFromUpload(leadId, null, read.groups, quoteId)); setCreateOpen(false); carrySnackbar(`/quotes/${r.id}`, uploadedLine(read, r.matched)); router.push(withFrom(`/quotes/${r.id}`, here)) }, undefined, { guard: 'create' })   /* (pending modules S12) said in the editor's own host — the shell's goes with the shell (carrySnackbar, Dane UAT 3.23) */ }}   /* (REG-627, parity Q-16) */
        onDraft={(brief) => { void run('draft the quote', async () => { const r = await createQuoteFromDraft({ leadId, brief }); if ('error' in r) return r; setCreateOpen(false); carrySnackbar(`/quotes/${r.id}`, 'Quote drafted by Maison AI'); router.push(withFrom(`/quotes/${r.id}`, here)); return r }, undefined, { guard: 'create' }) }}   /* (pending modules S04) */
      />
      {statusChange.dialog}
      {contract.dialog}
      <DeleteQuotesDialog
        open={!!deleting} count={deleting?.length ?? 1}
        onNo={() => setDeleting(null)}
        onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; setSelected(new Set()); removeQuotes(ids) }}
      />
      <ArchivedQuotesSheet open={archivedOpen} onClose={() => setArchivedOpen(false)} load={loadArchived} crumb={`${leadName} / Quotes`}
                           onUnarchive={async (ids) => { const r = await orThrow(unarchiveQuotes(ids)); snackbar({ message: r.restored > 1 ? `${r.restored} quotes unarchived` : 'Quote unarchived' }); refresh() }} />
      <DeletedQuotesSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} load={loadDeleted} crumb={`${leadName} / Quotes`}
                          onRestore={async (ids) => { const r = await orThrow(restoreQuotes(ids)); snackbar({ message: r.restored ? 'Quote restored' : 'Only its creator, an Owner or an Admin restores it' }); refresh() }}
                          onDeleteForever={async (ids) => { const r = await orThrow(deleteQuotesForever(ids)); snackbar({ message: r.deleted ? 'Quote deleted forever' : 'The quote stays — a contract reads it, or someone else created it' }) }}
                          onEmptyTrash={async () => { const r = await orThrow(emptyQuoteTrash(leadId)); snackbar({ message: `${r.deleted} ${r.deleted === 1 ? 'quote' : 'quotes'} deleted forever${r.refused ? ` — ${r.refused} kept` : ''}` }) }} />
    </div>
  )
}
