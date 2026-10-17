import { Bone } from '@/components/shell/skeleton'
import { Line, Words } from '@/components/shell/ghost-kit'
import { Frame } from '../portal-ghosts'
import styles from '../portal.module.css'
import own from './designs.module.css'

/** (Projects round 9, REG-708) The portal's Designs ghost — its loading.tsx and its PageReveal draw this one: the title, a link's card with its
    head, Open and three design tiles. */
export function PortalDesignsGhost() {
  return (
    <Frame label="Loading your designs">
      <div className={styles.hello}><Words as="h2" className={styles.h1}>Designs</Words><Line w="52%" lh={24} h={14} /></div>
      <section className={styles.card}>
        <div className={own.head}><span className={styles.rowText}><Line w={200} lh={24} h={16} /><Line w={220} lh={16} h={10} /></span><Bone w={40} h={20} /></div>
        <div className={styles.tiles}>
          {[0, 1, 2].map((i) => <span key={i} className={styles.tile}><span className={styles.tileBox} /><span className={styles.tileText}><Line w="70%" /><Line w={90} lh={16} h={10} /></span></span>)}
        </div>
      </section>
    </Frame>
  )
}
