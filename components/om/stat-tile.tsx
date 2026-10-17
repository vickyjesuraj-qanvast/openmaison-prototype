import { Children, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import styles from './stat-tile.module.css'

/** (simplify round 2, R2-A — P3 §6.2 "pressing a tile goes to its list") What a tile does when pressed: `onPress` makes it a button, `href` a
    link; `label` is its accessible name (say the figure and where it goes — the tile's text is inside it). */
export type StatTilePress = { label: string; onPress?: () => void; href?: string }

/**
 * A number tile (REG-614): the Quote X-Ray's tile (xray-result.module.css), shared — surface-bg, radius 8, 12/16 padding, an
 * uppercase caption, the number in heading-h3, a body-s help line. `grade` colours the number (Insights' turnaround grades);
 * `tone="primary"` is the X-Ray's primary tile.
 */
export function StatTile({ label, value, help, grade, tone, children, testId, wrap = true, press }: {
  label: string
  value: ReactNode
  help?: ReactNode
  grade?: 'good' | 'warn' | 'bad'
  tone?: 'primary'
  children?: ReactNode
  testId?: string
  /** (fix-A, A-32) The caption wraps instead of cutting ("COMPLETING THIS M…") where the tiles are narrow — (parity P-30 · C-04) the
      default now; `wrap={false}` keeps a caption on one line, cut. */
  wrap?: boolean
  /** (simplify round 2, R2-A) An optional press — the same tile as a button or a link, its look unchanged, with the house focus ring. A tile
      without it stays a plain tile. Keep what is inside it un-focusable (a hover help on the value is fine; a second control is not). */
  press?: StatTilePress
}) {
  const body = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} data-grade={grade}>{value}</span>
      {help ? <span className={styles.help}>{help}</span> : null}
      {children}
    </>
  )
  const attrs = { className: styles.tile, 'data-tone': tone, 'data-testid': testId, 'data-nowrap': wrap ? undefined : '' }
  if (press?.href) return <Link href={press.href} {...attrs} data-press="" aria-label={press.label}>{body}</Link>
  if (press?.onPress) return <button type="button" {...attrs} data-press="" aria-label={press.label} onClick={press.onPress}>{body}</button>
  return <div {...attrs}>{body}</div>
}

/**
 * (parity P-30 · C-04 · Q-15) The house row of number tiles — one rule for every page that lines tiles up: **one row from 1025 up**; at
 * 768–1024 no tile under ~176px (three or fewer stay in one row, four read 2 + 2, five or six 3 + 2 / 3 + 3); **two per row on a phone**,
 * an odd last tile taking the row (the projects listing's fifth, fix-A A-32); one per row below 360 (the Money tab's, fix-D D-40). Children
 * are the tiles (StatTile, or a ghost's tile); null children don't count.
 */
export function StatTiles({ children, testId, className, style }: { children: ReactNode; testId?: string; className?: string; style?: CSSProperties }) {
  const n = Children.toArray(children).length
  const mid = n <= 3 ? n : Math.min(3, Math.ceil(n / 2))
  return (
    <div className={className ? `${styles.tiles} ${className}` : styles.tiles} data-testid={testId} data-odd={n % 2 ? '' : undefined}
         style={{ '--tiles': Math.max(1, n), '--tiles-mid': Math.max(1, mid), ...style } as CSSProperties}>
      {children}
    </div>
  )
}
