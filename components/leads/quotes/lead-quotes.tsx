'use client'

import { useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { DatePicker } from '@/components/om/date-picker'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { Quote } from '@/lib/db/schema'
import { EMPTY_QUOTE_FILTERS, activeQuoteFilterCount, applyQuoteFilters, searchQuotes, type QuoteFilters, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { QuoteApproval } from '@/lib/settings/types'
import type { LeadQuotesData } from '@/lib/leads/quotes'
import { archiveQuote, createQuote, deleteQuotes, setDefaultTemplate, setQuoteDue, setQuoteStatus } from '@/app/leads/quotes-actions'
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
export function LeadQuotes({ leadId, leadName, data, approval }: { leadId: string; leadName: string; data: LeadQuotesData; approval: QuoteApproval }) {
  const { quotes, templates, priceBookCount, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()

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
      <QuotesToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)}
        query={query} onQuery={setQuery}
        onCreate={openCreate}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={(a) => (a === 'templates' ? router.push('/company/templates/quotes') : comingSoon())}   /* (REG-516) Manage Templates goes to Company › Templates › Quotes */
      />
      {quotes.length === 0 ? (
        <QuotesEmpty onFromScratch={openCreate} onFromTemplate={openCreate} />
      ) : nothingMatches ? (
        <TabSearchEmpty noun="quotes" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_QUOTE_FILTERS) }} />
      ) : (
        <QuotesTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          quotes={visible} now={now} approval={approval}
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
        render={{ brand: data.brand, sample: data.sample }}
        onClose={() => setCreateOpen(false)}
        onStart={(templateId) => { void startQuote(templateId) }}
        onSetDefault={(id) => { void run('set the default template', () => setDefaultTemplate(id), 'Default template updated', { refresh: true }) }}
      />
      <DeleteQuotesDialog
        open={!!deleting} count={deleting?.length ?? 1}
        onNo={() => setDeleting(null)}
        onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; setSelected(new Set()); void run('delete', () => deleteQuotes(ids), ids.length === 1 ? 'Quote deleted' : `${ids.length} quotes deleted`) }}
      />
    </div>
  )
}
