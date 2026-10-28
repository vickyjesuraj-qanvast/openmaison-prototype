'use client'

import { Fragment, useRef, useState } from 'react'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { HoldNotice } from './project/hold-notice'
import { PageReveal } from '@/components/shell/page-reveal'
import { money2 } from '@/lib/quotes/math'
import { clientDay, type NeedItem } from '@/lib/portal/model'
import type { BeforeStep } from '@/lib/portal/needs'
import type { PortalData, PortalHome as Home } from '@/lib/portal/home'
import { CLIENT_STATE_LABEL, dayLabel, shortTitle } from '@/lib/projects/schedule-model'
import { resumeWords } from '@/lib/portal/schedule-model'
import type { PortalMoneyHome } from '@/lib/projects/payments-portal'
import type { PortalUpdate } from '@/lib/portal/updates'
import { ContactLine } from './contact-line'
import { PortalFrame } from './portal-frame'
import { PaidSoFar } from './money/portal-money'
import money from './money/money.module.css'
import { PortalHomeGhost } from './portal-ghosts'
import { LatestUpdateCard, StandsCard } from './project/home-cards'
import { PhotoViewer } from './project/photo-viewer'
import { photosOf } from './project/portal-updates'
import { useSeenUpdates } from './project/use-seen'
import styles from './portal.module.css'
import project from './project/project.module.css'

/** In a studio's preview a press opens the studio's own read of the record, in a new tab — the client's link would record a view as theirs.
    (fix-F, F-06 · F-24) One rule for the client too: whatever leaves the portal's pages — a signing or confirmation link, a designs link, a
    file itself — opens in a new tab, so the portal stays where it was; the portal's own pages open in place. */
const leavesPortal = (href: string) => !href.startsWith('/my/') || /^\/my\/[^/]+\/file\//.test(href)
export function hrefFor(preview: boolean, item: { href: string; previewHref: string | null }) {
  if (preview && item.previewHref) return { href: item.previewHref, target: '_blank', rel: 'noreferrer' }
  return leavesPortal(item.href) ? { href: item.href, target: '_blank', rel: 'noreferrer' } : { href: item.href }
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * (Projects round 4a, boards 1 · 6 · 7) The portal's home: "Hello {first name}", What needs you first — each thing with its own button into
 * the page where it is done (today's links, Q-40) — then each home the client has with the studio: before work starts, its steps (board 6);
 * once it runs, where it stands. Their designs, and "Message your designer on WhatsApp" (Q-43). One column on a phone, two at a desk.
 */
export function PortalHomeView({ data, money = [] }: { data: PortalData; /** (fix-F, F-09) board 7's Money card, per project */ money?: PortalMoneyHome[] }) {
  const { homes, needs, visitor } = data
  const one = homes.length === 1 ? homes[0]! : null
  const lede = one ? homeLede(one, data.now) : `Your renovation with ${data.look.studio}`
  /* (fix-F, F-36) board 6: the current step of Before work starts carries its own ask — What needs you lists what the steps don't */
  const stepHrefs = new Set(homes.flatMap((h) => h.steps.filter((st) => st.state === 'now' && st.action).map((st) => st.action!.href)))
  const shownNeeds = needs.filter((n) => !stepHrefs.has(n.href))
  const before = homes.filter((h) => h.steps.length > 0)
  const designs = homes.flatMap((h) => h.designs.map((d) => ({ ...d, home: h })))
  /* (r4b) the newest published update of each project, as boards 1 · 7 draw it — opened once it is on screen (never in a preview) */
  const latest = homes.filter((h) => h.latestUpdate)
  const root = useRef<HTMLDivElement>(null)
  useSeenUpdates(data.slug, root, !visitor.preview)
  const [viewing, setViewing] = useState<{ u: PortalUpdate; i: number } | null>(null)
  return (
    <PageReveal skeleton={<PortalHomeGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="home" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={styles.hello}>
          <h1 className={styles.h1}>Hello {visitor.first}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
        <div ref={root} className={`${styles.cols} ${project.homeOrder}`}>
          <div className={styles.colMain}>
            {/* (gaps build D, item 4 — M-01) a project on hold says so before anything else, with its reason and when it should resume */}
            {homes.filter((h) => h.hold).map((h) => <HoldNotice key={`hold-${h.id}`} hold={h.hold!} now={data.now} place={homes.length > 1 ? h.place || h.propertyType : null} />)}
            <NeedsCard needs={shownNeeds} preview={visitor.preview} />
            {latest.map((h) => <LatestUpdateCard key={h.id} update={h.latestUpdate!} slug={data.slug} onPhoto={(i) => setViewing({ u: h.latestUpdate!, i })} />)}
            {before.map((h) => <BeforeWork key={h.id} home={h} many={homes.length > 1} preview={visitor.preview} />)}
          </div>
          <div className={styles.colSide}>
            {homes.filter((h) => h.stage !== 'lead').map((h) => {
              const m = money.find((x) => x.homeId === h.id)
              return (
                <Fragment key={h.id}>
                  {h.schedule?.summary
                    ? <StandsCard summary={h.schedule.summary} slug={data.slug} place={homes.length > 1 ? h.place || h.propertyType : null} />
                    : <HomeCard home={h} now={data.now} />}
                  {m && m.stages.length ? <MoneyCard m={m} now={data.now} place={homes.length > 1 ? h.place || h.propertyType : null} /> : null}
                </Fragment>
              )
            })}
            {designs.length ? (
              <section className={styles.card} aria-label="Your designs" data-testid="portal-designs">
                {designs.map((d) => (
                  <div key={d.token} className={styles.row}>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>Your designs{homes.length > 1 ? ` · ${d.home.place || d.home.propertyType}` : ''}</span>
                      <span className={styles.rowLine}>{plural(d.rooms, 'room')} to look at. Mark what you like.</span>
                    </span>
                    <a className={`${styles.link} ${styles.rowGo}`} {...hrefFor(visitor.preview, { href: `/renders/${d.token}`, previewHref: `/visualizer/${d.designId}` })}>Open</a>
                  </div>
                ))}
              </section>
            ) : null}
            <ContactLine data={data} ask="A question?" />
          </div>
        </div>
        <PhotoViewer open={!!viewing} title={viewing?.u.title ?? ''} photos={viewing ? photosOf(viewing.u) : []} index={viewing?.i ?? 0}
                     onIndex={(i) => setViewing((v) => (v ? { ...v, i } : v))} onClose={() => setViewing(null)} />
      </PortalFrame>
    </PageReveal>
  )
}

/** The line under Hello: the home, and where its work stands (board 7) — from the schedule as last shared (r4b): the project's own target
    end follows the live milestones, which may hold changes the client has not been shown, so once a schedule exists it is never printed. */
function homeLede(h: Home, now: number): string {
  const at = h.place ? `Your home at ${h.place}` : `Your ${h.propertyType}`
  const s = h.schedule?.summary
  if (h.stage === 'in_progress' && h.hold) return `${at}. Work is paused for now.`   // (gaps build D, item 4) the hold card says why
  if (h.stage === 'in_progress' && s) {
    /* (the calm UI build 2026-10-27, 3-10 · T-17) the line reads the state the card under it reads: a paused milestone is paused here too, with the
       day the studio said it picks up again — "Electrical is paused — resuming around 27 Oct. Handover is planned for Fri 13 Nov." */
    if (s.now?.paused) {
      const resume = resumeWords(s.now.resumeOn, now)
      return `${at}. ${shortTitle(s.now.title)} is paused${resume ? ` — ${resume.charAt(0).toLowerCase()}${resume.slice(1)}` : ''}.${s.handover !== null ? ` Handover is planned for ${dayLabel(s.handover)}.` : ''}`
    }
    const going = s.now?.state === 'in_progress' ? `${shortTitle(s.now.title)} is under way` : 'Work is under way'
    return `${at}. ${going}${s.handover !== null ? `; handover is planned for ${dayLabel(s.handover)}` : ''}.`
  }
  if (h.stage === 'in_progress' && h.project?.targetEndDate && !h.schedule?.hasMilestones) return `${at}. Work is under way; handover is planned for ${clientDay(h.project.targetEndDate, now)}.`
  if (h.stage === 'in_progress') return `${at}. Work is under way.`
  if (h.stage === 'completed') return `${at}. Your home has been handed over.`
  return at
}

/** What needs you (boards 1 · 7): the count, then each thing with the press that does it — the whole row on a phone, its button at a desk. */
function NeedsCard({ needs, preview }: { needs: NeedItem[]; preview: boolean }) {
  return (
    <section className={`${styles.card} ${styles.needs}`} aria-label="What needs you" data-testid="portal-needs" data-slot="needs">
      <h2 className={styles.h2}>{needs.length ? `${plural(needs.length, 'thing')} ${needs.length === 1 ? 'needs' : 'need'} you` : 'Nothing needs you right now'}</h2>
      {needs.length ? needs.map((n) => (
        <a key={n.key} className={styles.need} data-testid="portal-need" data-kind={n.kind} {...hrefFor(preview, n)}>
          <span className={styles.needGlyph}><Icon name={n.icon} size={20} weight={300} /></span>
          <span className={styles.needText}>
            <span className={styles.needTitle}>{n.title}</span>
            <span className={styles.needLine}>{n.line}</span>
          </span>
          <span className={styles.needAction}>{n.action}</span>
          <span className={styles.needChevron}><Icon name="chevron_right" size={20} /></span>
        </a>
      )) : <p className={styles.needsEmpty}>When your designer sends you something to look at, sign or answer, it shows here.</p>}
    </section>
  )
}

/** Before work starts (board 6): the steps in their order — done ones ticked, the current one framed in the studio's colour with its button. */
function BeforeWork({ home, many, preview }: { home: Home; many: boolean; preview: boolean }) {
  const open = home.steps.filter((s) => s.state !== 'done').length
  return (
    <section className={styles.section} aria-label="Before work starts" data-testid="portal-before">
      <div className={styles.cardHead}>
        <h2 className={styles.h2}>Before work starts{many ? ` · ${home.place || home.propertyType}` : ''}</h2>
      </div>
      <p className={styles.line}>{open ? `${plural(home.steps.length, 'step')} before work starts on your home.` : 'Every step is done. Your designer takes it from here.'}</p>
      <ol className={styles.steps}>
        {home.steps.map((s, i) => <Step key={s.key} step={s} n={i + 1} preview={preview} />)}
      </ol>
    </section>
  )
}

function Step({ step, n, preview }: { step: BeforeStep; n: number; preview: boolean }) {
  return (
    <li className={`${styles.card} ${styles.step}`} data-state={step.state} data-testid="portal-step" data-step={step.key}>
      <span className={styles.stepMark}>{step.state === 'done' ? <Icon name="check" size={18} /> : n}</span>
      <div className={styles.stepBody}>
        <div className={styles.stepText}>
          <span className={styles.stepTitle}>{step.title}</span>
          <span className={styles.stepLine}>
            {step.line}
            {step.change ? <>{' '}<a className={styles.link} href={step.change.href}>{step.change.label}</a></> : null}
          </span>
        </div>
        {step.action ? <a className={styles.stepGo} {...hrefFor(preview, step.action)}>{step.action.label}</a> : null}
      </div>
    </li>
  )
}

/** A home that is a project: where it stands, from the project's own dates (round 4b brings its stages). */
function HomeCard({ home, now }: { home: Home; now: number }) {
  const p = home.project
  /* (fix-F, F-28) the client's word for work in progress (REG-1051) */
  const chip = home.hold ? <MetaChip color="yellow">Paused</MetaChip> : home.stage === 'in_progress' ? <MetaChip color="green">{CLIENT_STATE_LABEL.in_progress}</MetaChip> : home.stage === 'completed' ? <MetaChip>Completed</MetaChip> : <MetaChip color="yellow">Setting up</MetaChip>
  /* (r4b) once the project has milestones its target end follows them live — the client reads the handover from the schedule as shared */
  const target = p?.targetEndDate && !home.schedule?.hasMilestones ? p.targetEndDate : null
  const line = home.stage === 'in_progress'
    ? [p?.startedAt ? `Work began ${clientDay(p.startedAt, now)}.` : null, target ? `Handover is planned for ${clientDay(target, now)}.` : null].filter(Boolean).join(' ')
    : home.stage === 'completed' ? 'Your home has been handed over.'
    : p?.startDate ? `Your project is being set up. Work is planned to begin ${clientDay(p.startDate, now)}.` : 'Your project is being set up.'
  return (
    <section className={`${styles.card} ${styles.cardPad}`} aria-label={home.title} data-testid="portal-home-card">
      <div className={styles.homeHead}>
        <h2 className={styles.h3}>{home.place ? `Your home at ${home.place}` : home.title}</h2>
        {chip}
      </div>
      <p className={styles.line}>{line}</p>
    </section>
  )
}

/** (fix-F, F-09 — board 7) Money on the home: Paid so far of the contract with its bar (the Money tab's own block), and what is due — "S$20,784.94
    is due now" in the due colour — with the way to the Money tab. Not drawn when the studio has Money switched off (the page sends none). */
function MoneyCard({ m, now, place }: { m: PortalMoneyHome; now: number; place: string | null }) {
  const due = m.stages.filter((s) => s.state === 'due' && s.owedMinor > 0)
  const owed = due.reduce((n, s) => n + s.owedMinor, 0)
  const soonest = due.map((s) => s.dueAt).filter((x): x is number => x !== null).sort((a, b) => a - b)[0] ?? null
  const when = soonest === null || soonest <= now ? 'is due now' : `is due ${clientDay(soonest, now)}`
  return (
    <section className={money.paid} aria-label="Payments" data-slot="money" data-testid="portal-home-money">   {/* (the calm UI build 2026-10-27, 3-02) */}
      {place ? <span className={money.eyebrow}>{place}</span> : null}
      <PaidSoFar h={m} />
      {owed > 0 ? <p className={money.dueLine} data-testid="portal-home-money-due">{`${money2(owed)} ${when}`}</p> : null}
    </section>
  )
}
