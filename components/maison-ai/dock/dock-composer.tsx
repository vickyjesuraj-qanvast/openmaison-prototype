'use client'

import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Keys } from '@/components/om/keys'
import { Tooltip } from '@/components/om/tooltip'
import type { DockContext } from '@/lib/dashboard/dock'
import { MAX_QUESTION } from '@/lib/maison-ai/intents'
import styles from './maison-dock.module.css'

/** The field grows with its words to this, then scrolls inside (1.0's ChatInput, 120 px). */
const MAX_FIELD = 120
/** One line of the pill's words (the body's 24 + its 6 above and below): past this the pill holds more than one line. */
const ONE_LINE = 36

/**
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · Q-09 · lane D4) **The field** — Maison AI's spark, the card it is asked about as a
 * removable chip (C §2.3 "show what the next turn will use"), the words (Enter asks, Shift+Enter a new line, it grows to a cap), the + (the
 * tools that read a file, and the prototype's reset), ⌘J, and the send — a neutral circle that takes the primary colour only once there is
 * something to send (his § 2, Claude's own input), Stop while it reads.
 *
 * (the calm pass 2026-10-26, lane C4 — his "too busy … simplify" and the Claude Design option) At the page's foot it is **one white pill** on
 * one line: the spark, the words, ⌘J and the send at rest; the + and the card's chip only while the field is in use (the dock passes them in
 * then); a press anywhere on the pill puts the caret in the words; past one line the pill's ends straighten to the field's corner so a long
 * question never runs into the curve. At a sheet's foot it keeps the first pass's two rows (the phone and the upright tablet, unchanged).
 */
export function DockComposer({ value, onChange, onSubmit, onStop, reading, about, onClearAbout, placeholder, inputRef, menu, keyHint, onEscape, onFocus, place, testId }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop: () => void
  reading: boolean
  /** The card the next question is about — drawn as the chip in the field (null: no chip). */
  about: DockContext | null
  onClearAbout: () => void
  placeholder: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  /** The + and its menu (null: not drawn — the pill at rest). */
  menu: ReactNode
  /** ⌘J, where a keyboard is (the house Keys draws nothing on a touch screen). */
  keyHint: boolean
  /** Esc: true when the dock did something with it (folded the answers, closed the sheet, let go of the field). */
  onEscape: () => boolean
  onFocus?: () => void
  /** 'dock' at the page's foot (the pill) · 'sheet' at a sheet's foot. */
  place: 'dock' | 'sheet'
  testId: string
}) {
  const has = value.trim().length > 0
  const form = useRef<HTMLFormElement | null>(null)
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD)}px`
    /* the pill's ends follow its lines — a DOM mark, not state: the height is the browser's to know */
    form.current?.toggleAttribute('data-lines', place === 'dock' && el.scrollHeight > ONE_LINE + 4)
  }, [value, inputRef, place])

  const pill = place === 'dock'
  /* a press on the pill outside its controls puts the caret in the words (the whole pill is the field) */
  const toWords = (e: ReactPointerEvent<HTMLFormElement>) => {
    if (!pill || (e.target as Element).closest('button, textarea, a, [role="button"]')) return
    e.preventDefault()
    const el = inputRef.current
    if (!el) return
    el.focus(); el.selectionStart = el.selectionEnd = el.value.length
  }
  const aboutChip = about ? (
    <span className={styles.about} data-testid="dock-about">
      <Icon name={about.icon} size={16} />
      <span className={styles.aboutLabel}>{about.label}</span>
      <Tooltip label={`Stop asking about ${about.label}`}>
        <IconButton icon="close" label={`Stop asking about ${about.label}`} size={24} variant="bare" iconSize={16} className={styles.aboutClose} onClick={onClearAbout} data-testid="dock-about-clear" />
      </Tooltip>
    </span>
  ) : null
  const words = (
    <textarea ref={inputRef} className={styles.input} rows={1} value={value} maxLength={MAX_QUESTION} placeholder={placeholder}
              aria-label={about ? `Ask Maison AI about ${about.label}` : 'Ask Maison AI'} autoComplete="off" enterKeyHint="send"
              onFocus={onFocus} onClick={onFocus}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!reading) onSubmit(); return }
                if (e.key === 'Escape' && onEscape()) { e.preventDefault(); e.stopPropagation() }
              }}
              data-testid={`${testId}-input`} />
  )
  const send = reading ? (
    <Tooltip label="Stop"><IconButton icon="stop" label="Stop" variant="bare" className={styles.send} onClick={onStop} data-testid={`${testId}-stop`} /></Tooltip>
  ) : (
    <IconButton icon="arrow_upward" label="Ask" variant="bare" className={styles.send} data-ready={has || undefined} disabled={!has} type="submit" data-testid={`${testId}-send`} />
  )
  // eslint-disable-next-line @next/next/no-img-element
  const spark = <img className={styles.spark} src="/figma-assets/brief-sparkle.svg" width={18} height={18} alt="" />

  return (
    <form ref={form} className={pill ? styles.pill : styles.composer} data-place={place} data-maison-ask-field="" data-testid={testId} noValidate
          onPointerDown={toWords}
          onSubmit={(e) => { e.preventDefault(); if (!reading) onSubmit() }}>
      {pill ? (
        <>
          {spark}
          {aboutChip}
          {words}
          <span className={styles.pillEnd}>
            {menu}
            {keyHint ? <Keys spec="mod+j" className={styles.keys} /> : null}
            {send}
          </span>
        </>
      ) : (
        <>
          <div className={styles.fieldRow}>{spark}{aboutChip}{words}</div>
          <div className={styles.bar}>
            {menu}
            <span className={styles.barSpace} />
            {keyHint ? <Keys spec="mod+j" className={styles.keys} /> : null}
            {send}
          </div>
        </>
      )}
    </form>
  )
}
