'use client'

import { useSearchParams } from 'next/navigation'
import { Bone } from '@/components/shell/skeleton'
import { Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { SETTINGS_MODULES, parseSettingsModule } from '@/lib/settings/modules'
import { QUOTE_APPROVAL_OPTIONS, STAGE_MOVEMENT_OPTIONS, TEMPLATE_APPROVAL_OPTIONS } from '@/lib/settings/types'
import styles from './settings.module.css'
import choice from '@/components/om/choice-card.module.css'

/**
 * (REG-708) Settings' ghost, per module: the frame (Settings and its modules' strip, as CompanyShell draws it), then the open module
 * (`?section=`, read here as the page reads it) — its head in its own words with the Company pages it keeps its records in, and its first
 * cards: Studio's Team and entities, Lead management's Stage movement and Lead sources, Quotes & pricing's two approvals, Notifications'
 * event table. The route's `loading.tsx` and the page's PageReveal draw the same one. The studio's name in a help line is the demo's.
 */
const HEADS = {
  studio: { title: 'Studio', help: 'Who works in Demo Studio, the companies it issues quotes and contracts under, and what each role may do.', links: [78, 64] },
  leads: { title: 'Lead management', help: 'Applies to every lead in Demo Studio — the table, the kanban board and imports.', links: [96, 110, 80] },
  quotes: { title: 'Quotes & pricing', help: 'Applies to every quote in Demo Studio — the editor, the lists, the templates and the client’s copy.', links: [90, 84] },
  notifications: { title: 'Notifications', help: 'What the studio hears about, on which channels, and the words each message uses. In app rows land in the bell; email and WhatsApp go out with them, sent by the platform with the same words.', links: [] },
} as const

function Setting({ title, help, children, action }: { title: string; help: string; children: React.ReactNode; action?: number }) {
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

export function SettingsGhost() {
  const open = parseSettingsModule(useSearchParams().get('section') ?? undefined)
  const h = HEADS[open]
  return (
    <CompanyGhostFrame title={92} tabs={SETTINGS_MODULES.map((m) => m.label)} label="Loading settings">
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <Words as="h2" className={styles.sectionTitle}>{h.title}</Words>
          <Words as="p" className={styles.sectionHelp}>{h.help}</Words>
          {h.links.length ? <div className={styles.moduleLinks}><Words className={styles.settingHelp}>Kept in Company:</Words>{h.links.map((w, i) => <Line key={i} w={w} lh={36} h={12} />)}</div> : null}
        </div>
        {open === 'studio' ? (
          <>
            <Setting title="Team" help="7 members, by role. Roles, who reports to whom and who is added or deactivated are set under Company › Members." action={166}>
              <div className={styles.roleList}>
                {['Owner', 'Admin', 'Manager', 'Designer'].map((role, i) => (
                  <div key={role} className={styles.roleRow}>
                    <Words className={styles.reasonLabel}>{role}</Words>
                    <span className={styles.people}>{Array.from({ length: i === 3 ? 4 : 1 }, (_, j) => <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Slot kind="avatar" /><Line w={cycle([44, 56, 60, 52], j)} lh={20} h={12} /></span>)}</span>
                  </div>
                ))}
              </div>
            </Setting>
            <Setting title="Issuing entities" help="The companies a quote or a contract can be issued under — the first is the studio itself. Their bank details, PayNow and letterheads are kept under Company › Profile." action={146}>
              <div className={styles.eventTable}><div className={styles.eventHead}><Bone w={48} h={10} /></div><div className={styles.eventRow}><Line w={150} lh={20} h={12} /></div></div>
            </Setting>
          </>
        ) : open === 'leads' ? (
          <>
            <Setting title="Stage movement" help="How leads move from one stage to the next. The stages are New, Contacted, Met, Quote Sent and Won, with On Hold and Lost beside them; On Hold and Lost always ask for a reason.">
              <Choices options={STAGE_MOVEMENT_OPTIONS} />
            </Setting>
            <Setting title="Lead sources" help="Where a lead can come from — the Lead source field, the import mapping and the Source filter offer these. Retire a source to keep its leads and stop offering it; a source with no leads can be removed.">
              <ul className={styles.trades}>{Array.from({ length: 18 }, (_, i) => <li key={i}><Bone w={cycle([74, 92, 80, 70, 88, 76, 84, 78, 66], i)} h={32} r={16} /></li>)}</ul>
            </Setting>
          </>
        ) : open === 'quotes' ? (
          <>
            <Setting title="Quote approval" help="Whether a quote is reviewed inside the studio before it goes to the client. This sets the stages a quote moves through.">
              <Choices options={QUOTE_APPROVAL_OPTIONS} />
            </Setting>
            <Setting title="Template approval" help="Whether a designer’s quote template needs an Owner’s or Admin’s approval before the studio can use it. Applies to Company › Templates.">
              <Choices options={TEMPLATE_APPROVAL_OPTIONS} />
            </Setting>
          </>
        ) : (
          <Setting title="Events and channels" help="Who receives each event is fixed by the event; the channels are yours to switch.">
            <div className={styles.eventTable}>
              <div className={styles.eventHead}><Bone w={48} h={10} /><Bone w={32} h={10} /><span className={styles.eventCol}><Bone w={40} h={10} /></span><span className={styles.eventCol}><Bone w={36} h={10} /></span><span className={styles.eventCol}><Bone w={60} h={10} /></span></div>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className={styles.eventRow}>
                  <span className={styles.eventName}><Bone w={16} h={16} /><span><Line w={cycle([120, 110, 130, 140, 118, 150], i)} lh={20} h={12} /><Line w={cycle([180, 150, 200, 170], i)} lh={16} h={10} /></span></span>
                  <Line w={cycle([120, 80, 170, 64], i)} lh={16} h={10} />
                  <span className={styles.eventCol}><Slot kind="switch" /></span><span className={styles.eventCol}><Slot kind="switch" /></span><span className={styles.eventCol}><Slot kind="switch" /></span>
                </div>
              ))}
            </div>
          </Setting>
        )}
      </section>
    </CompanyGhostFrame>
  )
}
