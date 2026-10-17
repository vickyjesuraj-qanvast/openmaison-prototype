import { Icon } from '@/components/om/icon'
import type { LinkState } from '@/lib/contracts/policy'
import styles from './signing-page.module.css'

/**
 * (REG-631, contracts parity Q-07) What a signing link shows when it does not sign: a Draft (never sent, or moved back) says it is not
 * ready; an archived or deleted contract, or one whose lead was deleted, says the link no longer works — 1.0's words (B-73). The page
 * carries no document in either case.
 */
/* (pending modules S03) `expired` — a link past its window (1.0's 410 "expired"): it says so, and who sends a new one. */
/* (S42 B-01) `quote-updating` — the quote it signs is being revised: "Not ready yet", in the view-only link's words; the same link opens
   again once the quote is back with the client. `set` — a set of documents' page says "these documents". */
export function LinkNotice({ state, studio, set = false }: { state: Extract<LinkState, 'not-sent' | 'inactive' | 'expired' | 'quote-updating'>; studio: string; set?: boolean }) {
  return (
    <div className={styles.notice} role="status" data-testid="link-notice" data-state={state}>
      <span className={styles.uploadedGlyph}><Icon name={state === 'inactive' ? 'lock' : state === 'expired' ? 'schedule' : 'hourglass_top'} size={32} /></span>
      <h1 className={styles.noticeTitle}>{state === 'inactive' ? 'This link is no longer active' : state === 'expired' ? 'This link has expired' : 'Not ready yet'}</h1>
      <p className={styles.uploadedHelp}>{state === 'inactive' ? `Please ask ${studio} for an updated link.` : state === 'expired' ? `Signing links stay open for a short while. Please ask ${studio} to send you a new one.`
        : state === 'quote-updating' ? `${studio} is updating the quote ${set ? 'these documents sign' : 'this agreement signs'}. It’ll be back here once it’s ready — this same link.`
        : `${studio} hasn’t sent this for signing yet. You’ll get the link on WhatsApp when it’s ready.`}</p>
    </div>
  )
}
