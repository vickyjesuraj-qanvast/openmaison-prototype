import Link from 'next/link'
import { Words } from '@/components/shell/ghost-kit'
import { site } from '@/lib/site/model'
import styles from './sign-in.module.css'

/*
 * (pending modules S35 — 1.0's login page: "by proceeding you agree to the terms & conditions", whose link went nowhere; S30 left it for the
 * site) The last line under sign-in and sign-up, now that OpenMaison's own Terms and Privacy Policy exist on its website — the quiet door from
 * the studio's front door to the site. Its ghost reads the same words.
 */
export const TERMS_WORDS = 'By continuing you agree to OpenMaison’s Terms of Service and Privacy Policy.'

export function TermsLine({ testId }: { testId: string }) {
  return (
    <p className={styles.fine} data-testid={testId}>
      By continuing you agree to OpenMaison’s <Link className={styles.fineLink} href={site('/terms')}>Terms of Service</Link> and <Link className={styles.fineLink} href={site('/privacy')}>Privacy Policy</Link>.
    </p>
  )
}
export function TermsLineGhost() {
  return <Words as="p" className={styles.fine}>{TERMS_WORDS}</Words>
}
