'use client'

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { displayCustomValue, type CustomFieldDef, type CustomValues } from '@/lib/leads/custom-fields-model'
import { Button } from '@/components/ds'
import { Sheet } from '@/components/om/sheet'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { MOBILE, TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import type { Member } from '@/lib/db/schema'
import type { LeadRow } from '@/lib/leads/queries'
import type { LeadFormField } from '@/components/leads/lead-form'
import { displayDate, groupDigits, maskNric, moneyCard, phoneDigits, phoneLocal } from '@/lib/format'
import { runsStudio } from '@/lib/leads/assign-policy'
import { conditionLabel, isCommercialType } from '@/lib/leads/enums'   // (pending modules S05) · (the calm UI build) the condition's words
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './info-column.module.css'
import Link from 'next/link'
import textLink from '@/components/om/text-link.module.css'   // (simplify S-01) the project's document rows link as the house text link

/**
 * Lead Details › Overview — the lead-info column (858:24787, frame 155; collapsed / assigned states from
 * 858:25136, frame 156). Spec: design-source/context/lead-overview/02-left-column.txt.
 *
 * 360 wide, 24 padding, 1px surface-variant right rule. Flow (gap 24): identity block · rule · Collaborators ·
 * rule · Lead info · rule · Property info · rule · Other info. Every section is collapsible to its 20px head row.
 *
 * (REG-304, user 2026-09-02) The WHOLE column collapses too — the Create strip's twin (quick-links.tsx), on the left:
 *   ≥768 collapsed = a 72px strip: the toggle, a 24×1 rule, one 24px glyph per block (contact · Collaborators ·
 *        Lead info · Property info · Other info); a glyph expands the column, opens that section and scrolls to it.
 *   ≤767 collapsed = the identity block alone, the sections folded under it (the column stacks there, so the fold is
 *        vertical and the toggle wears the sections' own up/down chevron instead of the panel glyph).
 * Remembered per browser (`om.detail.infoColumn`) through the quick-links store pattern; the default is the mock's
 * expanded column on desktop and tablet, collapsed on a phone (the column sits above the content there). The width
 * animates on the rail's timing only after a toggle — never on load.
 */
type ColumnState = 'expanded' | 'collapsed'
const KEY = 'om.detail.infoColumn'
let cached: ColumnState | null = null
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  const mq = window.matchMedia(MOBILE)   // the default flips with the breakpoint, so a resize re-reads it
  mq.addEventListener('change', cb)
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb); mq.removeEventListener('change', cb) }
}
const read = (): ColumnState => {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'expanded' || raw === 'collapsed') return raw
  } catch {}
  return window.matchMedia(MOBILE).matches ? 'collapsed' : 'expanded'
}
const write = (s: ColumnState) => {
  cached = s
  try { localStorage.setItem(KEY, s) } catch {}
  listeners.forEach((l) => l())
}
const serverSnapshot = (): ColumnState => 'expanded'

/** The strip's glyphs, one per block, in the column's own order. `section` names the remembered flag + scroll target. */
const BLOCKS: { icon: string; label: string; section: string | null }[] = [
  { icon: 'person', label: 'Contact', section: null },
  /* (the calm UI build 2026-10-27 — T-01, audit 2-14 · 3-18, W-003) "Members", the listing's word; the section keeps its key, so the remembered
     fold (`om.detail.section.collaborators`) and its anchor (`info-section-collaborators`) are unchanged */
  { icon: 'people_alt', label: 'Members', section: 'Collaborators' },
  { icon: 'info', label: 'Lead info', section: 'Lead info' },
  { icon: 'home', label: 'Property info', section: 'Property info' },
  { icon: 'sticky_note_2', label: 'Other info', section: 'Other info' },
  { icon: 'list_alt', label: 'Custom fields', section: 'Custom fields' },   /* (REG-612) shown only when the studio has fields */
]
/* (parity P-01 · A-01) A project's page carries this column: its own section, Project info, takes Lead info's place — in the strip too, on the
   same glyph, so the column keeps one shape on both records. */
const PROJECT_INFO = { icon: 'info', label: 'Project info', section: 'Project info' }
const blocksFor = (project: boolean) => (project ? BLOCKS.map((b) => (b.section === 'Lead info' ? PROJECT_INFO : b)) : BLOCKS)
const slug = (title: string) => title.toLowerCase().replace(/\s+/g, '-')
const sectionId = (title: string) => `info-section-${slug(title)}`

export type InfoColumnProps = {
  /** (REG-612, parity Q-25) The studio's active custom fields and this lead's values — the Custom fields section. */
  customFields?: CustomFieldDef[]
  customValues?: CustomValues
  /** (REG-609, parity Q-22) The portal link's invite stamp — the "Portal" row. */
  portal?: { invitedAt: Date | null; openedAt?: Date | null; lastOpenedAt?: Date | null; withdrawnAt?: Date | null } | null
  lead: LeadRow
  /** The studio's members. (UX audit 2026-09-30, L7) The Owner row reads the lead's own assignees now. (REG-903) The signed-in member
   *  (`isYou`) among them decides whether the NRIC's Show is offered. */
  team?: Member[]
  onEdit: () => void
  onAssign: (anchor: HTMLElement) => void
  onAssigneeMenu: (anchor: HTMLElement, member: Member) => void
  onCopy: (what: 'phone' | 'email', value: string) => void
  onWhatsApp: () => void
  onDirections: () => void
  /** (parity P-01 · A-01) A project's page: the column names the project in its labels, and its own section — the number, the stage, the
   *  project type, the scope and the dates — takes Lead info's place (the lead's Source, Budget, Created, NRIC / FIN, Customer ID and Portal
   *  stay on the lead's own record). The pencil is the frame's Edit details (a direct project) or the lead's form in place (a Won one, Q-04). */
  project?: ProjectInfo
  /** (pending modules S26 — card studio:team-chats, "a chat about a lead before it has a project") the record's Team conversation — the
   *  Collaborators' door to it (a lead's before Won, carried on in the project's once Won); shown while the record has members */
  teamChatHref?: string | null
  /** (the calm UI build 2026-10-27 — audit 2-03 · 3-32) A section's "Add district, area size…" link opens Edit details ON its first empty
   *  field (REG-224); without it the link opens Edit details as the pencil does (a project's page). */
  onEditField?: (field: LeadFormField) => void
}

/** (parity P-01) A project's own facts, as words — the page formats them. (simplify S-01) …and its documents: the signed quote and the contract
    (Key documents left the Overview for these rows), a direct project's other quotes and contracts — each opening itself. */
export type ProjectInfo = { number: string; stage: string; projectType: string | null; scope: string | null; start: Date | null; end: Date | null
  documents?: ProjectInfoDocument[] }
/** (simplify S-01) One Project info row for a document: its label, its words ("OM-10005", "Signed 21 Aug ’26"), and where it opens. */
export type ProjectInfoDocument = { key: string; label: string; value: string | null; href?: string; testId?: string }

/** (the calm UI build 2026-10-27 — T-08) A row that has a value, and the field an empty one is added through. */
type InfoRow = { k: string; value: ReactNode | null; /** 'project': added through the pencil's Edit details */ field?: LeadFormField | 'project'; testId?: string }
const has = (v: string | null | undefined) => v != null && v.trim() !== ''

export function InfoColumn({
  lead, team = [], onEdit, onAssign, onAssigneeMenu, onCopy, onWhatsApp, onDirections, portal = null, customFields = [], customValues = {}, project, teamChatHref = null, onEditField,
}: InfoColumnProps) {
  /* (parity P-01) the record the column speaks of — its labels say "project" on a project's page */
  const noun = project ? 'project' : 'lead'
  const blocks = blocksFor(!!project)
  /* (pending modules S26) the team's own conversation — one link on the Collaborators, while the record has members (the Portal row's door,
     its twin for the team: the client never sees it) */
  /* (the calm UI build 2026-10-27 — audit 2-37 · 3-13, W-620 · W-589) the two conversations side by side, one word each: "Team chat · Open"
     (the team's own — the client never sees it) and, once the client is on the portal, "Client chat · Open" (it sat on the Portal row) */
  const teamChatRow = teamChatHref && lead.assignees.length ? (
    <Row k="Team chat">
      <span className={styles.text}><Link className={styles.headLink} href={teamChatHref} data-testid="info-team-chat">Open</Link></span>
    </Row>
  ) : null
  const clientChatRow = !project && portal?.invitedAt && !portal.withdrawnAt ? (
    <Row k="Client chat">
      <span className={styles.text}><Link className={styles.headLink} href={`/chat?open=${encodeURIComponent(`lead:${lead.id}`)}&from=${encodeURIComponent(`/leads/${lead.id}`)}`} data-testid="lead-portal-messages">Open</Link></span>   {/* (S42 audit C-23, call C·5) the client's conversation */}
    </Row>
  ) : null
  /* (parity P-01 · A-01) the project's own section, in Lead info's place — on the desktop column and the phone's sheet alike */
  /* (the calm UI build 2026-10-27 — audit 3-32 · 2-03 · T-08) a row only when it has a value; the empty ones are one "Add …" link at the
     section's foot, opening Edit details (on that field where the page can — `onEditField`) */
  const addLabel = (rows: InfoRow[]) => {
    const names = rows.map((r) => (/^[A-Z]{2}/.test(r.k) ? r.k : r.k.replace(/ \(.*\)$/, '').replace(/^./, (c) => c.toLowerCase())))
    return `Add ${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}`
  }
  const addLink = (rows: InfoRow[], testId: string) => {
    const empty = rows.filter((r) => r.value === null && r.field !== undefined)
    if (!empty.length) return null
    const first = empty[0]!.field!
    return <AddLink label={addLabel(empty)} testId={testId} onClick={() => (onEditField && first !== 'project' ? onEditField(first) : onEdit())} />
  }
  const rowsOf = (rows: InfoRow[]) => rows.filter((r) => r.value !== null).map((r) => (
    <Row key={r.k} k={r.k} testId={r.testId}>{typeof r.value === 'string' ? <span className={styles.text}>{r.value}</span> : r.value}</Row>
  ))
  const projectRows: InfoRow[] = project ? [
    { k: 'Number', value: project.number, testId: 'info-project-number' },
    { k: 'Stage', value: project.stage, testId: 'info-project-stage' },
    { k: 'Project type', value: project.projectType ?? null, field: 'project', testId: 'info-project-type' },
    { k: 'Scope', value: project.scope ?? null, field: 'project', testId: 'info-project-scope' },
    { k: 'Start date', value: project.start ? displayDate(project.start) : null, field: 'project', testId: 'info-project-start' },
    { k: 'Target end', value: project.end ? displayDate(project.end) : null, field: 'project', testId: 'info-project-end' },
    ...(project.documents ?? []).filter((doc) => doc.value).map((doc): InfoRow => ({ k: doc.label, testId: doc.testId,
      value: doc.href && doc.value ? <Link href={doc.href} className={`${textLink.link} ${styles.docLink}`}>{doc.value} <Icon name="arrow_outward" size={16} /></Link> : doc.value })),
  ] : []
  const projectSection = project ? (
    <Section title="Project info">
      <KVList>{rowsOf(projectRows)}</KVList>
      {/* a project's dates and type are its own Edit details (the frame's pencil), not the lead form's fields */}
      {addLink(projectRows, 'info-add-project')}
    </Section>
  ) : null
  /* (REG-612) The Custom fields section — after Other info, on the desktop column and the phone's sheet alike. */
  const customRows: InfoRow[] = customFields.map((f) => { const v = displayCustomValue(f, customValues[f.id]); return { k: f.label, value: v === '—' ? null : v, field: 'project' } })   // a custom field is filled in Edit details (the form's own section)
  const customSection = customFields.length ? (
    <>
      <div className={styles.rule} />
      <Section title="Custom fields">
        <KVList>{rowsOf(customRows)}</KVList>
        {addLink(customRows, 'info-add-custom')}
      </Section>
    </>
  ) : null
  const assignees = lead.assignees
  /* (UX audit 2026-09-30, L7 — supersedes the mock 858:24806's standing "You") The lead's first assigned member is the one the New gate asks for. */
  /* (the calm UI build 2026-10-27 — audit 2-14 · 3-18, W-582 · W-583) No separate Owner row: "Owner" is the studio's role. The Members list
     names the signed-in member "(you)" and its first member — the one the New gate asks for — "in charge" (the Owner row said it twice). */
  /* (REG-903, Dane UAT 5.06 — PDPA) The client's NRIC / FIN reads masked, as a signed document shows it (REG-563: •••••567A); an Owner
     or an Admin (the signed-in member, `isYou` on the team) may Show it in full on this lead for this view. The stored value, the
     export and the quote's print are unchanged. */
  const mayShowNric = runsStudio(team.find((m) => m.isYou)?.role)
  const [nricShownFor, setNricShownFor] = useState<string | null>(null)
  const nricShown = mayShowNric && nricShownFor === lead.id
  /* (UX audit 2026-09-30, L11) On a touch screen the number calls: a tel: link beside Copy and WhatsApp (the +65 the column leaves implied). */
  const touch = useMediaQuery(TOUCH_TABLET)
  /* (pending modules S05 — testers' L-3 · L-4) a commercial client's company and UEN; the second client (a co-owner) — their name and mobile,
     the mobile with Copy — shown only when the lead holds them */
  const commercial = isCommercialType(lead.propertyType)
  const secondRow = lead.client2Name ? (
    <span className={styles.text} data-testid="lead-second-client">
      {lead.client2Name}{lead.client2Phone ? <>{' · '}<span className={styles.keep}>{phoneLocal(lead.client2Phone)}</span></> : ''}
      {lead.client2Phone ? <>{' '}<Tooltip label="Copy their number"><button type="button" className={styles.iconBtn} data-size="16" aria-label={`Copy ${lead.client2Name}’s number`} onClick={() => onCopy('phone', lead.client2Phone!)}><Icon name="content_copy" size={16} weight={300} /></button></Tooltip></> : null}
    </span>
  ) : null

  /* (REG-304) Whole-column state — see the file comment. */
  const mobile = useMediaQuery(MOBILE)
  const [infoOpen, setInfoOpen] = useState(false)   // (REG-366) the phone's details sheet
  const state = useSyncExternalStore(subscribe, read, serverSnapshot)
  const animate = useSyncExternalStore(subscribe, () => cached !== null, () => false)
  const expanded = state === 'expanded'
  const toggle = () => write(expanded ? 'collapsed' : 'expanded')
  /** A strip glyph: expand, open that section, and land on it (the checklist's "opens ON that row"). */
  const reveal = (section: string | null) => {
    if (section) setFlagPref(`om.detail.section.${slug(section)}`, true)
    write('expanded')
    requestAnimationFrame(() => {
      const el = section ? document.getElementById(sectionId(section)) : null
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  /* ── the sections, once — the column (≥768) and the phone's details sheet draw the same (the calm UI build 2026-10-27: they had drifted —
     the sheet's Lead info had no NRIC, Customer ID or Portal) ── */
  const membersSection = (
    <Section title="Members" storeKey="Collaborators" link={assignees.length ? { label: 'Add', onClick: onAssign, kb: 'assign' } : undefined}>
      {/* the members themselves, full width — a "Members" key beside them repeated the section's title */}
      {assignees.length ? (
        <div className={`${styles.assignees} ${styles.memberList}`} data-testid="info-members">
          {assignees.map((m, i) => (
            <div key={m.id} className={styles.assignee}>
              <Avatar name={m.name} color={m.color} size={20} tooltip={false} />
              <span className={styles.assigneeName}>
                {m.isYou ? `${m.name} (you)` : m.name}
                {i === 0 && assignees.length > 1 ? <span className={styles.assigneeRole}>{' · '}in charge</span> : null}
              </span>
              <Tooltip label="Member actions">
                <button type="button" className={styles.iconBtn} aria-label={`Actions for ${m.name}`}
                        onClick={(e) => onAssigneeMenu(e.currentTarget, m)}>
                  <Icon name="more_vert" size={20} weight={300} />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.memberList}><LinkButton label="Assign members" onClick={onAssign} kb="assign" /></div>
      )}
      {teamChatRow || clientChatRow ? <KVList>{teamChatRow}{clientChatRow}</KVList> : null}
    </Section>
  )
  /* (the calm UI build 2026-10-27 — audit 2-02 · 2-03) Lead info drops Stage (the Stage ▾ pill and the stages card say it) and shows only what
     it holds; NRIC / FIN and Customer ID moved to Other info (most leads never have them); the budget in the record's one money format. */
  const leadRows: InfoRow[] = [
    { k: 'Source', value: has(lead.source) ? lead.source : null, field: 'source' },
    { k: 'Budget', value: lead.budgetMinor > 0 ? moneyCard(lead.budgetMinor) : null, field: 'budget' },
    { k: 'Created', value: displayDate(lead.createdAt) },
    ...(commercial ? [
      { k: 'Company', value: has(lead.companyName) ? lead.companyName! : null, field: 'companyName' as const, testId: 'lead-company' },
      { k: 'UEN', value: has(lead.companyUen) ? lead.companyUen! : null, field: 'companyName' as const },
    ] : []),
    { k: 'Second client', value: secondRow },
    /* (REG-609, parity Q-22 · Projects r4a) the client's access, in the Client access panel's words — the conversation moved to Members' "Client chat" */
    { k: 'Portal', value: portal?.withdrawnAt ? `Withdrawn ${displayDate(portal.withdrawnAt)}` : portal?.lastOpenedAt ? `Opened ${displayDate(portal.lastOpenedAt)}` : portal?.invitedAt ? `Invited ${displayDate(portal.invitedAt)}` : null },
  ]
  const propertyRows: InfoRow[] = [
    { k: 'Type', value: has(lead.propertyType) ? lead.propertyType : null, field: 'propertyType' },
    { k: 'District', value: has(lead.area) ? lead.area! : null, field: 'district' },   /* (REG-607, parity Q-12) */
    { k: 'Condition', value: has(lead.condition) ? conditionLabel(lead.condition) : null, field: 'condition' },
    { k: 'Style', value: has(lead.style) ? lead.style! : null, field: 'style' },
    { k: 'Area size (sq ft)', value: lead.areaSqft != null ? groupDigits(String(lead.areaSqft)) : null, field: 'areaSize' },
    { k: 'Key collection', value: has(lead.keyCollection) ? lead.keyCollection! : null, field: 'keyCollection' },
    { k: 'Property address', value: has(lead.propertyAddress) ? lead.propertyAddress! : null, field: 'propertyAddress' },
  ]
  const nricValue = lead.icNumber ? (
    <span className={styles.text} data-testid="lead-nric">
      {nricShown ? lead.icNumber : maskNric(lead.icNumber)}
      {mayShowNric && !nricShown ? <>{' '}<button type="button" className={styles.headLink} aria-label="Show NRIC / FIN" onClick={() => setNricShownFor(lead.id)}>Show</button></> : null}
    </span>
  ) : null
  const otherRows: InfoRow[] = [
    /* "Remarks" (user 2026-08-31) — the mock types "Notes", which collided with the Notes tab, a different record entirely. */
    { k: 'Remarks', value: has(lead.notes) ? lead.notes! : null, field: 'notes' },
    /* (REG-607, parity Q-35) 1.0's client IC and customer reference, printed on the quotes — (S05) a commercial lead's IC steps back for the UEN */
    ...(commercial && !lead.icNumber ? [] : [{ k: 'NRIC / FIN', value: nricValue, field: 'nric' as const }]),
    { k: 'Customer ID', value: has(lead.customerId) ? lead.customerId! : null, field: 'customerId' },
  ]
  const sections = (
    <>
      {membersSection}
      <div className={styles.rule} />
      {projectSection ?? (
        <Section title="Lead info">
          <KVList>{rowsOf(leadRows)}</KVList>
          {addLink(leadRows, 'info-add-lead')}
        </Section>
      )}
      <div className={styles.rule} />
      <Section title="Property info">
        <KVList gap={16}>{rowsOf(propertyRows)}</KVList>
        {addLink(propertyRows, 'info-add-property')}
      </Section>
      <div className={styles.rule} />
      <Section title="Other info">
        <KVList>{rowsOf(otherRows)}</KVList>
        {addLink(otherRows, 'info-add-other')}
      </Section>
      {customSection}
    </>
  )

  if (!expanded && !mobile) {
    return (
      <aside className={styles.column} aria-label={project ? 'Project info' : 'Lead info'} data-state="collapsed" data-animate={animate || undefined}>
        <Tooltip label={`Expand ${noun} details`} side="right">
          <button type="button" className={styles.stripToggle} aria-label={`Expand ${noun} details`} aria-expanded={false} onClick={toggle}>
            <Icon name="left_panel_open" size={20} weight={300} />
          </button>
        </Tooltip>
        <div className={styles.divider} />
        <div className={styles.glyphs}>
          {blocks.filter((b) => b.section !== 'Custom fields' || customFields.length > 0).map((b) => (
            <Tooltip key={b.label} label={b.label} side="right">
              <button type="button" className={styles.glyph} aria-label={b.label} onClick={() => reveal(b.section)}>
                <Icon name={b.icon} size={24} weight={300} />
              </button>
            </Tooltip>
          ))}
        </div>
      </aside>
    )
  }

  const toggleLabel = expanded ? `Collapse ${noun} details` : `Expand ${noun} details`
  return (
    <aside className={styles.column} aria-label={project ? 'Project info' : 'Lead info'} data-state={expanded ? 'expanded' : 'collapsed'} data-animate={animate || undefined}>
      {/* Identity block (858:24788): name row · phone · email · address, 4 apart */}
      <div className={styles.identity}>
        <div className={styles.nameRow}>
          <p className={styles.name}>{lead.name}</p>
          <span className={styles.nameActions}>
            <Tooltip label={project ? 'Edit details' : 'Edit lead'} shortcut="edit">
              <button type="button" className={styles.iconBtn} aria-label={project ? 'Edit details' : 'Edit lead'} data-kb="edit" onClick={onEdit}>
                <Icon name="edit" size={20} weight={300} />
              </button>
            </Tooltip>
            {/* (REG-304) The column's own toggle beside the pencil — the panel glyph, ≥768 only. (REG-366) A phone
                does not fold the sections under this block any more: it opens them in a sheet from a named button
                under the identity, so the bare chevron whose destination nobody could guess is gone. */}
            {mobile ? null : (
              <Tooltip label={toggleLabel}>
                <button type="button" className={styles.iconBtn} aria-label={toggleLabel} aria-expanded={expanded} onClick={toggle}>
                  <Icon name="left_panel_close" size={20} weight={300} />
                </button>
              </Tooltip>
            )}
          </span>
        </div>
        <div className={styles.contact}>
          <div className={styles.contactRow}>
            {/* eight unbroken digits (REG-162) */}
            {touch && phoneDigits(lead.phone)
              ? <a className={`${styles.contactText} ${styles.callLink}`} href={`tel:+65${phoneDigits(lead.phone)}`} aria-label={`Call ${phoneLocal(lead.phone)}`}>{phoneLocal(lead.phone)}</a>
              : <span className={styles.contactText}>{phoneLocal(lead.phone)}</span>}
            <Tooltip label="Copy phone number">
              <button type="button" className={styles.iconBtn} data-size="16" aria-label="Copy phone number"
                      onClick={() => onCopy('phone', lead.phone)}>
                <Icon name="content_copy" size={16} weight={300} />
              </button>
            </Tooltip>
            <Tooltip label="Open WhatsApp">
              <button type="button" className={styles.iconBtn} data-size="16" aria-label="Open WhatsApp" onClick={onWhatsApp}>
                {/* WhatsApp Shape=Default Color=Grey, 14×14 inside the 16 slot (858:24788) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/figma-assets/whatsapp-grey.svg" width={14} height={14} alt="" className={styles.whatsapp} />
              </button>
            </Tooltip>
          </div>
          {lead.email ? (
            <div className={styles.contactRow}>
              {/* (pending modules S46C · H4 — 1.0's drawer: the email was a mailto: link on every screen) a desk has mail too, so the email writes
                  to the client at every width; Copy stays beside it. (The number keeps REG-746's rule: it dials on a touch screen, a mouse copies.) */}
              <a className={`${styles.contactText} ${styles.mailLink}`} href={`mailto:${lead.email}`} aria-label={`Email ${lead.email}`} data-testid="lead-email-link">{lead.email}</a>
              <Tooltip label="Copy email">
                <button type="button" className={styles.iconBtn} data-size="16" aria-label="Copy email"
                        onClick={() => onCopy('email', lead.email!)}>
                  <Icon name="content_copy" size={16} weight={300} />
                </button>
              </Tooltip>
            </div>
          ) : null}
          {lead.leadAddress ? (
            <div className={styles.contactRow}>
              <span className={styles.contactText}>{lead.leadAddress}</span>
              <Tooltip label="Get directions">
                <button type="button" className={styles.iconBtn} aria-label="Get directions" onClick={onDirections}>
                  <Icon name="directions" size={20} weight={300} />
                </button>
              </Tooltip>
            </div>
          ) : null}
        </div>
      </div>

      {/* (REG-366) On a phone the sections live in the details sheet below, never inline. */}
      {expanded && !mobile ? (<>
      <div className={styles.rule} />
      {sections}
      </>) : null}

      {/* (REG-366, user 2026-09-06) The phone's way into the record's details: a named secondary button under the identity block, opening the
          SAME sections in a bottom sheet (REG-353). (the calm UI build 2026-10-27 — W-013) "View details" — the page calls her a lead. */}
      {mobile ? (
        <>
          <div className={styles.viewInfo}>
            <Button variant="secondary" appearance="outlined" onPress={() => setInfoOpen(true)}>View details</Button>
          </div>
          <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title={project ? 'Project details' : 'Lead details'} bodyClassName={styles.infoSheet}>
            {sections}
          </Sheet>
        </>
      ) : null}
    </aside>
  )
}

/* ── Section: 20px head (title · optional link · chevron), body hidden while collapsed (858:25171) ───────────── */
function Section({ title, storeKey, link, children }: {
  title: string
  /** (the calm UI build 2026-10-27) the section's remembered fold and anchor when its title changed ("Members" keeps "Collaborators"'s) */
  storeKey?: string
  /** `kb` (REG-713): the key that presses the link — 'assign' for A on a lead */
  link?: { label: string; onClick: (anchor: HTMLElement) => void; kb?: string }
  children: ReactNode
}) {
  // Collapsed sections are remembered per browser, like the listing's table/kanban choice (lib/prefs.ts).
  const key = storeKey ?? title
  const [open, setOpen] = useFlagPref(`om.detail.section.${slug(key)}`, true)
  const blockIcon = [...BLOCKS, PROJECT_INFO].find((b) => b.section === key)?.icon
  const bodyId = useId()
  return (
    <section id={sectionId(key)} className={styles.section} aria-label={title}>
      <div className={styles.sectionHead}>
        {/* (REG-342, user 2026-09-04) The expanded block carries the same glyph its collapsed strip tile shows. */}
        {blockIcon ? <Icon name={blockIcon} size={20} weight={300} className={styles.sectionIcon} /> : null}
        <h2 className={styles.sectionTitle}>{title}</h2>
        {link ? (
          <button type="button" className={styles.headLink} data-kb={link.kb} onClick={(e) => link.onClick(e.currentTarget)}>{link.label}</button>
        ) : null}
        <Tooltip label={open ? 'Collapse' : 'Expand'}>
          <button type="button" className={styles.iconBtn} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
                  aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
            <Icon name={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={20} weight={300} />
          </button>
        </Tooltip>
      </div>
      {open ? <div id={bodyId} className={styles.sectionBody}>{children}</div> : null}
    </section>
  )
}

/* ── Key/value list: keys 120 fixed · values fill · column gap 12 (16 in Property info) · rows 20 tall, 16 apart ── */
function KVList({ gap = 12, children }: { gap?: 12 | 16; children: ReactNode }) {
  return <dl className={styles.kv} data-gap={gap}>{children}</dl>
}

function Row({ k, text, children, testId }: { k: string; text?: string; children?: ReactNode; /** (parity P-01) the project's own rows */ testId?: string }) {
  return (
    <>
      <dt className={styles.key}>{k}</dt>
      <dd className={styles.value} data-testid={testId}>{text != null ? <span className={styles.text}>{text}</span> : children}</dd>
    </>
  )
}

/** (the calm UI build 2026-10-27 — audit 2-03 · 3-32) A section's empty rows, as one quiet text link at its foot: "Add district, area size…". */
function AddLink({ label, onClick, testId }: { label: string; onClick: () => void; testId?: string }) {
  return <button type="button" className={styles.addLink} data-testid={testId} onClick={onClick}>{label}</button>
}

/** "Assign members ›" / "Add ›" — 14/600 primary + keyboard_arrow_right 20 Regular, 4 apart (CellDataGroup link).
 *  (REG-729) Its look is the house text link (info-column.module.css .link composes components/om/text-link.module.css). */
function LinkButton({ label, onClick, kb }: { label: string; onClick: (anchor: HTMLElement) => void; kb?: string }) {
  return (
    <button type="button" className={styles.link} data-kb={kb} onClick={(e) => onClick(e.currentTarget)}>
      {label}
      <Icon name="keyboard_arrow_right" size={20} weight={400} />
    </button>
  )
}
