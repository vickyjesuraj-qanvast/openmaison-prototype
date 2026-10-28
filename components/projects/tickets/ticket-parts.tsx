'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Chips } from '@/components/om/chips'
import { Drawer, DrawerRule } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { assignTicket, escalateTicket, reopenTicket, replyTicket, resolveTicket, ticketToTask, ticketToVariation, undoEscalateTicket } from '@/app/projects/tickets-actions'
import { withFrom } from '@/lib/nav'
import { NO_ASK, type AskLinks } from '@/lib/projects/client-asks-model'
import { relativeTime } from '@/lib/format'
import { PRIORITY_WORDS, STATUS_TONE, STATUS_WORDS, PHOTOS_MAX, eventLine, isLive, reportedLine, ticketDay } from '@/lib/projects/tickets-model'
import type { TicketLine, TicketRow, TicketTeamMember } from '@/lib/projects/tickets'
import { ThreadComposer, ThreadLines, type ThreadItem } from '../threads/thread'
import { AskMenu } from '../threads/ask-menu'
import { EscalateDialog, ResolveDialog } from './ticket-dialogs'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { mayTakeTicket } from '@/lib/projects/policy'
import styles from './tickets.module.css'

/** "Your turn" · "Benjamin’s turn" — whose word is next on a live ticket (the studio's side). (the calm UI build 2026-10-27, 1-22 · W-427: was
    "Waiting on you" · "Waiting on Benjamin", which read under the avatar of the member who looks after it as if they were the one waiting) */
export const turnWords = (t: Pick<TicketRow, 'turn' | 'client'>) => (t.turn === 'studio' ? 'Your turn' : t.turn === 'client' ? `${t.client.split(/\s+/)[0]}’s turn` : null)

/** One ticket in a list: its subject first, the line under it, the newest word, whose turn it is and who it's assigned to.
    (the calm UI build 2026-10-27, 1-22 · T-06 · T-09) The subject leads — the number moved to the end of the line under it; the project is named by
    its name (its number is the drawer's Project row); the category and the day are that line's words, never caps tags. `scope` = the list's
    scope: a status the scope already says (Open on the Open list) is not repeated on the card — "Being fixed" still is. Who it's assigned to is
    the avatar's tooltip, "Assigned to Germaine" — (Dane's Tickets review, merged 2026-10-28, his change 9) his word over the calm build's
    "Handled by" (W-244), "Unassigned" when nobody has it. */
export function TicketCard({ t, now, showProject = false, scope, onOpen }: { t: TicketRow; now: number; showProject?: boolean; scope?: 'open' | 'done' | 'all'; onOpen: () => void }) {
  const turn = turnWords(t)
  const saysStatus = !(scope === 'open' && t.status === 'open')
  return (
    <button type="button" className={styles.card} onClick={onOpen} data-testid="ticket-card" data-ticket={t.id} data-status={t.status} data-turn={t.turn ?? undefined}>
      <span className={styles.head}>
        <span className={styles.subject}>{t.subject}</span>
        {saysStatus ? <MetaChip color={STATUS_TONE[t.status]}>{STATUS_WORDS[t.status]}</MetaChip> : null}
        {t.priority === 'urgent' && isLive(t.status) ? <MetaChip color="red" icon="flag">Urgent</MetaChip> : null}
      </span>
      <p className={styles.sub}>{[showProject ? t.projectName : null, t.category, ticketDay(t.createdAt, now), t.number].filter(Boolean).join(' · ')}</p>
      {t.last ? <p className={styles.last}>{`${t.last.by}: ${t.last.body || 'Photos'} · ${relativeTime(new Date(t.last.at), new Date(now))}`}</p> : <p className={styles.last}>{t.body || 'Photos only'}</p>}
      <span className={styles.side}>
        {turn ? <span className={styles.turn} data-turn={t.turn ?? undefined}>{turn}</span> : null}
        {t.assignee ? (
          <Tooltip label={`Assigned to ${t.assignee.name}`}>
            <span className={styles.handler} role="img" aria-label={`Assigned to ${t.assignee.name}`}><Avatar name={t.assignee.name} color={t.assignee.color} size={24} tooltip={false} /></span>
          </Tooltip>
        ) : <span className={styles.turn} data-turn="client">Unassigned</span>}
      </span>
    </button>
  )
}

/** A state line's words in the studio's thread — every one, the studio-only ones included. */
export function studioEventText(i: ThreadItem): { text: string; icon: string; tone?: 'green' } | null {
  const by = i.authorName
  if (i.event === 'escalated') return { text: `${eventLine('escalated', by)}${i.body ? `: “${i.body}”` : ''}`, icon: 'flag' }
  if (i.event === 'assigned') return { text: eventLine('assigned', by, i.body || null), icon: 'person' }
  if (i.event === 'priority') return { text: eventLine('priority', by, i.body || 'Normal'), icon: 'flag' }
  if (i.event === 'resolved') return { text: eventLine('resolved', by), icon: 'check_circle', tone: 'green' }
  if (i.event === 'reopened') return { text: eventLine('reopened', by), icon: 'undo' }
  if (i.event === 'closed') return { text: eventLine('closed', by), icon: 'lock' }
  return null
}

/**
 * The ticket in the house Drawer: the report (subject, chips, who and when, the words, the photos), its facts (assigned to · priority),
 * the thread — replies, internal notes, state lines — and the composer with To the client · Internal note. Resolve and Escalate open their
 * dialogs; Reopen, Assign and Escalate's Undo act at once. `onChanged` re-reads the ticket after every landed write.
 */
export function TicketDrawer({ open = true, ticket: t, lines, team, mayChange, me, now, onClose, onChanged, showProject = false, onOpenProject }: {
  /** (Dane's Tickets review, 2026-10-26) false while it slides away — the host keeps the last ticket mounted so the house Drawer can play its exit */
  open?: boolean
  ticket: TicketRow; lines: TicketLine[]; team: TicketTeamMember[]; mayChange: boolean; me: { id: string }; now: number
  onClose: () => void; onChanged: () => void; showProject?: boolean; onOpenProject?: () => void
}) {
  /* (Dane's Tickets review — Vicky's call) the reassign menu offers only who may work on the project */
  const teamIds = team.filter((m) => m.onTeam).map((m) => m.id)
  const snackbar = useSnackbar()
  const router = useRouter()
  const pathname = usePathname()
  const [to, setTo] = useState<'client' | 'note'>('client')
  /* (simplify S-22) the ticket's own ⋮: Reply · Make a task · Raise a variation order — the links it made, kept here until the read comes back */
  const [focusKey, setFocusKey] = useState(0)
  const [made, setMade] = useState<{ id: string; links: Partial<AskLinks> } | null>(null)
  const [asking, setAsking] = useState(false)
  const extra = made?.id === t.id ? made.links : {}
  const links: AskLinks = { task: extra.task ?? (t.asks ?? NO_ASK).task, vo: extra.vo ?? (t.asks ?? NO_ASK).vo }
  const [resolving, setResolving] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const assignRef = useRef<HTMLSpanElement>(null)
  const live = isLive(t.status)
  const first = t.client.split(/\s+/)[0]
  const run = async <T extends object>(what: string, p: Promise<T | { error: string }>): Promise<T | null> => {
    try { const r = await p; if ('error' in r) { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return null } return r as T }
    catch { snackbar({ message: `Couldn’t ${what} — please try again` }); return null }
  }
  const reply = async (o: { body: string; photos: string[] }) => {
    const r = await run(to === 'note' ? 'add the note' : 'send the reply', replyTicket(t.id, { ...o, internal: to === 'note' }))
    if (!r) return false
    snackbar({ message: to === 'note' ? 'Note added — only the studio reads it' : `Reply sent — ${first} reads it on their page` })
    onChanged(); return true
  }
  const resolve = async (note: string) => {
    const r = await run('mark it resolved', resolveTicket(t.id, { note }))
    if (!r) return false
    setResolving(false)
    snackbar({ message: `${t.number} is resolved — ${first} can reply to reopen it`, actionLabel: 'Undo', onAction: () => { void run('put it back', reopenTicket(t.id, { to: r.was })).then((u) => { if (u) onChanged() }) } })
    onChanged(); return true
  }
  /* (the calm UI build 2026-10-27, 1-10 · W-181) Escalate → Flag to the Owner, in every word it says */
  const escalate = async (note: string) => {
    const r = await run('flag it to the Owner', escalateTicket(t.id, { note }))
    if (!r) return false
    setEscalating(false)
    snackbar({ message: `${t.number} is flagged — Owners and Admins heard it`, actionLabel: 'Undo', onAction: () => { void run('take the flag off', undoEscalateTicket(t.id)).then((u) => { if (u) onChanged() }) } })
    onChanged(); return true
  }
  const assign = async (memberId: string | null) => {
    setAssignOpen(false)
    /* (Dane's Tickets review, merged 2026-10-28 — his change 9) in "Assigned to"'s words (were the calm build's "handles", W-244) */
    const r = await run('change who it’s assigned to', assignTicket(t.id, { memberId }))
    if (!r) return
    const name = team.find((m) => m.id === memberId)?.name
    snackbar({ message: name ? `${t.number} is assigned to ${name}` : `${t.number} is unassigned now`, actionLabel: 'Undo', onAction: () => { void run('put it back', assignTicket(t.id, { memberId: r.was })).then((u) => { if (u) onChanged() }) } })
    onChanged()
  }
  const reopen = async () => {
    const r = await run('reopen it', reopenTicket(t.id))
    if (r) { snackbar({ message: `${t.number} is open again` }); onChanged() }
  }
  const toTask = async () => {
    if (links.task) { router.push(withFrom(`/projects/${t.projectId}/tasks?open=${encodeURIComponent(links.task.id)}`, pathname)); return }
    setAsking(true)
    const r = await run('make the task', ticketToTask(t.id))
    setAsking(false)
    if (!r) return
    setMade({ id: t.id, links: { ...(made?.id === t.id ? made.links : {}), task: { id: r.taskId, title: r.title, done: false } } })
    snackbar({ message: `Task added — “${r.title}”`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/projects/${t.projectId}/tasks?open=${encodeURIComponent(r.taskId)}`, pathname)) })
    onChanged()
  }
  const toVariation = async () => {
    if (links.vo) { router.push(withFrom(`/quotes/${links.vo.id}`, pathname)); return }
    setAsking(true)
    const r = await run('raise the variation order', ticketToVariation(t.id))
    setAsking(false)
    if (r) router.push(withFrom(`/quotes/${r.id}`, pathname))
  }
  return (
    /* (the calm UI build 2026-10-27, 3-37) "Issues" on screen; the drawer's accessible name keeps "Ticket {n}" (a probe's handle).
       (Dane's Tickets review, merged 2026-10-28 — his changes 4 · 6) it slides out on close; the foot's shadow leaves at the thread's end */
    <Drawer open={open} footShadowUntilEnd title={t.number} crumb="Issues / " onClose={onClose} label={`Ticket ${t.number}`} width="wide"
            footer={mayChange ? (live ? (
              <div className={styles.footWrap}>
                {/* (the calm UI build 2026-10-27, 1-22) the team's own line is a "Note · team only" — the words its line wears in the thread */}
                <ThreadComposer label={to === 'note' ? 'A note for the team' : `Reply to ${first}`} maxPhotos={PHOTOS_MAX} onSend={reply} focusKey={focusKey} testId="ticket-composer"
                                extra={<Chips label="Who reads it" options={[{ value: 'client', label: 'To the client' }, { value: 'note', label: 'Note · team only' }]} value={to} onChange={(v) => setTo(v === 'note' ? 'note' : 'client')} testId="ticket-to" />} />
              </div>
            ) : <div className={styles.footRow}><p className={styles.closedNote}>{t.status === 'resolved' ? `Resolved — ${first} can reply to reopen it.` : `Closed by ${t.raisedByName}.`}</p><Button variant="secondary" appearance="outlined" onPress={() => { void reopen() }} data-testid="ticket-reopen">Reopen</Button></div>) : (
              /* (Dane's Tickets review, 2026-10-26 — his change 12, merged 2026-10-28 in the calm build's "issue") the foot says why there is no reply box */
              <ReadOnlyNote text="Only the project’s team, their Managers, Owners and Admins can work on this issue." />
            )}>
      <div className={styles.drawerBody} data-testid="ticket-drawer" data-status={t.status}>
        <div className={styles.report}>
          {/* (the calm UI build 2026-10-27, 1-22 · T-06) the status and Urgent stay tags; the category moved to the facts below (a fact, not a state) */}
          <div className={styles.reportHead}>
            <MetaChip color={STATUS_TONE[t.status]}>{STATUS_WORDS[t.status]}</MetaChip>
            {t.priority === 'urgent' ? <MetaChip color="red" icon="flag">Urgent</MetaChip> : null}
            <AskMenu label={t.number} links={links} money={mayChange} busy={asking}
                     onReply={mayChange && live ? () => { setTo('client'); setFocusKey((k) => k + 1) } : undefined}
                     onTask={mayChange || links.task ? () => { void toTask() } : undefined}
                     onVariation={mayChange || links.vo ? () => { void toVariation() } : undefined} />
          </div>
          <h3 className={styles.reportSubject}>{t.subject}</h3>
          {/* (the calm UI build 2026-10-27, W-198) "Reported by Mei Ling Han on 18 Oct" (was "From the portal · Reported 18 Oct ’26 by …") — "Raised by" when the studio raised it */}
          <p className={styles.sub}>{reportedLine({ client: t.raisedKind === 'client', by: t.raisedByName, day: ticketDay(t.createdAt, now) })}</p>
          {t.body ? <p className={styles.reportBody}>{t.body}</p> : null}
          {t.photos.length ? (
            <div className={styles.photos}>
              {t.photos.map((p, k) => (
                <button key={p.id} type="button" className={styles.photo} aria-label={`Photo ${k + 1} of ${t.photos.length}`} onClick={() => window.open(p.src, '_blank', 'noopener')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
          {t.escalatedAt && live ? <div className={styles.escalated} data-testid="ticket-escalated"><Icon name="flag" size={18} /><span>{`Flagged to the Owner ${relativeTime(new Date(t.escalatedAt), new Date(now))}${t.escalateNote ? ` — “${t.escalateNote}”` : ''}`}</span></div> : null}
        </div>
        <dl className={styles.facts}>
          {showProject ? <><dt>Project</dt><dd>{onOpenProject ? <button type="button" className={styles.factLink} onClick={onOpenProject}>{`${t.projectName} · ${t.projectNumber}`}</button> : `${t.projectName} · ${t.projectNumber}`}</dd></> : null}
          <dt>Client</dt><dd>{t.client}</dd>
          <dt>Category</dt><dd>{t.category}</dd>
          {/* (Dane's Tickets review, merged 2026-10-28 — changes 2 · 9 · 13) "Assigned to" (was the calm build's "Handled by", W-244), the house text
              link at the rows' size, its menu only who can work on the project */}
          <dt>Assigned to</dt>
          <dd>
            <span ref={assignRef}>
              {mayChange ? <button type="button" className={styles.factLink} onClick={() => setAssignOpen((o) => !o)} aria-haspopup="menu" aria-expanded={assignOpen} data-testid="ticket-assign">{t.assignee?.name ?? 'Unassigned — pick someone'}</button> : t.assignee?.name ?? 'Unassigned'}
            </span>
            <PortalMenu open={assignOpen} anchor={assignRef} onClose={() => setAssignOpen(false)} align="left" width={MENU_WIDTH.detail} role="menu" sheetTitle="Assigned to">
              {team.filter((m) => mayTakeTicket(m, teamIds)).map((m) => <DropdownItem key={m.id} role="menuitemradio" checked={t.assignee?.id === m.id} onSelect={() => { void assign(m.id) }}>{m.onTeam ? `${m.name} · on this project` : `${m.name} · ${m.role}`}</DropdownItem>)}
              {t.assignee ? <DropdownItem onSelect={() => { void assign(null) }}>Unassigned</DropdownItem> : null}
            </PortalMenu>
          </dd>
          <dt>Priority</dt><dd>{PRIORITY_WORDS[t.priority]}</dd>
          {t.resolvedAt ? <><dt>Resolved</dt><dd>{ticketDay(t.resolvedAt, now)}</dd></> : null}
        </dl>
        {mayChange && live ? (
          <div className={styles.tools}>
            {/* (the calm UI build 2026-10-27, 1-22 · T-03) Mark resolved outlined — Send, the composer's, is the drawer's one filled button */}
            <Button variant="secondary" appearance="outlined" onPress={() => setResolving(true)} iconStart={<Icon name="check" size={20} />} data-testid="ticket-resolve">Mark resolved</Button>
            {t.escalatedAt ? null : <Button variant="secondary" appearance="outlined" iconStart={<Icon name="flag" size={20} />} onPress={() => setEscalating(true)} data-testid="ticket-escalate">Flag to the Owner</Button>}
          </div>
        ) : null}
        <DrawerRule />
        {lines.length ? (
          <ThreadLines items={lines} me={{ kind: 'studio', id: me.id }} now={now} clientChip eventText={studioEventText} testId="ticket-thread" />
        ) : <p className={styles.closedNote}>{`No replies yet — ${first} reads what you send here on their page.`}</p>}
      </div>
      <ResolveDialog open={resolving} number={t.number} client={first ?? t.client} onClose={() => setResolving(false)} onSave={resolve} />
      <EscalateDialog open={escalating} number={t.number} onClose={() => setEscalating(false)} onSave={escalate} />
    </Drawer>
  )
}
