import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { GhostField, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { EditorHeadGhost } from '@/components/shell/editor-head-ghost'
import page from '@/components/contracts/editor/contract-editor.module.css'
import lib from '../editors/library-editor.module.css'
import styles from './schedules.module.css'

/**
 * (REG-708, Projects round 2) The schedule template editor's ghost — its own layout, on its own classes: the editor header (Done, ⋮, close),
 * the name row with its count, the Milestones card in its own words and its rows (name · days · after the one before · the switch · delete),
 * then the preview's bars. `loading.tsx` and the editor's PageReveal draw this one.
 */
export function ScheduleTemplateGhost() {
  return (
    <GhostSheet label="Loading the template">
      <div className={page.page}>
        <EditorHeadGhost crumb={170} title={180} chips={[90]} />
        <div className={page.meta}>
          <Line w={180} lh={36} h={14} />
          <div className={page.metaEnd}><Line w={260} lh={20} h={10} /></div>
        </div>
        <div className={lib.body}>
          <div className={lib.card}>
            <div className={lib.cardHead}><Words className={lib.cardTitle}>Milestones</Words><Words className={lib.cardHelp}>Each one starts its gap in days after the one before ends; a negative gap overlaps them.</Words></div>
            <div className={lib.cardBody}>
              <div className={styles.items}>
                <span />{['Milestone', 'Days', 'Gap (days)', 'Client confirms'].map((h) => <Words key={h} className={styles.head}>{h}</Words>)}<span />
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.row}>
                    <Bone w={8} h={12} /><GhostField size="s" /><GhostField size="s" />{i === 0 ? <Line w={72} lh={20} h={12} /> : <GhostField size="s" />}<Slot kind="switch" /><Slot kind="icon" />
                  </div>
                ))}
              </div>
              <Slot kind="btn" w={140} />
              <div className={styles.preview}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.previewRow}><Line w={cycle([140, 120, 150, 110], i)} lh={20} h={10} /><Bone w="100%" h={8} r={4} /></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
