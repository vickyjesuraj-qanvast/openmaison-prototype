import type { CSSProperties } from 'react'
import { letterheadLine, type PaperExtras, type PaperLetterhead } from '@/lib/projects/invoices-paper'
import styles from './invoice-paper.module.css'

/**
 * (parity map, FB-103 · FB-101 · MI-065) The money papers' letterhead and foot, once for the invoice, the receipt and the credit note (and the
 * purchase order when it takes them): the logo, the issuing entity's name, its tagline under it, one line of the address, its contacts (its
 * own, else the studio's), its website and its numbers; at the foot, the entity's footer line. Before, each paper drew its own head — copies
 * that would drift (the 2026-09-29 rule).
 */
export function PaperHead({ h, extras, fallback }: { h: PaperLetterhead; extras: PaperExtras | null; fallback: { phone: string; email: string } }) {
  const line = letterheadLine(h, extras, fallback)
  return (
    <header className={styles.head}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {h.logo ? <img className={styles.logo} src={h.logo} alt="" /> : null}
      <span className={styles.studio}>
        <span className={styles.studioName}>{h.name}</span>
        {extras?.tagline ? <span className={styles.studioTagline} data-testid="paper-tagline">{extras.tagline}</span> : null}
        {line ? <span className={styles.studioLine} data-testid="paper-letterhead-line">{line}</span> : null}
      </span>
    </header>
  )
}

/** The entity's footer line at the paper's foot (1.0's "Footer text (PDFs + signing page)") — nothing when it has none. */
export function PaperFoot({ extras }: { extras: PaperExtras | null }) {
  return extras?.footer ? <footer className={styles.foot} data-testid="paper-footer-text">{extras.footer}</footer> : null
}

/** The paper's accent as its root's attributes: the title, the rule under the letterhead and the total take it; none = the ink, as before. */
export function accentProps(accent: string | null | undefined): { style?: CSSProperties; 'data-accent'?: string } {
  return accent ? { style: { ['--paper-accent' as string]: accent } as CSSProperties, 'data-accent': '' } : {}
}
