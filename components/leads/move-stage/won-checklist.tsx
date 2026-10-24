'use client'

import { useState, type ReactNode } from 'react'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import styles from './won-checklist.module.css'

/**
 * (Leads on the move, P-04 · B-11 · B-12 — his marks 2026-10-23 on the Leads-on-the-move page, "continue the leads"; drawn screen 4) **Won as a
 * checklist** when the Move stage window is one step per screen: a row per thing the project is made from — the signed quote ("OM-10008 ·
 * S$68,176 · Signed on 12 Oct ’26 ✓", or Take a photo · Choose a file, Q-03, the amount typed), the signed contract (the same rows, C4's), the
 * payments ("10 · 30 · 30 · 30 — the studio’s usual", B-12) and the project type as chips — each settled row reads as one line, the first one
 * still to do opens, a row with an error opens and says it. One filled **Create project** in the window's foot. The desk keeps the step's form.
 * *(invented copy: the rows' summaries, "Creates … project", the payments' note)*
 */
export type CheckRow = {
  key: 'quote' | 'contract' | 'payments'
  title: string
  /** the row's one line when it is closed */
  summary: string
  done: boolean
  /** a refusal or a hold — the row reads red and opens */
  error?: string | null
  /** what the row opens to; null = a line only (a system quote's payments) */
  body: ReactNode | null
  optional?: boolean
}

export function WonChecklist({ rows, type, closing }: {
  rows: CheckRow[]
  type: { value: string; options: readonly string[]; onChange: (v: string) => void; error?: string | null }
  /** what Create project makes, said once above the foot */
  closing: string
}) {
  const [picked, setPicked] = useState<CheckRow['key'] | null | undefined>(undefined)
  /* until a row is pressed, the first with an error — else the first still to do — is the open one; afterwards the press decides */
  const auto = rows.find((r) => r.error && r.body)?.key ?? rows.find((r) => !r.done && !r.optional && r.body)?.key ?? null
  const open = picked === undefined ? auto : picked
  const errored = rows.find((r) => r.error && r.body)?.key ?? null
  const isOpen = (k: CheckRow['key']) => open === k || errored === k
  return (
    <div className={styles.list} data-testid="won-checklist">
      {rows.map((r) => {
        const on = isOpen(r.key) && !!r.body
        return (
          <section key={r.key} className={styles.row} data-done={r.done || undefined} data-error={r.error ? '' : undefined} data-open={on || undefined} data-testid={`won-row-${r.key}`}>
            <button type="button" className={styles.head} aria-expanded={r.body ? on : undefined} disabled={!r.body}
                    onClick={() => setPicked(on ? null : r.key)}>
              <span className={styles.mark} aria-hidden><Icon name={r.error ? 'error' : r.done ? 'check_circle' : 'radio_button_unchecked'} size={24} weight={300} fill={r.done && !r.error} /></span>
              <span className={styles.text}>
                <span className={styles.title}>{r.optional ? `${r.title} (optional)` : r.title}</span>
                <span className={styles.summary}>{r.error ?? r.summary}</span>
              </span>
              {r.body ? <Icon name={on ? 'expand_less' : 'expand_more'} size={24} /> : null}
            </button>
            {/* a row being worked in stays open — the amount's first digit settles the row, and the field must not fold away under the finger */}
            {on ? <div className={styles.body} onFocusCapture={() => { if (picked === undefined) setPicked(r.key) }} onPointerDownCapture={() => { if (picked === undefined) setPicked(r.key) }}>{r.body}</div> : null}
          </section>
        )
      })}
      <section className={styles.row} data-done={type.value ? '' : undefined} data-error={type.error ? '' : undefined} data-testid="won-row-type">
        <div className={styles.head} data-static="">
          <span className={styles.mark} aria-hidden><Icon name={type.error ? 'error' : type.value ? 'check_circle' : 'radio_button_unchecked'} size={24} weight={300} fill={!!type.value && !type.error} /></span>
          <span className={styles.text}><span className={styles.title}>Project type</span>{type.error ? <span className={styles.summary}>{type.error}</span> : null}</span>
        </div>
        <div className={styles.body}>
          <Chips label="Project type" options={type.options} value={type.value || null} onChange={type.onChange} className={styles.chips} testId="won-type" />
        </div>
      </section>
      <p className={styles.closing} data-testid="won-closing"><Icon name="check" size={20} />{closing}</p>
    </div>
  )
}
