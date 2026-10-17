'use client'

import { money2 } from '@/lib/quotes/math'
import type { ReadingLine, ReadingSchedule, ReadingSection } from '@/components/templates/render/slices'
import styles from './reading-cards.module.css'

/**
 * (UX audit Q6, REG-597's phone cards for the client — extends REG-587) The confirmation page on a phone: the quote's lines as cards to
 * read — a section as a caption row with its amount, each line its name, description, quantity × price and amount — instead of an A4
 * page shrunk to 4px text. Built from the print's own sections (`readingSections`), so a card never shows what the print leaves out: the
 * client view's amounts decide what is priced (every line · one per section · the total only), a hidden line stays hidden, a line that
 * prints a word prints the word. "View as printed" (the page's) shows the A4.
 */
export function ReadingCards({ sections, optional, amounts, totalMinor, optionalTitle = 'Optional works', after = [], afterTitle = 'Priced after the contract', schedule = null }: { sections: ReadingSection[]; optional: ReadingLine[]; amounts: 'lines' | 'sections' | 'total'; totalMinor: number; optionalTitle?: string
  /** (S44T — call C1) the sections priced after the contract: estimates, never in the total */ after?: ReadingSection[]; afterTitle?: string
  /** (S44T — UAT row 332) the payment schedule the print shows — the cards end with it */ schedule?: ReadingSchedule | null }) {
  const lineAmount = (l: ReadingLine) => (l.word ? l.word : l.noPrice ? '—' : money2(l.totalMinor))
  const card = (l: ReadingLine) => (
    <li key={l.id} className={styles.card} data-testid="reading-card">
      <span className={styles.text}>
        <span className={styles.name}>{l.name}</span>
        {l.description ? <span className={styles.desc}>{l.description}</span> : null}
        {amounts === 'lines' && !l.word && !l.noPrice ? <span className={styles.sub}>{`${l.qty} ${l.unit ?? ''} × ${money2(l.unitPriceMinor)}`.replace('  ', ' ')}</span> : null}
      </span>
      {amounts === 'lines' ? <span className={styles.amount}>{lineAmount(l)}</span> : null}
    </li>
  )
  return (
    <div className={styles.list} data-testid="reading-cards">
      {sections.map((s) => (
        <section key={s.id} className={styles.section} aria-label={s.label || 'Items'}>
          {s.label ? (
            <div className={styles.caption}>
              <span className={styles.captionName}>{s.label}</span>
              {amounts !== 'total' ? <span className={styles.captionAmount}>{money2(s.totalMinor)}</span> : null}
            </div>
          ) : null}
          <ul className={styles.cards}>{s.lines.map(card)}</ul>
        </section>
      ))}
      {optional.length ? (
        <section className={styles.section} aria-label={optionalTitle}>
          <div className={styles.caption}><span className={styles.captionName}>{optionalTitle}</span><span className={styles.captionHint}>not in the total</span></div>
          <ul className={styles.cards}>{optional.map(card)}</ul>
        </section>
      ) : null}
      <div className={styles.total}><span>Total</span><strong>{money2(totalMinor)}</strong></div>
      {/* (S44T — call C1) the work priced after the contract, as the print names it: estimates, after the total, never in it */}
      {after.length ? (
        <section className={styles.section} aria-label={afterTitle} data-testid="reading-after">
          <div className={styles.caption}><span className={styles.captionName}>{afterTitle}</span><span className={styles.captionHint}>estimates · not in the total</span></div>
          {after.map((s) => (
            <div key={s.id} className={styles.section}>
              {s.label ? <div className={styles.caption}><span className={styles.captionName}>{s.label}</span>{amounts !== 'total' ? <span className={styles.captionAmount}>{money2(s.totalMinor)}</span> : null}</div> : null}
              <ul className={styles.cards}>{s.lines.map(card)}</ul>
            </div>
          ))}
          <div className={styles.total}><span>Estimated total</span><strong>{money2(after.reduce((n, s) => n + s.totalMinor, 0))}</strong></div>
        </section>
      ) : null}
      {/* (S44T — UAT row 332) the schedule as the print shows it: each milestone, its share and its amount on one grid, the figures in columns */}
      {schedule ? (
        <section className={styles.section} aria-label={schedule.title || 'Payment schedule'} data-testid="reading-schedule">
          <div className={styles.caption}><span className={styles.captionName}>{schedule.title || 'Payment schedule'}</span></div>
          <div className={styles.schedule} role="table" aria-label={schedule.title || 'Payment schedule'}>
            {schedule.rows.map((r, i) => (
              <div key={i} className={styles.payRow} role="row">
                <span className={styles.payMark} role="cell">{r.mark}</span>
                <span className={styles.payWords} role="cell"><span className={styles.payLabel}>{r.label}</span>{r.due ? <span className={styles.sub}>{r.due}</span> : null}</span>
                <span className={styles.payShare} role="cell">{r.share ?? ''}</span>
                <span className={styles.payAmount} role="cell">{r.amountMinor !== null ? money2(r.amountMinor) : ''}</span>
              </div>
            ))}
            {schedule.total ? (
              <div className={styles.payRow} data-total role="row">
                <span className={styles.payMark} role="cell" />
                <span className={styles.payWords} role="cell"><span className={styles.payLabel}>Total</span></span>
                <span className={styles.payShare} role="cell">{schedule.total.share ?? ''}</span>
                <span className={styles.payAmount} role="cell">{schedule.total.amountMinor !== null ? money2(schedule.total.amountMinor) : ''}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
