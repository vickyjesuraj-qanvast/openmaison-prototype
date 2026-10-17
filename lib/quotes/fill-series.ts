/**
 * (S45C — S43D's NB-07 (c), 1.0's newer branches; as recommended — her ask 2026-10-17) Drag-fill continues a series, as Excel's fill handle
 * does over a selected run (the Excel benchmark's rule: copy the job, not Excel's chrome — REG-475…477).
 *
 *   · one cell copies, as before (REG-477) — this module is only asked about a run of two or more;
 *   · a run of numbers goes on by its step — the average step from the first to the last, so 1, 2 → 3, 4 … and 10, 20 → 30, 40 …,
 *     and dragged above the run it goes back the other way (1, 2 → 0, −1 …);
 *   · a run with anything else in it (words, an empty cell) repeats in turn — Living, Kitchen → Living, Kitchen … — upwards in reverse;
 *   · a step keeps the run's own decimals, so 0.1, 0.2 → 0.3, never 0.30000000000000004.
 *
 * Pure: the Items table reads each run's values in its column's own unit (a quantity, a money column in cents, a percentage) and writes each
 * answer through that column's own rule (items-section.tsx `seriesPatch`).
 */

export type FillValue = number | string | null

export type SeriesFill = {
  /** the values for the rows below the run, nearest first */ below: FillValue[]
  /** the values for the rows above the run, nearest first */ above: FillValue[]
  /** the step a run of numbers goes on by; null when the run repeats */ step: number | null
}

const decimalsOf = (n: number): number => {
  if (Number.isInteger(n)) return 0
  const s = String(n)
  const e = /e-(\d+)$/.exec(s)
  if (e) return Math.min(6, Number(e[1]))
  return Math.min(6, (s.split('.')[1] ?? '').length)
}
const roundTo = (n: number, d: number): number => { const f = 10 ** d; const r = Math.round(n * f) / f; return Object.is(r, -0) ? 0 : r }

/** Whether every value of a run is a number — the run then goes on by its step. */
export const isNumberRun = (seeds: readonly FillValue[]): seeds is number[] => seeds.length >= 2 && seeds.every((v) => typeof v === 'number' && Number.isFinite(v))

/** What a run of `seeds` (top to bottom) fills into `below` rows under it and `above` rows over it. */
export function seriesFill(seeds: readonly FillValue[], below: number, above: number): SeriesFill {
  const n = seeds.length
  const nb = Math.max(0, Math.floor(below)), na = Math.max(0, Math.floor(above))
  if (n === 0) return { below: [], above: [], step: null }
  if (isNumberRun(seeds)) {
    const first = seeds[0]!, last = seeds[n - 1]!
    const d = Math.max(...seeds.map(decimalsOf))
    const step = roundTo((last - first) / (n - 1), Math.max(d, n > 2 ? Math.min(6, d + 2) : d))
    return {
      below: Array.from({ length: nb }, (_, k) => roundTo(last + step * (k + 1), Math.max(d, decimalsOf(step)))),
      above: Array.from({ length: na }, (_, k) => roundTo(first - step * (k + 1), Math.max(d, decimalsOf(step)))),
      step,
    }
  }
  return {
    below: Array.from({ length: nb }, (_, k) => seeds[k % n] ?? null),
    above: Array.from({ length: na }, (_, k) => seeds[n - 1 - (k % n)] ?? null),
    step: null,
  }
}
