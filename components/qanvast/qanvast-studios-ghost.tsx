import pageStyles from '@/app/leads/leads.module.css'
import cardStyles from '@/components/leads/detail/card.module.css'
import { GhostHead, GhostTabs, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { GhostSheet } from '@/components/shell/skeleton'
import { StatTiles } from '@/components/om/stat-tile'
import tileStyles from '@/components/om/stat-tile.module.css'
import { QANVAST_TAB_ITEMS } from './qanvast-tabs'
import styles from './qanvast-studios.module.css'

/**
 * (REG-708; parity map, CP-148 · CP-149) Qanvast Ops › Studios' ghost — drawn by the route's loading.tsx and handed to the page's PageReveal:
 * the L1 header, the tab strip, then the studio's card on its own classes — the head, the switches' card table (two rows with their switch),
 * the usage line and its four number tiles.
 */
export function QanvastStudiosGhost() {
  return (
    <GhostSheet label="Loading the studios" l1>
      <GhostHead title={120} />
      <GhostTabs labels={QANVAST_TAB_ITEMS.map((t) => t.label)} active={QANVAST_TAB_ITEMS.findIndex((t) => t.label === 'Studios')} />   {/* (S43E, F3-03 W3-04) the open tab’s place, so the strip never jumps sideways at the hand-over (S42 A-10’s rule, here too) */}
      <div className={pageStyles.content}>
        <div className={styles.list}>
          <section className={cardStyles.card}>
            <div className={cardStyles.head}><div className={cardStyles.headText}><Line w={96} lh={16} h={10} /><span className={cardStyles.metaRight}><Line w={112} lh={16} h={10} /></span></div></div>
            <div className={styles.body}>
              <div className={styles.table} data-card-table="">
                <div className={styles.head}><Words>Set by OpenMaison</Words><span className={styles.col}><Words>On</Words></span></div>
                {['76%', '64%'].map((w, i) => (
                  <div key={i} className={styles.row}>
                    <span className={styles.name}><Line w={i ? 72 : 96} lh={20} h={12} /><Line w={w} lh={16} h={10} /></span>
                    <span className={styles.col}><Slot kind="switch" /></span>
                  </div>
                ))}
              </div>
              <div className={styles.usage}>
                <Line w={220} lh={20} h={12} />
                <StatTiles>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={tileStyles.tile}><Line w={84} lh={16} h={10} /><Line w={28} lh={32} h={22} /><Line w={110} lh={16} h={10} /></div>
                  ))}
                </StatTiles>
              </div>
            </div>
          </section>
        </div>
      </div>
    </GhostSheet>
  )
}
