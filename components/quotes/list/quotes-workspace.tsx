'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { Icon } from '@/components/om/icon'
import { Button } from '@/components/ds'
import { LeadsSkeleton } from '@/components/shell/skeleton'
import { DatePicker } from '@/components/om/date-picker'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { QuotesToolbar } from '@/components/leads/quotes/quotes-toolbar'
import { QuotesTable, type QuoteRowAction } from '@/components/leads/quotes/quotes-table'
import { QuotesEmpty } from '@/components/leads/quotes/quotes-empty'
import { QuotesFiltersModal } from '@/components/leads/quotes/quotes-filters-modal'
import { DeleteQuotesDialog } from '@/components/leads/quotes/delete-dialog'
import { CreateQuoteModal } from '@/components/quotes/create-quote-modal'
import { archiveQuote, createQuote, deleteQuotes, setDefaultTemplate, setQuoteDue, setQuoteStatus } from '@/app/leads/quotes-actions'
import type { Quote } from '@/lib/db/schema'
import { EMPTY_QUOTE_FILTERS, activeQuoteFilterCount, applyQuoteFilters, searchQuotes, type QuoteFilters, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { StudioQuotesData } from '@/lib/quotes/list'
import pageStyles from '@/app/leads/leads.module.css'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { quoteColumnDefs, quoteShowApproval } from '@/components/leads/quotes/quotes-table'
import styles from './quotes-workspace.module.css'

/**
 * Tools › Quotes (REG-422; owner 2026-09-11: the Quotes tile "lands on a studio-wide list … with Create Quote + Client
 * field"): every quote in the studio — the Quotes tab's toolbar, table, filters, bulk bar and dialogs (components/leads/
 * quotes/*), with a Client column that links to the lead's Quotes tab, a search that also matches the client's name, and
 * Create Quote opening the modal with a Client field on top. Actions run through the tabs' shared `useRun`.
 */
export function QuotesWorkspace({ data, newTemplateId, templateId }: { data: StudioQuotesData; newTemplateId?: string | null; templateId?: string | null }) {
  const { quotes, leads, templates, priceBookCount, approval, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()
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
  const visible = useMemo(() => {
    const base = applyQuoteFilters(templateFilter ? quotes.filter((x) => x.templateId === templateFilter.id) : quotes, filters, now)
    const q = query.trim().toLowerCase()
    return q ? base.filter((x) => searchQuotes([x], query).length > 0 || (nameOf.get(x.id) ?? '').toLowerCase().includes(q)) : base
  }, [quotes, filters, query, now, nameOf, templateFilter])
  const nothingMatches = quotes.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0)
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
  const onStatus = (quote: Quote, status: QuoteStatus) => {
    if (status === quote.status) return
    void run('change the status', () => setQuoteStatus(quote.id, status), `Quote marked ${status}`)
  }
  const openDue = (quote: Quote, anchor: HTMLElement) => { dueAnchor.current = anchor; setDueFor((d) => (d?.el === anchor ? null : { quoteId: quote.id, el: anchor })) }
  const rowMenu = (quote: Quote, action: QuoteRowAction) => {
    if (action === 'copy') {
      const url = `${window.location.origin}/quotes/${quote.id}`
      void navigator.clipboard?.writeText(url).then(() => snackbar({ message: 'Link copied' }), () => fail('copy the link'))
    } else if (action === 'archive') {
      void run('archive the quote', () => archiveQuote(quote.id), { message: 'Quote archived', actionLabel: 'Undo', onAction: () => { void run('restore the quote', () => archiveQuote(quote.id, true), 'Quote restored') } })
    } else if (action === 'delete') {
      setDeleting([quote.id])
    } else {
      comingSoon()
    }
  }
  const selectedIds = [...selected]

  return (
    <PageReveal skeleton={<LeadsSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeader title="Quotes" />
        <div className={styles.frame}>
          <QuotesToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)} query={query} onQuery={setQuery} searchPlaceholder="Search title, number, client…" onCreate={() => setCreateOpen(true)} onFilter={() => setFiltersOpen(true)} filterCount={filterCount} onMenu={(a) => (a === 'templates' ? router.push(withFrom('/company/templates/quotes', '/quotes')) : comingSoon())}   /* (REG-516) Manage Templates goes to Company › Templates › Quotes */ />
          {templateFilter ? (
            <div className={styles.templateChip} role="status">
              <Icon name="style" size={18} weight={300} /> Quotes on <b>{templateFilter.name}</b>
              <Button appearance="text" onPress={() => router.replace('/quotes')}>Show all quotes</Button>
            </div>
          ) : null}
          {quotes.length === 0 ? (
            <QuotesEmpty onFromScratch={() => setCreateOpen(true)} onFromTemplate={() => setCreateOpen(true)} />
          ) : nothingMatches ? (
            <TabSearchEmpty noun="quotes" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_QUOTE_FILTERS) }} />
          ) : (
            <QuotesTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder} quotes={visible} now={now} approval={approval} selected={selected} onSelect={setSelected}
                         onStatus={onStatus} onDue={openDue} onView={openQuote} onRowMenu={rowMenu}
                         clientOf={(q) => ({ name: nameOf.get(q.id) ?? '', href: withFrom(`/leads/${q.leadId}/quotes`, '/quotes') })} />
          )}
        </div>
        <DetailBulkBar count={selected.size} actions={[{ label: 'Delete', tone: 'danger', onClick: () => setDeleting(selectedIds) }]} onClear={() => setSelected(new Set())} />
        <DatePicker open={!!dueFor} anchorRef={dueAnchor} anchorKey={dueFor?.quoteId ?? ''} value={dueQuote?.dueAt ?? null} today={new Date(now)} label="Due date"
                    onSelect={(date) => { const q = dueQuote; setDueFor(null); if (q) void run('set the due date', () => setQuoteDue(q.id, date), date ? { message: 'Due date set — follow-up task added', actionLabel: 'View', onAction: () => router.push(withFrom(`/leads/${q.leadId}/tasks`, '/quotes')) } : 'Due date cleared') }} onClose={() => setDueFor(null)} />
        <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
        <QuotesFiltersModal open={filtersOpen} value={filters} now={now} approval={approval} onApply={setFilters}   /* (REG-464) live — the modal closes on Done */ onClose={() => setFiltersOpen(false)} />
        <CreateQuoteModal open={createOpen} leadName="" clients={leads} templates={templates} priceBookCount={priceBookCount} now={now} onClose={() => { setCreateOpen(false); setPreselect(null) }}
                          render={{ brand: data.brand, sample: data.sample, extras: data.extras }} preselect={preselect}
                          onStart={(templateId, clientId) => { void startQuote(templateId, clientId) }}
                          onSetDefault={(id) => { void run('set the default template', () => setDefaultTemplate(id), 'Default template updated', { refresh: true }) }} />
        <DeleteQuotesDialog open={!!deleting} count={deleting?.length ?? 1} onNo={() => setDeleting(null)}
                            onYes={() => { const ids = deleting; setDeleting(null); if (!ids) return; setSelected(new Set()); void run('delete', () => deleteQuotes(ids), ids.length === 1 ? 'Quote deleted' : `${ids.length} quotes deleted`, { refresh: true }) }} />
      </div>
    </PageReveal>
  )
}
