'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './empty-state.module.css'

/** One way in: the button's words, its glyph, what it does — and why this member can't, when they can't (REG-728: said, never a dead press). */
export type EmptyAction = { label: string; icon?: string; onPress: () => void; block?: string | null; testId?: string }

/**
 * (REG-735, owner 2026-09-30: "users might land here for the first time … they don't know where to click") The house empty state for a
 * list's FIRST RUN — nothing in it yet. It carries its own ways in, where the eye lands: the usual way as the one filled button (it answers
 * C, `data-kb="create"`, while the toolbar's New steps back), a second way outlined, a third as a text button, and what sits under them
 * (a library's samples). Rules (design-source/context/page-checklist.md › Empty states): a first run always carries its action; one filled
 * button on the screen; "No results found" (TabSearchEmpty) is a different card, for a search or a filter.
 */
export function EmptyState({ icon, title, help, primary, secondary, link, extra, extraLabel, tone = 'first', testId = 'empty-state', kb = true }: {
  icon: string
  title: string
  help: ReactNode
  primary?: EmptyAction | null
  secondary?: EmptyAction | null
  link?: EmptyAction | null
  /** Under the buttons: the library's samples — its ready-made designs. */
  extra?: ReactNode
  extraLabel?: string
  /** 'first': the list's first run (the primary-tinted well). 'plain': an empty place with nothing to start (an empty folder). */
  tone?: 'first' | 'plain'
  testId?: string
  /** (pending modules S19) false: the primary is not the page's C — a place whose way on isn't making one (a Pro feature's lock, Plans). */
  kb?: boolean
}) {
  const button = (a: EmptyAction, kind: 'primary' | 'secondary' | 'link') => {
    const b = (
      <Button key={a.label} variant="primary" appearance={kind === 'primary' ? 'filled' : kind === 'secondary' ? 'outlined' : 'text'}
              iconStart={a.icon && kind !== 'link' ? <Icon name={a.icon} size={20} /> : undefined} isDisabled={!!a.block} onPress={a.onPress}
              data-testid={a.testId} {...(kind === 'primary' && !a.block && kb ? { 'data-kb': 'create', 'data-kb-label': a.label } : {})}>
        {a.label}
      </Button>
    )
    return a.block ? <Tooltip key={a.label} label={a.block}><span>{b}</span></Tooltip> : b
  }
  const acts = [primary ? button(primary, 'primary') : null, secondary ? button(secondary, 'secondary') : null, link ? button(link, 'link') : null].filter(Boolean)
  return (
    <section className={styles.empty} data-tone={tone} aria-label={title} data-testid={testId}>
      <span className={styles.glyph} aria-hidden><Icon name={icon} size={40} weight={300} /></span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.help}>{help}</p>
      {acts.length ? <div className={styles.actions}>{acts}</div> : null}
      {extra ? (
        <div className={styles.extra}>
          {extraLabel ? <span className={styles.extraLabel}>{extraLabel}</span> : null}
          {extra}
        </div>
      ) : null}
    </section>
  )
}
