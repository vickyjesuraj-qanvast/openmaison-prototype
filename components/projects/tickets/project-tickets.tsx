'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { createTicket } from '@/app/projects/tickets-actions'
import { EMPTY_TICKET_FILTERS, isLive, keepsTicket, ticketFilterCount, type TicketFilters } from '@/lib/projects/tickets-model'
import type { ProjectTicketsData, TicketRow } from '@/lib/projects/tickets'
import { NewTicketDialog, type NewTicketInput } from './ticket-dialogs'
import { TicketCard, TicketDrawer } from './ticket-parts'
import { TicketsFiltersModal } from './tickets-filters-modal'
import styles from './tickets.module.css'

export type TicketScope = 'open' | 'done' | 'all'
export const scopeOf = (t: TicketRow, s: TicketScope) => (s === 'all' ? true : s === 'open' ? isLive(t.status) : !isLive(t.status))
/** (the calm UI build 2026-10-27, 1-22 · 1-25 · 3-39 · W-296 · W-342 · W-580) the house Chips (an in-list filter, 1-26) with the house count —
    "Open · 3 · Closed · 1 · All · 4", never "(n)", never a zero; "Closed" holds the resolved and the closed (its value stays `done`). */
const counted = (label: string, n: number) => (n > 0 ? `${label} · ${n}` : label)
export const scopeChips = (list: TicketRow[]) => [
  { value: 'open', label: counted('Open', list.filter((t) => isLive(t.status)).length) },
  { value: 'done', label: counted('Closed', list.filter((t) => !isLive(t.status)).length) },
  { value: 'all', label: counted('All', list.length) },
]

/**
 * (gaps build H — H-Q2 · H-Q9) A project's Tickets tab: the house tab toolbar (Tickets · New ticket), Open / Resolved and closed / All, a card
 * per ticket — the studio's turn first, then urgent, then the newest — and the ticket in the house Drawer. `?open=<ticket>` (the bell, the
 * search) lands on it. A first run says what lands here and offers New ticket.
 * (parity map 2026-10-10, UC-047) Filters — Priority · Status · Looks after (the house pattern, live), the button in the toolbar beside New
 * ticket; a Status pick widens the chips to All, a chip pressed clears it.
 */
export function ProjectTickets({ data, views }: { data: ProjectTicketsData; /** (simplify S-03) the Client group's view switch, in the title's place */ views?: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const [scope, setScope] = useState<TicketScope>('open')
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const first = data.project.client.split(/\s+/)[0] ?? data.project.client
  /* `?open=` lands on its ticket (a closed one widens the scope to All so its card is there behind the drawer) */
  const param = params.get('open')
  const [seenParam, setSeenParam] = useState<string | null>(null)
  if (param && param !== seenParam) {
    setSeenParam(param)
    const t = data.tickets.find((x) => x.id === param)
    if (t) { setOpenId(t.id); if (!isLive(t.status)) setScope('all') }
  }
  useEffect(() => {
    if (!param) return
    if (!data.tickets.some((x) => x.id === param)) snackbar({ message: 'This issue isn’t there any more' })   // (the calm UI build 2026-10-27, 3-37) "Issues" on screen
    const next = new URLSearchParams(params.toString()); next.delete('open')
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [param, data.tickets, params, pathname, router, snackbar])

  /* (UC-047) Filters */
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_TICKET_FILTERS)
  const [filtering, setFiltering] = useState(false)
  const filterCount = ticketFilterCount(filters)
  const applyFilters = (f: TicketFilters) => { setFilters(f); if (f.status.length) setScope('all') }
  const pickScope = (s: TicketScope) => { setScope(s); if (s !== 'all' && filters.status.length) setFilters((f) => ({ ...f, status: [] })) }
  const list = data.tickets.filter((t) => scopeOf(t, scope) && keepsTicket(t, filters))
  const open = openId ? data.tickets.find((t) => t.id === openId) ?? null : null
  const add = async (i: NewTicketInput) => {
    try {
      const r = await createTicket(data.project.id, i)
      if ('error' in r) { snackbar({ message: couldnt('add the issue', refusalOf(r.error)) }); return false }
      setAdding(false); setScope('open'); setOpenId(r.id)
      snackbar({ message: `${r.number} added — ${first} sees it on their page` })
      router.refresh(); return true
    } catch { snackbar({ message: 'Couldn’t add the issue — please try again' }); return false }
  }
  return (
    <div className={styles.tab} data-testid="project-tickets">
      <div className={styles.bar}>
        {views ?? <h2 className={styles.title}>Issues</h2>}
        <div className={styles.actions}>
          {data.tickets.length ? (
            <span className={styles.filterWrap}>
              <Tooltip label="Filters" shortcut="filters">
                <IconButton icon="filter_list" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} onClick={() => setFiltering(true)} selected={filterCount > 0} data-kb="filters" data-kb-label="Filters" data-testid="tickets-filter-open" />
              </Tooltip>
              {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
            </span>
          ) : null}
          {/* (the calm UI build 2026-10-27, 3-12 · 1-11 · T-03) "New issue", outlined — a tab body's create; the page's one filled button is the header's */}
          {data.mayChange && data.tickets.length ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setAdding(true)} data-testid="new-ticket">New issue</Button> : null}
        </div>
      </div>
      {data.tickets.length ? (
        <>
          <Chips label="Show" options={scopeChips(data.tickets)} value={scope} onChange={(v) => pickScope(v as TicketScope)} testId="ticket-scope" />
          {list.length ? (
            <div className={styles.list} data-testid="ticket-list">
              {list.map((t) => <TicketCard key={t.id} t={t} now={data.now} scope={scope} onOpen={() => setOpenId(t.id)} />)}
            </div>
          ) : (
            <EmptyState icon="handyman" tone="plain" testId="tickets-none" title={filterCount ? 'No issues match the filters' : scope === 'open' ? 'Nothing open' : 'Nothing here yet'}
                        help={filterCount ? 'Clear a filter to see more.' : scope === 'open' ? `Every issue on this project is resolved or closed. ${first} can report another on their page.` : 'Resolved and closed issues land here.'}
                        primary={filterCount ? { label: 'Clear the filters', onPress: () => setFilters(EMPTY_TICKET_FILTERS) } : null} />
          )}
        </>
      ) : (
        <EmptyState icon="handyman" testId="tickets-empty" title="No issues yet"
                    help={`When ${first} reports a problem on their page — a leak, a scratch, a door that sticks — it lands here with their photos, and you answer it here. You can add one for them too.`}
                    primary={data.mayChange ? { label: 'New issue', icon: 'add', onPress: () => setAdding(true) } : null} />
      )}
      {open ? (
        <TicketDrawer ticket={open} lines={data.threads[open.id] ?? []} team={data.team} mayChange={data.mayChange} me={data.me} now={data.now}
                      onClose={() => setOpenId(null)} onChanged={() => router.refresh()} />
      ) : null}
      <TicketsFiltersModal open={filtering} people={data.team.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))} value={filters} onApply={applyFilters} onClose={() => setFiltering(false)} />
      <NewTicketDialog open={adding} categories={data.categories} team={data.team} client={data.project.client} onClose={() => setAdding(false)} onSave={add} />
    </div>
  )
}
