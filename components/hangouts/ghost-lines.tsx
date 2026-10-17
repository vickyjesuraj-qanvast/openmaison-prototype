import { Line, deskOnly, phoneOnly } from '@/components/shell/ghost-kit'

type W = number | `${number}%`
/**
 * (REG-708; pending modules S27) A paragraph of data as a ghost: its lines stacked with no gap inside ONE element carrying the page's own class
 * (and its module's `ghostLines`), so the block is as tall as the page's paragraph where it wraps — a line drawn everywhere, a `[w, 'phone']`
 * line only in a phone's column, a `[w, 'desk']` line only at a desk. The same in a page's loader and its reveal (no data).
 */
export function GhostLines({ className, lines, lh = 20, h = 12 }: { className?: string; lines: (W | [W, 'phone' | 'desk'])[]; lh?: number; h?: number }) {
  return (
    <span className={className}>
      {lines.map((l, i) => (Array.isArray(l) ? <Line key={i} w={l[0]} lh={lh} h={h} className={l[1] === 'phone' ? phoneOnly : deskOnly} /> : <Line key={i} w={l} lh={lh} h={h} />))}
    </span>
  )
}
