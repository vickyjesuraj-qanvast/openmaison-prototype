import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { LibraryGalleryGhost } from '@/components/company/templates/library-gallery.skeleton'
import pageStyles from '@/app/leads/leads.module.css'
import { VisualizerIntro } from './intro'
import { VisualizerIntroGhost } from './intro-ghost'
import styles from './visualizer-home.module.css'

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
