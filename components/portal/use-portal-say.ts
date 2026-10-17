'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt } from '@/components/leads/tasks/use-run'
import { SIGNED_OUT, loginPath } from '@/lib/portal/model'

/** "Couldn’t send your answer — Mei Ling has already answered for this stage": the refusal after the dash keeps the capital of a name — the
    studio's, or someone from the household's (fix-F, F-03) — and lowers the first word of a plain sentence ("— you have already…"). */
export function couldntSay(what: string, why: string | null, studio: string): string {
  if (!why) return couldnt(what, null)
  const plain = /^(You|Your|This|That|These|Those|Say|Choose|Enter|Add|Keep|Sign|The|A|An|It|Nothing|Only|Pick|Answer|Check|Please|More|Less|Over|Under|Use|Give|Write|Tell|What|There|Here)\b/.test(why)
  return why.startsWith(studio) || !plain ? `Couldn’t ${what} — ${why.replace(/\.$/, '')}` : couldnt(what, why)
}

/**
 * (fix-F, F-19) How a portal page says a refused request. The one refusal the client can do something about — the session has ended (30 days,
 * signed out elsewhere, their access withdrawn) — carries **Sign in**, which comes back to this very page (`?next=`, F-20); every other
 * refusal is the snackbar's words alone, as before.
 */
export function usePortalSay(slug: string) {
  const router = useRouter()
  const snack = useSnackbar()
  return useCallback((message: string, raw?: string | null) => {
    if (raw === SIGNED_OUT) {
      const here = typeof window === 'undefined' ? null : `${window.location.pathname}${window.location.search}`
      snack({ message, actionLabel: 'Sign in', onAction: () => router.replace(loginPath(slug, here)) })
    } else snack({ message })
  }, [router, slug, snack])
}
