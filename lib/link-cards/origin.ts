import 'server-only'
import { headers } from 'next/headers'
import { siteConfig } from '@/lib/config'
import { isPreviewFetcher } from './bots'

/** The origin the link was opened on — a chat's preview needs absolute addresses, wherever the prototype is served (the renders link's
    helper, REG-676, shared by every client link since S02). */
export async function requestOrigin(): Promise<URL> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? (host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https')
  try { return new URL(host ? `${proto}://${host}` : siteConfig.url) } catch { return new URL(siteConfig.url) }
}

/** (S02) This request is a chat app drawing the link's preview, not the client opening it — a "Viewed" stamp waits for a person. */
export async function fetchedForPreview(): Promise<boolean> {
  return isPreviewFetcher((await headers()).get('user-agent'))
}
