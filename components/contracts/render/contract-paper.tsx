import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import { resolveTokens, SIGN_LABEL, type SignKey, type TokenValues } from '@/lib/contracts/tokens'
import { displayDateLong } from '@/lib/format'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import type { SignedLetterhead } from '@/lib/contracts/policy'
import { isSignatureImage } from '@/lib/quotes/signature'
import styles from './contract-paper.module.css'

export type StudioSignature = { kind: 'draw' | 'type' | 'image'; name: string; data: string | null } | null   // (Dane UAT 6.23) 'image' = an uploaded picture
export type ClientSignature = { name: string; at: Date; /** (REG-563) the masked NRIC the client typed when signing */ nric?: string | null; /** (REG-633, parity Q-18) a drawn signature's path */ drawing?: string | null } | null

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The sign fields become signature boxes: the studio's prints your saved signature; the client's prints their typed name once signed, else the line they sign on. */
export function renderSignFields(html: string, o: { studio: StudioSignature; client: ClientSignature; studioName: string; live?: boolean }): string {
  return html.replace(/<span class="om-sign" data-sign="([a-z-]+)"[^>]*>[^<]*<\/span>/g, (_m, key: string) => {
    const k = key as SignKey
    const label = SIGN_LABEL[k] ?? key
    const initial = k.endsWith('initial')
    if (k.startsWith('studio')) {
      const sig = o.studio
      const mark = sig
        ? sig.kind === 'draw' && sig.data ? `<svg viewBox="0 0 752 140" class="${styles.drawn}" aria-label="${esc(sig.name)}"><path d="${esc(sig.data)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        /* (Dane UAT 6.23) an uploaded signature: only a PNG / JPEG data URL of at most 1 MB is ever drawn — never a link or markup */
        : sig.kind === 'image' && isSignatureImage(sig.data) ? `<img src="${esc(sig.data)}" class="${styles.drawn} ${styles.pictured}" alt="${esc(sig.name)}" />`
        : `<span class="${styles.typed}">${esc(initial ? initials(sig.name) : sig.name)}</span>`
        : `<span class="${styles.blank}"></span>`
      return `<span class="${styles.box} ${initial ? styles.initial : ''}" data-sign="${key}"><span class="${styles.mark}">${mark}</span><span class="${styles.caption}">${esc(label)} · ${esc(o.studioName)}</span></span>`
    }
    const c = o.client
    const drawn = c?.drawing && !initial && /^[ML0-9. ]+$/.test(c.drawing)
    const mark = c ? (drawn ? `<svg viewBox="0 0 752 140" class="${styles.drawn}" aria-label="${esc(c.name)}"><path d="${esc(c.drawing!)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>` : `<span class="${styles.typed}">${esc(initial ? initials(c.name) : c.name)}</span>`) : `<span class="${styles.blank}" data-live="${o.live ? '1' : ''}"></span>`
    const caption = c ? `${esc(label)} · ${esc(c.name)}${c.nric ? ` · NRIC ${esc(c.nric)}` : ''} · ${esc(displayDateLong(c.at))}` : `${esc(label)}${o.live ? ' · your signature goes here' : ''}`   /* (sweep S2 #5) the box's place on a phone is above the paper, never "below" */   /* (REG-563) the masked NRIC the client typed */
    return `<span class="${styles.box} ${styles.client} ${initial ? styles.initial : ''}" data-sign="${key}" data-signed="${c ? '1' : ''}"><span class="${styles.mark}">${mark}</span><span class="${styles.caption}">${caption}</span></span>`
  })
}
const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('')

/**
 * The contract as a page (REG-534): the brand kit's letterhead (logo · studio line), then the document with its chips
 * resolved and its signature fields drawn. Preview, the signing page and the PDF (print) all render this; the gallery's
 * thumbnails render it scaled.
 */
export function ContractPaper({ html, values, brand, studio, studioSignature, client, live, width, compact, letterhead }: {
  html: string
  values: TokenValues
  brand: BrandKit
  studio: StudioDetails
  studioSignature: StudioSignature
  client: ClientSignature
  /** The signing page: the client's box says where their signature goes. */
  live?: boolean
  width?: number
  /** A thumbnail: no letterhead paddings. */
  compact?: boolean
  /** (REG-631, contracts parity Q-05) A signed contract prints the letterhead it was signed under, not today's. */
  letterhead?: SignedLetterhead | null
}) {
  /* (REG-631, E-130) The allowlist again at print: whatever reached the record, the page shows only the editor's own markup. */
  const issuer = letterhead?.name || values['studio.name'] || studio.name
  const logo = letterhead?.logo ?? brand.logo
  const resolved = renderSignFields(resolveTokens(sanitizeContractHtml(html), values), { studio: studioSignature, client, studioName: issuer, live })
  const line = letterhead ? letterhead.line : [studio.address, studio.phone, studio.email, studio.uen ? `UEN ${studio.uen}` : ''].filter(Boolean).join(' · ')
  return (
    <article className={styles.paper} data-compact={compact || undefined} style={width ? { width } : undefined} data-testid="contract-paper">
      <header className={styles.head}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img className={styles.logo} src={logo} alt="" /> : null}
        <span className={styles.studio}>
          <span className={styles.studioName}>{issuer}</span>
          {line ? <span className={styles.studioLine}>{line}</span> : null}
        </span>
      </header>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: resolved }} />
      <footer className={styles.foot}>Prepared with OpenMaison</footer>
    </article>
  )
}
