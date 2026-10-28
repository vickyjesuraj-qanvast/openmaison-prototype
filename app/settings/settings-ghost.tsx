'use client'

import { Fragment, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostField, GhostTextButton, Line, Slot, Words, cycle, labelled } from '@/components/shell/ghost-kit'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { SETTINGS_MODULES, parseSettingsModule, type SettingsModule } from '@/lib/settings/modules'
import { LEAD_VISIBILITY_OPTIONS, QUOTE_APPROVAL_OPTIONS, STAGE_MOVEMENT_OPTIONS, TEMPLATE_APPROVAL_OPTIONS, VISIBILITY_HELP } from '@/lib/settings/types'
import {
  APPROVAL_RULES, COST_APPROVALS_WORDS, DOCUMENT_NUMBERS_HELP, DOCUMENT_NUMBERS_HOW, EVENTS_CARD, EVENTS_PERSONAL, FEE_FIRST_WORDS, FINANCE_GROUP_LABELS, VO_BILLING_WORDS, HOW_LEADS_MOVE_NOTE, INVOICES_HELP,
  INVOICE_APPROVAL_POINTER, LEAD_SOURCES_HELP, LEAD_STAGES_HELP, NOTIFICATIONS_HELP, OWNER_APPROVALS_HELP, OWNER_APPROVALS_TITLE, ROLES_ROW, WORDING_WORDS,
  PAYMENT_TERMS_HELPER, PROJECT_NUMBERS_HELP, PROJECT_NUMBER_HELPERS, STAGE_ASK_WORDS, STAGE_RECORDS, UNTOUCHED_HELP, UPDATE_REVIEW_WORDS, WHO_SEES_LEADS_MORE,
  financeModuleHelp, leadsModuleHelp, linkedText, projectsModuleHelp, quotesModuleHelp, studioHelp,
  MEETINGS_WORDS, MEETING_CARDS, checklistWordsLine, meetingsModuleHelp, weightsTotalLine,
} from '@/lib/settings/copy'
import { AIMS, DIMENSIONS, FEATURES } from '@/lib/meetings/model'   // (pending modules S23) the Meetings module's rows and fields
import { categoryLabel, checklistFor } from '@/lib/meetings/checklists'
import meetingsCard from './meetings-settings.module.css'
import { ROLE_COLUMNS } from '@/lib/settings/permissions'
import { ALL_STAGES } from '@/lib/leads/enums'
import { CHANNELS, EVENTS, IN_APP_ONLY } from '@/lib/notifications/model'
import { DOCS, TICKET_DOC } from '@/lib/settings/document-numbers'
import styles from './settings.module.css'
import choice from '@/components/om/choice-card.module.css'
import updateReview from '@/components/projects/updates/update-review-setting.module.css'
import docs from './document-numbers.module.css'   // (simplify S-15) Finance's Document numbers rows
import stagesCard from './lead-stages-card.module.css'   // (pending modules S05) Lead stages
import { useSeedFlag, useSeedStudio, useViewerShape } from '@/lib/ghost-shape'   // (parity map, FB-114) · (pending modules S31) the studio's name, a studio of one
import { SETUP_GROUPS, SETUP_ITEMS } from '@/lib/studio-setup/model'   // (pending modules S08)
import ov from '@/components/projects/project-overview.module.css'
import setupCard from './studio-setup-card.module.css'
import note from '@/components/company/read-only-note.module.css'   // (pending modules S14) the read-only line
import costCard from './cost-visibility-card.module.css'   // (pending modules S41b-1)
import { COST_ROLES, COST_ROLE_HELP, MARKETING_COST_HELP, COST_VISIBILITY_HELP, COST_VISIBILITY_RULE } from '@/lib/settings/cost-visibility'

/**
 * (REG-708) Settings' ghost, per module: the frame (Settings and its modules' strip, as CompanyShell draws it), then the open module
 * (`?section=`, read here as the page reads it) — its head in its own words with the Company pages it keeps its records in, and its first
 * cards: Roles & access's Who sees leads and Who may do what (one-home N-06: its Team and entities cards went to Company), Lead management's
 * Lead stages (pending modules S05), Untouched leads and Lead sources, Quotes & pricing's two approvals, Notifications' event table.
 * (simplify S-15 · S-20) Projects opens on What waits for an Owner or an Admin, then Project numbers; Finance on Document numbers, then Money
 * in's Invoices. The route's `loading.tsx` and the page's PageReveal draw the same one. The studio's name in a help line is the demo's.
 * (pending modules S17 — consistency leftovers) Every sentence the page always prints is the page's own, read from lib/settings/copy.ts (and the
 * rows' own lists — the roles' rules, the stages, the documents, the events), so it wraps in the ghost where it wraps on the page at every
 * width; a phone's labelled cells take their names' room (`labelled`), the head's links are the buttons they stand for (`GhostTextButton`).
 */
/* (the calm UI build 2026-10-27, 5-17) a module's head is its one help line now — its title is for screen readers (the tab names it) and its
   doors are the module's last line, *Related:*, below the ghost's first cards; Notifications' head keeps one door, Sent messages */
type Head = { help: string; door?: string }
/* (pending modules S31) the open studio's name, as the help lines print it (the app shell's seed — the demo's "Demo Studio" in its base) */
const headsFor = (STUDIO: string): Record<SettingsModule, Head> => ({
  studio: { help: studioHelp(STUDIO) },   /* (one-home N-06) · (pending modules S14) the module's name and help */
  leads: { help: leadsModuleHelp(STUDIO) },
  meetings: { help: meetingsModuleHelp(STUDIO) },   /* (pending modules S23) */
  projects: { help: projectsModuleHelp(STUDIO) },
  quotes: { help: quotesModuleHelp(STUDIO) },
  finance: { help: financeModuleHelp(STUDIO) },
  notifications: { help: NOTIFICATIONS_HELP, door: WORDING_WORDS.sent },
})

function Setting({ title, help, children, action }: { title: string; help: string; children: ReactNode; action?: number }) {
  const head = <div className={styles.settingHead}><Words className={styles.settingTitle}>{title}</Words><Words className={styles.settingHelp}>{help}</Words></div>
  return (
    <div className={styles.setting}>
      {action ? <div className={styles.settingHeadRow}>{head}<Slot kind="btn" w={action} /></div> : head}
      {children}
    </div>
  )
}

const Choices = ({ options }: { options: readonly { title: string; help: string }[] }) => (
  <div className={styles.choices}>
    {options.map((o) => (
      <div key={o.title} className={choice.card}>
        <span className={choice.text}><Words className={choice.title}>{o.title}</Words><Words className={choice.help}>{o.help}</Words></span>
        <Bone w={20} h={20} r="50%" />
      </div>
    ))}
  </div>
)

/** (pending modules S17) A switch row as the page sets it — the switch, then its words (the label, and its help after a ·) — in its own class. */
const SwitchWords = ({ label, help, className }: { label: string; help?: string; className?: string }) => (
  <span className={className ? `${styles.switchRow} ${className}` : styles.switchRow}><Slot kind="switch" /><span><Words>{label}</Words>{help ? <>{' '}<Words className={styles.settingHelp}>{help}</Words></> : null}</span></span>
)

/** (pending modules S17) A card table's row name: its glyph (when it has one), the name over its help. */
const EventName = ({ icon = true, label, help }: { icon?: boolean; label: string; help?: string }) => (
  <span className={styles.eventName}>{icon ? <Bone w={20} h={20} r={4} /> : null}<span><Words>{label}</Words>{help ? <Words className={styles.eventHelp}>{help}</Words> : null}</span></span>
)

/** (pending modules S08) Set up your studio, as the card draws it for a studio that has not started: its head with the count and Hide, the two
    groups' captions, each step's row (the circle, its name, what it is for, the page it opens), and what is already set. */
function SetupGhost() {
  const solo = useSeedFlag('studio.solo', false)   // (pending modules S31) a studio of one is never asked for a team
  return (
    <div className={styles.setting}>
      <div className={styles.settingHeadRow}>
        <div className={styles.settingHead}><Words className={styles.settingTitle}>Set up your studio</Words><Words className={styles.settingHelp}>What your quotes, invoices and contracts need, and the page that keeps each. A step ticks itself once its page has it.</Words></div>
        <span className={setupCard.headEnd}><Line w={68} lh={20} h={10} /><Slot kind="btn" w={56} /></span>
      </div>
      <div className={`${ov.body} ${setupCard.list}`}>
        {SETUP_GROUPS.map((g) => (
          <Fragment key={g.key}>
            <div className={ov.groupLabel}><Words className={ov.groupText}>{g.label}</Words></div>
            <div className={ov.group}>
              {SETUP_ITEMS.filter((i) => i.group === g.key && (!solo || i.key !== 'team')).map((i) => (
                <div key={i.key} className={ov.row} data-two="" data-static="">
                  <Bone w={20} h={20} r="50%" />
                  <span className={ov.label}><span className={ov.two}><Words className={ov.name}>{i.label}</Words><Words className={ov.till}>{i.open}</Words></span></span>
                  <span className={ov.rowActions}><Slot kind="btn" w={Math.round((`Open ${i.home.page}`).length * 8.2)} /></span>
                </div>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
      <Words className={`${styles.settingHelp} ${setupCard.foot}`}>Already set for you: invoices are numbered from INV-2026-0001, leads move one stage at a time and a Designer’s quote waits for an OK before it goes out. Change them under Finance, Lead management or Quotes & pricing.</Words>
    </div>
  )
}

/** The module's head as ModuleHead draws it: the help, the head's own door (Notifications' Sent messages), the read-only line for whoever may
    only read it. */
function ModuleHeadGhost({ head, readOnly }: { head: Head; readOnly: boolean }) {
  return (
    <div className={styles.sectionHead}>
      <Words as="p" className={styles.sectionHelp}>{head.help}</Words>
      {head.door ? <Words className={styles.headDoor}>{head.door}</Words> : null}
      {/* (pending modules S14 — found on the way) the one read-only line every module draws under its title for whoever may only read it
          (ModuleHead `readOnly`) — the ghost drew none, so a Designer's page moved down on reveal */}
      {readOnly ? <p className={note.note}><Bone w={20} h={20} r={4} /><Words>Only Owners and Admins change these.</Words></p> : null}
    </div>
  )
}

export function SettingsGhost() {
  const studioName = useSeedStudio()
  /* (parity map, FB-114) Settings opens on Finance for Accounting when the address names no module (app/settings/page.tsx) */
  const params = useSearchParams()
  const asked = params.get('section') ?? undefined
  const keeper = useViewerShape('role.accounting')
  /* (pending modules S08) Studio opens on Set up your studio while it shows for this Owner or Admin — or when ⌘K asked for it (`?setup=1`) */
  const setupFirst = useViewerShape('role.setup')
  const runs = useViewerShape('role.runs')
  /* (pending modules S06) Accounting's Settings is Finance alone — no module strip, and the Kept in Company links they open (Vendors · Commission) */
  /* (S44O — call C6) Marketing's Settings is Lead management alone — no strip, its one Kept in Company link (Integrations), theirs to change */
  const desk = useViewerShape('role.marketing')
  const open = keeper ? 'finance' : desk ? 'leads' : parseSettingsModule(asked)
  return (
    <CompanyGhostFrame title={92} tabs={keeper || desk ? undefined : SETTINGS_MODULES.map((m) => m.label)} active={SETTINGS_MODULES.findIndex((m) => m.key === open)} label="Loading settings">
      <section className={styles.panel}>
        <ModuleHeadGhost head={headsFor(studioName)[open]} readOnly={!runs && !desk} />
        {open === 'studio' && (setupFirst || (runs && params.get('setup') === '1')) ? <SetupGhost /> : null}
        {open === 'studio' ? <StudioCards /> : open === 'leads' ? <LeadsCards runs={runs || desk} /> : open === 'meetings' ? <MeetingsCards runs={runs} /> : open === 'projects' ? <ProjectsCards runs={runs} /> : open === 'finance' ? <FinanceCards runs={runs} keeper={keeper} /> : open === 'quotes' ? (
          <>
            <Setting title="Quote approval" help="Whether a quote is reviewed inside the studio before it goes to the client. This sets the stages a quote moves through.">
              <Choices options={QUOTE_APPROVAL_OPTIONS} />
            </Setting>
            <Setting title="Template approval" help="Whether a designer’s quote template needs an Owner’s or Admin’s approval before the studio can use it. Applies to Company › Templates.">
              <Choices options={TEMPLATE_APPROVAL_OPTIONS} />
            </Setting>
          </>
        ) : <NotificationsCards runs={runs} />}
      </section>
    </CompanyGhostFrame>
  )
}

/** (pending modules S14) Roles & access: Who sees leads (its one home now), then Who may do what — every rule the app checks, grouped by area
    (parity P-38), each role's answer labelled in its row on a phone. The rows are the page's own (`permissionRows` at the studio's defaults). */
function StudioCards() {
  const owner = useViewerShape('role.owner')   // (pending modules S41b-1)
  return (
    <>
      <Setting title="Who sees leads" help={`${VISIBILITY_HELP}${linkedText(WHO_SEES_LEADS_MORE)}`}>
        <Choices options={LEAD_VISIBILITY_OPTIONS} />
      </Setting>
      {/* (pending modules S41b-1) Who sees costs and margins — the card table of roles, each with its switch; its rule line for anyone but an Owner */}
      <Setting title="Who sees costs and margins" help={COST_VISIBILITY_HELP}>
        {owner ? null : <p className={note.note}><Bone w={20} h={20} r={4} /><Words>{`${COST_VISIBILITY_RULE}.`}</Words></p>}
        <div className={`${styles.eventTable} ${costCard.table}`}>
          <div className={styles.eventHead}><Bone w={36} h={10} /><span className={styles.eventCol}><Words>Sees costs</Words></span></div>
          {(['Owner', ...COST_ROLES, 'Marketing'] as const).map((r) => (
            <div key={r} className={styles.eventRow}>
              <EventName icon={false} label={`${r === 'Accounting' || r === 'Marketing' ? r : `${r}s`} · 1`} help={r === 'Marketing' ? MARKETING_COST_HELP : COST_ROLE_HELP[r]} />   {/* (S44O — C6) Marketing's fixed row */}
              <span {...labelled(styles.eventCol, 'Sees costs')}><Slot kind="switch" /></span>
            </div>
          ))}
        </div>
      </Setting>
      {/* (the calm UI build, 5-04) What each role can do — one row: its title, the roles named, See the list (the table is in the drawer) */}
      <div className={styles.setting}>
        <div className={styles.settingHeadRow}>
          <div className={styles.settingHead}><Words className={styles.settingTitle}>{ROLES_ROW.title}</Words><Words className={styles.settingHelp}>{ROLE_COLUMNS.join(', ')}</Words></div>
          <GhostTextButton label={ROLES_ROW.open} />
        </div>
      </div>
    </>
  )
}

/** (pending modules S05) Lead management: Lead stages — the seven stages on the card table (what each keeps · its switch · the leads in it),
    then how leads move — Untouched leads, Lead sources. */
function LeadsCards({ runs }: { runs: boolean }) {
  return (
    <>
      <Setting title="Lead stages" help={LEAD_STAGES_HELP}>
        {/* (S42 B-12) the card's own read-only line, for whoever may only read it — as the page draws it */}
        {runs ? null : <p className={note.note}><Bone w={20} h={20} r={4} /><Words>Only Owners and Admins change the lead settings.</Words></p>}
        <div className={`${styles.eventTable} ${stagesCard.table}`}>
          <div className={`${styles.eventHead} ${stagesCard.row}`}><Bone w={40} h={10} /><Bone w={150} h={10} /><span className={stagesCard.countHead}><Bone w={64} h={10} /></span></div>
          {ALL_STAGES.map((st) => {
            const ask = STAGE_ASK_WORDS[st]
            return (
              <div key={st} className={`${styles.eventRow} ${stagesCard.row}`}>
                <span className={stagesCard.stage}><Bone w={8} h={8} r="50%" /><Words>{st}</Words></span>
                <span className={stagesCard.keeps}><Words>{STAGE_RECORDS[st]}</Words>{ask ? <SwitchWords className={stagesCard.ask} label={ask.label} help={`· ${ask.help}`} /> : null}</span>
                <span className={stagesCard.count}><Line w={56} lh={20} h={12} /></span>
              </div>
            )
          })}
        </div>
        <div className={stagesCard.movement}>
          <Words className={styles.reasonLabel}>How leads move</Words>
          <Choices options={STAGE_MOVEMENT_OPTIONS} />
          <Words className={styles.settingHelp}>{HOW_LEADS_MOVE_NOTE}</Words>
        </div>
      </Setting>
      {/* (UX audit S9) the untouched-lead delay, moved here from Notifications */}
      <Setting title="Untouched leads" help={UNTOUCHED_HELP}>
        <div className={styles.numGrid}><GhostField /></div>
      </Setting>
      <Setting title="Lead sources" help={LEAD_SOURCES_HELP}>   {/* (the calm UI build, W-281) the defaults' sentence is gone */}
        <ul className={styles.trades}>{Array.from({ length: 18 }, (_, i) => <li key={i}><Bone w={cycle([74, 92, 80, 70, 88, 76, 84, 78, 66], i)} h={32} r={4} /></li>)}</ul>   {/* (REG-729) the tokens are r4 now */}
      </Setting>
    </>
  )
}

/** (pending modules S23) Meetings: During a meeting — the co-pilot's nine parts on the card table, each with its switch; Deal score — the six
    weights' fields with their helpers, the total and (for whoever sets it) the card's four buttons; Meeting checklists — the kinds of meeting
    as chips, then the platform's items for the first kind (a first consultation, as the page opens). The rows and the words are the page's own. */
function MeetingsCards({ runs }: { runs: boolean }) {
  return (
    <>
      <Setting title={MEETING_CARDS.features.title} help={MEETING_CARDS.features.help}>
        <div className={`${styles.eventTable} ${meetingsCard.features}`}>
          <div className={`${styles.eventHead} ${meetingsCard.row}`}><Bone w={32} h={10} /><span className={styles.eventCol}><Bone w={20} h={10} /></span></div>
          {FEATURES.map((f) => (
            <div key={f.key} className={`${styles.eventRow} ${meetingsCard.row}`}>
              <EventName icon={false} label={f.label} help={f.help} />
              <span className={`${styles.eventCol} ${meetingsCard.switchCell}`}><Slot kind="switch" /></span>
            </div>
          ))}
        </div>
      </Setting>
      <Setting title={MEETING_CARDS.score.title} help={MEETING_CARDS.score.help}>
        <div className={meetingsCard.weights}>{DIMENSIONS.map((d) => <GhostField key={d.key} say={d.high} />)}</div>
        <div className={meetingsCard.scoreFoot}>
          <Words className={meetingsCard.total}>{weightsTotalLine(100)}</Words>
          {runs ? <span className={meetingsCard.scoreActions}><GhostTextButton label={MEETINGS_WORDS.even} /><GhostTextButton label={MEETINGS_WORDS.reset} /><Slot kind="btn" w={84} /><Slot kind="btn" w={64} /></span> : null}
        </div>
      </Setting>
      <Setting title={MEETING_CARDS.checklists.title} help={MEETING_CARDS.checklists.help}>
        <GhostChips rail labels={AIMS.map((a) => a.label)} />
        <div className={meetingsCard.listBlock}>
          <Words className={styles.reasonLabel}>{MEETINGS_WORDS.platformItems}</Words>
          <div className={`${styles.eventTable} ${meetingsCard.items}`}>
            <div className={`${styles.eventHead} ${meetingsCard.row}`}><Bone w={32} h={10} /><Bone w={96} h={10} /><span /></div>
            {checklistFor(AIMS[0].key).map((i) => (
              <div key={i.id} className={`${styles.eventRow} ${meetingsCard.row}`}>
                <EventName icon={false} label={i.label} help={checklistWordsLine(i.words)} />
                <span {...labelled(styles.eventWho, 'How important')}><Words>{categoryLabel(i.category)}</Words></span>
                <span className={meetingsCard.actions} />
              </div>
            ))}
          </div>
        </div>
      </Setting>
    </>
  )
}

/** (simplify S-20) Projects: What waits for an Owner or an Admin — the six rules on the card table (who approves, its switch), then Project numbers. */
function ProjectsCards({ runs }: { runs: boolean }) {
  const row = (r: { label: string; help: string }, who: ReactNode, on: ReactNode = <span {...labelled(styles.eventCol, 'On')}><Slot kind="switch" /></span>) => (
    <div key={r.label} className={styles.eventRow} role="row">   {/* the card's own tracks key on its rows' role (update-review-setting.module.css) */}
      <EventName label={r.label} help={r.help} />
      {who}
      {on}
    </div>
  )
  const owners = <span {...labelled(styles.eventWho, 'Who approves')}><Words>Owners and Admins</Words></span>
  return (
    <>
      <Setting title={OWNER_APPROVALS_TITLE} help={OWNER_APPROVALS_HELP}>
        <div className={`${styles.eventTable} ${updateReview.table}`}>
          <div className={styles.eventHead} role="row"><Bone w={32} h={10} /><Bone w={88} h={10} /><span className={styles.eventCol}><Bone w={20} h={10} /></span></div>
          {/* the updates' review names who reviews and, for whoever sets it, the press that adds one */}
          {row(UPDATE_REVIEW_WORDS, <span {...labelled(`${styles.eventWho} ${updateReview.who}`, 'Who approves')}><Words>Owners and Admins</Words>{runs ? <GhostTextButton label="Add a reviewer" /> : null}</span>)}
          {[APPROVAL_RULES.invoice, APPROVAL_RULES.done, APPROVAL_RULES.share, APPROVAL_RULES.handover].map((r) => row(r, owners))}
          {/* money out's two approvals are named here and set in Finance — their state in words */}
          {row({ label: COST_APPROVALS_WORDS.label, help: `${COST_APPROVALS_WORDS.lead('S$5,000.00')}${COST_APPROVALS_WORDS.link}${COST_APPROVALS_WORDS.end}` }, owners, <span {...labelled(`${styles.eventCol} ${styles.eventWho}`, 'On')}><Words>On</Words></span>)}
        </div>
      </Setting>
      <div className={styles.setting}>
        <div className={styles.settingHead}><Words className={styles.settingTitle}>Project numbers</Words><Words className={styles.settingHelp}>{PROJECT_NUMBERS_HELP}</Words></div>
        <div className={styles.numGrid}><GhostField say={PROJECT_NUMBER_HELPERS.prefix} /><GhostField say={PROJECT_NUMBER_HELPERS.next} /><GhostField say={PROJECT_NUMBER_HELPERS.digits} /></div>
        <div className={styles.switchGroup}><Words className={styles.reasonLabel}>Also in the number</Words><SwitchWords label="The year" help="· YYYY, the year the project is created" /></div>
        <div className={styles.example}><Words className={styles.settingHelp}>Next project:</Words> <Line w={120} lh={20} h={12} /></div>
        {runs ? <div className={styles.settingActions}><Slot kind="btn" w={84} /><Slot kind="btn" w={146} /></div> : null}
      </div>
    </>
  )
}

/** (simplify S-15) Settings › Finance: Document numbers (each document's prefix · next number · digits · the year · its next number), then
    Money in's Invoices. */
function FinanceCards({ runs, keeper }: { runs: boolean; keeper: boolean }) {
  const docRows = [...DOCS.map((x) => ({ label: x.label, when: x.when })), { label: TICKET_DOC.label, when: TICKET_DOC.when }]
  return (
    <>
      <div className={styles.setting}>
        <div className={styles.settingHead}><Words className={styles.settingTitle}>Document numbers</Words><Words className={styles.settingHelp}>{DOCUMENT_NUMBERS_HELP}</Words>
          <div className={styles.how}><GhostTextButton label={DOCUMENT_NUMBERS_HOW} iconEnd /></div></div>   {/* (the calm UI build, 5-34) the rules' fold, closed */}
        <div className={docs.rows}>
          {docRows.map((x) => (
            <div key={x.label} className={docs.row}>
              <span className={docs.name}><Bone w={20} h={20} r={4} /><span><Words>{x.label}</Words><Words className={docs.help}>{x.when}</Words></span></span>
              <span className={docs.prefix}><GhostField /></span><span className={docs.next}><GhostField /></span><span className={docs.digits}><GhostField /></span>
              <SwitchWords className={docs.year} label="The year" />
              <span className={`${styles.example} ${docs.example}`}><Words className={styles.settingHelp}>Next:</Words> <Line w={104} lh={20} h={12} /></span>
            </div>
          ))}
        </div>
        {runs ? <div className={styles.settingActions}><Slot kind="btn" w={84} /><Slot kind="btn" w={154} /></div> : null}
      </div>
      <div className={styles.cardGroup}>
        <Words as="h3" className={styles.groupLabel}>{FINANCE_GROUP_LABELS.in}</Words>
        <div className={styles.cardStack}>
          <div className={styles.setting}>
            <div className={styles.settingHead}><Words className={styles.settingTitle}>Invoices</Words><Words className={styles.settingHelp}>{INVOICES_HELP}</Words></div>
            <Words className={styles.settingHelp}>{linkedText(INVOICE_APPROVAL_POINTER)}</Words>
            <div className={styles.switchGroup}><Words className={styles.reasonLabel}>Payment schedules and splits</Words><SwitchWords label={FEE_FIRST_WORDS.label} help={FEE_FIRST_WORDS.help} /></div>
            <div className={styles.switchGroup}><Words className={styles.reasonLabel}>{VO_BILLING_WORDS.label}</Words><GhostChips labels={VO_BILLING_WORDS.options.map((o) => o.label)} /><Words className={styles.settingHelp}>{VO_BILLING_WORDS.help.spread}</Words></div>   {/* (S44O — row 360) */}
            <div className={styles.numGrid}><GhostField say={PAYMENT_TERMS_HELPER} /></div>
            {runs && !keeper ? <div className={styles.settingActions}><Slot kind="btn" w={84} /><Slot kind="btn" w={160} /></div> : null}
          </div>
        </div>
      </div>
    </>
  )
}

/** Notifications: the events, each with who hears it and its three channels — every event the page lists, each channel labelled on a phone. */
function NotificationsCards({ runs }: { runs: boolean }) {
  return (
    <Setting title={EVENTS_CARD.title} help={`${EVENTS_CARD.help}${linkedText(EVENTS_PERSONAL)}`}>
      <div className={`${styles.eventTable} ${styles.wording}`}>
        <div className={styles.eventHead}><Bone w={48} h={10} /><Bone w={32} h={10} /><span className={styles.eventCol}><Bone w={40} h={10} /></span><span className={styles.eventCol}><Bone w={36} h={10} /></span><span className={styles.eventCol}><Bone w={60} h={10} /></span><span /></div>
        {EVENTS.map((e) => (
          <div key={e.key} className={styles.eventRow}>
            <EventName label={e.label} help={e.help} />
            <span {...labelled(styles.eventWho, 'Who')}><Words>{e.who}</Words></span>
            {CHANNELS.map((c) => <span key={c.key} {...labelled(styles.eventCol, c.label)}><Slot kind="switch" /></span>)}
            {/* (the calm UI build, 5-05) the row's Edit wording (See wording for a reader) — none on a notice that stays in the app */}
            <span className={`${styles.eventCol} ${styles.wordingCell}`}>{IN_APP_ONLY.has(e.key) ? null : <GhostTextButton label={runs ? WORDING_WORDS.edit : WORDING_WORDS.see} />}</span>
          </div>
        ))}
      </div>
    </Setting>
  )
}
