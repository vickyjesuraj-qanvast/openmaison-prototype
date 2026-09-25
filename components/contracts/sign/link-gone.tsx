import type { BrandKit } from '@/lib/templates/model'
import { LinkNotice } from './link-notice'
import styles from './signing-page.module.css'

/**
 * (sweep S2 #14) A signing link whose contract was deleted for good: the studio's letterhead bar and the house notice that the link no
 * longer works — Next's bare 404 was all a client saw. No document, nothing about the lead.
 */
export function LinkGone({ studio, brand }: { studio: string; brand: BrandKit }) {
  return (
    <div className={styles.page} data-testid="signing-page" data-state="inactive">
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
          <span className={styles.studio}>{studio}</span>
        </span>
      </header>
      <LinkNotice state="inactive" studio={studio} />
    </div>
  )
}
