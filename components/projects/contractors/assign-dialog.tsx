'use client'

import { useMemo, useState } from 'react'
import { Button, Link } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { Chips } from '@/components/om/chips'
import { ChoiceCard } from '@/components/om/choice-card'
import { MetaChip } from '@/components/om/meta-chip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { VendorDialog } from '@/components/finance/vendor-dialog'
import { createVendor, type VendorInput } from '@/app/finance/vendor-actions'
import { assignContractor, updateCrew } from '@/app/projects/contractor-actions'
import { inputDate, parseInputDate } from '@/lib/format'
import { dateOfDay, dayOf, rangeLabel } from '@/lib/projects/schedule-model'
import type { CrewBoardData } from '@/lib/projects/contractors'
import {
  CREW_NOTE_MAX, CREW_TONE, LOOK_AHEAD_DAYS, availabilityOver, doesTrade, jobOf, sameTrade, shortVendor, siteRuns, staffedTrades, tradesLine, tradesOfTitle, unstaffedOf,
  type Contractor, type CrewJob, type CrewStatus,
} from '@/lib/projects/contractors-model'
import styles from './crew.module.css'

/** Where the dialog starts: a project (or none — a contractor put on a site from the Workload view picks it), a milestone, a trade, a
    contractor; `edit` = a crew row whose milestone, dates and note change. */
export type AssignTarget = { projectId?: string | null; milestoneId?: string | null; trade?: string | null; vendorId?: string | null; edit?: CrewJob | null }

const OWN = 'Its own dates'
const toInput = (n: number | null) => (n === null ? '' : inputDate(dateOfDay(n)))
const fromInput = (s: string): number | null => { const d = parseInputDate(s); return d ? dayOf(d) : null }
const uniq = (xs: string[]) => xs.filter((t, i) => t && xs.findIndex((x) => sameTrade(x, t)) === i)

/**
 * (S45B · H-UHD-2 — 1.0's "Assign {trade}" dialog and the dashboard's "Assign →", in 2.0's shape) Put a contractor on a project: the trade,
 * the contractor — the ones who do it, each with how they stand over the window (free · room · full, and where), the free first — then what
 * they work on: one of the project's milestones (its dates are theirs and follow the schedule) or dates of their own, and whether they are
 * planned or on site already. A contractor not in Finance › Vendors yet is added in place (anyone may add a vendor, F1-Q4). The house Dialog
 * (a sheet on a phone); it closes only once the save lands; the host says the sentence with its Undo. INVENTED COPY (REG-S45B).
 */
export function AssignDialog({ target, board, nested = false, onClose, onDone }: {
  target: AssignTarget | null
  board: CrewBoardData
  nested?: boolean
  onClose: () => void
  onDone: (sentence: string, eventId: string | null) => void
}) {
  const snackbar = useSnackbar()
  const today = dayOf(new Date(board.now))
  const todayDate = useMemo(() => dateOfDay(today), [today])
  const sitesById = useMemo(() => new Map(board.sites.map((s) => [s.id, s])), [board.sites])
  const jobs = useMemo(() => board.crew.map((r) => jobOf(r, sitesById, today)), [board.crew, sitesById, today])
  const edit = target?.edit ?? null
  const open = !!target

  const [added, setAdded] = useState<Contractor[]>([])
  const roster = useMemo(() => [...board.contractors, ...added].filter((c) => c.isActive), [board.contractors, added])
  const staffed = useMemo(() => staffedTrades(roster, board.trades), [roster, board.trades])
  /* the projects a contractor can be put on from here: running, seen, theirs to change */
  const places = useMemo(() => board.sites.filter((s) => s.mayAssign && siteRuns(s)), [board.sites])
  const gaps = useMemo(() => unstaffedOf(board.sites, jobs, staffed, today), [board.sites, jobs, staffed, today])

  const fresh = () => {
    const vendor = target?.vendorId ? roster.find((c) => c.id === target.vendorId) ?? null : null
    const projectId = edit?.projectId ?? target?.projectId ?? (vendor ? gaps.find((g) => g.site.mayAssign && doesTrade(vendor, g.trade))?.site.id ?? null : null)
    const site = projectId ? sitesById.get(projectId) ?? null : null
    const gap = vendor && site ? gaps.find((g) => g.site.id === site.id && doesTrade(vendor, g.trade)) ?? null : null
    const ms = edit?.milestoneId ?? target?.milestoneId ?? gap?.milestone.id ?? null
    const m = site && ms ? site.milestones.find((x) => x.id === ms) ?? null : null
    const trade = edit?.trade ?? target?.trade ?? gap?.trade ?? (m ? tradesOfTitle(m.title, staffed)[0] : null) ?? vendor?.trades[0] ?? ''
    const auto = !m && site && trade ? site.milestones.find((x) => x.status !== 'done' && tradesOfTitle(x.title, [trade]).length) ?? null : null
    const pick = m ?? auto
    return {
      projectId: projectId ?? '', trade, vendorId: edit?.vendorId ?? vendor?.id ?? '',
      worksOn: edit ? (edit.milestoneId && edit.milestone ? edit.milestoneId : 'own') : pick ? pick.id : site ? (site.milestones.some((x) => x.status !== 'done') ? '' : 'own') : '',
      start: toInput(edit && !edit.milestoneId ? edit.ownStart : null), end: toInput(edit && !edit.milestoneId ? edit.ownEnd : null),
      status: 'planned' as CrewStatus, note: edit?.note ?? '',
    }
  }
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const [was, setWas] = useState<AssignTarget | null>(null)
  if (target !== was) { setWas(target); if (target) { setF(fresh()); setTried(false); setBusy(false) } }
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))

  const site = f.projectId ? sitesById.get(f.projectId) ?? null : null
  const milestones = site?.milestones ?? []
  const label = (m: { title: string; start: number; end: number; status: string }) => `${m.title} · ${rangeLabel(m.start, m.end)}${m.status === 'done' ? ' · done' : ''}`
  const msOptions = [...milestones.filter((m) => m.status !== 'done' || m.id === f.worksOn).map(label), OWN]
  const chosenM = f.worksOn && f.worksOn !== 'own' ? milestones.find((m) => m.id === f.worksOn) ?? null : null
  const ownStart = fromInput(f.start), ownEnd = fromInput(f.end)
  const win = chosenM ? { from: chosenM.start, to: chosenM.end } : f.worksOn === 'own' && ownStart !== null && ownEnd !== null && ownEnd >= ownStart ? { from: ownStart, to: ownEnd } : { from: today, to: today + LOOK_AHEAD_DAYS - 1 }
  const suggested = chosenM ? tradesOfTitle(chosenM.title, uniq([...staffed, ...board.trades])) : []
  const tradeOptions = uniq([...suggested, ...staffed, ...board.trades, ...(f.trade ? [f.trade] : [])])
  const rank = { free: 0, room: 1, full: 2, over: 3 } as const
  const who = f.trade ? roster.filter((c) => doesTrade(c, f.trade))
    .map((c) => ({ c, a: availabilityOver(c, jobs, win.from, win.to, edit?.id) }))
    .sort((x, y) => rank[x.a.state] - rank[y.a.state] || x.c.name.localeCompare(y.c.name)) : []
  const chosen = roster.find((c) => c.id === f.vendorId) ?? null
  const placeOptions = places.map((s) => s.name)

  const projectWhy = !f.projectId ? 'Pick the project' : undefined
  const tradeWhy = !f.trade ? 'Pick the trade they are there for' : undefined
  const vendorWhy = !f.vendorId || (chosen && f.trade && !doesTrade(chosen, f.trade)) ? 'Pick a contractor' : undefined
  const worksWhy = !f.worksOn ? 'Pick a milestone, or its own dates' : undefined
  const startWhy = f.worksOn === 'own' && ownStart === null ? 'Choose the day they start' : undefined
  const endWhy = f.worksOn === 'own' ? (ownEnd === null ? 'Choose the day they finish' : ownStart !== null && ownEnd < ownStart ? 'The last day can’t be before the first' : undefined) : undefined
  const bad = edit ? !!(worksWhy || startWhy || endWhy) : !!(projectWhy || tradeWhy || vendorWhy || worksWhy || startWhy || endWhy)

  const save = async () => {
    setTried(true)
    if (bad || busy) return
    setBusy(true)
    try {
      const own = f.worksOn === 'own'
      const r = edit
        ? await updateCrew(edit.id, { milestoneId: own ? null : f.worksOn, startDay: own ? ownStart : null, endDay: own ? ownEnd : null, note: f.note })
        : await assignContractor({ projectId: f.projectId, vendorId: f.vendorId, trade: f.trade, milestoneId: own ? null : f.worksOn, startDay: own ? ownStart : null, endDay: own ? ownEnd : null, status: f.status, note: f.note })
      if ('error' in r) { snackbar({ message: couldnt(edit ? 'save the contractor' : 'add the contractor', refusalOf(r.error)) }); return }
      onDone(r.sentence, r.eventId)
    } catch (e) { snackbar({ message: couldnt(edit ? 'save the contractor' : 'add the contractor', refusalOf(e)) }) } finally { setBusy(false) }
  }
  /* a contractor not in Finance › Vendors yet: added there in place, as a contractor of this trade, and picked */
  const addVendor = async (i: VendorInput) => {
    setAddBusy(true)
    try {
      const r = await createVendor(i)
      if ('error' in r) { snackbar({ message: couldnt('add the contractor', refusalOf(r.error)) }); return }
      const v = r.vendor
      setAdded((a) => [...a, { id: v.id, name: v.name, trades: v.contractor?.trades ?? [f.trade], capacity: v.contractor?.capacity ?? 1, code: v.contractor?.code ?? null, phone: v.phone, isActive: true }])
      set({ vendorId: v.id })
      setAdding(false)
      snackbar({ message: `${shortVendor(v.name)} is in Finance › Vendors as a ${f.trade} contractor` })
    } catch (e) { snackbar({ message: couldnt('add the contractor', refusalOf(e)) }) } finally { setAddBusy(false) }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} title={edit ? `Edit ${shortVendor(edit.vendorName)}` : 'Add a contractor'} size="form" width={600} nested={nested} portal={nested} closeOnScrim={false}
              subtitle={site ? site.name : undefined}
              footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="crew-save">{busy ? 'Saving…' : edit ? 'Save' : 'Add contractor'}</Button></>}>
        <div className={styles.fields} data-testid="crew-dialog">
          {edit ? (
            <div className={styles.fixed}>
              <span className={styles.fixedName}>{edit.vendorName}</span>
              <span className={styles.line}>{edit.trade}</span>
            </div>
          ) : (
            <>
              {target?.projectId ? null : (
                <TextField label="Project" mode="select" searchable options={placeOptions} value={site?.name ?? ''} required error={tried ? projectWhy : undefined}
                           onChange={(n) => { const s = places.find((x) => x.name === n); if (!s) return; const auto = f.trade ? s.milestones.find((x) => x.status !== 'done' && tradesOfTitle(x.title, [f.trade]).length) : null; set({ projectId: s.id, worksOn: auto ? auto.id : s.milestones.some((x) => x.status !== 'done') ? '' : 'own' }) }}
                           helper={places.length ? 'The running projects you may put contractors on' : 'No running project you may put contractors on'} />
              )}
              <TextField label="Trade" mode="select" searchable options={tradeOptions} value={f.trade} required error={tried ? tradeWhy : undefined}
                         onChange={(t) => set({ trade: t, vendorId: chosen && doesTrade(chosen, t) ? chosen.id : '' })}
                         helper={suggested.length && !suggested.some((t) => sameTrade(t, f.trade)) ? `${chosenM?.title} reads as ${suggested.join(' and ')}` : 'The studio’s trades — Settings › Quotes & pricing'} />
              <div>
                <span className={styles.fieldLabel}>Contractor</span>
                {!f.trade ? <p className={styles.lede}>Pick the trade first — the contractors who do it are listed here.</p> : (
                  <div className={styles.choices} role="radiogroup" aria-label="Contractor" data-testid="crew-choices">
                    {who.map(({ c, a }) => (
                      <ChoiceCard key={c.id} title={c.name} selected={f.vendorId === c.id} onSelect={() => set({ vendorId: c.id })}
                                  help={`${tradesLine(c)} · ${a.words}`} badge={<MetaChip color={CREW_TONE[a.state]}>{a.state === 'free' ? 'Free' : a.state === 'room' ? 'Room' : a.state === 'full' ? 'Full' : 'Over'}</MetaChip>} />
                    ))}
                    {who.length ? null : <p className={styles.lede}>{`No contractor does ${f.trade} yet.`}</p>}
                    <span><Link variant="primary" onPress={() => setAdding(true)} data-testid="crew-add-vendor">{who.length ? `Someone else? Add a ${f.trade} contractor` : `Add a ${f.trade} contractor`}</Link></span>
                  </div>
                )}
                {tried && vendorWhy && f.trade ? <span className={styles.error} role="alert">{vendorWhy}</span> : null}
              </div>
            </>
          )}
          {site || edit ? (
            <TextField label="Works on" mode="select" options={msOptions} value={f.worksOn === 'own' ? OWN : chosenM ? label(chosenM) : ''} required error={tried ? worksWhy : undefined}
                       onChange={(v) => { if (v === OWN) { set({ worksOn: 'own' }); return } const m = milestones.find((x) => label(x) === v); if (m) set({ worksOn: m.id }) }}
                       helper={f.worksOn === 'own' ? 'Dates of their own — for work the schedule doesn’t hold' : chosenM ? 'Their dates are the milestone’s — when it moves, they move with it' : milestones.length ? 'A milestone — their dates follow it' : 'This project has no schedule yet — give them dates of their own'} />
          ) : null}
          {f.worksOn === 'own' ? (
            <div className={styles.pairs}>
              <DateField label="Starts" value={f.start} onChange={(v) => set({ start: v })} today={todayDate} required error={tried ? startWhy : undefined} name="crew-start" />
              <DateField label="Finishes" value={f.end} onChange={(v) => set({ end: v })} today={todayDate} required error={tried ? endWhy : undefined} name="crew-end" />
            </div>
          ) : null}
          {edit ? null : (
            <div>
              <span className={styles.fieldLabel}>They are</span>
              <Chips label="They are" options={[{ value: 'planned', label: 'Planned' }, { value: 'on_site', label: 'On site already' }]} value={f.status} onChange={(v) => set({ status: v === 'on_site' ? 'on_site' : 'planned' })} testId="crew-status" />
            </div>
          )}
          <TextField label="Note (optional)" value={f.note} onChange={(v) => set({ note: v })} maxLength={CREW_NOTE_MAX} multiline={2} helper="For the team — access, materials on site, what to check" />
        </div>
      </Dialog>
      <VendorDialog open={adding} initial={null} onSite={f.trade} trades={board.trades} bank={false} busy={addBusy} nested onClose={() => setAdding(false)} onSave={(i) => { void addVendor(i) }} />
    </>
  )
}
