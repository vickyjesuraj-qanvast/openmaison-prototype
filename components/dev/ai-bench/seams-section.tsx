'use client'

import { SERVICES, type ServiceKind } from '@/lib/services/registry'
import { BENCH_SEAMS, VIEW_COPY } from '@/lib/dev/ai-benches'
import styles from './ai-bench.module.css'

const KIND: Record<ServiceKind, string> = { provider: 'a real service, behind a slot', rule: 'by rule where 1.0 asked a model', feed: 'a feed', route: 'an address that is called', integration: 'a studio’s connection' }

/**
 * (pending modules S41) Where a model plugs into what this bench shows — read straight from S34's registry (lib/services/registry.ts, the same
 * list the developers' document services.md and GET /api/services answer from): what stands in today, what goes in and comes out, how it
 * fails, the one call to swap, 1.0's code it replaces. No model is called anywhere on this page.
 */
export function SeamsSection() {
  const seams = BENCH_SEAMS.map((k) => SERVICES.find((s) => s.key === k)).filter((s): s is (typeof SERVICES)[number] => !!s)
  return (
    <div className={styles.stack} data-testid="bench-seams">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{VIEW_COPY.seams.title}</h2>
        <p className={styles.cardHelp}>{VIEW_COPY.seams.help}</p>
      </div>
      <div className={styles.seams}>
        {seams.map((s) => (
          <article key={s.key} className={styles.card} data-testid={`bench-seam-${s.key}`} aria-labelledby={`bench-seam-${s.key}-title`}>
            <div className={styles.cardHead}>
              <h3 id={`bench-seam-${s.key}-title`} className={styles.cardTitle}>{s.name}</h3>
              <p className={styles.line}><span className={styles.code}>{s.key}</span>{` · ${s.area} · ${KIND[s.kind]}`}</p>
            </div>
            <dl className={styles.terms}>
              <dt>Today</dt><dd>{s.standIn}</dd>
              <dt>In</dt><dd>{s.contract.in}</dd>
              <dt>Out</dt><dd>{s.contract.out}</dd>
              <dt>When it fails</dt><dd>{s.contract.fails}</dd>
              <dt>Swap</dt><dd><span className={styles.code}>{s.swap.call}</span>{' — '}<span className={styles.code}>{s.swap.file}</span></dd>
              <dt>1.0’s code</dt><dd>{s.v1}</dd>
              {s.env.length ? <><dt>1.0’s keys</dt><dd>{s.env.join(' · ')}</dd></> : null}
              {s.note ? <><dt>Note</dt><dd>{s.note}</dd></> : null}
            </dl>
          </article>
        ))}
      </div>
    </div>
  )
}
