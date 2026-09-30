'use client'

import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { markQuoteStatus, undoQuoteStatus, type StatusUndo } from '@/app/quotes/actions'
import { asksBeforeMarking } from '@/lib/quotes/policy'
import type { QuoteStatus } from '@/lib/leads/quote-filters'

type Q = { id: string; number: string; status: string }
/** A mark landed (`undo` = what it replaced) or was taken back (`undone`). */
export type StatusChanged = { quoteId: string; status: QuoteStatus; undo: StatusUndo; undone: boolean }

/**
 * (UX audit Q3 — supersedes REG-176's one-tap menu; extends REG-590) A status picked from a status menu — the Quotes rows (the lead's tab and
 * Tools › Quotes), their phone cards, the editor's pill. Sent for Approval is the real submission (the approvers are told); the client's
 * statuses — Sent to Client · Confirmed · Signed — ask first, because nothing reaches the client from here; every mark answers with Undo,
 * which puts the status and its stamps back. The approval rule (`statusBlock`) greys the row before the press and refuses on the server.
 */
export function useQuoteStatus(onChanged?: (c: StatusChanged) => void): { change: (q: Q, status: QuoteStatus) => void; dialog: ReactNode } {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [asking, setAsking] = useState<{ q: Q; status: QuoteStatus } | null>(null)

  const commit = (q: Q, status: QuoteStatus) => {
    const box: { r?: { status: QuoteStatus; number: string; undo: StatusUndo; told: number } } = {}
    void run('change the status', async () => {
      const r = await markQuoteStatus(q.id, status)
      if ('error' in r) return r
      box.r = r
      onChanged?.({ quoteId: q.id, status: r.status, undo: r.undo, undone: false })
    }).then((ok) => {
      const r = box.r
      if (!ok || !r) return
      const undo = () => {
        void run('undo the status change', async () => {
          const u = await undoQuoteStatus(q.id, r.undo)
          if ('error' in u) return u
          onChanged?.({ quoteId: q.id, status: u.status, undo: r.undo, undone: true })
        }, `Quote ${r.number} is ${r.undo.status} again`)
      }
      const message = r.status === 'Sent for Approval'
        ? `Quote ${r.number} sent for approval — ${r.told ? `${r.told} ${r.told === 1 ? 'approver' : 'approvers'} told` : 'the approvers are told'}`
        : `Quote ${r.number} marked ${r.status}`
      snackbar({ message, actionLabel: 'Undo', onAction: undo })
    })
  }
  const change = (q: Q, status: QuoteStatus) => {
    if (status === q.status) return
    if (asksBeforeMarking(status)) { setAsking({ q, status }); return }
    commit(q, status)
  }
  const dialog = (
    <ConfirmDialog open={!!asking} tone="primary" title={asking ? `Mark ${asking.q.number} ${asking.status}?` : ''}
                   message={asking ? `Nothing reaches the client — no link or WhatsApp goes out from here. Mark it anyway?${asking.status === 'Sent to Client' ? ' To send it, open the quote and use Send.' : ''}` : ''}
                   confirmLabel={asking ? `Mark ${asking.status}` : 'Mark'} cancelLabel="Cancel"
                   onCancel={() => setAsking(null)} onConfirm={() => { const a = asking; setAsking(null); if (a) commit(a.q, a.status) }} />
  )
  return { change, dialog }
}
