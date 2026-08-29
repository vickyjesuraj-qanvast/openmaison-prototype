import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

// OWASP-recommended scrypt floor: N=2^17, r=8, p=1.
const N = 1 << 17
const R = 8
const P = 1
const KEY_LENGTH = 64
const MAXMEM = 256 * 1024 * 1024

/** Serialised as `scrypt$N$r$p$salt$key`, all parameters inline so they can be tuned later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM })
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, nRaw, rRaw, pRaw, saltB64, keyB64] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ]

  const n = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false

  const salt = Buffer.from(saltB64, 'base64')
  const expected = Buffer.from(keyB64, 'base64')
  if (salt.length === 0 || expected.length === 0) return false

  try {
    const actual = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: MAXMEM })
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
