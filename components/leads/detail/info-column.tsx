'use client'

import { useId, type ReactNode } from 'react'
import { useFlagPref } from '@/lib/prefs'
import type { Member } from '@/lib/db/schema'
import type { LeadRow } from '@/lib/leads/queries'
import { displayDate, groupDigits, money } from '@/lib/format'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './info-column.module.css'

/**
 * Lead Details › Overview — the lead-info column (858:24787, frame 155; collapsed / assigned states from
 * 858:25136, frame 156). Spec: design-source/context/lead-overview/02-left-column.txt.
 *
 * 360 wide, 24 padding, 1px surface-variant right rule. Flow (gap 24): identity block · rule · Collaborators ·
 * rule · Lead info · rule · Property info · rule · Other info. Every section is collapsible to its 20px head row.
 */
export type InfoColumnProps = {
  lead: LeadRow
  /** The studio's members — resolves the Owner row ("You" = the member with `isYou`). Falls back to `lead.assignees`. */
  team?: Member[]
  onEdit: () => void
  onAssign: (anchor: HTMLElement) => void
  onAssigneeMenu: (anchor: HTMLElement, member: Member) => void
  onCopy: (what: 'phone' | 'email', value: string) => void
  onWhatsApp: () => void
  onDirections: () => void
}

const DASH = '--'

export function InfoColumn({
  lead, team, onEdit, onAssign, onAssigneeMenu, onCopy, onWhatsApp, onDirections,
}: InfoColumnProps) {
  const assignees = lead.assignees
  // Owner: the mock (858:24806) shows "You" even before anyone is assigned — the signed-in member (isYou) owns the studio's leads.
  const youKnown = (team ?? []).some((m) => m.isYou) || assignees.some((m) => m.isYou)
  const owner = youKnown ? 'You' : assignees[0]?.name ?? DASH

  return (
    <aside className={styles.column} aria-label="Lead info">
      {/* Identity block (858:24788): name row · phone · email · address, 4 apart */}
      <div className={styles.identity}>
        <div className={styles.nameRow}>
          <p className={styles.name}>{lead.name}</p>
          <Tooltip label="Edit lead">
            <button type="button" className={styles.iconBtn} aria-label="Edit lead" onClick={onEdit}>
              <Icon name="edit" size={20} weight={300} />
            </button>
          </Tooltip>
        </div>
        <div className={styles.contact}>
          <div className={styles.contactRow}>
            {/* eight unbroken digits (REG-162) */}
            <span className={styles.contactText}>{lead.phone}</span>
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
              <span className={styles.contactText}>{lead.email}</span>
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

      <div className={styles.rule} />

      <Section title="Collaborators" link={assignees.length ? { label: 'Add', onClick: onAssign } : undefined}>
        <KVList>
          <Row k="Owner" text={owner} />
          <Row k="Assignees">
            {assignees.length ? (
              <div className={styles.assignees}>
                {assignees.map((m) => (
                  <div key={m.id} className={styles.assignee}>
                    <Avatar name={m.name} color={m.color} size={20} />
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
              <LinkButton label="Assign Member" onClick={onAssign} />
            )}
          </Row>
        </KVList>
      </Section>

      <div className={styles.rule} />

      <Section title="Lead info">
        <KVList>
          <Row k="Stage" text={lead.stage} />
          <Row k="Source" text={lead.source} />
          <Row k="Budget (S$)" text={money(lead.budgetMinor)} />
          <Row k="Created" text={displayDate(lead.createdAt)} />
        </KVList>
      </Section>

      <div className={styles.rule} />

      <Section title="Property info">
        <KVList gap={16}>
          <Row k="Type" text={lead.propertyType} />
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
    </aside>
  )
}

/* ── Section: 20px head (title · optional link · chevron), body hidden while collapsed (858:25171) ───────────── */
function Section({ title, link, children }: {
  title: string
  link?: { label: string; onClick: (anchor: HTMLElement) => void }
  children: ReactNode
}) {
  // Collapsed sections are remembered per browser, like the listing's table/kanban choice (lib/prefs.ts).
  const [open, setOpen] = useFlagPref(`om.detail.section.${title.toLowerCase().replace(/\s+/g, '-')}`, true)
  const bodyId = useId()
  return (
    <section className={styles.section} aria-label={title}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {link ? (
          <button type="button" className={styles.headLink} onClick={(e) => link.onClick(e.currentTarget)}>{link.label}</button>
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

function Row({ k, text, children }: { k: string; text?: string; children?: ReactNode }) {
  return (
    <>
      <dt className={styles.key}>{k}</dt>
      <dd className={styles.value}>{text != null ? <span className={styles.text}>{text}</span> : children}</dd>
    </>
  )
}

/** "Assign Member ›" / "Add ›" — 14/600 primary + keyboard_arrow_right 20 Regular, 4 apart (CellDataGroup link). */
function LinkButton({ label, onClick }: { label: string; onClick: (anchor: HTMLElement) => void }) {
  return (
    <button type="button" className={styles.link} onClick={(e) => onClick(e.currentTarget)}>
      {label}
      <Icon name="keyboard_arrow_right" size={20} weight={400} />
    </button>
  )
}
