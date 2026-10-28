'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, SearchBar } from '@/components/ds'
import { EmptyState } from '@/components/om/empty-state'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { markConversationRead, messageToTask, messageToVariation, readConversation, removeMessage, restoreMessage, sendInConversation, setConversationPrefs, uploadMessageFile } from '@/app/projects/messages-actions'
import { MESSAGE_PHOTOS_MAX, findInLines, seenWords, studioOnly } from '@/lib/projects/messages-model'
import { suggestReplies, suggestTeamReplies, unansweredLine, unansweredTeamLine } from '@/lib/projects/suggested-replies'
import { NO_ASK } from '@/lib/projects/client-asks-model'
import { copyText } from '@/lib/clipboard'
import { withFrom } from '@/lib/nav'
import type { ChatLine, ConversationData } from '@/lib/projects/messages'
import { ThreadComposer, ThreadLines, type ComposerSend, type ThreadItem } from '../threads/thread'
import { AskMenu } from '../threads/ask-menu'
import { sendInPieces } from '../threads/send-file'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { ConversationDetails } from './conversation-details'
import tstyles from '../threads/thread.module.css'
import styles from './messages.module.css'

/** How often an open conversation checks for new lines (1.0 polled every 5 s, I-337). */
const POLL_MS = 8000
/** (UC-069) How many earlier pages a search's landing (`?at=`) reads back to find its line. */
const AT_PAGES = 5

/** "Benjamin and Mei Ling see this" — who the team writes to (H-Q11). (the calm UI build 2026-10-27, 1-21 · W-121) said once, by first name, under
    the composer only (was "Benjamin Han and Mei Ling Han read this on their page", in the head AND under the composer). */
export function readersLine(p: ConversationData['people']): string {
  const names = [p.client, ...p.household].map((n) => n.trim().split(/\s+/)[0] ?? n.trim())
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]!
  return p.invited ? `${list} ${names.length > 1 ? 'see' : 'sees'} this` : `${p.client} hasn’t been invited to their page yet — messages wait there for when they are`
}
/** (parity map, UC-064) Who reads a conversation, by its kind — the composer's hint. (pending modules S26) a lead's Team conversation and a
    members' one say theirs. */
function hintOf(d: ConversationData): string {
  const c = d.chat
  if (c?.type === 'direct') return `Only you and ${c.other?.name ?? d.title} read this`   // (S42 audit C-13) a member as the studio stored them
  if (c?.type === 'group') return 'Only the people in this group read it'
  if (c?.type === 'studio') return 'Every member of the studio reads this'
  if (d.kind === 'team' || d.kind === 'lead-team') return `Only the team reads this — ${d.lead?.client ?? 'the client'} never sees it`
  return readersLine(d.people)
}
const firstOf = (n: string) => n.trim().split(/\s+/)[0] ?? n.trim()
/** (S26) The composer's label — who a line goes to. */
function composerLabel(d: ConversationData): string {
  const c = d.chat
  if (c?.type === 'direct') return `Message ${c.other?.name ?? d.title}`
  if (c?.type === 'group') return `Message ${d.title}`
  if (c?.type === 'studio') return 'Message everyone'
  return d.kind === 'team' || d.kind === 'lead-team' ? 'Message the team' : `Message ${d.lead?.client ?? d.title}`
}
/** (S26) A group's own line's glyph. */
const EVENT_ICON: Record<string, string> = { created: 'group', added: 'person_add', removed: 'group', left: 'group', renamed: 'edit' }
/** (UC-070) Where Copy link lands: the project's Messages (the team's view of it), else Messages with the lead's conversation open. */
export function conversationHref(d: Pick<ConversationData, 'key' | 'kind' | 'project'>): string {
  if (d.project) return `/projects/${d.project.id}/messages${d.kind === 'team' ? '?channel=team' : ''}`
  return `/chat?open=${encodeURIComponent(d.key)}`
}

/**
 * (gaps build H — H-Q11…H-Q14) One project's conversation, the team's side: the lines (the latest 200, Show earlier for more), the New rule
 * at this member's last read, the composer at the foot. Open, it checks for new lines every few seconds and marks what it shows as read; a
 * member removes only their own message, with Undo. Used by the project's Messages tab and by /chat's open conversation.
 * (parity map 2026-10-10 — UC-064 · UC-066…UC-070) Any conversation: the client's (the lead's lines before Won first), the team's, a lead's.
 * Its head: what the caller puts at its start (the tab's Client · Team), the search (matches marked, ↑ ↓ walk them; `?at=<message>` — ⌘K's
 * Messages — lands on one) and ⋮ Pin to top · Mute · Copy link. The composer's "+" (Photo · File · Voice note · The site's location · A
 * contact) and the emoji button; under the client's newest unanswered message, two suggested replies by rule — a tap fills the box.
 */
export function Conversation({ data: initial, onRead, headStart, onLeft, onStartGroup, clientChip = true }: { data: ConversationData; onRead?: () => void; /** the head's start — the project tab's Team chat link */ headStart?: ReactNode
  /** (the calm UI build 2026-10-27, 3-13) the client's lines say "Client" — /chat's, where threads mix; a project's client-only one passes false */ clientChip?: boolean
  /** (pending modules S26) a group this member left from its Details — Messages closes it and offers Undo */ onLeft?: (o: { id: string; lineId: string; title: string }) => void
  /** (S26) two people's conversation → New group with them (Messages' own dialog) */ onStartGroup?: (memberIds: string[]) => void }) {
  const snackbar = useSnackbar()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [data, setData] = useState(initial)
  const [seen, setSeen] = useState(initial)
  const [readAt, setReadAt] = useState(initial.readAt)
  if (seen !== initial) { if (seen.key !== initial.key) setReadAt(initial.readAt); setSeen(initial); setData(initial) }   // render-phase adjust: a new conversation opened in /chat
  const scroller = useRef<HTMLDivElement>(null)
  const key = data.key
  const pid = data.project?.id ?? null
  const count = data.lines.length
  /* (simplify S-22 · contract C) the caret in the composer: Reply on a client's message, and `?compose=1` (Needs you's Reply, the phone site
     bar's Message) — as the page reveals, never under its ghost; the address keeps no flag once read */
  const [focusKey, setFocusKey] = useState(0)
  const composeParam = params.get('compose') === '1'
  useEffect(() => {
    if (!composeParam) return
    /* not cleared by this effect's own re-run: dropping the flag from the address below re-runs it, and the caret must still land */
    window.setTimeout(() => setFocusKey((k) => k + 1), GHOST_MIN_MS)
    const next = new URLSearchParams(params.toString()); next.delete('compose')
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [composeParam, params, pathname, router])
  /* (simplify S-22) a client's message → a task · a variation order, their words carried over; made once, the row opens it */
  const [busyAsk, setBusyAsk] = useState<string | null>(null)
  const linksOf = (id: string) => data.asks[id] ?? NO_ASK
  const setLinks = (id: string, patch: Partial<typeof NO_ASK>) => setData((d) => ({ ...d, asks: { ...d.asks, [id]: { ...(d.asks[id] ?? NO_ASK), ...patch } } }))
  const hereNow = () => `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
  const toTask = async (i: ThreadItem) => {
    if (!pid) return
    const have = linksOf(i.id).task
    if (have) { router.push(withFrom(`/projects/${pid}/tasks?open=${encodeURIComponent(have.id)}`, hereNow())); return }
    setBusyAsk(i.id)
    try {
      const r = await messageToTask(i.id)
      if ('error' in r) { snackbar({ message: couldnt('make the task', refusalOf(r.error)) }); return }
      setLinks(i.id, { task: { id: r.taskId, title: r.title, done: false } })
      snackbar({ message: `Task added — “${r.title}”`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/projects/${pid}/tasks?open=${encodeURIComponent(r.taskId)}`, hereNow())) })
    } catch { snackbar({ message: couldnt('make the task') }) } finally { setBusyAsk(null) }
  }
  const toVariation = async (i: ThreadItem) => {
    const have = linksOf(i.id).vo
    if (have) { router.push(withFrom(`/quotes/${have.id}`, hereNow())); return }
    setBusyAsk(i.id)
    try {
      const r = await messageToVariation(i.id)
      if ('error' in r) { snackbar({ message: couldnt('raise the variation order', refusalOf(r.error)) }); return }
      router.push(withFrom(`/quotes/${r.id}`, hereNow()))
    } catch { snackbar({ message: couldnt('raise the variation order') }) } finally { setBusyAsk(null) }
  }

  /* (UC-069) the search — matches marked, ↑ ↓ (Enter, Shift+Enter) walk them, the newest first */
  const [finding, setFinding] = useState(false)
  const [query, setQuery] = useState('')
  const [at, setAt] = useState(0)
  const [landed, setLanded] = useState<string | null>(null)   // ⌘K's `?at=` — the message it opened at
  const ids = finding ? findInLines(data.lines, query) : []
  const current = ids.length ? ids[Math.min(Math.max(0, ids.length - 1 - at), ids.length - 1)]! : landed
  const walk = (step: 1 | -1) => { if (ids.length) setAt((n) => (n + step + ids.length) % ids.length) }
  useEffect(() => {
    if (!current) return
    const el = scroller.current?.querySelector(`[data-line-id="${CSS.escape(current)}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [current])
  /* ⌘K's Messages scope lands with `?at=<message>`: the line read back if it is further up, ringed, and the address keeps no flag */
  const atParam = params.get('at')
  useEffect(() => {
    if (!atParam) return
    const next = new URLSearchParams(params.toString()); next.delete('at')
    const q = next.toString(); router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    let alive = true
    void (async () => {
      let lines = data.lines, more = data.more
      for (let n = 0; n < AT_PAGES && more && !lines.some((l) => l.id === atParam); n++) {
        const r = await readConversation(key, { before: lines[0]?.at ?? null }).catch(() => null)
        if (!r || 'error' in r || !('lines' in r) || 'key' in r) break
        lines = [...r.lines, ...lines]; more = r.more
      }
      if (!alive) return
      if (lines !== data.lines) setData((d) => ({ ...d, lines, more }))
      if (lines.some((l) => l.id === atParam)) window.setTimeout(() => setLanded(atParam), GHOST_MIN_MS)
      else snackbar({ message: 'That message isn’t there any more' })
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the lines as they stand when the address lands
  }, [atParam])

  /* the newest line in view — on open and when one arrives (never while a search or a landing holds the view) */
  const holding = !!current
  useLayoutEffect(() => { const el = scroller.current; if (el && !holding) el.scrollTop = el.scrollHeight }, [count, key, holding])
  /* read up to now while it is open */
  const latest = data.lines[data.lines.length - 1]?.at ?? 0
  useEffect(() => { void markConversationRead(key).then(() => onRead?.()) }, [key, latest, onRead])
  /* new lines from the other side while it is open */
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void readConversation(key).then((r) => { if (r && 'key' in r) setData((d) => (r.lines.length !== d.lines.length || r.lines[r.lines.length - 1]?.id !== d.lines[d.lines.length - 1]?.id || r.lines.some((l, i) => l.removed !== d.lines[i]?.removed) ? { ...d, lines: r.lines, more: r.more } : d)) }).catch(() => {})
    }, POLL_MS)
    return () => window.clearInterval(t)
  }, [key])

  const earlier = async () => {
    const first = data.lines[0]
    if (!first) return
    const r = await readConversation(key, { before: first.at }).catch(() => null)
    if (!r || 'error' in r) { snackbar({ message: 'Couldn’t load the earlier messages — please try again' }); return }
    if ('lines' in r && !('key' in r)) setData((d) => ({ ...d, lines: [...r.lines, ...d.lines], more: r.more }))
  }
  const send = async (o: ComposerSend) => {
    try {
      const r = await sendInConversation(key, { body: o.body, photos: o.photos, files: o.files, share: o.share ?? undefined })
      if ('error' in r) { snackbar({ message: couldnt('send the message', refusalOf(r.error)) }); return false }
      setData((d) => ({ ...d, lines: [...d.lines, r.line] }))
      return true
    } catch { snackbar({ message: 'Couldn’t send the message — please try again' }); return false }
  }
  const setRemoved = (id: string, removed: boolean) => setData((d) => ({ ...d, lines: d.lines.map((l): ChatLine => (l.id === id ? { ...l, removed } : l)) }))
  const remove = async (id: string) => {
    setRemoved(id, true)
    const r = await removeMessage(id).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { setRemoved(id, false); snackbar({ message: couldnt('remove the message', refusalOf(r.error)) }); return }
    snackbar({ message: 'Message removed', actionLabel: 'Undo', onAction: () => { void restoreMessage(id).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the message back', refusalOf(u.error)) }); else void readConversation(key).then((x) => { if (x && 'key' in x) setData(x) }) }) } })
  }

  /* (UC-070) Pin to top · Mute · Copy link — this member's own; the write goes first, the menu says what it did, a refusal puts it back */
  const [menuOpen, setMenuOpen] = useState(false)
  const kebab = useRef<HTMLSpanElement>(null)
  /* (S26) Details — who is in it, what it has shared (Docs · Media · Links); a group's people and name are kept there */
  const [details, setDetails] = useState(false)
  const reread = () => { void readConversation(key).then((x) => { if (x && 'key' in x) setData(x) }).catch(() => {}); onRead?.() }
  const [inviting, setInviting] = useState(false)
  const setPref = async (patch: { pinned?: boolean; muted?: boolean }, said: string) => {
    const was = data.prefs
    setData((d) => ({ ...d, prefs: { ...d.prefs, ...patch } }))
    const r = await setConversationPrefs(key, patch).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { setData((d) => ({ ...d, prefs: was })); snackbar({ message: couldnt(said.toLowerCase(), refusalOf(r.error)) }); return }
    setData((d) => ({ ...d, prefs: r.prefs }))
    snackbar({ message: patch.pinned !== undefined ? (r.prefs.pinned ? 'Pinned to the top of Messages' : 'Unpinned') : r.prefs.muted ? 'Muted — this conversation rings no bell for you' : 'Unmuted — you’ll hear it again' })
    onRead?.()
  }
  const copyLink = async () => {
    const ok = await copyText(`${window.location.origin}${conversationHref(data)}`).then(() => true, () => false)
    snackbar({ message: ok ? 'Link copied — it opens this conversation for anyone in the studio who sees it' : 'Couldn’t copy the link — please try again' })
  }

  /* (UC-068) two replies by rule under the client's newest unanswered message — a tap fills the box, never sends */
  const [fill, setFill] = useState<{ text: string; n: number } | null>(null)
  /* (pending modules S26 — card studio:team-chats, "Reply suggestions") between members, a teammate's replies under a teammate's newest line */
  const internal = studioOnly(data.kind)
  const open = !data.mayWrite ? null : internal ? unansweredTeamLine(data.lines, data.me.id) : unansweredLine(data.lines)
  const replies = !open ? [] : internal ? suggestTeamReplies(open.body, open.authorName, { direct: data.chat?.type === 'direct', me: data.me.name }) : suggestReplies(open.body, data.lead?.client ?? '')
  /* (S26) under one's own newest line, when it is the last: who has read it (each reader's read mark — never a claim before they opened it) */
  const last = data.lines[data.lines.length - 1]
  const seenLine = last && !last.removed && !last.event && last.authorKind === 'studio' && last.authorId === data.me.id ? seenWords(data.seen, last.at, data.chat?.type === 'direct') : null
  const after = (i: ThreadItem) => (open && i.id === open.id && replies.length ? (
    <div className={tstyles.suggest} data-testid="suggested-replies">
      <span className={tstyles.suggestLabel}>Suggested</span>
      {replies.map((t) => <button key={t} type="button" className={tstyles.suggestChip} onClick={() => setFill((f) => ({ text: t, n: (f?.n ?? 0) + 1 }))} data-testid="suggested-reply">{t}</button>)}
    </div>
  ) : seenLine && last && i.id === last.id ? <span className={styles.seen} data-testid="conversation-seen">{seenLine}</span> : null)

  const client = data.lead?.client ?? data.title
  const here = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
  const empty = data.chat?.type === 'direct' ? { title: 'No messages yet', help: `Write to ${data.chat.other?.name ?? data.title} — only the two of you read it. Photos, files and voice notes go too.` }
    : data.chat?.type === 'group' ? { title: 'No messages yet', help: 'Only the people in this group read it. Photos, files and voice notes go too.' }
    : data.chat?.type === 'studio' ? { title: 'No messages yet', help: 'Every member of the studio reads this — news, a day off, a site visit everyone should know about.' }
    : data.kind === 'lead-team' ? { title: 'No team messages yet', help: `Talk ${client}’s lead through with the team here — ${client} never sees it. Once Won, it carries on in the project’s Team conversation.` }
    : null
  return (
    <section className={styles.card} aria-label={data.chat ? `Messages · ${data.title}` : data.kind === 'team' || data.kind === 'lead-team' ? `Team messages · ${data.title}` : `Messages with ${client}`} data-testid="project-conversation" data-conversation={data.kind}>
      <div className={styles.convHead} data-testid="conversation-head">
        <span className={styles.convStart}>{headStart}</span>
        {finding ? (
          <span className={styles.find} data-testid="conversation-find">
            <SearchBar appearance="outlined" size="md" placeholder="Search this conversation" aria-label="Search this conversation" value={query} autoFocus
                       onChange={(v) => { setQuery(v); setAt(0); setLanded(null) }} onSubmit={() => walk(1)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); walk(-1); return }
                         if (e.key === 'Escape' && !query) { setFinding(false); return }
                         e.continuePropagation()   // a React Aria handler stops every key by default — ⌘K, ? and the page's keys still reach the shortcuts layer
                       }} className={styles.findField} />
            <span className={styles.findCount} aria-live="polite" data-testid="conversation-find-count">{query.trim().length < 2 ? '' : ids.length ? `${ids.length - Math.min(at, ids.length - 1)} of ${ids.length}` : 'No matches'}</span>
            <Tooltip label="Earlier match"><IconButton icon="keyboard_arrow_up" label="Earlier match" size={24} variant="bare" disabled={ids.length < 2} onClick={() => walk(1)} /></Tooltip>
            <Tooltip label="Later match"><IconButton icon="keyboard_arrow_down" label="Later match" size={24} variant="bare" disabled={ids.length < 2} onClick={() => walk(-1)} /></Tooltip>
            <Tooltip label="Close search"><IconButton icon="close" label="Close search" size={24} variant="bare" onClick={() => { setFinding(false); setQuery(''); setAt(0) }} /></Tooltip>
          </span>
        ) : (
          <Tooltip label="Search this conversation"><IconButton icon="search" label="Search this conversation" onClick={() => { setFinding(true); setLanded(null) }} data-testid="conversation-search" /></Tooltip>
        )}
        <Tooltip label="People and files"><IconButton icon="info" label="People and files" aria-haspopup="dialog" aria-expanded={details} onClick={() => setDetails(true)} data-testid="conversation-details" /></Tooltip>
        <span ref={kebab} className={styles.convMenu}>
          <Tooltip label="Conversation actions" disabled={menuOpen}>
            <IconButton icon="more_vert" label="Conversation actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} data-testid="conversation-menu" />
          </Tooltip>
        </span>
        <PortalMenu open={menuOpen} anchor={kebab} onClose={() => setMenuOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="Conversation">
          <DropdownItem help="In Messages, above the others — for you" onSelect={() => { setMenuOpen(false); void setPref({ pinned: !data.prefs.pinned }, data.prefs.pinned ? 'Unpin' : 'Pin') }}><span data-testid="conversation-pin">{data.prefs.pinned ? 'Unpin' : 'Pin to top'}</span></DropdownItem>
          <DropdownItem help={data.prefs.muted ? 'Its messages ring your bell again' : 'No bell for it — the others still hear it'} onSelect={() => { setMenuOpen(false); void setPref({ muted: !data.prefs.muted }, data.prefs.muted ? 'Unmute' : 'Mute') }}><span data-testid="conversation-mute">{data.prefs.muted ? 'Unmute' : 'Mute'}</span></DropdownItem>
          <DropdownItem onSelect={() => { setMenuOpen(false); void copyLink() }}><span data-testid="conversation-copy-link">Copy link</span></DropdownItem>
        </PortalMenu>
      </div>
      <div ref={scroller} className={styles.scroll} data-testid="conversation-scroll">
        {data.more ? <span className={styles.earlier}><Button appearance="text" onPress={() => { void earlier() }}>Show earlier messages</Button></span> : null}
        {data.lines.length ? (
          <ThreadLines items={data.lines} me={{ kind: 'studio', id: data.me.id }} readAt={readAt} now={data.now} clientChip={clientChip} testId="conversation-lines"
                       eventText={(i) => (i.event ? { text: i.body, icon: EVENT_ICON[i.event] ?? 'group' } : null)}
                       highlight={current ? { query: finding ? query : '', ids: finding ? ids : [current], current } : undefined} after={after}
                       onRemove={(l) => { void remove(l.id) }}
                       ask={(l) => {
                         if (l.authorKind !== 'client') return null
                         /* a lead's line (before the project) answers with Reply alone — its task and order are the project's to make */
                         if (data.kind !== 'client' || l.fromLead) return data.mayWrite ? <AskMenu label={`${l.authorName.split(/\s+/)[0]}’s message`} links={NO_ASK} onReply={() => setFocusKey((k) => k + 1)} /> : null
                         const links = linksOf(l.id)
                         return <AskMenu label={`${l.authorName.split(/\s+/)[0]}’s message`} links={links} money={data.mayWrite} busy={busyAsk === l.id}
                                         onReply={data.mayWrite ? () => setFocusKey((k) => k + 1) : undefined}
                                         onTask={data.mayWrite || links.task ? () => { void toTask(l) } : undefined}
                                         onVariation={data.mayWrite || links.vo ? () => { void toVariation(l) } : undefined} />
                       }} />
        ) : (
          <div className={styles.emptyWrap}>
            {empty ? (
              <EmptyState icon="comment" tone="plain" testId="conversation-empty" title={empty.title} help={empty.help} />
            ) : data.kind === 'team' ? (
              <EmptyState icon="comment" tone="plain" testId="conversation-empty" title="No team messages yet"
                          help={`Talk it through with the team here — ${client} never sees this conversation. Photos, files and voice notes go too.`} />
            ) : (
              <EmptyState icon="comment" tone="plain" testId="conversation-empty" title="No messages yet"
                          help={`Write to ${client} here — they read it on their page and answer from it. Photos, files and voice notes go too.`} />
            )}
          </div>
        )}
      </div>
      <div className={styles.foot}>
        {data.mayWrite ? (
          <ThreadComposer label={composerLabel(data)} maxPhotos={MESSAGE_PHOTOS_MAX} onSend={send} focusKey={focusKey} testId="conversation-composer"
                          hint={!internal && !data.people.invited && data.lead ? <>{`${firstOf(data.lead.client)} isn’t on their page yet`}{' · '}<button type="button" className={styles.inviteLink} onClick={() => setInviting(true)} data-testid="conversation-invite">Invite to Portal</button></> : hintOf(data)}
                          emoji fill={fill}
                          attach={{ file: (f, onProgress) => sendInPieces(f, (p) => uploadMessageFile(key, p), onProgress), voice: true, place: data.chat ? undefined : data.place, contacts: data.contacts }} />
        ) : <p className={styles.note} data-testid="conversation-cant-write">{data.chat?.type === 'direct' && data.chat.other && !data.chat.other.active ? `${data.chat.other.name} is no longer in the studio — the messages stay here.`
          : data.kind === 'lead' || data.kind === 'lead-team' ? 'Only the lead’s team, their Managers, Owners and Admins write here.' : 'Only the project’s team, their Managers, Owners and Admins write here.'}</p>}
      </div>
      <ConversationDetails open={details} onClose={() => setDetails(false)} data={data} onChanged={reread} onLeft={onLeft} onStartGroup={onStartGroup} here={here} />
      {data.lead && !internal ? <ClientAccessPanel open={inviting} leadId={data.lead.id} onClose={() => { setInviting(false); reread() }} /> : null}
    </section>
  )
}
