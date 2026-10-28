import { Tag } from '@/components/ds'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Words } from '@/components/shell/ghost-kit'
import { FP3D_WORDS, LOOK_CHOICES, READY_SAMPLES } from '@/lib/floorplan-3d/model'
import welcome from '@/components/visualizer/home/welcome.module.css'
import fields from '@/components/leads/move-stage/fields.module.css'
import k from '@/components/shell/ghost-kit.module.css'
import styles from './floorplan-tool.module.css'

/** (REG-2800) 1.0's Beta mark on the page's title (its `<BetaChip />` beside PrimaryPageHeader) — the design system's Tag. */
export function BetaTag() {
  return <span data-testid="fp3d-beta"><Tag appearance="outlined" color="blue">Beta</Tag></span>
}

/**
 * (REG-2800 · REG-708's rule) Floorplan to 3D Isometric's ghost — its landing as the page draws it, on the page's own classes (the Visualizer
 * welcome's hero and sample row, the drop box, the two looks) with its own words as bars, so the loader and the reveal hand over without a jump.
 */
export function FloorplanGhost({ live = false }: { /** an image model answers — the header then has no prototype info glyph */ live?: boolean }) {
  return (
    <GhostSheet label="Loading Floorplan to 3D Isometric" l1>
      {/* (the calm UI build, 6-22) Beta, and the prototype's info glyph beside it while no image model answers */}
      {/* (the calm UI build 2026-10-27, 6-22 · W-125) …beside the title, as the page's header `after` (ghost-kit's .headAfter) */}
      <div className={k.head}><span className={k.headTitle}><Bone w={258} h={28} /><span className={k.headAfter}><span className={styles.headActions}><Bone w={44} h={24} r={4} />{!live ? <Bone w={36} h={36} r={4} /> : null}</span></span></span></div>
      <div className={styles.content} aria-hidden>
        <div className={welcome.welcome}>
          <div className={welcome.hero}>
            <div className={welcome.lead}>
              <div className={welcome.texts}>
                <Words as="h2" className={welcome.title}>{FP3D_WORDS.hero}</Words>
                <Words as="p" className={welcome.sub}>{FP3D_WORDS.sub}</Words>
              </div>
              <ol className={welcome.steps}>
                {FP3D_WORDS.steps.map(([b, rest]) => <li key={b}><Bone w={24} h={24} r={12} /><Words>{`${b}${rest}`}</Words></li>)}
              </ol>
              <div className={fields.dropzone}><Words className={fields.dropTitle}>{FP3D_WORDS.drop}</Words><Words className={fields.dropHelper}>{FP3D_WORDS.dropHelp}</Words></div>
            </div>
            <div className={`${welcome.figure} ${styles.get}`}>
              <Words className={styles.eyebrow}>{FP3D_WORDS.get}</Words>
              <div className={styles.examples}>
                {LOOK_CHOICES.map((o) => (
                  <div key={o.value} className={styles.example}>
                    <span className={styles.exampleShot}><Bone w="100%" h={0} r={8} style={{ height: '100%' }} /></span>
                    <Words className={styles.exampleName}>{o.label}</Words>
                    <Words className={styles.exampleLine}>{o.line}</Words>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={welcome.samples}>
            <Words as="h3" className={welcome.samplesTitle}>{FP3D_WORDS.samples}</Words>
            <div className={welcome.row}>
              {READY_SAMPLES.map((s) => (
                <span key={s.key} className={`${welcome.sample} ${styles.sample}`}>
                  <span className={styles.sampleShot}><Bone w="100%" h={0} r={4} style={{ height: '100%' }} /></span>
                  <span className={welcome.sampleText}><Words className={welcome.sampleName}>{s.name}</Words><Words className={welcome.sampleHelp}>{s.line}</Words></span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
