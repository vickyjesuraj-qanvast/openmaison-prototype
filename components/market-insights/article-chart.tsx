'use client'

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Button } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { slotOf, type CategorySlot } from '@/lib/chart-palette'
import type { ChartSpec } from '@/lib/market-insights/markdown'
import palette from '@/components/om/category-palette.module.css'
import styles from './chart.module.css'

/*
 * (pending modules S25 — 1.0's ArticleChart, recharts' bar · stacked-bar · line · area · donut inside an article) A chart the editors put in an
 * article, drawn on the house pieces and the dataviz rules: the house categorical palette in its fixed order (components/om/category-palette:
 * four hues, then Other — 1.0's per-series colours are not carried), one axis, thin marks with 4px rounded ends, a 2px surface gap between
 * touching fills, a hairline grid, the value at each bar's tip, a legend for two series or more (none for one — the title names it), a
 * crosshair readout on lines (hover, touch, ← → from the keyboard), and **Show the numbers** — the same figures as a table, so nothing is
 * reached by hover alone. 1.0's donut is the house part-to-whole bar (Where costs go's: one bar over its legend, the biggest four named, the
 * rest Other). The source line under it is the editors'.
 */

const fmt = (v: number | null, s: Pick<ChartSpec, 'prefix' | 'suffix'>) => (v == null ? '—' : `${v < 0 ? '−' : ''}${s.prefix}${Math.abs(v).toLocaleString('en-SG', { maximumFractionDigits: 1 })}${s.suffix}`)
const slot = (i: number): CategorySlot => slotOf(i)

export function ArticleChart({ spec }: { spec: ChartSpec }) {
  const [table, setTable] = useState(false)
  const tableId = useId()
  const many = spec.series.length > 1 && spec.kind !== 'donut'
  return (
    <figure className={styles.chart} data-testid="insight-chart" data-kind={spec.kind}>
      {spec.title || spec.subtitle ? (
        <figcaption className={styles.head}>
          {spec.title ? <span className={styles.title}>{spec.title}</span> : null}
          {spec.subtitle ? <span className={styles.subtitle}>{spec.subtitle}</span> : null}
        </figcaption>
      ) : null}
      {many ? (
        <ul className={styles.legend} aria-label="Series">
          {spec.series.map((s, i) => <li key={s.key} className={styles.key}><span className={`${styles.swatch} ${palette[slot(i)]}`} data-mark={spec.kind === 'line' || spec.kind === 'area' ? 'line' : 'box'} aria-hidden />{s.label}</li>)}
        </ul>
      ) : null}
      {spec.kind === 'donut' ? <ShareBar spec={spec} /> : spec.kind === 'line' || spec.kind === 'area' ? <LinePlot spec={spec} /> : spec.kind === 'stacked-bar' ? <StackedRows spec={spec} /> : <Bars spec={spec} />}
      <div className={styles.foot}>
        {spec.source ? (
          <span className={styles.source} data-testid="insight-chart-source">
            {'Source: '}{spec.sourceUrl ? <a className={styles.sourceLink} href={spec.sourceUrl} target="_blank" rel="noopener noreferrer">{spec.source}</a> : spec.source}
          </span>
        ) : <span />}
        <Button variant="secondary" appearance="text" size="sm" onPress={() => setTable((t) => !t)} aria-expanded={table} aria-controls={tableId} data-testid="insight-chart-numbers">
          {table ? 'Hide the numbers' : 'Show the numbers'}
        </Button>
      </div>
      {table ? (
        <div className={styles.numbersWrap} id={tableId}>
          <table className={styles.numbers} data-testid="insight-chart-table">
            <thead><tr><th scope="col"><span className={styles.srOnly}>Label</span></th>{spec.series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead>
            <tbody>{spec.labels.map((l, r) => <tr key={`${l}-${r}`}><th scope="row">{l}</th>{spec.series.map((s) => <td key={s.key}>{fmt(s.values[r] ?? null, spec)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : null}
    </figure>
  )
}

/* ── bars: columns for a few short labels (years, months), else rows (long names read across) ─────────────────────────────── */

function Bars({ spec }: { spec: ChartSpec }) {
  const values = spec.series.flatMap((s) => s.values.map((v) => Math.max(0, v ?? 0)))
  const max = Math.max(1e-9, ...values)
  /* columns for one series over a few short labels; two series or long names read across (each value at its tip, never two crowding a cap) */
  const columns = spec.series.length === 1 && spec.labels.length <= 8 && spec.labels.every((l) => l.length <= 10)
  if (columns) {
    return (
      <div className={styles.cols} role="list" aria-label={spec.title || 'Chart'} data-testid="insight-chart-plot">
        {spec.labels.map((l, r) => (
          <div key={`${l}-${r}`} className={styles.col} role="listitem" aria-label={`${l}: ${spec.series.map((s) => `${spec.series.length > 1 ? `${s.label} ` : ''}${fmt(s.values[r] ?? null, spec)}`).join(', ')}`}>
            <div className={styles.colBars} aria-hidden data-many={spec.series.length > 1 || undefined}>
              {spec.series.map((s, i) => {
                const v = s.values[r] ?? null
                return (
                  <Tooltip key={s.key} label={`${spec.series.length > 1 ? `${s.label} · ` : ''}${l} · ${fmt(v, spec)}`}>
                    <span className={`${styles.colBar} ${palette[slot(i)]}`} style={{ height: `${(Math.max(0, v ?? 0) / max) * 100}%` }} data-testid="insight-bar">
                      <span className={styles.colValue}>{fmt(v, spec)}</span>
                    </span>
                  </Tooltip>
                )
              })}
            </div>
            <span className={styles.colLabel}>{l}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className={styles.rows} role="list" aria-label={spec.title || 'Chart'} data-testid="insight-chart-plot">
      {spec.labels.map((l, r) => (
        <div key={`${l}-${r}`} className={styles.row} role="listitem" aria-label={`${l}: ${spec.series.map((s) => `${spec.series.length > 1 ? `${s.label} ` : ''}${fmt(s.values[r] ?? null, spec)}`).join(', ')}`}>
          <span className={styles.rowLabel} aria-hidden>{l}</span>
          <span className={styles.rowBars} aria-hidden data-many={spec.series.length > 1 || undefined}>
            {spec.series.map((s, i) => {
              const v = s.values[r] ?? null
              return (
                <span key={s.key} className={styles.track}>
                  <Tooltip label={`${spec.series.length > 1 ? `${s.label} · ` : ''}${fmt(v, spec)}`}>
                    <span className={`${styles.bar} ${palette[slot(i)]}`} style={{ width: `calc((100% - var(--chart-value-room)) * ${Math.max(0, v ?? 0) / max})` }} data-testid="insight-bar" />
                  </Tooltip>
                  <span className={styles.value}>{fmt(v, spec)}</span>
                </span>
              )
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

/** A stacked bar per label: each series a segment, 2px apart, the total at the bar's end; a segment says its own on hover. */
function StackedRows({ spec }: { spec: ChartSpec }) {
  const totals = spec.labels.map((_, r) => spec.series.reduce((sum, s) => sum + Math.max(0, s.values[r] ?? 0), 0))
  const max = Math.max(1e-9, ...totals)
  return (
    <div className={styles.rows} role="list" aria-label={spec.title || 'Chart'} data-testid="insight-chart-plot">
      {spec.labels.map((l, r) => (
        <div key={`${l}-${r}`} className={styles.row} role="listitem" aria-label={`${l}: ${spec.series.map((s) => `${s.label} ${fmt(s.values[r] ?? null, spec)}`).join(', ')}; in all ${fmt(totals[r] ?? 0, spec)}`}>
          <span className={styles.rowLabel} aria-hidden>{l}</span>
          <span className={styles.rowBars} aria-hidden>
            <span className={styles.track}>
              <span className={styles.stack} style={{ width: `calc((100% - var(--chart-value-room)) * ${(totals[r] ?? 0) / max})` }}>
                {spec.series.map((s, i) => {
                  const v = Math.max(0, s.values[r] ?? 0)
                  return v > 0 ? (
                    <Tooltip key={s.key} label={`${s.label} · ${fmt(v, spec)}`}>
                      <span className={`${styles.seg} ${palette[slot(i)]}`} style={{ flexGrow: v }} data-testid="insight-bar" />
                    </Tooltip>
                  ) : null
                })}
              </span>
              <span className={styles.value}>{fmt(totals[r] ?? 0, spec)}</span>
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** 1.0's donut as the house part-to-whole bar: one bar of shares over its legend (name · share · value), the biggest four by name and the rest
    as Other — a fifth hue is never made up. */
function ShareBar({ spec }: { spec: ChartSpec }) {
  const s = spec.series[0]!
  const live = spec.labels.map((label, r) => ({ label, v: Math.max(0, s.values[r] ?? 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v)
  const total = live.reduce((sum, x) => sum + x.v, 0)
  if (!total) return null
  const named = live.slice(0, live.length > 5 ? 4 : live.length)
  const rest = live.slice(named.length)
  const parts: { key: string; label: string; names?: string; v: number; tone: CategorySlot }[] = [...named.map((x, i) => ({ key: x.label, label: x.label, v: x.v, tone: slot(i) })), ...(rest.length ? [{ key: '__other', label: `Other (${rest.length})`, names: rest.map((x) => x.label).join(', '), v: rest.reduce((sum, x) => sum + x.v, 0), tone: 'other' as const }] : [])]
  const pct = (v: number) => { const p = (v / total) * 100; return p < 1 ? '<1%' : `${Math.round(p)}%` }
  return (
    <div className={styles.share} data-testid="insight-chart-plot">
      <div className={styles.shareBar} role="img" aria-label={`${spec.title || 'Shares'}: ${parts.map((p) => `${p.label} ${pct(p.v)}`).join(', ')}`}>
        {parts.map((p) => <Tooltip key={p.key} label={`${p.names ?? p.label} · ${fmt(p.v, spec)} · ${pct(p.v)}`}><span className={`${styles.shareSeg} ${palette[p.tone]}`} style={{ flexGrow: p.v }} data-testid="insight-bar" /></Tooltip>)}
      </div>
      <ul className={styles.shareLegend}>
        {parts.map((p) => (
          <li key={p.key} className={styles.shareItem}>
            <span className={`${styles.shareSwatch} ${palette[p.tone]}`} aria-hidden />
            <span className={styles.shareName}>{p.label}{p.names ? <span className={styles.srOnly}>{`: ${p.names}`}</span> : null}</span>
            <span className={styles.sharePct}>{pct(p.v)}</span>
            <span className={styles.shareAmount}>{fmt(p.v, spec)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── lines and areas: one axis, a hairline grid, 2px lines, the end value, the crosshair ─────────────────────────────────────── */

function niceStep(span: number, ticks = 4) {
  const raw = span / ticks
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}
/** The axis: clean steps from the data's floor to its top; an area always starts at zero (its fill is the amount). */
export function axisOf(values: number[], fromZero: boolean): number[] {
  let lo = Math.min(...values), hi = Math.max(...values)
  if (fromZero) lo = Math.min(0, lo)
  if (hi === lo) { hi = lo + 1 }
  const step = niceStep(hi - lo)
  const start = Math.floor(lo / step) * step, end = Math.ceil(hi / step) * step
  const out: number[] = []
  for (let v = start; v <= end + step / 1e6; v += step) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

function LinePlot({ spec }: { spec: ChartSpec }) {
  const wrap = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState(640)
  const [at, setAt] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { if (e) setW(Math.max(240, Math.round(e.contentRect.width))) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const area = spec.kind === 'area' && spec.series.length === 1
  const values = spec.series.flatMap((s) => s.values.filter((v): v is number => v != null))
  const ticks = axisOf(values, area)
  const lo = ticks[0]!, hi = ticks[ticks.length - 1]!
  const n = spec.labels.length
  const tickText = ticks.map((t) => fmt(t, spec))
  const ends = spec.series.map((s) => [...s.values].reverse().find((v) => v != null) ?? null)
  const endText = ends.map((v) => fmt(v, spec))
  const H = w < 480 ? 200 : 240, top = 12, bottom = 28
  const left = Math.max(...tickText.map((t) => t.length)) * 7 + 12
  const right = spec.series.length <= 4 ? Math.max(...endText.map((t) => t.length)) * 7 + 16 : 12
  const x = (i: number) => left + (n === 1 ? (w - left - right) / 2 : (i / (n - 1)) * (w - left - right))
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bottom)
  const path = (vals: (number | null)[]) => vals.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).reduce<string[]>((acc, p, i, all) => { if (p) acc.push(`${i === 0 || !all[i - 1] ? 'M' : 'L'}${p}`); return acc }, []).join(' ')
  /* end labels only while they don't collide (14px apart); else the legend and the readout carry the values */
  const endY = ends.map((v) => (v == null ? null : y(v)))
  const sorted = endY.filter((v): v is number => v != null).sort((a, b) => a - b)
  const endsFit = spec.series.length <= 4 && sorted.every((v, i) => i === 0 || v - sorted[i - 1]! >= 14)
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((w - left - right) / 56))))
  const pick = (clientX: number) => {
    const r = wrap.current?.getBoundingClientRect()
    if (!r || n === 0) return
    const px = clientX - r.left
    const i = n === 1 ? 0 : Math.round(((px - left) / (w - left - right)) * (n - 1))
    setAt(Math.min(n - 1, Math.max(0, i)))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setAt((a) => Math.min(n - 1, Math.max(0, (a ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1)))) }
    else if (e.key === 'Escape' && at != null) { e.stopPropagation(); setAt(null) }
  }
  const readLeft = at == null ? 0 : Math.min(Math.max(x(at) - 90, 0), w - 180)
  return (
    <div ref={wrap} className={styles.plot} tabIndex={0} role="group" data-testid="insight-chart-plot" data-kb-own
         aria-label={`${spec.title || 'Chart'} — ${spec.series.map((s, i) => `${s.label}: from ${fmt(s.values.find((v) => v != null) ?? null, spec)} to ${endText[i]}`).join('; ')}. Left and right arrows read each point.`}
         onPointerMove={(e: PointerEvent) => pick(e.clientX)} onPointerDown={(e: PointerEvent) => pick(e.clientX)} onPointerLeave={(e: PointerEvent) => { if (e.pointerType === 'mouse') setAt(null) }}
         onFocus={() => setAt((a) => a ?? n - 1)} onBlur={() => setAt(null)} onKeyDown={onKey}>
      <svg className={styles.svg} width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden>
        {ticks.map((t, i) => (
          <g key={t}>
            <line className={styles.grid} x1={left} x2={w - right} y1={y(t)} y2={y(t)} />
            <text className={styles.tick} x={left - 8} y={y(t)} dy="0.35em" textAnchor="end">{tickText[i]}</text>
          </g>
        ))}
        {spec.labels.map((l, i) => ((i % every === 0 && n - 1 - i >= every) || i === n - 1) ? <text key={`${l}-${i}`} className={styles.tick} x={x(i)} y={H - 8} textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{l}</text> : null)}
        {area ? <path className={`${styles.wash} ${palette[slot(0)]}`} d={`${path(spec.series[0]!.values)} L${x(n - 1)},${y(lo)} L${x(0)},${y(lo)} Z`} /> : null}
        {spec.series.map((s, i) => <path key={s.key} className={`${styles.line} ${palette[slot(i)]}`} d={path(s.values)} data-testid="insight-line" />)}
        {spec.series.map((s, i) => { const k = s.values.length - 1 - [...s.values].reverse().findIndex((v) => v != null); const v = s.values[k]; return v == null || k >= s.values.length ? null : <circle key={s.key} className={`${styles.dot} ${palette[slot(i)]}`} cx={x(k)} cy={y(v)} r={4} /> })}
        {endsFit ? spec.series.map((s, i) => (endY[i] == null ? null : <text key={s.key} className={styles.endLabel} x={w - right + 8} y={endY[i]!} dy="0.35em">{endText[i]}</text>)) : null}
        {at != null ? (
          <g>
            <line className={styles.cross} x1={x(at)} x2={x(at)} y1={top} y2={H - bottom} />
            {spec.series.map((s, i) => { const v = s.values[at]; return v == null ? null : <circle key={s.key} className={`${styles.dot} ${palette[slot(i)]}`} cx={x(at)} cy={y(v)} r={4} /> })}
          </g>
        ) : null}
      </svg>
      {at != null ? (
        <div className={styles.readout} style={{ left: readLeft }} data-testid="insight-chart-readout" aria-live="polite">
          <span className={styles.readoutLabel}>{spec.labels[at]}</span>
          {spec.series.map((s, i) => (
            <span key={s.key} className={styles.readoutRow}>
              <span className={`${styles.readoutKey} ${palette[slot(i)]}`} aria-hidden />
              <span className={styles.readoutValue}>{fmt(s.values[at] ?? null, spec)}</span>
              {spec.series.length > 1 ? <span className={styles.readoutName}>{s.label}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
