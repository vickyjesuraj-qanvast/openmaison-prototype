/**
 * (the Dashboard redesigned, 2026-10-26 — P-06, lane D3) Your day's ring: today's done of today's, drawn as a thin circle whose arc fills —
 * the primary's arc is one of the seasonings his note allows (§ 2); the rest is the surface's own rule colour. Its words sit beside it
 * ("2 of 5 done"), so the ring never carries the fact alone. Needs you's cleared ring (lane D2) is the same idea; the landing keeps one.
 */
import styles from './cards.module.css'

export function DayRing({ done, total, size = 20 }: { done: number; total: number; size?: number }) {
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const share = total ? Math.min(1, done / total) : 0
  return (
    <svg className={styles.ring} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden data-full={share >= 1 || undefined}>
      <circle className={styles.ringTrack} cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
      {share > 0 ? <circle className={styles.ringArc} cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round"
                           strokeDasharray={`${c * share} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /> : null}
    </svg>
  )
}
