import 'server-only'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { fitLogo, imageSize, type LogoSize } from './email-logo-model'

/*
 * (S44O — UAT rows 314 · 337, IDL's "logo issue in emails" and Spaces' "lead notification emails arrive distorted"; M15, call C10 as
 * recommended — her UAT ask 2026-10-15) The developers' fix to the notification email: the studio's logo travels as a HOSTED PNG copy with
 * its own width and height, so every mail app — Outlook above all, which ignores CSS sizes — draws it at the ratio it has, inside 160 × 48.
 *
 * The brand kit holds the logo as the studio gave it: an upload (a data URL — an email can't carry one), a file the app serves (Demo Studio's
 * SVG — no mail app draws SVG) or an address. This keeps ONE copy for email beside the kit (settings `brand_email_logo`): a PNG at twice the
 * size it is drawn (sharp — (S45C) a listed dependency since 2026-10-17, at the version Next already brought), its size, and a fingerprint of the logo it was made from — made again only when the
 * kit's logo changes, on the first email after. `/files/email-logo?v=<fingerprint>` serves it to anyone (a mail app fetches it signed out).
 * PRODUCTION: the developers may put the copy in object storage instead — `emailLogoFor` is the one place that answers its address and size.
 */

export const EMAIL_LOGO_KEY = 'brand_email_logo'
export const EMAIL_LOGO_PATH = '/files/email-logo'
type Kept = { hash: string; width: number; height: number; mime: string; data: string }

/** The logo's bytes as the kit holds it — a data URL, a file under public/, or an address (a short wait) — else null. */
async function sourceBytes(logo: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (logo.startsWith('data:')) {
    const comma = logo.indexOf(',')
    if (comma < 0) return null
    const head = logo.slice(5, comma)
    const mime = (head.split(';')[0] || 'application/octet-stream').toLowerCase()
    const body = logo.slice(comma + 1)
    return { bytes: head.includes(';base64') ? Buffer.from(body, 'base64') : Buffer.from(decodeURIComponent(body), 'utf8'), mime }
  }
  if (/^https?:\/\//i.test(logo)) {
    try {
      const r = await fetch(logo, { signal: AbortSignal.timeout(3000) })
      if (!r.ok) return null
      return { bytes: Buffer.from(await r.arrayBuffer()), mime: (r.headers.get('content-type') ?? '').split(';')[0]!.toLowerCase() }
    } catch { return null }
  }
  /* a file the app serves from public/ — never outside it */
  const rel = logo.split(/[?#]/)[0]!
  if (!rel.startsWith('/') || rel.includes('..')) return null
  const root = path.join(process.cwd(), 'public')
  const file = path.join(root, rel)
  if (!file.startsWith(root + path.sep)) return null
  try {
    const bytes = await readFile(file)
    const ext = path.extname(file).toLowerCase()
    return { bytes, mime: ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'application/octet-stream' }
  } catch { return null }
}

/** The PNG copy at twice the drawn size, through sharp (listed in package.json since S45C); should its binary not load on a platform, a PNG /
    JPEG / GIF goes as it is (its size read from its header) and an SVG has no copy (the email then names the studio). */
async function emailCopy(src: { bytes: Buffer; mime: string }): Promise<{ data: Buffer; mime: string; size: LogoSize } | null> {
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(src.bytes, { density: 300 }).metadata()
    if (!meta.width || !meta.height) return null
    const size = fitLogo(meta.width, meta.height)
    const data = await sharp(src.bytes, { density: 300 }).resize(size.width * 2, size.height * 2, { fit: 'inside' }).png().toBuffer()
    return { data, mime: 'image/png', size }
  } catch {
    if (!/^image\/(png|jpeg|gif)$/.test(src.mime)) return null
    const natural = imageSize(src.bytes)
    return natural ? { data: src.bytes, mime: src.mime, size: fitLogo(natural.width, natural.height) } : null
  }
}

/**
 * The logo an email draws: the copy's address (with its fingerprint, so a new logo is a new address) and the size to draw it at — null when
 * the kit has no logo of the studio's own, or it can't be made into a picture a mail app shows (the email then sets the studio's name).
 */
export async function emailLogoFor(kitLogo: string | null | undefined, absolute: (href: string) => string): Promise<{ url: string; size: LogoSize } | null> {
  if (!kitLogo) return null
  const src = await sourceBytes(kitLogo)
  if (!src || !src.bytes.length) return null
  const hash = createHash('sha256').update(src.bytes).digest('hex').slice(0, 16)
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, EMAIL_LOGO_KEY)).limit(1)
  let kept: Kept | null = null
  try { kept = row ? (JSON.parse(row.value) as Kept) : null } catch { kept = null }
  if (!kept || kept.hash !== hash) {
    const copy = await emailCopy(src)
    if (!copy) return null
    kept = { hash, width: copy.size.width, height: copy.size.height, mime: copy.mime, data: copy.data.toString('base64') }
    const value = JSON.stringify(kept), now = new Date()
    await db.insert(settings).values({ key: EMAIL_LOGO_KEY, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  }
  return { url: absolute(`${EMAIL_LOGO_PATH}?v=${kept.hash}`), size: { width: kept.width, height: kept.height } }
}

/** The kept copy's bytes, for `/files/email-logo` — null when none was made. */
export async function emailLogoFile(): Promise<{ bytes: Buffer; mime: string } | null> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, EMAIL_LOGO_KEY)).limit(1)
  if (!row) return null
  try {
    const k = JSON.parse(row.value) as Kept
    return typeof k.data === 'string' && /^image\/(png|jpeg|gif)$/.test(k.mime) ? { bytes: Buffer.from(k.data, 'base64'), mime: k.mime } : null
  } catch { return null }
}
