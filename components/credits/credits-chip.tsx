'use client'

import { useRef, useState } from 'react'
import { Tooltip } from '@/components/om/tooltip'
import { CreditToken } from '@/components/om/credit-token'
import { fmtCredits, levelOf, railFigure, toneOf } from '@/lib/credits/model'
import { CreditsCard } from './credits-card'
import { useCredits, useCreditsGstLine } from './credits-client'
import styles from './credits-chip.module.css'

/**
 * (REG-701, Q-09) The balance where there is no rail — the AI Visualizer's top bar, where most credits go. The token and the figure the
 * rail would show (the studio's balance, a capped member's amount left, or what an uncapped member has used); its press opens the same
 * credits card, under the chip. A render's charge moves it at once (the one client store).
 */
export function CreditsChip() {
  const s = useCredits(null)
  const gstLine = useCreditsGstLine()
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  if (!s) return null
  const fig = railFigure(s), tone = toneOf(s)
  return (
    <>
      <Tooltip label={fig.tip} disabled={open}>
        <button ref={btn} type="button" className={styles.chip} data-tone={tone} data-open={open || undefined} aria-haspopup="dialog" aria-expanded={open}
                aria-label={`${fig.tip}. Open AI credits`} onClick={() => setOpen((o) => !o)} data-testid="credits-chip">
          <CreditToken size={20} level={levelOf(s)} tone={tone} />
          <span className={styles.n}>{fmtCredits(fig.value)}</span>
        </button>
      </Tooltip>
      <CreditsCard open={open} anchor={btn} placement="chip" onClose={() => setOpen(false)} summary={s} gstLine={gstLine} />
    </>
  )
}
