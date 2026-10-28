'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, TextArea } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Dialog } from '@/components/om/dialog'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { closeIssue, openIssue, reopenIssue, replyIssue, reportIssue } from '@/app/portal/tickets-actions'
import { MSG } from '@/lib/forms'
import { clientDay } from '@/lib/portal/model'
import { BODY_MAX, PHOTOS_MAX, STATUS_TONE, STATUS_WORDS, SUBJECT_MAX, eventLine, isLive } from '@/lib/projects/tickets-model'
import type { PortalData } from '@/lib/portal/home'
import type { PortalIssue, PortalIssuesHome } from '@/lib/portal/threads'
import { ThreadComposer, ThreadLines, type ThreadItem } from '@/components/projects/threads/thread'
import { usePickedPhotos } from '@/components/projects/tickets/ticket-dialogs'
import { ContactLine } from '../contact-line'
import { PortalFrame } from '../portal-frame'
import { PhotoViewer } from '../project/photo-viewer'
import { couldntSay, usePortalSay } from '../use-portal-say'
import { PortalIssuesGhost } from './thread-ghosts'
import p from '../portal.module.css'
import t from '@/components/projects/tickets/tickets.module.css'

/** A state line's words on the client's side — "Germaine marked it resolved", "You closed it". */
const clientEventText = (meId: string) => (i: ThreadItem) => {
  const by = i.authorKind === 'client' && i.authorId === meId ? 'You' : i.authorName
  if (i.event === 'resolved') return { text: eventLine('resolved', by), icon: 'check_circle', tone: 'green' as const }
  if (i.event === 'reopened') return { text: eventLine('reopened', by), icon: 'undo' }
  if (i.event === 'closed') return { text: eventLine('closed', by), icon: 'lock' }
  return null
}

/**
 * (gaps build H — H-Q1 · H-Q2 · H-Q3 · H-Q5 · H-Q7) The portal's Issues — 1.0's Support tab in one word: "Report an issue" (what it is
 * about, a subject, what happened, up to five photos), a card per issue (its number, state, the newest word, "New reply"), the issue open in
 * the house Dialog (a bottom sheet on a phone) with its thread, a reply and — for whoever reported it — Close with Undo. A reply on a
 * Resolved issue reopens it. `?open=` (the bell, the client's message) lands on one.
 */
export function PortalIssuesView({ data, homes, categories, meId }: { data: PortalData; homes: PortalIssuesHome[]; categories: string[]; meId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snack = useSnackbar()
  const say0 = usePortalSay(data.slug)
  const say = (why: string | null, what: string) => say0(couldntSay(what, why, data.look.studio), why)
  const { visitor } = data
  const all = homes.flatMap((h) => h.issues.map((i) => ({ ...i, home: h })))
  const [scope, setScope] = useState<'open' | 'done'>('open')
  const [openId, setOpenId] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [closing, setClosing] = useState<PortalIssue | null>(null)
  const [viewing, setViewing] = useState<{ photos: { id: string; src: string }[]; i: number } | null>(null)
  const param = params.get('open')
  const [seenParam, setSeenParam] = useState<string | null>(null)
  if (param && param !== seenParam) { setSeenParam(param); const hit = all.find((x) => x.id === param); if (hit) { setOpenId(hit.id); if (!isLive(hit.status)) setScope('done') } }
  useEffect(() => {
    if (!param) return
    const next = new URLSearchParams(params.toString()); next.delete('open')
    const q = next.toString(); router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [param, params, pathname, router])
  const open = openId ? all.find((x) => x.id === openId) ?? null : null
  /* opening an issue reads the studio's answers on it (the bell's rows) — never in a preview */
  useEffect(() => { if (openId && !visitor.preview) void openIssue(data.slug, { ticketId: openId }).catch(() => {}) }, [openId, visitor.preview, data.slug])
  const list = all.filter((x) => (scope === 'open' ? isLive(x.status) : !isLive(x.status)))
  const live = all.filter((x) => isLive(x.status)).length

  const report = async (o: { homeId: string; category: string; subject: string; body: string; photos: string[] }) => {
    try {
      const r = await reportIssue(data.slug, o)
      if ('error' in r) { say(r.error, 'send it'); return false }
      setReporting(false); setScope('open')
      snack({ message: `Sent — ${data.look.studio} answers here. Your issue is ${r.number}.` })
      router.refresh(); return true
    } catch { say(null, 'send it'); return false }
  }
  const reply = async (o: { body: string; photos: string[] }) => {
    if (!open) return false
    try {
      const r = await replyIssue(data.slug, { ticketId: open.id, ...o })
      if ('error' in r) { say(r.error, 'send your reply'); return false }
      router.refresh(); return true
    } catch { say(null, 'send your reply'); return false }
  }
  const close = async (issue: PortalIssue) => {
    try {
      const r = await closeIssue(data.slug, { ticketId: issue.id })
      if ('error' in r) { say(r.error, 'close it'); return }
      setClosing(null); setOpenId(null)
      snack({ message: `${issue.number} is closed — ${data.look.studio} has been told`, actionLabel: 'Undo', onAction: () => { void reopenIssue(data.slug, { ticketId: issue.id, to: r.was }).then((u) => { if ('error' in u) say(u.error, 'open it again'); else router.refresh() }) } })
      router.refresh()
    } catch { say(null, 'close it') }
  }
  const canReport = homes.length > 0
  return (
    <PageReveal skeleton={<PortalIssuesGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="issues" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={p.homeHead}>
          <div className={p.hello}>
            <h1 className={p.h1}>Issues</h1>
            <p className={p.lede}>{`Something not right at home? Report it here with photos — ${data.look.studio} answers here, and you close it once it’s fixed.`}</p>
          </div>
          {canReport && all.length ? <Button iconStart={<Icon name="add" size={20} />} onPress={() => setReporting(true)} isDisabled={visitor.preview} data-testid="portal-report">Report an issue</Button> : null}
        </div>
        {!canReport ? (
          <EmptyState icon="handyman" tone="plain" testId="portal-issues-none" title="Issues open once work begins"
                      help={`Once ${data.look.studio} starts work on your home, you can report anything that isn’t right here.`} />
        ) : !all.length ? (
          <EmptyState icon="handyman" testId="portal-issues-empty" title="Nothing reported yet"
                      help={`When something isn’t right — a leak, a scratch, a door that sticks — report it here. ${data.look.studio} hears it and answers here.`}
                      primary={visitor.preview ? null : { label: 'Report an issue', icon: 'add', onPress: () => setReporting(true) }} />
        ) : (
          <>
            {/* (the calm UI build 2026-10-27, 3-39 · T-07) one count style, "Label · n", none on an empty chip */}
            <Chips label="Show" options={[{ value: 'open', label: live ? `Open · ${live}` : 'Open' }, { value: 'done', label: all.length - live ? `Closed · ${all.length - live}` : 'Closed' }]} value={scope} onChange={(v) => setScope(v === 'done' ? 'done' : 'open')} testId="portal-issue-scope" />
            {list.length ? (
              <div className={t.list} data-testid="portal-issue-list">
                {list.map((x) => {
                  const last = [...x.lines].reverse().find((l) => !l.event)
                  return (
                    <button key={x.id} type="button" className={t.card} onClick={() => setOpenId(x.id)} data-testid="portal-issue" data-status={x.status} data-unread={x.unread || undefined}>
                      <span className={t.head}>
                        <span className={t.number}>{x.number}</span>
                        <span className={t.subject}>{x.subject}</span>
                        <MetaChip color={STATUS_TONE[x.status]}>{STATUS_WORDS[x.status]}</MetaChip>
                        {x.unread ? <MetaChip color="blue">New reply</MetaChip> : null}
                      </span>
                      <p className={t.sub}>{`${x.category} · Reported ${clientDay(x.createdAt, data.now)} by ${x.mine ? 'you' : x.raisedKind === 'studio' ? data.look.studio : x.raisedByName}${homes.length > 1 ? ` · ${x.home.title}` : ''}`}</p>
                      <p className={t.last}>{last ? `${last.authorKind === 'client' && last.authorId === meId ? 'You' : last.authorName}: ${last.body || 'Photos'}` : 'No reply yet — your designer answers here'}</p>
                    </button>
                  )
                })}
              </div>
            ) : <p className={p.line} data-testid="portal-issues-clear">{scope === 'open' ? 'Nothing open — everything you reported is resolved or closed.' : 'Nothing resolved or closed yet.'}</p>}
          </>
        )}
        <ContactLine data={data} ask="Something urgent?" about="about something at home" />

        <Dialog open={!!open} onClose={() => setOpenId(null)} title={open ? `${open.number} · ${open.subject}` : 'Issue'} subtitle={open ? `${open.category} · ${STATUS_WORDS[open.status]}` : undefined} size="modal" width={600}
                footer={open && !visitor.preview ? (open.status === 'closed' ? <span className={p.line}>Closed — report a new one if something else is wrong.</span> : (
                  <div className={t.footWrap}>
                    <ThreadComposer label={open.status === 'resolved' ? 'Still not right? Reply to reopen it' : 'Reply to your designer'} maxPhotos={PHOTOS_MAX} onSend={reply} testId="portal-issue-composer"
                                    extra={open.mine ? <Button variant="secondary" appearance="outlined" onPress={() => setClosing(open)} data-testid="portal-issue-close">Close issue</Button> : null} />
                  </div>
                )) : undefined}>
          {open ? (
            <div className={t.drawerBody} data-testid="portal-issue-thread">
              <div className={t.report}>
                {open.body ? <p className={t.reportBody}>{open.body}</p> : null}
                {open.photos.length ? <div className={t.photos}>{open.photos.map((ph, k) => (
                  <button key={ph.id} type="button" className={t.photo} aria-label={`Photo ${k + 1} of ${open.photos.length}`} onClick={() => setViewing({ photos: open.photos, i: k })}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.src} alt="" loading="lazy" />
                  </button>
                ))}</div> : null}
                <p className={t.sub}>{`Reported ${clientDay(open.createdAt, data.now)} by ${open.mine ? 'you' : open.raisedKind === 'studio' ? data.look.studio : open.raisedByName}`}</p>
              </div>
              {open.lines.length ? (
                <ThreadLines items={open.lines} me={{ kind: 'client', id: meId }} now={data.now} eventText={clientEventText(meId)} onPhoto={(it, i) => setViewing({ photos: it.photos, i })} />
              ) : <p className={p.line}>{`No reply yet — ${data.look.studio} answers here.`}</p>}
            </div>
          ) : null}
        </Dialog>
        <ReportDialog open={reporting} homes={homes} categories={categories} onClose={() => setReporting(false)} onSend={report} />
        <ConfirmDialog open={!!closing} title="Close this issue?" message={`${data.look.studio} hears that it’s sorted. You can report a new one any time.`} confirmLabel="Close issue" tone="primary" nested
                       onConfirm={() => { if (closing) void close(closing) }} onCancel={() => setClosing(null)} />
        <PhotoViewer open={!!viewing} title="Photo" photos={viewing ? viewing.photos.map((ph) => ({ id: ph.id, src: ph.src, name: 'Photo' })) : []} index={viewing?.i ?? 0}
                     onIndex={(i) => setViewing((v) => (v ? { ...v, i } : v))} onClose={() => setViewing(null)} />
      </PortalFrame>
    </PageReveal>
  )
}

/** I-330's form, in plain words: what it is about, a subject, what happened, up to five photos. Sends once it lands. */
function ReportDialog({ open, homes, categories, onClose, onSend }: {
  open: boolean; homes: PortalIssuesHome[]; categories: string[]; onClose: () => void
  onSend: (o: { homeId: string; category: string; subject: string; body: string; photos: string[] }) => Promise<boolean>
}) {
  const [homeTitle, setHomeTitle] = useState(homes[0]?.title ?? '')
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const ph = usePickedPhotos(PHOTOS_MAX)
  const reset = () => { setCategory(''); setSubject(''); setBody(''); setTried(false); ph.reset() }
  const send = async () => {
    setTried(true)
    if (!category || !subject.trim() || !body.trim()) return
    setBusy(true)
    try { if (await onSend({ homeId: homes.find((h) => h.title === homeTitle)?.homeId ?? homes[0]?.homeId ?? '', category, subject, body, photos: ph.photos })) reset() } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={() => { reset(); onClose() }} title="Report an issue" subtitle="Tell your designer what’s wrong — they hear it now and answer here." size="modal" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={() => { reset(); onClose() }}>Cancel</Button><Button onPress={() => { void send() }} isDisabled={busy} data-testid="portal-report-send">{busy ? 'Sending…' : 'Send to your designer'}</Button></>}>
      <div className={t.form} data-testid="portal-report-form">
        {homes.length > 1 ? <TextField label="Which home" mode="select" options={homes.map((h) => h.title)} value={homeTitle} onChange={setHomeTitle} /> : null}
        <TextField label="What it is about" mode="select" options={categories} value={category} onChange={setCategory} required error={tried && !category ? MSG.required : undefined} />
        <TextField label="In a few words" value={subject} onChange={(v) => setSubject(v.slice(0, SUBJECT_MAX))} maxLength={SUBJECT_MAX} required error={tried && !subject.trim() ? MSG.required : undefined} helper="“Water stain under the kitchen sink”" />
        <TextArea label="What happened" value={body} onChange={(v: string) => setBody(v.slice(0, BODY_MAX))} className={t.field} isInvalid={tried && !body.trim()} errorMessage={tried && !body.trim() ? MSG.required : undefined} />
        {ph.view}
      </div>
    </Dialog>
  )
}
