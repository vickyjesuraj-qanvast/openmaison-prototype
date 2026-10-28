import { Children, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import styles from './stat-tile.module.css'

/** (simplify round 2, R2-A — P3 §6.2 "pressing a tile goes to its list") What a tile does when pressed: `onPress` makes it a button, `href` a
    link; `label` is its accessible name (say the figure and where it goes — the tile's text is inside it). */
export type StatTilePress = { label: string; onPress?: () => void; href?: string }

/** (W3-16) From this many characters a figure is fitted to its tile on a phone (shorter ones always fit half a 320 row at their size); the
    stylesheet's steps run to FIT_TO. */
const FIT_FROM = 8, FIT_TO = 14

/**
 * A number tile (REG-614): the Quote X-Ray's tile (xray-result.module.css), shared — surface-bg, radius 8, 12/16 padding, a
 * sentence-case caption (the calm UI build 2026-10-27, T-06 — was uppercase), the number in heading-h3, a body-s help line. `grade` colours the number (Insights' turnaround grades);
 * `tone="primary"` is the X-Ray's primary tile.
 */
/** (the Dashboard redesigned, 2026-10-26 — P-03, additive) A figure's comparison: its words, and whether that way is good for the studio —
    green / red only then (his § 2); the full sentence as its tooltip when the strip writes it short. */
export type StatTileDelta = { text: string; tone?: 'good' | 'bad'; title?: string }
/** (P-03 · Q-04, additive) A figure's weeks as small bars, oldest first — the last is now (`ahead`: the first is now and the rest to come); a
    week with nothing to measure is null (a baseline tick). `label` names what one bar is, for its accessible name. */
export type StatTileTrend = { values: (number | null)[]; label: string; ahead?: boolean }
/** (the calm pass 2026-10-26, additive) A figure's weeks as ONE thin line (the Dashboard's Pulse cards — his "too busy … simplify" and the
    Claude Design option he took): the same values as `trend`, oldest first — the line passes over a week with nothing to measure; `target`
    draws a dashed mark across it (First response's 8 hours). */
export type StatTileSpark = StatTileTrend & { target?: number }
/** (the calm pass, additive) An age band's tone: `theirs` amber (a client's lateness — S-05, his correction 2), `late` red (ours and late). */
export type StatTileAging = { label: string; share: number; value: string; tone?: 'theirs' | 'late' }

export function StatTile({ label, value, figure, help, grade, tone, children, testId, wrap = true, press, badge, delta, trend, aging, note, look, spark }: {
  label: string
  value: ReactNode
  /** (held calls 2026-10-24, W3-16) The figure's words when `value` is an element (a tooltip around it) — so a long one is fitted on a phone as
      a plain figure is */
  figure?: string
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
  /* ── (the Dashboard redesigned, 2026-10-26 — P-03 · Q-04, additive: a tile without these draws exactly as before) ── */
  /** A small mark at the caption's end — a grade ("Slow"), "Early" (a house MetaChip). */
  badge?: ReactNode
  /** The comparison, before the help on its line ("▲ 3 vs last week · …"). */
  delta?: StatTileDelta
  /** The figure's weeks as bars under its line. */
  trend?: StatTileTrend
  /** A sum by age as one bar of bands (≤30 · 31–60 · 60+ days) — each band's share of the whole; its words under it. */
  aging?: StatTileAging[]
  /** A last, quieter line ("Costs not in yet on 2 projects"). */
  note?: ReactNode
  /* ── (the calm pass 2026-10-26, additive: a tile without these draws exactly as before) ── */
  /** `card`: the tile as a white card with no border and no shadow — its padding `--stat-tile-pad` (24), the value at the page's figure size,
      the help line beside its `spark`, an age bar thin and wordless (the help says it). The Dashboard's Pulse. */
  look?: 'card'
  /** The figure's weeks as one thin line at the help line's end (`look="card"`). */
  spark?: StatTileSpark
}) {
  const line = delta ? (
    <span className={styles.help}>
      <span className={styles.delta} data-tone={delta.tone} title={delta.title}>{delta.text}</span>
      {help ? <> · {help}</> : null}
    </span>
  ) : help ? <span className={styles.help}>{help}</span> : null
  const agingBar = aging?.length ? (
    <span className={styles.aging} role="img" aria-label={aging.map((a) => `${a.label} ${a.value}`).join(', ')}>
      {aging.filter((a) => a.share > 0).map((a) => <span key={a.label} className={styles.agingBand} data-band={aging.indexOf(a)} data-tone={a.tone} style={{ flexGrow: a.share }} />)}
    </span>
  ) : null
  const body = look === 'card' ? (
    <>
      {badge ? <span className={styles.tileHead}><span className={styles.label}>{label}</span>{badge}</span> : <span className={styles.label}>{label}</span>}
      <span className={styles.value} data-grade={grade}>{value}</span>
      {agingBar ? <span className={styles.agingWrap}>{agingBar}</span> : null}
      {line || spark ? <span className={styles.foot}>{line}{spark ? <SparkLine spark={spark} /> : null}</span> : null}
      {note ? <span className={styles.note}>{note}</span> : null}
      {children}
    </>
  ) : (
    <>
      {badge ? <span className={styles.tileHead}><span className={styles.label}>{label}</span>{badge}</span> : <span className={styles.label}>{label}</span>}
      <span className={styles.value} data-grade={grade}>{value}</span>
      {line}
      {trend ? <TrendBars trend={trend} /> : null}
      {agingBar ? (
        <span className={styles.agingWrap}>
          {agingBar}
          <span className={styles.agingWords} aria-hidden>{aging!.map((a) => a.label.replace(' days', '')).join(' · ')} days</span>
        </span>
      ) : null}
      {note ? <span className={styles.note}>{note}</span> : null}
      {children}
    </>
  )
  /* (held calls 2026-10-24, W3-16) a figure's longest word in characters — on a phone a long one ("S$121,087.50") steps down the type scale to
     fit its tile (stat-tile.module.css `data-fit`), never past it; a short one keeps its size */
  const words = figure ?? (typeof value === 'string' || typeof value === 'number' ? String(value) : '')
  const word = Math.max(0, ...words.split(/\s+/).map((w) => w.length))
  const attrs = { className: styles.tile, 'data-tone': tone, 'data-testid': testId, 'data-nowrap': wrap ? undefined : '', 'data-fit': word >= FIT_FROM ? String(Math.min(word, FIT_TO)) : undefined, 'data-look': look }
  if (press?.href) return <Link href={press.href} {...attrs} data-press="" aria-label={press.label}>{body}</Link>
  if (press?.onPress) return <button type="button" {...attrs} data-press="" aria-label={press.label} onClick={press.onPress}>{body}</button>
  return <div {...attrs}>{body}</div>
}

/**
 * (parity P-30 · C-04 · Q-15) The house row of number tiles — one rule for every page that lines tiles up: **one row from 1025 up**; at
 * 768–1024 no tile under ~176px (three or fewer stay in one row, four read 2 + 2, five or six 3 + 2 / 3 + 3); **two per row on a phone**,
 * an odd last tile taking the row (the projects listing's fifth, fix-A A-32) — down to 320 (held calls 2026-10-24, W3-16: one a row below 360,
 * fix-D D-40's, filled a 320 screen before the page's list began). Children
 * are the tiles (StatTile, or a ghost's tile); null children don't count.
 */
export function StatTiles({ children, testId, className, style, look }: { children: ReactNode; testId?: string; className?: string; style?: CSSProperties
  /** (the Dashboard redesigned, 2026-10-26 — P-03, additive) `strip`: the tiles as ONE bordered strip, a hairline between them instead of a
      gap and a fill — the Dashboard's Pulse. Absent, the row draws exactly as before. */
  look?: 'strip' }) {
  const n = Children.toArray(children).length
  const mid = n <= 3 ? n : Math.min(3, Math.ceil(n / 2))
  return (
    <div className={className ? `${styles.tiles} ${className}` : styles.tiles} data-testid={testId} data-odd={n % 2 ? '' : undefined} data-look={look}
         style={{ '--tiles': Math.max(1, n), '--tiles-mid': Math.max(1, mid), ...style } as CSSProperties}>
      {children}
    </div>
  )
}

/** (the Dashboard redesigned, 2026-10-26 — P-03 · Q-04, additive) A figure's weeks as small bars under its line: one hue light to the past,
    a deeper tint for now (never the filled primary — his § 2), a baseline tick for a week with nothing to measure; heights to the tallest. */
function TrendBars({ trend }: { trend: StatTileTrend }) {
  const nums = trend.values.filter((v): v is number => v !== null)
  const top = Math.max(0, ...nums)
  const nowAt = trend.ahead ? 0 : trend.values.length - 1
  return (
    <span className={styles.trend} role="img" aria-label={trend.label} data-ahead={trend.ahead ? '' : undefined}>
      {trend.values.map((v, i) => (
        <span key={i} className={styles.bar} data-now={i === nowAt ? '' : undefined} data-none={v === null || v === 0 ? '' : undefined}
              style={{ height: v === null || !top ? undefined : `${Math.max(8, Math.round((v / top) * 100))}%` }} />
      ))}
    </span>
  )
}

/** (the calm pass 2026-10-26, additive) A figure's weeks as one thin line — the data mark in the primary's own ink (a mark, never a filled
    surface — his correction 1), passing over a week with nothing to measure, a dot on now, and its `target` as a dashed mark across it. Heights to
    the tallest of the values and the mark. */
const SPARK_W = 88, SPARK_H = 28, SPARK_PAD = 3
function SparkLine({ spark }: { spark: StatTileSpark }) {
  const n = spark.values.length
  const nums = spark.values.filter((v): v is number => v !== null)
  if (!nums.length || n < 2) return null
  const top = Math.max(0, ...nums, spark.target ?? 0) || 1
  const x = (i: number) => SPARK_PAD + (i / (n - 1)) * (SPARK_W - 2 * SPARK_PAD)
  const y = (v: number) => SPARK_H - SPARK_PAD - (v / top) * (SPARK_H - 2 * SPARK_PAD)
  /* one line through the weeks that have a value (a week with nothing to measure is passed over, not drawn as a nought) */
  const d = spark.values.map((v, i) => (v === null ? null : `${x(i).toFixed(1)} ${y(v).toFixed(1)}`)).filter((p): p is string => p !== null).map((p, k) => `${k ? 'L' : 'M'}${p}`).join(' ')
  const nowAt = spark.ahead ? 0 : n - 1
  const now = spark.values[nowAt]
  return (
    <svg className={styles.spark} width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} role="img" aria-label={spark.label} data-ahead={spark.ahead ? '' : undefined}>
      {spark.target !== undefined ? <line className={styles.sparkTarget} x1={0} x2={SPARK_W} y1={y(spark.target)} y2={y(spark.target)} /> : null}
      {nums.length > 1 ? <path className={styles.sparkLine} d={d} /> : null}
      {now !== null && now !== undefined ? <circle className={styles.sparkNow} cx={x(nowAt)} cy={y(now)} r={2.5} /> : null}
    </svg>
  )
}
