'use client'

import { Bone } from '@/components/shell/skeleton'
import { Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { useMediaQuery, MOBILE } from '@/lib/breakpoint'
import { useFlagPref } from '@/lib/prefs'
import { SCHEDULE_ROWS } from './schedule-phone'
import styles from './schedule.module.css'

/** (simplify S-24) Whether the last schedule this browser opened showed its Share N changes button — the ghost draws its slot (REG-708). */
export const SHARE_SHAPE_KEY = 'om.shape.schedule.share'

/**
 * (REG-708, Projects round 2) The Schedule tab's ghost — its own layout on its own classes: the summary card (a sentence, a line, the three
 * figures in their own words), the toolbar (the scale, Today · who sees it, Add milestone, ⋮), then the list that is also the timeline — the
 * name column, the scale's two rows, seven rows each with its bar — or, on a phone, the summary's two lines and the rows with their thin bars.
 * (held calls 2026-10-24, W3-04) A tablet held upright: the desk's summary and the toolbar's end, then the phone's rows (`SCHEDULE_ROWS`).
 */
export function ScheduleGhost({ first = false }: { first?: boolean }) {
  const phone = useMediaQuery(MOBILE)
  const asRows = useMediaQuery(SCHEDULE_ROWS)
  const [share] = useFlagPref(SHARE_SHAPE_KEY, false)   // (simplify S-24) the toolbar's Share N changes
  const bars = [[2, 10], [12, 26], [22, 36], [34, 56], [58, 70], [71, 76], [77, 81]] as const
  /* the rows a phone and a tablet held upright read (W3-04), each with its thin bar */
  const phoneRows = (
    <section className={styles.phoneList}>
      {bars.map(([a, b], i) => (
        <div key={i} className={styles.phoneItem}>
          <div className={styles.phoneRow}>
            <Bone w={24} h={24} r="50%" />
            <span className={styles.phoneText}><Line w={cycle([150, 120, 160, 140], i)} lh={20} h={12} /><Line w={cycle([120, 100, 130], i)} lh={16} h={10} /><span className={styles.mini}><span className={styles.miniBar} style={{ left: `${a}%`, width: `${b - a}%` }} /></span></span>
          </div>
          {/* (simplify S-25 (4)) the rows not done carry their Done */}
          {i > 1 ? <span className={styles.phoneDone}><Slot kind="btn" w={64} /></span> : null}
        </div>
      ))}
    </section>
  )
  /* (B-46, REG-817) a project with no schedule opens on the Start card — the ghost draws that card: the form (title, help, works start, the
     three ways in, Create schedule) and "What you will get" beside it */
  if (first) return (
    <div className={styles.tab} aria-hidden>
      <section className={styles.start}>
        <div className={styles.startInner}>
          <div className={styles.startForm}>
            <div><Line w={220} lh={28} h={18} /><Line w={phone ? 240 : 380} lh={24} h={12} /></div>
            <div className={styles.startDate}><Slot kind="field" w={280} /></div>
            <div className={styles.sources}><Words className={styles.legendLabel}>Build the schedule from</Words>{[0, 1, 2, 3].map((i) => <Bone key={i} w="100%" h={68} r="var(--om-radius-2)" />)}</div>
            <div><Slot kind="btn" w={148} /></div>
          </div>
          <div className={styles.startAside}>
            <Words className={styles.legendLabel}>What you will get</Words>
            {bars.map(([a, b], i) => <span key={i} className={styles.getRow}><Line w={cycle([140, 120, 160], i)} lh={18} h={10} /><span className={styles.getTrack}><span className={styles.getBar} style={{ left: `${a}%`, width: `${b - a}%` }} /></span></span>)}
          </div>
        </div>
      </section>
    </div>
  )
  return (
    <div className={styles.tab} aria-hidden>
      <section className={styles.summary}>
        <div className={styles.summaryInner}>
        {/* (the calm UI build 2026-10-27, 3-23) the headline with its paragraph folded in; on a desk the line of who sees it under it */}
        <div className={styles.summaryText}><Line w={phone ? 240 : 300} lh={phone ? 24 : 28} h={16} /><Line w={phone ? 160 : 280} lh={20} h={12} />{phone ? null : <Line w={260} lh={28} h={10} />}</div>
        {phone ? null : (
          <dl className={styles.stats}>
            {['Done', 'To handover', 'Next payment'].map((l, i) => <div key={l} className={styles.stat}><Words>{l}</Words><Line w={cycle([44, 56, 92], i)} lh={24} h={14} /></div>)}
          </dl>
        )}
        </div>
      </section>
      {phone ? (
        <>
          <div className={styles.phoneBar}><Line w={share ? 150 : 240} lh={28} h={10} /><span className={styles.toolActs}>{share ? <Slot kind="btn" w={124} /> : null}<Slot kind="icon" /></span></div>
          {phoneRows}
          {/* (B-46) the phone's Add milestone dock */}
          <div className={styles.dock}><Slot kind="btn" w="100%" /></div>
        </>
      ) : (
        <>
          <div className={styles.toolbar} data-rows={asRows || undefined}>
            {asRows ? null : <div className={styles.toolStart}><Slot kind="btn" w={168} /><Slot kind="btn" w={64} /><Slot kind="icon" /><Slot kind="icon" /></div>}
            <div className={styles.toolEnd}>{share ? <Slot kind="btn" w={140} /> : null}<span className={styles.toolActs}><Slot kind="btn" w={140} /><Slot kind="icon" /></span></div>
          </div>
          {asRows ? phoneRows : (
          <section className={styles.frame}>
            <div className={styles.grid}>
              <div className={styles.headRow}>
                <div className={styles.nameHead}><Words className={styles.hLabel}>Milestone</Words></div>
                <div className={styles.scale}><Line w="60%" lh={16} h={10} /><Line w="90%" lh={20} h={8} /></div>
                <div className={styles.actHead} />
              </div>
              {bars.map(([a, b], i) => (
                <div key={i} className={styles.row}>
                  <div className={styles.nameCell}><Bone w={24} h={24} r="50%" /><span className={styles.nameBtn}><Line w={cycle([170, 130, 150, 180, 90, 140, 190], i)} lh={20} h={12} /><Line w={cycle([120, 140, 130, 170], i)} lh={16} h={10} /></span></div>
                  <div className={styles.track}><span className={styles.ghostBar} style={{ left: `${a}%`, width: `${b - a}%` }} /></div>
                  <div className={styles.actCell}><Slot kind="icon" /></div>
                </div>
              ))}
            </div>
          </section>
          )}
        </>
      )}
    </div>
  )
}
