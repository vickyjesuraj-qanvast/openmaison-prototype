'use client'

import { useRef, useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetLayout } from '@/components/om/sheet'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { displayDate, inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { DESCRIPTION_MAX, NOTE_MAX, RECEIPTS_MAX, gstInside, type ExpenseRecord, type VendorRecord } from '@/lib/finance/model'
import type { ExpenseSeries } from '@/lib/finance/costs'
import { REPEAT_OPTIONS, firstRepeat, isRepeatEvery, repeatAfter, repeatWords, type RepeatEvery } from '@/lib/finance/repeats'
import type { CostPerson, CostProject } from '@/lib/finance/queries'
import type { ExpenseInput } from '@/app/finance/cost-actions'
import type { EntityOption } from '@/lib/finance/entity-scope'
import { readDoc, type PickedFile } from './pick-doc'
import money from '@/components/projects/money/money.module.css'
import own from '@/components/projects/money/invoice-dialogs.module.css'
import fin from './finance.module.css'

/*
 * (gaps build F1 — F1-Q11) Log an expense — a project's cost or the studio's overhead: what was paid (GST inside or not), the day, the
 * category, what it was for, who paid (the studio, or a member who claims it back — an Owner or an Admin may log a claim for someone else), a
 * vendor if there is one, up to five receipts (*Take a photo* on a phone), a note. A Designer's or a Manager's waits for approval while the
 * studio's rule is on — the button says so. The house Dialog and fields; the host saves and closes it once the save lands.
 */
const OVERHEAD = 'Studio overhead — not a project'
const toMinor = (v: string) => (v.trim() === '' ? NaN : Math.round(Number(v.replace(/,/g, '')) * 100))

export function ExpenseDialog({ open, initial, fixedProject, projects, vendors, people, viewer, waits, gstRate, busy, onClose, onSave, entities = [], categories }: {
  open: boolean
  /** (pending modules S06) an expense of a repeat carries its series — the Repeats field edits the series' rule */
  initial: (ExpenseRecord & { series?: ExpenseSeries | null }) | null
  fixedProject: CostProject | null
  /** the projects this viewer logs on (Finance) */ projects: CostProject[]
  vendors: VendorRecord[]
  people: CostPerson[]
  viewer: { id: string; runs: boolean }
  /** whether this viewer's expense waits for approval */ waits: boolean
  gstRate: number
  busy: boolean
  onClose: () => void
  onSave: (i: ExpenseInput) => void
  /** (parity map, MO-058) the studio's issuing entities — "Issued by" shows only with two or more */ entities?: EntityOption[]
  /** (pending modules S06) the studio's expense categories, in its order (Settings › Finance › Money out) */ categories: readonly string[]
}) {
  const snackbar = useSnackbar()
  const phone = useSheetLayout()
  const camera = useRef<HTMLInputElement>(null)
  const [today] = useState(() => new Date())
  const fresh = () => ({
    projectId: initial ? initial.projectId : fixedProject?.id ?? null as string | null, isOverhead: !!initial && !initial.projectId,
    amount: initial ? (initial.amountMinor / 100).toFixed(2) : '', gst: initial ? initial.gstMinor > 0 : gstRate > 0, day: initial ? inputDate(new Date(initial.spentOn)) : inputDate(today),
    category: initial?.category ?? '', description: initial?.description ?? '', paidBy: (initial?.paidBy ?? 'studio') as 'studio' | 'member', claimantId: initial?.claimantId ?? viewer.id,
    vendorId: initial?.vendorId ?? null as string | null, note: initial?.note ?? '',
    keep: initial?.receipts.map((r) => r.id) ?? [] as string[], add: [] as PickedFile[],
    /* (MO-058) its own entity; '' = the project's (or the studio's own) until one is picked */
    entity: initial?.issuingEntity ?? '',
    /* (pending modules S06) the series' rhythm while it repeats ('none' = once, or stopped) */
    repeat: (initial?.series?.live && isRepeatEvery(initial.series.every) ? initial.series.every : 'none') as RepeatEvery | 'none',
  })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [reading, setReading] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  const amount = toMinor(f.amount)
  const count = f.keep.length + f.add.length
  const pickMany = async (files: File[]) => {
    const room = RECEIPTS_MAX - count
    if (room <= 0) { snackbar({ message: `Up to ${RECEIPTS_MAX} receipts on one expense` }); return }
    setReading(true)
    try {
      const got: PickedFile[] = []
      for (const file of files.slice(0, room)) { const r = await readDoc(file); if ('why' in r) snackbar({ message: r.why }); else got.push(r.doc) }
      if (files.length > room) snackbar({ message: `Up to ${RECEIPTS_MAX} receipts — the first ${room} were added` })
      setF((x) => ({ ...x, add: [...x.add, ...got] }))
    } finally { setReading(false) }
  }
  const projectOptions = [...projects.map((p) => `${p.number} · ${p.name}`), OVERHEAD]
  const projectLabel = f.isOverhead ? OVERHEAD : f.projectId ? (() => { const p = projects.find((x) => x.id === f.projectId) ?? (fixedProject?.id === f.projectId ? fixedProject : null); return p ? `${p.number} · ${p.name}` : '' })() : ''
  const live = vendors.filter((v) => (v.isActive && !v.mergedInto) || v.id === f.vendorId)
  const NONE = 'None'
  const members = people.filter((p) => p.active || p.id === f.claimantId)
  const why = {
    project: !fixedProject && !initial && !f.projectId && !f.isOverhead ? 'Pick the project, or the studio’s overhead' : undefined,
    amount: !Number.isFinite(amount) || amount <= 0 ? 'Enter what was paid' : undefined,
    day: !parseInputDate(f.day) ? 'Pick the day it was paid' : undefined,
    category: !f.category ? 'Pick a category' : undefined,
    description: !f.description.trim() ? 'Say what it was for' : undefined,
  }
  /* (parity map, MO-058 — 1.0's entity picker on Record Expense) Issued by, only with two or more entities: the project's to start (the studio's
     own for the overhead); a retired one only when the expense already names it */
  const projectOf = (id: string | null) => (id ? projects.find((x) => x.id === id) ?? (fixedProject?.id === id ? fixedProject : null) : null)
  const defaultEntity = (() => { const p = f.isOverhead ? null : projectOf(fixedProject?.id ?? f.projectId); return entities.find((e) => e.label === p?.entity)?.label ?? entities.find((e) => e.first)?.label ?? '' })()
  const entityShown = f.entity || defaultEntity
  const entityOptions = entities.filter((e) => !e.retired || e.label === initial?.issuingEntity).map((e) => e.label)
  const issuedBy = entities.length >= 2 ? (
    <TextField label="Issued by" mode="select" options={entityOptions} value={entityShown} onChange={(v) => set({ entity: v })}
               helper={f.entity && f.entity !== defaultEntity ? 'Recorded under this entity, not the project’s' : f.isOverhead ? 'The studio’s own, to start' : 'The project’s entity, to start'} />
  ) : null
  /* (S42 audit C-08) a completed project's money is closed — an expense on it is logged once (its repeat would stop on its first day): Repeats
     is offered only where it can run, or to stop a series that still does */
  const closedProject = !f.isOverhead && projectOf(fixedProject?.id ?? f.projectId)?.stage === 'completed'
  const repeatsHere = !closedProject || !!initial?.series?.live
  const save = () => {
    setTried(true)
    if (Object.values(why).some(Boolean)) return
    onSave({
      ...(entities.length >= 2 ? { issuingEntity: f.entity && f.entity !== defaultEntity ? f.entity : f.entity ? null : initial?.issuingEntity ?? null } : {}),
      id: initial?.id ?? null, projectId: fixedProject?.id ?? (f.isOverhead ? null : f.projectId), vendorId: f.vendorId, category: f.category, description: f.description, amountMinor: amount,
      includesGst: f.gst && gstRate > 0, spentOn: parseInputDate(f.day)!.getTime(), paidBy: f.paidBy, claimantId: f.paidBy === 'member' ? f.claimantId : null, note: f.note,
      keep: f.keep, add: f.add.map((d) => ({ name: d.name, dataUrl: d.dataUrl, thumb: d.thumb })),
      /* (pending modules S06) the series' rhythm — sent only when it changed (or on a new one), so an edit never moves another's repeat */
      ...(!initial ? { repeat: f.repeat === 'none' || !repeatsHere ? null : f.repeat } : f.repeat !== fresh().repeat ? { repeat: f.repeat === 'none' ? null : f.repeat } : {}),
    })
  }
  /* (simplify S-14, his "build everything" 2026-10-09) On a phone the claim starts from the thing in your hand: the dialog opens on *Take a
     photo of the receipt*, then the amount, the project and what it was for (F1 J10 — the receipt was the last field). At a desk the order
     is as it was, the receipts at the end. */
  const project = !fixedProject && !initial ? (
    <TextField label="Project" mode="select" searchable required options={projectOptions} value={projectLabel}
               onChange={(v) => { if (v === OVERHEAD) set({ projectId: null, isOverhead: true }); else { const p = projects.find((x) => `${x.number} · ${x.name}` === v); if (p) set({ projectId: p.id, isOverhead: false }) } }}
               error={tried ? why.project : undefined} helper="A project’s cost, or the studio’s own" />
  ) : null
  const amountDay = (
    <div className={money.pairs}>
      <TextField label="Amount paid (S$)" value={f.amount} numeric="money" onChange={(v) => set({ amount: v })} required autoFocus={!initial && !phone} error={tried ? why.amount : undefined}
                 helper={f.gst && gstRate > 0 && Number.isFinite(amount) && amount > 0 ? `Includes ${money2(gstInside(amount, gstRate))} GST` : 'What the receipt says, all in'} />
      <DateField label="Paid on" value={f.day} onChange={(v) => set({ day: v })} today={today} max={today} required error={tried ? why.day : undefined} />
    </div>
  )
  const gstSwitch = gstRate > 0 ? <label className={own.switchRow}><Switch size="sm" isSelected={f.gst} onChange={(v: boolean) => set({ gst: v })} aria-label={`Includes GST (${gstRate}%)`} /><span>Includes GST ({gstRate}%)</span></label> : null
  /* (pending modules S06) the studio's own categories; one removed since this expense was logged stays offered on it */
  const categoryOptions = initial?.category && !categories.some((c) => c.toLowerCase() === initial.category.toLowerCase()) ? [...categories, initial.category] : [...categories]
  const catVendor = (
    <div className={money.pairs}>
      <TextField label="Category" mode="select" options={categoryOptions} value={f.category} onChange={(v) => set({ category: v })} required error={tried ? why.category : undefined} />
      <TextField label="Vendor (optional)" mode="select" searchable options={[NONE, ...live.map((v) => v.name)]} value={live.find((v) => v.id === f.vendorId)?.name ?? ''} onChange={(v) => set({ vendorId: live.find((x) => x.name === v)?.id ?? null })} />
    </div>
  )
  /* (pending modules S06 — 1.0's "Recurring expense", made to work) Repeats: the next one is logged by rule on its day — said under the field */
  const startDay = parseInputDate(f.day)?.getTime() ?? null
  const series = initial?.series ?? null
  const editingRoot = !!series && initial?.id === series.rootId
  const repeatHelp = (() => {
    if (f.repeat === 'none') return series?.live ? 'Its repeat stops — what was logged stays' : 'Rent, software, a retainer — pick how often and the next one is logged for you'
    /* the next day, as the server works it out: unchanged → the series' own; else from the first expense's day, after today and after what is logged */
    const sameDay = !editingRoot || startDay === initial?.spentOn
    const anchor = series ? (editingRoot ? startDay : series.members[0]?.spentOn ?? null) : startDay
    const next = series?.live && series.every === f.repeat && series.next && sameDay ? series.next
      : anchor === null ? null : series ? repeatAfter(anchor, f.repeat, Math.max(today.getTime(), anchor, ...series.members.map((m) => m.spentOn))) : firstRepeat(anchor, f.repeat, today.getTime())
    /* (pending modules S06) invented copy */
    if (series && series.members.length > 1) return next ? `For the whole repeat — next on ${displayDate(new Date(next))}, then ${repeatWords(f.repeat)}` : `For the whole repeat — ${repeatWords(f.repeat)}`
    return next ? `Next on ${displayDate(new Date(next))}, then ${repeatWords(f.repeat)} — the same amount, category and vendor` : repeatWords(f.repeat).replace(/^./, (c) => c.toUpperCase())
  })()
  const repeats = repeatsHere ? (
    <TextField label="Repeats" mode="select" options={REPEAT_OPTIONS.map((o) => o.label)} value={REPEAT_OPTIONS.find((o) => o.value === f.repeat)?.label ?? REPEAT_OPTIONS[0]!.label}
               onChange={(v) => set({ repeat: (REPEAT_OPTIONS.find((o) => o.label === v)?.value ?? 'none') as RepeatEvery | 'none' })} helper={repeatHelp} />
  ) : null
  const whatFor = <TextField label="What it was for" value={f.description} onChange={(v) => set({ description: v })} maxLength={DESCRIPTION_MAX} required error={tried ? why.description : undefined} helper="“Floor protection boards for the hacking”" />
  const whoPaid = (
    <div>
      <span className={money.fieldLabel}>Who paid</span>
      <Chips label="Who paid" options={[{ value: 'studio', label: 'The studio' }, { value: 'member', label: viewer.runs ? 'A member — claim it back' : 'I paid — claim it back' }]} value={f.paidBy} onChange={(v) => set({ paidBy: v as 'studio' | 'member' })} testId="expense-paid-by" />
      {f.paidBy === 'member' && viewer.runs ? (
        <div className={own.under}><TextField label="Paid by" mode="select" options={members.map((m) => m.name)} value={members.find((m) => m.id === f.claimantId)?.name ?? ''} onChange={(v) => set({ claimantId: members.find((m) => m.name === v)?.id ?? viewer.id })} helper="They are paid back once it is approved" /></div>
      ) : f.paidBy === 'member' ? <span className={`${money.sub} ${fin.below}`}>You are paid back once it is approved.</span> : null}
    </div>
  )
  const thumbs = count ? (
    <div className={fin.docs} data-testid="expense-receipts">
      {(initial?.receipts ?? []).filter((r) => f.keep.includes(r.id)).map((r) => (
        <div key={r.id} className={fin.doc}>
          <span className={fin.docThumb} style={r.image ? { backgroundImage: `url(/finance/doc/${r.id})` } : undefined}>{r.image ? null : <Icon name="picture_as_pdf" size={32} weight={300} />}
            <span className={fin.docRemove}><Tooltip label="Remove"><IconButton icon="close" label={`Remove ${r.name}`} size={24} onClick={() => set({ keep: f.keep.filter((k) => k !== r.id) })} /></Tooltip></span></span>
          <span className={fin.docName}>{r.name}</span>
        </div>
      ))}
      {f.add.map((d, i) => (
        <div key={`${d.name}-${i}`} className={fin.doc}>
          <span className={fin.docThumb} style={d.thumb ? { backgroundImage: `url(${d.thumb})` } : undefined}>{d.thumb ? null : <Icon name="picture_as_pdf" size={32} weight={300} />}
            <span className={fin.docRemove}><Tooltip label="Remove"><IconButton icon="close" label={`Remove ${d.name}`} size={24} onClick={() => set({ add: f.add.filter((_, k) => k !== i) })} /></Tooltip></span></span>
          <span className={fin.docName}>{d.name}</span>
        </div>
      ))}
    </div>
  ) : null
  const cameraInput = <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void pickMany([file]) }} />
  const receipts = phone ? (
    <div>
      {count < RECEIPTS_MAX ? (
        <>
          {cameraInput}
          <Button variant="primary" appearance="outlined" iconStart={<Icon name="photo_camera" size={20} />} onPress={() => camera.current?.click()} isDisabled={reading} data-testid="expense-camera">
            {reading ? 'Reading…' : count ? 'Take another photo' : 'Take a photo of the receipt'}
          </Button>
        </>
      ) : null}
      {thumbs ? <div className={fin.gapTop}>{thumbs}</div> : null}
      {count < RECEIPTS_MAX ? (
        <div className={fin.gapTop}>
          <Dropzone variant="compact" title={<>Or pick a receipt — <b>browse</b> ({count}/{RECEIPTS_MAX})</>} accept="application/pdf,image/jpeg,image/png,image/webp" label="Add receipts" uploading={reading}
                    onPick={(file) => { if (file) void pickMany([file]) }} onPickMany={(files) => { void pickMany(files) }} />
        </div>
      ) : null}
    </div>
  ) : (
    <div>
      <span className={money.fieldLabel}>Receipts ({count}/{RECEIPTS_MAX})</span>
      {thumbs}
      {count < RECEIPTS_MAX ? (
        <div className={count ? fin.gapTop : undefined}>
          <Dropzone variant="compact" title={reading ? 'Reading…' : <>Drop receipts here or <b>browse</b></>} accept="application/pdf,image/jpeg,image/png,image/webp" label="Add receipts" uploading={reading}
                    onPick={(file) => { if (file) void pickMany([file]) }} onPickMany={(files) => { void pickMany(files) }} />
        </div>
      ) : null}
    </div>
  )
  const saveLabel = busy ? 'Saving…' : initial ? (waits && initial.status !== 'approved' ? 'Save and send for approval' : 'Save') : waits ? 'Log and send for approval' : 'Log expense'
  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Edit expense' : 'Log an expense'} size="form" width={600} closeOnScrim={false}
            subtitle={initial?.status === 'sent_back' && initial.reviewNote ? `Sent back: “${initial.reviewNote}”` : waits ? 'An Owner or an Admin approves it before it counts.' : undefined}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy || reading} data-testid="expense-save">{saveLabel}</Button></>}>
      <div className={money.fields} data-testid="expense-dialog">
        {phone ? <>{receipts}{amountDay}{project}{whatFor}{gstSwitch}{catVendor}{whoPaid}{repeats}{issuedBy}</> : <>{project}{amountDay}{gstSwitch}{catVendor}{whatFor}{whoPaid}{repeats}{issuedBy}{receipts}</>}
        <TextField label="Note (optional)" value={f.note} onChange={(v) => set({ note: v })} maxLength={NOTE_MAX} multiline={2} />
      </div>
    </Dialog>
  )
}
