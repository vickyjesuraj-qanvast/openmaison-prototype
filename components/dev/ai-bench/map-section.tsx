'use client'

import Link from 'next/link'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { withFrom } from '@/lib/nav'
import { BENCH_PATH, EXPERIMENTS, V1_BENCHES, VIEW_COPY, type BenchView } from '@/lib/dev/ai-benches'
import styles from './ai-bench.module.css'

/**
 * (pending modules S41) 1.0's seven sandboxes, each accounted for: the four experiments that only lived there (each opening its view on this
 * bench), then each sandbox — its address and its own words, what it tried, where 2.0 does that job (a door with the way back), what is on
 * this bench, the harness that checks it in Node, the seams a model would plug into, and what was left behind with its reason.
 */
export function MapSection({ open }: { open: (v: BenchView) => void }) {
  return (
    <div className={styles.stack} data-testid="bench-map">
      <section className={styles.stack} aria-labelledby="bench-experiments-title">
        <div className={styles.cardHead}>
          <h2 id="bench-experiments-title" className={styles.cardTitle}>{VIEW_COPY.experiments.title}</h2>
          <p className={styles.cardHelp}>{VIEW_COPY.experiments.help}</p>
        </div>
        <div className={styles.experiments}>
          {EXPERIMENTS.map((x) => (
            <article key={x.key} className={styles.experiment} data-testid={`bench-experiment-${x.key}`}>
              <h3 className={styles.expName}>{x.name}</h3>
              <p className={styles.label}>In 1.0</p><p className={styles.line}>{x.v1}</p>
              <p className={styles.label}>Here, by rule</p><p className={styles.line}>{x.built}</p>
              <p className={styles.label}>Its limit</p><p className={styles.line}>{x.limit}</p>
              <span><Button variant="secondary" appearance="text" iconEnd={<Icon name="arrow_forward" size={18} />} onPress={() => open(x.view)} data-testid={`bench-open-${x.key}`}>Open it</Button></span>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.stack} aria-labelledby="bench-seven-title">
        <div className={styles.cardHead}>
          <h2 id="bench-seven-title" className={styles.cardTitle}>{VIEW_COPY.seven.title}</h2>
          <p className={styles.cardHelp}>{VIEW_COPY.seven.help}</p>
        </div>
        <div className={styles.benches}>
          {V1_BENCHES.map((b) => (
            <article key={b.key} className={styles.card} data-testid={`bench-v1-${b.key}`} aria-labelledby={`bench-v1-${b.key}-title`}>
              <div className={styles.cardHead}>
                <h3 id={`bench-v1-${b.key}-title`} className={styles.cardTitle}>{b.name}</h3>
                <p className={styles.line}><span className={styles.code}>{b.path}</span></p>
                <p className={styles.said}>{`“${b.said}”`}</p>
              </div>
              <div className={styles.facts}>
                <div className={styles.fact}>
                  <p className={styles.label}>What it tried</p>
                  <ul className={styles.list}>{b.tried.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
                <div className={styles.fact}>
                  <p className={styles.label}>Where 2.0 does it</p>
                  <div className={styles.homes}>
                    {b.homes.map((h) => (
                      <div key={h.label} className={styles.home}>
                        <Link className={styles.homeLink} href={withFrom(h.href, BENCH_PATH)} data-testid={`bench-home-${b.key}`}>{h.label}</Link>
                        <p className={styles.line}>{h.what}</p>
                      </div>
                    ))}
                  </div>
                  {b.here?.length ? (
                    <>
                      <p className={styles.label}>On this bench</p>
                      <div className={styles.row}>{b.here.map((h) => <Button key={h.label} variant="secondary" appearance="outlined" size="md" onPress={() => open(h.view)} data-testid={`bench-here-${b.key}-${h.view}`}>{h.label}</Button>)}</div>
                      {b.here.some((h) => h.line) ? <p className={styles.line}>{b.here.filter((h) => h.line).map((h) => `${h.label}: ${h.line}`).join(' ')}</p> : null}
                    </>
                  ) : null}
                </div>
                <div className={styles.fact}>
                  <p className={styles.label}>Its harness</p>
                  <ul className={styles.list}>{b.harness.map((h) => <li key={h}><span className={styles.code}>{h}</span></li>)}</ul>
                  <p className={styles.label}>Where a model plugs in</p>
                  <div className={styles.row}>{b.seams.map((k) => <Button key={k} variant="secondary" appearance="text" size="md" onPress={() => open('seams')} data-testid={`bench-seam-${b.key}-${k}`}>{k}</Button>)}</div>
                </div>
                <div className={styles.fact}>
                  <p className={styles.label}>Left behind</p>
                  <ul className={styles.list}>{b.kept.map((k) => <li key={k}>{k}</li>)}</ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
