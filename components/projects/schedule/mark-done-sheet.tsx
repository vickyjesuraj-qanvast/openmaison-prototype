'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { landedName, uploadablePicture } from '@/components/leads/files/upload-picture'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { dateOfDay, dayLabel, dayOf, plural, shortTitle, spanWord } from '@/lib/projects/schedule-model'
import { tellClientText, tellDay, waLink } from '@/lib/projects/tell-client'
import { unsentWords } from '@/lib/notifications/held'   // (simplify round 2, R2-C)
import { discardUpdateUploads, uploadUpdateFile } from '@/app/projects/updates-actions'
import { markMilestoneDone, readMarkDone, undoMarkDone, type DoneTold, type MarkDoneRead } from '@/app/projects/schedule-actions'
import m from './moment.module.css'

type Pick = { key: string; name: string; preview: string | null; state: 'uploading' | 'done' | 'failed'; fileId: string | null; reason: string | null }

/**
 * (simplify S-18, the owner's "build everything", 2026-10-09; P2 §6.3 and the report's concept screen) **Mark {stage} done** — one sheet for
 * every Done: the row's Mark done and its ⋮, the panel's Status → Done, a phone row's Done, `?done=<id>`, the Hand over sheet's "Mark {last}
 * done". The house Dialog m (600; a bottom sheet ≤767), grown from "Mark {m} done today?" (B-09):
 *   · When — the day it ended (today, back to its first day), how early or late, ☐ bring what follows forward, the tasks still open inside;
 *   · Tell {client} (while they hold their page; else the one Invite row) — ☑ show it on their schedule as done, with the other changes
 *     they haven't seen each ticked (Share changes' own list), ☑ ask them to confirm it (on for the handover stage and a milestone that asks),
 *     ☐ add photos (they post as "{milestone} is done" under the update review rule);
 *   · Money (whoever sees money, a stage tied to it) — ☑ send the stage's invoice, or submit it under invoice approval.
 * Foot: Cancel · Mark done — **Ask to approve** for a Designer or a Manager under completion approval: the ticks ride with the ask and run on
 * the Owner's *Approve as done*. After: one sentence with Undo, then the WhatsApp offered (the share's and the invoice's emails already went).
 * Self-loading (`readMarkDone`) — its ghost is the sheet's own regions (REG-708). Closes only once the save lands.
 */
export function MarkDoneSheet({ milestoneId, open, nested = false, onClose, onDone, onInvite }: {
  milestoneId: string | null
  open: boolean
  /** Over another surface (the Hand over sheet, the milestone panel). */
  nested?: boolean
  onClose: () => void
  /** After the save landed and the sentence was said — the host pulses the row, re-reads its checklist. */
  onDone?: (r: { asked: boolean }) => void
  /** The Invite row's button — the host's Invite to Portal. */
  onInvite?: () => void
}) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [data, setData] = useState<MarkDoneRead | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [date, setDate] = useState('')
  const [forward, setForward] = useState(false)
  const [share, setShare] = useState(true)
  const [others, setOthers] = useState<Set<string>>(new Set())
  const [showOthers, setShowOthers] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [photosOn, setPhotosOn] = useState(false)
  const [picks, setPicks] = useState<Pick[]>([])
  const [invoice, setInvoice] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seen, setSeen] = useState<string | null>(null)
  const key = open ? milestoneId : null
  if (key !== seen) { setSeen(key); if (key) { setData(null); setFailed(null); setPicks([]); setPhotosOn(false); setShowOthers(false); setBusy(false); setError(null) } }
  useEffect(() => {
    if (!open || !milestoneId) return
    let live = true
    void readMarkDone(milestoneId).then((r) => {
      if (!live) return
      if ('error' in r) { setFailed(r.error); return }
      setData(r)
      setDate(inputDate(dateOfDay(r.today)))
      setForward(false)
      setShare(r.milestone.visible)
      setOthers(new Set(r.share.others.map((o) => o.id)))
      setConfirm(r.askDefault)
      setInvoice(r.invoice?.mode === 'send' || r.invoice?.mode === 'submit')
    }, () => { if (live) setFailed('') })
    return () => { live = false }
  }, [open, milestoneId, tick])

  /* picked photos — sized to land, uploaded to Site updates at once (the composer's way); a closed sheet takes them back */
  const urls = useRef<string[]>([])
  useEffect(() => { if (!open) { urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = [] } }, [open])
  const pick = (files: File[]) => {
    if (!data) return
    const room = 12 - picks.filter((p) => p.state !== 'failed').length
    for (const [i, file] of files.slice(0, Math.max(0, room)).entries()) {
      const k = `p-${Date.now()}-${i}`
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      if (preview) urls.current.push(preview)
      setPicks((xs) => [...xs, { key: k, name: file.name, preview, state: 'uploading', fileId: null, reason: null }])
      void (async () => {
        try {
          const img = file.type.startsWith('image/') ? await uploadablePicture(file) : null
          if (!img) { setPicks((xs) => xs.map((x) => (x.key === k ? { ...x, state: 'failed', reason: 'Pictures only — a JPEG, PNG or WebP' } : x))); return }
          const r = await uploadUpdateFile(data.projectId, { name: landedName(file.name, img), data: img })
          setPicks((xs) => xs.map((x) => (x.key === k ? ('error' in r ? { ...x, state: 'failed', reason: r.error } : { ...x, state: 'done', fileId: r.fileId }) : x)))
        } catch (e) { setPicks((xs) => xs.map((x) => (x.key === k ? { ...x, state: 'failed', reason: refusalOf(e) ?? 'Couldn’t upload it' } : x))) }
      })()
    }
  }
  const landed = picks.filter((p) => p.state === 'done' && p.fileId).map((p) => p.fileId!)
  const close = (o: { kept?: boolean } = {}) => {
    if (!o.kept && data && landed.length) void discardUpdateUploads(data.projectId, { fileIds: landed }).catch(() => undefined)
    onClose()
  }

  const ms = data?.milestone ?? null
  const today = data?.today ?? dayOf(new Date(0))
  const chosen = parseInputDate(date)
  const day = chosen ? dayOf(chosen) : null
  const lo = ms ? Math.min(ms.start, today) : today
  const dayError = !chosen ? 'Choose the day it ended' : day !== null && (day > today || day < lo) ? `Choose a day from ${dayLabel(lo)} to today` : null
  const early = ms && day !== null && day < ms.end ? ms.end - day : 0
  const when = !ms || day === null ? null
    : day < ms.end ? `${spanWord(ms.end - day)} early — it was due to end ${dayLabel(ms.end)}`
    : day > ms.end ? `${spanWord(day - ms.end)} late — it was due to end ${dayLabel(ms.end)}`
    : `On its last day, ${dayLabel(ms.end)}`
  const first = data?.project.first ?? ''
  const live = !!data?.portal.live
  const uploading = picks.some((p) => p.state === 'uploading')

  const go = async () => {
    if (!data || !ms || busy || uploading) return
    if (dayError || day === null) { setError(dayError); return }
    setBusy(true); setError(null)
    try {
      const r = await markMilestoneDone(ms.id, {
        day: `${chosen!.getFullYear()}-${String(chosen!.getMonth() + 1).padStart(2, '0')}-${String(chosen!.getDate()).padStart(2, '0')}`,
        bringForward: early > 0 && forward, share: live && ms.visible && share, shareOnly: [...others], askConfirm: live && confirm && !ms.confirmAsked,
        fileIds: live && photosOn ? landed : [], invoiceId: data.invoice && data.invoice.mode !== 'awaiting' && invoice ? data.invoice.id : null,
      })
      if ('error' in r) { setError(refusalOf(r.error) ?? 'Couldn’t mark it done — please try again'); return }
      close({ kept: live && photosOn })
      const undo = r.undo
      /* (simplify round 2, R2-C) the client's emails the ticks raised (the share's, the photos', the invoice's) wait out this Undo — taken back with
         it, said in its sentence; the sentence replaces the WhatsApp offer below (key 'tell-client'), nothing is left to tell */
      snackbar({ key: 'schedule-status', message: r.sentence, actionLabel: 'Undo', onAction: () => {
        void run('undo the Done', async () => {
          const x = await undoMarkDone(undo)
          if (!('error' in x)) snackbar({ key: 'tell-client', message: `${shortTitle(ms.title)} is back as it was${unsentWords(x.unsent)}` })
          return x
        }, undefined, { refresh: true })
      } })
      offerWhatsApp(r.told)
      router.refresh()
      onDone?.({ asked: !!r.asked })
    } catch (e) { setError(refusalOf(e) ?? 'Couldn’t mark it done — please try again') }
    finally { setBusy(false) }
  }
  /* the one WhatsApp, offered — never forced: the share's and the invoice's emails already went (client_schedule_shared · client_invoice_sent) */
  const offerWhatsApp = (told: DoneTold | undefined) => {
    if (!data || !told || !(told.shared || told.invoice || told.photos) || !data.portal.phone || !data.portal.mobile) return
    const origin = window.location.origin
    const text = tellClientText('done', {
      client: data.project.client, studio: data.portal.studio, url: data.portal.live ? `${origin}${data.portal.path}` : null, milestone: ms?.title ?? null,
      confirm: told.confirm, photos: told.photos,
      invoice: told.invoice ? { stage: told.invoice.stage, amount: money2(told.invoice.amountMinor), number: told.invoice.number, due: told.invoice.dueAt ? tellDay(told.invoice.dueAt) : null, link: told.invoice.link ? `${origin}${told.invoice.link}` : null } : null,
    })
    const phone = data.portal.phone
    snackbar({ key: 'tell-client', message: `Tell ${data.project.first} on WhatsApp too?`, actionLabel: 'Open WhatsApp', onAction: () => { window.open(waLink(phone, text), '_blank', 'noopener') } })
  }

  const title = ms ? `Mark ${ms.title} done` : 'Mark it done'
  const action = data?.approval ? 'Ask to approve' : 'Mark done'
  return (
    <Dialog open={open && !!milestoneId} onClose={() => close()} title={title} subtitle={data?.project.name} width={600} size="form" nested={nested} portal={nested} closeOnScrim={false}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={() => close()} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { void go() }} isDisabled={busy || !data || uploading} data-testid="done-sheet-confirm">{busy ? 'Saving…' : uploading ? 'Uploading…' : action}</Button>
            </>}>
      <div className={m.sheet} data-testid="done-sheet">
        {failed !== null ? (
          <p className={m.line} role="status">{failed || 'Couldn’t load the milestone'} — <button type="button" className={m.inline} onClick={() => { setFailed(null); setTick((t) => t + 1) }}>try again</button></p>
        ) : !data || !ms ? <SheetGhost /> : (
          <>
            {/* (gaps build, package C — 8) under completion approval the Done waits — said before the press */}
            {data.approval ? <p className={m.line} data-tone="strong" data-testid="done-sheet-approval">An Owner or an Admin approves it as done — what you tick here runs when they do.</p> : null}
            <section className={m.region} aria-label="When">
              <span className={m.label}>When</span>
              <div className={m.when}>
                <div className={m.date}><DateField label="Done on" required value={date} onChange={(v) => { setDate(v); setError(null) }} today={dateOfDay(today)} min={dateOfDay(lo)} max={dateOfDay(today)} error={error ?? undefined} /></div>
                {when ? <span className={m.line} data-tone="strong" data-testid="done-sheet-when">{when}</span> : null}
              </div>
              {early > 0 && data.followers.length ? (
                <Checkbox isSelected={forward} onChange={setForward} data-testid="done-sheet-forward">
                  {`Bring ${shortTitle(data.followers[0]!.title)}${data.followers.length > 1 ? ` and ${data.followers.length - 1} more` : ''} forward to start sooner`}
                </Checkbox>
              ) : null}
              {ms.tasksOpen > 0 ? <p className={m.line}>{`${ms.tasksOpen} of ${plural(ms.tasksTotal, 'task')} inside ${ms.tasksOpen === 1 ? 'is' : 'are'} still open. They stay open.`}</p> : null}
            </section>

            <section className={m.region} aria-label={`Tell ${first}`} data-testid="done-sheet-tell">
              <span className={m.label}>{`Tell ${first}`}</span>
              {!live ? (
                <div className={m.row}>
                  <span className={m.line}>{data.portal.withdrawn ? `${first}’s access to their page is withdrawn — they see nothing of the schedule.` : `${first} has no page yet — they see the schedule once invited.`}</span>
                  {onInvite ? <Button variant="secondary" appearance="outlined" size="sm" onPress={() => { close(); onInvite() }} data-testid="done-sheet-invite">{data.portal.withdrawn ? 'Invite to Portal' : `Invite ${first}`}</Button> : null}
                </div>
              ) : (
                <>
                  {ms.visible ? (
                    <div className={m.tick}>
                      <Checkbox isSelected={share} onChange={setShare} data-testid="done-sheet-share">{data.share.mode === 'ask' ? `Ask to show it on ${first}’s schedule as done` : `Show it on ${first}’s schedule as done`}</Checkbox>
                      <span className={m.help}>
                        {data.share.mode === 'ask' ? 'An Owner or an Admin shares it. ' : ''}
                        {data.share.first ? `${first} hasn’t seen the schedule yet — sharing sends all of it.`
                          : data.share.others.length ? <>{`With the ${plural(data.share.others.length, 'other change')} ${first} hasn’t seen · `}<button type="button" className={m.inline} aria-expanded={showOthers} onClick={() => setShowOthers((s) => !s)} data-testid="done-sheet-choose">{showOthers ? 'Hide them' : 'Choose what to share'}</button></>
                          : 'Only this change.'}
                      </span>
                      {showOthers && share && !data.share.first ? (
                        <div className={m.more}>
                          <ul className={m.changes} data-testid="done-sheet-changes">
                            {data.share.others.map((c) => (
                              <li key={c.id} className={m.change}>
                                <Checkbox isSelected={others.has(c.id)} onChange={() => setOthers((t) => { const x = new Set(t); if (x.has(c.id)) x.delete(c.id); else x.add(c.id); return x })} aria-label={`Share ${c.title}`} />
                                <span className={m.changeText}><span className={m.changeName}>{c.title}</span><span className={m.changeWords}>{c.was ? <s>{c.was}</s> : null}{c.now}</span></span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : <p className={m.line}>{`It isn’t shown to ${first} — their schedule leaves it out.`}</p>}
                  <div className={m.tick}>
                    <Checkbox isSelected={ms.confirmAsked || confirm} isDisabled={ms.confirmAsked} onChange={setConfirm} data-testid="done-sheet-confirm-ask">{`Ask ${first} to confirm it`}</Checkbox>
                    <span className={m.help}>{ms.confirmAsked ? `Asked already — the milestone’s own switch stops it.` : `${first} answers “Looks good” or “Something is not right” on their page.`}</span>
                  </div>
                  <div className={m.tick}>
                    <Checkbox isSelected={photosOn} onChange={setPhotosOn} data-testid="done-sheet-photos">Add photos</Checkbox>
                    <span className={m.help}>{`They post as “${ms.title} is done”${data.review ? ', sent for review' : ''}.`}</span>
                    {photosOn ? (
                      <>
                        {picks.length ? (
                          <div className={m.photos}>
                            {picks.map((p) => (
                              <span key={p.key} className={m.photo} data-state={p.state}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- a picked picture's own object URL, shown before it lands */}
                                {p.preview ? <img src={p.preview} alt={p.name} /> : <Icon name="image" size={24} weight={300} />}
                                <span className={m.photoDrop}><Tooltip label="Remove"><IconButton icon="close" label={`Remove ${p.name}`} size={24} variant="bare" iconSize={16}
                                  onClick={() => { setPicks((xs) => xs.filter((x) => x.key !== p.key)); if (p.fileId && data) void discardUpdateUploads(data.projectId, { fileIds: [p.fileId] }).catch(() => undefined) }} /></Tooltip></span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {picks.some((p) => p.state === 'failed') ? <span className={m.help} data-tone="alert">{picks.find((p) => p.state === 'failed')?.reason}</span> : null}
                        <div className={m.well}><Dropzone variant="compact" title={<>Drop photos here or <b>choose them</b></>} accept="image/*" label="Add photos" onPick={() => undefined} onPickMany={pick} /></div>
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </section>

            {data.invoice ? (
              <section className={m.region} aria-label="Money" data-testid="done-sheet-money">
                <span className={m.label}>Money</span>
                {data.invoice.mode === 'awaiting' ? <p className={m.line}>{`The ${data.invoice.stage} invoice waits for an Owner or an Admin to approve it.`}</p> : (
                  <div className={m.tick}>
                    <Checkbox isSelected={invoice} onChange={setInvoice} data-testid="done-sheet-invoice">{`${data.invoice.mode === 'send' ? 'Send' : 'Submit'} the ${data.invoice.stage} invoice${data.invoice.mode === 'submit' ? ' for approval' : ''} · ${money2(data.invoice.amountMinor)}`}</Checkbox>
                    <span className={m.help}>{data.invoice.mode === 'submit' ? 'An Owner or an Admin sends it.' : `${data.invoice.pct !== null ? `${Number.isInteger(data.invoice.pct) ? data.invoice.pct : data.invoice.pct.toFixed(1)}% · ` : ''}${first} hears of it by email, as every invoice sent.`}</span>
                  </div>
                )}
              </section>
            ) : null}
          </>
        )}
      </div>
    </Dialog>
  )
}

/** (REG-708) The sheet's ghost — its own regions as bones: the date and its line, the three ticks, the money tick. */
function SheetGhost() {
  return (
    <div className={m.ghost} aria-hidden data-testid="done-sheet-ghost">
      <div className={m.ghostRegion}><Line w={48} lh={16} h={10} /><div className={m.when}><Slot kind="field" w={280} /><Line w={220} lh={20} h={12} /></div></div>
      <div className={m.ghostRegion}><Line w={96} lh={16} h={10} />{[220, 180, 120].map((w, i) => <span key={i} className={m.ghostTick}><Slot kind="check" /><Line w={w} lh={20} h={12} /></span>)}</div>
      <div className={m.ghostRegion}><Line w={48} lh={16} h={10} /><span className={m.ghostTick}><Slot kind="check" /><Line w={260} lh={20} h={12} /></span></div>
    </div>
  )
}
