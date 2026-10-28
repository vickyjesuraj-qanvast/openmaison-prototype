'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from './settings.module.css'

/**
 * (the calm UI build 2026-10-27, T-05 — "explanations off the page": a card says what it is in one line; longer help goes behind a "How this
 * works" text link) A Settings card's rules, folded: the house text button with its chevron, the paragraph under it once opened — by a press,
 * a key or a finger (never hover alone). Closed on every visit. *(invented UI — the brief's "How this works" link, where no house HelpLink fits:
 * the rules are this card's own, not another page's)*
 */
export function HowItWorks({ label, children, testId }: { label: string; children: string; testId?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={styles.how} data-testid={testId}>
      <Button appearance="text" iconEnd={<Icon name={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={20} />} aria-expanded={open} aria-controls={id} onPress={() => setOpen((o) => !o)}>{label}</Button>
      <p id={id} className={styles.settingHelp} hidden={!open}>{children}</p>
    </div>
  )
}
