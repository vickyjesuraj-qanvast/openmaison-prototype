import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line } from '@/components/shell/ghost-kit'
import cs from '@/components/contracts/editor/contract-skeleton.module.css'
import rc from './reading-cards.module.css'
import styles from './confirm-page.module.css'

/**
 * (REG-708 → UX audit Q6) The confirmation link's own ghost — the signing page's (the letterhead bar, the paper, the card, on the contract
 * ghost's classes) with the card the page draws: the eyebrow, the title, the words, the total, the name, the fine print, Confirm and — new —
 * Ask for a change. (Quotes on the move, K4 — P-12) On the phone model the paper and the card give way to what the page shows there: the total
 * card (the number, the amount, the line, View as printed), the reading cards, and the sticky bar with its two buttons.
 */
export function ConfirmSkeleton({ card = 'confirm' }: { /** (pending modules S02) the view-only link's card: no name field, no Confirm — Message and Download a copy */ card?: 'confirm' | 'view' }) {
  return (
    <GhostSheet label="Loading the quote">
      <div className={cs.page} data-kind="sign">
        <div className={cs.signTop}><Bone w={177} h={28} /><Bone w={card === 'view' ? 96 : 107} h={28} r={14} /></div>
        <div className={`${cs.stage} ${styles.ghostBody}`}>
          <div className={styles.ghostTotal}>
            <Line w={72} lh={16} h={10} /><Line w={120} lh={24} h={14} /><Bone w={150} h={32} /><Line w="70%" lh={24} h={12} /><Bone w="100%" h={48} r={4} />
          </div>
          <div className={styles.ghostPaper}>
            <div className={`${cs.paper} ${styles.ghostA4}`}>
              <div className={cs.letterhead}><Bone w={120} h={28} r={4} /><span className={cs.lines}><Bone w={180} h={12} /><Bone w={140} h={12} /></span></div>
              <Bone w="55%" h={24} />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}
            </div>
          </div>
          <div className={styles.ghostCards}>
            <Line w={120} lh={16} h={10} />
            <ul className={rc.cards}>
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className={rc.card}><span className={styles.ghostCardText}><Bone w={[170, 140, 190, 120][i]!} h={14} /><Bone w="90%" h={10} /><Bone w={96} h={10} /></span><Bone w={72} h={16} /></li>
              ))}
            </ul>
          </div>
          <div className={`${cs.card} ${styles.ghostCard}`}>
            <Bone w={120} h={12} /><Bone w="80%" h={24} />
            <span className={styles.ghostWords}><Bone w="100%" h={12} /><Bone w="85%" h={12} /></span>
            {card === 'view' ? (
              <><Bone w="100%" h={48} r={4} /><Bone w="45%" h={10} /><Bone w="100%" h={36} r={4} /><Bone w="100%" h={36} r={4} /></>
            ) : (
              <><Bone w="100%" h={48} r={4} /><Bone w="100%" h={48} r={4} /><Bone w="90%" h={10} />
                <Bone w="100%" h={36} r={4} /><Bone w="100%" h={36} r={4} /></>
            )}
          </div>
          <div className={styles.ghostBar}><Bone w="100%" h={48} r={4} /><Bone w="100%" h={48} r={4} /></div>
        </div>
      </div>
    </GhostSheet>
  )
}
