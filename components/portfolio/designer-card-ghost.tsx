import { Line, Words } from '@/components/shell/ghost-kit'
import { GhostLines } from '@/components/hangouts/ghost-lines'
import { Bone } from '@/components/shell/skeleton'
import styles from './designer-card.module.css'

/**
 * (REG-708; pending modules S27) A member's public card as a ghost — on the card's own classes, so a page that draws one (a studio's Hangout
 * page, a homeowner's own page, the Public profile's preview) holds its place the same in its loader and its reveal: the face, the name, the
 * title and years, the known-for chips, the line about them, when they are at the tables (`when`), their work's tiles. Data is bars; "Their
 * work" is the card's own word.
 */
export function DesignerCardGhost({ when = false, compact = false }: { when?: boolean; compact?: boolean }) {
  return (
    <div className={styles.card} aria-hidden>
      <div className={styles.top}>
        <span className={styles.faceGhost}><Bone w={56} h={56} r="50%" /></span>
        <span className={styles.who}>
          <Line w={96} lh={24} h={14} className={styles.name} />
          <Line w={220} lh={16} h={10} className={styles.title} />
          <span className={styles.known}><Bone w={124} h={20} r={4} /><Bone w={104} h={20} r={4} /></span>
        </span>
      </div>
      {compact ? null : <GhostLines className={`${styles.bio} ${styles.ghostLines}`} lines={['88%', ['40%', 'phone']]} />}
      {when ? <p className={styles.when}><span className={styles.whenGlyph}><Bone w={16} h={16} r={4} /></span><Line w={260} lh={16} h={10} /></p> : null}
      {compact ? null : (
        <>
          <Words as="h3" className={styles.workHead}>Their work</Words>
          <div className={styles.strip}>
            <span className={styles.tile}><span className={styles.pic} /><GhostLines className={`${styles.tileName} ${styles.ghostLines}`} lines={['90%', '60%']} /><Line w="80%" lh={16} h={10} className={styles.tileFacts} /></span>
          </div>
        </>
      )}
    </div>
  )
}
