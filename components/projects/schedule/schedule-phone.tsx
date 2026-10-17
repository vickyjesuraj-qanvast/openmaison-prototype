'use client'

import { Icon } from '@/components/om/icon'
import { Button } from '@/components/ds'
import { STATUS_LABEL, colorOf, dayMonth, isLate, paymentDay, payShareWord, rowLine, type ClientLayer, type Milestone, type PaymentOption } from '@/lib/projects/schedule-model'
import type { CSSProperties } from 'react'
import styles from './schedule.module.css'

const STATUS_ICON = { done: 'check_circle', in_progress: 'radio_button_checked', blocked: 'pending', not_started: 'radio_button_unchecked' } as const

/**
 * (Projects round 2 · Phone.dc.html) The schedule on a phone: the same rows, each with its thin bar drawn to scale across the whole job and
 * today's line through it; a row opens its milestone (the panel rises as a sheet). No dragging on a phone — the dates move in the panel.
 */
export function SchedulePhone({ list, today, was, payments, waitingWho, client, onOpen, moreTo, onDone, crewLine }: {
  /** (S45B · H-UHD-2) a milestone's crew words for its line, or its gap */
  crewLine?: (milestoneId: string) => { text: string; warn: boolean } | null
  list: Milestone[]
  /** (r4b) Layer 6 — what the client has of a milestone, for its line. */
  client?: (m: Milestone) => ClientLayer | null
  today: number
  was: Map<string, { start: number; end: number }>
  payments: PaymentOption[] | null
  waitingWho: (m: Milestone) => string | null
  onOpen: (m: Milestone) => void
  /** (gaps build, package C — 5) the last day more time is asked for, for its line */
  moreTo?: (m: Milestone) => number | null
  /** (simplify S-25 (4)) Done on each row not done yet — the Mark done sheet; absent for whoever may not change the schedule */
  onDone?: (m: Milestone) => void
}) {
  const lo = Math.min(...list.map((m) => m.start)), hi = Math.max(...list.map((m) => m.end))
  const n = Math.max(1, hi - lo + 1)
  const pct = (d: number) => `${Math.max(0, Math.min(100, ((d - lo) / n) * 100))}%`
  const payBy = new Map((payments ?? []).map((p) => [p.ref, p]))
  return (
    <section className={styles.phoneList} aria-label="Milestones" data-kb-list="milestone" data-testid="schedule-phone">
      {list.map((m) => {
        const late = isLate(m, today)
        const line = rowLine(m, today, { was: was.get(m.id) ?? null, waitingWho: waitingWho(m), client: client?.(m), moreTo: moreTo?.(m) ?? null, crew: crewLine?.(m.id) ?? null })
        const col = colorOf(m.color)   // (gaps build, package C — 12)
        const pay = m.paymentRef ? payBy.get(m.paymentRef) : undefined
        return (
          <div key={m.id} className={styles.phoneItem} data-moved={was.has(m.id) || undefined} data-testid="phone-milestone">
          <button type="button" className={styles.phoneRow} onClick={() => onOpen(m)} data-kb-row data-kb-id={m.id} data-kb-open data-moved={was.has(m.id) || undefined}>
            <span className={styles.glyph} data-s={m.status} data-late={late || undefined}><Icon name={late ? 'warning' : STATUS_ICON[m.status]} size={24} weight={300} fill={m.status === 'done'} /><span className="visually-hidden">{late ? 'Late' : STATUS_LABEL[m.status]}</span></span>
            <span className={styles.phoneText}>
              <span className={styles.name}>{m.title}</span>
              <span className={styles.line} data-alert={line.alert || undefined} data-warn={line.warn || undefined}>{line.text}{pay && !line.alert ? ` · ${payShareWord(pay)} due ${dayMonth(paymentDay(m))}` : ''}</span>
              <span className={styles.mini} aria-hidden>
                <span className={styles.miniBar} data-s={m.status} data-color={col?.key} style={{ left: pct(m.start), width: `${Math.max(2, ((m.end - m.start + 1) / n) * 100)}%`, ...(col ? { '--bar-c': col.hex } : {}) } as CSSProperties} />
                {today >= lo && today <= hi ? <span className={styles.miniToday} style={{ left: pct(today) }} /> : null}
              </span>
            </span>
            <Icon name="keyboard_arrow_right" size={20} className={styles.chev} />
          </button>
          {/* (simplify S-25 (4)) a phone row marks its milestone done in two presses — Done, then the sheet's Mark done; a Done waiting for
              approval says so instead */}
          {onDone && m.status !== 'done' ? (m.doneAsked
            ? <span className={styles.phoneDone} data-testid="phone-done-asked">Done asked</span>
            : <span className={styles.phoneDone}><Button variant="primary" appearance="outlined" size="sm" onPress={() => onDone(m)} aria-label={`Mark ${m.title} done`} data-testid="phone-done">Done</Button></span>) : null}
          </div>
        )
      })}
    </section>
  )
}
