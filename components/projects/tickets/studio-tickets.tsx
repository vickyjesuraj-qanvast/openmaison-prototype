'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Chips } from '@/components/om/chips'
import { EmptyState } from '@/components/om/empty-state'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { readTicket } from '@/app/projects/tickets-actions'
import { withFrom } from '@/lib/nav'
import { filterByQuery } from '@/lib/search'
import type { StudioTicketsData, TicketLine, TicketRow, TicketTeamMember } from '@/lib/projects/tickets'
import { TicketCard, TicketDrawer } from './ticket-parts'
import { scopeChips, scopeOf, type TicketScope } from './project-tickets'
import { StudioTicketsGhost } from './studio-tickets-ghost'
import { TicketsFiltersModal, type TicketPerson } from './tickets-filters-modal'
import { EMPTY_TICKET_FILTERS, keepsTicket, ticketFilterCount, type TicketFilters } from '@/lib/projects/tickets-model'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './tickets.module.css'

type Open = { ticket: TicketRow; lines: TicketLine[]; team: TicketTeamMember[]; mayChange: boolean }

/**
 * (gaps build H — H-Q2) Projects › Tickets: every ticket on the projects the viewer sees (Who sees leads), the studio's turn first — the
 * project tab's cards with the project named, Open / Resolved and closed / All and a search, the ticket in the same drawer (read fresh on open).
 * Opened by the Projects header's Tickets button, the bell and ⌘K; `?open=` lands on one.
 * (parity map 2026-10-10, UC-047) Filters — Priority · Status · Looks after (the house pattern, live); a Status pick widens the chips to All.
 */
export function StudioTickets({ data, from }: { data: StudioTicketsData; from?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const [scope, setScope] = useState<TicketScope>('open')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Open | null>(null)
  const load = useCallback(async (id: string) => {
    const r = await readTicket(id).catch(() => null)
    if (!r || 'error' in r) { snackbar({ message: 'This ticket isn’t there any more' }); setOpen(null); return }
    setOpen({ ticket: r.ticket, lines: r.lines, team: r.team, mayChange: r.mayChange })
  }, [snackbar])
  const param = params.get('open')
  useEffect(() => {
    if (!param) return
    window.setTimeout(() => { void load(param) }, 0)   // opened once the address is read (never a set-state inside the effect's body)
    const next = new URLSearchParams(params.toString()); next.delete('open')
    const q = next.toString(); router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [param, params, pathname, router, load])
  /* (UC-047) Filters — a Status pick and the Open / Resolved chips would disagree, so a Status pick reads under All; a chip pressed clears it */
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_TICKET_FILTERS)
  const [filtering, setFiltering] = useState(false)
  const applyFilters = (f: TicketFilters) => { setFilters(f); if (f.status.length) setScope('all') }
  const pickScope = (s: TicketScope) => { setScope(s); if (s !== 'all' && filters.status.length) setFilters((f) => ({ ...f, status: [] })) }
  const people: TicketPerson[] = [...new Map(data.tickets.filter((t) => t.assignee).map((t) => [t.assignee!.id, { id: t.assignee!.id, name: t.assignee!.name, color: t.assignee!.color }])).values()]
  const filterCount = ticketFilterCount(filters)
  const inScope = data.tickets.filter((t) => scopeOf(t, scope) && keepsTicket(t, filters))
  const list = filterByQuery(inScope, query, (t) => ({ fields: [t.number, t.subject, t.body, t.category, t.projectName, t.projectNumber, t.client, t.assignee?.name ?? ''] }))
  const here = withFrom('/projects/tickets', from)
  return (
    <PageReveal skeleton={<StudioTicketsGhost />}>
      <div className={pageStyles.body} data-testid="studio-tickets">
        <PageHeaderL2 backHref={from ?? '/projects'} crumb="Projects" title="Tickets" />
        <div className={pageStyles.content}>
          {data.tickets.length ? (
            <div className={styles.tab}>
              <div className={styles.bar}>
                <span className={styles.chips}><Chips label="Show" options={scopeChips(data.tickets)} value={scope} onChange={(v) => pickScope(v as TicketScope)} testId="ticket-scope" /></span>
                <span className={styles.actions}>
                  <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search number, subject, project…" label="Search tickets" />
                  <span className={styles.filterWrap}>
                    <Tooltip label="Filters" shortcut="filters">
                      <IconButton icon="filter_list" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} onClick={() => setFiltering(true)} selected={filterCount > 0} data-kb="filters" data-kb-label="Filters" data-testid="tickets-filter-open" />
                    </Tooltip>
                    {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
                  </span>
                </span>
              </div>
              {list.length ? (
                <div className={styles.list} data-testid="ticket-list">
                  {list.map((t) => <TicketCard key={t.id} t={t} now={data.now} showProject onOpen={() => { void load(t.id) }} />)}
                </div>
              ) : (
                <EmptyState icon="handyman" tone="plain" testId="tickets-none" title={query.trim() ? `No tickets match “${query.trim()}”` : filterCount ? 'No tickets match the filters' : scope === 'open' ? 'Nothing open' : 'Nothing here yet'}
                            help={query.trim() ? 'Try a number, a word of the subject or the project’s name.' : filterCount ? 'Clear a filter to see more.' : 'Every ticket the studio holds is resolved or closed.'}
                            primary={filterCount ? { label: 'Clear the filters', onPress: () => setFilters(EMPTY_TICKET_FILTERS) } : null} />
              )}
            </div>
          ) : (
            <EmptyState icon="handyman" testId="studio-tickets-empty" title="No tickets yet"
                        help="When a client reports a problem on their page — a leak, a scratch, a door that sticks — it lands on the project’s Tickets tab and here, with their photos." />
          )}
        </div>
        <TicketsFiltersModal open={filtering} people={people} value={filters} onApply={applyFilters} onClose={() => setFiltering(false)} />
        {open ? (
          <TicketDrawer ticket={open.ticket} lines={open.lines} team={open.team} mayChange={open.mayChange} me={data.me} now={data.now} showProject
                        onOpenProject={() => router.push(withFrom(`/projects/${open.ticket.projectId}/tickets?open=${encodeURIComponent(open.ticket.id)}`, here))}
                        onClose={() => setOpen(null)} onChanged={() => { void load(open.ticket.id); router.refresh() }} />
        ) : null}
      </div>
    </PageReveal>
  )
}
