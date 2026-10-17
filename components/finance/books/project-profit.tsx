'use client'

import { StatTile } from '@/components/om/stat-tile'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { money2 } from '@/lib/quotes/math'
import { profitShown, type ProfitView } from '@/lib/finance/profit'
import styles from '@/components/projects/money/money.module.css'

/**
 * (gaps build F2 — F2-Q2 · Q3, Q-20) A project's profit, for Owners and Admins only (the server hands nobody else the figures): contract value −
 * committed costs, its margin's word (Healthy ≥ 20% · Tight · At risk) and the cash so far (collected − paid out).
 * (simplify S-07 · S-09 · Q-08) ONE tile now — the Money tab's third, beside To collect and To pay: the figure is "--" until costs pass a tenth of
 * the contract (`profitGrade` — today's Margin early-estimate rule extended to the figure), its word rides as the tile's chip (Healthy / Tight /
 * At risk / *Early estimate* / *No costs yet*), the cash so far is its line, and how it is worked out is its hover. The Margin and Cash so far
 * tiles folded into it; *What the numbers say* left the tab — its non-duplicates are Needs you rows (lib/projects/money-needs.ts) and the full
 * list stays in Company › Reports › Finance.
 */
export function ProfitTile({ profit: p, onPress }: { profit: ProfitView
  /** (simplify round 2 — P3 §6.2, after R2-A's two tiles) pressing the tile goes to its list — Costs, where the figure comes from; the tile is then
      the one focus stop (its value's hover stays, un-focusable inside it) */
  onPress?: () => void }) {
  const shown = profitShown(p)
  const how = p.state === 'no_contract' ? 'Profit needs a contract value'
    : `Contract ${money2(p.contractMinor)} − costs ${money2(p.committedMinor)}${shown.graded === 'graded' ? ` = ${money2(p.profitMinor)}, ${p.marginPct}% of the contract` : ' — shown once costs pass a tenth of the contract'}`
  return (
    <StatTile label="Profit" value={<Tooltip label={how}><span tabIndex={onPress ? undefined : 0} className={styles.tileValue}>{shown.value}</span></Tooltip>} grade={shown.grade} testId="tile-profit"
              press={onPress ? { label: `Profit ${shown.value}, ${shown.word}. ${how}. Opens Costs`, onPress } : undefined}
              help={<span className={styles.tileHelp}><span data-testid="tile-profit-word"><MetaChip color={shown.tone}>{shown.word}</MetaChip></span><span>{p.cashMinor < 0 ? `The studio is funding it — ${money2(-p.cashMinor)} more paid out than collected` : `Cash so far ${money2(p.cashMinor)}`}</span></span>} />
  )
}
