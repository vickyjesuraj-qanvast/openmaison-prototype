'use client'

import { money2 } from '@/lib/quotes/math'
import type { ReadingLine, ReadingSection } from '@/components/templates/render/slices'
import styles from './reading-cards.module.css'

/**
 * (UX audit Q6, REG-597's phone cards for the client — extends REG-587) The confirmation page on a phone: the quote's lines as cards to
 * read — a section as a caption row with its amount, each line its name, description, quantity × price and amount — instead of an A4
 * page shrunk to 4px text. Built from the print's own sections (`readingSections`), so a card never shows what the print leaves out: the
 * client view's amounts decide what is priced (every line · one per section · the total only), a hidden line stays hidden, a line that
 * prints a word prints the word. "View as printed" (the page's) shows the A4.
 */
export function ReadingCards({ sections, optional, amounts, totalMinor, optionalTitle = 'Optional works' }: { sections: ReadingSection[]; optional: ReadingLine[]; amounts: 'lines' | 'sections' | 'total'; totalMinor: number; optionalTitle?: string }) {
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
    </div>
  )
}
