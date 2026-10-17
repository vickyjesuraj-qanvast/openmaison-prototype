'use client'

import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { RETURN_REASONS, RETURN_RULES, type ReturnField } from '@/lib/leads/return-model'
import styles from './return-policy-dialog.module.css'

/** What each of a reason's fields asks the studio for, in the wizard's own words. */
const ASKS: Partial<Record<ReturnField, string>> = {
  subReasons: 'the specific reasons',
  outreach: 'when you first reached out',
  attempts: 'how many attempts you made',
  search: 'the duplicate lead',
  project: 'the existing project',
  wrongField: 'what is incorrect',
}

/**
 * (pending modules S05 — card held:leads, "the policy behind the info icon — Coming soon") Qanvast's return policy, behind the Return Lead
 * wizard's and the Return details' info control: when a lead can be returned (1.0's `getReturnEligibility`, display only — the owner's Q-44),
 * what each of the seven reasons asks for, what happens after it is sent, and the appeal. The house dialog, nested over the wizard. Every line
 * is read from lib/leads/return-model.ts, so the policy and the wizard never disagree. *(invented copy: the dialog's sentences)*
 */
export function ReturnPolicyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { waitDays, windowDays, maxReturns } = RETURN_RULES
  return (
    <Dialog open={open} onClose={onClose} title="Qanvast’s return policy" size="modal" width={600} nested portal
            footer={<Button onPress={onClose}>Done</Button>}>
      <div className={styles.policy} data-testid="return-policy">
        <section className={styles.block} aria-label="When a lead can be returned">
          <h3 className={styles.title}>When a lead can be returned</h3>
          <ul className={styles.list}>
            <li>From {waitDays} days after the lead arrived, until {windowDays} days after.</li>
            <li>A lead can be returned up to {maxReturns} times — an appeal counts as one.</li>
          </ul>
        </section>
        <section className={styles.block} aria-label="What to send">
          <h3 className={styles.title}>What to send</h3>
          <ul className={styles.list}>
            {RETURN_REASONS.map((r) => {
              const asked = r.fields.map((f) => ASKS[f]).filter((x): x is string => !!x)
              const words = [...asked, r.commentsRequired ? 'your comments' : null].filter(Boolean)
              return <li key={r.key}><b>{r.label}</b>{words.length ? ` — ${words.join(', ')}` : ''}. Screenshots of your attempts help.</li>
            })}
          </ul>
        </section>
        <section className={styles.block} aria-label="After you send it">
          <h3 className={styles.title}>After you send it</h3>
          <ul className={styles.list}>
            <li>The lead is marked Lost and a task reminds you to answer Qanvast.</li>
            <li>Qanvast replies on the lead. An approved return refunds the lead’s credits.</li>
            <li>A rejected return can be appealed with more documents or information, within the days Qanvast’s reply gives.</li>
          </ul>
        </section>
        <p className={styles.note}>Qanvast reserves the right of final decision on the return of leads and return of credits. The days and the limit are shown, never enforced here, until Qanvast confirms them.</p>
      </div>
    </Dialog>
  )
}
