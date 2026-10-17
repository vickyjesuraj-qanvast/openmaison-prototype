'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from '../project-overview.module.css'

export type RowButton = { label: string; onPress: (el: HTMLElement) => void; busy?: boolean; testId?: string; kb?: string }

/**
 * A row on the card grammar of LEAD STAGES (REG-614): icon 20 · name · caption · meta · chevron, 36 tall; a link, a button or plain — the
 * project Overview's one row (it was `Row` inside project-overview.tsx; the Overview's cards share it now).
 *
 * (simplify S-01) Two additions for Needs you: `two` sets the caption under the name (the MY TASKS row's two lines), and a row may carry its
 * buttons AND open its record — the words are then the link and the buttons sit beside them (`data-split`), never one inside the other.
 */
export function Row({ icon, iconFill, state, name, caption, meta, href, onPress, action, actions, testId, external, two, tone, wrap, toggle }: {
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
  const glyph = <Icon name={icon} size={20} weight={300} fill={iconFill} className={styles.icon} />
  const btns = buttons.length ? (
    <span className={styles.rowActions}>
      {buttons.map((b) => (
        <span key={b.label} className={styles.rowAction}>
          <Button appearance="text" isDisabled={b.busy} onPress={(e) => b.onPress(e.target as HTMLElement)} data-testid={b.testId} data-kb={b.kb}>{b.label}</Button>
        </span>
      ))}
    </span>
  ) : null
  const st = state === 'alert' ? undefined : state
  const attrs = { 'data-state': st, 'data-alert': state === 'alert' || undefined, 'data-approve': tone === 'approve' || undefined, 'data-two': two || undefined, 'data-wrap': wrap || undefined, 'data-testid': testId }
  /* (simplify S-01) the words open the record, the buttons act */
  if (buttons.length && (href || onPress)) {
    const main = href
      ? (external ? <a href={href} className={styles.rowMain}>{glyph}{label}</a> : <Link href={href} className={styles.rowMain}>{glyph}{label}</Link>)
      : <button type="button" className={styles.rowMain} onClick={(e) => onPress!(e.currentTarget)}>{glyph}{label}</button>
    return <div className={styles.row} data-split="" {...attrs}>{main}{btns}</div>
  }
  const inner = <>{glyph}{label}{btns ?? ((href || onPress) && !toggle ? <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} /> : null)}</>
  if (href) return external
    ? <a href={href} className={styles.row} {...attrs}>{inner}</a>
    : <Link href={href} className={styles.row} {...attrs}>{inner}</Link>
  if (onPress && !buttons.length) return <button type="button" className={styles.row} onClick={(e) => onPress(e.currentTarget)} {...attrs}>{inner}</button>
  return <div className={styles.row} data-static="" {...attrs}>{inner}</div>
}
