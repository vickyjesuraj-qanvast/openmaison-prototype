import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import { resolveTokens, SIGN_LABEL, type SignKey, type TokenValues } from '@/lib/contracts/tokens'
import { displayDateLong } from '@/lib/format'
import styles from './contract-paper.module.css'

export type StudioSignature = { kind: 'draw' | 'type'; name: string; data: string | null } | null
export type ClientSignature = { name: string; at: Date } | null

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
        ? sig.kind === 'draw' && sig.data ? `<svg viewBox="0 0 752 140" class="${styles.drawn}" aria-label="${esc(sig.name)}"><path d="${esc(sig.data)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>` : `<span class="${styles.typed}">${esc(initial ? initials(sig.name) : sig.name)}</span>`
        : `<span class="${styles.blank}"></span>`
      return `<span class="${styles.box} ${initial ? styles.initial : ''}" data-sign="${key}"><span class="${styles.mark}">${mark}</span><span class="${styles.caption}">${esc(label)} · ${esc(o.studioName)}</span></span>`
    }
    const c = o.client
    const mark = c ? `<span class="${styles.typed}">${esc(initial ? initials(c.name) : c.name)}</span>` : `<span class="${styles.blank}" data-live="${o.live ? '1' : ''}"></span>`
    const caption = c ? `${esc(label)} · ${esc(c.name)} · ${esc(displayDateLong(c.at))}` : `${esc(label)}${o.live ? ' · sign below' : ''}`
    return `<span class="${styles.box} ${styles.client} ${initial ? styles.initial : ''}" data-sign="${key}" data-signed="${c ? '1' : ''}"><span class="${styles.mark}">${mark}</span><span class="${styles.caption}">${caption}</span></span>`
  })
}
const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('')

/**
 * The contract as a page (REG-534): the brand kit's letterhead (logo · studio line), then the document with its chips
 * resolved and its signature fields drawn. Preview, the signing page and the PDF (print) all render this; the gallery's
 * thumbnails render it scaled.
 */
export function ContractPaper({ html, values, brand, studio, studioSignature, client, live, width, compact }: {
  html: string
  values: TokenValues
  brand: BrandKit
  studio: StudioDetails
  studioSignature: StudioSignature
  client: ClientSignature
  /** The signing page: the client's box says "sign below". */
  live?: boolean
  width?: number
  /** A thumbnail: no letterhead paddings. */
  compact?: boolean
}) {
  const resolved = renderSignFields(resolveTokens(html, values), { studio: studioSignature, client, studioName: values['studio.name'] ?? studio.name, live })
  const line = [studio.address, studio.phone, studio.email, studio.uen ? `UEN ${studio.uen}` : ''].filter(Boolean).join(' · ')
  return (
    <article className={styles.paper} data-compact={compact || undefined} style={width ? { width } : undefined} data-testid="contract-paper">
      <header className={styles.head}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
        <span className={styles.studio}>
          <span className={styles.studioName}>{values['studio.name'] || studio.name}</span>
          {line ? <span className={styles.studioLine}>{line}</span> : null}
        </span>
      </header>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: resolved }} />
      <footer className={styles.foot}>Prepared with OpenMaison</footer>
    </article>
  )
}
