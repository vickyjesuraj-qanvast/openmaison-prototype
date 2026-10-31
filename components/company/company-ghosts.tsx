'use client'

import { usePathname, useSearchParams } from 'next/navigation'   // (S42 audit A-10) · (the calm UI build 2026-10-27) Profile's ?tab=

/* (pending modules S17) a client module: a ghost reads who is signed in (useViewerShape — the app shell's seed) to draw the page they'll see */
import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { GhostChip, GhostField, GhostTable, GhostTextButton, Line, Slot, Words, cycle, deskOnly, labelled, phoneOnly, type Col, type PhoneRows } from '@/components/shell/ghost-kit'
import { LibraryGhostFor } from '@/components/company/templates/library-ghost-for'
import { PLAN_TABS, PRICE_BOOK_TABS, PROFILE_TABS, TEMPLATE_KINDS, profileTabOf } from '@/lib/company/sections'
import { CompanyGhostFrame } from './company-ghost-frame'
import { useCredits } from '@/components/credits/credits-client'   // (pending modules S19) Plan & billing's auto top-up, on or off
import { fmtCredits } from '@/lib/credits/model'
import { sgd, topupPrice } from '@/lib/credits/plans'
import profile from './profile-view.module.css'
import members from './members-view.module.css'
import bank from './questionnaire-view.module.css'
import defs from '@/components/om/definition-list.module.css'   // (pending modules S17) the bank is the studio's definitions list
import note from './read-only-note.module.css'
import integ from './integrations-view.module.css'
import set from '@/app/settings/settings.module.css'   // (the calm UI build 2026-10-27) the house fold's own class (app/settings/how-it-works.tsx)
import plan from './plan/plan.module.css'
import { useUsageShape } from './plan/usage-shape'   // (the calm UI build 2026-10-27 — 5-38, lane B5-R)
import tile from '@/components/om/stat-tile.module.css'
import { QANVAST_REVIEWS_DOOR, REVIEW_LINK_HELP } from '@/lib/company/review-link'   // (pending modules S14) · (S41b-5) Reviews' door
import { CASETRUST_ROW_HELP, ENTITY_GST_WORDS, ENTITY_QR_HELP, MEMBER_DRAWER, MEMBERS_LINKS, MEMBERS_READ_ONLY, PROFILE_DETAILS_HELP, PROFILE_ENTITIES_HELP, PROFILE_REGISTRATIONS_HELP, PROFILE_TAGLINE_HELPER, profileSocialHelp } from '@/lib/company/copy'   // (pending modules S17)
import { linkedText } from '@/lib/settings/copy'
import { BANK_HELP } from '@/lib/company/question-bank'
import { CASETRUST_ID, STUDIO_ACTIONS } from '@/lib/compliance/studio-actions'
import { useSeedFlag, useSeedStudio, useViewerShape } from '@/lib/ghost-shape'
import { WEBHOOK_PLATFORMS } from '@/lib/settings/types'
import { LISTING_WORDS, qanvastConnectionText } from '@/lib/qanvast-listing/model'   // (pending modules S37)
import qv from './qanvast-listing.module.css'

/**
 * (REG-708) Company's page ghosts — one per page, each the page's own layout: its cards, grids and rows keep the page's own classes and
 * bones stand where the words and controls land, at every width (the page's stylesheet moves them). The route's `loading.tsx` draws it
 * and the page hands the same one to its PageReveal, so nothing changes between the two and the reveal lands in place. Counts are the
 * usual page's — a ghost can't know the studio's — and the crossfade takes care of the rest. A card's title and help are the page's own words
 * (`Words`: the letters hidden, the lines drawn), so they wrap as the page wraps them at every width; keep them in step with the page.
 */

const TEMPLATE_TABS = TEMPLATE_KINDS.map((k) => k.label)

/** Company › Profile: (the calm UI build 2026-10-27 — 5-36) the four tabs — Details · Bank & entities · Registrations · About page — and the open
    one's cards, as `?tab=` says (the page's own read): Details = the Company details card (the two-column fields, the tagline, the social
    links, the review link); Bank & entities = Issuing entities, the studio's own first, with (N-13) its GST switch and GST Reg. No.;
    Registrations = (one-home N-07) the card table, then (S37) Listed on Qanvast; About page = the year, the story, the photos. Discard · Save
    in the header on every tab but Registrations (it saves as it changes). (pending modules S17) Every sentence the page always prints is its
    own (lib/company/copy.ts), so the cards fall where the page's fall at 390 as at 1440. */
export function ProfileGhost() {
  const runs = useViewerShape('role.runs')
  const studio = useSeedStudio()   // (pending modules S31) the social links' example is the studio's own handle
  const tab = profileTabOf(useSearchParams().get('tab'))
  return (
    <CompanyGhostFrame title={60} actions={runs && tab !== 'registrations' ? [92, 72] : []} tabs={PROFILE_TABS.map((t) => t.label)} active={PROFILE_TABS.findIndex((t) => t.key === tab)} label="Loading the company profile">
      {runs ? null : <ReadOnlyGhost />}
      <div className={profile.layout}>
        <div className={profile.form}>
          {tab === 'details' ? (
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Company details</Words><Words as="p" className={profile.cardHelp}>{linkedText(PROFILE_DETAILS_HELP)}</Words></div>
            <div className={profile.details}>
              {[false, false, true, false, false, false, false, false].map((wide, i) => <div key={i} className={wide ? profile.detailWide : undefined}><GhostField /></div>)}
              <div className={profile.detailWide}><GhostField say={PROFILE_TAGLINE_HELPER} /></div>
            </div>
            <div className={profile.cardHead}><Words as="h3" className={profile.subTitle}>Social links</Words><Words as="p" className={profile.cardHelp}>{profileSocialHelp(studio)}</Words></div>
            <div className={profile.details}>{[0, 1, 2, 3, 4].map((i) => <div key={i}><GhostField /></div>)}</div>
            {/* (pending modules S14) Reviews: the review link across */}
            <div className={profile.subGroup}>
              <div className={profile.cardHead}><Words as="h3" className={profile.subTitle}>Reviews</Words><Words as="p" className={profile.cardHelp}>{REVIEW_LINK_HELP}</Words></div>
              <div className={profile.details}><div className={profile.detailWide}><GhostField /></div></div>
              {runs ? <Words as="p" className={profile.cardHelp}>{`${QANVAST_REVIEWS_DOOR.lead}${QANVAST_REVIEWS_DOOR.link}${QANVAST_REVIEWS_DOOR.end}`}</Words> : null}
            </div>
          </section>
          ) : null}
          {tab === 'registrations' ? <>
          {/* (one-home N-07) the studio's registrations: registration · recorded · done, one row each */}
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Registrations &amp; accreditations</Words><Words as="p" className={profile.cardHelp}>{linkedText(PROFILE_REGISTRATIONS_HELP)}</Words></div>
            <div className={profile.regTable}>
              <div className={profile.regHead}><Bone w={84} h={10} /><Bone w={64} h={10} /><span className={profile.regCol}><Bone w={32} h={10} /></span></div>
              {STUDIO_ACTIONS.map((a, i) => (
                <div key={a.id} className={profile.regRow}>
                  <span className={profile.regName}><Words>{a.title}</Words><Words className={profile.regHelp}>{a.id === CASETRUST_ID ? CASETRUST_ROW_HELP : a.subtitle}</Words></span>
                  <span {...labelled(profile.regWho, 'Recorded')}><Line w={cycle([96, 16, 96, 16, 16], i)} lh={16} h={10} style={{ display: 'inline-flex', verticalAlign: 'top' }} /></span>   {/* who and when once recorded, else "—" — (pending modules S37) set on the line's top, as the words are: on a phone, beside the cell's "Recorded · " label, the inline box sat on its baseline and each row drew 1px taller than the page's */}
                  <span {...labelled(profile.regCol, 'Done')}><Slot kind="switch" /></span>
                </div>
              ))}
            </div>
          </section>
          <ListingGhost />   {/* (pending modules S37) Listed on Qanvast, after the registrations */}
          </> : null}
          {tab === 'entities' ? (
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Issuing entities &amp; bank details</Words><Words as="p" className={profile.cardHelp}>{PROFILE_ENTITIES_HELP}</Words></div>
            <div className={profile.entity}>
              <div className={profile.entityHead}><Line w={236} lh={20} h={14} /></div>
              <div className={profile.details}>{[0, 1, 2, 3, 4].map((i) => <div key={i}><GhostField /></div>)}</div>
              {/* (one-home N-13) the studio's GST switch */}
              <span className={profile.switchRow}><Slot kind="switch" /><span><Words>{ENTITY_GST_WORDS.label}</Words>{' '}<Words className={profile.cardHelp}>{ENTITY_GST_WORDS.help}</Words></span></span>
              <div className={profile.details}><div><GhostField /></div></div>   {/* …and its GST Reg. No. */}
              <div className={profile.qrRow}><Bone w={96} h={96} r={4} /><Words className={profile.cardHelp}>{ENTITY_QR_HELP.none}</Words></div>
              <GhostTextButton label="More details" iconEnd />   {/* (parity map, FB-103) the entity's More details press, closed */}
            </div>
          </section>
          ) : null}
          {tab === 'about' ? (
          /* (gaps build H, H-Q21) About the studio, for clients — the year, the story, the awards, the photos */
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>About the studio, for clients</Words><Line w="70%" lh={20} h={12} /></div>
            <div><GhostField w={200} /></div>
            <Bone w="100%" h={240} r={8} />
            <div className={profile.qrRow}>{[0, 1, 2].map((i) => <Bone key={i} w={120} h={90} r={4} />)}</div>
          </section>
          ) : null}
        </div>
      </div>
    </CompanyGhostFrame>
  )
}

/** (the calm UI build 2026-10-27 — a bug fix) The house DemoNote (components/om/demo-note) as its box: a MetaChip with its 12 info glyph before
    "Demo", 58 wide — a plain GhostChip "Demo" was 12 short, so a phone's title row stayed one line in the ghost where the page's wraps
    (Integrations' Website form by email: 32 down from there). */
const GhostDemo = () => <Slot kind="chip" w={58} />

/** (pending modules S37) Company › Profile › Listed on Qanvast, in the state the server says the card lands in (the app shell's seed) — its
    head, the line that says where it stands, What Qanvast has, the presses an Owner or an Admin gets and, while one waits, the demo's plays. */
function ListingGhost() {
  const runs = useViewerShape('role.runs')
  const listed = useSeedFlag('qanvast.listed', true)
  const waiting = useSeedFlag('qanvast.waiting', false)
  const asked = useSeedFlag('qanvast.asked', false)
  const outside = useSeedFlag('qanvast.outside', true)
  const standIn = useSeedFlag('qanvast.standin', true)
  const state = listed ? 'listed' : waiting ? 'waiting' : asked ? 'needs_changes' : 'not_applied'
  return (
    <section className={profile.card}>
      <div className={profile.cardHead}>
        <div className={qv.titleRow}>
          <Words as="h2" className={profile.cardTitle}>{LISTING_WORDS.title}</Words>
          <span className={qv.chips}><GhostChip label={LISTING_WORDS.chip[state]} />{listed && waiting ? <GhostChip label="Changes waiting" /> : null}{listed && asked ? <GhostChip label="Changes asked" /> : null}{standIn ? <GhostDemo /> : null}</span>
        </div>
        <Words as="p" className={profile.cardHelp}>{listed ? LISTING_WORDS.helpListed : LISTING_WORDS.helpNot}</Words>
      </div>
      {listed ? <Words as="p" className={qv.state}>{outside ? LISTING_WORDS.outside : 'Listed since 13 Oct ’26.'}</Words> : null}
      {waiting ? <Words as="p" className={listed ? qv.stateQuiet : qv.state}>{listed ? 'Your changes of 13 Oct ’26 wait for Qanvast’s review — your listing stays as it is meanwhile.' : 'Sent on 13 Oct ’26 by Dane Lim. Qanvast usually answers within 3–5 working days — Owners and Admins hear it in the bell.'}</Words> : null}
      {asked ? (
        <div className={qv.ask}><Bone w={20} h={20} r={4} /><span className={qv.askText}><Line w={240} lh={16} h={10} /><Line w="70%" lh={20} h={12} /></span></div>
      ) : null}
      {listed && !outside ? <span className={qv.morePress}><GhostTextButton label={LISTING_WORDS.what} iconEnd /></span> : null}
      {runs ? (
        <div className={qv.actions}>
          {state === 'not_applied' ? <Slot kind="btn" w={164} /> : null}
          {asked ? <Slot kind="btn" w={164} /> : null}
          {asked ? <GhostTextButton label={listed ? LISTING_WORDS.keepListing : LISTING_WORDS.closeAsk} /> : null}
          {listed && !waiting && !asked ? <Slot kind="btn" w={178} /> : null}
          {waiting ? <span data-text-press=""><GhostTextButton label={listed ? LISTING_WORDS.withdrawChanges : LISTING_WORDS.withdraw} /></span> : null}
        </div>
      ) : null}
      {runs && standIn && waiting ? (
        <div className={qv.demo}>
          <Words className={qv.hint}>{LISTING_WORDS.demoLead}</Words>
          <span className={qv.demoPresses}><GhostTextButton icon label={listed ? LISTING_WORDS.playApproved : LISTING_WORDS.playListed} /><GhostTextButton icon label={LISTING_WORDS.playChanges} /></span>
        </div>
      ) : null}
    </section>
  )
}

/** (pending modules S17) The one read-only line a Company page draws above its cards for whoever may only read it (ReadOnlyNote). */
function ReadOnlyGhost({ text = 'Only Owners and Admins change these.' }: { text?: string }) {
  return <p className={note.note}><Bone w={20} h={20} r={4} /><Words>{text}</Words></p>
}

/* (pending modules S17) Company › Members' rows as the demo studio shows them — the usual page (a ghost can't know the studio's).
   (the calm UI build 2026-10-27 — 5-01) a row is avatar · name and email · Role · leads · ⋮, with a second line only off the usual: not taking new
   leads, your own signature to add. */
type MemberShape = { closed?: boolean; you?: boolean }
const MEMBER_SHAPES: MemberShape[] = [
  { you: true },   // the Owner, you
  { closed: true },   // an Admin, not taking new leads
  {},   // a Manager
  {}, {}, {}, {},   // Designers
  {},   // (parity map, FB-114) Accounting
]

/** Company › Members: Add member; the list — one row per member (avatar · name and email · Role · leads · ⋮), a quiet second line where one
    is off the usual, then the two doors to the rules (What can each role do? · Who sees which leads). */
export function MembersGhost() {
  const runs = useViewerShape('role.runs')
  return (
    <CompanyGhostFrame title={86} actions={runs ? [143] : []} label="Loading members">
      <div className={members.layout}>
        {runs ? null : <ReadOnlyGhost text={MEMBERS_READ_ONLY} />}
        <section className={members.card}>
          <ul className={members.list}>
            {MEMBER_SHAPES.map((m, i) => (
              <li key={i} className={members.row}>
                <Slot kind="avatar40" />
                <span className={members.who}><Line w={cycle([64, 72, 56, 48, 80, 70, 52], i)} lh={20} h={14} /><Line w={cycle([140, 150, 132, 124, 160, 146, 136], i)} lh={16} h={10} /></span>
                <span className={members.field}><GhostField size="s" /></span>
                <span className={members.count}><Line w={48} lh={20} h={12} style={{ justifyContent: 'flex-end' }} /></span>
                <span className={members.more}>{runs || m.you ? <Slot kind="icon" /> : null}</span>
                {m.closed ? <div className={members.metaRow}><Words className={members.metaText}>{MEMBER_DRAWER.closed}</Words></div> : null}
              </li>
            ))}
          </ul>
          <p className={members.listFoot}><Words>{`${MEMBERS_LINKS.roles} · ${MEMBERS_LINKS.visibility}`}</Words></p>
        </section>
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Questionnaire: the Question bank card — title and Add question, the help, then the bank's table (question · Required · Active ·
    the row's tools) — (pending modules S17) the studio's definitions list (components/om/definition-list), its own classes. */
export function QuestionnaireGhost() {
  const runs = useViewerShape('role.runs')
  return (
    /* (the calm UI build 2026-10-27 — 5-29 · W-329) New question in the page header; the card is "Questions", its one line and How this works */
    <CompanyGhostFrame title={134} actions={runs ? [140] : []} label="Loading the questions">
      <div className={bank.layout}>
        {runs ? null : <ReadOnlyGhost text="Only Owners and Admins change the questions." />}
        <section className={bank.card}>
          <div className={bank.cardHead}>
            <div className={bank.titleRow}><Words as="h2" className={bank.cardTitle}>Questions</Words></div>
            <Words as="p" className={bank.cardHelp}>{BANK_HELP}</Words>
            <div className={set.how}><GhostTextButton label="How this works" iconEnd /></div>
          </div>
          <div className={defs.table} data-reorder={runs || undefined}>
            <div className={defs.head}><Bone w={64} h={10} /><span className={defs.col}><Bone w={56} h={10} /></span><span className={defs.col}><Bone w={40} h={10} /></span><span className={defs.actionsHead} /></div>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className={defs.row} data-active="">
                {/* (Dane UAT 3.38) the drag handle first, as the page draws it for Owners and Admins */}
                {/* a question wraps to a second line in a phone's narrow column, as most of the demo's do */}
                {/* (the calm UI build 2026-10-27 — a bug fix: the ghost had kept the house list's old row) the type is a line of body-s words, no
                    longer a chip (16, was 20), and the row's tools are its one 36 ⋮ (was four 24 icons) — the rows stood 4 off a row at a desk, 8 on a phone */}
                <span className={defs.lead}>{runs ? <span className={defs.handle}><Bone w={20} h={20} r={4} /></span> : null}<span className={defs.text}><span style={{ display: 'flex', flexDirection: 'column' }}><Line w={cycle([150, 176, 140, 132, 180, 150, 188, 170], i)} lh={20} h={12} /><Line w={cycle([60, 84, 48, 72], i)} lh={20} h={12} className={phoneOnly} /></span><span className={defs.meta}><Line w={cycle([72, 48, 52, 96, 64], i)} lh={16} h={10} /></span></span></span>
                <span className={defs.col}><Slot kind="switch" /></span>
                <span className={defs.col}><Slot kind="switch" /></span>
                <span className={defs.actions}>{runs ? <Slot kind="icon" /> : null}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Integrations: the cards in the page's order — Qanvast, the website form (its address and Copy), Meta Lead Ads, Webhooks.
    (pending modules S17) Each card's chip, presses and lines as the page draws them for the viewer — the presses only for whoever may change
    them — and the webhook endpoint the demo has (its counters, its four presses), so a phone's lines wrap where the page's do. */
export function IntegrationsGhost() {
  const studioRuns = useViewerShape('role.runs')
  const desk = useViewerShape('role.marketing')   // (S44O — call C6) lead capture is Marketing's to change too
  const runs = studioRuns || desk
  const qanvastListed = useSeedFlag('qanvast.listed', true)   // (pending modules S37)
  /* (the calm UI build 2026-10-27 — 5-14 · 5-16) the title row carries one status word and, for a stand-in, the quiet Demo chip */
  const head = (title: string, chip: string | null, help: string, demo = false, more?: ReactNode) => (
    <div className={integ.cardHead}>
      <div className={integ.titleRow}><Words as="h2" className={integ.cardTitle}>{title}</Words>{chip ? <GhostChip label={chip} /> : null}{demo ? <GhostDemo /> : null}</div>
      <Words as="p" className={integ.cardHelp}>{help}</Words>
      {more}
    </div>
  )
  return (
    <CompanyGhostFrame title={118} label="Loading integrations">
      <div className={integ.layout}>
        {runs ? null : <ReadOnlyGhost text="Only Owners, Admins and Marketing change how leads come in; an Owner or an Admin connects Xero." />}
        {/* (pending modules S37) the Qanvast chip and help follow the studio's listing */}
        <section className={integ.card}>{head('Qanvast', qanvastListed ? 'Connected' : 'Not connected', qanvastConnectionText(qanvastListed), true)}</section>
        <section className={integ.card}>
          {head('Website form by email', 'Connected', 'Set your website form to email this address. Each enquiry becomes a lead with the source Website, unread until someone opens it. A phone number already on a lead goes to Review imported leads instead of a second lead.', true)}
          <div className={integ.row}><Slot kind="btn" w={285} /><Slot kind="btn" w={92} /></div>
          <div className={integ.meta}><Line w={140} lh={16} h={10} />{runs ? <GhostTextButton icon label="Try it" /> : null}</div>
        </section>
        <section className={integ.card}>
          {head('Meta Lead Ads', 'Not connected', 'Connect the Facebook page your ads run on, pick the lead forms, and every submission becomes a lead with the source Meta Ads. The form’s questions land in the lead’s fields as mapped below.', true)}
          <div className={integ.row}><Words className={integ.rowWords}>{runs ? 'Meta’s login opens to pick the page.' : 'An Owner or an Admin connects the studio’s Facebook page.'}</Words>{runs ? <Slot kind="btn" w={232} /> : null}</div>
        </section>
        <section className={integ.card}>
          {head('Other forms (Zapier, Typeform…)', 'Connected · 1', 'Connect any form tool: make a link, paste it into the tool, and each answer arrives as a lead.', false,
                <div className={set.how}><GhostTextButton label="For your developer" iconEnd /></div>)}   {/* the page's fold sits in the card's head (HowItWorks) */}
          {runs ? (
            <div className={integ.newHook}>
              <Words className={integ.eyebrow}>New link</Words>
              <div className={integ.hookForm}>{[WEBHOOK_PLATFORMS.find((p) => p.key === 'generic')?.help ?? '', 'Incoming leads are tagged with this source name.', 'Internal — not shown to clients.'].map((h) => <GhostField key={h} say={h} />)}</div>
              <div style={{ display: 'flex' }}><Slot kind="btn" w={140} /></div>   {/* a block row: an empty inline slot sat on the text's baseline 5px high */}
            </div>
          ) : null}
          <ul className={integ.hooks}>
            <li className={integ.hook}>
              <div className={integ.hookHead}><Line w={84} lh={20} h={12} /><Line w={150} lh={16} h={10} /><Line w={176} lh={16} h={10} /></div>
              <div className={integ.meta}><Line w={56} lh={16} h={10} /><Line w={52} lh={16} h={10} /><Line w={72} lh={16} h={10} /><Line w={128} lh={16} h={10} /></div>
              {runs ? <div className={integ.row}><GhostTextButton icon label="Copy link" /><Slot kind="icon" /></div> : null}
            </li>
          </ul>
          <div className={integ.log}><Words className={integ.eyebrow}>Recent activity</Words><ul className={integ.logList}><li className={integ.logRow}><GhostChip label="Created" /><Line w={88} lh={20} h={12} /><Line w={150} lh={16} h={10} /></li></ul></div>
        </section>
      </div>
    </CompanyGhostFrame>
  )
}

/** A section of Plan & AI credits: the title and its help, the tools at the right, the table on the listing's model. */
function PlanSection({ title, help, tools = [], cols, rows, phone }: { title: string; help: string; tools?: number[]; cols: Col[]; rows: number; phone?: PhoneRows }) {
  return (
    <section className={plan.section}>
      <div className={plan.sectionHead}>
        <div className={plan.sectionTitles}><Words as="h2" className={plan.sectionTitle}>{title}</Words><Words className={plan.sectionHelp}>{help}</Words></div>
        {/* (pending modules S17) Column settings (the 36 glyph) is a desk's tool — a phone's cards have no columns to set */}
        <div className={plan.sectionTools}>{tools.map((w, i) => <Slot key={i} kind={w === 36 ? 'icon' : 'btn'} w={w === 36 ? undefined : w} desk={w === 36} />)}</div>
      </div>
      <GhostTable cols={cols} rows={rows} head={56} row={64} phone={phone} />   {/* (REG-727) the page's tables are cards on a phone, and so are these */}
    </section>
  )
}

/** Company › Plan & AI credits › Usage: the period pill and its dates · Export; the three tiles; By member; By tool. */
export function UsageGhost() {
  const usage = useUsageShape()   // (the calm UI build 2026-10-27 — 5-38) what By member drew last on this month
  return (
    <CompanyGhostFrame title={158} tabs={PLAN_TABS.map((t) => t.label)} label="Loading AI credits">
      <div className={plan.page}>
        {/* (pending modules S17) the Period pill — "Period: This month" at a desk, "This month" on a phone — its dates, Export */}
        <div className={plan.bar}>
          <div className={plan.barStart}><Slot kind="btn" w={186} className={deskOnly} /><Slot kind="btn" w={130} className={phoneOnly} /><Line w={91} lh={16} h={10} /></div>
          <Slot kind="btn" w={100} />
        </div>
        <div className={plan.tiles}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={tile.tile}>
              <Line w={cycle([110, 120, 90], i)} lh={16} h={10} />
              <Line w={cycle([80, 24, 150], i)} lh={24} h={20} />
              <Line w={cycle(['62%', '30%', '54%'], i)} lh={16} h={10} />
              {i === 0 ? <span className={plan.tileBar} /> : i === 1 ? <span className={plan.tileNote} style={{ display: 'block', height: 21 }}><Slot kind="chip" w={150} /></span> : null}
            </div>
          ))}
        </div>
        {/* (the calm UI build 2026-10-27 — 5-38) By member as the page draws it on this month: the members who used AI or have a limit (each
            limit a line of words and its ⋮), the Status column only when someone had one, the fold's text button under it */}
        <PlanSection title="By member" help="Set a monthly limit so one person can’t use up the studio’s credits." tools={[219, 36]} rows={Math.max(1, usage.members)} phone={{ card: usage.status ? 191 : 175, lines: usage.status ? 4 : 3 }} cols={[
          { basis: 220, grow: 220, head: 52, cell: (r) => ({ node: <span className={plan.who}><Bone w={36} h={36} r="50%" /><span className={plan.whoText}><Line w={cycle([44, 56, 48, 36, 64, 58, 44], r)} lh={20} h={12} /><Line w={cycle([40, 40, 52, 56, 56, 56, 56], r)} lh={16} h={10} /></span></span> }) },
          { basis: 240, grow: 240, head: 36, cell: { node: <span className={plan.used}><Bone w="100%" h={6} r={3} style={{ maxWidth: 200 }} /><Line w={64} lh={16} h={10} /></span> } },
          { basis: 120, grow: 120, head: 64, cell: 12 },
          { basis: 170, grow: 170, head: 100, cell: (r) => ({ node: <span className={plan.limitCell}><Line w={cycle([56, 76], r)} lh={20} h={12} /><Slot kind="icon" /></span> }) },
          ...(usage.status ? [{ basis: 170, grow: 170, head: 44, cell: 14 }] : []),
        ]} />
        {usage.quiet ? <span className={plan.more}><GhostTextButton label={`${usage.quiet} ${usage.quiet === 1 ? 'member hasn’t' : 'members haven’t'} used AI this month`} iconEnd /></span> : null}
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Plan & AI credits › Plan & billing: the four boxes in the page's two stacks (REG-722: the plan and the card · top-ups and the billing details), then Invoices.
    (pending modules S17) A box's sentence that is the page's own is its words (so it wraps where the page's wraps); a figure is a line. */
type BoxRow = number | string | { say: string }
export function BillingGhost() {
  /* (pending modules S19) auto top-up as the studio has it: the live credits in the reveal, the layout's seed in a cold loader */
  const live = useCredits(null)
  const seededAuto = useSeedFlag('credits.autoTopUp', false)
  const auto = live ? live.autoTopUp : seededAuto ? { below: 500, credits: 1000 } : null
  const box = (title: number | string, rows: BoxRow[], actions: number[], facts: number, card: string, after: BoxRow[] = [], tail: ReactNode = null) => (
    <section className={plan.box} data-card={card}>
      <div className={plan.boxHead}>{typeof title === 'string' ? <Words as="h2" className={plan.boxTitle}>{title}</Words> : <Line w={title} lh={24} h={16} />}</div>
      {rows.map((r, i) => (typeof r === 'object' ? <Words key={i} as="p" className={i === 0 ? plan.boxLine : plan.boxMeta}>{r.say}</Words> : <Line key={i} w={r} lh={i === 0 ? 20 : 16} h={i === 0 ? 12 : 10} />))}
      {facts ? (
        /* (pending modules S19) the facts as the page's own dt / dd — a phone's 8 under each value is the list's rule on its dd, so bare lines
           drew the box 40px short at 390 */
        <dl className={plan.facts}>{Array.from({ length: facts }, (_, i) => [<dt key={`t${i}`}><Line w={cycle([56, 32, 28, 56, 76], i)} lh={20} h={12} /></dt>, <dd key={`d${i}`}><Line w={cycle([140, 90, 160, 250, 140], i)} lh={20} h={12} /></dd>])}</dl>
      ) : null}
      {after.map((r, i) => (typeof r === 'object' ? <Words key={i} as="p" className={plan.boxMeta}>{r.say}</Words> : <Line key={i} w={r} lh={16} h={10} />))}   {/* (pending modules S17) the line under the facts — the GST the invoice carries */}
      {actions.length ? <div className={plan.boxActions}>{actions.map((w, i) => <Slot key={i} kind="btn" w={w} />)}</div> : null}
      {tail}
    </section>
  )
  return (
    <CompanyGhostFrame title={158} tabs={PLAN_TABS.map((t) => t.label)} label="Loading the plan">
      <div className={plan.page}>
        <div className={plan.cards}>
          <div className={plan.cardCol}>
            {/* (pending modules S19) the seats line in its own words (it wraps on a phone) and Change seats between Change plan and Manage billing */}
            {box(150, [230, '46%', { say: '7 of 7 seats in use — one for each member who uses the AI tools · more seats are S$35 a month each' }], [117, 123, 131], 0, 'plan')}
            {/* (the calm UI build 2026-10-27 — 5-16) the card's line alone; the Dodo sentence is Update card's tooltip */}
            {box('Payment method', [196], [115], 0, 'card')}
          </div>
          <div className={plan.cardCol}>
            {box('Top-ups', [210, { say: 'This month’s credits are used first; top-ups carry over on any plan, after a downgrade or after cancelling.' }], [215], 0, 'topups', [],
              /* (pending modules S19) the Auto top-up row under its rule: the title, the sm switch and its word, the line — off or on */
              <div className={plan.autoRow} aria-hidden>
                <div className={plan.autoHead}><Words className={plan.autoTitle}>Auto top-up</Words><span className={plan.switchLabel}><Slot kind="switch" /><Words>{auto ? 'On' : 'Off'}</Words></span></div>
                {auto
                  ? <p className={plan.boxMeta}><Words>{`When AI credits fall under ${fmtCredits(auto.below)}, add ${fmtCredits(auto.credits)} (${sgd(topupPrice(auto.credits))}) · at most once a month.`}</Words> <GhostTextButton label="Change" /></p>
                  : <Words as="p" className={plan.boxMeta}>Off — when the studio runs low, nothing is bought until you buy it.</Words>}
              </div>)}
            {box('Billing details', [], [], 5, 'billing', ['52%'])}
          </div>
        </div>
        <PlanSection title="Invoices" help="Every payment — the plan and each top-up" tools={[36]} rows={2} phone={{ card: 214, lines: 6 }} cols={[
          { basis: 140, grow: 140, head: 32, cell: 64 },
          { basis: 180, grow: 180, head: 48, cell: 110 },
          { basis: 240, grow: 240, head: 24, cell: 130 },
          { basis: 200, grow: 200, head: 44, cell: 80 },
          { basis: 120, grow: 120, head: 52, cell: 64 },
          { basis: 110, grow: 110, head: 44, cell: { slot: 'chip', w: 36 } },
          { basis: 80, grow: 80, head: 24, cell: 16 },
        ]} />
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Templates › Brand kit: Discard · Save changes; the lead line, Logo and marks, Colours, Fonts; the default template's preview at the right (≥1025). */
export function BrandKitGhost() {
  const runs = useViewerShape('role.runs')   // (pending modules S17) Discard · Save changes are an Owner's or an Admin's
  return (
    <CompanyGhostFrame title={100} actions={runs ? [92, 126] : []} tabs={TEMPLATE_TABS} label="Loading the brand kit">
      {runs ? null : <ReadOnlyGhost />}
      <div className={profile.layout}>
        <div className={profile.form}>
          {/* (the calm UI build 2026-10-27 — B4's request, 4-35 · W-184) the page's words: one line, the cards' helpers trimmed, the note on what prints */}
          <Words as="p" className={profile.lead}>Your logo, colours and fonts — every template uses them.</Words>
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Logo and marks</Words><Words as="p" className={profile.cardHelp}>PNG, JPG or SVG.</Words></div>
            <div className={profile.marks}>
              {['Logo', 'Stamp'].map((label) => <div key={label} className={profile.mark}><Words className={profile.markLabel}>{label}</Words><Bone w="100%" h={112} r={4} /><Line w={52} lh={36} h={12} /></div>)}
              <div className={`${profile.mark} ${profile.markWide}`}>
                <Words className={profile.markLabel}>Badges</Words>
                <div className={profile.badges}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <Bone key={i} w={120} h={56} r={4} />)}<Bone w={56} h={56} r={4} /></div>
                <Line w={100} lh={36} h={12} />
              </div>
            </div>
          </section>
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Colours</Words></div>
            <div className={profile.colours}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={profile.colour}><Bone w={48} h={48} r={4} /><span className={profile.colourField}><GhostField /></span></div>)}</div>
          </section>
        </div>
        <aside className={profile.preview}>
          {/* (pending modules S17) the default template's name, the hint and the note in their own words (the demo's default) — on a phone
              they stand above the cards and wrap there */}
          <Words className={profile.previewLabel}>Default template · Default Quote PDF</Words>
          <div className={profile.previewPage}><Bone w={276} h={390} r={2} /></div>
          {/* (Dane UAT 2.01 · 3.34) Preview, the hint, and the note on what the default template sets itself */}
          <span className={profile.previewOpen}><GhostTextButton icon label="Preview" /></span>
          <span className={profile.previewHint}><Bone w={16} h={16} r={4} /><Words>Redraws as you edit. The stamp prints only where a template places it.</Words></span>
          <Words as="p" className={profile.previewNote}>When it prints, Default Quote PDF keeps its own Brand ink, Brand grey and Table band colours, and its own fonts.</Words>
        </aside>
      </div>
    </CompanyGhostFrame>
  )
}

/** A gallery page of Templates (Quotes · Contracts · Tasks · T&Cs & Notes · Payments share one loading.tsx): the tab strip, the scope pill, New Folder, New ▾, the search, the view and ⋮; the Folders row; a row of cards. */
export function TemplateLibraryGhost() {
  const path = usePathname() ?? ''
  const at = TEMPLATE_KINDS.findIndex((k) => path.startsWith(k.href))   // (S42 audit A-10) the strip starts where the page's does
  return (
    <CompanyGhostFrame title={100} tabs={TEMPLATE_TABS} active={at} label="Loading templates">
      {/* (Contracts on the move, P-10) Templates › Contracts lands on rows on a phone and a tablet held upright — its ghost draws them there */}
      <LibraryGhostFor page="templates" pill folders={2} cards={4} rows={path.startsWith('/company/templates/contracts') ? 5 : 0} />
    </CompanyGhostFrame>
  )
}

/** Company › Price book: My Items (the Kind pill and Filters) or My Sections (neither). */
export function PriceBookGhost({ sections = false }: { sections?: boolean }) {
  return (
    <CompanyGhostFrame title={100} tabs={PRICE_BOOK_TABS.map((t) => t.label)} label={sections ? 'Loading the Price book’s sections' : 'Loading the Price book’s items'}>
      <LibraryGhostFor page={sections ? 'price-book-sections' : 'price-book-items'} pill={!sections} filters={!sections} folders={sections ? 1 : 2} cards={sections ? 4 : 5} />
    </CompanyGhostFrame>
  )
}
