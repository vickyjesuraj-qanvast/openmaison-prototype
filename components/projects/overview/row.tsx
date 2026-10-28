'use client'

import Link from 'next/link'
import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import styles from '../project-overview.module.css'

export type RowButton = { label: string; onPress: (el: HTMLElement) => void; busy?: boolean; testId?: string; kb?: string
  /** a channel's glyph before the words (Call · WhatsApp · Directions — his note: icons only where the verb is a channel) */
  icon?: ReactNode
  /** (REG-711) the key layer's ↵ presses this button on the cursor's row (`data-kb-open`) */
  kbOpen?: boolean }

/**
 * A row on the card grammar of LEAD STAGES (REG-614): icon 20 · name · caption · meta · chevron, 36 tall; a link, a button or plain — the
 * project Overview's one row (it was `Row` inside project-overview.tsx; the Overview's cards share it now).
 *
 * (simplify S-01) Two additions for Needs you: `two` sets the caption under the name (the MY TASKS row's two lines), and a row may carry its
 * buttons AND open its record — the words are then the link and the buttons sit beside them (`data-split`), never one inside the other.
 */
export function Row({ icon, iconFill, state, name, caption, meta, href, onPress, action, actions, testId, external, two, tone, wrap, toggle, glyph, after, menu, attrs: more, className }: {
  icon: string; iconFill?: boolean; state?: 'done' | 'current' | 'future' | 'alert'; name: ReactNode; caption?: ReactNode; meta?: ReactNode
  href?: string; onPress?: (el: HTMLElement) => void
  /** One text button at the row's end (Getting started's, the hold's Resume) — or several (`actions`). */
  action?: RowButton | null; actions?: RowButton[]
  testId?: string; external?: boolean
  /** (simplify S-01) the caption under the name, the row growing to hold both */
  two?: boolean
  /** (simplify S-20) an approval waiting: the primary on the icon */
  tone?: 'approve'
  /** a long row wraps its meta under the name (stages-card's `data-wrap`) */
  wrap?: boolean
  /** (simplify S-01) a row that folds or unfolds in place (Show n more · Payment stages ▾): its own chevron says so — no trailing arrow, which
      means "goes somewhere" */
  toggle?: boolean
  /** (the Dashboard redesigned, 2026-10-26) drawn in place of the 20px icon — the inbox's glyph in its tinted square */
  glyph?: ReactNode
  /** after the buttons, on the row's line — the inbox row's ⋮ */
  after?: ReactNode
  /** (the calm UI build 2026-10-27, T-02) the row's ⋮ (`RowMore`) INSIDE its actions, so the one verb and its ⋮ wrap together on a narrow row */
  menu?: ReactNode
  /** the row's own marks (`data-inbox-row`, the key layer's `data-kb-row` / `data-kb-id`) */
  attrs?: Record<string, string | undefined>
  className?: string
}) {
  const buttons = actions ?? (action ? [action] : [])
  const label = two ? (
    <span className={styles.label}>
      <span className={styles.two}><span className={styles.name}>{name}</span>{caption ? <span className={styles.till}>{caption}</span> : null}</span>
      {meta !== undefined && meta !== null ? <span className={styles.meta}>{meta}</span> : null}
    </span>
  ) : (
    <span className={styles.label}>
      <span className={styles.nameGroup}><span className={styles.name}>{name}</span>{caption ? <span className={styles.till}>{caption}</span> : null}</span>
      {meta !== undefined && meta !== null ? <span className={styles.meta}>{meta}</span> : null}
    </span>
  )
  const lead = glyph ?? <Icon name={icon} size={20} weight={300} fill={iconFill} className={styles.icon} />
  const btns = buttons.length || menu ? (
    <span className={styles.rowActions} data-row-actions="">
      {buttons.map((b) => (
        <span key={b.label} className={styles.rowAction}>
          <Button appearance="text" iconStart={b.icon} isDisabled={b.busy} onPress={(e) => b.onPress(e.target as HTMLElement)} data-testid={b.testId} data-kb={b.kb} data-kb-open={b.kbOpen ? '' : undefined}>{b.label}</Button>
        </span>
      ))}
      {menu}
    </span>
  ) : null
  const st = state === 'alert' ? undefined : state
  const attrs = { 'data-state': st, 'data-alert': state === 'alert' || undefined, 'data-approve': tone === 'approve' || undefined, 'data-two': two || undefined, 'data-wrap': wrap || undefined, 'data-testid': testId, ...more }
  const rowClass = className ? `${styles.row} ${className}` : styles.row
  /* (simplify S-01) the words open the record, the buttons act */
  if ((buttons.length || menu) && (href || onPress)) {
    const main = href
      ? (external ? <a href={href} className={styles.rowMain}>{lead}{label}</a> : <Link href={href} className={styles.rowMain}>{lead}{label}</Link>)
      : <button type="button" className={styles.rowMain} onClick={(e) => onPress!(e.currentTarget)}>{lead}{label}</button>
    return <div className={rowClass} data-split="" {...attrs}>{main}{btns}{after}</div>
  }
  const inner = <>{lead}{label}{btns ?? ((href || onPress) && !toggle ? <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} /> : null)}{after}</>
  if (href) return external
    ? <a href={href} className={rowClass} {...attrs}>{inner}</a>
    : <Link href={href} className={rowClass} {...attrs}>{inner}</Link>
  if (onPress && !buttons.length && !menu) return <button type="button" className={rowClass} onClick={(e) => onPress(e.currentTarget)} {...attrs}>{inner}</button>
  return <div className={rowClass} data-static="" {...attrs}>{inner}</div>
}

/** (the calm UI build 2026-10-27, T-02 · 3-05 · 3-22) A row's other steps — what used to sit beside its one verb — as its ⋮ (the house
    PortalMenu, a bottom sheet on a phone). Each keeps its own test mark on the menu row (`testId`), so a press is the press it always was. */
export type RowMoreItem = { label: string; onPress: () => void; testId?: string; disabled?: boolean; help?: string; tone?: 'danger' }
export function RowMore({ items, label, title, testId }: { items: RowMoreItem[]; label: string; title?: string; testId?: string }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  if (!items.length) return null
  return (
    <span ref={anchor} className={styles.rowMore}>
      <Tooltip label="More actions" disabled={open}>
        <IconButton icon="more_vert" label={label} variant="bare" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid={testId} />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title ?? label}>
        {items.map((it) => (
          <span key={it.label} className={styles.menuRow} data-testid={it.testId}>
            <DropdownItem tone={it.tone} disabled={it.disabled} help={it.help} onSelect={() => { setOpen(false); it.onPress() }}>{it.label}</DropdownItem>
          </span>
        ))}
      </PortalMenu>
    </span>
  )
}
