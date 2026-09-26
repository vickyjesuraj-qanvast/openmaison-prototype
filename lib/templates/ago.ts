import { displayDate } from '@/lib/format'

/** "just now · 5 min ago · 3h ago · 2d ago · 12/9/2026" for the gallery's meta and the editor's Saved stamp. Client-safe. */
export function ago(at: number | null | undefined, now: number): string {
  if (!at) return 'never'
  const s = Math.max(0, Math.floor((now - at) / 1000))
  if (s < 60) return 'just now'   // (F126) never "0 min ago" — lib/format's relativeTime rule
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return displayDate(new Date(at))
}
