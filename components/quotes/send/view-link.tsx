'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { firstName } from '@/lib/contracts/model'
import { offersViewLink, viewLink, viewLinkBlock, viewMessage } from '@/lib/quotes/view-link'
import { dropUnsharedQuoteView, noteQuoteViewShared, reopenQuoteView, shareQuoteView, stopQuoteView } from '@/app/quotes/view-link-actions'
import styles from './quote-send.module.css'

/**
 * (pending modules S02 — 1.0's Quote Digitizer *Share live preview*, `/quote-preview/[token]`) The quote editor's ⋮ › Share a view-only link:
 * the press makes the link (or answers the live one) and opens the house WhatsApp dialog Send for confirmation uses — the client's name and
 * number, the drafted message, Copy link, Send via WhatsApp (opened on the press). Nothing changes the quote's status: a look is not a send.
 * The dialog's last line stops the link (one sentence + Undo); the next Share makes a new address. Shown on a quote only — a variation order
 * is approved on its confirmation link — and greyed with the rule in the row while the quote waits for an approver.
 */
export function useViewLink(o: {
  quote: { id: string; number: string; kind: string; archivedAt: Date | number | null; viewToken: string | null }
  status: string
  lead: { name: string; phone: string }
  studioName: string
  approval: string
  canApprove: boolean
  /** The editor's pending autosave, written before the link goes out. */
  flush?: () => Promise<void>
}): { offered: { block: string | null } | null; open: () => void; dialog: ReactNode } {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [token, setToken] = useState<string | null>(o.quote.viewToken)
  const [open, setOpen] = useState(false)
  /* (S42 B-23) a link this press made, not shared yet: Copy link or Send says so on the lead; closing before either takes it away */
  const [fresh, setFresh] = useState(false)
  const offered = offersViewLink(o.quote.kind)
    ? { block: token ? null : viewLinkBlock({ status: o.status, approval: o.approval, approver: o.canApprove, archived: !!o.quote.archivedAt }) }
    : null

  const openDialog = () => {
    if (offered?.block) { snackbar({ message: offered.block }); return }
    if (token) { setOpen(true); return }
    void run('make the view-only link', async () => {
      if (o.flush) await o.flush()
      const r = await shareQuoteView(o.quote.id)
      if ('error' in r) return r
      setToken(r.token); setFresh(r.made); setOpen(true)
    }, undefined, { guard: 'view-link' })
  }
  const shared = () => { if (!token) return; setFresh(false); void noteQuoteViewShared(o.quote.id, token) }
  const close = () => {
    setOpen(false)
    if (fresh && token) { const t = token; setFresh(false); setToken(null); void dropUnsharedQuoteView(o.quote.id, t).then((r) => { if ('error' in r) setToken(t) }, () => setToken(t)) }
  }
  const stop = () => {
    setOpen(false); setFresh(false)
    void run('stop the view-only link', async () => {
      const r = await stopQuoteView(o.quote.id)
      if ('error' in r) return r
      setToken(null)
      snackbar({ message: `The view-only link to ${o.quote.number} is stopped — it no longer opens`, actionLabel: 'Undo', onAction: () => {
        void run('put the link back', async () => { const u = await reopenQuoteView(o.quote.id, r); if ('error' in u) return u; setToken(u.token) }, 'The view-only link opens again')
      } })
    }, undefined, { guard: 'view-link' })
  }
  /* WhatsApp opens on the press (a popup blocker eats one opened after a round trip, REG-534); the link already exists */
  const send = ({ name, phone, message }: { name: string; phone: string; message: string }) => {
    setOpen(false)
    window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
    shared()
    snackbar({ message: `WhatsApp is open with the view-only link for ${name}` })
  }
  const link = token ? viewLink(token) : ''
  const dialog = token ? (
    <SendContractDialog open={open} onClose={close} link={link} defaults={{ name: o.lead.name, phone: o.lead.phone }}
                        title="Share a view-only link" subtitle="Your client sees the quote in their browser as you work on it. There’s nothing for them to confirm or sign there."
                        copyDone="View-only link copied" phoneLabel="Client phone (WhatsApp)"
                        draft={(name) => viewMessage({ clientFirst: firstName(name), studio: o.studioName, number: o.quote.number, link })}
                        extra={<p className={styles.viewStop} data-testid="view-link-stop-line"><span>Anyone with this link can see the quote until you stop it.</span>
                          <Button appearance="text" onPress={stop} data-testid="view-link-stop">Stop the link</Button></p>}
                        onSend={send} onCopy={() => { shared(); return true }} />
  ) : null
  return { offered, open: openDialog, dialog }
}
