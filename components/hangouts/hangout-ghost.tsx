'use client'

import { useSearchParams } from 'next/navigation'
import cardStyles from '@/components/leads/detail/card.module.css'
import tileStyles from '@/components/om/stat-tile.module.css'
import { StatTiles } from '@/components/om/stat-tile'
import { GhostChips, GhostHead2, GhostTabs, GhostTextButton, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { AREAS, BUDGET_BANDS, DIMENSIONS, HOME_KINDS, HOME_STATUSES, KEY_TIMES, STYLES, keyLabel } from '@/lib/hangouts/model'
import { GhostLines } from './ghost-lines'
import { GhostSheet } from '@/components/shell/skeleton'
import { isView, type HangoutView as View } from '@/lib/hangouts/model'
import styles from './hangouts.module.css'
import own from './meetings-view.module.css'

const LABELS = ['Plan', 'Chats', 'How it went']

/**
 * (REG-708; pending modules S27) A Hangout's page's ghost — ONE ghost, drawn by its loading.tsx and by its PageReveal alike, from the address
 * alone (neither sets the record's words): the L2 header, then — when the address names a view, as every door to a Hangout the studio takes
 * part in does (the route adds it) — the views' tab strip and that view: the plan's facts and its people, the chats' bar and cards, how it
 * went's tiles and table; with no view, the event's place card and facts. Labels the page always prints are its own words; data is bars.
 */
export function HangoutGhost() {
  const asked = useSearchParams().get('view')
  const view: View | null = isView(asked) ? asked : null
  return (
    <GhostSheet label="Loading the Hangout">
      <GhostHead2 crumb={150} title={300} chips={[52, 36]} actions={view === 'plan' || view === 'meetings' ? [206] : []} />   {/* Your booking page ▾ — an ended Hangout (How it went's) has none */}
      {view ? <GhostTabs labels={LABELS} active={(['plan', 'meetings', 'results'] as const).indexOf(view)} /> : null}   {/* (S43E, F3-03 W3-04) the open view’s place */}
      <div className={styles.content}>
        <div className={styles.stack}>
          {!view ? <><Place /><Plan taking={false} /></> : view === 'plan' ? <Plan taking /> : view === 'meetings' ? <Chats /> : <Results />}
        </div>
      </div>
    </GhostSheet>
  )
}

function CardHead({ w = 96 }: { w?: number }) {
  return <div className={cardStyles.head}><div className={cardStyles.headText}><Line w={w} lh={16} h={10} /></div></div>
}
function Place() {
  return (
    <section className={cardStyles.card}>
      <CardHead w={72} />
      <div className={styles.cardBody}><div className={styles.cardTop}><GhostLines className={`${styles.line} ${styles.ghostLines}`} lines={[400, [280, 'phone']]} /><span className={styles.press}><Slot kind="btn" w={72} /></span></div></div>
    </section>
  )
}
function Facts({ taking }: { taking: boolean }) {
  return (
    <section className={cardStyles.card}>
      <CardHead w={120} />
      <div className={styles.cardBody}>
        <div className={styles.facts}>
          {['Dates', 'Hours', 'Venue', taking ? 'Your tables' : 'Your cost'].map((l, j) => (
            <div key={l} className={styles.fact}><Words className={styles.factLabel}>{l}</Words><Line w={[96, 140, 220, 120][j]!} lh={20} h={12} className={styles.factValue} /></div>
          ))}
        </div>
        <GhostLines className={`${styles.line} ${styles.ghostLines}`} lines={['72%', ['80%', 'phone'], ['50%', 'phone']]} />
        <GhostLines className={`${styles.line} ${styles.ghostLines}`} lines={['58%', ['70%', 'phone']]} />
        {taking ? <Line w={220} lh={20} h={12} className={styles.line} /> : null}
      </div>
    </section>
  )
}
function Plan({ taking }: { taking: boolean }) {
  return (
    <>
      <Facts taking={taking} />
      {taking ? (
        <>
          <div className={styles.headLine}>
            <div className={styles.headText}><Words as="h2" className={styles.headTitle}>The plan</Words><Line w={220} lh={16} h={10} className={styles.help} /></div>
          </div>
          <section className={cardStyles.card}>
            <CardHead w={72} />
            <div className={styles.cardBody}>
              {/* (the calm UI build 2026-10-27) "Clients who book…" (was Homeowners) — three lines on a phone, as the sentence now runs */}
              <GhostLines className={`${styles.help} ${styles.ghostLines}`} lh={16} h={10} lines={['88%', ['80%', 'phone'], ['56%', 'phone']]} />
              <div className={styles.people}>
                {[84, 96, 72, 104, 64, 76, 92].map((w, i) => (
                  <div key={i} className={styles.person}>
                    <span className={styles.who}><Slot kind="avatar40" style={{ width: 36, height: 36 }} /><span className={styles.whoText}><Line w={w} lh={20} h={12} className={styles.whoName} /><Line w={60} lh={16} h={10} className={styles.whoLine} /></span></span>
                    <GhostChips className={styles.shiftChips} widths={[198, 192]} />
                  </div>
                ))}
              </div>
              <span><GhostTextButton label="Invite someone new" icon /></span>
            </div>
          </section>
          <section className={cardStyles.card}>
            <CardHead w={120} />
            <div className={styles.cardBody}>
              <GhostLines className={`${styles.help} ${styles.ghostLines}`} lh={16} h={10} lines={['96%', ['90%', 'phone'], ['80%', 'phone'], ['30%', 'phone']]} />
              <div className={styles.shares}>{[0, 1, 2].map((i) => <Slot key={i} kind="field" w="100%" />)}</div>
              <Line w={120} lh={16} h={10} className={styles.total} />
              <span><GhostTextButton label="Share evenly" /></span>
            </div>
          </section>
          <section className={cardStyles.card}>
            <CardHead w={140} />
            <div className={styles.cardBody}>
              <Words as="p" className={styles.help}>Qanvast matches on it, and your page scores each booking against it — a fit out of 100. It guides the matching; it never turns anyone away.</Words>
              <div className={styles.dims}>
                {([['Kind of home', [...HOME_KINDS]], ['New, resale or renovated', [...HOME_STATUSES]], ['Budget', BUDGET_BANDS.map((b) => b.label)], ['Key collection', ['Any time', ...KEY_TIMES.map((k) => keyLabel(k))]], ['Area', [...AREAS]], ['Style', [...STYLES]]] as [string, string[]][]).map(([label, chips]) => (
                  <div key={label} className={styles.dim}><Words className={styles.dimLabel}>{label}</Words><GhostChips labels={chips} /></div>
                ))}
              </div>
              <hr className={styles.cardRule} />
              <div className={styles.headText}><Words as="h3" className={styles.dimLabel}>What matters most</Words><Words as="p" className={styles.help}>How much each one weighs in the fit — together 100%. Budget first, as Qanvast suggests.</Words></div>
              <div className={styles.shares}>{DIMENSIONS.map((d) => <Slot key={d.key} kind="field" w="100%" />)}</div>
              <Line w={110} lh={16} h={10} className={styles.total} />
              <span><GhostTextButton label="Weigh them evenly" /></span>
            </div>
          </section>
        </>
      ) : null}
    </>
  )
}
function Chats() {
  return (
    <div className={styles.section}>
      <div className={styles.bar}><div className={styles.views}><GhostChips widths={[59, 87, 81, 77]} rail /></div><div className={styles.tools}><Slot kind="btn" w={148} /></div></div>
      <div className={own.list}>
        {[0, 1, 2].map((i) => (
          <section key={i} className={cardStyles.card}>
            <CardHead w={[148, 148, 136][i]} />
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <span className={styles.who}>
                  <Slot kind="avatar40" style={{ width: 36, height: 36 }} />
                  <span className={styles.whoText}>
                    <span className={styles.nameRow}><Line w={[100, 84, 108][i]!} lh={24} h={14} className={own.name} /><Line w={60} lh={20} h={14} /></span>
                    {/* (the calm UI build 2026-10-27, 2-26) a waiting chat's facts leave its shift to the head — "With Germaine · Table 7", one line */}
                    <GhostLines className={`${styles.whoLine} ${styles.ghostLines}`} lh={16} h={10} lines={[[150, 150, 140][i] as number]} />
                  </span>
                </span>
                <span className={styles.press}><Slot kind="btn" w={66} /><Slot kind="icon" /></span>
              </div>
              <GhostLines className={`${styles.help} ${styles.ghostLines}`} lh={16} h={10} lines={['94%', '36%']} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
function Results() {
  return (
    <div className={styles.section}>
      <StatTiles>{['Chats held', 'Converted', 'Follow-ups', 'Dropped'].map((l) => (
        <div key={l} className={tileStyles.tile}><Words className={tileStyles.label}>{l}</Words><Line w={48} lh={24} h={18} className={tileStyles.value} /><GhostLines className={`${tileStyles.help} ${styles.ghostLines}`} lh={16} h={10} lines={[120, [80, 'phone']]} /></div>
      ))}</StatTiles>
      <GhostLines className={`${styles.help} ${styles.ghostLines}`} lh={16} h={10} lines={[420, [160, 'phone']]} />
      <section className={cardStyles.card}>
        <CardHead w={96} />
        <div className={styles.cardBody}>
          <div className={styles.byTable} data-card-table="">
            <div className={styles.byHead}><Words>Member</Words><Words className={styles.num}>Chats</Words><Words className={styles.num}>Converted</Words><Words className={styles.num}>Follow-up</Words><Words className={styles.num}>Dropped</Words></div>
            {[0, 1].map((i) => <div key={i} className={styles.byRow}><span className={styles.who}><Slot kind="avatar" /><Line w={[48, 72][i]!} lh={20} h={12} /></span>{[0, 1, 2, 3].map((j) => <Line key={j} w={10} lh={20} h={12} className={styles.num} />)}</div>)}
          </div>
        </div>
      </section>
    </div>
  )
}
