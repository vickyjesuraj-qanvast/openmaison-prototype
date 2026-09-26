import type { ReactNode } from 'react'
import styles from './visualizer-home.module.css'

/** The member's "Dismiss" on the intro (per browser). */
export const INTRO_PREF = 'om.viz.introHidden'

/**
 * The landing's intro card (REG-673, Quote X-Ray's) — what the tool does, in three steps. (verify round 1, F166) The page and its ghost draw
 * the SAME card: in the ghost its words are text-shaped bones (the type set, the ink gone), so the card is as tall as the page's at every
 * width — seven lines at 768 included — and nothing below it jumps when the page lands.
 */
export function VisualizerIntro({ ghost = false, hasDesigns, dismiss }: { ghost?: boolean; hasDesigns: boolean; dismiss?: ReactNode }) {
  const t = (words: ReactNode) => (ghost ? <span className={styles.gText}>{words}</span> : words)
  return (
    <section className={styles.intro} aria-label={ghost ? undefined : 'What the AI Visualizer does'} aria-hidden={ghost || undefined} data-ghost={ghost || undefined} data-has-designs={hasDesigns || undefined}>
      <div className={styles.introText}>
        <span className={styles.introTitle}>{t(<>Turn a room photo into a finished design, in minutes — and show the client before a single tile is ordered.</>)}</span>
        <ol className={styles.steps}>
          <li><span className={styles.stepN}>1</span><span>{t(<><b>Add a room photo</b> — a site photo, a 3D view or a sketch. Its surfaces and furniture are marked for you.</>)}</span></li>
          <li><span className={styles.stepN}>2</span><span>{t(<><b>Tap a surface, pick a finish</b> — laminates, paints, flooring and your studio’s own materials. Or restyle the whole room.</>)}</span></li>
          <li><span className={styles.stepN}>3</span><span>{t(<><b>Generate and share</b> — compare before and after, then send the client a link they can pick from.</>)}</span></li>
        </ol>
      </div>
      {ghost ? <span className={styles.gDismiss} /> : dismiss}
    </section>
  )
}
