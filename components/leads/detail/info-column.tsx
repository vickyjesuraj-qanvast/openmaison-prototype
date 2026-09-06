'use client'

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Sheet } from '@/components/om/sheet'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
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
]
const slug = (title: string) => title.toLowerCase().replace(/\s+/g, '-')
const sectionId = (title: string) => `info-section-${slug(title)}`

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
      <aside className={styles.column} aria-label="Lead info" data-state="collapsed" data-animate={animate || undefined}>
        <Tooltip label="Expand lead details" side="right">
          <button type="button" className={styles.stripToggle} aria-label="Expand lead details" aria-expanded={false} onClick={toggle}>
            <Icon name="left_panel_open" size={20} weight={300} />
          </button>
        </Tooltip>
        <div className={styles.divider} />
        <div className={styles.glyphs}>
          {BLOCKS.map((b) => (
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

  const toggleLabel = expanded ? 'Collapse lead details' : 'Expand lead details'
  return (
    <aside className={styles.column} aria-label="Lead info" data-state={expanded ? 'expanded' : 'collapsed'} data-animate={animate || undefined}>
      {/* Identity block (858:24788): name row · phone · email · address, 4 apart */}
      <div className={styles.identity}>
        <div className={styles.nameRow}>
          <p className={styles.name}>{lead.name}</p>
          <span className={styles.nameActions}>
            <Tooltip label="Edit lead">
              <button type="button" className={styles.iconBtn} aria-label="Edit lead" onClick={onEdit}>
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

      {/* (REG-366) On a phone the sections live in the "View Client Info" sheet below, never inline. */}
      {expanded && !mobile ? (<>
      <div className={styles.rule} />

      <Section title="Collaborators" link={assignees.length ? { label: 'Add', onClick: onAssign } : undefined}>
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
      </>) : null}

      {/* (REG-366, user 2026-09-06) The phone's way into the lead's details: a named secondary button under the
          identity block, opening the SAME sections in a bottom sheet (REG-353). */}
      {mobile ? (
        <>
          <div className={styles.viewInfo}>
            <Button variant="secondary" appearance="outlined" onPress={() => setInfoOpen(true)}>View Client Info</Button>
          </div>
          <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title="Client Info" bodyClassName={styles.infoSheet}>
            <Section title="Collaborators" link={assignees.length ? { label: 'Add', onClick: onAssign } : undefined}>
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
                <Row k="Property address" text={lead.propertyAddress ?? DASH} />
              </KVList>
            </Section>
            <div className={styles.rule} />
            <Section title="Other info">
              <KVList>
                <Row k="Remarks" text={lead.notes ?? DASH} />
              </KVList>
            </Section>
          </Sheet>
        </>
      ) : null}
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
  const [open, setOpen] = useFlagPref(`om.detail.section.${slug(title)}`, true)
  const blockIcon = BLOCKS.find((b) => b.section === title)?.icon
  const bodyId = useId()
  return (
    <section id={sectionId(title)} className={styles.section} aria-label={title}>
      <div className={styles.sectionHead}>
        {/* (REG-342, user 2026-09-04) The expanded block carries the same glyph its collapsed strip tile shows. */}
        {blockIcon ? <Icon name={blockIcon} size={20} weight={300} className={styles.sectionIcon} /> : null}
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
