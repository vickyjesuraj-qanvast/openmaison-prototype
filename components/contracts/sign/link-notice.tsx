import { Icon } from '@/components/om/icon'
import type { LinkState } from '@/lib/contracts/policy'
import styles from './signing-page.module.css'

/**
 * (REG-631, contracts parity Q-07) What a signing link shows when it does not sign: a Draft (never sent, or moved back) says it is not
 * ready; an archived or deleted contract, or one whose lead was deleted, says the link no longer works — 1.0's words (B-73). The page
 * carries no document in either case.
 */
export function LinkNotice({ state, studio }: { state: Extract<LinkState, 'not-sent' | 'inactive'>; studio: string }) {
  return (
    <div className={styles.notice} role="status" data-testid="link-notice" data-state={state}>
      <span className={styles.uploadedGlyph}><Icon name={state === 'inactive' ? 'lock' : 'hourglass_top'} size={32} /></span>
      <h1 className={styles.noticeTitle}>{state === 'inactive' ? 'This link is no longer active' : 'Not ready yet'}</h1>
      <p className={styles.uploadedHelp}>{state === 'inactive' ? `Please ask ${studio} for an updated link.` : `${studio} hasn’t sent this for signing yet. You’ll get the link on WhatsApp when it’s ready.`}</p>
    </div>
  )
}
