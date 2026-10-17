import { Bone } from '@/components/shell/skeleton'
import { Line, Words } from '@/components/shell/ghost-kit'
import { Frame } from '../portal-ghosts'
import p from '../portal.module.css'
import styles from './project.module.css'

/*
 * (Projects round 4b, REG-708) The project tabs' ghosts — each drawn by its loading.tsx and handed to its PageReveal, on the page's own
 * classes: the title and its line, then board 2's confirm card and stage rows, or board 3's update cards. A loader can't know the studio's
 * colour, so the marks are bones.
 */

/** Schedule: the title, the lede, a stage to confirm, the stages; at a desk the note and the line to the designer beside them. */
export function PortalScheduleGhost() {
  return (
    <Frame label="Loading your schedule">
      <div className={p.hello}><Words as="h2" className={p.h1}>Schedule</Words><Line w={320} lh={24} h={14} /></div>
      <div className={styles.split}>
        <div className={styles.main}>
          <section className={`${p.card} ${p.cardPad}`} data-slot="confirm">
            <Line w={260} lh={24} h={16} /><Line w="92%" /><Line w="60%" />
            <div className={styles.confirmActions}><Bone w="50%" h={48} r={4} /><Bone w="50%" h={48} r={4} /></div>
          </section>
          <section className={styles.stages} data-slot="stages">
            <ol className={styles.stageList}>
              {[220, 180, 240, 200, 150, 190, 230].map((w, i) => (
                <li key={i} className={styles.stage}><Bone w={24} h={24} r={12} /><span className={styles.stageText}><Line w={w} /><Line w={96} lh={16} h={10} /></span><Line w={64} lh={16} h={10} /></li>
              ))}
            </ol>
          </section>
        </div>
        <div className={styles.side}>
          <section className={styles.news} data-slot="news"><Line w={180} lh={20} h={14} /><Line w="90%" /><Line w="70%" /></section>
          <Line w={280} />
        </div>
      </div>
    </Frame>
  )
}

/** Updates: the title, the lede, two update cards with their photos. */
export function PortalUpdatesGhost() {
  return (
    <Frame label="Loading your updates">
      <div className={p.hello}><Words as="h2" className={p.h1}>Updates</Words><Line w={340} lh={24} h={14} /></div>
      <div className={styles.split}>
      <div className={`${styles.main} ${styles.feed}`}>
        {[3, 2].map((n, i) => (
          <section key={i} className={`${p.card} ${p.cardPad}`}>
            <Line w={140} lh={16} h={10} /><Line w={[260, 220][i]!} lh={24} h={16} /><Line w="94%" /><Line w="70%" />
            <div className={styles.ghostPhotos} data-n={n}>{Array.from({ length: n }, (_, k) => <Bone key={k} w="100%" h={n === 3 ? 140 : 180} r={8} />)}</div>
          </section>
        ))}
      </div>
      <div className={styles.side}><Line w={280} /></div>
      </div>
    </Frame>
  )
}
