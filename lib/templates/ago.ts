import { displayDate } from '@/lib/format'

/** "just now · 5 min ago · 3 hours ago · 2 days ago · 12 Sep ’26" for the gallery's meta and the editor's Saved stamp. Client-safe.
    (the calm UI build 2026-10-27, 1-24 · T-11) spelled out, as lib/format's `relativeTime` — never "3h" / "2d". */
export function ago(at: number | null | undefined, now: number): string {
  if (!at) return 'never'
  const s = Math.max(0, Math.floor((now - at) / 1000))
  if (s < 60) return 'just now'   // (F126) never "0 min ago" — lib/format's relativeTime rule
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ${d === 1 ? 'day' : 'days'} ago`
  return displayDate(new Date(at))
}
