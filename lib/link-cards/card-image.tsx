import 'server-only'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { ImageResponse } from 'next/og'
import { CARD_SIZE, clip, initialsOf, type LinkCard } from './model'

/*
 * (pending modules S02 — 1.0's `/api/og` 1200×630 card, without its "OpenMaison") The picture a chat shows beside a client link: the studio's
 * letterhead as a card — the accent band, its logo (or its initials in a round mark) and its name, then what the link holds. Centred, so a
 * chat that crops it square still shows the studio. Drawn by next/og, which reads inline styles only — so this one picture is built here,
 * outside the app's CSS modules, and its colours are the studio's brand kit (the card is the studio's letterhead, not the app's UI).
 */

type CardFont = { name: string; data: Buffer; weight: 400 | 600; style: 'normal' }
let fonts: Promise<CardFont[]> | null = null
const loadFonts = () => (fonts ??= Promise.all([
  readFile(join(process.cwd(), 'lib/link-cards/fonts/Inter-Regular.ttf')).then((data): CardFont => ({ name: 'Inter', data, weight: 400, style: 'normal' })),
  readFile(join(process.cwd(), 'lib/link-cards/fonts/Inter-SemiBold.ttf')).then((data): CardFont => ({ name: 'Inter', data, weight: 600, style: 'normal' })),
]).catch(() => { fonts = null; return [] }))

const MIME: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' }
/** The logo as the renderer can read it: a data URL as kept, a file of the app's own `public/` read in, an http(s) address as is — anything
    else (a picture the renderer can't draw) falls back to the initials. */
async function logoSrc(logo: string | null): Promise<string | null> {
  if (!logo) return null
  if (logo.startsWith('data:')) return /^data:image\/(png|jpe?g|gif|svg\+xml)[;,]/.test(logo) ? logo : null
  if (/^https?:\/\//.test(logo)) return logo
  const path = logo.split(/[?#]/)[0] ?? ''
  if (!path.startsWith('/') || path.includes('..')) return null
  const mime = MIME[extname(path).toLowerCase()]
  if (!mime) return null
  try { return `data:${mime};base64,${(await readFile(join(process.cwd(), 'public', path))).toString('base64')}` } catch { return null }
}
const colour = (c: string | null | undefined, fallback: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback)

export async function cardImage(card: LinkCard): Promise<ImageResponse> {
  const [f, logo] = await Promise.all([loadFonts(), logoSrc(card.logo)])
  const accent = colour(card.accent, '#5500FF'), ink = colour(card.ink, '#1A1A1A'), grey = colour(card.grey, '#666666')
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF', fontFamily: 'Inter' }}>
        <div style={{ height: 16, width: '100%', background: accent, display: 'flex' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 96px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logo} alt="" width={80} height={80} style={{ objectFit: 'contain' }} />
              : <div style={{ width: 80, height: 80, borderRadius: 40, background: accent, color: '#FFFFFF', fontSize: 32, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initialsOf(card.studio)}</div>}
            <div style={{ fontSize: 40, fontWeight: 600, color: ink, display: 'flex' }}>{clip(card.studio, 34)}</div>
          </div>
          <div style={{ width: 96, height: 2, background: '#E5E5E5', margin: '40px 0 36px', display: 'flex' }} />
          {/* (Contracts on the move, C3 — C-26) a chat shows the card ~300px wide: the eyebrow and the line are drawn at 40 and 44 of 1200 (24 and 30 before —
              5px and 7px in WhatsApp's preview), so "Agreement to sign" and "For Olivia Martinez" survive the shrink; clipped to what fits the width at that size */}
          {card.eyebrow ? <div style={{ fontSize: 40, fontWeight: 600, color: accent, letterSpacing: 1, textTransform: 'uppercase', display: 'flex' }}>{clip(card.eyebrow, 32)}</div> : null}
          <div style={{ fontSize: 56, fontWeight: 600, color: ink, lineHeight: 1.18, marginTop: card.eyebrow ? 14 : 0, maxWidth: 1000, textAlign: 'center', display: 'flex', justifyContent: 'center' }}>{clip(card.title, 64)}</div>
          {card.line ? <div style={{ fontSize: 44, color: grey, marginTop: 18, display: 'flex' }}>{clip(card.line, 40)}</div> : null}
        </div>
      </div>
    ),
    { ...CARD_SIZE, ...(f.length ? { fonts: f } : {}), headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
