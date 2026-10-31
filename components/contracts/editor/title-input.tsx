'use client'

import { useRef, useState, type InputHTMLAttributes } from 'react'
import { Icon } from '@/components/om/icon'
import styles from './contract-editor.module.css'

/**
 * (Dane UAT 3.18) The editors' title on the meta row — the contract editor, the contract template editor and the Tasks · T&Cs & Notes ·
 * Payments template editors: a bare input that edits in place, now with the pencil at rest after the words so it reads as editable
 * (the hover tint was its only cue). The pencil steps aside while the title is being typed and while it can't be changed (a signed
 * contract, a template someone else owns); a press on it edits the title (the label wraps both).
 * (the close-out round 2026-10-31, C-123) No editor draws it on a meta row any more: the library editors rename in their header
 * (`HeaderTitle` below, through ContractHeader's `titleEdit`), which types into this same field at the header's size (`head`).
 */
export function TitleInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & { /** the header's size (`HeaderTitle`) */ head?: boolean }) {
  const { head, ...input } = props
  return (
    <label className={head ? `${styles.titleField} ${styles.headTitleField}` : styles.titleField} data-testid="title-field">
      <input {...input} className={head ? `${styles.titleInput} ${styles.headTitleInput}` : styles.titleInput} />
      <span className={styles.titlePencil} aria-hidden><Icon name="edit" size={20} weight={300} /></span>
    </label>
  )
}

export type HeaderTitleEdit = {
  value: string
  onChange: (value: string) => void
  /** The typing is over (Enter or a press elsewhere): the editor saves now, as the meta row's field did on its blur. */
  onDone?: () => void
  /** The field's name ("Split name", "Template name"). */
  label: string
  placeholder?: string
  maxLength?: number
  /** A member who may not change it reads the title alone — no pencil, no press. */
  disabled?: boolean
}

/**
 * (the close-out round 2026-10-31, C-123 · the UI audit's 4-17) A library editor's name, said once — in its header, where the page's title
 * is (ContractHeader `titleEdit`). At rest it is the title (the header's 20 bold, ending in "…" at a desk, two lines on a phone as every
 * editor's title wraps, T-01) with the pencil after it (UAT 3.18); a press types into it in place — the meta row's field at the header's
 * size, the pencil stepping aside. Enter or a press elsewhere ends it and saves; Escape puts the name back as it was (its autosave follows).
 * It replaces the second row that repeated the name under the header (4-17: "name once, in the header").
 */
export function HeaderTitle({ title, edit }: { title: string; edit: HeaderTitleEdit }) {
  const [typing, setTyping] = useState<string | null>(null)   // the name as it stood when the typing began (Escape puts it back)
  const rest = useRef<HTMLButtonElement | null>(null)
  const ended = useRef(false)   // one end per typing: Enter / Escape unmount the field, and a blur that follows must not end it twice
  if (edit.disabled) return <h1 className={styles.headTitle}><span className={styles.headTitleWords}>{title}</span></h1>
  const end = (save: boolean, refocus: boolean) => {
    if (ended.current) return
    ended.current = true
    setTyping(null)
    if (save) edit.onDone?.()
    if (refocus) requestAnimationFrame(() => rest.current?.focus())
  }
  return (
    <h1 className={styles.headTitle}>
      {typing === null ? (
        <button ref={rest} type="button" className={styles.headTitleButton} data-testid="title-field" aria-label={`${title} — rename`}
                onClick={() => { ended.current = false; setTyping(edit.value) }}>
          <span className={styles.headTitleWords}>{title}</span>
          <span className={styles.titlePencil} aria-hidden><Icon name="edit" size={20} weight={300} /></span>
        </button>
      ) : (
        <TitleInput head autoFocus value={edit.value} placeholder={edit.placeholder} aria-label={edit.label} maxLength={edit.maxLength}
                    onFocus={(e) => { const n = e.currentTarget.value.length; e.currentTarget.setSelectionRange(n, n) }}
                    onChange={(e) => edit.onChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); end(true, true) }
                      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (typing !== edit.value) edit.onChange(typing); end(false, true) }
                    }}
                    onBlur={() => end(true, false)} />
      )}
    </h1>
  )
}
