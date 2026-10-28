'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ScopePill } from '@/components/om/scope-pill'
import { useSheetLayout } from '@/components/om/sheet'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
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
import { mayTakeTicket } from '@/lib/projects/policy'
import styles from './tickets.module.css'

export type TicketScope = 'open' | 'done' | 'all'
export const scopeOf = (t: TicketRow, s: TicketScope) => (s === 'all' ? true : s === 'open' ? isLive(t.status) : !isLive(t.status))
/** (the calm UI build 2026-10-27, 1-22 · 1-25 · 3-39 · W-296 · W-342 · W-580) the house count — "Open · 3", never "(n)", never a zero; "Closed"
    holds the resolved and the closed (its value stays `done`). (Dane's Tickets review, merged 2026-10-28 — his change 1) the order All · Open ·
    Closed, shared by the rail's Issues and a project's tab; Open stays the page's default pick. */
const counted = (label: string, n: number) => (n > 0 ? `${label} · ${n}` : label)
const scopeCounts = (list: TicketRow[]): { value: TicketScope; name: string; count: number }[] => [
  { value: 'all', name: 'All', count: list.length },
  { value: 'open', name: 'Open', count: list.filter((t) => isLive(t.status)).length },
  { value: 'done', name: 'Closed', count: list.filter((t) => !isLive(t.status)).length },
]
export const scopeChips = (list: TicketRow[]) => scopeCounts(list).map((o) => ({ value: o.value, label: counted(o.name, o.count) }))

/**
 * (Dane's Tickets review, 2026-10-26 — his change 3, merged 2026-10-28) The scope control, written once for the rail's Issues and a project's
 * tab: the chips on a tablet and the desk; ≤767 the Leads listing's scope pill ("Open · 3 ▾", the calm build's "Label · n") over the house
 * Dropdown — a bottom sheet there, "Issue status" — with the applied dot off Open.
 */
export function TicketScopeControl({ tickets, scope, onPick }: { tickets: TicketRow[]; scope: TicketScope; onPick: (s: TicketScope) => void }) {
  const phone = useSheetLayout()
  const [open, setOpen] = useState(false)
  const pillRef = useRef<HTMLButtonElement>(null)
  if (!phone) return <Chips label="Show" options={scopeChips(tickets)} value={scope} onChange={(v) => onPick(v as TicketScope)} testId="ticket-scope" />
  const options = scopeCounts(tickets)
  const current = options.find((o) => o.value === scope) ?? options[0]
  return (
    <span className={styles.scopeMenu} data-testid="ticket-scope">
      <ScopePill ref={pillRef} label={current ? counted(current.name, current.count) : 'All'} onClick={() => setOpen((o) => !o)} open={open} scoped={scope !== 'open'} />
      <Dropdown open={open} onClose={() => setOpen(false)} align="left" width={MENU_WIDTH.standard} sheetTitle="Issue status">
        {options.map((o) => (
          <DropdownItem key={o.value} role="menuitemradio" checked={o.value === scope} meta={String(o.count)} onSelect={() => { onPick(o.value); setOpen(false) }}>{o.name}</DropdownItem>
        ))}
      </Dropdown>
    </span>
  )
}

/**
 * (gaps build H — H-Q2 · H-Q9) A project's Tickets tab: the house tab toolbar (Issues · New issue), All / Open / Closed, a card
 * per ticket — the studio's turn first, then urgent, then the newest — and the ticket in the house Drawer. `?open=<ticket>` (the bell, the
 * search) lands on it. A first run says what lands here and offers New ticket.
 * (parity map 2026-10-10, UC-047) Filters — Priority · Status · Assigned to (the house pattern, live), the button in the toolbar beside New
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
  /* (Dane's Tickets review — Vicky's call) Assigned to offers only who may work on the project */
  const onTeamIds = data.team.filter((m) => m.onTeam).map((m) => m.id)
  const takers = data.team.filter((m) => mayTakeTicket(m, onTeamIds))
  /* (Dane's Tickets review) the last ticket opened stays mounted after a close, so the drawer slides out instead of vanishing */
  const [shown, setShown] = useState<TicketRow | null>(null)
  if (open && open !== shown) setShown(open)
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
          <TicketScopeControl tickets={data.tickets} scope={scope} onPick={pickScope} />
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
      {shown ? (
        <TicketDrawer open={!!open} ticket={shown} lines={data.threads[shown.id] ?? []} team={data.team} mayChange={data.mayChange} me={data.me} now={data.now}
                      onClose={() => setOpenId(null)} onChanged={() => router.refresh()} />
      ) : null}
      <TicketsFiltersModal open={filtering} people={data.team.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))} value={filters} onApply={applyFilters} onClose={() => setFiltering(false)} />
      <NewTicketDialog open={adding} categories={data.categories} team={takers} client={data.project.client} onClose={() => setAdding(false)} onSave={add} />
    </div>
  )
}
