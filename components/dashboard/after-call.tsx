'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { LogSheet, type LogAskIn } from '@/components/leads/log/log-sheet'

/** A call or a WhatsApp made from a Dashboard row: whose lead, the words that name them, and the channel. */
export type AfterCall = { leadId: string; who: string; channel: 'Call' | 'WhatsApp' }

/**
 * (the Dashboard redesigned, 2026-10-26 — P-06 · P-04, "Call and WhatsApp open straight from the row; the call is remembered so Log the call is
 * offered on return") **Log the call, on the Dashboard** — one piece for Your day's rows (lane D3, where it was written) and Needs you's (lane D2):
 * `remember` when a row's Call or WhatsApp is pressed; back on the page (the tab visible or the window focused again, at least 1.5 s later) the
 * snackbar asks "Log the call with {who}?" and its action opens the house log sheet for that lead (`LogSheet`, the lead's own first-contact move).
 * `sheet` is the log sheet to render once.
 */
export function useAfterCall(): { remember: (c: AfterCall) => void; sheet: ReactNode } {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [logLead, setLogLead] = useState<string | null>(null)
  const [logAsk, setLogAsk] = useState<LogAskIn | null>(null)
  const called = useRef<(AfterCall & { at: number }) | null>(null)
  const logN = useRef(0)

  useEffect(() => {
    const back = () => {
      const c = called.current
      if (!c || document.visibilityState !== 'visible' || Date.now() - c.at < 1500) return
      called.current = null
      snackbar({ key: 'day-log-call', message: c.channel === 'Call' ? `Log the call with ${c.who}?` : `Log the WhatsApp with ${c.who}?`, actionLabel: c.channel === 'Call' ? 'Log the call' : 'Log it',
        onAction: () => { logN.current += 1; setLogLead(c.leadId); setLogAsk({ channel: c.channel, n: logN.current }) } })
    }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('focus', back)
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back) }
  }, [snackbar])

  const remember = useCallback((c: AfterCall) => { called.current = { ...c, at: Date.now() } }, [])
  const sheet = logLead ? <LogSheet leadId={logLead} ask={logAsk} onClose={() => setLogAsk(null)} onSaved={() => router.refresh()} /> : null
  return { remember, sheet }
}
