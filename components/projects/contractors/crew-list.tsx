'use client'

import { useRef, useState } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { dayMonth, dayOf } from '@/lib/projects/schedule-model'
import { CHECK_RULE, CREW_STATUS_LABEL, CREW_STATUSES, shortVendor, windowWords, type CrewJob, type CrewStatus } from '@/lib/projects/contractors-model'
import styles from './crew.module.css'

export type CrewAct = { kind: 'status'; status: CrewStatus } | { kind: 'check'; on: boolean } | { kind: 'edit' } | { kind: 'remove' } | { kind: 'message' }
const TONE: Record<CrewStatus, 'default' | 'blue' | 'green'> = { planned: 'default', on_site: 'blue', done: 'green' }

/**
 * (S45B · H-UHD-2 — 1.0's project Contractors card, its rows) The contractors on a project, one row each: the contractor (and the studio's
 * code), what they are there for and when — the milestone's dates, or their own — "running late" when the window passed with the work not
 * done, Leader checked with who and when, the team's note; the status as the house chip; a ⋮ with Planned · On site · Done, Leader checked
 * (Owners, Admins and Managers — said in the row for anyone else), Edit, Message on WhatsApp (opened on the press) and Take off the project.
 */
export function CrewList({ jobs, mayChange, mayCheck, phoneOf, onAct, showMilestone = true, showTrade = true }: {
  jobs: CrewJob[]
  mayChange: boolean
  mayCheck: boolean
  phoneOf: (vendorId: string) => string | null
  onAct: (j: CrewJob, a: CrewAct) => void
  /** The milestone panel already names its milestone. */
  showMilestone?: boolean
  /** The Contractors panel groups by trade — its heading names it. */
  showTrade?: boolean
}) {
  return (
    <div className={styles.list} role="list" data-testid="crew-list">
      {jobs.map((j) => <CrewRowView key={j.id} j={j} mayChange={mayChange} mayCheck={mayCheck} phone={phoneOf(j.vendorId)} onAct={(a) => onAct(j, a)} showMilestone={showMilestone} showTrade={showTrade} />)}
    </div>
  )
}

function CrewRowView({ j, mayChange, mayCheck, phone, onAct, showMilestone, showTrade }: { j: CrewJob; mayChange: boolean; mayCheck: boolean; phone: string | null; onAct: (a: CrewAct) => void; showMilestone: boolean; showTrade: boolean }) {
  const name = shortVendor(j.vendorName)
  const where = [showTrade ? j.trade : null, showMilestone && j.milestone ? j.milestone.title : !j.milestone && j.milestoneId ? 'its milestone was deleted' : null, windowWords(j)].filter(Boolean).join(' · ')
  return (
    <div className={styles.row} role="listitem" data-testid="crew-row" data-crew={j.id} data-state={j.state}>
      <span className={styles.mark} aria-hidden><Icon name="handyman" size={20} weight={300} /></span>
      <span className={styles.text}>
        <span className={styles.name}><span className={styles.nameText}>{name}</span></span>
        <span className={styles.line} data-tone={j.late ? 'warn' : undefined}>{where}{j.late ? ' · running late' : ''}</span>
        {/* (the calm UI build 2026-10-27, 3-15 · W-236) "Checked by Hui Min" (was Leader checked by) */}
        {j.checkedAt ? <span className={styles.checked} data-testid="crew-checked"><Icon name="verified" size={16} weight={300} className={styles.checkIcon} />{`${j.checkedByName ? `Checked by ${j.checkedByName}` : 'Checked'} · ${dayMonth(dayOf(new Date(j.checkedAt)))}`}</span> : null}
        {j.note ? <span className={styles.quote}>{`“${j.note}”`}</span> : null}
      </span>
      <span className={styles.chip}><MetaChip color={TONE[j.state]}>{CREW_STATUS_LABEL[j.state]}</MetaChip></span>
      <CrewMenu j={j} name={name} mayChange={mayChange} mayCheck={mayCheck} phone={phone} onAct={onAct} />
    </div>
  )
}

function CrewMenu({ j, name, mayChange, mayCheck, phone, onAct }: { j: CrewJob; name: string; mayChange: boolean; mayCheck: boolean; phone: string | null; onAct: (a: CrewAct) => void }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  if (!mayChange && !phone) return <span />
  const pick = (a: CrewAct) => () => { setOpen(false); onAct(a) }
  const fromMilestone = j.milestone?.status === 'done'
  return (
    <span ref={anchor}>
      <Tooltip label="More for this contractor" disabled={open}><IconButton icon="more_vert" label={`More for ${name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="crew-menu" /></Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={name}>
        {mayChange ? CREW_STATUSES.map((s) => (
          <DropdownItem key={s} role="menuitemradio" checked={j.state === s} disabled={fromMilestone && s !== 'done'} help={fromMilestone && s !== 'done' ? `${j.milestone?.title} is done` : undefined}
                        onSelect={j.state === s ? () => setOpen(false) : pick({ kind: 'status', status: s })}>{CREW_STATUS_LABEL[s]}</DropdownItem>
        )) : null}
        {mayChange ? <DropdownDivider /> : null}
        {mayChange ? (
          <DropdownItem disabled={!mayCheck} help={mayCheck ? (j.checkedAt ? 'Take the sign-off off' : 'Sign it off — with your name and today') : CHECK_RULE} onSelect={pick({ kind: 'check', on: !j.checkedAt })}>
            {j.checkedAt ? 'Take the check off' : 'Leader checked'}
          </DropdownItem>
        ) : null}
        {mayChange ? <DropdownItem help="Its milestone, its dates, the note" onSelect={pick({ kind: 'edit' })}>Edit</DropdownItem> : null}
        {phone ? <DropdownItem help="Opens WhatsApp with the project and the dates" onSelect={pick({ kind: 'message' })}>Message on WhatsApp</DropdownItem> : null}
        {mayChange ? <DropdownItem tone="danger" onSelect={pick({ kind: 'remove' })}>Take off the project</DropdownItem> : null}
      </PortalMenu>
    </span>
  )
}
