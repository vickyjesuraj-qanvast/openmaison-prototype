'use client'

import { useState } from 'react'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setVariationReason } from '@/app/projects/money-actions'
import { money2 } from '@/lib/quotes/math'
import { signedMoney } from '@/lib/projects/money'
import type { QuoteVariation } from '@/lib/quotes/editor'
import styles from './template-bar.module.css'

/**
 * (Projects round 5, F-06) A variation order's line under the editor's header — the quote's own banner (template-bar.module.css), its words:
 * which project it changes, the contract today and with this change, and how an omission is written. Approved, it says the contract moved.
 */
export function VariationBar({ v, changeMinor, status }: { v: QuoteVariation; changeMinor: number; status: string; /** (gaps build B) */ quoteId?: string }) {
  const approved = status === 'Confirmed' || status === 'Signed'
  const after = Math.max(0, v.contractMinor + changeMinor)
  return (
    <div className={styles.banner} role="status" data-testid="variation-bar">
      <span className={styles.bannerIcon}><Icon name="request_quote" size={20} weight={300} /></span>
      <span className={styles.bannerText}>
        {approved
          ? <>Approved by the client — the contract of <b>{v.projectName}</b> is {money2(after)} with this change ({signedMoney(changeMinor)}).</>
          : <>A change to the contract of <b>{v.projectName}</b> ({v.projectNumber}): {money2(v.contractMinor)} today, {money2(after)} once the client approves it. <span className={styles.bannerHint}>An omission is a line with a minus quantity.</span></>}
      </span>
    </div>
  )
}

/**
 * (gaps build B, item 7 — 1.0 G-149 "Reason for variation") A variation order's reason for the change, in General Info beside its Title:
 * saved as the field is left (its own small save — the order's printed paper reads it under the title); once the client approved the order it
 * reads only, as every approved field does (a change is a new version).
 */
export function VariationReasonField({ quoteId, value, approved }: { quoteId: string; value: string | null; approved: boolean }) {
  const snackbar = useSnackbar()
  const [text, setText] = useState(value ?? '')
  const [saved, setSaved] = useState(value ?? '')
  const save = () => {
    if (text.trim() === saved.trim()) return
    const was = saved
    setSaved(text)
    void setVariationReason(quoteId, { reason: text }).then((r) => {
      if ('error' in r) { setText(was); setSaved(was); snackbar({ message: couldnt('save the reason', refusalOf(r.error)) }) }
    }, () => { setText(was); setSaved(was); snackbar({ message: couldnt('save the reason') }) })
  }
  return (
    <TextField label="Reason for the change" value={text} onChange={setText} onBlur={save} maxLength={500} multiline={2} disabled={approved}
               helper={approved ? 'Approved by the client — revise the order to change it' : 'Printed on the variation order — “Client added two wardrobes on 5 May”'} />
  )
}
