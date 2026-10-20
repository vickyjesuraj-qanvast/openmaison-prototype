'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetLayout } from '@/components/om/sheet'
import { Bone } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { pendingWindow } from '@/components/portal/wa-window'
import { MSG } from '@/lib/forms'
import { inputDate, isSgPhone, parseInputDate, phoneTyped } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { NAME_MAX } from '@/lib/projects/model'
import { dayLabel, dayOf, plural } from '@/lib/projects/schedule-model'
import { tellClientText, tellDay, waLink } from '@/lib/projects/tell-client'
import { unsentWords } from '@/lib/notifications/held'   // (simplify round 2, R2-C) the Undo says the held email won't go
import { readStartSheet, startProjectSheet, undoStartProjectSheet, type StartSheetRead } from '@/app/projects/actions'
import { duplicateProject, readDuplicateProject, undoDuplicateProject, type DuplicateRead, type DuplicateUndo } from '@/app/projects/actions'   // (parity map, PR-058)
import { Chips } from '@/components/om/chips'
import { PhoneField } from '@/components/leads/lead-form'   // (REG-456 · REG-927) the house phone box
import { withFrom } from '@/lib/nav'
import { SourcePicker, sourceOf, type SourceState } from './schedule/source-picker'
import { StartPreview, aiContextOf, preselectWords, previewWords, startSourceOf } from './schedule/start-schedule'
import styles from './project-dialogs.module.css'
import m from './schedule/moment.module.css'   // (simplify S-17) the moments' sheets share one rhythm

/*
 * (REG-928) The project's small forms — each the house Dialog with the house fields, closing only once its save lands (`onSave` resolves
 * true), the caret in the field it opened for. Shared by the listing's row menu and the project page.
 */

const useFocusOnOpen = (open: boolean) => {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (!open) return; const r = requestAnimationFrame(() => requestAnimationFrame(() => ref.current?.focus())); return () => cancelAnimationFrame(r) }, [open])
  return ref
}

/** Rename… (Q-05: at any stage). */
export function RenameProjectDialog({ open, name, onClose, onSave }: { open: boolean; name: string; onClose: () => void; onSave: (name: string) => Promise<boolean> }) {
  const [v, setV] = useState(name)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setV(name); setBusy(false); setTried(false) } }
  const ref = useFocusOnOpen(open)
  const error = tried && !v.trim() ? MSG.required : undefined
  /* (fix-A, A-35) the same name saved is nothing changed — the dialog closes without a word */
  const save = async () => { setTried(true); if (!v.trim() || busy) return; if (v.trim().replace(/\s+/g, ' ') === name) { onClose(); return } setBusy(true); const ok = await onSave(v.trim()); setBusy(false); if (ok) onClose() }
  return (
    <Dialog open={open} onClose={onClose} title="Rename project" width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      <TextField label="Project name" required value={v} maxLength={NAME_MAX} onChange={setV} error={error} inputRef={ref} trailingIcon={null}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }} />
    </Dialog>
  )
}

/** The project's dates — Getting started's Start date / Target end date, and their Change. */
export function ProjectDatesDialog({ open, start, end, today, focus = 'start', onClose, onSave }: {
  open: boolean; start: Date | null; end: Date | null; today: Date
  /** (fix-A, A-28) The field the row named — the caret lands there (REG-928). */
  focus?: 'start' | 'end'
  onClose: () => void; onSave: (v: { startDate: string | null; targetEndDate: string | null }) => Promise<boolean>
}) {
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (!open) return; const r = requestAnimationFrame(() => requestAnimationFrame(() => (focus === 'end' ? endRef : startRef).current?.focus())); return () => cancelAnimationFrame(r) }, [open, focus])
  const [s, setS] = useState('')
  const [e, setE] = useState('')
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setS(start ? inputDate(start) : ''); setE(end ? inputDate(end) : ''); setBusy(false) } }
  const sd = parseInputDate(s), ed = parseInputDate(e)
  const bad = !!sd && !!ed && ed < sd
  const save = async () => {
    if (bad || busy) return
    setBusy(true)
    const ok = await onSave({ startDate: sd ? sd.toISOString() : null, targetEndDate: ed ? ed.toISOString() : null })
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title="Project dates" width={600} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy || bad}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className={styles.fields}>
        <p className={styles.help}>When work begins on site, and when you aim to hand over.</p>
        <div className={styles.row}>
          <DateField label="Start date" value={s} today={today} onChange={setS} inputRef={startRef} />
          <DateField label="Target end date" value={e} today={today} onChange={setE} error={bad ? 'The target end is before the start' : undefined} inputRef={endRef} />
        </div>
      </div>
    </Dialog>
  )
}

/**
 * (REG-917) Setting up → In progress: Start the project. (simplify S-17, the owner's "build everything", 2026-10-09; P2 §6.2) It grows into
 * the **Start sheet** wherever the project is known — its `projectId`, else the project page's own address — and keeps today's one-date
 * dialog (`onStart`) only where it is not. Its props stay as they were; the frame may pass `projectId` and `onStarted`.
 */
export function StartProjectDialog({ open, name, start, end, today, onClose, onStart, projectId, onStarted }: {
  open: boolean; name: string; start: Date | null; end: Date | null; today: Date; onClose: () => void; onStart: (startDate: string) => Promise<boolean>
  /** (simplify S-17) the project the sheet starts — read from the page's address (/projects/<id>/…) when not given */
  projectId?: string
  /** (simplify S-17) after the sheet's start landed (it says its own sentence with Undo and refreshes the page) */
  onStarted?: () => void
}) {
  const pathname = usePathname()
  const params = useParams<{ id?: string | string[] }>()
  const fromPage = pathname?.startsWith('/projects/') && typeof params?.id === 'string' ? params.id : null
  const id = projectId ?? fromPage
  if (id) return <StartSheet open={open} projectId={id} name={name} today={today} onClose={onClose} onStarted={onStarted} />
  return <StartDateDialog open={open} name={name} start={start} end={end} today={today} onClose={onClose} onStart={onStart} />
}

/** (REG-917) Today's one-date Start: the start date (today, or the date already set) — where no project page is around it. */
function StartDateDialog({ open, name, start, end, today, onClose, onStart }: {
  open: boolean; name: string; start: Date | null; end: Date | null; today: Date; onClose: () => void; onStart: (startDate: string) => Promise<boolean>
}) {
  const [s, setS] = useState('')
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setS(inputDate(start ?? today)); setBusy(false); setTried(false) } }
  const sd = parseInputDate(s)
  const error = tried && !sd ? MSG.required : sd && end && end < sd ? 'The start is after the target end' : undefined
  const go = async () => { setTried(true); if (!sd || error || busy) return; setBusy(true); const ok = await onStart(sd.toISOString()); setBusy(false); if (ok) onClose() }
  return (
    <Dialog open={open} onClose={onClose} title="Start the project" width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void go() }} isDisabled={busy}>{busy ? 'Starting…' : 'Start'}</Button></>}>
      <div className={styles.fields}>
        <p className={styles.help}>{name} moves to In progress. When does work begin on site?</p>
        <DateField label="Start date" required value={s} today={today} onChange={setS} error={error} />
      </div>
    </Dialog>
  )
}

/**
 * (simplify S-17) **The Start sheet** — the house Dialog l (800; a bottom sheet ≤767), REG-917's Start grown into the moment's one sheet:
 *   1 · When — *Works start on*, asked once (the project's start, else today);
 *   2 · The schedule — the Start card's picker with its preselect, beside its *What you will get* (on a phone the picker is a select and the
 *       preview folds to one line); *Not now* keeps the Start card on the Schedule tab; a schedule already made is said in one line;
 *   3 · Tell {client} — ☑ Invite {client} to their page, while they can't open it yet (the mobile-number rule says why when it can't);
 *   4 · Money (whoever sees money) — ☑ Send the Deposit invoice · S$x, or ☑ Submit it for approval under invoice approval.
 * Each tick runs today's own action (`startProjectSheet`); one sentence with Undo (refused once the client opened their page or paid); ONE
 * WhatsApp opened on the press with the invite and the deposit (`pendingWindow` — it goes only once the server said yes). Self-loading
 * (`readStartSheet`), its ghost the sheet's regions (REG-708). Closes only once the start lands; a refused start says why under the date.
 */
function StartSheet({ open, projectId, name, today, onClose, onStarted }: { open: boolean; projectId: string; name: string; today: Date; onClose: () => void; onStarted?: () => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const phone = useSheetLayout()
  const [data, setData] = useState<StartSheetRead | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [date, setDate] = useState('')
  const [src, setSrc] = useState<SourceState | null>(null)
  const [invite, setInvite] = useState(true)
  const [deposit, setDeposit] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const [unfold, setUnfold] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setData(null); setFailed(null); setBusy(false); setTried(false); setRefused(null); setUnfold(false) } }
  useEffect(() => {
    if (!open) return
    let live = true
    void readStartSheet(projectId).then((r) => {
      if (!live) return
      if ('error' in r) { setFailed(r.error); return }
      setData(r)
      setDate(inputDate(r.project.startDate !== null ? new Date(r.project.startDate) : today))
      setSrc(r.schedule ? startSourceOf(r.schedule) : null)
      setInvite(!r.client.live && r.client.mobile)
      setDeposit(r.deposit?.mode === 'send' || r.deposit?.mode === 'submit')
    }, () => { if (live) setFailed('') })
    return () => { live = false }
  }, [open, projectId, tick, today])

  const sd = parseInputDate(date)
  const startDay = sd ? dayOf(sd) : null
  const end = data?.project.targetEnd != null ? new Date(data.project.targetEnd) : null
  const dateError = !sd ? MSG.required : end && !data?.schedule && end < sd ? 'The start is after the target end' : null
  const signedId = data?.schedule?.start.quote?.id ?? null
  const source = data?.schedule && src && src.pick !== 'blank' ? sourceOf(src, signedId) : null
  const scheduleError = data?.schedule && src && src.pick !== 'blank' && !source ? (src.pick === 'upload' ? 'Choose the quote’s file — or pick Not now' : 'Pick where the milestones come from — or Not now') : null
  const c = data?.client ?? null
  const first = c?.first ?? ''
  const offerInvite = !!c && !c.live
  const dep = data?.deposit ?? null

  const go = async () => {
    setTried(true)
    if (!data || busy || dateError || scheduleError || !sd) return
    const inviting = offerInvite && invite && !!c?.mobile
    const billing = !!dep && dep.mode !== 'awaiting' && deposit
    /* WhatsApp opens on the press (REG-534) — it is pointed at the message once the server said yes, else closed */
    const w = c?.phone && c.mobile && (inviting || (billing && dep?.mode === 'send')) ? pendingWindow() : null
    setBusy(true); setRefused(null)
    try {
      const r = await startProjectSheet(projectId, { startDate: sd.toISOString(), source, invite: inviting, depositId: billing ? dep!.id : null })
      if ('error' in r) { w?.cancel(); setRefused(refusalOf(r.error) ?? 'Couldn’t start the project — please try again'); return }
      onClose()
      const undo = r.undo
      /* (simplify round 2, R2-C) the deposit's email waits out this Undo — taken back with the start, and the sentence says so */
      snackbar({ key: 'project-start', message: r.sentence, actionLabel: 'Undo', onAction: () => {
        void run('undo the start', async () => {
          const x = await undoStartProjectSheet(undo)
          if (!('error' in x)) snackbar({ message: `${name} is back to Setting up${unsentWords(x.unsent)}` })
          return x
        }, undefined, { refresh: true })
      } })
      if (w && c?.phone) {
        const origin = window.location.origin
        const page = (r.told.invited || c.live) && !c.paused ? `${origin}${c.path}` : null
        if (r.told.invited || r.told.invoice) {
          const i = r.told.invoice
          w.go(waLink(c.phone, tellClientText('start', { client: c.name, studio: c.studio, url: page, start: sd.getTime(), invite: r.told.invited,
            invoice: i ? { stage: i.stage, amount: money2(i.amountMinor), number: i.number, due: i.dueAt ? tellDay(i.dueAt) : null, link: i.link ? `${origin}${i.link}` : null } : null })))
        } else w.cancel()
      }
      router.refresh()
      onStarted?.()
    } catch (e) { w?.cancel(); setRefused(refusalOf(e) ?? 'Couldn’t start the project — please try again') }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Start the project" subtitle={data?.project.name ?? name} width={800} size="form" closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
                     <Button onPress={() => { void go() }} isDisabled={busy || !data} data-testid="start-sheet-go">{busy ? 'Starting…' : 'Start the project'}</Button></>}>
      <div className={m.sheet} data-testid="start-sheet">
        {failed !== null ? (
          <p className={m.line} role="status">{failed || 'Couldn’t load the project'} — <button type="button" className={m.inline} onClick={() => { setFailed(null); setTick((t) => t + 1) }}>try again</button></p>
        ) : !data ? <StartGhost phone={phone} /> : (
          <>
            <section className={m.region} aria-label="When">
              <span className={m.label}>When</span>
              <div className={m.when}>
                <div className={m.date}><DateField label="Works start on" required value={date} today={today} onChange={(v) => { setDate(v); setRefused(null) }} error={(tried ? dateError : null) ?? refused ?? undefined} /></div>
                <span className={m.line} data-tone={data.project.held ? 'alert' : undefined}>{data.project.held ? 'It is on hold — resume it before it starts.' : `${data.project.name} moves to In progress.`}</span>
              </div>
            </section>

            <section className={m.region} aria-label="The schedule" data-testid="start-sheet-schedule">
              <span className={m.label}>The schedule</span>
              {data.existing ? <p className={m.line} data-tone="strong">{`It has ${plural(data.existing.n, 'milestone')}${data.existing.handover !== null ? ` — handover around ${dayLabel(data.existing.handover)}` : ''}. Its dates stay as they are.`}</p>
                : data.schedule && src ? (
                  <div className={m.split}>
                    <div className={m.pick}>
                      <SourcePicker value={src} onChange={setSrc} quotes={data.schedule.quotes ?? []} templates={data.schedule.start.templates} blank compact={phone}
                                    blankLabel={{ title: 'Not now', help: 'Set it up later — the Schedule tab keeps its Start card.' }} templateHelp={preselectWords(data.schedule, src.templateId)} testId="start-sheet-sources" ai={aiContextOf(data.schedule)} />
                      {tried && scheduleError ? <span className={m.line} data-tone="alert" role="alert">{scheduleError}</span> : null}
                    </div>
                    {phone && !unfold ? (
                      <button type="button" className={m.fold} aria-expanded={false} onClick={() => setUnfold(true)} data-testid="start-sheet-fold">
                        <span>{previewWords(data.schedule, src, startDay)}</span><Icon name="expand_more" size={20} />
                      </button>
                    ) : (
                      <div className={m.preview} aria-label="What you will get">
                        <span className={m.label}>What you will get</span>
                        <StartPreview data={data.schedule} src={src} onSkip={(skip) => setSrc((x) => (x ? { ...x, aiSkip: skip } : x))} startDay={startDay} can blankWords="Not now — the Schedule tab keeps its Start card, to set up when you are ready." />
                      </div>
                    )}
                  </div>
                ) : <p className={m.line}>The schedule is set up on the Schedule tab.</p>}
            </section>

            {offerInvite && c ? (
              <section className={m.region} aria-label={`Tell ${first}`} data-testid="start-sheet-tell">
                <span className={m.label}>{`Tell ${first}`}</span>
                <div className={m.tick}>
                  <Checkbox isSelected={invite && c.mobile} isDisabled={!c.mobile} onChange={setInvite} data-testid="start-sheet-invite">{c.withdrawn ? `Give ${first} their page again` : `Invite ${first} to their page`}</Checkbox>
                  <span className={m.help} data-tone={c.mobile ? undefined : 'alert'}>
                    {!c.mobile ? `${first}’s number isn’t a mobile number — the sign-in code goes by SMS. Fix it on the record first.`
                      : `${first} signs in with ${phoneTyped(c.phone ?? '')}.${c.paused ? ' The client portal is paused — they sign in once it is live again.' : ''}`}
                  </span>
                </div>
              </section>
            ) : null}

            {dep ? (
              <section className={m.region} aria-label="Money" data-testid="start-sheet-money">
                <span className={m.label}>Money</span>
                {dep.mode === 'awaiting' ? <p className={m.line}>{`The ${dep.stage} invoice waits for an Owner or an Admin to approve it.`}</p> : (
                  <div className={m.tick}>
                    <Checkbox isSelected={deposit} onChange={setDeposit} data-testid="start-sheet-deposit">{`${dep.mode === 'send' ? 'Send' : 'Submit'} the ${dep.stage} invoice${dep.mode === 'submit' ? ' for approval' : ''} · ${money2(dep.amountMinor)}`}</Checkbox>
                    <span className={m.help}>{dep.mode === 'submit' ? 'An Owner or an Admin sends it.' : `${Number.isInteger(dep.pct) ? dep.pct : dep.pct.toFixed(1)}% · due on signing · ${dep.due}`}</span>
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

/** (REG-708) The Start sheet's ghost — its regions as bones: the date, the picker beside its preview (folded on a phone), the two ticks. */
function StartGhost({ phone }: { phone: boolean }) {
  return (
    <div className={m.ghost} aria-hidden data-testid="start-sheet-ghost">
      <div className={m.ghostRegion}><Line w={48} lh={16} h={10} /><div className={m.when}><Slot kind="field" w={280} /><Line w={220} lh={20} h={12} /></div></div>
      <div className={m.ghostRegion}><Line w={96} lh={16} h={10} />
        {phone ? <><Slot kind="field" w="100%" /><Bone w="100%" h={44} r="var(--om-radius-2)" /></> : (
          <div className={m.split}>
            <div className={m.pick}>{[0, 1, 2, 3].map((i) => <Bone key={i} w="100%" h={64} r="var(--om-radius-2)" />)}</div>
            <div className={m.preview}>{[150, 120, 170, 140, 110].map((w, i) => <Line key={i} w={w} lh={22} h={10} />)}</div>
          </div>
        )}
      </div>
      <div className={m.ghostRegion}><Line w={96} lh={16} h={10} /><span className={m.ghostTick}><Slot kind="check" /><Line w={200} lh={20} h={12} /></span></div>
      <div className={m.ghostRegion}><Line w={48} lh={16} h={10} /><span className={m.ghostTick}><Slot kind="check" /><Line w={260} lh={20} h={12} /></span></div>
    </div>
  )
}

/** Getting started › Contract value: the value agreed outside a system quote. */
export function ProjectValueDialog({ open, value, onClose, onSave }: { open: boolean; value: number | null; onClose: () => void; onSave: (v: string) => Promise<boolean> }) {
  const [v, setV] = useState('')
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setV(value ? (value / 100).toFixed(2) : ''); setBusy(false); setTried(false) } }
  const ref = useFocusOnOpen(open)
  const error = tried && !(Number(v.replace(/,/g, '')) > 0) ? MSG.amount : undefined
  const save = async () => { setTried(true); if (!(Number(v.replace(/,/g, '')) > 0) || busy) return; setBusy(true); const ok = await onSave(v); setBusy(false); if (ok) onClose() }
  return (
    <Dialog open={open} onClose={onClose} title="Contract value" width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className={styles.fields}>
        <p className={styles.help}>The value you agreed with the client, GST included. A signed quote on the project takes its place.</p>
        <TextField label="Agreed value (S$)" required numeric="money" value={v} onChange={setV} error={error} inputRef={ref} trailingIcon={null} />
      </div>
    </Dialog>
  )
}

/* ── (parity map, PR-058 — his "build everything that's in 1.0" 2026-10-10; 1.0's CloneProjectDialog) Duplicate project ─────────────────── */

type DupFor = 'same' | 'lead' | 'new'
/**
 * Duplicate project — the house Dialog (600, a sheet on a phone): who the new project is for (the same client · another client · a new client:
 * their name and mobile), ☑ Copy the schedule (re-dated from the day works start, which you pick) and ☑ Copy the signed quote as a new draft —
 * each offered only when there is one to copy. It lands on the new project, Setting up, with "Project P-… created" and Undo. Loads its facts on
 * open (`readDuplicateProject`); closes only once the copy is made. INVENTED COPY: the dialog's words (1.0's dialog was never reachable).
 */
export function DuplicateProjectDialog({ open, projectId, onClose }: { open: boolean; projectId: string | null; onClose: () => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const sheet = useSheetLayout()
  const [data, setData] = useState<DuplicateRead | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [who, setWho] = useState<DupFor>('same')
  const [leadLabel, setLeadLabel] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [copySchedule, setCopySchedule] = useState(true)
  const [start, setStart] = useState('')
  const [copyQuote, setCopyQuote] = useState(true)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setData(null); setFailed(null); setWho('same'); setLeadLabel(''); setName(''); setPhone(''); setCopySchedule(true); setStart(''); setCopyQuote(true); setTried(false); setBusy(false) } }
  useEffect(() => {
    if (!open || !projectId) return
    let live = true
    void readDuplicateProject(projectId).then((r) => {
      if (!live) return
      if ('error' in r) { setFailed(r.error); return }
      setData(r); setStart(inputDate(new Date(`${r.today}T00:00:00`)))
    }, () => { if (live) setFailed('') })
    return () => { live = false }
  }, [open, projectId, tick])
  const today = data ? new Date(`${data.today}T00:00:00`) : new Date(0)
  const picked = data?.leads.find((l) => l.label === leadLabel) ?? null
  const startDay = start ? parseInputDate(start) : null
  const errors = {
    lead: who === 'lead' && !picked ? MSG.choose : undefined,
    name: who === 'new' && !name.trim() ? MSG.required : undefined,
    phone: who === 'new' ? (!phone ? MSG.required : !isSgPhone(phone) ? MSG.phone : undefined) : undefined,   // (REG-547) every phone box
    start: data?.milestones && copySchedule ? (!start ? MSG.required : !startDay ? MSG.date : undefined) : undefined,
  }
  const bad = !!(errors.lead || errors.name || errors.phone || errors.start)
  const save = async () => {
    setTried(true)
    if (!data || !projectId || bad || busy) return
    setBusy(true)
    let made: { id: string; number: string; undo: DuplicateUndo } | null = null
    const ok = await run('duplicate the project', async () => {
      const r = await duplicateProject(projectId, {
        client: who, leadId: picked?.id ?? null, name: name.trim(), phone,
        schedule: !!data.milestones && copySchedule, start: startDay ? `${startDay.getFullYear()}-${String(startDay.getMonth() + 1).padStart(2, '0')}-${String(startDay.getDate()).padStart(2, '0')}` : null,
        quote: !!data.quote && copyQuote,
      })
      if ('error' in r) return r
      made = r
    })
    setBusy(false)
    const m = made as { id: string; number: string; undo: DuplicateUndo } | null
    if (!ok || !m) return
    onClose()
    /* (REG-465) the new project's Back returns to the one it was duplicated from (or the list it was opened from) */
    router.push(withFrom(`/projects/${m.id}`, `${window.location.pathname}${window.location.search}`))
    /* the same layout's snackbar host — the sentence and its Undo stay while the new project opens */
    snackbar({ key: 'project-duplicated', message: `Project ${m.number} created`, actionLabel: 'Undo', onAction: () => {
      void run('undo the duplicate', async () => {
        const r = await undoDuplicateProject(m.undo)
        if ('error' in r) return r
        router.push(r.sourceId ? `/projects/${r.sourceId}` : '/projects')
        snackbar({ key: 'project-duplicated', message: `${m.number} removed — nothing else changed` })
      })
    } })
  }
  const first = data?.client.split(/\s+/)[0] ?? ''
  const forOptions = [{ value: 'same', label: data ? `${first}, again` : 'The same client' }, { value: 'lead', label: 'Another client' }, { value: 'new', label: 'A new client' }]
  return (
    <Dialog open={open} onClose={onClose} title="Duplicate project" subtitle={data ? `${data.name} · ${data.number}` : undefined} width={600} size="form" closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
                     <Button onPress={() => { void save() }} isDisabled={busy || !data} data-testid="duplicate-save">{busy ? 'Duplicating…' : 'Duplicate'}</Button></>}>
      {failed !== null ? (
        <p className={styles.help} role="status">{failed || 'Couldn’t load the project'} — <button type="button" className={m.inline} onClick={() => { setFailed(null); setTick((t) => t + 1) }}>try again</button></p>
      ) : !data ? (
        <div className={m.sheet} aria-hidden data-testid="duplicate-ghost"><Line w="70%" lh={20} h={12} /><Slot kind="chip" w={sheet ? 280 : 360} /><Slot kind="field" w="100%" /><Slot kind="check" /><Slot kind="check" /></div>
      ) : (
        <div className={m.sheet} data-testid="duplicate-dialog">
          <section className={m.region} aria-label="Who it is for">
            <span className={m.label}>Who is it for?</span>
            <Chips label="Who is it for?" options={forOptions} value={who} onChange={(v) => { setWho(v as DupFor); setTried(false) }} testId="duplicate-for" />
            {who === 'same' ? <p className={m.line}>{`A new project for ${data.client} — their details are copied onto it.`}</p> : null}
            {who === 'lead' ? (
              <TextField label="Client" required mode="select" searchable value={leadLabel} options={data.leads.map((l) => l.label)} onChange={setLeadLabel} placeholder="Choose a client"
                         error={tried ? errors.lead : undefined} helper="Their details are copied onto the new project" name="duplicate-lead" />
            ) : null}
            {who === 'new' ? (
              <div className={styles.row}>
                <TextField label="Client’s name" required value={name} onChange={setName} maxLength={80} error={tried ? errors.name : undefined} name="duplicate-name" trailingIcon={null} />
                <PhoneField label="Client’s phone number" value={phone} onChange={setPhone} error={tried ? errors.phone : undefined} />
              </div>
            ) : null}
          </section>
          {data.milestones || data.quote ? (
            <section className={m.region} aria-label="What it copies">
              <span className={m.label}>What it copies</span>
              {data.milestones ? (
                <div className={m.tick}>
                  <Checkbox isSelected={copySchedule} onChange={setCopySchedule} data-testid="duplicate-schedule">Copy the schedule</Checkbox>
                  <span className={m.help}>{`${plural(data.milestones, 'milestone')}, every one Not started — moved so the first starts on the day works start.`}</span>
                  {copySchedule ? <div className={m.well}><div className={m.date}><DateField label="Works start" required value={start} onChange={setStart} today={today} error={tried ? errors.start : undefined} name="duplicate-start" /></div></div> : null}
                </div>
              ) : null}
              {data.quote ? (
                <div className={m.tick}>
                  <Checkbox isSelected={copyQuote} onChange={setCopyQuote} data-testid="duplicate-quote">Copy the signed quote as a new draft</Checkbox>
                  <span className={m.help}>{`${data.quote.number}’s lines and payment schedule, as a draft on the new project — revise it, then send it.`}</span>
                </div>
              ) : null}
            </section>
          ) : null}
          <p className={m.line}>It starts Setting up, with the same project type, rooms, members and payment split. Its tasks, files, updates and the money recorded stay with {data.number}.</p>
        </div>
      )}
    </Dialog>
  )
}
