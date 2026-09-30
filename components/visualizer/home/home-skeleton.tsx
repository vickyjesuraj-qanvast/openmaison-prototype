'use client'

import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { LibraryGalleryGhost } from '@/components/company/templates/library-gallery.skeleton'
import pageStyles from '@/app/leads/leads.module.css'
import { VisualizerIntro } from './intro'
import { VisualizerIntroGhost } from './intro-ghost'
import styles from './visualizer-home.module.css'
import welcome from './welcome.module.css'
import { useFirstRunShape } from '@/lib/ghost-shape'
import { libraryShape } from '@/components/company/templates/library-ghost-for'

/**
 * Tools › AI Visualizer's ghost (REG-673; verify round 1, F166): the L1 header, the intro card while it shows (the page's own card, its words
 * as bones), then the house gallery's ghost — its toolbar with the Kind pill, the Folders row and the cards, on the gallery's own classes.
 * `loading.tsx` can't read the studio's data, so it draws the usual page — a studio that has designs and a folder — and the intro as the
 * member left it (read in the browser). (REG-708) The page's PageReveal draws this same one, so the loader never hands over to a
 * differently counted ghost.
 */
export function VisualizerHomeGhost({ intro = 'auto', hasDesigns = true, folders = 1, cards = 4 }: {
  /** 'auto' (the route's loading.tsx): the member's own Dismiss, read in the browser; the page's reveal passes what it knows. */
  intro?: boolean | 'auto'; hasDesigns?: boolean; folders?: number; cards?: number
} = {}) {
  /* (UX audit build) a studio with no design opens on the welcome (REG-736) — its ghost, on the welcome's own classes */
  const first = useFirstRunShape(libraryShape('viz-designs'))
  if (first) return <VisualizerWelcomeGhost />
  return (
    /* (wave E, gallery-5) a level-1 page: the phone's top bar and dock stay while it loads */
    <GhostSheet label="Loading designs" l1>
      <div className={styles.gHead}><Bone w={150} h={28} /></div>
      <div className={pageStyles.content} aria-hidden>
        {intro === 'auto' ? <VisualizerIntroGhost hasDesigns={hasDesigns} /> : intro ? <VisualizerIntro ghost hasDesigns={hasDesigns} /> : null}
        <LibraryGalleryGhost pill folders={folders} cards={cards} />
      </div>
    </GhostSheet>
  )
}

/** (UX audit build · REG-736) The welcome's ghost: the header with ⋮, the picture (3:2), the words, the two buttons, the three sample rooms —
    drawn on welcome.module.css so each bone stands where the page lands, at every width. */
export function VisualizerWelcomeGhost() {
  return (
    <GhostSheet label="Loading the AI Visualizer" l1>
      <div className={styles.gHead}><Bone w={150} h={28} /></div>
      <div className={pageStyles.content} aria-hidden>
        <div className={welcome.welcome}>
          <div className={welcome.hero}>
            <div className={welcome.lead}>
              <div className={welcome.texts}><Bone w="90%" h={30} /><Bone w="62%" h={30} /><Bone w="84%" h={14} style={{ marginTop: 6 }} /></div>
              <div className={welcome.steps}>{[78, 70, 74].map((w) => <span key={w} style={{ display: 'flex', gap: 12 }}><Bone w={24} h={24} r={12} /><Bone w={`${w}%`} h={14} /></span>)}</div>
              <div className={welcome.buttons}><Bone w={196} h={36} r={4} /><Bone w={150} h={36} r={4} /></div>
            </div>
            <div className={welcome.figure}><span className={welcome.compare} style={{ display: 'block' }}><Bone w="100%" h={0} r={8} style={{ height: '100%' }} /></span><Bone w="46%" h={12} /></div>
          </div>
          <div className={welcome.samples}>
            <Bone w={160} h={18} />
            <div className={welcome.row}>{[0, 1, 2].map((i) => <span key={i} className={welcome.sample}><Bone w={132} h={88} r={4} /><span className={welcome.sampleText}><Bone w="50%" h={14} /><Bone w="90%" h={10} /></span></span>)}</div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
