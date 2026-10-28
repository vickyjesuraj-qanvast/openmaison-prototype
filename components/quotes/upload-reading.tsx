import { Icon } from '@/components/om/icon'
import { money2 } from '@/lib/quotes/math'
import type { UploadRead } from '@/lib/quotes/upload'
import styles from './create-quote-modal.module.css'

/**
 * (REG-627, parity Q-16) What Upload a quote read from a file — "n lines read from … · S$ …" and the lines by section — as the Create Quote
 * window shows it before the quote is made; moved here unchanged so (pending modules S41b-3) the website's free trial shows a visitor's read
 * in the very same table. `max` — how many lines are listed before "+ n more lines" (the window lists 12; the trial, the whole quote).
 */
export function UploadReadingView({ read, max = 12 }: { read: Extract<UploadRead, { ok: true }>; max?: number }) {
  const lines = read.groups.flatMap((g) => g.lines.map((l, i) => ({ g: g.name, l, i })))
  return (
    <>
      <p className={styles.uploadNote} role="status"><Icon name="task_alt" size={20} weight={300} /><span><b>{read.count} {read.count === 1 ? 'item' : 'items'}</b> read from {read.source} · {money2(read.totalMinor)}</span></p>   {/* (the calm UI build 2026-10-27, T-01 · 6-14) a quote's lines are items — X-Ray's file tile says so too */}
      <div className={styles.uploadTable} role="table" aria-label="The lines read">
        <div className={styles.uploadRow} role="row" data-head=""><span role="columnheader">Section</span><span role="columnheader">Item</span><span role="columnheader">Qty</span><span role="columnheader">Unit</span><span role="columnheader">Amount</span></div>
        {lines.slice(0, max).map(({ g, l, i }, k) => (
          <div key={k} className={styles.uploadRow} role="row"><span role="cell">{i === 0 ? g ?? '—' : ''}</span><span role="cell">{l.name}</span><span role="cell">{l.qty ?? 1}</span><span role="cell">{l.unit ?? '—'}</span><span role="cell">{money2(Math.round((l.qty ?? 1) * ((l.costMinor ?? 0) + (l.markupMinor ?? 0))))}</span></div>
        ))}
      </div>
      {read.count > max ? <span className={styles.uploadMore}>+ {read.count - max} more {read.count - max === 1 ? 'item' : 'items'}</span> : null}
    </>
  )
}
