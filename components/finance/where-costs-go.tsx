'use client'

import { money2 } from '@/lib/quotes/math'
import { CATEGORY_SLOTS, slotOf } from '@/lib/chart-palette'
import palette from '@/components/om/category-palette.module.css'
import styles from './where-costs-go.module.css'

/*
 * (parity map, MO-087 · FB-031 — 1.0's "Where costs go", category-breakdown.tsx) A project's committed costs by trade and category — the POs
 * from Sent on, the bills on no PO and the approved expenses, `costsOf`'s `byCategory` (one set of numbers; Reports' studio-wide breakdown
 * reads the same) — as ONE stacked bar over its legend. For whoever sees the cost figures (Owners and Admins, F1-Q2); nothing at all when
 * nothing is committed. (pending modules S06 — REG-1577's call, as recommended) Each named category wears its own hue from the house
 * categorical palette (components/om/category-palette.module.css — four validated hues in a fixed order, then Other's grey): the biggest four
 * by name, the rest folded into Other (a fifth hue is never made up) — a lone fifth keeps its own name in Other's grey rather than reading
 * "Other (1)". A 2px surface gap between segments; identity is never colour alone — the
 * legend reads the bar left to right, each row with its name, share and amount, and each segment says its own on hover.
 */
const SHOWN = CATEGORY_SLOTS

export function WhereCostsGo({ rows }: { rows: { category: string; committedMinor: number }[] }) {
  const live = rows.filter((r) => r.committedMinor > 0)
  const total = live.reduce((s, r) => s + r.committedMinor, 0)
  if (!total) return null
  const named = live.slice(0, live.length > SHOWN + 1 ? SHOWN : live.length)
  const rest = live.slice(named.length)
  const parts = [...named.map((r, i) => ({ key: r.category, label: r.category, minor: r.committedMinor, tone: slotOf(i) })),
    ...(rest.length ? [{ key: '__other', label: `Other (${rest.length})`, minor: rest.reduce((s, r) => s + r.committedMinor, 0), tone: 'other' as const }] : [])]
  const pct = (m: number) => (m / total) * 100
  const pctWords = (m: number) => { const p = pct(m); return p < 1 ? '<1%' : `${Math.round(p)}%` }
  return (
    <section className={styles.card} aria-labelledby="where-costs-go" data-testid="where-costs-go">
      <div className={styles.head}>
        <h3 id="where-costs-go" className={styles.title}>Where costs go</h3>
        <span className={styles.meta}>{money2(total)} committed</span>
      </div>
      <div className={styles.bar} role="img" aria-label={`Committed costs by category: ${parts.map((p) => `${p.label} ${pctWords(p.minor)}`).join(', ')}`}>
        {parts.map((p) => <span key={p.key} className={`${styles.seg} ${palette[p.tone]}`} data-tone={p.tone} style={{ flexGrow: p.minor }} title={`${p.label} · ${money2(p.minor)} · ${pctWords(p.minor)}`} data-testid="where-costs-seg" />)}
      </div>
      <ul className={styles.legend}>
        {parts.map((p) => (
          <li key={p.key} className={styles.item} data-testid="where-costs-item">
            <span className={`${styles.swatch} ${palette[p.tone]}`} data-tone={p.tone} aria-hidden />
            <span className={styles.name} title={p.label}>{p.label}</span>
            <span className={styles.share}>{pctWords(p.minor)}</span>
            <span className={styles.amount}>{money2(p.minor)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
