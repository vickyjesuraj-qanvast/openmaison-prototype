import { Bone } from '@/components/shell/skeleton'
import { Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import chipRow from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'
import card from '@/components/leads/detail/card.module.css'
import { Frame } from '../portal-ghosts'
import styles from '../portal.module.css'
import own from '@/components/projects/floor-plan/floor-plan.module.css'

/** (REG-708, gaps build G) The portal's Floor plan ghost — its loading.tsx and its PageReveal draw this one: the title and its line, the
    confirmation band, the client's tools, the plan, and the rail of marks beside it (under it on a phone). */
export function PortalFloorPlanGhost() {
  return (
    <Frame label="Loading the floor plan">
      <div className={styles.hello}><Words as="h2" className={styles.h1}>Floor plan</Words><Line w="56%" lh={24} h={14} /></div>
      <div className={styles.section}>
        <Bone w="100%" h={64} r="var(--om-radius-2)" />
        <div className={own.layout}>
          <div className={own.canvasCol}>
            <div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}>{[60, 40, 48, 48, 56, 48, 56, 52].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div></div></div></div>
            <Bone w="100%" h={420} r="var(--om-radius-1)" />
          </div>
          <div className={own.rail}>
            <div className={chipRow.chips}>{[52, 56, 96].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div>
            {[0, 1].map((i) => (
              <div key={i} className={card.card}><div className={own.markHead}><Bone w={32} h={32} r="50%" /><span className={own.markText}><Line w={cycle([96, 120], i)} lh={24} h={14} /><Line w={140} lh={16} h={10} /></span></div></div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  )
}
