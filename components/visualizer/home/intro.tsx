'use client'

import { useState, type ReactNode } from 'react'
import { Drawer } from '@/components/om/drawer'
import { useMediaQuery } from '@/lib/breakpoint'
import styles from './visualizer-home.module.css'

/** The member's "Dismiss" on the old intro card (per browser). (the calm UI build 2026-10-27, 6-10) The card is gone — the one line below
    has nothing to dismiss — so nothing reads it any more; the key is kept so an older browser's mark is never misread as something else. */
export const INTRO_PREF = 'om.viz.introHidden'

/** The three steps, as the intro card said them (REG-673) — now behind How it works. */
export function VisualizerSteps() {
  const touch = useMediaQuery('(hover: none)')
  return (
    <ol className={styles.steps} data-testid="viz-how-steps">
      <li><span className={styles.stepN}>1</span><span><b>Add a room photo</b> — a site photo, a 3D view or a sketch. Its surfaces and furniture are marked for you.</span></li>
      <li><span className={styles.stepN}>2</span><span><b>{touch ? 'Tap' : 'Click'} a surface, pick a finish</b> — laminates, paints, flooring and your studio’s own materials. Or restyle the whole room.</span></li>
      <li><span className={styles.stepN}>3</span><span><b>Generate and share</b> — compare before and after, then send the client a link they can pick from.</span></li>
    </ol>
  )
}

/**
 * The landing's line (REG-673; the calm UI build 2026-10-27, 6-10 · W-415): what the tool does, in one sentence under the page's title, and
 * a *How it works* text link that opens the three steps in the house Drawer — the four-line card it replaces sat above a gallery in use on
 * every visit. A studio's first visit has its own welcome (REG-735), which still walks the three steps. (verify round 1, F166) The page and
 * its ghost draw the SAME line: in the ghost its words are text-shaped bones, so nothing below it jumps when the page lands.
 */
export function VisualizerIntro({ ghost = false }: { ghost?: boolean; hasDesigns?: boolean; dismiss?: ReactNode }) {
  const [how, setHow] = useState(false)
  if (ghost) return (
    <section className={styles.introLine} aria-hidden data-ghost="">
      <span className={styles.gText}>Turn a room photo into a finished design.</span> <span className={styles.gText}>How it works</span>
    </section>
  )
  return (
    <>
      {/* the card's name stays the line's (a probe and a screen reader find "What the AI Visualizer does" here) */}
      <section className={styles.introLine} aria-label="What the AI Visualizer does" data-testid="viz-intro">
        <span>Turn a room photo into a finished design.</span>
        <button type="button" className={styles.howLink} aria-haspopup="dialog" aria-expanded={how} onClick={() => setHow(true)} data-testid="viz-how">How it works</button>
      </section>
      <Drawer open={how} onClose={() => setHow(false)} title="How the AI Visualizer works" label="How the AI Visualizer works">
        <div className={styles.howBody}>
          <span className={styles.howLead}>Show the client a finished room before a single tile is ordered.</span>
          <VisualizerSteps />
        </div>
      </Drawer>
    </>
  )
}
