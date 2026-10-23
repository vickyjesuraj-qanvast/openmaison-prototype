'use client'

import { useSearchParams } from 'next/navigation'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { useSeedFlag } from '@/lib/ghost-shape'   // (pending modules S41b-1)
import qp from './quote-preview.module.css'
import styles from './preview-skeleton.module.css'

/**
 * (sweep S1 #27) Ghost for Preview: its own 76px bar (back · crumb + title + three chips · Internal copy · four buttons) over
 * the surface-bg canvas with one A4 sheet centred (UX audit Q2: the last button is the quote's Send ▾) — the page's own layout, not the editor's (page-checklist › Load & refresh).
 * (REG-708) The bar, body, column and stage are the page's own classes; the sheet is the document's A4 (794 wide), fitted to the stage where it is narrower.
 * (Quotes on the move, K3 — P-05) ≤1024 the page wears its one-line bar (back · the title's two lines · Download and Send on a tablet · ⋮) and a
 * tablet draws the A4 at 1:1, centred; a phone adds the cards' head ("n lines · As printed"), the reading cards and the foot's Send — or, when the
 * address says `?paper=1`, the house viewer's shape (its 64 head, the A4 fit to the width, the page dots), since that is what the person lands on.
 * The width is the stylesheet's call, so the streamed loader and the reveal draw the same ghost.
 */
export function PreviewSkeleton() {
  const costs = useSeedFlag('role.costs', true)   // (pending modules S41b-1) no Internal copy for a member who doesn't see costs
  const paper = useSearchParams().get('paper') === '1'
  return (
    <GhostSheet label="Loading preview">
      <div className={styles.page} data-paper={paper || undefined}>
        <header className={`${qp.bar} ${styles.desk}`}>
          <Slot kind="icon" />
          <div className={qp.titleBlock}>
            <span className={qp.crumb}><Line w={150} lh={16} h={10} /></span>
            <div className={qp.titleRow}>
              <Line w={78} lh={24} h={20} />
              <span className={qp.chips}><Slot kind="chip" w={150} /><Slot kind="chip" w={52} /><Slot kind="chip" w={52} /></span>
            </div>
          </div>
          <div className={qp.actions}>
            {costs ? <span className={qp.internal}><Slot kind="switch" /><Line w={80} lh={20} h={12} /></span> : null}
            <Slot kind="btn" w={202} />
            <Slot kind="btn" w={119} />
            <Slot kind="btn" w={155} />
            <Slot kind="btn" w={91} />   {/* (UX audit Q2) the quote's Send ▾ — Mark as sent is its last row now */}
          </div>
        </header>
        <header className={`${qp.touchBar} ${styles.touch}`}>
          <Slot kind="icon" />
          <div className={qp.touchTitle}><Line w={78} lh={24} h={16} /><Line w={150} lh={20} h={12} /></div>
          <span className={styles.tabletOnly}><Slot kind="icon" /></span>   {/* Download: a tablet's bar; a phone downloads from the viewer's own */}
          <Slot kind="icon" />
          <span className={styles.tabletOnly}><Slot kind="btn" w={91} /></span>
        </header>
        <div className={qp.body}>
          <div className={`${qp.column} ${styles.column}`}>
            <div className={`${qp.stage} ${styles.stage} ${styles.notPhone}`}>
              <div className={styles.sheet}>
                <div className={styles.letterhead}>
                  <Bone w={120} h={32} r={4} />
                  <span className={styles.lines}><Bone w={160} h={12} /><Bone w={120} h={12} /></span>
                </div>
                <Bone w="45%" h={20} />
                {[0, 1, 2, 3, 4, 5, 6].map((i) => <Bone key={i} w="100%" h={14} />)}
              </div>
            </div>
            <div className={`${styles.cards} ${styles.phoneOnly}`}>
              <div className={qp.readHead}><Line w={48} lh={20} h={12} /><Line w={104} lh={36} h={14} /></div>   {/* "16 lines · As printed" */}
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.cardGroup}>
                  {i % 2 === 0 ? <div className={styles.caption}><Line w={72} lh={20} h={10} /><Line w={64} lh={20} h={10} /></div> : null}   {/* a section's caption row: its name, its amount */}
                  <div className={styles.card}>
                    <span className={styles.cardText}><Line w={i % 2 ? 180 : 220} lh={24} h={16} /><Line w={120} lh={20} h={12} /></span>
                    <Line w={84} lh={24} h={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={`${qp.foot} ${styles.phoneOnly}`}><Bone w="100%" h={48} r={4} /></div>
        {/* `?paper=1` on a phone: the viewer the person lands on — its head, the A4 fit to the width, the dots */}
        {paper ? (
          <div className={`${styles.viewer} ${styles.phoneOnly}`} aria-hidden>
            <div className={styles.viewerHead}><Slot kind="icon" /><span className={styles.viewerTitle}><Line w={92} lh={24} h={20} /><Line w={120} lh={16} h={10} /></span><Slot kind="icon" /></div>
            <div className={styles.viewerBody}><div className={`${styles.sheet} ${styles.viewerSheet}`}>
              <div className={styles.letterhead}><Bone w={120} h={32} r={4} /><span className={styles.lines}><Bone w={160} h={12} /><Bone w={120} h={12} /></span></div>
              <Bone w="45%" h={20} />
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <Bone key={i} w="100%" h={14} />)}
            </div></div>
            <div className={styles.dotsRow}><div className={styles.dots}><Bone w={8} h={8} r="50%" /><Bone w={8} h={8} r="50%" /><Bone w={8} h={8} r="50%" /></div><Line w={236} lh={28} h={10} /></div>
          </div>
        ) : null}
      </div>
    </GhostSheet>
  )
}
