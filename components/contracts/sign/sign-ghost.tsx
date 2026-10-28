import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line } from '@/components/shell/ghost-kit'
import cs from '@/components/contracts/editor/contract-skeleton.module.css'
import rc from '@/components/quotes/confirm/reading-cards.module.css'
import ph from './sign-phone.module.css'

const paper = (
  <div className={cs.paper}>
    <div className={cs.letterhead}><Bone w={120} h={28} r={4} /><span className={cs.lines}><Bone w={180} h={12} /><Bone w={140} h={12} /></span></div>
    <Bone w="55%" h={24} />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}
  </div>
)

/**
 * (Contracts on the move, C3 — REG-708) The signing link's ghost draws the page as it looks at the width it loads at: on the desk the
 * letterhead bar, the paper and the card beside it (the contract skeleton's `sign`, unchanged); on a phone or a touch tablet the bar, the
 * three-line hero, the paper and the sticky bar (sign-phone.module.css). The bundle's link draws the same.
 */
export function SignGhost() {
  return (
    <GhostSheet label="Loading the contract">
      <div className={cs.page} data-kind="sign">
        <div className={cs.signTop}><Bone w={177} h={28} /><Bone w={107} h={28} r={14} /></div>
        <div className={`${cs.stage} ${ph.ghostStage}`}>
          <div className={ph.ghostHero}><Bone w="70%" h={24} /><Bone w="85%" h={16} /><Line w="100%" lh={24} h={12} /></div>
          {paper}
          <div className={`${cs.card} ${ph.ghostDesk}`}><Bone w={120} h={12} /><Bone w="80%" h={24} /><Bone w="100%" h={48} r={4} /><Bone w={120} h={36} r={4} /></div>
          <div className={ph.ghostBar}><Bone w="100%" h={48} r={4} /></div>
        </div>
      </div>
    </GhostSheet>
  )
}

/**
 * (C3 — A-16) The quote a signing link shows: on the desk the bar and the paper (the contract skeleton's `quote`, unchanged); on the phone
 * model (a phone, a tablet held upright — the confirmation page's) the total card and the reading cards, as the page draws them.
 */
export function SignQuoteGhost() {
  return (
    <GhostSheet label="Loading the quote">
      <div className={cs.page} data-kind="quote">
        <div className={cs.signTop}><Bone w={177} h={28} /><Bone w={180} h={20} /></div>
        <div className={`${cs.stage} ${ph.ghostStage}`}>
          <div className={ph.ghostTotal}><Line w={72} lh={16} h={10} /><Line w={120} lh={24} h={14} /><Bone w={150} h={32} /><Line w="70%" lh={24} h={12} /><Bone w="100%" h={48} r={4} /></div>
          <div className={ph.ghostPaper}>{paper}</div>
          <div className={ph.ghostCards}>
            <Line w={120} lh={16} h={10} />
            <ul className={rc.cards}>
              {[0, 1, 2, 3].map((i) => <li key={i} className={rc.card}><span className={ph.ghostCardText}><Bone w={[170, 140, 190, 120][i]!} h={14} /><Bone w="90%" h={10} /><Bone w={96} h={10} /></span><Bone w={72} h={16} /></li>)}
            </ul>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
