import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { GhostField, GhostHead2, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { GhostLines } from '@/components/hangouts/ghost-lines'
import { DesignerCardGhost } from './designer-card-ghost'
import pageStyles from '@/app/leads/leads.module.css'
import profile from '@/components/company/profile-view.module.css'
import photo from '@/components/company/member-photo-field.module.css'
import styles from './public-profile.module.css'

/**
 * (REG-708; pending modules S27) A Public profile's ghost — ONE ghost, drawn by its loading.tsx and by its PageReveal alike (neither sets the
 * member's words): the L2 header (the page always has its way back) with Discard · Save changes; the card (the photo row, the title with its
 * helper and the years, the two lines with their count, the known-for line, the About page's switch); the work's tile and Add work; how
 * clients see it — the card and where it shows. Labels the page always prints are its own words; the rest is bars.
 */
export function PublicProfileGhost() {
  return (
    <GhostSheet label="Loading the public profile">
      <GhostHead2 crumb={72} title={240} actions={[92, 126]} />
      <div className={pageStyles.content} aria-hidden>
        <div className={profile.layout}>
          <div className={profile.form}>
            <section className={profile.card}>
              <div className={profile.cardHead}><Line w={88} lh={24} h={14} className={profile.cardTitle} /><Words as="p" className={profile.cardHelp}>Clients read it on their portal’s About page and on your studio’s Hangout pages.</Words></div>
              <div className={photo.photoRow}><Slot kind="avatar40" /><Slot kind="btn" w={138} /></div>
              <div className={styles.fields}>
                <GhostField helper={180} />
                <GhostField />
                <div className={`${styles.wide} ${styles.ghostArea}`}><Bone w="100%" h={112} r={4} /><Line w={116} lh={16} h={10} className={styles.ghostCount} /></div>
              </div>
              <GhostLines className={`${styles.line} ${styles.ghostLines}`} lines={[640, [280, 'phone'], [200, 'phone']]} />
              <div className={styles.switchRow}><span className={styles.switchText}><Words className={styles.switchLabel}>Show on the About page</Words><Words className={profile.cardHelp}>The client portal’s About › Our team.</Words></span><Slot kind="switch" /></div>
            </section>
            <section className={profile.card}>
              <div className={profile.cardHead}><Line w={88} lh={24} h={14} className={profile.cardTitle} /><GhostLines className={`${profile.cardHelp} ${styles.ghostLines}`} lh={16} h={10} lines={[520, 180, [120, 'phone']]} /></div>
              <div className={styles.works}>
                <div className={styles.work}>
                  <span className={styles.workPic} />
                  <div className={styles.workTop}>
                    <span className={styles.workText}><GhostLines className={`${styles.workName} ${styles.ghostLines}`} lines={[160, 120]} /><GhostLines className={`${styles.workFacts} ${styles.ghostLines}`} lh={16} h={10} lines={[140, 100, [60, 'desk']]} /></span>
                    <Slot kind="icon" />
                  </div>
                </div>
              </div>
              <Slot kind="btn" w={121} />
            </section>
            <section className={profile.card}>
              <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>How clients see it</Words><Line w={100} lh={16} h={10} className={profile.cardHelp} /></div>
              <div className={styles.preview}><DesignerCardGhost /></div>
              <div className={styles.where}>{[260, 300, 200].map((w) => <Line key={w} w={w} lh={20} h={12} />)}</div>
            </section>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
