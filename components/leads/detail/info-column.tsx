'use client'

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { displayCustomValue, type CustomFieldDef, type CustomValues } from '@/lib/leads/custom-fields-model'
import { Button } from '@/components/ds'
import { Sheet } from '@/components/om/sheet'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { MOBILE, TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import type { Member } from '@/lib/db/schema'
import type { LeadRow } from '@/lib/leads/queries'
import { displayDate, groupDigits, maskNric, money, phoneDigits, phoneLocal } from '@/lib/format'
import { runsStudio } from '@/lib/leads/assign-policy'
import { isCommercialType } from '@/lib/leads/enums'   // (pending modules S05)
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
  { icon: 'people_alt', label: 'Collaborators', section: 'Collaborators' },
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
}

/** (parity P-01) A project's own facts, as words — the page formats them. (simplify S-01) …and its documents: the signed quote and the contract
    (Key documents left the Overview for these rows), a direct project's other quotes and contracts — each opening itself. */
export type ProjectInfo = { number: string; stage: string; projectType: string | null; scope: string | null; start: Date | null; end: Date | null
  documents?: ProjectInfoDocument[] }
/** (simplify S-01) One Project info row for a document: its label, its words ("OM-10005", "Signed 21 Aug ’26"), and where it opens. */
export type ProjectInfoDocument = { key: string; label: string; value: string | null; href?: string; testId?: string }

const DASH = '--'

export function InfoColumn({
  lead, team = [], onEdit, onAssign, onAssigneeMenu, onCopy, onWhatsApp, onDirections, portal = null, customFields = [], customValues = {}, project, teamChatHref = null,
}: InfoColumnProps) {
  /* (parity P-01) the record the column speaks of — its labels say "project" on a project's page */
  const noun = project ? 'project' : 'lead'
  const blocks = blocksFor(!!project)
  /* (pending modules S26) the team's own conversation — one link on the Collaborators, while the record has members (the Portal row's door,
     its twin for the team: the client never sees it) */
  const teamChatRow = teamChatHref && lead.assignees.length ? (
    <Row k="Team chat">
      <span className={styles.text}>Only the team reads it{' · '}<Link className={styles.headLink} href={teamChatHref} data-testid="info-team-chat">Messages</Link></span>
    </Row>
  ) : null
  /* (parity P-01 · A-01) the project's own section, in Lead info's place — on the desktop column and the phone's sheet alike */
  const projectSection = project ? (
    <Section title="Project info">
      <KVList>
        <Row k="Number" text={project.number} testId="info-project-number" />
        <Row k="Stage" text={project.stage} testId="info-project-stage" />
        <Row k="Project type" text={project.projectType ?? DASH} testId="info-project-type" />
        <Row k="Scope" text={project.scope ?? DASH} testId="info-project-scope" />
        <Row k="Start date" text={project.start ? displayDate(project.start) : DASH} testId="info-project-start" />
        <Row k="Target end" text={project.end ? displayDate(project.end) : DASH} testId="info-project-end" />
        {(project.documents ?? []).map((doc) => (
          <Row key={doc.key} k={doc.label} testId={doc.testId}>
            {doc.href && doc.value ? <Link href={doc.href} className={`${textLink.link} ${styles.docLink}`}>{doc.value} <Icon name="arrow_outward" size={16} /></Link> : <span className={styles.text}>{doc.value ?? DASH}</span>}
          </Row>
        ))}
      </KVList>
    </Section>
  ) : null
  /* (REG-612) The Custom fields section — after Other info, on the desktop column and the phone's sheet alike. */
  const customSection = customFields.length ? (
    <>
      <div className={styles.rule} />
      <Section title="Custom fields">
        <KVList>
          {customFields.map((f) => <Row key={f.id} k={f.label} text={displayCustomValue(f, customValues[f.id])} />)}
        </KVList>
      </Section>
    </>
  ) : null
  const assignees = lead.assignees
  /* (UX audit 2026-09-30, L7 — supersedes the mock 858:24806's standing "You") The Owner is the lead's first assigned member — "You" only
     when that is the signed-in member — and "--" until someone is assigned, the owner the New gate asks for ("Assign a member first").
     It used to read "You" on every lead, beside Members showing only Sarah. */
  const first = assignees[0]
  const owner = first ? (first.isYou ? 'You' : first.name) : DASH
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
    <Row k="Second client">
      <span className={styles.text} data-testid="lead-second-client">
        {lead.client2Name}{lead.client2Phone ? <>{' · '}<span className={styles.keep}>{phoneLocal(lead.client2Phone)}</span></> : ''}
        {lead.client2Phone ? <>{' '}<Tooltip label="Copy their number"><button type="button" className={styles.iconBtn} data-size="16" aria-label={`Copy ${lead.client2Name}’s number`} onClick={() => onCopy('phone', lead.client2Phone!)}><Icon name="content_copy" size={16} weight={300} /></button></Tooltip></> : null}
      </span>
    </Row>
  ) : null

  /* (REG-304) Whole-column state — see the file comment. */
  const mobile = useMediaQuery(MOBILE)
  const [infoOpen, setInfoOpen] = useState(false)   // (REG-366) the phone's "View Client Info" sheet
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

      {/* (REG-366) On a phone the sections live in the "View Client Info" sheet below, never inline. */}
      {expanded && !mobile ? (<>
      <div className={styles.rule} />

      <Section title="Collaborators" link={assignees.length ? { label: 'Add', onClick: onAssign, kb: 'assign' } : undefined}>
        <KVList>
          <Row k="Owner" text={owner} />
          <Row k="Members">
            {assignees.length ? (
              <div className={styles.assignees}>
                {assignees.map((m) => (
                  <div key={m.id} className={styles.assignee}>
                    <Avatar name={m.name} color={m.color} size={20} tooltip={false} />
                    <span className={styles.assigneeName}>{m.name}</span>
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
              <LinkButton label="Assign Member" onClick={onAssign} kb="assign" />
            )}
          </Row>
          {teamChatRow}
        </KVList>
      </Section>

      <div className={styles.rule} />

      {projectSection ?? (
      <Section title="Lead info">
        <KVList>
          <Row k="Stage" text={lead.stage} />
          <Row k="Source" text={lead.source} />
          <Row k="Budget (S$)" text={lead.budgetMinor > 0 ? money(lead.budgetMinor) : DASH} />   {/* (UX audit 2026-09-30, L8) unknown = "--" */}
          <Row k="Created" text={displayDate(lead.createdAt)} />
          {/* (pending modules S05 — testers' L-3) a commercial client's company and UEN, in the NRIC's place */}
          {commercial ? <><Row k="Company" text={lead.companyName ?? DASH} testId="lead-company" /><Row k="UEN" text={lead.companyUen ?? DASH} /></> : null}
          {/* (REG-607, parity Q-35) 1.0's client IC and customer reference, printed on the quotes. */}
          {commercial && !lead.icNumber ? null : <Row k="NRIC / FIN">
            {lead.icNumber ? (
              <span className={styles.text} data-testid="lead-nric">
                {nricShown ? lead.icNumber : maskNric(lead.icNumber)}
                {mayShowNric && !nricShown ? <>{' '}<button type="button" className={styles.headLink} aria-label="Show NRIC / FIN" onClick={() => setNricShownFor(lead.id)}>Show</button></> : null}
              </span>
            ) : <span className={styles.text}>{DASH}</span>}
          </Row>}
          <Row k="Customer ID" text={lead.customerId ?? DASH} />
          {secondRow}
          {/* (REG-609, parity Q-22) Invite to Portal leaves a record — the link's stamp reads back here. */}
          {/* (Projects r4a) …and the access's state: opened (last), invited, withdrawn — the Client access panel's words */}
          {/* (parity map, UC-064) …and, invited, the door to the lead's own conversation — the client writes from their page before Won, the
              studio answers in Messages (the smallest door: one link on the row that already says they're on the portal) */}
          <Row k="Portal">
            <span className={styles.text}>
              {portal?.withdrawnAt ? `Withdrawn ${displayDate(portal.withdrawnAt)}` : portal?.lastOpenedAt ? `Opened ${displayDate(portal.lastOpenedAt)}` : portal?.invitedAt ? `Invited ${displayDate(portal.invitedAt)}` : DASH}
              {portal?.invitedAt && !portal.withdrawnAt ? <>{' · '}<Link className={styles.headLink} href={`/chat?open=${encodeURIComponent(`lead:${lead.id}`)}&from=${encodeURIComponent(`/leads/${lead.id}`)}`} data-testid="lead-portal-messages">Client messages</Link></> : null}   {/* (S42 audit C-23, call C·5) the client's conversation — the Team chat row's "Messages" is the team's */}
            </span>
          </Row>
        </KVList>
      </Section>
      )}

      <div className={styles.rule} />

      <Section title="Property info">
        <KVList gap={16}>
          <Row k="Type" text={lead.propertyType} />
          <Row k="District" text={lead.area ?? DASH} />   {/* (REG-607, parity Q-12) */}
          <Row k="Condition" text={lead.condition ?? DASH} />
          <Row k="Style" text={lead.style ?? DASH} />
          <Row k="Area size (sq ft)" text={lead.areaSqft != null ? groupDigits(String(lead.areaSqft)) : DASH} />
          <Row k="Key collection" text={lead.keyCollection ?? DASH} />
          {/* An empty value reads "--" like Area size and Key collection above — no per-row Add. The header's Edit
              opens the whole form, so a user fills everything in one pass instead of one field at a time
              (user 2026-08-31). */}
          <Row k="Property address" text={lead.propertyAddress ?? DASH} />
        </KVList>
      </Section>

      <div className={styles.rule} />

      <Section title="Other info">
        <KVList>
          {/* "Remarks" (user 2026-08-31) — the mock types "Notes", which collided with the Notes tab, a different
              record entirely. Inert text per 858:24857. */}
          <Row k="Remarks" text={lead.notes ?? DASH} />
        </KVList>
      </Section>
      {customSection}
      </>) : null}

      {/* (REG-366, user 2026-09-06) The phone's way into the lead's details: a named secondary button under the
          identity block, opening the SAME sections in a bottom sheet (REG-353). */}
      {mobile ? (
        <>
          <div className={styles.viewInfo}>
            <Button variant="secondary" appearance="outlined" onPress={() => setInfoOpen(true)}>View Client Info</Button>
          </div>
          <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title="Client Info" bodyClassName={styles.infoSheet}>
            <Section title="Collaborators" link={assignees.length ? { label: 'Add', onClick: onAssign, kb: 'assign' } : undefined}>
              <KVList>
                <Row k="Owner" text={owner} />
                <Row k="Members">
                  {assignees.length ? (
                    <div className={styles.assignees}>
                      {assignees.map((m) => (
                        <div key={m.id} className={styles.assignee}>
                          <Avatar name={m.name} color={m.color} size={20} tooltip={false} />
                          <span className={styles.assigneeName}>{m.name}</span>
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
                    <LinkButton label="Assign Member" onClick={onAssign} kb="assign" />
                  )}
                </Row>
                {teamChatRow}
              </KVList>
            </Section>
            <div className={styles.rule} />
            {projectSection ?? (
            <Section title="Lead info">
              <KVList>
                <Row k="Stage" text={lead.stage} />
                <Row k="Source" text={lead.source} />
                <Row k="Budget (S$)" text={lead.budgetMinor > 0 ? money(lead.budgetMinor) : DASH} />   {/* (UX audit 2026-09-30, L8) unknown = "--" */}
                <Row k="Created" text={displayDate(lead.createdAt)} />
                {commercial ? <><Row k="Company" text={lead.companyName ?? DASH} /><Row k="UEN" text={lead.companyUen ?? DASH} /></> : null}   {/* (pending modules S05) */}
                {secondRow}
              </KVList>
            </Section>
            )}
            <div className={styles.rule} />
            <Section title="Property info">
              <KVList gap={16}>
                <Row k="Type" text={lead.propertyType} />
          <Row k="District" text={lead.area ?? DASH} />   {/* (REG-607, parity Q-12) */}
                <Row k="Condition" text={lead.condition ?? DASH} />
                <Row k="Style" text={lead.style ?? DASH} />
                <Row k="Area size (sq ft)" text={lead.areaSqft != null ? groupDigits(String(lead.areaSqft)) : DASH} />
                <Row k="Key collection" text={lead.keyCollection ?? DASH} />
                <Row k="Property address" text={lead.propertyAddress ?? DASH} />
              </KVList>
            </Section>
            <div className={styles.rule} />
            <Section title="Other info">
              <KVList>
                <Row k="Remarks" text={lead.notes ?? DASH} />
              </KVList>
            </Section>
            {customSection}
          </Sheet>
        </>
      ) : null}
    </aside>
  )
}

/* ── Section: 20px head (title · optional link · chevron), body hidden while collapsed (858:25171) ───────────── */
function Section({ title, link, children }: {
  title: string
  /** `kb` (REG-713): the key that presses the link — 'assign' for A on a lead */
  link?: { label: string; onClick: (anchor: HTMLElement) => void; kb?: string }
  children: ReactNode
}) {
  // Collapsed sections are remembered per browser, like the listing's table/kanban choice (lib/prefs.ts).
  const [open, setOpen] = useFlagPref(`om.detail.section.${slug(title)}`, true)
  const blockIcon = [...BLOCKS, PROJECT_INFO].find((b) => b.section === title)?.icon
  const bodyId = useId()
  return (
    <section id={sectionId(title)} className={styles.section} aria-label={title}>
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

/** "Assign Member ›" / "Add ›" — 14/600 primary + keyboard_arrow_right 20 Regular, 4 apart (CellDataGroup link).
 *  (REG-729) Its look is the house text link (info-column.module.css .link composes components/om/text-link.module.css). */
function LinkButton({ label, onClick, kb }: { label: string; onClick: (anchor: HTMLElement) => void; kb?: string }) {
  return (
    <button type="button" className={styles.link} data-kb={kb} onClick={(e) => onClick(e.currentTarget)}>
      {label}
      <Icon name="keyboard_arrow_right" size={20} weight={400} />
    </button>
  )
}
