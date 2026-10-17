'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { useSnackbar } from '@/components/om/snackbar'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { PageHeader } from '@/components/shell/page-header'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { readConversation } from '@/app/projects/messages-actions'
import { createGroupChat, startDirectChat, undoLeaveGroupChat } from '@/app/chat/actions'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { relativeTime, titleCaseName } from '@/lib/format'
import { backLabel, fromLabel, readFrom, withFrom } from '@/lib/nav'
import { filterByQuery } from '@/lib/search'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { INBOX_FILTERS, conversationKey, firstWords, keepsRow, parseConversationKey, type InboxFilter } from '@/lib/projects/messages-model'
import type { ChatStart, ConversationData, InboxRow } from '@/lib/projects/messages'
import { Conversation, conversationHref, readersLine } from './conversation'
import { ChatInboxGhost, PICK_HELP, PICK_TITLE } from './chat-ghost'
import { NewGroupDialog, NewMessageMenu } from './new-conversation'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './messages.module.css'

/** (pending modules S26) The chip a row wears: who the conversation is with, beyond a client's (which needs none). */
function KindChip({ r }: { r: Pick<InboxRow, 'kind' | 'chatType'> }) {
  if (r.kind === 'team' || r.kind === 'lead-team') return <MetaChip>Team</MetaChip>
  if (r.kind === 'lead') return <MetaChip color="blue">Client</MetaChip>   // (S42 audit C-23, call C·5) a lead's conversation with its client — "Team" is the other
  if (r.kind === 'chat') return <MetaChip>{r.chatType === 'group' ? 'Group' : r.chatType === 'studio' ? 'Studio' : 'Direct'}</MetaChip>
  return null
}
/** "Germaine: the cabinet came…" — a row's second line; a group's own line reads alone. */
function lineOf(r: InboxRow): string {
  if (!r.last) return r.kind === 'chat' && r.chatType === 'studio' ? 'Every member of the studio reads it' : 'No messages yet'
  if (r.last.removed) return 'Message removed'
  const words = firstWords(r.last.body || 'Photos', 90)
  if (!r.last.by) return words
  return `${r.last.kind === 'client' ? r.last.by.split(/\s+/)[0] : r.last.by}: ${words}`
}

/**
 * (gaps build H — H-Q11) The rail's Chat — every conversation the member sees (Who sees leads), the unread first, then the newest: the
 * project, the client, the newest line and its time, the unread count; the open one beside the list (≥1025), alone on a phone and a tablet
 * with Back to the list. `?open=<project>` lands on one (a project's Messages tab, the bell).
 * (parity map 2026-10-10 — UC-064 · UC-070) Every kind of conversation: a project's with its client, a project's team's (a Team chip), a lead's
 * before Won (a Lead chip — the lead invited to the portal wrote from their page; once Won it carries on in the project's). Pinned ones
 * first (a pin glyph), a muted one says so and leaves the rail's count. `?open=` takes a conversation's key (`project:` · `team:` · `lead:`)
 * or a bare project id; `&at=<message>` lands on a line (⌘K's Messages).
 * (pending modules S26 — her "build all of them" 2026-10-11; cards studio:team-chats · api:messages-free-chats) …and the studio's own: a lead's
 * Team conversation before Won (Team), two members' (Direct), a named group (Group), the studio's room every member reads (Studio) — one list,
 * one composer, never a second chat app. The page header's New message ▾ (C) starts one: A member › · A new group · A client (any lead or
 * project the viewer sees — invited to their page or not). The list's filters: 1.0's All · Unread, and who it is with — Clients · Team
 * (1.0's Escalations are Projects › Tickets). `?open=` takes `lead-team:` · `chat:` keys too.
 */
export function ChatInbox({ rows: initial, now, start, initialOpen = null, initialKey = null }: { rows: InboxRow[]; now: number; start: ChatStart
  /** (S42 audit C-15) the conversation the address named, read with the page (app/chat/page.tsx) — and the address's key for it */ initialOpen?: ConversationData | null; initialKey?: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const [rows, setRows] = useState(() => (initialOpen ? initial.map((x) => (x.key === initialOpen.key ? { ...x, unread: 0 } : x)) : initial))
  const [was, setWas] = useState(initial)
  if (was !== initial) { setWas(initial); setRows(initial) }
  const [query, setQuery] = useState('')
  /* (pending modules S22 — S26's note: 1.0's home "View messages") the Dashboard's Messages tile lands on the unread with `?show=unread` */
  const [filter, setFilter] = useState<InboxFilter>(() => (params.get('show') === 'unread' ? 'unread' : 'all'))
  const [open, setOpen] = useState<ConversationData | null>(initialOpen)
  /* (S42 audit C-15) the open conversation lives in the address (`?c=<key>`): a reload, a Back from Open lead or the browser's own Back lands on
     it again. A door's `?open=` becomes `?c=` once read; `&at=` stays for the conversation to land on its line (it drops it itself); `?from=`
     stays for the header's Back. Read at the moment of the change (never a stale render's address). */
  const keepInAddress = useCallback((key: string | null, unless?: string) => {
    const next = new URLSearchParams(window.location.search)
    if (unless && next.get('c') !== unless && next.get('open') !== unless) return
    next.delete('open')
    if (key) next.set('c', key); else next.delete('c')
    const q = next.toString(); router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [pathname, router])
  const pick = useCallback(async (key: string) => {
    const k = parseConversationKey(key)
    const full = k ? conversationKey(k.kind, k.id) : key
    const r = await readConversation(full).catch(() => null)
    if (!r || !('key' in r)) { snackbar({ message: 'This conversation isn’t there any more' }); keepInAddress(null, key); return }
    setOpen(r)
    keepInAddress(r.key)
    setRows((rs) => rs.map((x) => (x.key === full || x.key === r.key ? { ...x, unread: 0, pinned: r.prefs.pinned, muted: r.prefs.muted } : x)))
  }, [snackbar, keepInAddress])
  const close = useCallback(() => { setOpen(null); keepInAddress(null) }, [keepInAddress])
  const param = params.get('open') ?? params.get('c')
  const openKey = open?.key ?? null
  const asked = useRef<string | null>(initialKey)
  useEffect(() => {
    if (!param) return
    /* a door's `?open=` the page already read: kept as `?c=` */
    if (openKey && asked.current === param && new URLSearchParams(window.location.search).has('open')) { keepInAddress(openKey); return }
    if (param === openKey || asked.current === param) return
    asked.current = param
    window.setTimeout(() => { void pick(param) }, 0)   // opened once the address is read (never a set-state inside the effect's body)
  }, [param, openKey, pick, keepInAddress])
  /* (pending modules S22) `?show=` is a landing, not the page's state — the filter is taken as it lands and the address keeps nothing */
  const showParam = params.get('show')
  useEffect(() => {
    if (!showParam) return
    const next = new URLSearchParams(window.location.search); next.delete('show')
    const q = next.toString(); router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [showParam, pathname, router])
  const unreadRows = rows.filter((r) => r.unread > 0).length
  const shownRows = rows.filter((r) => keepsRow(filter, r))
  const list = filterByQuery(shownRows, query, (r) => ({ fields: [r.projectName, r.projectNumber, r.client, r.last?.body ?? '', r.kind === 'team' || r.kind === 'lead-team' ? 'team' : r.kind === 'lead' ? 'lead client' : '', r.chatType === 'group' ? 'group' : r.chatType === 'studio' ? 'studio everyone' : r.chatType === 'direct' ? 'direct' : ''] }))
  const onRead = useCallback(() => router.refresh(), [router])
  const openHref = open ? conversationHref(open) : '/chat'
  const phone = useMediaQuery(MOBILE)

  /* (S26) New message ▾ — a member (one press), a new group (its dialog), a client (the house lead picker) */
  const [grouping, setGrouping] = useState<string[] | null>(null)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const startDirect = async (memberId: string) => {
    const r = await startDirectChat(memberId).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: couldnt('start the conversation', refusalOf(r.error)) }); return }
    await pick(r.key); router.refresh()
  }
  const createGroup = async (o: { name: string; memberIds: string[] }) => {
    const r = await createGroupChat(o).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: couldnt('make the group', refusalOf(r.error)) }); return false }
    await pick(r.key); router.refresh()
    snackbar({ message: `“${o.name}” made — everyone in it hears about it` })
    return true
  }
  /* (S26) a group left from its Details: closed here, with the way back */
  const onLeft = useCallback((o: { id: string; lineId: string; title: string }) => {
    close(); router.refresh()
    snackbar({ message: `You left “${o.title}”`, actionLabel: 'Undo', onAction: () => { void undoLeaveGroupChat(o.id, { lineId: o.lineId }).then((u) => { if ('error' in u) snackbar({ message: couldnt('rejoin the group', refusalOf(u.error)) }); else { void pick(u.key); router.refresh() } }) } })
  }, [router, snackbar, pick, close])

  /* (S26, S10's rule — every suggestion acts) Maison AI here: start one, or show what waits */
  const maison: MaisonSuggestion[] = [
    { label: 'Start a group', run: () => setGrouping([]) },
    ...(unreadRows ? [{ label: `Show the unread (${unreadRows})`, run: () => setFilter('unread') }] : []),
  ]
  useMaisonAi(maison)

  const from = readFrom(params.get('from'))
  const newMessage = <NewMessageMenu start={start} onMember={(id) => { void startDirect(id) }} onGroup={() => setGrouping([])} onClient={() => setPicking(true)} />
  const head = (o: ConversationData) => {
    if (o.chat) {
      const names = o.chat.people.filter((p) => p.id !== o.me.id).map((p) => p.name.trim())   // (S42 audit C-13) members as stored
      const who = o.chat.type === 'studio' ? `Everyone at the studio · ${o.chat.people.length} people` : o.chat.type === 'direct' ? (o.chat.other?.active === false ? 'No longer in the studio' : 'Just the two of you')
        : names.length ? `You, ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''}` : 'Just you'
      return <><KindChip r={{ kind: 'chat', chatType: o.chat.type }} /><span className={styles.convMeta} data-testid="conversation-who">{who}</span></>
    }
    return <>{o.kind === 'team' || o.kind === 'lead-team' ? <MetaChip>Team</MetaChip> : o.kind === 'lead' ? <MetaChip color="blue">Client</MetaChip> : null}
      <span className={styles.convMeta} data-testid="conversation-who">{o.kind === 'team' ? `The team on ${o.title} — ${o.lead?.client ?? 'the client'} never sees it` : o.kind === 'lead-team' ? `The team on ${o.title}’s lead — they never see it` : readersLine(o.people)}</span></>
  }
  const door = (o: ConversationData) => {
    const target = o.project ? { href: openHref, label: 'Open project' } : o.lead ? { href: `/leads/${o.lead.id}`, label: 'Open lead' } : null
    if (!target) return null
    /* (S42 C-15) Back from the lead or the project lands on this conversation again — the address it was opened at */
    const here = () => `${window.location.pathname}${window.location.search}`
    return phone ? <IconButton icon="arrow_outward" label={target.label} onClick={() => router.push(withFrom(target.href, here()))} />
      : <Button variant="secondary" appearance="outlined" iconStart={<Icon name="arrow_outward" size={20} />} onPress={() => router.push(withFrom(target.href, here()))}>{target.label}</Button>
  }
  return (
    <PageReveal skeleton={<ChatInboxGhost />}>
      <div className={pageStyles.body} data-testid="chat-inbox">
        {/* (one-home N-08) one word for the client conversations, "Messages" · (S42 audit C-15) opened from somewhere (a lead's Team chat, ⌘K,
            the Dashboard), Back returns there — the house L2 header naming the place */}
        {from ? <PageHeaderL2 backHref={from} crumbs={[{ label: fromLabel(from) ?? 'Back', href: from }]} title="Messages" actions={newMessage}
                              backLabel={backLabel(from, { leadName: open?.lead && from.startsWith(`/leads/${open.lead.id}`) ? titleCaseName(open.lead.client) : null, fallback: 'Back' })} />
          : <PageHeader title="Messages" actions={newMessage} />}
        <div className={pageStyles.content}>
          {!rows.length ? (
            <EmptyState icon="comment" testId="chat-empty" title="No conversations yet"
                        help="Each project has a conversation with its client and their household, and one for its team. Write from a project’s Messages tab — when a client writes on their page, it lands here, a lead’s too. New message starts one with a member, a group or a client." />
          ) : (
            <div className={styles.inbox} data-open={open ? '' : undefined}>
              <div className={styles.pane} data-slot="list">
                <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search people, words…" label="Search conversations" />
                <div className={styles.filters}>
                  <Chips label="Show" value={filter} onChange={(v) => setFilter(v as InboxFilter)} testId="chat-filters"
                         options={INBOX_FILTERS} />   {/* no counts in the chips: a row's own count says it, and the ghost draws the same words */}
                </div>
                <div className={styles.list} role="list" data-testid="chat-list">
                  {list.length ? list.map((r) => (
                    <button key={r.key} type="button" role="listitem" className={styles.row} aria-current={open?.key === r.key ? 'true' : undefined}
                            data-unread={r.unread ? '' : undefined} data-muted={r.muted || undefined} data-kind={r.kind} data-chat={r.chatType ?? undefined} data-testid="chat-row" onClick={() => { void pick(r.key) }}>
                      <span className={styles.rowName}>
                        <span className={styles.rowTitle}>{r.projectName}</span>
                        <KindChip r={r} />
                        {r.pinned || r.muted ? <span className={styles.rowMarks} aria-label={[r.pinned ? 'Pinned' : '', r.muted ? 'Muted' : ''].filter(Boolean).join(', ')} data-testid="chat-row-marks">{r.pinned ? <Icon name="push_pin" size={16} weight={300} /> : null}{r.muted ? <MetaChip>Muted</MetaChip> : null}</span> : null}
                      </span>
                      <span className={styles.rowTime}>{r.last ? relativeTime(new Date(r.last.at), new Date(now)) : ''}</span>
                      <span className={styles.rowLine}>{lineOf(r)}</span>
                      {r.unread ? <span className={styles.count} aria-label={`${r.unread} unread${r.muted ? ', muted' : ''}`}>{r.unread}</span> : null}
                    </button>
                  )) : <p className={styles.listNote} data-testid="chat-list-none">{query.trim() ? `No conversations match “${query.trim()}”.` : filter === 'unread' ? 'Nothing unread — you’re up to date.' : filter === 'clients' ? 'No conversations with a client yet.' : 'No team conversations yet — New message starts one.'}</p>}
                </div>
              </div>
              <div className={styles.pane} data-slot="open">
                {open ? (
                  <>
                    <div className={styles.paneHead}>
                      <span className={styles.backOnNarrow}><IconButton icon="arrow_back" label="Back to every conversation" onClick={close} /></span>
                      <h2 className={styles.paneTitle} data-testid="chat-open-title">{open.title}</h2>
                      {/* a project's conversation opens its project; a lead's, its lead (the Portal row on its Overview leads back here); a members' one has none */}
                      {door(open)}
                    </div>
                    <Conversation key={open.key} data={open} onRead={onRead} headStart={head(open)} onLeft={onLeft} onStartGroup={(ids) => setGrouping(ids)} />
                  </>
                ) : (
                  <EmptyState icon="comment" tone="plain" testId="chat-pick" title={PICK_TITLE} help={PICK_HELP} />   /* (S42 audit C-25) plain words; the ghost reads the same */
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <NewGroupDialog open={grouping !== null} team={start.members} initial={grouping ?? []} onClose={() => setGrouping(null)} onCreate={createGroup} />
      <PickLeadDialog open={picking} onClose={() => setPicking(false)} leads={start.clients.map((c) => ({ id: c.key, name: c.label }))} title="Who do you want to write to?" label="Client" placeholder="Choose a client"
                      confirmLabel="Open the conversation" busy={busy} busyLabel="Opening…"
                      onPick={async (key) => { if (!key) return; setBusy(true); try { await pick(key); setPicking(false) } finally { setBusy(false) } }} />
    </PageReveal>
  )
}
