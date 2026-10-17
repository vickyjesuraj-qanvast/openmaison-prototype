import 'server-only'
import { randomBytes } from 'node:crypto'

/** (gaps build B, item 6 — 1.0 G-294's share token) An invoice's or a receipt's no-login link: 16 random bytes, the address's only key. */
export const newShareToken = () => randomBytes(16).toString('base64url')
/** A token as an address may carry it (22 characters of base64url) — anything else is never looked up. */
export const isShareToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{16,40}$/.test(t)
