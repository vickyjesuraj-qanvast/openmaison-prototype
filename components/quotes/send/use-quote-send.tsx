'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { markQuoteStatus, sendQuote, sendQuoteForConfirmation, undoQuoteStatus } from '@/app/quotes/actions'
import { setQuoteDue } from '@/app/leads/quotes-actions'
import { confirmLink, confirmMessage } from '@/lib/quotes/confirm'
import { firstName } from '@/lib/contracts/model'
import { displayDate } from '@/lib/format'
import { quoteStatuses, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { QuoteApproval } from '@/lib/settings/types'
import type { Readiness, ReadinessIssue } from '@/lib/templates/readiness'
import { useContractFromQuote } from './contract-from-quote'
import { DEFAULT_FOLLOW_UP, FollowUpChip, followUpDate } from './follow-up-chip'
import type { SendKind, SendMode } from './send-button'

/** What a send changed, for the host to hold: the status, when, and the stamps its banners read. */
export type SendChange = { status: QuoteStatus; updatedAt: number; sentAt?: number | null; clientSentAt?: number | null; submittedAt?: number | null }

/**
 * (UX audit Q1 · Q2 · Q11) The quote's Send — every path in one place, for the editor's header and Preview's bar alike: the readiness check
 * (a blocking issue is named with the way to it), Send for approval, Send for confirmation (the WhatsApp dialog with "Follow up in 3 days ▾"),
 * Send for signature (the contract picker) and "Sent it another way". A send that puts the quote with the client on a lead still before
 * Quote Sent offers "Move to Quote Sent" in its snackbar (the Move stage window with this quote picked, `lib/leads/move-link.ts`).
 */
export function useQuoteSend(o: {
  quote: { id: string; number: string; leadId: string; version: number }
  status: QuoteStatus
  lead: { name: string; phone: string }
  studioName: string
  approval: QuoteApproval
  canApprove: boolean
  readiness: Readiness | null
  /** A blocking issue's "Show me". */
  onShowIssue?: (issue: ReadinessIssue) => void
  /** The editor's pending autosave, written before anything goes out. */
  flush?: () => Promise<void>
  onChange: (c: SendChange) => void
  /** Where the contract's close comes back to. */
  contractFrom: string
}): { kind: SendKind; canSend: boolean; hint: string; send: (mode: SendMode) => void; openContract: () => void; dialogs: ReactNode } {
  const { quote, status } = o
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const contract = useContractFromQuote(o.contractFrom)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [followUp, setFollowUp] = useState(DEFAULT_FOLLOW_UP)

  const steps = quoteStatuses(o.approval)
  const nextStep: QuoteStatus | null = status === 'Draft' ? (steps[1] ?? null) : status === 'Approved' ? 'Sent to Client' : null
  /* (REG-587) What Send offers here: for approval while that is the next step; else the client's two ways — confirm on a link first
     (Mavid's flow) or the agreement for signature; once Confirmed, only the signature is left. (REG-624, parity Q-23) An approver's own
     quote skips the approval step: their Send offers the client's two ways at once. */
  const kind: SendKind = nextStep === 'Sent for Approval' && !o.canApprove ? 'approval' : status === 'Draft' || status === 'Approved' || status === 'Sent to Client' ? 'client' : status === 'Confirmed' ? 'confirmed' : 'done'
  const flush = async () => { if (o.flush) await o.flush() }
  /* (Q1) The lead's next stage, or nothing. */
  const moveAction = (href: string | null | undefined) => (href ? { actionLabel: 'Move to Quote Sent', onAction: () => router.push(href) } : {})
  /* (Q11) The follow-up the dialog asked for: Due that day, which raises the follow-up task (REG-470). */
  const setFollowUpDue = async (): Promise<Date | null> => {
    if (!followUp) return null
    const due = followUpDate(followUp, Date.now())
    await setQuoteDue(quote.id, due)
    return due
  }

  const openContract = () => { void flush(); contract.open({ id: quote.id, leadId: quote.leadId, number: quote.number }) }
  const send = (mode: SendMode) => {
    /* (REG-626, parity §8.2 · E-106) The checks Preview lists: a blocking issue — no priced line, no client name, a schedule that does not
       add up to 100% — is named, with the way to what fixes it. */
    const block = o.readiness?.issues.find((i) => i.blocking)
    if (block) { snackbar({ message: `Before you send: ${block.label}`, ...(o.onShowIssue ? { actionLabel: 'Show me', onAction: () => o.onShowIssue?.(block) } : {}) }); return }
    if (mode === 'signature') { openContract(); return }
    if (mode === 'confirmation') { void flush(); setFollowUp(DEFAULT_FOLLOW_UP); setConfirmOpen(true); return }
    if (mode === 'other') {
      /* (Q2) "Sent it another way" — the old Mark as sent: the client has it, the record says so; nothing goes out. */
      const box: { r?: Extract<Awaited<ReturnType<typeof markQuoteStatus>>, { undo: unknown }> } = {}
      void run('mark the quote sent', async () => { await flush(); const r = await markQuoteStatus(quote.id, 'Sent to Client'); if ('error' in r) return r; box.r = r; o.onChange({ status: r.status, updatedAt: Date.now(), clientSentAt: r.undo.clientSentAt ?? Date.now(), sentAt: r.undo.sentAt ?? Date.now() }) }, undefined, { guard: 'send' })
        .then((ok) => {
          const r = box.r
          if (!ok || !r) return
          snackbar(r.moveTo
            ? { message: `Quote ${r.number} marked Sent to Client`, ...moveAction(r.moveTo) }
            : { message: `Quote ${r.number} marked Sent to Client`, actionLabel: 'Undo', onAction: () => { void run('undo the mark', async () => { const u = await undoQuoteStatus(quote.id, r.undo); if ('error' in u) return u; o.onChange({ status: u.status, updatedAt: Date.now(), clientSentAt: r.undo.clientSentAt, sentAt: r.undo.sentAt }) }, `Quote ${r.number} is ${r.undo.status} again`) } })
        })
      return
    }
    if (!nextStep) return
    void run('send the quote', async () => {
      await flush()
      const r = await sendQuote(quote.id)
      o.onChange({ status: r.status, updatedAt: r.updatedAt, sentAt: r.sentAt, ...(r.status === 'Sent for Approval' ? { submittedAt: r.updatedAt } : {}), ...(r.status === 'Sent to Client' ? { clientSentAt: r.updatedAt } : {}) })
      snackbar(r.status === 'Sent for Approval' ? { message: `Quote ${quote.number} sent for approval — the approvers are told` } : { message: `Quote ${quote.number} marked ${r.status}`, ...moveAction(r.moveTo) })
    }, undefined, { guard: 'send' })
  }

  /* (REG-587) Send for confirmation: WhatsApp opens on the press (a popup blocker eats one opened after the round trip, REG-534). */
  const sendForConfirmation = ({ name, phone, message }: { name: string; phone: string; message: string }) => {
    setConfirmOpen(false)
    window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
    void run('send the quote', async () => {
      const r = await sendQuoteForConfirmation(quote.id)
      o.onChange({ status: r.status, updatedAt: r.updatedAt, sentAt: r.sentAt, clientSentAt: r.updatedAt })
      const due = await setFollowUpDue()
      snackbar({ message: `Quote sent to ${name} for confirmation${due ? ` — follow-up on ${displayDate(due)}` : ''}`, ...moveAction(r.moveTo) })
    }, undefined, { guard: 'send' })
  }
  /* (sweep S1 · U-06) Copying the link sends it, the contract's rule (REG-631): a link handed out opens — with the follow-up asked for. */
  const onCopy = () => {
    if (status !== 'Draft' && status !== 'Approved') return true
    return run('send the quote', async () => {
      const r = await sendQuoteForConfirmation(quote.id)
      o.onChange({ status: r.status, updatedAt: r.updatedAt, sentAt: r.sentAt, clientSentAt: r.updatedAt })
      const due = await setFollowUpDue()
      snackbar({ message: `The quote is Sent to Client — the link opens for your client now${due ? ` · follow-up on ${displayDate(due)}` : ''}`, ...moveAction(r.moveTo) })
    }, undefined, { guard: 'send' })
  }

  const notes = (o.readiness?.issues ?? []).filter((i) => !i.blocking).map((i) => i.label)
  const dialogs = (
    <>
      {/* (REG-587) Send for confirmation: the contract's send dialog with the quote's words — name, number, the WhatsApp draft, the confirmation link. */}
      <SendContractDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} link={confirmLink(quote.id)} defaults={{ name: o.lead.name, phone: o.lead.phone }}
                          title="Send for confirmation" subtitle="Your client reads the quote in their browser and confirms it. The agreement and the signature come after."
                          copyDone="Confirmation link copied" phoneLabel="Client phone (WhatsApp)" notes={notes.length ? notes : undefined}
                          draft={(name) => confirmMessage({ clientFirst: firstName(name), studio: o.studioName, number: quote.number, link: confirmLink(quote.id), version: quote.version })}
                          extra={<FollowUpChip days={followUp} onChange={setFollowUp} />}
                          onSend={sendForConfirmation} onCopy={onCopy} />
      {contract.dialog}
    </>
  )
  return { kind, canSend: kind !== 'done', hint: `Quote is ${status}`, send, openContract, dialogs }
}
