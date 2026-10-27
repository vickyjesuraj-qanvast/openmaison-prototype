'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetLayout } from '@/components/om/sheet'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { PageHeader } from '@/components/shell/page-header'
import { PageReveal } from '@/components/shell/page-reveal'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { createTicket, readTicket } from '@/app/projects/tickets-actions'
import { GhostShape, useRememberShape } from '@/lib/ghost-shape'
import { withFrom } from '@/lib/nav'
import { filterByQuery } from '@/lib/search'
import type { StudioTicketsData, TicketLine, TicketProject, TicketRow, TicketTeamMember } from '@/lib/projects/tickets'
import { TicketCard, TicketDrawer } from './ticket-parts'
import { mayTakeTicket } from '@/lib/projects/policy'
import { TicketScopeControl, scopeOf, type TicketScope } from './project-tickets'
import { NewTicketDialog, type NewTicketInput } from './ticket-dialogs'
import { STUDIO_TICKETS_SHAPE, StudioTicketsGhost } from './studio-tickets-ghost'
import { TicketsFiltersModal, type TicketPerson } from './tickets-filters-modal'
import { EMPTY_TICKET_FILTERS, keepsTicket, ticketFilterCount, type TicketFilters } from '@/lib/projects/tickets-model'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './tickets.module.css'

type Open = { ticket: TicketRow; lines: TicketLine[]; team: TicketTeamMember[]; mayChange: boolean }

/**
 * (gaps build H — H-Q2) Projects › Tickets: every ticket on the projects the viewer sees (Who sees leads), the studio's turn first — the
 * project tab's cards with the project named, Open / Resolved and closed / All and a search, the ticket in the same drawer (read fresh on open).
 * Opened by the Projects ⋮'s Tickets row (REG-1425 moved it from the header), the Dashboard's Tickets tile, the bell and ⌘K; `?open=` lands
 * on one.
 * (parity map 2026-10-10, UC-047) Filters — Priority · Status · Looks after (the house pattern, live); a Status pick widens the chips to All.
 * (pending modules S46B — his "fix everything" 2026-10-19 after the findability audit, M1; 1.0's Escalations › New Ticket) **New ticket**, in
 * the header as the rail's Tasks page carries Add Task (REG-466) — on the empty card while there is none: pick the project (the house picker,
 * the ones this member may not change kept with the rule), then the project tab's own New ticket compose; the new ticket opens in the drawer.
 * `?new=1` opens it (⌘K's Create, 1.0's /escalations/new), `&project=` straight onto that project's compose. Shown only while some project
 * can take one (`createTicket`'s rule: the project's team, their Managers, Owners and Admins).
 */
export function StudioTickets({ data, from }: { data: StudioTicketsData; from?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const [scope, setScope] = useState<TicketScope>('open')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Open | null>(null)
  /* (Dane's Tickets review) the last ticket opened stays mounted after a close, so the drawer slides out instead of vanishing */
  const [shown, setShown] = useState<Open | null>(null)
  if (open && open !== shown) setShown(open)
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
  const here = withFrom('/tickets', from)

  /* (S46B, M1) New ticket — (Dane's Tickets review, 2026-10-26) one form: the project is its first field, the project tab's compose below it */
  const raise = data.raise
  const sheet = useSheetLayout()
  /* the project the compose is for — kept while the dialog closes, so its words never empty mid-way */
  const [composeFor, setComposeFor] = useState<TicketProject | null>(null)
  const [composing, setComposing] = useState(false)
  /* the projects this member may raise on, named "Name · P-number" in the form's select */
  const raisable = (raise?.projects ?? []).filter((x) => !x.blocked)
  const projectLabel = (x: TicketProject) => `${x.name} · ${x.number}`
  const startNew = (projectId?: string | null) => {
    if (!raise) { snackbar({ message: 'There’s no project you can raise a ticket on' }); return }   // (invented copy)
    setComposeFor((projectId ? raisable.find((x) => x.id === projectId) : null) ?? null); setComposing(true)
  }
  const newParam = params.get('new') === '1' ? params.get('project') ?? '' : null
  useEffect(() => {
    if (newParam === null) return
    window.setTimeout(() => startNew(newParam || null), 0)   // opened once the address is read (never a set-state inside the effect's body)
    const next = new URLSearchParams(params.toString()); next.delete('new'); next.delete('project')
    const q = next.toString(); router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [newParam])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival
  /* the compose's Looked after by: the project's team first, then the studio — the tab's own order (`teamFor`) */
  /* (Dane's Tickets review — Vicky's call) only who may work on the picked project — before a pick, Owners and Admins */
  const composeTeam: TicketTeamMember[] = raise
    ? raise.members.filter((m) => mayTakeTicket(m, composeFor?.teamIds ?? [])).map((m) => ({ ...m, onTeam: !!composeFor?.teamIds.includes(m.id) })).sort((a, b) => Number(b.onTeam) - Number(a.onTeam) || a.name.localeCompare(b.name))
    : []
  const add = async (i: NewTicketInput) => {
    const at = composeFor
    if (!at) return false
    try {
      const r = await createTicket(at.id, i)
      if ('error' in r) { snackbar({ message: couldnt('add the ticket', refusalOf(r.error)) }); return false }
      setComposing(false); setScope('open')
      snackbar({ message: `${r.number} added — ${at.client.split(/\s+/)[0] ?? at.client} sees it on their page` })   // the project tab's words
      router.refresh(); void load(r.id)
      return true
    } catch { snackbar({ message: 'Couldn’t add the ticket — please try again' }); return false }
  }
  const first = data.tickets.length === 0
  useRememberShape(STUDIO_TICKETS_SHAPE, first)   // (REG-708) the loader draws the first-run card next time while there is none
  const newButton = raise && !first ? (sheet ? (
    <Tooltip label="New ticket" shortcut="create"><IconButton icon="add" label="New ticket" variant="filled" onClick={() => startNew()} data-kb="create" data-kb-label="New ticket" data-testid="studio-new-ticket" /></Tooltip>
  ) : (
    <span data-kb="create" data-kb-label="New ticket"><Button iconStart={<Icon name="add" size={20} />} onPress={() => startNew()} data-testid="studio-new-ticket">New ticket</Button></span>
  )) : null
  return (
    <PageReveal skeleton={<GhostShape first={first}><StudioTicketsGhost raise={!!raise} /></GhostShape>}>
      <div className={pageStyles.body} data-testid="studio-tickets">
        {/* (S46 — REG-2524) a rail place of its own, as Tasks is: the L1 header, its New ticket in the actions */}
        <PageHeader title="Tickets" actions={newButton} />
        <div className={pageStyles.content}>
          {data.tickets.length ? (
            <div className={styles.tab}>
              <div className={styles.bar}>
                <span className={styles.chips}><TicketScopeControl tickets={data.tickets} scope={scope} onPick={pickScope} /></span>
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
                        help={`When a client reports a problem on their page — a leak, a scratch, a door that sticks — it lands on the project’s Tickets tab and here, with their photos.${raise ? ' You can add one for them too.' : ''}`}
                        primary={raise ? { label: 'New ticket', icon: 'add', onPress: () => startNew(), testId: 'studio-new-ticket' } : null} />
          )}
        </div>
        <TicketsFiltersModal open={filtering} people={people} value={filters} onApply={applyFilters} onClose={() => setFiltering(false)} />
        {raise ? (<>
          <NewTicketDialog open={composing} categories={raise.categories} team={composeTeam} client={composeFor?.client ?? ''} onClose={() => setComposing(false)} onSave={add}
                           project={{ options: raisable.map(projectLabel), value: composeFor ? projectLabel(composeFor) : '', onChange: (l) => setComposeFor(raisable.find((x) => projectLabel(x) === l) ?? null) }} />
        </>) : null}
        {shown ? (
          <TicketDrawer open={!!open} ticket={shown.ticket} lines={shown.lines} team={shown.team} mayChange={shown.mayChange} me={data.me} now={data.now} showProject
                        onOpenProject={() => router.push(withFrom(`/projects/${shown.ticket.projectId}/tickets?open=${encodeURIComponent(shown.ticket.id)}`, here))}
                        onClose={() => setOpen(null)} onChanged={() => { void load(shown.ticket.id); router.refresh() }} />
        ) : null}
      </div>
    </PageReveal>
  )
}
