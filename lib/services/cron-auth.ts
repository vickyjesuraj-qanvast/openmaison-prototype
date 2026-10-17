/*
 * (pending modules S34 — 1.0's src/lib/cron-auth.ts `isAuthorizedCron`, its env name and its rule kept) Who may run the scheduled jobs:
 * the scheduler, with `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends it by itself once the variable is set). It FAILS CLOSED in
 * production — no secret set, no run — and, outside production only, lets a developer call it with none set. Pure.
 */
export function isAuthorizedCron(authHeader: string | null | undefined, env: { secret?: string | undefined; production?: boolean } = {}): boolean {
  const secret = 'secret' in env ? env.secret : process.env.CRON_SECRET
  const production = env.production ?? process.env.NODE_ENV === 'production'
  if (!secret) return !production
  const want = `Bearer ${secret}`
  const got = authHeader ?? ''
  if (got.length !== want.length) return false
  let x = 0
  for (let i = 0; i < want.length; i++) x |= got.charCodeAt(i) ^ want.charCodeAt(i)
  return x === 0
}
