import { Bone } from '@/components/shell/skeleton'
import { GhostField, GhostTable, Line, Slot, Words, cycle, type Col, type PhoneRows } from '@/components/shell/ghost-kit'
import { LibraryGhostFor } from '@/components/company/templates/library-ghost-for'
import { PLAN_TABS, PRICE_BOOK_TABS, TEMPLATE_KINDS } from '@/lib/company/sections'
import { CompanyGhostFrame } from './company-ghost-frame'
import profile from './profile-view.module.css'
import members from './members-view.module.css'
import bank from './questionnaire-view.module.css'
import integ from './integrations-view.module.css'
import plan from './plan/plan.module.css'
import tile from '@/components/om/stat-tile.module.css'

/**
 * (REG-708) Company's page ghosts — one per page, each the page's own layout: its cards, grids and rows keep the page's own classes and
 * bones stand where the words and controls land, at every width (the page's stylesheet moves them). The route's `loading.tsx` draws it
 * and the page hands the same one to its PageReveal, so nothing changes between the two and the reveal lands in place. Counts are the
 * usual page's — a ghost can't know the studio's — and the crossfade takes care of the rest. A card's title and help are the page's own words
 * (`Words`: the letters hidden, the lines drawn), so they wrap as the page wraps them at every width; keep them in step with the page.
 */

const TEMPLATE_TABS = TEMPLATE_KINDS.map((k) => k.label)

/** Company › Profile: Discard · Save changes; the Company details card (the two-column fields, the tagline, the social links), then Issuing entities. */
export function ProfileGhost() {
  return (
    <CompanyGhostFrame title={60} actions={[92, 126]} label="Loading the company profile">
      <div className={profile.layout}>
        <div className={profile.form}>
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Company details</Words><Words as="p" className={profile.cardHelp}>{'What the templates print through their fields — {studio_name}, {studio_uen}, {studio_address} and the rest.'}</Words></div>
            <div className={profile.details}>
              {[false, false, true, false, false, false, false, false, false].map((wide, i) => <div key={i} className={wide ? profile.detailWide : undefined}><GhostField /></div>)}
              <div className={profile.detailWide}><GhostField helper="38%" /></div>
            </div>
            <div className={profile.cardHead}><Words as="h3" className={profile.subTitle}>Social links</Words><Words as="p" className={profile.cardHelp}>{'Handles or links, as you want them printed. {studio_social} prints the filled ones in a line; the Social links element on a template prints each with its mark.'}</Words></div>
            <div className={profile.details}>{[0, 1, 2, 3, 4].map((i) => <div key={i}><GhostField /></div>)}</div>
          </section>
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Issuing entities &amp; bank details</Words><Words as="p" className={profile.cardHelp}>The companies you quote under. A quote’s Issuing Entity picks one; a template’s Bank details block prints its bank, account and PayNow QR.</Words></div>
            <div className={profile.entity}>
              <div className={profile.entityHead}><Line w={236} lh={20} h={14} /></div>
              <div className={profile.details}>{[0, 1, 2, 3, 4].map((i) => <div key={i}><GhostField /></div>)}</div>
              <div className={profile.qrRow}><Bone w={96} h={96} r={4} /><Line w={420} lh={16} h={10} /></div>
            </div>
          </section>
        </div>
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Members: Add member; People and roles — one row per member (avatar · name and email · Role · Reports to · leads), its preferences line under it. */
export function MembersGhost() {
  return (
    <CompanyGhostFrame title={86} actions={[132]} label="Loading members">
      <div className={members.layout}>
        <section className={members.card}>
          <div className={members.cardHead}>
            <Words as="h2" className={members.cardTitle}>People and roles</Words>
            <Words as="p" className={members.cardHelp}>Owners and Admins run the studio and assign any lead; only an Owner makes another Owner, and nobody changes their own role. A Manager assigns within their team — the Designers who report to them. A Designer keeps the leads assigned to them. Who sees which leads is set under Settings › Lead management.</Words>
          </div>
          <ul className={members.list}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i} className={members.row}>
                <Slot kind="avatar40" />
                <span className={members.who}><Line w={cycle([64, 72, 56, 48, 80, 70, 52], i)} lh={20} h={14} /><Line w={cycle([140, 150, 132, 124, 160, 146, 136], i)} lh={16} h={10} /></span>
                <span className={members.field}><GhostField size="s" /></span>
                <span className={members.field}>{i > 2 ? <GhostField size="s" /> : <Line w={cycle([96, 88, 130], i)} lh={20} h={10} />}</span>
                <span className={members.count}><Line w={48} lh={20} h={12} style={{ justifyContent: 'flex-end' }} /></span>
                <div className={members.prefRow}>
                  <span className={members.switchLabel}><Slot kind="switch" /><Line w={100} lh={16} h={10} /></span>
                  <span className={members.prefSummary}><Line w={cycle(['40%', '28%', '52%', '36%'], i)} lh={16} h={10} /></span>
                  <Line w={76} lh={36} h={12} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Questionnaire: the Question bank card — title and Add question, the help, then the bank's table (question · Required · Active · the row's tools). */
export function QuestionnaireGhost() {
  return (
    <CompanyGhostFrame title={134} label="Loading the question bank">
      <div className={bank.layout}>
        <section className={bank.card}>
          <div className={bank.cardHead}>
            <div className={bank.titleRow}><Words as="h2" className={bank.cardTitle}>Question bank</Words><Slot kind="btn" w={136} /></div>
            <Words as="p" className={bank.cardHelp}>Customise the questions homeowners answer about their project. New leads start with the active questions; an older lead adds them from its Questionnaire tab. Ask the client sends the lead’s questionnaire to the portal.</Words>
          </div>
          <div className={bank.table}>
            <div className={bank.thead}><Bone w={64} h={10} /><span className={bank.col}><Bone w={56} h={10} /></span><span className={bank.col}><Bone w={40} h={10} /></span><span className={bank.actionsHead} /></div>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className={bank.trow}>
                {/* (Dane UAT 3.38) the drag handle first, as the page draws it for Owners and Admins */}
                <span className={bank.lead}><Bone w={20} h={20} r={4} /><span className={bank.text}><Line w={cycle([150, 176, 140, 132, 180, 150, 188, 170], i)} lh={20} h={12} /><Slot kind="chip" w={cycle([34, 52, 34, 48, 70], i)} /></span></span>
                <span className={bank.col}><Slot kind="switch" /></span>
                <span className={bank.col}><Slot kind="switch" /></span>
                <span className={bank.actions}>{[0, 1, 2, 3].map((j) => <Bone key={j} w={16} h={16} />)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Integrations: the cards in the page's order — Qanvast, the website form (its address and Copy), Meta Lead Ads, Webhooks. */
export function IntegrationsGhost() {
  const head = (title: string, chip: number, help: string) => (
    <div className={integ.cardHead}>
      <div className={integ.titleRow}><Words as="h2" className={integ.cardTitle}>{title}</Words><Slot kind="chip" w={chip} /></div>
      <Words as="p" className={integ.cardHelp}>{help}</Words>
    </div>
  )
  return (
    <CompanyGhostFrame title={118} label="Loading integrations">
      <div className={integ.layout}>
        <section className={integ.card}>{head('Qanvast', 72, 'Leads from your Qanvast profile arrive as New with the source Qanvast. Return Lead sends one back with a reason; Qanvast Ops › Leads shows every return.')}</section>
        <section className={integ.card}>
          {head('Website form by email', 44, 'Set your website form to email this address. Each enquiry becomes a lead with the source Website, unread until someone opens it. A phone number already on a lead goes to Review imported leads instead of a second lead.')}
          <div className={integ.row}><Slot kind="btn" w={236} /><Slot kind="btn" w={78} /></div>
          <div className={integ.meta}><Line w={110} lh={16} h={10} /><Line w={236} lh={36} h={12} /></div>
        </section>
        <section className={integ.card}>
          {head('Meta Lead Ads', 84, 'Connect the Facebook page your ads run on, pick the lead forms, and every submission becomes a lead with the source Meta Ads. The form’s questions land in the lead’s fields as mapped below.')}
          <div className={integ.row}><Slot kind="btn" w={184} /><Line w={300} lh={16} h={10} /></div>
        </section>
        <section className={integ.card}>
          {head('Webhooks', 58, 'Generate webhook URLs for external systems to push leads directly into your studio. Supports any platform that can POST JSON (Zapier, Make, Typeform, Facebook Lead Ads, etc.).')}
          <ol className={integ.steps}>
            <li><Words>Generate a URL below and paste it into your form / integration tool.</Words></li>
            <li><Words>When someone submits the form, a POST request is sent to the URL.</Words></li>
            <li><Words>The lead appears in your Leads page — unread, or in Review imported leads when the phone is already known.</Words></li>
          </ol>
          <Words className={integ.hint}>Accepted JSON fields: name, phone, email, budget, property_type, notes, source. Also accepts common aliases like full_name, mobile, message.</Words>
          <div className={integ.newHook}>
            <Words className={integ.eyebrow}>New webhook endpoint</Words>
            <div className={integ.hookForm}>{['52%', '60%', '46%'].map((h, i) => <GhostField key={i} helper={h} />)}</div>
            <div><Slot kind="btn" w={215} /></div>
          </div>
          <ul className={integ.hooks}>
            <li className={integ.hook}>
              <div className={integ.hookHead}><Line w={96} lh={20} h={12} /><Slot kind="chip" w={60} /></div>
              <div className={integ.meta}><Line w={380} lh={16} h={10} /></div>
              <div className={integ.row}><Bone w={420} h={36} r={4} /><Line w={260} lh={36} h={12} /></div>
            </li>
          </ul>
          <div className={integ.log}><Words className={integ.eyebrow}>Recent activity</Words><ul className={integ.logList}><li className={integ.logRow}><Slot kind="chip" w={60} /><Line w={260} lh={28} h={12} /></li></ul></div>
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
        <div className={plan.sectionTools}>{tools.map((w, i) => <Slot key={i} kind={w === 36 ? 'icon' : 'btn'} w={w === 36 ? undefined : w} />)}</div>
      </div>
      <GhostTable cols={cols} rows={rows} head={56} row={64} phone={phone} />   {/* (REG-727) the page's tables are cards on a phone, and so are these */}
    </section>
  )
}

/** Company › Plan & AI credits › Usage: the period pill and its dates · Export; the three tiles; By member; By tool. */
export function UsageGhost() {
  return (
    <CompanyGhostFrame title={158} tabs={PLAN_TABS.map((t) => t.label)} label="Loading AI credits">
      <div className={plan.page}>
        <div className={plan.bar}>
          <div className={plan.barStart}><Slot kind="btn" w={150} /><Line w={96} lh={16} h={10} /></div>
          <Slot kind="btn" w={96} />
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
        <PlanSection title="By member" help="A monthly amount keeps one person from using the studio’s month. Every active member is listed." tools={[156, 36]} rows={7} phone={{ card: 195, lines: 4 }} cols={[
          { basis: 220, grow: 220, head: 52, cell: (r) => ({ node: <span className={plan.who}><Slot kind="avatar" /><span className={plan.whoText}><Line w={cycle([44, 56, 48, 36, 64, 58, 44], r)} lh={20} h={12} /><Line w={cycle([40, 40, 52, 56, 56, 56, 56], r)} lh={16} h={10} /></span></span> }) },
          { basis: 240, grow: 240, head: 36, cell: { node: <span className={plan.used}><Bone w="100%" h={6} r={3} style={{ maxWidth: 200 }} /><Line w={64} lh={16} h={10} /></span> } },
          { basis: 120, grow: 120, head: 64, cell: 12 },
          { basis: 170, grow: 170, head: 100, cell: { slot: 'btn', w: 76 } },
          { basis: 170, grow: 170, head: 44, cell: 14 },
        ]} />
      </div>
    </CompanyGhostFrame>
  )
}

/** Company › Plan & AI credits › Plan & billing: the four boxes in the page's two stacks (REG-722: the plan and the card · top-ups and the billing details), then Invoices. */
export function BillingGhost() {
  const box = (title: number | string, lines: (number | string)[], actions: number[], facts: number, card: string) => (
    <section className={plan.box} data-card={card}>
      <div className={plan.boxHead}>{typeof title === 'string' ? <Words as="h2" className={plan.boxTitle}>{title}</Words> : <Line w={title} lh={24} h={16} />}</div>
      {lines.map((w, i) => <Line key={i} w={w} lh={i === 0 ? 20 : 16} h={i === 0 ? 12 : 10} />)}
      {facts ? (
        <dl className={plan.facts}>{Array.from({ length: facts }, (_, i) => [<Line key={`t${i}`} w={cycle([56, 32, 28, 56, 76], i)} lh={20} h={12} />, <Line key={`d${i}`} w={cycle([140, 90, 160, 250, 140], i)} lh={20} h={12} />])}</dl>
      ) : null}
      {actions.length ? <div className={plan.boxActions}>{actions.map((w, i) => <Slot key={i} kind="btn" w={w} />)}</div> : null}
    </section>
  )
  return (
    <CompanyGhostFrame title={158} tabs={PLAN_TABS.map((t) => t.label)} label="Loading the plan">
      <div className={plan.page}>
        <div className={plan.cards}>
          <div className={plan.cardCol}>
            {box(150, [230, '46%', '40%'], [118, 130], 0, 'plan')}
            {box('Payment method', [250, '76%'], [114], 0, 'card')}
          </div>
          <div className={plan.cardCol}>
            {box('Top-ups', [210, '84%'], [214], 0, 'topups')}
            {box('Billing details', ['48%'], [], 5, 'billing')}
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
  return (
    <CompanyGhostFrame title={100} actions={[92, 126]} tabs={TEMPLATE_TABS} label="Loading the brand kit">
      <div className={profile.layout}>
        <div className={profile.form}>
          <Words as="p" className={profile.lead}>Every template starts from this kit — its logo, stamp, badges, colours and type. Change one thing here and every template that uses it follows. A template can still differ on its own Brand tab.</Words>
          <section className={profile.card}>
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Logo and marks</Words><Words as="p" className={profile.cardHelp}>The logo, the company stamp and the accreditation badges a template can place. PNG, JPG or SVG.</Words></div>
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
            <div className={profile.cardHead}><Words as="h2" className={profile.cardTitle}>Colours</Words><Words as="p" className={profile.cardHelp}>Six named colours every template refers to by name — change one here and every template that uses it follows.</Words></div>
            <div className={profile.colours}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={profile.colour}><Bone w={48} h={48} r={4} /><span className={profile.colourField}><GhostField /></span></div>)}</div>
          </section>
        </div>
        <aside className={profile.preview}>
          <Line w={220} lh={16} h={10} />
          <div className={profile.previewPage}><Bone w={276} h={390} r={2} /></div>
          {/* (Dane UAT 2.01 · 3.34) Preview, the hint, and the note on what the default template sets itself */}
          <span className={profile.previewOpen}><Line w={84} lh={36} h={12} /></span>
          <span className={profile.previewHint}><Line w={300} lh={20} h={12} /></span>
          <span className={profile.previewNote}><Line w={300} lh={20} h={12} /><Line w={180} lh={20} h={12} /></span>
        </aside>
      </div>
    </CompanyGhostFrame>
  )
}

/** A gallery page of Templates (Quotes · Contracts · Tasks · T&Cs & Notes · Payments share one loading.tsx): the tab strip, the scope pill, New Folder, New ▾, the search, the view and ⋮; the Folders row; a row of cards. */
export function TemplateLibraryGhost() {
  return (
    <CompanyGhostFrame title={100} tabs={TEMPLATE_TABS} label="Loading templates">
      <LibraryGhostFor page="templates" pill folders={2} cards={4} />
    </CompanyGhostFrame>
  )
}

/** Company › Price book: My Items (the Kind pill and Filters) or My Sections (neither). */
export function PriceBookGhost({ sections = false }: { sections?: boolean }) {
  return (
    <CompanyGhostFrame title={100} tabs={PRICE_BOOK_TABS.map((t) => t.label)} label={sections ? 'Loading My Sections' : 'Loading My Items'}>
      <LibraryGhostFor page={sections ? 'price-book-sections' : 'price-book-items'} pill={!sections} filters={!sections} folders={sections ? 1 : 2} cards={sections ? 4 : 5} />
    </CompanyGhostFrame>
  )
}
