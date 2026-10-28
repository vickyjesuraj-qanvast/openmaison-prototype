'use client'

import { useState } from 'react'
import { Icon } from '@/components/om/icon'
import { PageReveal } from '@/components/shell/page-reveal'
import { establishedLine, type AboutPage } from '@/lib/portal/about-model'
import { waLink } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import { PortalFrame } from '../portal-frame'
import { PhotoViewer } from '../project/photo-viewer'
import { PortalAboutGhost } from '../threads/thread-ghosts'
import { WorkDialog } from '@/components/portfolio/designer-card'   // (pending modules S27)
import { yearsLine, type WorkCard } from '@/lib/portfolio/model'
import p from '../portal.module.css'
import a from './about.module.css'

const phoneText = (d: string) => (d.length === 8 ? `+65 ${d.slice(0, 4)} ${d.slice(4)}` : d)

/**
 * (gaps build H — H-Q20…H-Q23) The portal's About page — 1.0's About and Team as one page: the cover photo, "Est. 2012", the studio's story,
 * its awards and badges, the other photos, Our team (the studio's own members, shown by the studio — never typed twice), Get in touch and
 * Follow us. Only what the studio filled in is drawn; the server sends nothing while the About us switch is off or the page is empty.
 */
export function PortalAboutView({ data, about }: { data: PortalData; about: AboutPage }) {
  const [viewing, setViewing] = useState<number | null>(null)
  const [work, setWork] = useState<{ w: WorkCard; who: string } | null>(null)
  const [cover, ...rest] = about.photos
  const c = about.contact
  return (
    <PageReveal skeleton={<PortalAboutGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="about" visitor={data.visitor} paused={data.paused} needs={data.needs}>
        <div className={p.hello}>
          <h1 className={p.h1}>{`About ${about.studio}`}</h1>
          {about.tagline ? <p className={p.lede}>{about.tagline}</p> : null}
        </div>
        {cover ? (
          <button type="button" className={a.coverBtn} onClick={() => setViewing(0)} aria-label="The studio’s cover photo" data-testid="about-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={a.cover} src={cover.src} alt={cover.caption ?? ''} />
          </button>
        ) : null}
        <div className={p.cols}>
          <div className={p.colMain}>
            {about.storyHtml || about.year ? (
              <section className={`${p.card} ${p.cardPad}`} data-testid="about-story">
                {about.year ? <p className={a.est}>{establishedLine(about.year, data.now)}</p> : null}
                {/* the studio's own words, cleaned on the server to the house allowlist (lib/contracts/sanitize.ts) */}
                {about.storyHtml ? <div className={a.story} dangerouslySetInnerHTML={{ __html: about.storyHtml }} /> : null}
              </section>
            ) : null}
            {rest.length ? (
              <section className={p.section} data-testid="about-photos">
                <h2 className={a.h2}>Our work</h2>
                <div className={a.gallery}>
                  {rest.map((ph, i) => (
                    <button key={ph.id} type="button" className={a.galleryItem} onClick={() => setViewing(i + 1)} aria-label={ph.caption ?? `Photo ${i + 2}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            {about.team.length ? (
              <section className={p.section} data-testid="about-team">
                <h2 className={a.h2}>Our team</h2>
                <div className={a.team}>
                  {about.team.map((m) => (
                    <div key={m.id} className={a.member} data-testid="about-member">
                      {m.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={a.portrait} src={m.photo} alt="" loading="lazy" />
                      ) : <span className={a.initial} style={m.color === 'photo' ? undefined : { ['--tint' as string]: m.color }} aria-hidden>{m.name.charAt(0).toUpperCase()}</span>}
                      <span className={a.memberText}>
                        <p className={a.memberName}>{m.name}</p>
                        <p className={a.memberTitle}>{[m.title, yearsLine(m.years)].filter(Boolean).join(' · ')}</p>
                        {/* (the calm UI build 2026-10-27, T-06) what they are known for is meta — a grey line under their title, never capitals tags */}
                        {m.knownFor.length ? <p className={a.memberTitle} data-testid="about-member-known">{m.knownFor.join(' · ')}</p> : null}
                        {m.bio ? <p className={a.bio}>{m.bio}</p> : null}
                        {/* (pending modules S27) their work — each piece opens its pictures */}
                        {m.work.length ? (
                          <span className={a.work} data-testid="about-member-work">
                            {m.work.map((w) => (
                              <button key={w.id} type="button" className={a.workBtn} onClick={() => setWork({ w, who: m.name })} aria-label={`${w.title} — see its pictures`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {w.pictures[0] ? <img className={a.workPic} src={w.pictures[0].src} alt="" loading="lazy" /> : null}
                                <span className={a.workName}>{w.title}</span>
                              </button>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <div className={p.colSide}>
            {about.awards.length || about.badges.length ? (
              <section className={`${p.card} ${p.cardPad}`} data-testid="about-awards">
                <h2 className={a.h2}>Awards and recognition</h2>
                {about.awards.length ? <ul className={a.awards}>{about.awards.map((w) => <li key={w.id} className={a.award}><Icon name="workspace_premium" size={20} weight={300} /><span>{w.name}</span>{w.year ? <span className={a.awardYear}>{w.year}</span> : null}</li>)}</ul> : null}
                {about.badges.length ? <div className={a.badges}>{about.badges.map((b, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} className={a.badge} src={b} alt="" />
                ))}</div> : null}
              </section>
            ) : null}
            <section className={`${p.card} ${p.cardPad}`} data-testid="about-contact">
              <h2 className={a.h2}>Get in touch</h2>
              <ul className={a.touch}>
                {c.phone ? <li className={a.touchRow}><Icon name="call" size={20} weight={300} /><a className={p.link} href={`tel:+65${c.phone}`}>{phoneText(c.phone)}</a></li> : null}
                {c.whatsapp ? <li className={a.touchRow}><Icon name="chat" size={20} weight={300} /><a className={p.link} href={waLink(c.whatsapp, `Hi ${about.studio}, it’s ${data.visitor.name}. `)} target="_blank" rel="noreferrer">WhatsApp us</a></li> : null}
                {c.email ? <li className={a.touchRow}><Icon name="mail" size={20} weight={300} /><a className={p.link} href={`mailto:${c.email}`}>{c.email}</a></li> : null}
                {c.address ? <li className={a.touchRow}><Icon name="storefront" size={20} weight={300} /><a className={p.link} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noreferrer">{c.address}</a></li> : null}
                {c.website ? <li className={a.touchRow}><Icon name="link" size={20} weight={300} /><a className={p.link} href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></li> : null}
              </ul>
              {about.socials.length ? (
                <>
                  <h2 className={a.h2}>Follow us</h2>
                  <div className={a.follow}>{about.socials.map((s) => <a key={s.key} className={p.link} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>)}</div>
                </>
              ) : null}
            </section>
          </div>
        </div>
        <WorkDialog work={work?.w ?? null} who={work?.who ?? ''} onClose={() => setWork(null)} />
        <PhotoViewer open={viewing !== null} title={`About ${about.studio}`} photos={about.photos.map((ph) => ({ id: ph.id, src: ph.src, name: ph.caption ?? 'Photo' }))} index={viewing ?? 0}
                     onIndex={(i) => setViewing(i)} onClose={() => setViewing(null)} />
      </PortalFrame>
    </PageReveal>
  )
}
