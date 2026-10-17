import cardStyles from '@/components/leads/detail/card.module.css'
import { GhostChips, GhostHead, GhostTabs, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { GhostLines } from './ghost-lines'
import { GhostSheet } from '@/components/shell/skeleton'
import { QANVAST_TAB_ITEMS } from '@/components/qanvast/qanvast-tabs'
import styles from './hangouts.module.css'

/**
 * (REG-708; pending modules S27) Qanvast Ops › Hangouts' ghost — ONE ghost, drawn by the route's loading.tsx and by the page's PageReveal alike
 * (neither knows the events' words, so neither sets them): the L1 header, the tab strip, the scope chips and the search, then three Hangout
 * cards on the card's own classes — the head, the name and its chip, the customer profile (a line at a desk, three in a phone's column), the
 * three facts with their labels (the page's own words), the line under them.
 */
export function HangoutsGhost() {
  return (
    <GhostSheet label="Loading Hangouts" l1>
      <GhostHead title={120} />
      <GhostTabs labels={QANVAST_TAB_ITEMS.map((t) => t.label)} active={QANVAST_TAB_ITEMS.findIndex((t) => t.label === 'Hangouts')} />   {/* (S43E, F3-03 W3-04) the open tab’s place, so the strip never jumps sideways at the hand-over (S42 A-10’s rule, here too) */}
      <div className={styles.content}>
        <div className={styles.bar}>
          <div className={styles.views}><GhostChips widths={[59, 121, 107, 77]} rail /></div>
          <div className={styles.tools}><Slot kind="search" w={280} /></div>
        </div>
        <div className={styles.list}>
          {[0, 1, 2].map((i) => (
            <section key={i} className={cardStyles.card}>
              <div className={cardStyles.head}><div className={cardStyles.headText}><Line w={[84, 108, 84][i]!} lh={16} h={10} /></div></div>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <div className={styles.headText}>
                    <div className={styles.nameRow}><Line w={[236, 232, 204][i]!} lh={24} h={16} /><Line w={[50, 96, 50][i]!} lh={20} h={14} /></div>
                    <GhostLines className={`${styles.about} ${styles.ghostLines}`} lines={[[680, 700, 740][i] as number, ['88%', 'phone'], ['60%', 'phone']]} />
                  </div>
                  <span className={styles.press}><Slot kind="btn" w={[162, 72, 139][i]} /></span>
                </div>
                <div className={styles.facts} data-three="">
                  {['Hours', 'Venue', 'Your cost'].map((l, j) => (
                    <div key={l} className={styles.fact}><Words className={styles.factLabel}>{l}</Words><Line w={[132, 220, 208][j]!} lh={20} h={12} className={styles.factValue} /></div>
                  ))}
                </div>
                <GhostLines className={`${styles.line} ${styles.ghostLines}`} lines={[[340, 96, 156][i] as number, ['40%', 'phone']]} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </GhostSheet>
  )
}
