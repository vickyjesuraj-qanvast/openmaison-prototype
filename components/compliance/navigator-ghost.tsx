'use client'

import { useSearchParams } from 'next/navigation'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { GhostHead, GhostHead2, GhostTabs, Line, Para, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import pageStyles from '@/app/leads/leads.module.css'
import chipRow from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'
import compliance from '@/components/projects/compliance/compliance.module.css'
import styles from './navigator.module.css'

/**
 * (REG-708, gaps build I) Tools › Compliance Navigator's ghost — the page's own layout on its own classes: Company's frame (the L1 header, or
 * the L2 with `?from=`, and the tab strip), then the open tab — Your studio's intro and its cards (the title over its line, the state, the
 * about, the two buttons — the official link and Record in Company › Profile), or Rules by home's toolbar, chips and rows. Reads `?tab=` and `?from=` as the page does.
 */
export function NavigatorGhost({ tab }: { tab?: 'studio' | 'rules' }) {
  const params = useSearchParams()
  const open = tab ?? (params.get('tab') === 'rules' ? 'rules' : 'studio')
  const from = !!params.get('from')
  return (
    <GhostSheet label="Loading the Compliance Navigator" l1={!from}>
      {from ? <GhostHead2 crumb={96} title={220} /> : <GhostHead title={220} />}
      <GhostTabs labels={['Your studio', 'Rules by home']} active={open === 'rules' ? 1 : 0} />   {/* (S43E, F3-03 W3-04) the open tab’s place, so the strip never jumps sideways at the hand-over (S42 A-10’s rule, here too) */}
      <div className={pageStyles.content} aria-hidden>
        {open === 'rules' ? (
          <div className={styles.page}>
            <div className={styles.bar}><Line w={220} lh={36} h={16} /><span className={styles.barActions}><Slot kind="icon" /></span></div>
            <div className={styles.filters}>
              <div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}>{[76, 60, 100].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div></div></div></div>
              <div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}>{[96, 64, 80, 80].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div></div></div></div>
              <Line w={300} lh={16} h={10} />
            </div>
            <div className={compliance.groups}>
              {[4, 3].map((n, g) => (
                <section key={g} className={compliance.group}>
                  <span className={compliance.groupHead}><Words>{g === 0 ? 'Permits & Approvals' : 'Professional Engagement'}</Words></span>
                  <div className={compliance.table}>
                    <div className={compliance.head}><Words>Rule</Words></div>{/* (simplify round 2) the rule list's head, as the page draws it */}
                    {Array.from({ length: n }, (_, i) => (
                      <div key={i} className={compliance.row}><div className={compliance.item}><Bone w={20} h={20} r="50%" /><span className={compliance.itemText}><Line w={cycle([240, 200, 280], i + g)} lh={20} h={12} /><Line w={160} lh={20} h={10} /></span></div></div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.page}>
            <Line w="60%" lh={20} h={12} />
            <div className={styles.actions}>
              {[0, 1, 2].map((i) => (
                <section key={i} className={styles.card}>
                  <div className={styles.cardHead}><span className={styles.cardText}><Line w={cycle([320, 260, 240], i)} lh={24} h={14} /><Line w={280} lh={16} h={10} /></span><Slot kind="chip" w={56} /></div>
                  <Slot kind="chip" w={64} />
                  <Para lines={2} lh={20} h={12} />
                  <Line w={90} lh={16} h={10} />   {/* (parity map, TD-110) the note's line — Add a note, or the note's caption */}
                  <Line w={110} lh={16} h={10} />
                  <div className={styles.buttons}><Slot kind="btn" w={170} /><Slot kind="btn" w={236} /></div>   {/* (one-home N-07) Record in Company › Profile */}
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </GhostSheet>
  )
}
