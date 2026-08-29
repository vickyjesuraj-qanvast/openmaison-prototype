import { cookies } from 'next/headers'

/**
 * Session tokens are `<base64url(payload)>.<base64url(HMAC-SHA256)>`.
 *
 * Signing uses Web Crypto rather than `node:crypto` on purpose: this module is
 * imported by `middleware.ts`, which may run on the Edge runtime where
 * `node:crypto` is unavailable.
 *
 * This is deliberately small and self-contained so the prototype runs with no
 * external auth service. See README for swapping in Auth.js / Clerk / WorkOS.
 */

export const SESSION_COOKIE = 'openmaison_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type SessionPayload = {
  userId: string
  organizationId: string
  /** Expiry, seconds since epoch. */
  exp: number
}

let cachedKey: CryptoKey | null = null

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set it in .env.local — generate one with `openssl rand -base64 32`.',
    )
  }
  return secret
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  cachedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  return cachedKey
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export async function signSession(
  payload: Omit<SessionPayload, 'exp'> & { exp?: number },
): Promise<string> {
  const exp = payload.exp ?? Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  const body = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        userId: payload.userId,
        organizationId: payload.organizationId,
        exp,
      } satisfies SessionPayload),
    ),
  )
  const signature = await crypto.subtle.sign('HMAC', await getKey(), new TextEncoder().encode(body))
  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

/** Returns null for any token that is malformed, tampered with, or expired. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null

  const dot = token.indexOf('.')
  if (dot <= 0 || dot === token.length - 1) return null

  const body = token.slice(0, dot)
  const signature = token.slice(dot + 1)

  try {
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', await getKey(), new TextEncoder().encode(body)),
    )
    if (!constantTimeEqual(fromBase64Url(signature), expected)) return null

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload
    if (typeof payload.userId !== 'string' || typeof payload.organizationId !== 'string') {
      return null
    }
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null

    return payload
  } catch {
    return null
  }
}

export async function createSessionCookie(userId: string, organizationId: string): Promise<void> {
  const token = await signSession({ userId, organizationId })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value)
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
