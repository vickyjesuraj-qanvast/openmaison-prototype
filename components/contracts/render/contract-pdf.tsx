import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import styles from './contract-pdf.module.css'

/**
 * (pending modules S03 — the card's "a signed contract with no file is a trust gap") An uploaded contract's PDF where its paper would be,
 * the same piece on every page that shows one: the studio's editor and Preview (`/files/raw/<file>`), the client's signing page and a set
 * sent together (through the link's own address), a PDF template in the library. `src` null = no file was kept (a contract recorded
 * before files were): its glyph and name, and whatever the host offers (the editor's Attach the PDF).
 */
export function ContractPdf({ name, src, thumb, help, actions, testId = 'contract-pdf' }: {
  name: string
  /** The PDF's address; null when none is kept. */
  src: string | null
  /** The picture of its first page — a phone shows it in the viewer's place. */
  thumb?: string | null
  /** A line under the file (the client's page says who shared it). */
  help?: string
  /** The host's presses in the file's row (Download · Replace · Attach the PDF). */
  actions?: ReactNode
  testId?: string
}) {
  if (!src) {
    return (
      <div className={styles.card} data-testid={testId} data-kept="">
        <div className={styles.empty}>
          <span className={styles.emptyGlyph}><Icon name="picture_as_pdf" size={32} /></span>
          <span className={styles.emptyName}>{name}</span>
          {help ? <p className={styles.help}>{help}</p> : null}
          {actions ? <span className={styles.actions}>{actions}</span> : null}
        </div>
      </div>
    )
  }
  return (
    <div className={styles.card} data-testid={testId} data-kept="1">
      <div className={styles.head}>
        <span className={styles.glyph}><Icon name="picture_as_pdf" size={24} fill /></span>
        <span className={styles.name} title={name}>{name}</span>
        <span className={styles.actions}>
          {actions}
          <a className={styles.open} href={src} target="_blank" rel="noopener" data-testid="pdf-open"><Icon name="open_in_new" size={18} />Open</a>
        </span>
      </div>
      {/* the browser's own PDF viewer; one without a viewer shows the fallback — the first page and Open the PDF — as a phone always does */}
      <object className={styles.frame} data={src} type="application/pdf" aria-label={name} data-testid="pdf-frame">
        <a className={styles.fallback} href={src} target="_blank" rel="noopener" aria-label={`Open ${name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thumb ? <img src={thumb} alt="" /> : null}
          <span className={styles.pictureCta}><Icon name="open_in_new" size={18} />Open the PDF</span>
        </a>
      </object>
      <a className={styles.picture} href={src} target="_blank" rel="noopener" aria-label={`Open ${name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb ? <img src={thumb} alt="" /> : null}
        <span className={styles.pictureCta}><Icon name="open_in_new" size={18} />Open the PDF</span>
      </a>
      {help ? <p className={styles.help}>{help}</p> : null}
    </div>
  )
}
