'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { DeletedQuotesSheet } from '@/components/leads/quotes/deleted-quotes-sheet'
import { deleteQuotes, deleteQuotesForever, emptyQuoteTrash, listDeletedQuotes, restoreQuotes } from '@/app/leads/quotes-actions'
import { DELETE_RULE, canDeleteQuote } from '@/lib/quotes/policy'   // (parity map, MI-104)
import type { RowAction } from '@/components/finance/cost-tables'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { variationDeleteBlock, type InvoiceView, type MoneySummary, type VariationView } from '@/lib/projects/money'
import { SEND_RULE, VOID_RULE, invoiceMessage } from '@/lib/projects/invoices-model'   // (parity map, MI-007) the screen says the rule the server says
import type { ProjectMoneyData } from '@/lib/projects/money-queries'
import { approverRemindBlock, dueModeWords, dueOf, itemiseBlock } from '@/lib/projects/invoices-kinds'
import {
  createVariationOrder, markVariationApproved, rebalanceProject, sendBackInvoice, sendInvoice, setInvoiceAmount, submitInvoice, undoInvoiceAmount, undoRebalance,
  undoVariationApproval, undoVoidInvoice, voidInvoice, withdrawInvoiceSubmission,
  billVariation, createOneOffInvoice, recordExternalInvoice, remindApprovers, removeDraftInvoice, setInvoiceDetails, setProjectSplit, undoBillVariation,
  undoProjectSplit, undoRecordExternal, undoRemoveInvoice, updateOneOffInvoice,
} from '@/app/projects/money-actions'
import { AmountDialog, MarkApprovedDialog } from './money-dialogs'
import { InvoiceDetailsDialog, OneOffDialog, RecordExternalDialog, SplitDialog } from './invoice-dialogs'   // (gaps build B)
import { VoUploadDialog } from './vo-upload-dialog'   // (gaps build B, item 16)
import type { usePayments } from './payments-section'
import type { useCreditNotes } from '@/components/finance/books/credit-notes'
import { isAccounting } from '@/lib/settings/roles'   // (parity map, MI-007) a VO or a quote opens read-only for Accounting
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

export type MoneyData = ProjectMoneyData & { money: MoneySummary }
export type Step = { label: string; run: () => void; testId: string }

/**
 * (simplify S-07 · S-08) Money in's every step, as one hook the Money tab's pieces call — the Billing rows and their ⋮, the invoice's panel,
 * Needs you, New ▾ — so a step is written once wherever it is offered. Ported unchanged from the round-5 / gaps-build-B tab (every rule, every
 * refusal said in its row, every Undo, WhatsApp opened on the press — REG-534); the menus are `RowAction`s now so the row's ⋮ and the panel's
 * ⋮ are the same list. Projects round 5 (F-01 · F-02 · F-04 · F-05 · F-06 · F-08 · F-09 · F-17), round 6, gaps build B, fix-D.
 */
export function useInvoices(data: MoneyData, o: { payments: ReturnType<typeof usePayments>; cn: ReturnType<typeof useCreditNotes>; setFocus: (id: string | null) => void }) {
  const { project, client, money: m, viewer, rules, now } = data
  const books = isAccounting(viewer.role)   // (parity map, MI-007) Accounting reads a variation order in its Preview — what was agreed is never theirs to change
  const { payments, cn, setFocus } = o
  const router = useRouter()
  const pathname = usePathname()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [busy, setBusy] = useState<string | null>(null)
  const [sending, setSending] = useState<InvoiceView | null>(null)
  const [editing, setEditing] = useState<InvoiceView | null>(null)
  const [voiding, setVoiding] = useState<InvoiceView | null>(null)
  const [sendingBack, setSendingBack] = useState<InvoiceView | null>(null)
  const [marking, setMarking] = useState<VariationView | null>(null)
  const [oneOff, setOneOff] = useState<InvoiceView | 'new' | null>(null)
  const [details, setDetails] = useState<InvoiceView | null>(null)
  const [recording, setRecording] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [voUpload, setVoUpload] = useState(false)
  /* (fix-G, G-11) a deleted variation order comes back from here — never from Deleted Quotes (REG-1000) */
  const [deletedVos, setDeletedVos] = useState(false)
  const loadDeletedVos = useCallback(() => listDeletedQuotes(project.leadId, 'variation'), [project.leadId])
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))
  const today = new Date(now)
  const here = `${pathname}`
  /* (REG-1069, REG-1022) Completed: the agreed money reads only — what the server refuses is not offered (payments stay open) */
  const locked = viewer.locked
  const nameOf = (id: string | null) => (id ? data.people.find((p) => p.id === id)?.name ?? 'Someone' : 'Someone')
  /* (simplify S-08) the printable page's Back returns to the invoice's panel */
  const invoiceHref = (i: InvoiceView) => withFrom(`/projects/${project.id}/invoices/${i.id}`, `${here}?open=${encodeURIComponent(i.id)}`)
  const act = async (id: string, what: string, fn: () => Promise<unknown>, done?: Parameters<typeof run>[2]) => {
    setBusy(id)
    try { return await run(what, fn, done) } finally { setBusy(null) }
  }

  /* ── the answers ── */
  const newVariation = () => {
    setBusy('new-vo')
    void createVariationOrder(project.id).then((r) => {
      if ('error' in r) { setBusy(null); snackbar({ message: couldnt('start the variation order', refusalOf(r.error)) }); return }
      router.push(withFrom(`/quotes/${r.id}`, here))
    }, () => { setBusy(null); snackbar({ message: couldnt('start the variation order') }) })
  }
  const submit = (i: InvoiceView) => {
    let ok = false
    void act(i.id, 'submit the invoice', async () => { const r = await submitInvoice(i.id); ok = !('error' in r); return r },
      { message: `${i.stageName} invoice submitted — an Owner or an Admin approves it`, actionLabel: 'Undo', onAction: () => { if (ok) void run('take the submission back', () => withdrawInvoiceSubmission(i.id), 'Submission taken back') } })
  }
  /** (fix-D, D-09) What the server refuses about sending this invoice, in its words — checked before WhatsApp opens. */
  const sendBlock = (i: InvoiceView): string | null => {
    if (i.status !== 'draft') return i.status === 'void' ? 'A void invoice is not sent — its fresh Draft is' : null
    if (i.amountMinor <= 0) return 'An invoice for S$0.00 has nothing to send'
    const lines = itemiseBlock(i, m.contractGstRate); if (lines) return lines   // (parity map, MI-031) an itemised stage whose lines no longer add up
    if (!viewer.sendsAtOnce) return 'Only an Owner or an Admin approves an invoice'
    if (locked) return locked
    return null
  }
  const send = async (i: InvoiceView, s: { phone: string; message: string }) => {
    if (busy === i.id) return   // (fix-D, D-09) a second press while the first is on its way opens nothing
    const why = sendBlock(i)
    if (why) { snackbar({ message: couldnt('send the invoice', why) }); return }
    window.open(`https://wa.me/65${s.phone}?text=${encodeURIComponent(s.message)}`, '_blank', 'noopener')   // on the press, before the round trip (REG-534)
    setBusy(i.id)
    try {
      const r = await sendInvoice(i.id)
      if ('error' in r) { snackbar({ message: couldnt('send the invoice', refusalOf(r.error)) }); return }
      setSending(null)
      /* (fix-D, D-10) the message named the number the send was to take; another send in between would give the next — say so */
      const renamed = data.nextInvoiceNumber && r.number !== data.nextInvoiceNumber ? ` — it went out as ${r.number}, not ${data.nextInvoiceNumber}; tell ${client.firstName}` : ''
      snackbar({ message: `${r.number} sent to ${client.firstName} — ${dueWords(r.dueAt)}${renamed}` })
      setFocus(i.id)
    } catch { snackbar({ message: couldnt('send the invoice') }) } finally { setBusy(null) }
  }
  /** (fix-D, D-44) "due 13 Oct ’26", or "due on receipt" with no payment terms */
  const dueWords = (dueAt: number) => (rules.termsDays === 0 ? 'due on receipt' : `due ${displayDate(new Date(dueAt))}`)
  /** What is worth knowing before an invoice goes — the milestone not reached, an amount off the schedule, (fix-D, D-10) a client without the portal */
  const sendNotes = (i: InvoiceView): string[] | undefined => {
    const out: string[] = []
    if (i.state !== 'ready' && i.state !== 'awaiting' && i.milestone) out.push(`${i.milestone.title} isn’t ${i.milestone.due === 'start' ? 'under way' : 'done'} yet`)
    if (i.differsMinor) out.push(`It differs from the schedule by ${money2(Math.abs(i.differsMinor))} — ${i.varianceReason}`)
    if (!data.portalAccess) out.push(data.payTo ? `${client.firstName} has no portal — the message carries a link to the invoice that opens without signing in, the bank and PayNow details and the reference.` : `${client.firstName} has no portal — the message carries a link to the invoice that opens without signing in. The studio has no bank details yet, so add them in Company › Profile.`)
    return out.length ? out : undefined
  }
  const voidIt = (i: InvoiceView, reason: string) => {
    setBusy(i.id)
    void voidInvoice(i.id, { reason }).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('void the invoice', refusalOf(r.error)) }); return }
      setVoiding(null)
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('bring the invoice back', () => undoVoidInvoice(r.undo), `${i.number} is no longer void`) } })
    }, () => { setBusy(null); snackbar({ message: couldnt('void the invoice') }) })
  }
  /* (REG-1067, F-08) the same press re-sizes the other unsent invoices — one sentence that names what moved, with Undo */
  const saveAmount = (i: InvoiceView, a: { amountMinor: number; reason: string | null }) => {
    setBusy(i.id)
    void setInvoiceAmount(i.id, a).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('change the invoice', refusalOf(r.error)) }); return }
      setEditing(null)
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the change', () => undoInvoiceAmount(r.undo), `The ${i.stageName} invoice is as it was`) } })
    }, () => { setBusy(null); snackbar({ message: couldnt('change the invoice') }) })
  }
  const markApproved = (v: VariationView, a: { on: number; via: string }) => {
    setBusy(v.id)
    void markVariationApproved(v.id, a).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt(`mark ${v.number} approved`, refusalOf(r.error)) }); return }
      setMarking(null)
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the approval', () => undoVariationApproval(r.undo), `${v.number} is no longer approved`) } })
    }, () => { setBusy(null); snackbar({ message: couldnt(`mark ${v.number} approved`) }) })
  }
  const rebalance = () => {
    setBusy('rebalance')
    void rebalanceProject(project.id).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('even out the invoices', refusalOf(r.error)) }); return }
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoRebalance(project.id, { undo: r.undo, eventId: r.eventId }), 'The invoices are as they were') } })
    }, () => { setBusy(null); snackbar({ message: couldnt('even out the invoices') }) })
  }

  /* ── (gaps build B) money in, complete ── */
  const handoverDay = data.handoverDay ?? null
  /** (item 6) the invoice's own link — opens without signing in (sent and void invoices answer) */
  const linkOf = (i: Pick<InvoiceView, 'shareToken'>) => (i.shareToken ? `${origin}/invoice/${i.shareToken}` : null)
  const copyLink = (i: InvoiceView) => {
    const url = linkOf(i)
    if (!url) { snackbar({ message: couldnt('copy the link', 'It has no link yet') }); return }
    void navigator.clipboard?.writeText(url).then(() => snackbar({ message: `Link to ${i.label ?? 'the invoice'} copied — it opens without signing in` }), () => snackbar({ message: couldnt('copy the link') }))
  }
  /* (item 1) Bill this VO */
  const billVo = (v: VariationView) => {
    setBusy(v.id)
    void billVariation(v.id).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt(`bill ${v.number}`, refusalOf(r.error)) }); return }
      setFocus(r.id)
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('take the invoice back', () => undoBillVariation(r.undo), `${v.number} is not billed`) } })
    }, () => { setBusy(null); snackbar({ message: couldnt(`bill ${v.number}`) }) })
  }
  /* (items 2 · 3 · 4) a one-off — made, or changed while it is a Draft; the dialog closes once the save lands */
  const saveOneOff = (a: Parameters<typeof createOneOffInvoice>[1]) => {
    const edit = oneOff && oneOff !== 'new' ? oneOff : null
    setBusy('one-off')
    void (edit ? updateOneOffInvoice(edit.id, a) : createOneOffInvoice(project.id, a)).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt(edit ? 'save the invoice' : 'make the invoice', refusalOf(r.error)) }); return }
      setOneOff(null)
      /* (simplify S-07) its row sits in Billing's "Outside the stages" now */
      if ('id' in r) { setFocus(r.id); snackbar({ message: `${r.title} is a Draft — send it from Client payments, under Outside the stages` }) } else snackbar({ message: `${a.title} saved` })
    }, () => { setBusy(null); snackbar({ message: couldnt('save the invoice') }) })
  }
  const saveDetails = (i: InvoiceView, a: Parameters<typeof setInvoiceDetails>[1]) => {
    setBusy(i.id)
    void setInvoiceDetails(i.id, a).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('save the details', refusalOf(r.error)) }); return }
      setDetails(null)
      snackbar({ message: r.what.length ? `The ${i.stageName} invoice’s ${r.what.join(' and ')} saved` : 'Nothing changed' })
    }, () => { setBusy(null); snackbar({ message: couldnt('save the details') }) })
  }
  const removeIt = (i: InvoiceView) => {
    setBusy(i.id)
    void removeDraftInvoice(i.id).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('remove the invoice', refusalOf(r.error)) }); return }
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('bring the invoice back', () => undoRemoveInvoice(r.undo), `The ${i.stageName} invoice is back`) } })
    }, () => { setBusy(null); snackbar({ message: couldnt('remove the invoice') }) })
  }
  /* (item 9) an invoice made elsewhere, recorded */
  const recordExternal = (a: { reference: string; amountMinor: number; issuedOn: number; dueOn: number | null; stageRef: string | null; note: string; file: { name: string; dataUrl: string } | null }) => {
    setBusy('record')
    void recordExternalInvoice(project.id, { ...a, file: a.file ? { name: a.file.name, dataUrl: a.file.dataUrl } : null }).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('record the invoice', refusalOf(r.error)) }); return }
      setRecording(false); setFocus(r.id)
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('take the record back', () => undoRecordExternal(r.undo), `${a.reference} is no longer recorded`) } })
    }, () => { setBusy(null); snackbar({ message: couldnt('record the invoice') }) })
  }
  /* (item 11) remind the approvers — once an hour per person */
  const approverBlock = (i: InvoiceView) => approverRemindBlock(data.approverReminded?.[i.id] ?? null, now)
  const remindApproval = (i: InvoiceView) => {
    const block = approverBlock(i)
    if (block) { snackbar({ message: couldnt('remind them', block) }); return }
    void act(i.id, 'remind the approvers', () => remindApprovers(i.id), `Owners and Admins were reminded about the ${i.stageName} invoice`)
  }
  /* (item 13) the project's own payment split */
  const saveSplit = (a: Parameters<typeof setProjectSplit>[1]) => {
    setBusy('split')
    void setProjectSplit(project.id, a).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('save the split', refusalOf(r.error)) }); return }
      setSplitOpen(false)
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('put the split back', () => undoProjectSplit(r.undo), 'The split is as it was') } })
    }, () => { setBusy(null); snackbar({ message: couldnt('save the split') }) })
  }
  const splitEditable = !!data.split && !data.split.block && viewer.prepares && !locked

  /* ── what one invoice offers ── */
  const owed = (i: InvoiceView) => i.balanceMinor - i.toConfirmMinor
  /** Its one next step — Send · Submit for approval · Approve and send · Record a payment — or Open (its panel) once nothing else waits. */
  const nextStep = (i: InvoiceView, openPanel?: (i: InvoiceView) => void): Step | null => {
    if ((i.state === 'ready' || i.state === 'awaiting') && i.amountMinor <= 0) return null   // (fix-D, D-09) a S$0 Draft has nothing to send — its menu says why
    /* (parity map, MI-031) an itemised stage whose amount moved since: its next step is its lines (Send would be refused) */
    if (i.state === 'ready' && !i.submittedAt && viewer.prepares && !locked && itemiseBlock(i, m.contractGstRate)) return { label: 'Change the lines', run: () => setDetails(i), testId: 'invoice-itemise-fix' }
    if (i.state === 'ready' && viewer.prepares && !locked) return viewer.sendsAtOnce ? { label: 'Send', run: () => setSending(i), testId: 'invoice-send' } : { label: 'Submit for approval', run: () => submit(i), testId: 'invoice-submit' }
    if (i.state === 'awaiting' && viewer.approves && !locked) return { label: 'Approve and send', run: () => setSending(i), testId: 'invoice-approve' }
    /* (Projects round 6, F-10) a sent invoice with something owed: Record a payment */
    if ((i.state === 'sent' || i.state === 'overdue' || i.state === 'part_paid') && payments.canRecord && owed(i) > 0) return { label: 'Record a payment', run: () => payments.recordFor(i), testId: 'invoice-record' }
    /* (simplify S-08) a sent, paid or void one opens its panel — its payments, credit notes and history in one place. (the calm UI build
       2026-10-27, 3-05 · T-02) no "Open" verb beside the ⋮: the row and its name open the panel (billing-section.tsx `nameButton`, which keeps
       this step's mark) — a row shows a verb only for a real next step */
    void openPanel
    return null
  }
  /** Today's row menu, as rows any ⋮ can carry (the Billing row's, the panel's) — a refusal says why in its row. */
  const menuItems = (i: InvoiceView): RowAction[] => {
    const draft = i.status === 'draft'
    const out: RowAction[] = []
    const notReady = i.amountMinor > 0 && i.milestone && i.state !== 'ready' ? `${i.milestone.title} isn’t ${i.milestone.due === 'start' ? 'under way' : 'done'} yet` : undefined
    const teamRule = 'Only the project’s team, Owners and Admins change it'
    out.push({ label: draft ? 'Preview the invoice' : 'Open the invoice', run: () => router.push(invoiceHref(i)), help: 'The printable page — as the client reads it' })
    if (draft && !i.submittedAt && (i.state !== 'ready' || i.amountMinor <= 0) && viewer.prepares && !locked) {
      out.push(viewer.sendsAtOnce
        ? { label: 'Send now', run: () => setSending(i), disabled: i.amountMinor <= 0, help: i.amountMinor <= 0 ? 'It is S$0.00 — nothing to send' : notReady }
        : { label: 'Submit for approval', run: () => submit(i), disabled: i.amountMinor <= 0, help: i.amountMinor <= 0 ? 'It is S$0.00 — nothing to send' : notReady })
    }
    /* (Projects round 6, F-10 · F-14) a sent invoice with something owed */
    if (i.status === 'sent' && owed(i) > 0 && payments.canRecord) {
      out.push({ label: 'Record a payment', run: () => payments.recordFor(i) })
      out.push({ label: 'Remind on WhatsApp', run: () => payments.remind(i), help: `Opens WhatsApp with the message to ${client.firstName}` })
    }
    const draftBlock = locked ?? (!viewer.prepares ? teamRule : undefined)
    if (draft && i.kind !== 'one_off' && i.kind !== 'variation') {
      const why = draftBlock ?? (i.submittedAt ? (viewer.approves ? 'Waiting for approval — send it back first' : i.submittedBy === viewer.id ? 'Waiting for approval — take the submission back first' : 'Waiting for an Owner’s or an Admin’s approval') : undefined)
      out.push({ label: 'Change the amount', run: () => setEditing(i), disabled: !!why, help: why })
    }
    /* (gaps build B, items 2 · 3 · 4) a one-off's lines; any Draft's description, note to the client and due day */
    if (draft && i.kind === 'one_off') {
      const why = draftBlock ?? (i.submittedAt ? 'Waiting for approval — it changes once it is sent back' : undefined)
      out.push({ label: 'Edit the invoice', run: () => setOneOff(i), disabled: !!why, help: why })
    }
    if (draft && i.kind !== 'one_off') {
      const why = draftBlock ?? (i.submittedAt ? 'Waiting for approval — it changes once it is sent back' : undefined)
      out.push({ label: 'Description, note and due day', run: () => setDetails(i), disabled: !!why, help: why ?? dueModeWords(i, { termsDays: rules.termsDays, handoverDay }) })
    }
    /* (item 11) the submitter's nudge — once an hour per person */
    if (i.state === 'awaiting' && !viewer.approves && viewer.prepares && !locked) { const b = approverBlock(i); out.push({ label: 'Remind the approvers', run: () => remindApproval(i), disabled: !!b, help: b ?? undefined }) }
    /* (item 6) its no-login link, once it is sent */
    if (i.status !== 'draft' && i.shareToken && i.kind !== 'external') out.push({ label: 'Copy the invoice link', run: () => copyLink(i), help: 'Opens without signing in — for a client not on the portal' })
    if (draft && (i.kind === 'one_off' || i.kind === 'variation')) {
      const why = draftBlock ?? (i.submittedAt ? 'Waiting for approval — it is sent back first' : undefined)
      out.push({ label: 'Remove the Draft', run: () => removeIt(i), tone: 'danger', disabled: !!why, help: why })
    }
    if (i.state === 'awaiting' && viewer.approves && !locked) out.push({ label: 'Send back', run: () => setSendingBack(i) })
    if (i.state === 'awaiting' && !viewer.approves && !locked && i.submittedBy === viewer.id) out.push({ label: 'Take the submission back', run: () => { void run('take the submission back', () => withdrawInvoiceSubmission(i.id), 'Submission taken back') } })
    if (cn.canIssue(i)) out.push({ label: 'Issue a credit note', run: () => cn.openIssue(i), help: `Takes money off it — ${client.firstName} sees it` })
    if (i.status === 'sent') {
      const why = locked ?? (!viewer.voids ? VOID_RULE : i.paidMinor > 0 ? 'A payment is recorded against it' : undefined)
      out.push({ label: 'Void', run: () => setVoiding(i), tone: 'danger', disabled: !!why, help: why })
    }
    return out
  }

  /* ── a variation order ── */
  /* (the calm UI build 2026-10-27, 3-05 · T-02) a verb only for a real next step — the VO's number opens it (billing-section.tsx keeps "Open"'s mark there) */
  const voNext = (v: VariationView): Step | null => (v.billable && !m.stageDraftsLeft && viewer.prepares && !locked
    ? { label: 'Bill it', run: () => billVo(v), testId: 'vo-bill' }   /* (gaps build B, item 1) no unsent stage is left to carry it */
    : null)
  const voMenu = (v: VariationView): RowAction[] => {
    const out: RowAction[] = [{ label: `Preview ${v.number}`, run: () => router.push(withFrom(`/quotes/${v.id}/preview`, here)) }]
    if (v.billable && !m.stageDraftsLeft && viewer.prepares && !locked && !books) out.push({ label: `Open ${v.number}`, run: () => router.push(withFrom(`/quotes/${v.id}`, here)) })
    /* (gaps build B, item 1 — 1.0 G-131 · G-134) its own invoice: while unsent stages remain they carry its money and give it back when it is billed */
    if (v.approved && v.amountMinor > 0) {
      const why = locked ?? (!viewer.prepares ? SEND_RULE : v.billedBy ? `Billed already — ${v.billedBy.label ?? 'its own invoice is a Draft'}` : undefined)
      out.push({ label: `Bill ${v.number} on its own`, run: () => billVo(v), disabled: !v.billable || !!why, help: why ?? (m.stageDraftsLeft ? 'The unsent stage invoices carry it now — billing it on its own takes it back from them' : 'No unsent stage invoice is left to carry it') })
    }
    if (!v.approved) {
      const why = locked ?? (!viewer.marksApproved ? 'Only an Owner or an Admin records an approval given outside the link' : !v.amountMinor ? `${v.number} changes nothing yet — add its lines first` : undefined)
      out.push({ label: 'Mark as approved by the client', run: () => setMarking(v), disabled: !!why, help: why ?? 'Approved in person, on WhatsApp, by email or on paper' })
    }
    /* (parity map, MI-104 — 1.0's Delete on the VO list) a Draft, one waiting for approval, with the client or declined deletes with Undo (it is
       under Deleted variation orders); an approved one is part of the contract — the row says why instead of offering it */
    {
      const why = locked ?? variationDeleteBlock(v.status) ?? (canDeleteQuote({ id: viewer.id, role: viewer.role }, { createdBy: v.createdBy ?? null }) ? null : DELETE_RULE)
      out.push({ label: `Delete ${v.number}`, run: () => deleteVo(v), tone: 'danger', disabled: !!why, help: why ?? `It goes to Deleted variation orders — ${client.firstName} no longer sees it` })
    }
    return out
  }
  /* (parity map, MI-104) the VO's Delete: soft, one sentence + Undo; the server's rule (an approved one stays) answers in the row and here */
  const deleteVo = (v: VariationView) => {
    setBusy(v.id)
    void deleteQuotes([v.id]).then((r) => {
      setBusy(null)
      if (!('deleted' in r) || !r.deleted) { snackbar({ message: couldnt(`delete ${v.number}`, refusalOf(r.error ?? DELETE_RULE)) }); return }   // (S45C) a role's refusal reads as the rule's own words
      snackbar({ message: `${v.number} deleted — it’s under Deleted variation orders`, actionLabel: 'Undo', onAction: () => { void run(`bring ${v.number} back`, async () => { const x = await orThrow(restoreQuotes([v.id])); return x.restored ? x : { error: DELETE_RULE } }, `${v.number} is back`, { refresh: true }) } })
    }, () => { setBusy(null); snackbar({ message: couldnt(`delete ${v.number}`) }) })
  }

  const voContract = marking ? m.contractMinor + marking.amountMinor : 0
  /* (gaps build B, item 4) the day it falls due if it goes today — its own (a day picked, the handover day), else the terms */
  const dueOfDraft = (i: InvoiceView) => dueOf(i, { sentAt: today, termsDays: rules.termsDays, handoverDay })
  const dueTerms = (i: InvoiceView) => !i.dueMode && rules.termsDays === 0
  const dueIfSentToday = sending ? displayDate(dueOfDraft(sending)) : ''
  const isExtra = (i: InvoiceView) => i.outside || i.kind === 'variation'

  const dialogs = (
    <>
      {sending ? (
        <SendContractDialog open={!!sending} onClose={() => setSending(null)} title={`Send the ${sending.stageName} invoice`}
                            subtitle={`${money2(sending.amountMinor)}, ${dueTerms(sending) ? 'due on receipt' : `due ${dueIfSentToday}`}. It’s numbered${data.nextInvoiceNumber ? ` ${data.nextInvoiceNumber}` : ''} and recorded as sent, and WhatsApp opens with the message.`}
                            link={data.portalAccess ? `${origin}${data.portalUrl}` : undefined} phoneLabel="Client phone" copyDone="Portal link copied" sendLabel="Send on WhatsApp"
                            defaults={{ name: client.name, phone: client.phone }}
                            draft={(name) => invoiceMessage({ client: name, studio: data.studioName, stage: sending.stageName, amount: money2(sending.amountMinor), due: dueTerms(sending) ? null : dueIfSentToday, url: data.portalAccess ? `${origin}${data.portalUrl}` : null, number: data.nextInvoiceNumber ?? null, payTo: data.payTo ?? null, link: data.portalAccess ? null : linkOf(sending), oneOff: isExtra(sending) })}
                            notes={sendNotes(sending)} busy={busy === sending.id}
                            onSend={(s) => send(sending, s)} />
      ) : null}
      <AmountDialog open={!!editing} stage={editing?.stageName ?? ''} amount={editing?.amountMinor ?? 0} expected={editing?.expectedMinor ?? null} reason={editing?.varianceReason ?? null}
                    others={editing ? m.invoices.filter((x) => x.status === 'draft' && x.id !== editing.id && !x.varianceReason).map((x) => x.stageName) : []}
                    busy={!!editing && busy === editing.id} onClose={() => setEditing(null)} onSave={(a) => { if (editing) saveAmount(editing, a) }} />
      <NoteDialog open={!!voiding} title={`Void ${voiding?.number ?? 'the invoice'}`} label="Why is it void?" action="Void" required maxLength={300} busy={!!voiding && busy === voiding.id}
                  help={`It stays on the record with this reason; a fresh ${voiding?.stageName ?? ''} Draft takes its share.`}
                  onClose={() => setVoiding(null)} onSubmit={(reason) => { if (voiding) voidIt(voiding, reason) }} />
      <NoteDialog open={!!sendingBack} title="Send back" label="What should change?" action="Send back" required maxLength={300} busy={!!sendingBack && busy === sendingBack.id}
                  help={`${nameOf(sendingBack?.submittedBy ?? null)} reads this on the Money tab; ${client.firstName} never sees it.`}
                  onClose={() => setSendingBack(null)}
                  onSubmit={(note) => { const i = sendingBack; if (!i) return; void act(i.id, 'send the invoice back', async () => { const r = await sendBackInvoice(i.id, { note }); if (!('error' in r)) setSendingBack(null); return r }, `Sent back to ${nameOf(i.submittedBy)}`) }} />
      {/* (gaps build B) money in, complete */}
      <OneOffDialog open={!!oneOff} initial={oneOff && oneOff !== 'new' ? oneOff : null} gstRate={m.gstRate} termsDays={rules.termsDays} handoverDay={handoverDay} today={today}
                    busy={busy === 'one-off'} onClose={() => setOneOff(null)} onSave={saveOneOff} />
      <InvoiceDetailsDialog open={!!details} invoice={details} termsDays={rules.termsDays} handoverDay={handoverDay} today={today} busy={!!details && busy === details.id} gstRate={m.contractGstRate}
                            onClose={() => setDetails(null)} onSave={(a) => { if (details) saveDetails(details, a) }} />
      <RecordExternalDialog open={recording} stages={data.recordable ?? []} today={today} busy={busy === 'record'} onClose={() => setRecording(false)} onSave={recordExternal} />
      <SplitDialog open={splitOpen} split={data.split ?? null} valueMinor={m.contractMinor || null} busy={busy === 'split'} onClose={() => setSplitOpen(false)} onSave={saveSplit} />
      <VoUploadDialog open={voUpload} projectId={project.id} onClose={() => setVoUpload(false)} onMade={(id) => { setVoUpload(false); router.push(withFrom(`/quotes/${id}`, here)) }} />
      <MarkApprovedDialog open={!!marking} number={marking?.number ?? ''} client={client.firstName} contractAfter={voContract} today={today} busy={!!marking && busy === marking.id}
                          onClose={() => setMarking(null)} onSave={(a) => { if (marking) markApproved(marking, a) }} />
      <DeletedQuotesSheet open={deletedVos} variation onClose={() => setDeletedVos(false)} load={loadDeletedVos} crumb={project.name}
                          onRestore={async (ids) => { const r = await orThrow(restoreQuotes(ids)); snackbar({ message: r.restored ? `${r.restored === 1 ? 'Variation order' : `${r.restored} variation orders`} back on Money` : 'Only its creator, an Owner or an Admin restores it' }); router.refresh() }}
                          onDeleteForever={async (ids) => { const r = await orThrow(deleteQuotesForever(ids)); snackbar({ message: `${r.deleted} deleted forever${r.refused ? ` · ${r.refused} kept` : ''}` }); router.refresh() }}
                          onEmptyTrash={async () => { const r = await orThrow(emptyQuoteTrash(project.leadId, 'variation')); snackbar({ message: `${r.deleted} ${r.deleted === 1 ? 'variation order' : 'variation orders'} deleted forever${r.refused ? ` · ${r.refused} kept` : ''}` }); router.refresh() }} />
    </>
  )

  return {
    busy, locked, here, nameOf, invoiceHref, linkOf, copyLink, sendBlock, approverBlock, splitEditable, owed,
    nextStep, menuItems, voNext, voMenu,
    newVariation, submit, billVo, rebalance, remindApproval,
    openSend: (i: InvoiceView) => setSending(i), openSendBack: (i: InvoiceView) => setSendingBack(i), openAmount: (i: InvoiceView) => setEditing(i),
    openOneOff: (i: InvoiceView | 'new') => setOneOff(i), openRecordExternal: () => setRecording(true), openSplit: () => setSplitOpen(true),
    openVoUpload: () => setVoUpload(true), openDeletedVos: () => setDeletedVos(true), openMarkApproved: (v: VariationView) => setMarking(v),
    dialogs,
  }
}
