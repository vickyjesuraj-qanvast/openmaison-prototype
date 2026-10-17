'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostHead, GhostTextButton, Line, Para, Slot, Words } from '@/components/shell/ghost-kit'
import { BENCH_VIEWS, BENCH_WORDS, EXPERIMENTS, V1_BENCHES, VIEW_COPY, isBenchView, type BenchView } from '@/lib/dev/ai-benches'
import { EXTEND_FACTORS, EXTEND_MODES } from '@/lib/visualizer/spatial/extend'
import { ROOM_OPTIONS } from './use-bench-room'
import styles from './ai-bench.module.css'

const PHOTO_RATIO = '900 / 603'   // the sample rooms' photos — the room the photo views open on
/** The room bar as it stands: the rooms' chips, and the reading's line under them. */
const RoomGhost = () => (
  <div className={`${styles.stack} ${styles.tight}`}>
    <div className={styles.views}><div className={styles.rail}><GhostChips rail labels={ROOM_OPTIONS.map((o) => o.label)} /></div></div>
    <Words as="p" className={styles.line}>The sample living room · read in 1.5 s · the camera read off its walls</Words>
  </div>
)
const Stage = ({ ratio = PHOTO_RATIO, cls = styles.stage }: { ratio?: string; cls?: string }) => <div className={cls} style={{ '--ratio': ratio } as CSSProperties} />
const SwitchRow = ({ label }: { label: string }) => <span className={styles.switchRow}><Slot kind="switch" /><Words>{label}</Words></span>
const Head = ({ view }: { view: Exclude<BenchView, 'map' | 'seams'> }) => (
  <div className={styles.cardHead}>
    <Words as="h2" className={styles.cardTitle}>{VIEW_COPY[view].title}</Words>
    <Words as="p" className={styles.cardHelp}>{VIEW_COPY[view].help}</Words>
  </div>
)
const Card = ({ children }: { children: ReactNode }) => <div className={styles.card}>{children}</div>

/**
 * (pending modules S41 · REG-708) The AI bench's ghost — the page's own layout on its own classes: the L1 header, the developers-only note, the
 * views' chip rail, then the open view (`?view=`, as the page reads it), row for row: the map's four experiment cards and the first sandbox's
 * card; a photo view's card (its title and help, the rooms' chips and the reading's line, its own controls' row, the photo's box); Plan
 * corners' card; or the seams' head and first card. Its loading.tsx and the page's PageReveal draw it.
 */
export function BenchGhost() {
  const params = useSearchParams()
  const v = params.get('view')
  const view: BenchView = isBenchView(v) ? v : 'map'
  return (
    <GhostSheet label="Loading the AI benches" l1>
      <GhostHead title={124} />
      <div className={styles.content} aria-hidden>
        <p className={styles.note}><Bone w={20} h={20} r={4} /><Words>{BENCH_WORDS.intro}</Words></p>
        <div className={styles.bar}><div className={styles.views}><div className={styles.rail}><GhostChips rail labels={BENCH_VIEWS.map((b) => b.label)} /></div></div></div>
        {view === 'map' ? (
          <div className={styles.stack}>
            <div className={styles.stack}>
              <div className={styles.cardHead}>
                <Words as="h2" className={styles.cardTitle}>{VIEW_COPY.experiments.title}</Words>
                <Words as="p" className={styles.cardHelp}>{VIEW_COPY.experiments.help}</Words>
              </div>
              <div className={styles.experiments}>
                {EXPERIMENTS.map((x) => (
                  <div key={x.key} className={styles.experiment}>
                    <Words as="h3" className={styles.expName}>{x.name}</Words>
                    <Words as="p" className={styles.label}>In 1.0</Words><Words as="p" className={styles.line}>{x.v1}</Words>
                    <Words as="p" className={styles.label}>Here, by rule</Words><Words as="p" className={styles.line}>{x.built}</Words>
                    <Words as="p" className={styles.label}>Its limit</Words><Words as="p" className={styles.line}>{x.limit}</Words>
                    <span><GhostTextButton label="Open it" iconEnd /></span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.stack}>
              <div className={styles.cardHead}>
                <Words as="h2" className={styles.cardTitle}>{VIEW_COPY.seven.title}</Words>
                <Words as="p" className={styles.cardHelp}>{VIEW_COPY.seven.help}</Words>
              </div>
              <div className={styles.benches}>
                <Card>
                  <div className={styles.cardHead}>
                    <Words as="h3" className={styles.cardTitle}>{V1_BENCHES[0]!.name}</Words>
                    <p className={styles.line}><Line w={190} lh={16} h={10} /></p>
                    <Words as="p" className={styles.said}>{`“${V1_BENCHES[0]!.said}”`}</Words>
                  </div>
                  <div className={styles.facts}>
                    <div className={styles.fact}><Words as="p" className={styles.label}>What it tried</Words><Para lines={8} /></div>
                    <div className={styles.fact}><Words as="p" className={styles.label}>Where 2.0 does it</Words><Para lines={4} /></div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : view === 'seams' ? (
          <div className={styles.stack}>
            <div className={styles.cardHead}>
              <Words as="h2" className={styles.cardTitle}>{VIEW_COPY.seams.title}</Words>
              <Words as="p" className={styles.cardHelp}>{VIEW_COPY.seams.help}</Words>
            </div>
            <div className={styles.seams}><Card><Line w={180} lh={24} h={14} /><Line w={260} /><Para lines={6} /></Card></div>
          </div>
        ) : view === 'depth' ? (
          <Card>
            <Head view="depth" />
            <RoomGhost />
            <div className={styles.row}><GhostChips labels={['Depth', 'What it read']} /><span className={styles.rowEnd}><Slot kind="btn" w={224} /></span></div>
            <Stage />
          </Card>
        ) : view === 'look' ? (
          <Card>
            <Head view="look" />
            <RoomGhost />
            <div className={styles.row}>
              <div className={styles.slider}><Words as="span">Room depth</Words><Words as="span">As read</Words><input type="range" disabled tabIndex={-1} aria-hidden /></div>
              <SwitchRow label="Trim edges" /><SwitchRow label="Fill the edges" />
              <span className={styles.rowEnd}><GhostTextButton label="Download this view" icon /><GhostTextButton label="Back to the photo" icon /></span>
            </div>
            <Stage />
          </Card>
        ) : view === 'clip' ? (
          <Card>
            <Head view="clip" />
            <GhostChips labels={['The photo’s room', 'A 3D layout']} />
            <RoomGhost />
            <Stage />
          </Card>
        ) : view === 'extend' ? (
          <Card>
            <Head view="extend" />
            <RoomGhost />
            <div className={styles.row}>
              <GhostChips labels={EXTEND_MODES.map((m) => m.label)} /><GhostChips labels={EXTEND_FACTORS.map((f) => `${f}×`)} />
              <span className={styles.rowEnd}><Slot kind="btn" w={124} /></span>
            </div>
            <Stage ratio="1260 / 844" />
          </Card>
        ) : (
          <Card>
            <Head view="corners" />
            <div className={styles.row}><GhostChips labels={['The demo plan photo', 'Your plan photo']} /><span className={styles.rowEnd}><GhostTextButton label="Start the corners again" icon /></span></div>
            <Words as="p" className={styles.line}>The corners start on the sheet the rule found (S28’s paper finder).</Words>
            <Stage ratio="4 / 3" cls={styles.corners} />
          </Card>
        )}
      </div>
    </GhostSheet>
  )
}
