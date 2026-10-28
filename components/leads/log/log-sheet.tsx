'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Sheet } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { AutoFillNote, LinkButton } from '@/components/leads/move-stage/fields'
import { AutoFillDialog } from '@/components/leads/move-stage/dialogs'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { uploadPicked } from '@/components/leads/files/upload-picture'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { fetchLogContext, logLeadContact, type LogContext, type LogSaved } from '@/app/leads/actions'
import { fetchAttachLibrary } from '@/app/leads/files-actions'
import { FILL_ORDER, fillWords, readContactFile, type ContactFill } from '@/lib/leads/contact-fill'
import { displayDue, formatInputDateTime, parseInputDateTime } from '@/lib/format'
import { MSG } from '@/lib/forms'
import type { LeadFile } from '@/lib/db/schema'
import { ChannelChips, LogLine, LogNotes, LogPhotos, NextStep, OutcomeChips, OwnerRow, WhenRow, WhereChips, type LogFile } from './log-fields'
import { chipOfChannel, contactChannelOf, dayWhen, firstName, logPlan, logTitle, nextLabel, savedWords, type SheetChannel } from './log-plan'
import { useOnTheMove } from './use-move-layout'
import styles from './log.module.css'

/**
 * (Leads on the move, P-03 — his marks 2026-10-23 on the Leads-on-the-move page, "continue the leads"; B-10 · B-22 · C-21 absorbed; Q-02 · Q-06)
 * **The log sheet** — "I just called Farah, she wants a callback Thursday" in three taps: the channel set from the press, When set to now, the
 * five outcomes as chips, a call-back with the due presets once the outcome asks for one, notes and Take a photo · Choose a file (optional), one
 * filled Save. On a New lead the save logs the first contact AND moves the lead to Contacted through the move's own path and its owner rule
 * (a lead nobody owns asks who — the suggested member first); a site visit on a Contacted lead is "Save & move to Met". Auto Fill from a chat
 * stays the second way (the head's link). A refusal stays in the foot and nothing typed is lost. The same sheet is the Lead screen's Log ▾ and
 * prompt and Notes › New › Contact Log on a phone and a tablet held upright; a tablet held sideways shows it as a centred dialog. The context is
 * read as it opens (`fetchLogContext` — the server's truth, Who sees leads held); the sheet rises once it lands.
 */
export type LogAskIn = { channel: SheetChannel; n: number }

export function LogSheet({ leadId, ask, onClose, onSaved }: {
  leadId: string
  /** a press of Log (n changes per press); null = closed */
  ask: LogAskIn | null
  onClose: () => void
  /** the host re-reads the lead (the Lead screen's Next line, the Notes list) */
  onSaved?: (r: LogSaved) => void
}) {
  const snackbar = useSnackbar()
  const [ctx, setCtx] = useState<{ n: number; channel: SheetChannel; data: LogContext } | null>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  const askN = ask?.n ?? null, askChannel = ask?.channel ?? null
  useEffect(() => {
    if (askN === null || !askChannel) return
    let live = true
    void fetchLogContext(leadId).then((r) => {
      if (!live) return
      if ('error' in r) { snackbar({ message: couldnt('open the log', refusalOf(r.error)) }); closeRef.current(); return }
      setCtx({ n: askN, channel: askChannel, data: r })
    }, () => { if (live) { snackbar({ message: couldnt('open the log', null) }); closeRef.current() } })
    return () => { live = false }
  }, [askN, askChannel, leadId, snackbar])
  /* the context of the open press — or the last one while its sheet slides away */
  const shown = ctx && (ask ? ctx.n === ask.n : true) ? ctx : null
  if (!shown) return null
  return <LogSheetBody key={shown.n} open={!!ask && ask.n === shown.n} initial={shown.channel} ctx={shown.data} onClose={onClose} onSaved={onSaved} />
}

type Draft = { when: string; outcome: string; nextStepWhen: string; nextStepMode: string; where: string; notes: string }

function LogSheetBody({ open, initial, ctx, onClose, onSaved }: {
  open: boolean; initial: SheetChannel; ctx: LogContext; onClose: () => void; onSaved?: (r: LogSaved) => void
}) {
  const snackbar = useSnackbar()
  const portrait = useOnTheMove()
  const lead = ctx.lead
  const first = firstName(lead.name)
  const [openedAt] = useState(() => Date.now())   // the moment the log opened — "Now", and the presets' clock
  const [channel, setChannel] = useState<SheetChannel>(initial)
  const [d, setD] = useState<Draft>(() => ({ when: formatInputDateTime(new Date(openedAt)), outcome: '', nextStepWhen: '', nextStepMode: '', where: 'In person', notes: '' }))
  const [files, setFiles] = useState<LogFile[]>([])
  const [uploading, setUploading] = useState(0)
  const [assignTo, setAssignTo] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [autoFill, setAutoFill] = useState(false)
  const [fillNote, setFillNote] = useState<string | null>(null)
  const [library, setLibrary] = useState<LeadFile[] | null>(null)
  const [touched, setTouched] = useState<{ channel: boolean; when: boolean }>({ channel: false, when: false })
  const patch = (p: Partial<Draft>) => { setD((x) => ({ ...x, ...p })); setRefusal(null) }

  const owner = assignTo ? ctx.team.find((m) => m.id === assignTo) ?? null : null
  const plan = logPlan(channel, {
    name: lead.name, stage: lead.stage, resumeStage: lead.resumeStage, assignees: lead.assignees, project: lead.project,
    stageMovement: ctx.stageMovement, role: ctx.role, canAssign: !ctx.hint && ctx.assignable.length > 0, assignHint: ctx.hint,
    assignTo: owner ? { id: owner.id, name: owner.name } : null,
  })
  const kind = plan.kind
  /* the studio asks for the next call or meeting on the first contact (pending modules S05) — never after "Not interested" */
  const nextRequired = ctx.asksNextStep && plan.moveTo === 'Contacted' && !!d.outcome && d.outcome !== 'Not interested'
  const errors = {
    outcome: kind === 'contact' && !d.outcome ? MSG.choose : undefined,
    when: kind !== 'note' && !parseInputDateTime(d.when) ? MSG.dateTime : undefined,
    next: kind === 'contact' && nextRequired && !d.nextStepWhen ? MSG.required : undefined,
    note: kind === 'note' && !d.notes.trim() && !files.length ? 'Write a note or add a photo' : undefined,
  }
  const shown: Partial<typeof errors> = showErrors ? errors : {}
  const invalid = Object.values(errors).some(Boolean)

  const pickChannel = (c: SheetChannel) => {
    setChannel(c); setTouched((t) => ({ ...t, channel: true })); setRefusal(null)
    if (c === 'Visit' && !d.where) patch({ where: 'In person' })
  }
  const pickOutcome = (o: string) => patch(nextLabel(o) ? { outcome: o } : { outcome: o, nextStepWhen: '', nextStepMode: '' })   // no call-back after "Not interested"

  /* a picked photo or file goes up at once through the Files tab's own upload (its bytes kept) and stays with the log; a refusal says why */
  const pick = (file: File) => {
    setUploading((n) => n + 1)
    void uploadPicked(lead.id, file).then((r) => {
      if (r && !('error' in r)) setFiles((fs) => (fs.some((f) => f.id === r.id) ? fs : [...fs, { id: r.id, name: r.name, thumb: r.thumb ?? null, kind: r.kind }]))
      else snackbar({ message: couldnt(`upload ${file.name}`, r && 'error' in r ? r.error : null) })
    }, () => snackbar({ message: couldnt(`upload ${file.name}`, null) })).finally(() => setUploading((n) => n - 1))
  }
  const openLibrary = () => { void fetchAttachLibrary(lead.id).then((fs) => setLibrary(fs), () => snackbar({ message: couldnt('open the lead’s files', null) })) }

  /* Auto Fill (S43B — the window's and Notes' reader): what the chat plainly says fills what is still empty — the channel and the time while they
     are still the press's and the opening moment's; the file itself is kept with the log; the line at the top says what filled */
  const autoFilled = async (file: File) => {
    const read = await readContactFile(file, { kind: kind === 'meeting' ? 'meeting' : 'contact', now: new Date(), members: ctx.team.map((m) => ({ name: m.name })) })
    const filled: (keyof ContactFill)[] = [], kept: (keyof ContactFill)[] = []
    if (read.ok) {
      const next: Partial<Draft> = {}
      for (const k of FILL_ORDER) {
        const v = read.fill[k]
        if (!v) continue
        if (k === 'channel') { const chip = chipOfChannel(v); if (chip && !touched.channel && chip !== channel) { setChannel(chip); filled.push(k) } else if (chip && chip !== channel) kept.push(k); continue }
        if (k === 'when') { if (!touched.when) { next.when = v; filled.push(k) } else if (v !== d.when) kept.push(k); continue }
        const had = String(d[k as keyof Draft] ?? '').trim()
        if (!had) { (next as Record<string, string>)[k] = v; filled.push(k) } else if (had !== v) kept.push(k)
      }
      patch(next)
    }
    setFillNote(fillWords({ file: file.name, kind: kind === 'meeting' ? 'meeting' : 'contact', read, filled, kept }))
    setAutoFill(false)
    pick(file)
  }

  const save = async () => {
    if (invalid) { setShowErrors(true); return }
    if (uploading > 0) { setRefusal('A file is still uploading — wait for it to land'); return }
    setSaving(true); setRefusal(null)
    const r = await logLeadContact({
      leadId: lead.id, kind, channel: contactChannelOf(channel), when: d.when, outcome: kind === 'contact' ? d.outcome : '',
      nextStepWhen: kind === 'contact' ? d.nextStepWhen : '', nextStepMode: kind === 'contact' ? d.nextStepMode : '',
      where: kind === 'meeting' ? d.where : '', notes: d.notes, fileIds: files.map((f) => f.id),
      moveTo: plan.moveTo, assignTo: plan.moveTo === 'Contacted' && plan.ownerRow ? assignTo : null,
    }).catch((e: unknown) => ({ error: refusalOf(e) ?? '' }))
    setSaving(false)
    if ('error' in r) { setRefusal(couldnt('save the log', r.error || null)); return }   // the sheet stays; nothing typed is lost
    const label = nextLabel(d.outcome)
    snackbar({ message: savedWords({ channel, kind, name: lead.name, moved: r.moved, reminder: r.reminder && label ? { label, when: dayWhen(r.reminder.dueAt, openedAt) } : null, planned: r.planned ? displayDue(new Date(r.planned.at)) : null }) })
    onSaved?.(r)
    onClose()
  }

  const title = logTitle(channel, lead.name)
  const body = (
    <div className={styles.body} data-sheet={portrait || undefined} data-testid="log-sheet">
      {fillNote ? <AutoFillNote text={fillNote} /> : null}
      {/* nobody owns a New lead: who does comes first — it decides what Save does (the line above it says which) */}
      {plan.ownerRow ? <OwnerRow first={first} team={ctx.team} assignable={ctx.assignable} suggestedId={ctx.suggestedId} value={assignTo} onChange={setAssignTo} /> : null}
      <ChannelChips value={channel} onChange={pickChannel} />
      {kind === 'meeting' ? <WhereChips value={d.where} onChange={(v) => patch({ where: v })} /> : null}
      {kind !== 'note' ? <WhenRow value={d.when} onChange={(v) => { setTouched((t) => ({ ...t, when: true })); patch({ when: v }) }} now={openedAt} openedAt={openedAt} error={shown.when} /> : null}
      {kind === 'contact' ? <OutcomeChips value={d.outcome} onChange={pickOutcome} error={shown.outcome} /> : null}
      {kind === 'contact' && d.outcome ? (
        <NextStep key={d.outcome} outcome={d.outcome} when={d.nextStepWhen} mode={d.nextStepMode} channel={channel} now={openedAt} required={nextRequired} error={shown.next}
                  onChange={(p) => patch(p)} />
      ) : null}
      <LogNotes value={d.notes} onChange={(v) => patch({ notes: v })} label={kind === 'note' ? 'Note' : 'Notes (optional)'} />
      <LogPhotos files={files} uploading={uploading > 0} onPick={pick} onRemove={(id) => setFiles((fs) => fs.filter((f) => f.id !== id))} onLibrary={openLibrary} first={first}
                 label={kind === 'note' ? 'Photos (optional)' : kind === 'meeting' ? 'Photos from the visit (optional)' : 'Photos and screenshots (optional)'} />
      {shown.note ? <LogLine tone="error">{shown.note}</LogLine> : null}
    </div>
  )
  const foot = (
    <div className={styles.foot} data-testid="log-foot">
      {refusal ? <LogLine tone="error" testId="log-refusal">{refusal}</LogLine>
        : showErrors && invalid ? <LogLine tone="error" testId="log-refusal">{errors.note ?? (errors.outcome ? 'Choose how it went to save the log' : errors.next ? 'Choose when to follow up — your studio asks for it' : 'Choose when it was')}</LogLine>
        : plan.line ? <LogLine testId="log-line">{plan.line}</LogLine> : null}
      <Button className={styles.footBtn} onPress={() => { void save() }} isDisabled={saving} data-testid="log-save">{saving ? 'Saving…' : plan.save}</Button>
    </div>
  )
  const headActions = kind !== 'note'
    // eslint-disable-next-line @next/next/no-img-element
    ? <LinkButton leading={<img src="/figma-assets/brief-sparkle.svg" alt="" />} onClick={() => setAutoFill(true)} ariaLabel="Auto fill from a chat or an email">Auto fill</LinkButton>
    : null
  return (
    <>
      {portrait ? (
        <Sheet open={open} onClose={onClose} title={title} headActions={headActions} footer={foot} label={title}>{body}</Sheet>
      ) : (
        <Dialog open={open} onClose={onClose} title={title} size="form" width={480} actions={headActions} footer={foot} closeOnScrim={false}>{body}</Dialog>
      )}
      {/* (REG-2656's rule) the nested surfaces open above the sheet — on the body after the sheet's own portal, so Esc closes them first
          (components/om/surface.ts: a surface above is one that follows) */}
      {typeof document === 'undefined' ? null : createPortal(<>
      <AutoFillDialog open={autoFill} onClose={() => setAutoFill(false)} onUpload={autoFilled} kind={kind === 'meeting' ? 'meeting' : 'contact'} layered />
      <AttachFilesModal open={!!library} files={library ?? []} attached={files.map((f) => f.id)} layered
                        onClose={() => setLibrary(null)}
                        onAttach={(ids) => {
                          /* the modal answers the whole ticked set (it opened on what the log keeps): the log keeps exactly that, in that order */
                          const lib = library ?? []
                          setLibrary(null)
                          setFiles((fs) => ids.flatMap((id): LogFile[] => {
                            const have = fs.find((f) => f.id === id); if (have) return [have]
                            const p = lib.find((f) => f.id === id); return p ? [{ id: p.id, name: p.name, thumb: p.thumb ?? null, kind: p.kind }] : []
                          }))
                        }}
                        onUploadPicked={(file) => (file ? uploadPicked(lead.id, file).then((r) => { if (r && !('error' in r)) setLibrary((l) => (l ? [r, ...l] : l)); return r }) : undefined)} />
      </>, document.body)}
    </>
  )
}
