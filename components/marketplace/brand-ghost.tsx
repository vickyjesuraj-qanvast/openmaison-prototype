'use client'

import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead2, Line, Para, Words, cycle } from '@/components/shell/ghost-kit'
import { DEMO_ADDRESS } from '@/lib/marketplace/model'
import card from '@/components/leads/detail/card.module.css'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import mk from './marketplace.module.css'
import styles from './brand-page.module.css'

/** A card of the brand's page as a ghost: the Overview card's head (its title in the page's own words) and its body's lines. */
/** (the calm UI build 2026-10-27, 6-11) A brand not in the vendors keeps the place of the About card's vendor line ("Not in your vendors yet"
    went — the header's Add to my vendors says it), so adding it fills the line instead of pushing every card below, and the ghost's About is
    one height for both. Its ghost draws the same. */
export function StateSpace() {
  return <div className={`${styles.state} ${styles.stateSpace}`} aria-hidden><span className={styles.textLink}>{'\u00a0'}</span></div>
}

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
      {/* Add to my vendors · WhatsApp (the phone's word; a desk's names the brand — the header's buttons aren't measured against the page, and one
          width keeps the streamed loader and the reveal the same picture at every width) */}
      <GhostHead2 crumb={84} title={180} actions={[152, 118]} />
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
                <StateSpace />   {/* the vendor line's place, as the page holds it */}
              </div>
            </CardGhost>
            <CardGhost title="Contact" testId="brand-contact">
              <div className={styles.rows}>{[0, 1, 2].map((i) => <div key={i} className={styles.row}><Bone w={20} h={20} r={4} /><span className={styles.rowText}><Line w={cycle([72, 48, 120], i)} lh={16} h={12} /><Line w={cycle([96, 180, 220], i)} lh={16} h={10} /></span></div>)}</div>
            </CardGhost>
            <CardGhost title="Web links" testId="brand-links">
              {/* (the calm UI build, 6-11) the demo catalogue's links: a label a row, and the one line under them that says so */}
              <div className={styles.rows}>{[0, 1, 2].map((i) => <div key={i} className={styles.row}><Bone w={20} h={22} r={4} /><span className={styles.rowText}><Line w={cycle([140, 80, 72], i)} lh={16} h={12} /></span></div>)}
                <p className={styles.linksNote}><Words>{DEMO_ADDRESS}</Words></p></div>
            </CardGhost>
          </div>
          <div className={styles.mainCol}>
            <CardGhost title="Services" testId="brand-services"><div className={styles.cardBody}><span style={{ display: 'flex', flexDirection: 'column' }}><Para lines={2} lh={20} h={12} /><span className={styles.ghostPhone}><Para lines={4} lh={20} h={12} /></span></span></div></CardGhost>
            <CardGhost title="Deals" testId="brand-deals">
              <div className={styles.deals}>
                {[0, 1].map((i) => (
                  <div key={i} className={gallery.card}>
                    <span className={`${gallery.thumb} ${mk.cover}`}><Bone w="100%" h={160} r={0} style={{ height: '100%' }} /></span>
                    <span className={`${gallery.body} ${mk.dealBody}`}><span style={{ display: 'flex', flexDirection: 'column' }}><Line w="80%" lh={20} h={14} /><Line w="50%" lh={20} h={14} /><span className={styles.ghostPhone}><Line w="40%" lh={20} h={14} /></span></span><Line w="40%" lh={16} h={10} /></span>
                    <span className={gallery.usage}><span style={{ display: 'flex', flexDirection: 'column' }}><Line w="60%" lh={16} h={10} /><span className={styles.ghostPhone}><Line w="30%" lh={16} h={10} /></span></span></span>
                  </div>
                ))}
              </div>
            </CardGhost>
            <CardGhost title="Products" testId="brand-products">
              <div className={styles.rows}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.product}>
                    <span className={styles.productPic}><Bone w="100%" h={64} r={0} style={{ height: '100%' }} /></span>
                    <span className={styles.productText}><Line w={cycle([180, 150, 200, 160], i)} lh={20} h={14} />
                      {/* the description — one line at a desk, two (the first, three) on a phone — and the price on its 20 line */}
                      <span style={{ display: 'flex', flexDirection: 'column' }}><Line w="90%" lh={16} h={10} /><span className={styles.ghostPhone}><Line w="60%" lh={16} h={10} />{i === 0 ? <Line w="40%" lh={16} h={10} /> : null}</span></span>
                      <Line w={120} lh={20} h={12} /></span>
                    <span className={styles.productAct}><Bone w={64} h={24} r={4} /></span>
                  </div>
                ))}
              </div>
            </CardGhost>
            {/* the brand's questions (its FAQs) — the last card at a desk, before Contact on a phone (the page's order) */}
            <CardGhost title="Questions" testId="brand-faqs">
              <div className={styles.rows}>
                {[0, 1].map((i) => (
                  <div key={i} className={styles.faq}>
                    <Line w={cycle([220, 180], i)} lh={16} h={12} />
                    <span style={{ display: 'flex', flexDirection: 'column' }}><Line w="88%" lh={20} h={12} /><span className={styles.ghostPhone}><Line w="70%" lh={20} h={12} />{i === 0 ? <Line w="40%" lh={20} h={12} /> : null}</span></span>
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
