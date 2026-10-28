'use client'

import { useState, type CSSProperties } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Dialog } from '@/components/om/dialog'
import { workFacts, yearsLine, type PublicCard, type WorkCard } from '@/lib/portfolio/model'
import styles from './designer-card.module.css'

/**
 * (pending modules S27 — api:designer-portfolio-profiles: 1.0's DesignerProfileCard on the Hangout page, and its never-mounted ProfileEditor's
 * fields) A member's public card, drawn the same wherever a client reads it — a studio's Hangout page, the portal's Our team, the Public
 * profile's preview: the photo (else the initial on their tint), the name, the job title and the years, what they are known for, a line or two
 * about them, when they are at the tables (a Hangout page), and their work — each piece a picture and its name; a press opens its pictures.
 * Pure display: every address it draws is the reader's own (each checked by its route). *(invented copy: "Their work", "years in interior design")*
 */
export function DesignerCard({ card, when, compact = false, testId = 'designer-card' }: { card: PublicCard; when?: string | null; compact?: boolean; testId?: string }) {
  const [open, setOpen] = useState<WorkCard | null>(null)
  const years = yearsLine(card.years)
  return (
    <div className={styles.card} data-testid={testId} data-member={card.id}>
      <div className={styles.top}>
        <span className={styles.face} style={{ '--tint': card.color } as CSSProperties} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {card.photo ? <img src={card.photo} alt="" /> : card.name.trim().slice(0, 1).toUpperCase()}
        </span>
        <span className={styles.who}>
          <h3 className={styles.name}>{card.name}</h3>
          <span className={styles.title}>{[card.title, years].filter(Boolean).join(' · ')}</span>
          {/* (the calm UI build 2026-10-27 — 5-24, T-06) what they are known for is words, not capital tags (a tag reads as a status) */}
          {card.knownFor.length ? <span className={styles.known} data-testid="known-for">{`Known for ${card.knownFor.join(' · ')}`}</span> : null}
        </span>
      </div>
      {card.bio && !compact ? <p className={styles.bio}>{card.bio}</p> : null}
      {when ? <p className={styles.when}><span className={styles.whenGlyph}><Icon name="schedule" size={16} /></span><span>{when}</span></p> : null}
      {card.work.length && !compact ? (
        <>
          <h4 className={styles.workHead}>Their work</h4>
          <div className={styles.strip} role="list" aria-label={`${card.name}’s work`}>
            {card.work.map((w) => (
              <button key={w.id} type="button" role="listitem" className={styles.tile} onClick={() => setOpen(w)} data-testid="work-tile" aria-label={`${w.title} — see its pictures`}>
                <span className={styles.pic}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {w.pictures[0] ? <img src={w.pictures[0].src} alt="" loading="lazy" /> : <Icon name="image" size={24} />}
                </span>
                <span className={styles.tileName}>{w.title}</span>
                {workFacts(w) ? <span className={styles.tileFacts}>{workFacts(w)}</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <WorkDialog work={open} who={card.name} onClose={() => setOpen(null)} />
    </div>
  )
}

/** A piece of work's pictures: the one picked large with Previous · Next (and ← →), the others as thumbs, its caption and its words. */
export function WorkDialog({ work, who, onClose }: { work: WorkCard | null; who: string; onClose: () => void }) {
  const [i, setI] = useState(0)
  const [seen, setSeen] = useState(work)
  if (seen !== work) { setSeen(work); setI(0) }
  const pics = work?.pictures ?? []
  const pic = pics[Math.min(i, Math.max(0, pics.length - 1))]
  const go = (d: number) => setI((n) => (pics.length ? (n + d + pics.length) % pics.length : 0))
  return (
    <Dialog open={!!work} onClose={onClose} title={work?.title ?? ''} subtitle={work ? [who, workFacts(work)].filter(Boolean).join(' · ') : undefined} size="modal" width={800}>
      {work ? (
        <div className={styles.viewer} data-testid="work-viewer" onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1) } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) } }}>
          {pic ? (
            <div className={styles.stage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pic.src} alt={pic.caption ?? work.title} />
              {pics.length > 1 ? (
                <>
                  <span className={`${styles.nav} ${styles.prev}`}><IconButton icon="chevron_left" label="Previous picture" className={styles.navBtn} onClick={() => go(-1)} /></span>
                  <span className={`${styles.nav} ${styles.next}`}><IconButton icon="chevron_right" label="Next picture" className={styles.navBtn} onClick={() => go(1)} /></span>
                </>
              ) : null}
            </div>
          ) : null}
          {pic?.caption || pics.length > 1 ? <p className={styles.caption}>{[pic?.caption, pics.length > 1 ? `${Math.min(i, pics.length - 1) + 1} of ${pics.length}` : null].filter(Boolean).join(' · ')}</p> : null}
          {pics.length > 1 ? (
            <div className={styles.thumbs}>
              {pics.map((p, n) => (
                <button key={p.id} type="button" className={styles.thumb} aria-current={n === i} aria-label={`Picture ${n + 1}${p.caption ? ` — ${p.caption}` : ''}`} onClick={() => setI(n)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
          {work.description ? <p className={styles.desc}>{work.description}</p> : null}
        </div>
      ) : null}
    </Dialog>
  )
}
