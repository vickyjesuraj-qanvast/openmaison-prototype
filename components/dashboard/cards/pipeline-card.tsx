'use client'

import Link from 'next/link'
import { pipelineLine, type PipelineData } from '@/lib/dashboard/cards'
import { CardFrame } from './card-frame'
import styles from './cards.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his mark P-07; lane D3) **Pipeline** — "Where are the leads?": the leads this member sees by stage,
 * New → Won, each bar to the largest; a stage opens the Leads listing scoped to it, with the way back. Every count is the listing's own.
 *
 * (the calm pass, 2026-10-26 — the Claude Design option with his corrections, brief-calm.md § 1; lane C3) Label · bar · count, the bars in the
 * primary's tones darkening toward Won (a data mark, not a button — § 2.1); the head's one fact is how many are open; under the bars
 * "12 going quiet" — Sales' own rule and count, a door to its list for an Owner or an Admin, words for anyone else.
 * (2026-10-27, his "take a call from our 2.0 consistency pov") The card's own stuck rule — an amber dot on a stage, "14 stuck" — is gone: no
 * other page knew it, Finance › To do's Stuck already means "waiting on someone else", and it opened no list. Going quiet is 2.0's one word for
 * a lead that needs a nudge.
 */
export function PipelineCard({ data }: { data: PipelineData | null }) {
  if (!data) return null
  const line = pipelineLine(data)
  return (
    <CardFrame card="pipeline" title="Pipeline" testId="pipeline" legend={<span className={styles.headFact} data-testid="pipeline-open">{data.open} open</span>}>
      <div className={styles.funnel}>
        {data.stages.map((s, i) => {
          const width = data.max ? Math.max(s.count ? 4 : 0, Math.round((s.count / data.max) * 100)) : 0
          const label = `${s.label}: ${s.count === 1 ? '1 lead' : `${s.count} leads`} — open the Leads listing`
          return (
            <Link key={s.stage} href={s.href} className={styles.stageRow} aria-label={label} data-testid="pipeline-stage" data-stage={s.stage} data-step={i} data-won={s.stage === 'Won' || undefined}>
              <span className={styles.stageName}>{s.label}</span>
              <span className={styles.stageTrack}>
                <span className={styles.stageBar} style={{ width: `${width}%` }} />
              </span>
              <span className={styles.stageCount}>{s.count}</span>
            </Link>
          )
        })}
      </div>
      <p className={styles.funnelFoot} data-testid="pipeline-line">
        {line.quiet ? (data.quietHref ? <Link href={data.quietHref} className={styles.textLink} data-testid="pipeline-quiet">{line.quiet}</Link> : <span data-testid="pipeline-quiet">{line.quiet}</span>) : null}
        {line.none ? <span>{line.none}</span> : null}
      </p>
    </CardFrame>
  )
}
