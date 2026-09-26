import { Bone, GhostSheet } from '@/components/shell/skeleton'
import detail from '@/components/shell/detail-skeleton.module.css'
import { LibraryGalleryGhost } from '@/components/company/templates/library-gallery.skeleton'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './materials.module.css'

/**
 * Company › Materials' ghost (verify round 1): the page header (no tab strip — the section has none; the L2 one with its Back when the page
 * was opened from somewhere, as CompanyShell draws it), then the house gallery's ghost — its toolbar (New Folder · New · search · Filters ·
 * view · ⋯), the Folders row and the swatch cards at the card's own size — so the reveal lands in place. `loading.tsx` draws the usual page
 * (a folder, two rows of cards); the page's PageReveal draws what it knows.
 */
export function MaterialsGhost({ folders = 1, cards = 8, scoped = false }: { folders?: number; cards?: number; /** opened with ?from= — the L2 header */ scoped?: boolean } = {}) {
  return (
    /* (wave E, gallery-5) level 1 unless opened from somewhere (the L2 header) */
    <GhostSheet label="Loading materials" l1={!scoped}>
      {scoped ? (
        <div className={detail.header}>
          <Bone w={24} h={24} r={4} />
          <div className={detail.titleCol}><Bone w={96} h={12} /><Bone w={120} h={24} /></div>
        </div>
      ) : <div className={styles.gHead}><Bone w={140} h={28} /></div>}
      <div className={pageStyles.content} aria-hidden>
        <LibraryGalleryGhost filters folders={folders} cards={cards} footLines={2} />
      </div>
    </GhostSheet>
  )
}
