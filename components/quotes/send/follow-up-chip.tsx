'use client'

import { useRef, useState } from 'react'
import { ScopePill } from '@/components/om/scope-pill'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { startOfDay } from '@/lib/format'
import styles from './quote-send.module.css'

/** (UX audit Q11) How long after the send the follow-up falls — 0 = none. Three days is Maison AI's "check in on day 3". */
export const FOLLOW_UPS: { days: number; label: string }[] = [
  { days: 1, label: '1 day' }, { days: 3, label: '3 days' }, { days: 7, label: '1 week' }, { days: 14, label: '2 weeks' }, { days: 0, label: 'No follow-up' },
]
export const DEFAULT_FOLLOW_UP = 3
const DAY = 86_400_000
/** The follow-up's day: `days` whole days after today (a due date is a day, REG-470). */
export const followUpDate = (days: number, now: number) => new Date(startOfDay(new Date(now)) + days * DAY)

/**
 * (UX audit Q11) "Follow up in [3 days ▾]" in a send dialog: the house scope pill with the choices in a portal menu. The send sets the
 * quote's Due to that day, which raises (or moves) its follow-up task (REG-470) — "No follow-up" leaves Due as it is.
 */
export function FollowUpChip({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLButtonElement>(null)
  const pick = FOLLOW_UPS.find((f) => f.days === days) ?? FOLLOW_UPS[1]!
  return (
    <div className={styles.followUp} data-testid="follow-up-chip">
      <ScopePill ref={anchor} icon="event" label={pick.days ? `Follow up in ${pick.label}` : 'No follow-up'} open={open} onClick={() => setOpen((o) => !o)} />
      <span className={styles.followHelp}>{pick.days ? 'Sets the quote’s Due date and adds a follow-up task for you' : 'The quote’s Due date stays as it is'}</span>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle="Follow up in">
        {FOLLOW_UPS.map((f) => (
          <DropdownItem key={f.days} role="menuitemradio" checked={f.days === pick.days} onSelect={() => { setOpen(false); onChange(f.days) }}>{f.label}</DropdownItem>
        ))}
      </PortalMenu>
    </div>
  )
}
