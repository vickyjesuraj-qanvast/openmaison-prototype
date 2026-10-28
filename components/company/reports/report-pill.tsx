'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ScopePill } from '@/components/om/scope-pill'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { GhostTextButton, Slot } from '@/components/shell/ghost-kit'
import styles from './report-pill.module.css'

export type PickOption = { value: string; label: string; help?: string }

/**
 * (the calm UI build 2026-10-27 — audit 5-19 · 5-20, theme T-10 "one look per control") What a Company › Reports tab reads — which report and
 * which period — is one control everywhere: the house scope pill, as Plan › Usage's "Period: This month ▾" already was. It was three looks
 * (range chips under report chips that looked the same, a labelled select on Finance, the pill on Usage). The menu is the house PortalMenu
 * (a sheet on a phone) of `menuitemradio` rows — a report's row carries its one-line help as its second line. `tip` is what the period
 * counts by (the old "Filtering on … · n in range" line under the bar), said in the house tooltip and kept as `data-tip` for the probes.
 * The values and the address (`?report=` · `?range=` · `?period=`) are the callers' own, unchanged.
 */
export function PickPill({ name, options, value, onChange, testId, tip, scoped = false, sheetTitle, wide = false }: {
  /** "Report" · "Period" — the pill reads "{name}: {the current label}" */
  name: string
  options: readonly PickOption[]
  value: string
  onChange: (value: string) => void
  testId?: string
  /** what the period counts by — the house tooltip; its `testId` is the old caption's (the probes read its words from `data-tip`) */
  tip?: { text: string; testId?: string }
  /** off the report's default (the applied dot, REG-295) */
  scoped?: boolean
  sheetTitle?: string
  /** rows with a help line take the detail width (320, REG-728) */
  wide?: boolean
}) {
  const anchor = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value) ?? options[0]
  const pick = (v: string) => { setOpen(false); if (v !== value) onChange(v) }
  const pill = <ScopePill ref={anchor} label={`${name}: ${current?.label ?? ''}`} open={open} scoped={scoped} onClick={() => setOpen((o) => !o)} />
  return (
    <span className={styles.wrap} data-testid={testId}>
      {tip ? <Tooltip label={tip.text} disabled={open}><span className={styles.tip} data-testid={tip.testId} data-tip={tip.text}>{pill}</span></Tooltip> : pill}
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="left" width={wide ? MENU_WIDTH.detail : MENU_WIDTH.standard} role="menu" sheetTitle={sheetTitle ?? name}>
        {options.map((o) => (
          <DropdownItem key={o.value} role="menuitemradio" checked={o.value === value} selected={o.help ? o.value === value : undefined} help={o.help} onSelect={() => pick(o.value)}>{o.label}</DropdownItem>
        ))}
      </PortalMenu>
    </span>
  )
}

/**
 * (the calm UI build 2026-10-27 — theme T-05 "explanations off the page") A report's "how these are counted" paragraph, folded behind one text
 * button: the words stay one press away (Enter / Space, a finger, a mouse), and the page no longer ends on four lines of method every visit.
 */
export function HowCounted({ children, label = 'How these are counted', testId, className }: { children: ReactNode; label?: string; testId?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={className ? `${styles.how} ${className}` : styles.how} data-testid={testId} data-open={open || undefined}>
      <Button appearance="text" aria-expanded={open} aria-controls={id} onPress={() => setOpen((o) => !o)}
              iconEnd={<span className={styles.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}>{label}</Button>
      {open ? <p id={id} className={styles.howText}>{children}</p> : null}
    </div>
  )
}

/** (REG-708) A PickPill's ghost: the house pill's 36 box as wide as its words read ("Period: Last 90 days ▾" — the label at 14/600, the pill's
    16 + 12 padding, the 8 gap and the 20 chevron, its 1px stroke). */
export function GhostPill({ name, value }: { name: string; value: string }) {
  return <span className={styles.wrap} aria-hidden><Slot kind="btn" w={pillWidth(`${name}: ${value}`)} /></span>
}
export const pillWidth = (label: string) => Math.round(label.length * 6.85) + 58   // measured: "Report: Sales" 148 · "Period: Last 90 days" 196 · "Report: Response time" 211
/** (REG-708) HowCounted's ghost: its closed text button, in its own words. */
export function GhostHowCounted({ label = 'How these are counted' }: { label?: string }) {
  return <div className={styles.how} aria-hidden><GhostTextButton label={label} iconEnd /></div>
}

/** (REG-708) The house chart's "Show the numbers" in a ghost — the chart draws it as the DS small text button (32), not the ghost kit's 36. */
export function GhostShowNumbers() {
  return <GhostTextButton label="Show the numbers" className={styles.ghostSm} />
}

/** (the calm UI build 2026-10-27 — T-14 "long pages fold") A fold's text button under a list: "+ 9 sources with no wins yet", and back. */
export function FoldButton({ open, more, less, onToggle, testId }: { open: boolean; more: string; less: string; onToggle: () => void; testId?: string }) {
  return (
    <span className={styles.fold}>
      <Button appearance="text" aria-expanded={open} onPress={onToggle} data-testid={testId}
              iconEnd={<span className={styles.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}>{open ? less : more}</Button>
    </span>
  )
}
