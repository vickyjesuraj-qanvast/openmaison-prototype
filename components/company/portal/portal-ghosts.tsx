'use client'

import { Bone } from '@/components/shell/skeleton'
import { GhostField, GhostTable, GhostTextButton, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { useSeedStudio } from '@/lib/ghost-shape'   // (pending modules S31)
import { slugFromName } from '@/lib/portal/model'
import { CLIENT_PORTAL_TABS } from '@/lib/company/sections'
import { useFlagPref } from '@/lib/prefs'
import { LINKS_HELP } from '@/lib/portal/links'   // (pending modules S13)
import { PORTAL_SECTIONS, WELCOME_MAX } from '@/lib/portal/sections'
import note from '@/components/company/read-only-note.module.css'
import card from './portal-card.module.css'   // (the calm UI build 2026-10-27 — 5-23) the page's Company card head
import plan from '@/components/company/plan/plan.module.css'
import styles from './portal-setup.module.css'
import sec from './portal-sections.module.css'

/*
 * (Projects r4a, REG-708) Company › Client portal's ghosts — the Set-up's two stacks (the checklist; the client's page in its frame and the
 * clients) and the Clients table, each on the page's own classes; the route's loading.tsx and the page's PageReveal draw the same one.
 */
const TABS = CLIENT_PORTAL_TABS.map((t) => t.label)

function CardGhost({ title, children, steps, stack = true }: { title: string; children?: React.ReactNode; steps?: StepGhost[]; /** the checklist's steps stack their line under their name; the clients' rows keep one line */ stack?: boolean }) {
  return (
    <section className={card.card}>
      <div className={card.head}><Words as="h2" className={card.title}>{title}</Words></div>
      {children ?? (
        <div className={styles.body}>
          <div className={styles.group}>
            {(steps ?? []).map((st) => (
              /* (pending modules S17) the step as the page stacks it (`data-stack`): its mark, its name over its line in their own words, the
                 address's Copy and Open, its press — a text button */
              <div key={st.title} className={styles.row} data-static="" data-stack={stack ? '' : undefined}>
                <Bone w={20} h={20} r="50%" />
                <span className={styles.label}><span className={styles.nameGroup}>{st.title ? <Words className={styles.name}>{st.title}</Words> : <Line w={96} lh={20} h={12} />}{st.line ? <Words className={styles.till}>{st.line}</Words> : <Line w={stack ? '86%' : 180} lh={stack ? 16 : 20} h={10} />}</span></span>
                {stack ? null : <span className={styles.rowEnd}><Line w={110} lh={20} h={10} /></span>}
                {st.tools ? <span className={styles.rowTools}>{[0, 1].map((k) => <span key={k} style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Bone w={20} h={20} r={4} /></span>)}</span> : null}
                {st.action ? <span className={styles.rowAction}><GhostTextButton label={st.action} /></span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/** (pending modules S17) A Getting it live step as the demo studio's set-up shows it — its own words (the address is the demo's). */
type StepGhost = { title: string; line?: string; tools?: boolean; action?: string | null }
/* (pending modules S31) the open studio's name (the app shell's seed): its address and its entity — the demo's in its base */
const stepGhosts = (mayRun: boolean, studio: string): StepGhost[] => [
  { title: 'Address', line: `app.openmaison.sg/my/${slugFromName(studio)} · made from your studio’s name. An old address keeps working after a change.`, tools: true, action: mayRun ? 'Change' : null },
  { title: 'Logo and colour', line: 'Taken from your brand kit. Nothing to enter again.', action: 'Open brand kit' },
  { title: 'How clients pay', line: studio === 'Demo Studio' ? 'Demo Studio Pte Ltd · bank transfer and PayNow, from Company › Profile.' : `Add the bank and PayNow your clients pay into, under ${studio} in Company › Profile.`, action: 'Open Profile' },
  { title: 'Privacy notice', line: 'Not linked yet.', action: mayRun ? 'Add the link' : null },   // (the calm UI build 2026-10-27 — 5-37) as the page says it
  { title: 'Try it yourself', line: 'Open Ryan D’Souza’s page as they see it — read-only, nothing you do there is recorded.', action: 'See it as Ryan' },
]

/** (fix-G, G-45) Whether the viewer runs the portal (Pause in the header) — the page remembers it per browser for its loader; the page's own
    reveal is told. */
export const PORTAL_RUNS_KEY = 'om.ghost.portal.runs'

export function PortalSetupGhost({ runs }: { runs?: boolean }) {
  const [remembered] = useFlagPref(PORTAL_RUNS_KEY, true)
  const mayRun = runs ?? remembered
  const studio = useSeedStudio()
  return (
    /* (pending modules S17) the header's Live tag, Pause the portal and See it as {client}, at their widths — they wrapped to a third line on a phone */
    <CompanyGhostFrame title={112} actions={mayRun ? [38, 136, 150] : [38, 150]} tabs={TABS} label="Loading the client portal">
      <div className={styles.page}>
        {mayRun ? null : <p className={note.note}><Bone w={20} h={20} r={4} /><Words>Only Owners and Admins change the portal’s set-up.</Words></p>}
        <div className={styles.grid}>
          <div className={styles.column}>
            <CardGhost title="Getting it live" steps={stepGhosts(mayRun, studio)} />   {/* (pending modules S13) five checks — the privacy notice the fourth */}
            {/* (Projects round 9) What clients can see — the card table's head and six switch rows — and the welcome line's field */}
            <CardGhost title="What clients can see">
              <div className={sec.body}>
                <Words as="p" className={sec.help}>A section that is off is hidden for every client and its data is not sent. Inside a section, a client still sees only what you have shared.</Words>
                <div className={sec.table}>
                  <div className={sec.head}><Line w={56} lh={16} h={10} /><span className={sec.col}><Line w={44} lh={16} h={10} /></span></div>
                  {/* (pending modules S17) every section the page lists, in its own words */}
                  {PORTAL_SECTIONS.map((x) => <div key={x.key} className={sec.row}><span className={sec.name}><Words>{x.name}</Words><Words className={sec.line}>{x.line}</Words></span><span className={sec.col}><Slot kind="switch" /></span></div>)}
                </div>
              </div>
            </CardGhost>
            <CardGhost title="Welcome line">
              {/* (pending modules S17) the page's form: the field with its helper in its own words, then Save */}
              <div className={sec.body}><div className={sec.welcome}><GhostField say={`On the sign-in page, and under your studio’s name on each client’s home. Plain words, up to ${WELCOME_MAX} characters — 26 used.`} />{mayRun ? <div className={sec.actions}><Bone w={64} h={36} r={4} /></div> : null}</div></div>
            </CardGhost>
            {/* (pending modules S13) Privacy and terms: its help, the three link boxes and Save */}
            <CardGhost title="Privacy and terms">
              <div className={sec.body}>
                <Words className={sec.help}>{LINKS_HELP}</Words>
                <div className={sec.welcome}>{[0, 1, 2].map((i) => <Bone key={i} w="100%" h={48} r={4} />)}{mayRun ? <div className={sec.actions}><Bone w={64} h={36} r={4} /></div> : null}</div>
              </div>
            </CardGhost>
          </div>
          <div className={styles.column}>
            <CardGhost title="What a client sees">
              <div className={styles.preview}><Line w="70%" lh={16} h={10} /><Bone w={262} h={520} r={24} /></div>
            </CardGhost>
            <CardGhost title="Clients" stack={false} steps={[0, 1, 2, 3].map(() => ({ title: '' }))} />
          </div>
        </div>
      </div>
    </CompanyGhostFrame>
  )
}

export function PortalClientsGhost() {
  return (
    <CompanyGhostFrame title={112} tabs={TABS} label="Loading clients">
      <div className={styles.page}>
        <section className={plan.section}>
          <div className={plan.sectionHead}>
            <div className={plan.sectionTitles}><Words as="h2" className={plan.sectionTitle}>Clients</Words><Words className={plan.sectionHelp}>Every project’s client, and every lead you have invited — who can open the portal, and when they last did</Words></div>
            <div className={plan.sectionTools}><Slot kind="search" /><Slot kind="icon" desk /></div>
          </div>
          <GhostTable head={56} row={64} rows={4} phone={{ card: 168, lines: 5 }} cols={[
            { basis: 220, grow: 220, head: 44, cell: [120, 72], stick: true },
            { basis: 260, grow: 260, head: 36, cell: 190 },
            { basis: 190, grow: 190, head: 48, cell: { slot: 'chip', w: 120 } },
            { basis: 120, grow: 120, head: 52, cell: 48 },
            { basis: 140, grow: 140, head: 80, cell: 84 },
            { basis: 96, grow: 96, head: 52, cell: { slot: 'icon' } },
          ]} />
        </section>
      </div>
    </CompanyGhostFrame>
  )
}
