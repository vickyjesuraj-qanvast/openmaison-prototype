'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { EmptyState } from '@/components/om/empty-state'
import { PageReveal } from '@/components/shell/page-reveal'
import { markClientChatRead, readClientChats, removeClientMessage, restoreClientMessage, sendClientMessage, uploadClientMessageFile } from '@/app/portal/messages-actions'
import { MESSAGE_PHOTOS_MAX } from '@/lib/projects/messages-model'
import type { ChatLine, PortalConversation } from '@/lib/projects/messages'
import type { PortalData } from '@/lib/portal/home'
import { ThreadComposer, ThreadLines, type ComposerSend, type ThreadItem } from '@/components/projects/threads/thread'
import { sendInPieces } from '@/components/projects/threads/send-file'
import { ContactLine } from '../contact-line'
import { PortalFrame } from '../portal-frame'
import { PhotoViewer } from '../project/photo-viewer'
import { couldntSay, usePortalSay } from '../use-portal-say'
import { useSnackbar } from '@/components/om/snackbar'
import { PortalMessagesGhost } from './thread-ghosts'
import p from '../portal.module.css'
import m from '@/components/projects/messages/messages.module.css'

const POLL_MS = 8000
const names = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] ?? '')

/**
 * (gaps build H — H-Q11…H-Q15) The portal's Messages: one conversation per home with the team, the house thread (the team's lines with their
 * names, "You" for this person's own), the New rule at their last read, the composer — Enter sends, up to three photos. It checks for new lines
 * every few seconds while open and marks what it shows as read (never in a studio's preview, where nothing sends). This person removes only
 * their own message, with Undo.
 * (parity map 2026-10-10 — UC-064 · UC-066 · UC-067) A home with no project yet has its conversation too (the lead's, answered from the studio's
 * Messages; once Won it carries on in the project's). The composer's "+" sends a photo, a file (a PDF, a document, a video — up to 25 MB) or a
 * voice note recorded here, and the box has its emoji button.
 */
export function PortalMessagesView({ data, homes: initial, meId }: { data: PortalData; homes: PortalConversation[]; /** this person's homeowner id — their own lines say You */ meId: string }) {
  const say0 = usePortalSay(data.slug)
  const snack = useSnackbar()
  const say = (why: string | null, what: string) => say0(couldntSay(what, why, data.look.studio), why)
  const { visitor } = data
  const [homes, setHomes] = useState(initial)
  const [pick, setPick] = useState(initial[0]?.key ?? '')
  const home = homes.find((h) => h.key === pick) ?? homes[0] ?? null
  const [readAt] = useState(() => Object.fromEntries(initial.map((h) => [h.key, h.readAt])) as Record<string, number | null>)
  const scroller = useRef<HTMLDivElement>(null)
  const [viewing, setViewing] = useState<{ item: ThreadItem; i: number } | null>(null)
  const count = home?.lines.length ?? 0
  const hk = home?.key ?? ''
  /* which home a write goes to — its project, or (no project yet) its lead */
  const whereOf = (h: PortalConversation) => (h.projectId ? { projectId: h.projectId } : { leadId: h.leadId })
  const where = home ? whereOf(home) : null
  useLayoutEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight }, [count, hk])
  const latest = home?.lines[home.lines.length - 1]?.at ?? 0
  const whereKey = where ? JSON.stringify(where) : ''
  useEffect(() => { if (whereKey && !visitor.preview) void markClientChatRead(data.slug, JSON.parse(whereKey) as { projectId?: string; leadId?: string }).catch(() => {}) }, [whereKey, latest, visitor.preview, data.slug])
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void readClientChats(data.slug).then((r) => { if (r && 'homes' in r) setHomes((was) => r.homes.map((h) => { const w = was.find((x) => x.key === h.key); return w && w.lines.length > h.lines.length ? { ...h, title: w.title, lines: w.lines } : w ? { ...h, title: w.title } : h })) }).catch(() => {})
    }, POLL_MS)
    return () => window.clearInterval(t)
  }, [data.slug])
  const setLines = (key: string, f: (l: ChatLine[]) => ChatLine[]) => setHomes((hs) => hs.map((h) => (h.key === key ? { ...h, lines: f(h.lines) } : h)))
  const send = async (o: ComposerSend) => {
    if (!home) return false
    try {
      const r = await sendClientMessage(data.slug, { ...whereOf(home), body: o.body, photos: o.photos, files: o.files })
      if ('error' in r) { say(r.error, 'send your message'); return false }
      setLines(home.key, (l) => [...l, r.line])
      return true
    } catch { say(null, 'send your message'); return false }
  }
  const remove = async (item: ThreadItem) => {
    if (!home) return
    const id = home.key
    setLines(id, (l) => l.map((x) => (x.id === item.id ? { ...x, removed: true } : x)))
    const r = await removeClientMessage(data.slug, { messageId: item.id }).catch(() => ({ error: '' }))
    if ('error' in r) { setLines(id, (l) => l.map((x) => (x.id === item.id ? { ...x, removed: false } : x))); say(r.error || null, 'remove your message'); return }
    snack({ message: 'Message removed', actionLabel: 'Undo', onAction: () => { void restoreClientMessage(data.slug, { messageId: item.id }).then((u) => { if ('error' in u) say(u.error, 'put your message back'); else setLines(id, (l) => l.map((x) => (x.id === item.id ? { ...x, removed: false } : x))) }) } })
  }
  const team = home ? names(home.team.map((t) => t.name)) : ''
  return (
    <PageReveal skeleton={<PortalMessagesGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="messages" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={p.hello}>
          <h1 className={p.h1}>Messages</h1>
          <p className={p.lede}>{team ? `Write to ${team} at ${data.look.studio} — they answer here.` : `Write to your team at ${data.look.studio} — they answer here.`}</p>
        </div>
        {!home ? (
          <EmptyState icon="comment" tone="plain" testId="portal-messages-none" title="Messages open once work begins"
                      help={`Once ${data.look.studio} starts work on your home, you can write to the team here.`} />
        ) : (
          <>
            {homes.length > 1 ? <Chips label="Which home" options={homes.map((h) => ({ value: h.key, label: h.title }))} value={home.key} onChange={setPick} testId="portal-messages-home" /> : null}
            <section className={m.card} aria-label="Your conversation" data-testid="portal-conversation">
              <div ref={scroller} className={m.scroll}>
                {home.lines.length ? (
                  <ThreadLines items={home.lines} me={{ kind: 'client', id: meId }} readAt={readAt[home.key] ?? null} now={data.now} testId="portal-conversation-lines"
                               onRemove={visitor.preview ? undefined : (it) => { void remove(it) }} onPhoto={(item, i) => setViewing({ item, i })} />
                ) : (
                  <div className={m.emptyWrap}>
                    <EmptyState icon="comment" tone="plain" testId="portal-conversation-empty" title="No messages yet" help="Ask a question or send a photo — your team answers here." />
                  </div>
                )}
              </div>
              <div className={m.foot}>
                <ThreadComposer label="Write a message" maxPhotos={MESSAGE_PHOTOS_MAX} onSend={send} disabled={visitor.preview} testId="portal-composer" emoji
                                attach={visitor.preview ? undefined : { voice: true, file: (f, onProgress) => sendInPieces(f, (piece) => uploadClientMessageFile(data.slug, { ...whereOf(home), piece }), onProgress) }}
                                hint={visitor.preview ? 'A preview — nothing here is sent' : team ? `${team} ${home.team.length > 1 ? 'read' : 'reads'} this` : undefined} />
              </div>
            </section>
            {home.more ? <Button appearance="text" onPress={() => { void readClientChats(data.slug, { ...whereOf(home), before: home.lines[0]?.at ?? null }).then((r) => { if (r && 'lines' in r) setLines(home.key, (l) => [...r.lines, ...l]) }) }}>Show earlier messages</Button> : null}
          </>
        )}
        <ContactLine data={data} ask="Rather talk?" about="about our project" />
        <PhotoViewer open={!!viewing} title="Photo" photos={viewing ? viewing.item.photos.map((ph) => ({ id: ph.id, src: ph.src, name: 'Photo' })) : []} index={viewing?.i ?? 0}
                     onIndex={(i) => setViewing((v) => (v ? { ...v, i } : v))} onClose={() => setViewing(null)} />
      </PortalFrame>
    </PageReveal>
  )
}
