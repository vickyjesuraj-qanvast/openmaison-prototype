'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ds'
import { DateField } from '@/components/om/date-field'
import { inputDate, parseInputDate } from '@/lib/format'
import { dateOfDay, dayLabel, dayOf, payShareWord, plural, rangeLabel } from '@/lib/projects/schedule-model'
import { weeksBetween } from '@/lib/projects/schedule-phases'
import type { ScheduleData } from '@/lib/projects/schedule'
import type { ScheduleSource } from '@/app/projects/schedule-actions'
import { SourcePicker, aiInputOf, draftsOfSource, sourceOf, type SourceState } from './source-picker'
import { AiDraftReview, type AiContext } from './ai-draft'   // (gaps build I)
import styles from './schedule.module.css'

/** (gaps build, package C — 3) Why the template was picked first — the line under its select. */
export function preselectWords(data: ScheduleData, templateId: string): string | null {
  const r = data.preselect?.reason
  const t = data.start.templates.find((x) => x.id === templateId)
  if (!t || !data.preselect || data.preselect.pick.kind !== 'template' || data.preselect.pick.id !== templateId) return null
  if (r === 'property') return `Picked for ${data.kind?.propertyType ? `a ${data.kind.propertyType}` : 'this home'} — the ready-made ${t.name} schedule. Pick another if the job differs.`
  if (r === 'type') return `Settings › Projects starts every ${(data.kind?.projectType ?? 'such project').toLowerCase()} here.`
  if (r === 'studio') return 'The studio default in Settings › Projects › Schedule starts new schedules here.'
  return null
}

/**
 * (Projects round 2 · Start.dc.html) Starting a schedule: the day works start, and where the milestones come from — the signed quote (one
 * milestone for each stage of work it has lines for, in the order work runs), a schedule template (Company › Templates › Schedules), or nothing
 * yet. "What you will get" draws the result before it is made, with the handover it lands on and how the quote's payments fall. Everything can be
 * changed afterwards. A member who may not change the project reads why.
 * (gaps build, package C — 3 · 4) Any of the lead's quotes (signed first, then the newest) or an uploaded quote; the ready-made schedules in the
 * library; and the first pick follows Settings › Projects — the project type's default, the studio's, the signed quote, then the ready-made
 * schedule for the property type — saying why.
 */
/** (simplify S-17) The first pick — Settings › Projects, then the signed quote, then the ready-made schedule — the Start card's and the Start
    sheet's one rule. */
export function startSourceOf(data: ScheduleData, draftAi = false): SourceState {
  const { start: s } = data
  const quotes = data.quotes ?? []
  const signedId = s.quote?.id ?? null
  const pre = data.preselect?.pick ?? (s.defaultTemplate ? { kind: 'template' as const, id: s.defaultTemplate } : s.quote ? { kind: 'quote' as const } : s.templates.length ? { kind: 'template' as const, id: s.templates[0]!.id } : { kind: 'blank' as const })
  return {
    pick: draftAi && quotes.some((x) => x.lines > 0) ? 'ai' : pre.kind === 'template' ? 'template' : pre.kind === 'quote' ? 'quote' : 'blank',
    quoteId: signedId ?? quotes[0]?.id ?? '', templateId: pre.kind === 'template' ? pre.id : s.templates[0]?.id ?? '', upload: null,
  }
}
/** (gaps build I, I-Q13) What Maison AI's draft reads besides the quote. */
export const aiContextOf = (data: ScheduleData): AiContext => ({ rooms: data.scope ?? [], propertyType: data.kind?.propertyType ?? null, projectType: data.kind?.projectType ?? null, client: data.clientFirst })
/** (simplify S-17) "9 milestones · handover around Thu 24 Dec" — the Start sheet's folded preview on a phone. */
export function previewWords(data: ScheduleData, src: SourceState, startDay: number | null): string {
  const drafts = draftsOfSource(src, startDay, data.quotes ?? [], data.start.templates, aiContextOf(data))
  if (!drafts.length) return src.pick === 'blank' ? 'Not now — the Schedule tab keeps its Start card' : 'Nothing to lay out yet'
  return `${plural(drafts.length, 'milestone')} · handover around ${dayLabel(Math.max(...drafts.map((d) => d.end)))}`
}

/**
 * (simplify S-17) "What you will get" — the drawing of what a source makes from works start: each milestone's bar, the handover it lands on,
 * how the payments fall, what already happened before today; or Maison AI's draft to review. The Start card's aside and the Start sheet's
 * right column draw this one piece.
 */
export function StartPreview({ data, src, onSkip, startDay, can, blankWords }: {
  data: ScheduleData; src: SourceState; onSkip: (skip: string[]) => void; startDay: number | null; can: boolean
  /** What the blank pick says — the card's "An empty schedule…", the sheet's Not now. */ blankWords?: string
}) {
  const { start: s } = data
  const quotes = data.quotes ?? []
  const ai = aiContextOf(data)
  const drafts = draftsOfSource(src, startDay, quotes, s.templates, ai)
  const aiQuote = src.pick === 'ai' ? quotes.find((x) => x.id === src.quoteId) ?? null : null
  const lo = drafts.length ? Math.min(...drafts.map((d) => d.start)) : 0
  const span = drafts.length ? Math.max(...drafts.map((d) => d.end)) - lo + 1 : 1
  const handover = drafts.length ? Math.max(...drafts.map((d) => d.end)) : null
  /* (S44O — UAT row 297, her UAT ask 2026-10-15) a fixed design fee first is one of the payments — at its amount ("S$3,000 design fee"); the
     line hid it as a 0% row */
  const pays = s.payments.filter((p) => p.pct > 0 || (p.fixedMinor ?? 0) > 0)
  const payLine = pays.length ? `Payments follow the ${data.start.quote ? 'quote' : 'agreed split'}: ${pays.map((p) => `${payShareWord(p)} ${p.name.toLowerCase()}`).join(', ')}.` : null
  /* (B-06) works that started before today: what already happened is set up as done, the stage running today as in progress */
  const todayDay = dayOf(new Date(data.now))
  const pastLine = startDay !== null && drafts.some((d) => d.start < todayDay) ? 'Milestones that ended before today start as done, and the one running today as in progress — change any of them afterwards.' : null
  if (aiQuote && startDay !== null) return (   /* (gaps build I, I-Q14) Maison AI's draft, reviewed before Create schedule lands it */
    <>
      <AiDraftReview input={aiInputOf(aiQuote, ai)} start={startDay} skip={src.aiSkip ?? []} onSkip={onSkip} disabled={!can} />
      {pastLine ? <div className={styles.startHelp} data-testid="start-past">{pastLine}</div> : null}
      {payLine ? <div className={styles.startHelp}>{payLine}</div> : null}
    </>
  )
  if (!drafts.length) return <span className={styles.getBlank}>{src.pick === 'blank' ? blankWords ?? 'An empty schedule — add the first milestone when you are ready.' : src.pick === 'upload' && !src.upload ? 'Choose the quote’s file — its stages of work make the milestones.' : 'Pick the day works start.'}</span>
  return (
    <>
      <ol className={styles.getList}>
        {drafts.map((d, i) => (
          <li key={i} className={styles.getRow}>
            <span className={styles.getHead}><span>{d.title}</span><span>{rangeLabel(d.start, d.end)}</span></span>
            <span className={styles.getTrack}><span className={styles.getBar} style={{ left: `${((d.start - lo) / span) * 100}%`, width: `${((d.end - d.start + 1) / span) * 100}%` }} /></span>
          </li>
        ))}
      </ol>
      {handover !== null && startDay !== null ? <div className={styles.getTotal}>Handover around {dayLabel(handover)}, {plural(weeksBetween(startDay, handover), 'week')} after works start.</div> : null}
      {pastLine ? <div className={styles.startHelp} data-testid="start-past">{pastLine}</div> : null}
      {payLine ? <div className={styles.startHelp}>{payLine}</div> : null}
    </>
  )
}

export function StartSchedule({ data, onCreate, onManageTemplates, draftAi = false }: {
  data: ScheduleData
  /** (gaps build I, I-Q17) Maison AI's "Draft a schedule from the quote" (`?draft=ai`): the Maison AI way picked first */
  draftAi?: boolean
  /** Resolves true once the schedule is made. */
  onCreate: (start: string, source: ScheduleSource) => Promise<boolean>
  onManageTemplates: () => void
}) {
  const { start: s } = data
  const today = useMemo(() => dateOfDay(dayOf(new Date(data.now))), [data.now])
  const [date, setDate] = useState(inputDate(s.startDate ?? today))
  const quotes = data.quotes ?? []
  const signedId = s.quote?.id ?? null
  /* (Projects round 7 · gaps build, package C — 3) the first pick: Settings › Projects, then the signed quote, then the ready-made schedule */
  const ai = aiContextOf(data)
  const [src, setSrc] = useState<SourceState>(() => startSourceOf(data, draftAi))
  const [busy, setBusy] = useState(false)
  const day = parseInputDate(date)
  const startDay = day ? dayOf(day) : null
  const drafts = draftsOfSource(src, startDay, quotes, s.templates, ai)
  /* (B-16) one filled button on the page: while the header's Start the project is filled, Create schedule steps back */
  const headerFilled = data.stage === 'setting_up' && data.mayChange
  const source = sourceOf(src, signedId)
  const create = async () => {
    if (startDay === null || !source) return
    setBusy(true)
    await onCreate(new Date(startDay * 86_400_000).toISOString().slice(0, 10), source)
    setBusy(false)
  }
  const can = data.mayChange

  return (
    <section className={styles.start} aria-label="Set up the schedule" data-testid="start-schedule">
      <div className={styles.startInner}>
      <form className={styles.startForm} onSubmit={(e) => { e.preventDefault(); void create() }}>
        <div>
          <h2 className={styles.startTitle}>Set up the schedule</h2>
          {/* (B-47) Managers of the team's members may set it up too (`worksOn`) — named, as REG-1059 does in Settings */}
          <p className={styles.startHelp}>{can ? 'Pick the day works start and where the milestones come from. Everything can be changed afterwards.' : 'Only the project’s team, their Managers, Owners and Admins set up its schedule.'}</p>
        </div>
        <div className={styles.startDate}><DateField label="Works start on" value={date} onChange={setDate} today={today} disabled={!can} /></div>
        <SourcePicker value={src} onChange={setSrc} quotes={quotes} templates={s.templates} disabled={!can} blank templateHelp={preselectWords(data, src.templateId)} testId="start-sources" ai={ai} />
        <div><Button type="submit" {...(headerFilled ? { variant: 'secondary' as const, appearance: 'outlined' as const } : {})} isDisabled={!can || busy || startDay === null || !source || (src.pick !== 'blank' && !drafts.length)} data-kb="create" data-testid="create-schedule">Create schedule</Button></div>
        <span><Button appearance="text" onPress={onManageTemplates}>Manage schedule templates</Button></span>
      </form>
      <aside className={styles.startAside} aria-label="What you will get">
        <span className={styles.legendLabel}>What you will get</span>
        <StartPreview data={data} src={src} onSkip={(skip) => setSrc((x) => ({ ...x, aiSkip: skip }))} startDay={startDay} can={can} />
      </aside>
      </div>
    </section>
  )
}
