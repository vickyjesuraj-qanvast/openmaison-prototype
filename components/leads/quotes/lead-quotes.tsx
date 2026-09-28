'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { DatePicker } from '@/components/om/date-picker'
import { useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { Quote } from '@/lib/db/schema'
import { EMPTY_QUOTE_FILTERS, activeQuoteFilterCount, applyQuoteFilters, searchQuotes, type QuoteFilters, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { QuoteApproval } from '@/lib/settings/types'
import type { LeadQuotesData } from '@/lib/leads/quotes'
import { archiveQuote, listArchivedQuotes, unarchiveQuotes, createQuote, createQuoteFromUpload, deleteQuotes, deleteQuotesForever, emptyQuoteTrash, listDeletedQuotes, restoreQuotes, setDefaultTemplate, setQuoteDue, setQuoteStatus } from '@/app/leads/quotes-actions'
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
  const router = useRouter()
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
  const visible = useMemo(() => searchQuotes(applyQuoteFilters(quotes, filters, now), query), [quotes, filters, query, now])
  // Search / filters that match nothing → the listing's "No results found" card (T6); the bare head never shows.
  const nothingMatches = quotes.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0)
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

  const onStatus = (quote: Quote, status: QuoteStatus) => {
    if (status === quote.status) return
    void run('change the status', () => setQuoteStatus(quote.id, status), `Quote marked ${status}`)
  }
  const openDue = (quote: Quote, anchor: HTMLElement) => { dueAnchor.current = anchor; setDueFor((d) => (d?.el === anchor ? null : { quoteId: quote.id, el: anchor })) }
  /* (REG-625, parity Q-27 · Q-28) Deleted Quotes, and who may delete. */
  const [deletedOpen, setDeletedOpen] = useState(false)
  const loadDeleted = useCallback(() => listDeletedQuotes(leadId), [leadId])
  const [archivedOpen, setArchivedOpen] = useState(false)   /* (sweep S1 · U-07) */
  const loadArchived = useCallback(() => listArchivedQuotes(leadId), [leadId])
  const mayDelete = (q: Quote) => !viewer || canDeleteQuote(viewer, q)
  /* (sweep S1) a soft delete answers with Undo (REG-502), and a failure names what failed */
  const removeQuotes = (ids: string[]) => { void run(ids.length > 1 ? 'delete the quotes' : 'delete the quote', async () => { const r = await deleteQuotes(ids); snackbar(r.deleted ? { message: deletedLine(r), actionLabel: 'Undo', onAction: () => { void restoreQuotes(ids).then(() => refresh(), () => snackbar({ message: 'Couldn’t restore — please try again' })) } } : { message: deletedLine(r) }) }) }
  const rowMenu = (quote: Quote, action: QuoteRowAction) => {
    if (action === 'share' || action === 'pdf' || action === 'print') {
      /* (REG-625, parity §8.2 · E-117) the row's Preview and Share · Download as PDF · Print open what the editor's own kebab opens */
      router.push(withFrom(`/quotes/${quote.id}/preview${action === 'share' ? '' : '?print=1'}`, here))
    } else if (action === 'xray') {
      router.push(withFrom(`/quote-x-ray?lead=${quote.leadId}&quote=${quote.id}`, here))   /* (REG-639) Quote X-Ray on this quote, back to this tab */
    } else if (action === 'copy') {
      const url = `${window.location.origin}/quotes/${quote.id}`   /* (REG-625, E-117) the quote's own address — "?open=" was read by nothing */
      void navigator.clipboard?.writeText(url).then(() => snackbar({ message: 'Quote link copied' }), () => fail('copy the link'))
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
      <QuotesToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)}
        query={query} onQuery={setQuery}
        onCreate={openCreate}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={(a) => (a === 'templates' ? router.push(withFrom('/company/templates/quotes', `/leads/${leadId}/quotes`)) : a === 'settings' ? router.push(withFrom('/settings?section=quotes', `/leads/${leadId}/quotes`)) : a === 'archived' ? setArchivedOpen(true) : setDeletedOpen(true))}   /* (REG-516) Manage Templates goes to Company › Templates › Quotes; (REG-625) Quotes Settings → Settings › Quotes, Deleted Quotes → the sheet */
      />
      {quotes.length === 0 ? (
        <QuotesEmpty onFromScratch={openCreate} onFromTemplate={openCreate} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="quotes" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_QUOTE_FILTERS) }} />
      ) : (
        <QuotesTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          quotes={visible} now={now} approval={approval} canApprove={canApprove} canDelete={mayDelete}
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
        onClose={() => setFiltersOpen(false)}
      />
      <CreateQuoteModal
        open={createOpen} leadName={leadName} templates={templates} priceBookCount={priceBookCount} now={now}
        render={{ brand: data.brand, sample: data.sample, extras: data.extras }}
        onClose={() => setCreateOpen(false)}
        onStart={(templateId) => { void startQuote(templateId) }}
        onSetDefault={(id) => { void run('set the default template', () => setDefaultTemplate(id), 'Default template updated', { refresh: true }) }}
        defaultBlock={viewer ? templateDefaultBlock(viewer) : null}   /* (REG-646 · verify round 3) an Owner's or an Admin's — the row says so */
        onUpload={(read, _client, quoteId) => { void run('create the quote', async () => { const id = await createQuoteFromUpload(leadId, null, read.groups, quoteId); setCreateOpen(false); router.push(withFrom(`/quotes/${id}`, here)) }, `Quote created with ${read.count} lines from ${read.source}`, { guard: 'create' }) }}   /* (REG-627, parity Q-16) */
      />
      <DeleteQuotesDialog
        open={!!deleting} count={deleting?.length ?? 1}
        onNo={() => setDeleting(null)}
        onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; setSelected(new Set()); removeQuotes(ids) }}
      />
      <ArchivedQuotesSheet open={archivedOpen} onClose={() => setArchivedOpen(false)} load={loadArchived} crumb={`${leadName} / Quotes`}
                           onUnarchive={async (ids) => { const r = await unarchiveQuotes(ids); snackbar({ message: r.restored > 1 ? `${r.restored} quotes unarchived` : 'Quote unarchived' }); refresh() }} />
      <DeletedQuotesSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} load={loadDeleted} crumb={`${leadName} / Quotes`}
                          onRestore={async (ids) => { const r = await restoreQuotes(ids); snackbar({ message: r.restored ? 'Quote restored' : 'Only its creator, an Owner or an Admin restores it' }); refresh() }}
                          onDeleteForever={async (ids) => { const r = await deleteQuotesForever(ids); snackbar({ message: r.deleted ? 'Quote deleted forever' : 'The quote stays — a contract reads it, or someone else created it' }) }}
                          onEmptyTrash={async () => { const r = await emptyQuoteTrash(leadId); snackbar({ message: `${r.deleted} ${r.deleted === 1 ? 'quote' : 'quotes'} deleted forever${r.refused ? ` — ${r.refused} kept` : ''}` }) }} />
    </div>
  )
}
