'use client'

import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead2, Line, Para, Words, cycle } from '@/components/shell/ghost-kit'
import card from '@/components/leads/detail/card.module.css'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import mk from './marketplace.module.css'
import styles from './brand-page.module.css'

/** A card of the brand's page as a ghost: the Overview card's head (its title in the page's own words) and its body's lines. */
function CardGhost({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <section className={card.card} data-card={testId}>
      <div className={card.head}><div className={card.headText}><Words className={card.title}>{title}</Words></div></div>
      {children}
    </section>
  )
}

/**
 * (pending modules S24 · REG-708) A brand's page as a ghost — its own layout on its own classes: the L2 header (the crumb, the name, Add to
 * my vendors and WhatsApp), the pictures (the main one and the four beside it — a strip under it on a phone), and the two stacks of cards
 * (About · Contact · Web links | Services · Deals · Products), which fold to one column in the page's order. Its loading.tsx and the page's
 * PageReveal draw it.
 */
export function BrandGhost() {
  return (
    <GhostSheet label="Loading the brand">
      <GhostHead2 crumb={84} title={180} actions={[152, 120]} />
      <div className={styles.content} aria-hidden>
        <section className={styles.gallery}>
          <div className={styles.main}><Bone w="100%" h={420} r={0} style={{ height: '100%' }} /></div>
          <div className={styles.thumbs}>{[0, 1, 2, 3].map((i) => <span key={i} className={styles.thumbBtn}><Bone w="100%" h={200} r={0} style={{ height: '100%' }} /></span>)}</div>
        </section>
        <div className={styles.grid}>
          <div className={styles.side}>
            <CardGhost title="About" testId="brand-about">
              <div className={styles.cardBody}>
                <div className={styles.identity}><span className={styles.logo}><Bone w="100%" h={56} r={0} style={{ height: '100%' }} /></span><span className={styles.identityText}><span className={styles.tagline}><Line w={200} lh={20} h={14} /><Line w={140} lh={20} h={14} /></span><Line w={150} lh={16} h={10} /></span></div>
                <Line w={150} lh={16} h={10} />
              </div>
            </CardGhost>
            <CardGhost title="Contact" testId="brand-contact">
              <div className={styles.rows}>{[0, 1, 2].map((i) => <div key={i} className={styles.row}><Bone w={20} h={20} r={4} /><span className={styles.rowText}><Line w={cycle([72, 48, 120], i)} lh={16} h={12} /><Line w={cycle([96, 180, 220], i)} lh={16} h={10} /></span></div>)}</div>
            </CardGhost>
            <CardGhost title="Web links" testId="brand-links">
              <div className={styles.rows}>{[0, 1, 2].map((i) => <div key={i} className={styles.row}><Bone w={20} h={20} r={4} /><span className={styles.rowText}><Line w={cycle([140, 80, 72], i)} lh={16} h={12} /><Line w={cycle([160, 150, 170], i)} lh={16} h={10} /></span></div>)}</div>
            </CardGhost>
          </div>
          <div className={styles.mainCol}>
            <CardGhost title="Services" testId="brand-services"><div className={styles.cardBody}><span style={{ display: 'flex', flexDirection: 'column' }}><Para lines={2} lh={20} h={12} /></span></div></CardGhost>
            <CardGhost title="Deals" testId="brand-deals">
              <div className={styles.deals}>
                {[0, 1].map((i) => (
                  <div key={i} className={gallery.card}>
                    <span className={`${gallery.thumb} ${mk.cover}`}><Bone w="100%" h={160} r={0} style={{ height: '100%' }} /></span>
                    <span className={`${gallery.body} ${mk.dealBody}`}><Line w={72} lh={16} h={10} /><span style={{ display: 'flex', flexDirection: 'column' }}><Line w="80%" lh={20} h={14} /><Line w="50%" lh={20} h={14} /></span><Line w="40%" lh={16} h={10} /></span>
                    <span className={gallery.usage}><Line w="60%" lh={16} h={10} /></span>
                  </div>
                ))}
              </div>
            </CardGhost>
            <CardGhost title="Products" testId="brand-products">
              <div className={styles.rows}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.product}>
                    <span className={styles.productPic}><Bone w="100%" h={64} r={0} style={{ height: '100%' }} /></span>
                    <span className={styles.productText}><Line w={cycle([180, 150, 200, 160], i)} lh={20} h={14} /><Line w="90%" lh={16} h={10} /><Line w={120} lh={16} h={10} /></span>
                    <span className={styles.productAct}><Bone w={140} h={24} r={4} /></span>
                  </div>
                ))}
              </div>
            </CardGhost>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
