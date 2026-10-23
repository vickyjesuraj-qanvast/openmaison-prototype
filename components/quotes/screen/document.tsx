'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { money2 } from '@/lib/quotes/math'
import type { ReadingLine, ReadingSection, readingSections } from '@/components/templates/render/slices'
import { ReadingCards } from '@/components/quotes/confirm/reading-cards'
import styles from './document.module.css'

export type Reading = NonNullable<ReturnType<typeof readingSections>>

/**
 * (Quotes on the move, P-01) The quote as a document on the Quote screen — the confirmation page's reading cards (REG-597's phone card,
 * read-only), built from the print's own sections (`readingSections`), so the screen never shows what the print leaves out. Each section
 * is a fold — its name, its line count and its amount on the head, the lines under it; the first opens, the rest wait (the drawn screen 2).
 * The tail — the optional works, the Total, the sections priced after the contract and the payment schedule — is `ReadingCards` itself,
 * so one component draws them on the client's page and here. "As printed" opens the Preview's paper viewer.
 */
export function QuoteDocument({ reading, totalMinor, lineCount, onAsPrinted }: { reading: Reading | null; totalMinor: number; lineCount: number; onAsPrinted: () => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(reading?.sections[0] ? [reading.sections[0].id] : []))
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const lineAmount = (l: ReadingLine) => (l.word ? l.word : l.noPrice ? '—' : money2(l.totalMinor))
  const amounts = reading?.amounts ?? 'lines'
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
  const section = (s: ReadingSection) => {
    const on = open.has(s.id)
    const n = s.lines.length
    return (
      <section key={s.id} className={styles.section} aria-label={s.label || 'Items'} data-open={on || undefined}>
        <button type="button" className={styles.head} aria-expanded={on} onClick={() => toggle(s.id)} data-testid="document-section">
          <span className={styles.headName}>{s.label || 'Items'}</span>
          <span className={styles.headCount}>{n} {n === 1 ? 'item' : 'items'}</span>
          {amounts !== 'total' ? <span className={styles.headAmount}>{money2(s.totalMinor)}</span> : null}
          <span className={styles.chev} aria-hidden><Icon name="expand_more" size={24} /></span>
        </button>
        {on ? <ul className={styles.cards}>{s.lines.map(card)}</ul> : null}
      </section>
    )
  }
  return (
    <div className={styles.doc} data-testid="quote-document">
      <div className={styles.docHead}>
        <span className={styles.count}>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
        <Button appearance="text" iconStart={<Icon name="description" size={20} />} onPress={onAsPrinted} data-testid="as-printed">As printed</Button>
      </div>
      {reading ? (
        <>
          {reading.sections.map(section)}
          {/* the tail as the client's page draws it: the optional works, the Total, the estimates after the contract — the schedule is the
              screen's own folded row (with its amounts and dues), so it is not printed twice */}
          <ReadingCards sections={[]} optional={reading.optional} amounts={reading.amounts} totalMinor={totalMinor} after={reading.after} afterTitle={reading.afterTitle} schedule={null} />
        </>
      ) : (
        <p className={styles.none}>This template prints no item list — open As printed to read the quote as the client gets it.</p>
      )}
    </div>
  )
}
