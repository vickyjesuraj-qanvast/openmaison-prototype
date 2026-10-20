'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { BENCH_PATH, BENCH_VIEWS, BENCH_WORDS, isBenchView, type BenchView } from '@/lib/dev/ai-benches'
import { useBenchRoom } from './use-bench-room'
import { MapSection } from './map-section'
import { DepthSection } from './depth-section'
import { LookSection } from './look-section'
import { ClipSection } from './clip-section'
import { ExtendSection } from './extend-section'
import { CornersSection } from './corners-section'
import { SeamsSection } from './seams-section'
import { BenchGhost } from './bench-ghost'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './ai-bench.module.css'

/**
 * (pending modules S41 — card studio:ai-sandboxes; his "build all of them" 2026-10-11 and "nothing left behind from 1.0 to 2.0" 2026-10-12)
 * **AI benches** — the developers' page for 1.0's seven AI sandboxes: the map (each sandbox, where 2.0 does its job, what was left behind),
 * the four experiments that only lived there built by rule (Depth · Look around with its camera moves · Orbit clip · Extend), 1.0's floor-plan
 * corner editor (Plan corners), and the seams a model would plug into. No model is called. Not in any studio menu (the rail, Tools, Company,
 * ⌘K, a phone's More): /dev/ai-bench, a production build answering 404 unless OPENMAISON_DEV_PREVIEWS=1 (app/dev/ai-bench/layout.tsx).
 * The view lives in the address (`?view=depth`), so a reload or a link lands on it; the photo views share one room and its depth.
 */
export function AiBench() {
  const params = useSearchParams()
  const [view, setView] = useState<BenchView>(() => { const v = params.get('view'); return isBenchView(v) ? v : 'map' })
  const bench = useBenchRoom(view === 'depth' || view === 'look' || view === 'clip' || view === 'extend')
  const open = (v: BenchView) => {
    setView(v)
    try { window.history.replaceState(null, '', v === 'map' ? BENCH_PATH : `${BENCH_PATH}?view=${v}`) } catch { /* the address is a convenience */ }
    window.scrollTo({ top: 0 })
  }
  return (
    <PageReveal skeleton={<BenchGhost />}>
      <div className={pageStyles.body} data-testid="ai-bench" data-view={view}>
        <PageHeader title={BENCH_WORDS.title} />
        <div className={styles.content}>
          <p className={styles.note} data-testid="bench-note"><Icon name="code" size={20} weight={300} />{BENCH_WORDS.intro}</p>
          <div className={styles.bar}>
            <div className={styles.views}>
              <ChipRail label="Bench" className={styles.rail}>
                <Chips label="Bench" testId="bench-views" value={view} onChange={(v) => isBenchView(v) && open(v)} options={BENCH_VIEWS.map((b) => ({ value: b.key, label: b.label }))} />
              </ChipRail>
            </div>
          </div>
          {view === 'map' ? <MapSection open={open} />
            : view === 'depth' ? <DepthSection bench={bench} />
            : view === 'look' ? <LookSection bench={bench} />
            : view === 'clip' ? <ClipSection bench={bench} />
            : view === 'extend' ? <ExtendSection bench={bench} />
            : view === 'corners' ? <CornersSection />
            : <SeamsSection />}
        </div>
      </div>
    </PageReveal>
  )
}
