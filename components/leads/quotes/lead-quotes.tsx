'use client'

import { useMemo, useRef, useState } from 'react'
import { DatePicker } from '@/components/om/date-picker'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { Quote } from '@/lib/db/schema'
import { EMPTY_QUOTE_FILTERS, activeQuoteFilterCount, applyQuoteFilters, searchQuotes, type QuoteFilters, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { LeadQuotesData } from '@/lib/leads/quotes'
import { archiveQuote, createQuote, deleteQuotes, setQuoteDue, setQuoteStatus } from '@/app/leads/quotes-actions'
import { QuotesToolbar } from './quotes-toolbar'
import { QuotesTable, type QuoteRowAction } from './quotes-table'
import { QuotesEmpty } from './quotes-empty'
import { QuotesFiltersModal } from './quotes-filters-modal'
import { DeleteQuotesDialog } from './delete-dialog'
import styles from './lead-quotes.module.css'

/**
 * Lead Details › Quotes (910-36240): the tab's state — toolbar, table or empty state, selection + bulk bar, status
 * changes, due dates, the row / header menus, filters and delete. No panels: the quote editor has no mock ("View",
 * Preview and Share, PDF, Print, templates and settings answer coming soon). Actions run through the tabs' shared
 * `useRun`; the `?new=1` landing and the `om:quotes:new` event through `useCreateIntent`.
 * Specs: design-source/context/lead-quotes/.
 */
export function LeadQuotes({ leadId, data }: { leadId: string; data: LeadQuotesData }) {
  const { quotes, now } = data
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()

  /* ── list state ── */
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<QuoteFilters>(EMPTY_QUOTE_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
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

  // One draft per press: a double click / a double event cannot create two (RACE-05).
  const newQuote = () => run('create the quote', () => createQuote(leadId), 'Quote created', { guard: 'create' })

  // Overview › QUOTES card "From Scratch" lands here with ?new=1 (one draft, then the param is dropped);
  // Create quick links › Quote on this tab raises `om:quotes:new`.
  useCreateIntent({ event: CREATE_EVENTS.quotes, landing: { href: `/leads/${leadId}/quotes` }, onIntent: () => { void newQuote() } })

  const onStatus = (quote: Quote, status: QuoteStatus) => {
    if (status === quote.status) return
    void run('change the status', () => setQuoteStatus(quote.id, status), `Quote marked ${status}`)
  }
  const openDue = (quote: Quote, anchor: HTMLElement) => { dueAnchor.current = anchor; setDueFor((d) => (d?.el === anchor ? null : { quoteId: quote.id, el: anchor })) }
  const rowMenu = (quote: Quote, action: QuoteRowAction) => {
    if (action === 'copy') {
      const url = `${window.location.origin}/leads/${leadId}/quotes?open=${quote.id}`
      void navigator.clipboard?.writeText(url).then(() => snackbar({ message: 'Link copied' }), () => fail('copy the link'))
    } else if (action === 'archive') {
      // The Undo snackbar rides with the success (RACE-03): a failed archive shows only "Couldn’t archive the quote".
      void run('archive the quote', () => archiveQuote(quote.id), { message: 'Quote archived', actionLabel: 'Undo', onAction: () => { void run('restore the quote', () => archiveQuote(quote.id, true), 'Quote restored') } })
    } else if (action === 'delete') {
      setDeleting([quote.id])
    } else {
      comingSoon()   // Preview and Share · Download as PDF · Print — no mock beyond the menu item
    }
  }
  const selectedIds = [...selected]

  return (
    <div className={styles.tab}>
      <QuotesToolbar
        query={query} onQuery={setQuery}
        onNew={(kind) => (kind === 'blank' ? void newQuote() : comingSoon())}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={comingSoon}
      />
      {quotes.length === 0 ? (
        <QuotesEmpty onFromScratch={() => { void newQuote() }} onFromTemplate={comingSoon} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="quotes" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_QUOTE_FILTERS) }} />
      ) : (
        <QuotesTable
          quotes={visible} now={now}
          selected={selected} onSelect={setSelected}
          onStatus={onStatus}
          onDue={openDue}
          onView={comingSoon}
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
        onSelect={(date) => { const q = dueQuote; setDueFor(null); if (q) void run('set the due date', () => setQuoteDue(q.id, date)) }}
        onClose={() => setDueFor(null)}
      />
      <QuotesFiltersModal
        open={filtersOpen} value={filters} now={now}
        onApply={(v) => { setFilters(v); setFiltersOpen(false) }}
        onClose={() => setFiltersOpen(false)}
      />
      <DeleteQuotesDialog
        open={!!deleting} count={deleting?.length ?? 1}
        onNo={() => setDeleting(null)}
        onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; setSelected(new Set()); void run('delete', () => deleteQuotes(ids), ids.length === 1 ? 'Quote deleted' : `${ids.length} quotes deleted`) }}
      />
    </div>
  )
}
