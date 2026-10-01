'use client'

import type { InputHTMLAttributes } from 'react'
import { Icon } from '@/components/om/icon'
import styles from './contract-editor.module.css'

/**
 * (Dane UAT 3.18) The editors' title on the meta row — the contract editor, the contract template editor and the Tasks · T&Cs & Notes ·
 * Payments template editors: a bare input that edits in place, now with the pencil at rest after the words so it reads as editable
 * (the hover tint was its only cue). The pencil steps aside while the title is being typed and while it can't be changed (a signed
 * contract, a template someone else owns); a press on it edits the title (the label wraps both).
 */
export function TitleInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  return (
    <label className={styles.titleField} data-testid="title-field">
      <input {...props} className={styles.titleInput} />
      <span className={styles.titlePencil} aria-hidden><Icon name="edit" size={20} weight={300} /></span>
    </label>
  )
}
