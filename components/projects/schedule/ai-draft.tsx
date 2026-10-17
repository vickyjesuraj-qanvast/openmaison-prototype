'use client'

import { Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { dayLabel, plural, rangeLabel } from '@/lib/projects/schedule-model'
import { weeksBetween } from '@/lib/projects/schedule-phases'
import { draftTimeline, type AiInput } from '@/lib/projects/schedule-ai'
import styles from './ai-draft.module.css'

/** What Maison AI's draft needs besides the quote: the scope's rooms, the kind of home, the project type, the client's first name. */
export type AiContext = Omit<AiInput, 'lines' | 'quoteNumber'>

/**
 * (gaps build I, I-Q14) Maison AI's draft, reviewed before it lands: what it read, then every milestone it drafted — ticked to keep, its
 * dates (laid again as ticks change) and why it is there — the handover it lands on, and *Worth knowing*: 1.0's tips and risk warnings, shown
 * at last (E-281). The Start card draws it in "What you will get"; the Rebuild dialog in its plan, each row marked Kept or New.
 */
export function AiDraftReview({ input, start, skip, onSkip, marks, disabled = false }: {
  input: AiInput
  start: number
  skip: string[]
  onSkip: (skip: string[]) => void
  /** The Rebuild dialog's marks: a milestone kept (its name already on the schedule — with its own dates, which stay) or new. */
  marks?: Record<string, { kept: { start: number; end: number } | null }>
  disabled?: boolean
}) {
  const all = draftTimeline(input, start)
  const kept = draftTimeline(input, start, skip)
  const at = new Map(kept.drafts.map((d) => [d.key, d]))
  const lo = kept.drafts.length ? Math.min(...kept.drafts.map((d) => d.start)) : start
  const span = kept.drafts.length ? Math.max(...kept.drafts.map((d) => d.end)) - lo + 1 : 1
  const handover = kept.drafts.length ? Math.max(...kept.drafts.map((d) => d.end)) : null
  return (
    <div className={styles.review} data-testid="ai-draft">
      <p className={styles.read}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className={styles.spark}><img src="/figma-assets/brief-sparkle.svg" width={16} height={16} alt="" /></span>
        <span>{`Maison AI read ${all.read || 'the quote'}. Untick what this job doesn’t need — the rest is laid again.`}</span>
      </p>
      <ol className={styles.list}>
        {all.drafts.map((d) => {
          const k = at.get(d.key)
          const on = !!k
          const mark = marks?.[d.key] ?? null
          const own = mark?.kept ?? null   // a kept milestone keeps its own dates
          return (
            <li key={d.key} className={styles.row} data-off={on ? undefined : ''} data-testid="ai-draft-row" data-key={d.key}>
              <Checkbox isSelected={on} isDisabled={disabled || (on && kept.drafts.length === 1)} onChange={(v: boolean) => onSkip(v ? skip.filter((x) => x !== d.key) : [...skip, d.key])} aria-label={on ? `Leave out ${d.title}` : `Keep ${d.title}`} />
              <span className={styles.body}>
                <span className={styles.head}>
                  <span>{d.title}</span>
                  <span className={styles.headEnd}>
                    {mark && on ? <MetaChip color={own ? 'default' : 'blue'}>{own ? 'Kept' : 'New'}</MetaChip> : null}
                    <span>{!k ? 'Left out' : own ? rangeLabel(own.start, own.end) : rangeLabel(k.start, k.end)}</span>
                  </span>
                </span>
                {k && !own ? <span className={styles.track}><span className={styles.bar} style={{ left: `${((k.start - lo) / span) * 100}%`, width: `${((k.end - k.start + 1) / span) * 100}%` }} /></span> : null}
                <p className={styles.why}>{d.why}</p>
              </span>
            </li>
          )
        })}
      </ol>
      {handover !== null && !marks ? <div className={styles.total} data-testid="ai-draft-total">{`Handover around ${dayLabel(handover)}, ${plural(weeksBetween(start, handover), 'week')} after works start.`}</div> : null}
      {all.notes.length ? (
        <div className={styles.notes} data-testid="ai-draft-notes">
          <span className={styles.notesLabel}>Worth knowing</span>
          {all.notes.map((n, i) => <div key={i} className={styles.note} data-tone={n.tone}><Icon name={n.tone === 'risk' ? 'warning' : 'lightbulb'} size={18} /><span>{n.text}</span></div>)}
        </div>
      ) : null}
    </div>
  )
}
