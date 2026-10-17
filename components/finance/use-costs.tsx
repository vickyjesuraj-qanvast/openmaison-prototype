'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { copyText } from '@/lib/clipboard'
import { waLink } from '@/lib/portal/model'
import type { EntityOption } from '@/lib/finance/entity-scope'
import { displayDate, phoneLocal } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { payable, type BillView, type CostSummary, type ExpenseView, type PoView } from '@/lib/finance/costs'
import {
  ANSWER_VIA, BILL_STATE_LABEL, BILL_STATE_TONE, EXPENSE_STATE_LABEL, EXPENSE_STATE_TONE, EXTERNAL_PO_WORDS, PO_STATE_LABEL, PO_STATE_TONE, binds, editable, lateDeliveryMessage, lateDeliveryTitle, methodLabel, poMessage, termsLabel, viaWords,
  type PayoutRecord, type VendorRecord,
} from '@/lib/finance/model'
import { BILL_WAITS_RULE, PO_RULE, billWaitWhy, billWaitWords, expenseWaits, poWaits, type CostRules } from '@/lib/finance/rules'
import type { CostPerson, CostProject, CostViewer, PoContext } from '@/lib/finance/queries'
import {
  cancelPo, closePo, duplicatePo, markPoAccepted, markPoDelivered, poHistory, recordExternalPo, removePo, savePo, sendBackPo, sendPo, submitPo, undoCancelPo, undoClosePo, undoPoAnswer, undoPoDelivered, undoRemovePo, withdrawPo,
  type ExternalPoInput, type PoInput,
} from '@/app/finance/po-actions'
import {
  answerExpense, recordBill, recordPayout, removeBill, removeExpense, reversePayout, saveExpense, stopExpenseRepeat, undoExpenseAnswer, undoPayout, undoRemoveBill, undoRemoveExpense, undoReversePayout, undoStopExpenseRepeat, updateBill,
  approveBill, undoBillApproval,   // (S44R, C8)
  type BillInput, type ExpenseInput,
} from '@/app/finance/cost-actions'
import { repeatLabel, repeatWords } from '@/lib/finance/repeats'
import { poContextAction } from '@/app/finance/read-actions'
import { PoDialog, type PoSaveThen } from './po-dialog'
import { BillDialog } from './bill-dialog'
import { ExpenseDialog } from './expense-dialog'
import { PayoutDialog, type PayoutTarget } from './payout-dialog'
import { ExternalPoDialog } from './external-po-dialog'
import { CostPanel, type PanelHistory, type PanelList } from './cost-panel'
import { tagOf, type Next, type RowAction } from './cost-tables'
import money from '@/components/projects/money/money.module.css'

/*
 * (gaps build F1 — money out) The one orchestrator of money out's steps — the Money tab's Costs half and Finance's pages both call it: the
 * dialogs (a PO, a bill, an expense, a payment), the record's side panel, the WhatsApp send, and every step's sentence with its Undo. Who may
 * do what is the server's (lib/finance/rules.ts) — what it would refuse is not offered here, and a refusal it answers is said in its words.
 */
export type CostsHost = {
  summary: CostSummary
  vendors: VendorRecord[]
  projects: CostProject[]
  /** the Money tab: its project and the PO context it carries */ fixed: { project: CostProject; context: PoContext } | null
  rules: CostRules
  viewer: CostViewer
  people: CostPerson[]
  trades: string[]
  gstRate: number
  now: number
  /** the studio's name, for the vendor's message */ studio: string
  /** (parity map, MO-058 · MO-079) the issuing entities — empty with fewer than two */ entities?: EntityOption[]
  /** (pending modules S06) the studio's expense categories (Settings › Finance › Money out) */ categories: string[]
}
type Panel = { kind: 'po' | 'bill' | 'expense'; id: string } | null

export function useCosts(h: CostsHost) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [busy, setBusy] = useState<string | null>(null)
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))
  const [added, setAdded] = useState<VendorRecord[]>([])
  const vendors = [...h.vendors, ...added.filter((a) => !h.vendors.some((v) => v.id === a.id))]
  const vendorOf = (id: string | null) => vendors.find((v) => v.id === id) ?? null
  const personName = (id: string | null) => (id ? h.people.find((p) => p.id === id)?.name ?? 'Someone' : 'Someone')
  const projectOf = (id: string | null) => (id ? h.projects.find((p) => p.id === id) ?? (h.fixed?.project.id === id ? h.fixed.project : null) : null)
  const prepares = (projectId: string) => projectOf(projectId)?.prepares ?? false
  /* (parity map, MO-098) recording — a bill, an expense, a PO made elsewhere, a delivery: the team, and Accounting on every project */
  const records = (projectId: string) => projectOf(projectId)?.records ?? false
  const locked = (projectId: string) => projectOf(projectId)?.locked ?? null
  const [focus, setFocus] = useState<string | null>(null)

  /* ── dialogs ── */
  const [poDialog, setPoDialog] = useState<{ initial: PoView | null } | null>(null)
  const [poCtx, setPoCtx] = useState<PoContext | null>(null)
  const [sendId, setSendId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<PoView | null>(null)
  const [acceptVia, setAcceptVia] = useState('phone')
  const [noting, setNoting] = useState<{ kind: 'cancel' | 'close' | 'sendBack' | 'expenseBack' | 'reverse'; id: string; title: string } | null>(null)
  const [billDialog, setBillDialog] = useState<{ initial: BillView | null; poId?: string | null; /** (simplify round 2) a dropped bill, read as it opens */ file?: File | null } | null>(null)
  const [dup, setDup] = useState<{ input: BillInput; message: string } | null>(null)
  const [expenseDialog, setExpenseDialog] = useState<{ initial: ExpenseView | null } | null>(null)
  /* (pending modules S19 — 1.0's plan gating: expenses are Pro — "the Expenses screens, the expense report and expense actions" locked; reports
     keep counting what was recorded) on Free logging, changing, approving, stopping or removing one opens the lock card; a claim still owed
     is still paid back */
  const expLock = usePlanLock('expense_management')
  const [paying, setPaying] = useState<PayoutTarget | null>(null)
  const [recording, setRecording] = useState(false)   // (parity map, MO-038) Record a PO made elsewhere
  const [panel, setPanel] = useState<Panel>(null)
  /* `?open=<id>` (the bell, Activity, the search): asked for once, resolved against the records on the next render (the render-phase adjust) */
  const [requested, setRequested] = useState<string | null>(null)
  if (requested) {
    const kind = h.summary.pos.some((p) => p.id === requested) ? 'po' : h.summary.bills.some((b) => b.id === requested) ? 'bill' : h.summary.expenses.some((e) => e.id === requested) ? 'expense' : null
    setRequested(null)
    if (kind) setPanel({ kind, id: requested })
  }
  const [history, setHistory] = useState<{ id: string; rows: { at: number; kind: string; actorId: string | null; detail: Record<string, unknown> }[] } | null>(null)

  const sendPoView = sendId ? h.summary.pos.find((p) => p.id === sendId) ?? null : null
  const linkOf = (p: { vendorToken: string | null }) => (p.vendorToken ? `${origin}/po/${p.vendorToken}` : '')

  /* the panel's PO history (its Activity lines), read when it opens and again whenever the PO moves */
  const panelPo = panel?.kind === 'po' ? h.summary.pos.find((p) => p.id === panel.id) ?? null : null
  const panelPoId = panelPo?.id ?? null
  const stamp = panelPo ? `${panelPo.status}|${panelPo.updatedAt}|${panelPo.vendorAnsweredAt}|${panelPo.sentAt}|${panelPo.submittedAt}|${panelPo.paidMinor}|${panelPo.deliveredAt}` : ''
  useEffect(() => {
    if (!panelPoId) return
    let live = true
    void poHistory(panelPoId).then((r) => { if (live && !('error' in r)) setHistory({ id: panelPoId, rows: r }) }, () => undefined)
    return () => { live = false }
  }, [panelPoId, stamp])
  const historyRows: PanelHistory[] = history && history.id === panelPoId ? history.rows.map((x, i) => ({ key: `${i}`, at: x.at, text: historyWords(x.kind, x.detail, personName(x.actorId)) })) : []

  const act = async (key: string, what: string, fn: () => Promise<unknown>, done?: Parameters<typeof run>[2]) => {
    setBusy(key)
    try { return await run(what, fn, done) } finally { setBusy(null) }
  }

  /* ── POs ── */
  const newPo = (projectId?: string) => {
    if (h.fixed) { setPoCtx(h.fixed.context); setPoDialog({ initial: null }); return }
    setPoCtx(null); setPoDialog({ initial: null })
    if (projectId) void pickProject(projectId)
  }
  const pickProject = async (projectId: string) => {
    const c = await poContextAction(projectId).catch(() => null)
    if (!c) { snackbar({ message: couldnt('start the PO', PO_RULE) }); return }   // (pending modules S06) the rule's own words
    setPoCtx(c)
  }
  const editPo = async (po: PoView) => {
    if (h.fixed) setPoCtx(h.fixed.context); else { setPoCtx(null); void pickProject(po.projectId) }
    setPoDialog({ initial: po })
  }
  const savePoAnd = async (input: PoInput, then: PoSaveThen) => {
    setBusy('po')
    try {
      const r = await savePo(input)
      if ('error' in r) { snackbar({ message: couldnt('save the PO', refusalOf(r.error)) }); return }
      setPoDialog(null); setFocus(r.id)
      if (then === 'send') { setSendId(r.id); return }
      if (then === 'submit') {
        const s = await submitPo(r.id)
        snackbar({ message: 'error' in s ? couldnt('submit the PO', refusalOf(s.error)) : `${r.number} saved and submitted — an Owner or an Admin approves it`, ...('error' in s ? {} : { actionLabel: 'Undo', onAction: () => { void run('take the submission back', () => withdrawPo(r.id), `${r.number} is a Draft again`) } }) })
        return
      }
      snackbar({ message: `${r.number} saved as a Draft` })
    } catch (e) { snackbar({ message: couldnt('save the PO', refusalOf(e)) }) } finally { setBusy(null) }
  }
  const sendNow = async (po: PoView, o: { phone: string; message: string }) => {
    if (busy === po.id) return
    window.open(`https://wa.me/65${o.phone}?text=${encodeURIComponent(o.message)}`, '_blank', 'noopener')   // on the press, before the round trip (REG-534)
    setBusy(po.id)
    try {
      const r = await sendPo(po.id)
      if ('error' in r) { snackbar({ message: couldnt('send the PO', refusalOf(r.error)) }); return }
      setSendId(null); setFocus(po.id)
      snackbar({ message: `${r.number} sent to ${vendorOf(po.vendorId)?.name ?? 'the vendor'}${r.dueOn ? ` — to be paid by ${displayDate(new Date(r.dueOn))}` : ''}` })
    } catch (e) { snackbar({ message: couldnt('send the PO', refusalOf(e)) }) } finally { setBusy(null) }
  }
  /* (parity map, MO-038) a PO made elsewhere, recorded */
  const saveExternal = async (i: ExternalPoInput) => {
    setBusy('external')
    try {
      const r = await recordExternalPo(i)
      if ('error' in r) { snackbar({ message: couldnt('record the PO', refusalOf(r.error)) }); return }
      setRecording(false); setFocus(r.id)
      snackbar({ message: `PO ${r.number} recorded — ${money2(i.amountMinor)}` })   // invented copy (parity map, MO-038)
    } catch (e) { snackbar({ message: couldnt('record the PO', refusalOf(e)) }) } finally { setBusy(null) }
  }
  /* (parity map, MO-094 · PR-089) Mark delivered — the late-delivery row and bell end; Undo */
  const markDelivered = (po: PoView) => act(po.id, 'mark it delivered', async () => {
    const r = await markPoDelivered(po.id)
    if (!('error' in r)) snackbar({ message: `${po.number} marked delivered`, actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoPoDelivered(r.undo), `${po.number} is not marked delivered`) } })   // invented copy (parity map, MO-094)
    return r
  })
  /* (MO-094) the vendor's WhatsApp about a late delivery — opened on the press (REG-534), nothing recorded */
  const messageVendor = (po: PoView) => {
    const v = vendorOf(po.vendorId)
    if (!v?.phone) { snackbar({ message: `No mobile on file for ${v?.name ?? 'the vendor'} — add one in Finance › Vendors` }); return }
    const p = projectOf(po.projectId)
    window.open(waLink(v.phone, lateDeliveryMessage({ vendor: v.name, contact: v.contactName, studio: h.studio, number: po.number, expected: po.expectedOn ? displayDate(new Date(po.expectedOn)) : 'the day agreed', where: p?.address ?? p?.name ?? '' })), '_blank', 'noopener')
  }
  const deliverable = (p: PoView) => records(p.projectId) && binds(p.state) && !p.deliveredAt
  const resend = (po: PoView) => setSendId(po.id)
  const copyLink = (po: PoView) => { void copyText(linkOf(po)).then(() => snackbar({ message: `The link to ${po.number} is copied — it opens without signing in` }), () => snackbar({ message: 'Couldn’t copy the link' })) }
  const submit = (po: PoView) => act(po.id, 'submit the PO', () => submitPo(po.id), { message: `${po.number} submitted — an Owner or an Admin approves it`, actionLabel: 'Undo', onAction: () => { void run('take the submission back', () => withdrawPo(po.id), `${po.number} is a Draft again`) } })
  const remove = async (po: PoView) => {
    setBusy(po.id)
    try {
      const r = await removePo(po.id)
      if ('error' in r) { snackbar({ message: couldnt('remove the PO', refusalOf(r.error)) }); return }
      if (panel?.id === po.id) setPanel(null)
      snackbar({ message: po.external ? `The record of ${po.number} is removed` : `${po.number} removed`, actionLabel: 'Undo', onAction: () => { void run('bring the PO back', () => undoRemovePo(r.undo), `${po.number} is back`) } })
    } finally { setBusy(null) }
  }
  const duplicate = async (po: PoView) => {
    setBusy(po.id)
    try {
      const r = await duplicatePo(po.id)
      if ('error' in r) { snackbar({ message: couldnt('duplicate the PO', refusalOf(r.error)) }); return }
      setFocus(r.id); setPanel({ kind: 'po', id: r.id })
      snackbar({ message: `${po.number} copied as ${r.number}, a Draft` })
    } finally { setBusy(null) }
  }
  const accept = async (po: PoView, via: string) => {
    setBusy(po.id)
    try {
      const r = await markPoAccepted(po.id, { via })
      if ('error' in r) { snackbar({ message: couldnt('mark it accepted', refusalOf(r.error)) }); return }
      setAccepting(null)
      snackbar({ message: `${po.number} accepted ${viaWords(via)}`, actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoPoAnswer(r.undo), `${po.number} is as it was`) } })
    } finally { setBusy(null) }
  }
  const noteDone = async (note: string) => {
    if (!noting) return
    const { kind, id, title } = noting
    setBusy(`note:${id}`)
    try {
      if (kind === 'cancel') {
        const r = await cancelPo(id, { reason: note }); if ('error' in r) { snackbar({ message: couldnt('cancel the PO', refusalOf(r.error)) }); return }
        setNoting(null); snackbar({ message: `${title} cancelled — its link says so`, actionLabel: 'Undo', onAction: () => { void run('bring it back', () => undoCancelPo(r.undo), `${title} is back with the vendor`) } })
      } else if (kind === 'close') {
        const r = await closePo(id, { note }); if ('error' in r) { snackbar({ message: couldnt('close the PO', refusalOf(r.error)) }); return }
        setNoting(null); snackbar({ message: `${title} closed — what is left isn’t owed`, actionLabel: 'Undo', onAction: () => { void run('open it again', () => undoClosePo(r.undo), `${title} is open again`) } })
      } else if (kind === 'sendBack') {
        const r = await sendBackPo(id, { note }); if ('error' in r) { snackbar({ message: couldnt('send it back', refusalOf(r.error)) }); return }
        setNoting(null); snackbar({ message: `${title} sent back with your note` })
      } else if (kind === 'expenseBack') {
        const r = await answerExpense(id, { approve: false, note }); if ('error' in r) { snackbar({ message: couldnt('send it back', refusalOf(r.error)) }); return }
        setNoting(null); snackbar({ message: `“${title}” sent back with your note`, actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoExpenseAnswer(r.undo), 'It waits for approval again') } })
      } else if (kind === 'reverse') {
        const r = await reversePayout(id, { reason: note }); if ('error' in r) { snackbar({ message: couldnt('reverse the payment', refusalOf(r.error)) }); return }
        setNoting(null); snackbar({ message: `${title} reversed — it counts for nothing now`, actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoReversePayout(r.undo), 'The payment counts again') } })
      }
    } catch (e) { snackbar({ message: couldnt('do it', refusalOf(e)) }) } finally { setBusy(null) }
  }
  /* (simplify S-10 · F1 §6.9.3) Pay shows whom to pay: the vendor's bank and PayNow, for whoever sees them (seesBank — Owners and Admins). (simplify
     round 2) A claim's Pay back shows the member's own PayNow (Company › Members), handed in only to whoever pays (`fetchPeople`). */
  const bankOf = (vendorId: string | null): PayoutTarget['bank'] => {
    const v = vendorOf(vendorId)
    const b = v?.bank
    return b && (b.accountNo || b.payNow) ? { name: b.accountName || v!.name, bankName: b.bankName, accountNo: b.accountNo, payNow: b.payNow } : null
  }
  const memberPayTo = (id: string | null): PayoutTarget['bank'] => {
    const m = id ? h.people.find((p) => p.id === id) : null
    return m?.paynow ? { name: m.name, bankName: null, accountNo: null, payNow: m.paynow } : null
  }
  const payTarget = (o: { po?: PoView; bill?: BillView; expense?: ExpenseView }): PayoutTarget | null => {
    const owed = payable({ po: o.po, bill: o.bill, expense: o.expense, bills: h.summary.bills })
    if (o.po) return { kind: 'po', id: o.po.id, label: o.po.number, to: vendorOf(o.po.vendorId)?.name ?? 'the vendor', bank: bankOf(o.po.vendorId), ...owed }
    if (o.bill) return { kind: 'bill', id: o.bill.id, label: `Bill ${o.bill.reference}`, to: vendorOf(o.bill.vendorId)?.name ?? 'the vendor', bank: bankOf(o.bill.vendorId), ...owed }
    if (o.expense) return { kind: 'claim', id: o.expense.id, label: `“${o.expense.description}”`, to: personName(o.expense.claimantId), bank: memberPayTo(o.expense.claimantId), ...owed }
    return null
  }
  const pay = async (o: { amountMinor: number; paidOn: number; method: string; reference: string; note: string; proof: { name: string; dataUrl: string } | null }) => {
    if (!paying) return
    setBusy('pay')
    try {
      const r = await recordPayout({ kind: paying.kind, recordId: paying.id, ...o })
      if ('error' in r) { snackbar({ message: couldnt('record the payment', refusalOf(r.error)) }); return }
      setPaying(null)
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the payment', () => undoPayout(r.undo), 'The payment is undone') } })
    } catch (e) { snackbar({ message: couldnt('record the payment', refusalOf(e)) }) } finally { setBusy(null) }
  }

  const poNext = (p: PoView): Next => {
    const prep = prepares(p.projectId)
    if (p.state === 'draft' || p.state === 'sent_back') return prep ? (poWaits(h.viewer, h.rules, p) ? { label: 'Submit for approval', run: () => { void submit(p) }, testId: 'po-next-submit', act: 'submit' } : { label: 'Send', run: () => setSendId(p.id), testId: 'po-next-send', act: 'send' }) : null
    if (p.state === 'awaiting') return h.viewer.approvesPo ? { label: 'Approve and send', run: () => setSendId(p.id), testId: 'po-next-approve', act: 'send' } : null
    if (p.state === 'changes' || p.state === 'declined') return prep ? { label: 'Change it', run: () => { void editPo(p) }, testId: 'po-next-edit', act: 'edit' } : null
    const owed = payable({ po: p, bills: h.summary.bills })
    if ((p.state === 'sent' || p.state === 'accepted' || p.state === 'part_paid') && h.viewer.pays && owed.owedMinor > 0 && (p.state !== 'sent' || owed.advanceDueMinor > 0)) return { label: owed.advanceDueMinor ? 'Pay the advance' : 'Pay', run: () => setPaying(payTarget({ po: p })), testId: 'po-next-pay', act: 'pay' }
    if (p.state === 'sent' && prep) return { label: 'Mark as accepted', run: () => { setAcceptVia('phone'); setAccepting(p) }, testId: 'po-next-accept', act: 'accept' }
    if ((p.state === 'accepted' || p.state === 'part_paid') && records(p.projectId)) return { label: 'Record a bill', run: () => setBillDialog({ initial: null, poId: p.id }), testId: 'po-next-bill', act: 'bill' }   // (parity map, MO-098) Accounting records the bills
    return null
  }
  const poMenu = (p: PoView): RowAction[] => {
    const prep = prepares(p.projectId), out: RowAction[] = []
    const lockedWhy = locked(p.projectId)
    out.push({ label: 'Open', run: () => setPanel({ kind: 'po', id: p.id }) })
    /* (parity map, MO-038) a PO made elsewhere: its own file, it is paid and billed like any PO, removed (not cancelled) while nothing is on it */
    if (p.external) {
      if (p.externalFileId) out.push({ label: 'Open its file', run: () => window.open(`/finance/doc/${p.externalFileId}`, '_blank', 'noopener'), help: EXTERNAL_PO_WORDS })
      if (deliverable(p)) out.push({ label: 'Mark delivered', run: () => { void markDelivered(p) }, help: 'The vendor delivered — the late-delivery reminder stops', act: 'deliver', testId: 'po-mark-delivered' })
      if (records(p.projectId)) out.push({ label: 'Record a bill on it', run: () => setBillDialog({ initial: null, poId: p.id }), act: 'bill' })
      if (h.viewer.pays && payable({ po: p, bills: h.summary.bills }).owedMinor > 0) out.push({ label: 'Pay the vendor', run: () => setPaying(payTarget({ po: p })), act: 'pay' })
      if (h.viewer.pays && (p.state === 'accepted' || p.state === 'part_paid')) out.push({ label: 'Close it short…', run: () => setNoting({ kind: 'close', id: p.id, title: p.number }), help: 'The vendor delivered less — what is left isn’t owed' })
      if (records(p.projectId) && p.paidMinor === 0 && !p.billIds.length && p.state !== 'closed') out.push({ label: 'Remove the record', run: () => { void remove(p) }, tone: 'danger', help: 'Recorded by mistake — Undo brings it back' })
      return out
    }
    out.push({ label: 'View the PO', run: () => router.push(`/projects/${p.projectId}/purchase-orders/${p.id}`), help: 'As the vendor reads it — print or download' })
    if (deliverable(p)) out.push({ label: 'Mark delivered', run: () => { void markDelivered(p) }, help: 'The vendor delivered — the late-delivery reminder stops', act: 'deliver', testId: 'po-mark-delivered' })   // (parity map, MO-094)
    if (prep && editable(p.state)) out.push({ label: 'Edit', run: () => { void editPo(p) }, act: 'edit' })
    if (p.sentAt && p.state !== 'cancelled') out.push({ label: 'Copy the vendor’s link', run: () => copyLink(p), help: 'It opens without signing in' })
    if (prep && (p.state === 'sent' || p.state === 'accepted' || p.state === 'part_paid')) out.push({ label: 'Send it on WhatsApp again', run: () => resend(p) })
    /* (simplify S-10 · F1 §6.9.2) an approver answers someone else's submission (Approve and send · Send back) — taking it back is the submitter's */
    if (prep && p.state === 'awaiting' && (!h.viewer.approvesPo || p.submittedBy === h.viewer.id)) out.push({ label: 'Take the submission back', run: () => { void act(p.id, 'take it back', () => withdrawPo(p.id), `${p.number} is a Draft again`) } })
    if (h.viewer.approvesPo && p.state === 'awaiting') out.push({ label: 'Send back', run: () => setNoting({ kind: 'sendBack', id: p.id, title: p.number }) })
    if (prep && (p.state === 'sent' || p.state === 'changes' || p.state === 'declined')) out.push({ label: 'Mark as accepted', run: () => { setAcceptVia('phone'); setAccepting(p) }, help: 'The vendor said yes off the link', act: 'accept' })
    if (records(p.projectId) && (p.state === 'sent' || p.state === 'accepted' || p.state === 'part_paid')) out.push({ label: 'Record a bill on it', run: () => setBillDialog({ initial: null, poId: p.id }), act: 'bill' })
    if (h.viewer.pays && payable({ po: p, bills: h.summary.bills }).owedMinor > 0) out.push({ label: 'Pay the vendor', run: () => setPaying(payTarget({ po: p })), act: 'pay' })
    if (h.viewer.pays && (p.state === 'sent' || p.state === 'accepted' || p.state === 'part_paid')) out.push({ label: 'Close it short…', run: () => setNoting({ kind: 'close', id: p.id, title: p.number }), help: 'The vendor delivered less — what is left isn’t owed' })
    if (prep) out.push({ label: 'Duplicate', run: () => { void duplicate(p) }, disabled: !!lockedWhy, help: lockedWhy ?? undefined })
    if (prep && p.sentAt && p.paidMinor === 0 && p.state !== 'cancelled' && p.state !== 'closed') out.push({ label: 'Cancel the PO…', run: () => setNoting({ kind: 'cancel', id: p.id, title: p.number }), tone: 'danger' })
    if (prep && !p.sentAt && (p.state === 'draft' || p.state === 'sent_back')) out.push({ label: 'Remove the Draft', run: () => { void remove(p) }, tone: 'danger' })
    return out
  }

  /* ── bills ── */
  const saveBill = async (i: BillInput) => {
    setBusy('bill')
    try {
      const r = i.id ? await updateBill({ ...i, id: i.id }) : await recordBill(i)
      if ('error' in r) { snackbar({ message: couldnt(i.id ? 'save the bill' : 'record the bill', refusalOf(r.error)) }); return }
      if ('duplicate' in r) { setDup({ input: i, message: r.duplicate }); return }
      setBillDialog(null); setDup(null); setFocus(r.id)
      /* (S44R, C8) a bill that waits for its OK says so — and who OKs it */
      const waits = 'waits' in r && r.waits ? ` — it waits for an Owner’s or an Admin’s OK before it is paid: ${r.waits.charAt(0).toLowerCase()}${r.waits.slice(1)}` : ''
      snackbar({ message: i.id ? `Bill saved${waits}` : `Bill ${i.reference.trim()} recorded — ${money2(i.totalMinor)}${waits}` })
    } catch (e) { snackbar({ message: couldnt('record the bill', refusalOf(e)) }) } finally { setBusy(null) }
  }
  /* (S44R — UAT row 361, call C8, as recommended; REVERSES F1-Q10) a bill that waits for its OK: an Owner or an Admin approves it (with Undo);
     nobody pays it until then — its row says why where Pay would be */
  const approveBillNow = (b: BillView) => act(b.id, 'approve the bill', async () => {
    const r = await approveBill(b.id)
    if (!('error' in r)) snackbar({ message: `${vendorOf(b.vendorId)?.name ?? 'The vendor'}’s bill ${b.reference} approved — it can be paid`, actionLabel: 'Undo', onAction: () => { void run('undo the approval', () => undoBillApproval(r.undo), `Bill ${b.reference} waits for approval again`) } })
    return r
  })
  /** (S44R, C8) the bill dialog's line before it is recorded: why it would wait for its OK (the server's own rule, `billWaitWhy`), else null */
  const billWaitHint = (exceptId: string | null) => (totalMinor: number, poId: string | null): string | null => {
    const was = exceptId ? h.summary.bills.find((b) => b.id === exceptId) ?? null : null
    if (was && was.totalMinor === totalMinor && (was.poId ?? null) === poId && (was.approvedAt || !was.approvalWhy)) return null   // the server keeps its OK
    const po = poId ? h.summary.pos.find((p) => p.id === poId) ?? null : null
    const others = po ? h.summary.bills.filter((b) => b.poId === po.id && b.id !== exceptId).reduce((x, b) => x + b.totalMinor, 0) : 0
    const why = billWaitWhy(h.viewer, h.rules, { totalMinor }, po ? { totalMinor: po.totalMinor, otherBilledMinor: others } : null)
    return why ? billWaitWords(why, { limitMinor: h.rules.poLimitMinor, po: po ? { number: po.number, totalMinor: po.totalMinor, billedMinor: others + totalMinor } : null }, money2) : null
  }
  const billNext = (b: BillView): Next => {
    if (b.waits) return h.viewer.approvesPo ? { label: 'Approve', run: () => { void approveBillNow(b) }, testId: 'bill-next-approve', act: 'approve' } : null
    return h.viewer.pays && b.balanceMinor > 0 ? { label: 'Pay', run: () => setPaying(payTarget({ bill: b })), testId: 'bill-next-pay', act: 'pay' } : null
  }
  const billMenu = (b: BillView): RowAction[] => {
    const out: RowAction[] = [{ label: 'Open', run: () => setPanel({ kind: 'bill', id: b.id }) }]
    const mine = b.createdBy === h.viewer.id || h.viewer.runs
    if (b.docId) out.push({ label: 'Open its file', run: () => window.open(`/finance/doc/${b.docId}`, '_blank', 'noopener') })
    if (b.waits && h.viewer.approvesPo) out.push({ label: 'Approve', run: () => { void approveBillNow(b) }, act: 'approve', help: 'It can be paid from then on' })   // (S44R, C8)
    if (mine && b.paidMinor === 0) out.push({ label: 'Edit', run: () => setBillDialog({ initial: b }), act: 'edit' })
    if (h.viewer.pays && b.balanceMinor > 0 && !b.waits) out.push({ label: 'Pay the vendor', run: () => setPaying(payTarget({ bill: b })), act: 'pay' })
    if (mine && b.paidMinor === 0) out.push({ label: 'Remove the bill', run: () => { void removeBillNow(b) }, tone: 'danger' })
    return out
  }
  const removeBillNow = async (b: BillView) => {
    setBusy(b.id)
    try {
      const r = await removeBill(b.id)
      if ('error' in r) { snackbar({ message: couldnt('remove the bill', refusalOf(r.error)) }); return }
      if (panel?.id === b.id) setPanel(null)
      snackbar({ message: `Bill ${b.reference} removed`, actionLabel: 'Undo', onAction: () => { void run('bring the bill back', () => undoRemoveBill(r.undo), `Bill ${b.reference} is back`) } })
    } finally { setBusy(null) }
  }

  /* ── expenses ── */
  const saveExp = async (i: ExpenseInput) => {
    setBusy('expense')
    try {
      const r = await saveExpense(i)
      if ('error' in r) { snackbar({ message: couldnt(i.id ? 'save the expense' : 'log the expense', refusalOf(r.error)) }); return }
      setExpenseDialog(null); setFocus(r.id)
      /* (pending modules S06) a repeat set or changed says when the next one is logged; one stopped says so */
      const rep = r.repeat?.changed ? (r.repeat.every && r.repeat.next ? ` — it repeats ${repeatWords(r.repeat.every)}, next on ${displayDate(new Date(r.repeat.next))}` : ' — it doesn’t repeat any more') : ''
      snackbar({ message: r.waits ? `${money2(i.amountMinor)} logged — an Owner or an Admin approves it${rep}` : i.id ? `Expense saved${rep}` : `${money2(i.amountMinor)} logged${rep}` })
    } catch (e) { snackbar({ message: couldnt('log the expense', refusalOf(e)) }) } finally { setBusy(null) }
  }
  const approve = (e: ExpenseView) => act(e.id, 'approve the expense', async () => {
    const r = await answerExpense(e.id, { approve: true })
    if (!('error' in r)) snackbar({ message: `“${e.description}” approved${e.paidBy === 'member' ? ` — ${personName(e.claimantId)} is owed ${money2(e.amountMinor)}` : ''}`, actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoExpenseAnswer(r.undo), 'It waits for approval again') } })
    return r
  })
  const expenseNext = (e: ExpenseView): Next => {
    if (expLock.locked && e.state !== 'to_pay_back') return null
    if (e.state === 'pending' && h.viewer.approvesExpense) return { label: 'Approve', run: () => { void approve(e) }, testId: 'expense-next-approve', act: 'approve' }
    if (e.state === 'sent_back' && e.createdBy === h.viewer.id) return { label: 'Change it', run: () => setExpenseDialog({ initial: e }), testId: 'expense-next-edit', act: 'edit' }
    if (e.state === 'to_pay_back' && h.viewer.pays) return { label: 'Pay back', run: () => setPaying(payTarget({ expense: e })), testId: 'expense-next-pay', act: 'pay' }
    return null
  }
  /* (pending modules S06) Stop repeating — from any expense of a live series: nothing more is logged, what was logged stays; Undo starts it again.
     Its maker, Owners, Admins and Accounting (the server's REPEAT_RULE). */
  const stopsRepeat = (e: ExpenseView) => !!e.series?.live && (h.viewer.runs || h.summary.expenses.find((x) => x.id === e.series?.rootId)?.createdBy === h.viewer.id)
  const stopRepeat = (e: ExpenseView) => act(e.id, 'stop the repeat', async () => {
    const r = await stopExpenseRepeat(e.id)
    if (!('error' in r)) snackbar({ message: `“${r.title}” won’t repeat any more — what was logged stays`, actionLabel: 'Undo', onAction: () => { void run('start it again', () => undoStopExpenseRepeat(r.undo), `“${r.title}” repeats again`) } })   // invented copy (pending modules S06)
    return r
  })
  const expenseMenu = (e: ExpenseView): RowAction[] => {
    const out: RowAction[] = [{ label: 'Open', run: () => setPanel({ kind: 'expense', id: e.id }) }]
    if (expLock.locked) { if (e.state === 'to_pay_back' && h.viewer.pays) out.push({ label: 'Pay back', run: () => setPaying(payTarget({ expense: e })), act: 'pay' }); return out }
    const mine = e.createdBy === h.viewer.id
    const changes = e.paidBackMinor === 0 && (h.viewer.runs || (mine && e.status !== 'approved'))
    if (changes) out.push({ label: 'Edit', run: () => setExpenseDialog({ initial: e }), act: 'edit' })
    if (e.state === 'pending' && h.viewer.approvesExpense) { out.push({ label: 'Approve', run: () => { void approve(e) }, act: 'approve' }); out.push({ label: 'Send back', run: () => setNoting({ kind: 'expenseBack', id: e.id, title: e.description }) }) }
    if (e.state === 'to_pay_back' && h.viewer.pays) out.push({ label: 'Pay back', run: () => setPaying(payTarget({ expense: e })), act: 'pay' })
    if (stopsRepeat(e)) out.push({ label: 'Stop repeating', run: () => { void stopRepeat(e) }, help: `${repeatLabel(e.series!.every)} — what was logged stays`, testId: 'expense-stop-repeat' })
    if (changes) out.push({ label: 'Remove the expense', run: () => { void removeExp(e) }, tone: 'danger' })
    return out
  }
  const removeExp = async (e: ExpenseView) => {
    setBusy(e.id)
    try {
      const r = await removeExpense(e.id)
      if ('error' in r) { snackbar({ message: couldnt('remove the expense', refusalOf(r.error)) }); return }
      if (panel?.id === e.id) setPanel(null)
      snackbar({ message: `“${e.description}” removed${r.stopsRepeat ? ' — it won’t repeat any more' : ''}`, actionLabel: 'Undo', onAction: () => { void run('bring it back', () => undoRemoveExpense(r.undo), r.stopsRepeat ? 'The expense is back, and repeats again' : 'The expense is back') } })
    } finally { setBusy(null) }
  }

  /* ── payments out ── */
  const payoutMenu = (p: PayoutRecord): RowAction[] => {
    const out: RowAction[] = []
    if (p.docId) out.push({ label: 'Open the transfer', run: () => window.open(`/finance/doc/${p.docId}`, '_blank', 'noopener') })
    if (h.viewer.pays && !p.reversedAt) out.push({ label: 'Reverse the payment…', run: () => setNoting({ kind: 'reverse', id: p.id, title: `The ${money2(p.amountMinor)} payment` }), tone: 'danger', help: 'It stays on the record and counts for nothing' })
    return out
  }

  /* (parity map, MO-058 · MO-079) the issuing entity a record is under — said only on a studio with two or more */
  const issuedBy = (own: string | null, projectId: string | null): string | null => {
    const list = h.entities ?? []
    if (list.length < 2) return null
    const name = own ?? projectOf(projectId)?.entity ?? null
    return list.find((e) => e.label === name)?.label ?? list.find((e) => e.first)?.label ?? null
  }
  /* (pending modules S06) a repeat in the panel: its rhythm and next day (or when and by whom it stopped), and every expense it logged */
  const repeatFact = (e: ExpenseView): string => {
    const r = e.series!
    if (r.live && r.every && r.next) return `${repeatLabel(r.every)} · next on ${displayDate(new Date(r.next))}`
    if (r.stoppedAt) return `${r.every ? `Was ${repeatWords(r.every)}` : 'Not any more'} · stopped on ${displayDate(new Date(r.stoppedAt))}${r.stoppedBy ? ` by ${personName(r.stoppedBy)}` : ' — the project was handed over'}`
    return 'Not any more'
  }
  const seriesList = (e: ExpenseView): PanelList => ({
    title: 'This repeat', testId: 'expense-series',
    rows: e.series!.members.map((m) => {
      const v = h.summary.expenses.find((x) => x.id === m.id)
      return { id: m.id, text: displayDate(new Date(m.spentOn)), sub: m.id === e.series!.rootId ? 'The first one' : undefined, status: v ? tagOf(EXPENSE_STATE_LABEL[v.state], EXPENSE_STATE_TONE[v.state]) : undefined,
        amount: m.amountMinor, lit: m.id === e.id, menu: m.id === e.id ? undefined : [{ label: 'Open', run: () => setPanel({ kind: 'expense', id: m.id }) }], menuTitle: displayDate(new Date(m.spentOn)), testId: 'expense-series-row' }
    }),
  })
  /* ── the panel ── */
  const panelBill = panel?.kind === 'bill' ? h.summary.bills.find((b) => b.id === panel.id) ?? null : null
  const panelExpense = panel?.kind === 'expense' ? h.summary.expenses.find((e) => e.id === panel.id) ?? null : null
  const payRows = (pick: (p: PayoutRecord) => boolean) => h.summary.payouts.filter(pick).map((p) => ({ id: p.id, text: <>{displayDate(new Date(p.paidOn))} · {methodLabel(p.method)}{p.advance ? ' · the advance' : ''}{p.reference ? ` · ${p.reference}` : ''}</>, amount: p.amountMinor, reversed: p.reversedAt ? p.reverseReason ?? '' : null }))
  const nextAsAction = (n: Next) => (n ? [{ label: n.label, run: n.run, primary: true, testId: `panel-${n.testId ?? 'next'}` }] : [])
  /* (simplify S-10 · F1 §6.9.2) the panel's ⋮ never repeats its primary (Approve twice, Pay and Pay the vendor) — nor Open, the panel itself */
  const panelMenu = (items: RowAction[], n: Next) => items.filter((a) => a.label !== 'Open' && !(n?.act && a.act === n.act))
  const panelNode: ReactNode = panelPo ? (
    <CostPanel open title={`${panelPo.number} · ${vendorOf(panelPo.vendorId)?.name ?? ''}`} testId="po-panel" onClose={() => setPanel(null)}
               status={<>{tagOf(PO_STATE_LABEL[panelPo.state], PO_STATE_TONE[panelPo.state])}{panelPo.title ? <span className={money.sub}>{panelPo.title}</span> : null}</>}
               note={panelPo.deliveryLateDays > 0 ? { text: <>{lateDeliveryTitle(panelPo.number, panelPo.deliveryLateDays)} — it was expected on {displayDate(new Date(panelPo.expectedOn!))}.</> }   // (parity map, MO-094) the vendor's lateness: neutral (S-05)
                 : panelPo.state === 'changes' || panelPo.state === 'declined' ? { text: <>{vendorOf(panelPo.vendorId)?.name} {panelPo.state === 'changes' ? 'asked for changes' : 'declined it'}{panelPo.vendorAnswerNote ? `: “${panelPo.vendorAnswerNote}”` : ''}</>, tone: panelPo.state === 'declined' ? 'alert' : undefined }
                 : panelPo.state === 'sent_back' && panelPo.reviewNote ? { text: <>Sent back by {personName(panelPo.reviewedBy)}: “{panelPo.reviewNote}”</> } : panelPo.state === 'cancelled' ? { text: <>Cancelled: “{panelPo.cancelReason}”</> } : panelPo.closeNote ? { text: <>Closed short: “{panelPo.closeNote}”</> } : null}
               facts={[
                 ...(h.fixed ? [] : [{ label: 'Project', value: projectOf(panelPo.projectId)?.name ?? '' }]),
                 { label: 'Vendor', value: <>{vendorOf(panelPo.vendorId)?.name}{vendorOf(panelPo.vendorId)?.phone ? <span className={money.sub}> · {phoneLocal(vendorOf(panelPo.vendorId)?.phone)}</span> : null}</> },
                 /* (parity map, MO-038) a PO made elsewhere says so, with the day it was made and who recorded it */
                 ...(panelPo.external ? [{ label: 'Recorded', value: `Made elsewhere${panelPo.sentAt ? ` on ${displayDate(new Date(panelPo.sentAt))}` : ''} · recorded by ${personName(panelPo.createdBy)}` }] : [{ label: 'Payment', value: termsLabel(panelPo.terms, panelPo.termsText) }]),
                 ...(panelPo.dueOn ? [{ label: 'To be paid by', value: displayDate(new Date(panelPo.dueOn)) }] : []),
                 ...(panelPo.expectedOn ? [{ label: 'Expected delivery', value: displayDate(new Date(panelPo.expectedOn)) }] : []),
                 /* (parity map, MO-094) delivered — by whom and when */
                 ...(panelPo.deliveredAt ? [{ label: 'Delivered', value: `${displayDate(new Date(panelPo.deliveredAt))} · marked by ${personName(panelPo.deliveredBy)}` }] : []),
                 ...(panelPo.deliveryAddress ? [{ label: 'Deliver to', value: panelPo.deliveryAddress }] : []),
                 ...(panelPo.billTo ? [{ label: 'Invoice to', value: panelPo.billTo }] : []),   // (parity map, MO-011)
                 ...(issuedBy(panelPo.issuingEntity, panelPo.projectId) ? [{ label: 'Issued by', value: issuedBy(panelPo.issuingEntity, panelPo.projectId)! }] : []),   // (parity map, MO-079)
                 ...(panelPo.sentAt && !panelPo.external ? [{ label: 'Sent', value: `${displayDate(new Date(panelPo.sentAt))} by ${personName(panelPo.sentBy)}${panelPo.vendorViewedAt ? ` · viewed ${displayDate(new Date(panelPo.vendorViewedAt))}` : ''}` }] : []),
                 ...(panelPo.vendorAnswer === 'accepted' && !panelPo.external ? [{ label: 'Accepted', value: `${viaWords(panelPo.answerVia)}${panelPo.vendorAnsweredAt ? ` · ${displayDate(new Date(panelPo.vendorAnsweredAt))}` : ''}` }] : []),
                 ...(panelPo.billIds.length ? [{ label: 'Bills on it', value: panelPo.billIds.map((id) => h.summary.bills.find((b) => b.id === id)?.reference).filter(Boolean).join(', ') }] : []),
                 ...(panelPo.againstQuote ? [{ label: 'Against the quote', value: `The client pays ${money2(panelPo.againstQuote.clientMinor)} for its quote lines — it leaves ${money2(panelPo.againstQuote.leftMinor)} (${panelPo.againstQuote.pct}%)` }] : []),
               ]}
               lines={panelPo.lines.map((l) => ({ key: l.id, text: l.description, sub: `${l.qty}${l.unit ? ` ${l.unit}` : ''} × ${money2(l.unitMinor)}${l.category ? ` · ${l.category}` : ''}${l.quoteItemId ? ' · from the quote' : ''}`, amount: l.amountMinor }))}
               totals={[{ label: 'Subtotal', amount: panelPo.subtotalMinor }, ...(panelPo.gstMinor ? [{ label: `GST (${panelPo.gstRate}%)`, amount: panelPo.gstMinor }] : []), { label: 'Total', amount: panelPo.totalMinor, grand: true }, ...(panelPo.advanceMinor ? [{ label: 'Advance', amount: panelPo.advanceMinor }] : []), ...(panelPo.paidMinor ? [{ label: 'Paid', amount: panelPo.paidMinor }, { label: 'To pay', amount: panelPo.balanceMinor }] : [])]}
               /* (MO-038) a recorded PO keeps no lines — its amount, and its file */
               amounts={panelPo.lines.length ? undefined : [...(panelPo.gstMinor ? [{ label: `GST inside (${panelPo.gstRate}%)`, amount: panelPo.gstMinor }] : []), { label: 'Total', amount: panelPo.totalMinor, grand: true }, ...(panelPo.paidMinor ? [{ label: 'Paid', amount: panelPo.paidMinor }, { label: 'To pay', amount: panelPo.balanceMinor }] : [])]}
               docs={panelPo.external && panelPo.externalFileId ? [{ id: panelPo.externalFileId, name: `${panelPo.number} — its file`, image: false }] : undefined}
               payments={panelPo.sentAt ? payRows((p) => p.poId === panelPo.id) : undefined}
               history={historyRows}
               /* (MO-094) a late delivery: Mark delivered beside the next step (outlined), and Message the vendor in the ⋮'s place */
               actions={[...nextAsAction(poNext(panelPo)), ...(panelPo.deliveryLateDays > 0 && deliverable(panelPo) ? [{ label: 'Mark delivered', run: () => { void markDelivered(panelPo) }, primary: !poNext(panelPo), testId: 'panel-po-delivered' }] : [])]}
               menu={[...panelMenu(poMenu(panelPo), poNext(panelPo)).filter((a) => !(panelPo.deliveryLateDays > 0 && a.act === 'deliver')), ...(panelPo.deliveryLateDays > 0 ? [{ label: `Message ${vendorOf(panelPo.vendorId)?.name ?? 'the vendor'}`, run: () => messageVendor(panelPo), help: 'On WhatsApp — when to expect the delivery' }] : [])]} />
  ) : panelBill ? (
    <CostPanel open title={`${vendorOf(panelBill.vendorId)?.name ?? 'Bill'} · ${panelBill.reference}`} testId="bill-panel" onClose={() => setPanel(null)}
               status={tagOf(BILL_STATE_LABEL[panelBill.state], BILL_STATE_TONE[panelBill.state])}
               /* (S44R, C8) why it waits, and who OKs it — said where the record's own words go */
               note={panelBill.waits ? { text: <>{billWaitWords(panelBill.approvalWhy ?? 'limit', { limitMinor: h.rules.poLimitMinor, po: (() => { const o = panelBill.poId ? h.summary.pos.find((p) => p.id === panelBill.poId) : null; return o ? { number: o.number, totalMinor: o.totalMinor, billedMinor: o.billedMinor } : null })() }, money2)}. {BILL_WAITS_RULE}.</> } : panelBill.note ? { text: panelBill.note } : null}
               facts={[
                 { label: 'Project', value: panelBill.projectId ? projectOf(panelBill.projectId)?.name ?? '' : 'Studio overhead' },
                 ...(panelBill.poId ? [{ label: 'On the PO', value: h.summary.pos.find((p) => p.id === panelBill.poId)?.number ?? '' }] : []),
                 { label: 'Issued', value: displayDate(new Date(panelBill.issuedOn)) },
                 ...(panelBill.dueOn ? [{ label: 'Due', value: displayDate(new Date(panelBill.dueOn)) }] : []),
                 { label: 'Recorded', value: `${displayDate(new Date(panelBill.createdAt))} by ${personName(panelBill.createdBy)}${panelBill.readFrom ? ` · read from ${panelBill.readFrom}` : ''}` },
                 ...(panelBill.approvedAt ? [{ label: 'Approved', value: `${displayDate(new Date(panelBill.approvedAt))} by ${personName(panelBill.approvedBy)}` }] : []),   // (S44R, C8)
                 ...(panelBill.waits && panelBill.note ? [{ label: 'Note', value: panelBill.note }] : []),
               ]}
               lines={panelBill.lines.map((l) => ({ key: l.id, text: l.description, sub: `${l.qty} × ${money2(l.unitMinor)}`, amount: Math.round(l.qty * l.unitMinor) }))}
               totals={[{ label: 'Subtotal', amount: panelBill.subtotalMinor }, ...(panelBill.gstMinor ? [{ label: 'GST', amount: panelBill.gstMinor }] : []), { label: 'Total', amount: panelBill.totalMinor, grand: true }]}
               docs={panelBill.docId ? [{ id: panelBill.docId, name: panelBill.docName ?? 'The bill', image: false }] : []}
               payments={payRows((p) => p.billId === panelBill.id)}
               actions={nextAsAction(billNext(panelBill))} menu={panelMenu(billMenu(panelBill), billNext(panelBill))} />
  ) : panelExpense ? (
    <CostPanel open title={panelExpense.description} testId="expense-panel" onClose={() => setPanel(null)}
               status={tagOf(EXPENSE_STATE_LABEL[panelExpense.state], EXPENSE_STATE_TONE[panelExpense.state])}
               note={panelExpense.state === 'sent_back' && panelExpense.reviewNote ? { text: <>Sent back by {personName(panelExpense.reviewedBy)}: “{panelExpense.reviewNote}”</> } : panelExpense.note ? { text: panelExpense.note } : null}
               facts={[
                 { label: 'Amount', value: `${money2(panelExpense.amountMinor)}${panelExpense.gstMinor ? ` (incl. ${money2(panelExpense.gstMinor)} GST)` : ''}` },
                 { label: 'Paid on', value: displayDate(new Date(panelExpense.spentOn)) },
                 { label: 'Category', value: panelExpense.category },
                 { label: 'Project', value: panelExpense.projectId ? projectOf(panelExpense.projectId)?.name ?? '' : 'Studio overhead' },
                 { label: 'Who paid', value: panelExpense.paidBy === 'member' ? `${personName(panelExpense.claimantId)} — a claim` : 'The studio' },
                 ...(panelExpense.vendorId ? [{ label: 'Vendor', value: vendorOf(panelExpense.vendorId)?.name ?? '' }] : []),
                 ...(issuedBy(panelExpense.issuingEntity, panelExpense.projectId) ? [{ label: 'Issued by', value: issuedBy(panelExpense.issuingEntity, panelExpense.projectId)! }] : []),   // (parity map, MO-058)
                 /* (pending modules S06) one the rule logged says so — its day came and the repeat logged it, for its maker */
                 { label: 'Logged', value: panelExpense.repeatOf ? `${displayDate(new Date(panelExpense.createdAt))} by its repeat, for ${personName(panelExpense.createdBy)}` : `${displayDate(new Date(panelExpense.createdAt))} by ${personName(panelExpense.createdBy)}` },
                 ...(panelExpense.status === 'approved' && panelExpense.reviewedBy ? [{ label: 'Approved', value: `${panelExpense.reviewedAt ? displayDate(new Date(panelExpense.reviewedAt)) : ''} by ${personName(panelExpense.reviewedBy)}` }] : []),
                 ...(panelExpense.series ? [{ label: 'Repeats', value: repeatFact(panelExpense) }] : []),
               ]}
               docs={panelExpense.receipts.map((r) => ({ id: r.id, name: r.name, image: r.image }))}
               payments={panelExpense.paidBy === 'member' ? payRows((p) => p.expenseId === panelExpense.id) : undefined}
               lists={panelExpense.series && panelExpense.series.members.length > 1 ? [seriesList(panelExpense)] : undefined}
               actions={nextAsAction(expenseNext(panelExpense))} menu={panelMenu(expenseMenu(panelExpense), expenseNext(panelExpense))} />
  ) : null

  /* ── the dialogs ── */
  const sendVendor = sendPoView ? vendorOf(sendPoView.vendorId) : null
  const fixedCtx = h.fixed?.context ?? null
  const dialogs = (
    <>
      <PoDialog open={!!poDialog} initial={poDialog?.initial ?? null} context={poDialog ? poCtx ?? fixedCtx : null} projects={h.fixed ? undefined : h.projects.filter((p) => p.prepares && !p.locked)}
                onPickProject={(id) => { void pickProject(id) }} vendors={vendors} onVendorAdded={(v) => setAdded((a) => [...a, v])} rules={h.rules} viewer={h.viewer} trades={h.trades} bank={h.viewer.seesBank}
                busy={busy === 'po'} onClose={() => setPoDialog(null)} onSave={(i, then) => { void savePoAnd(i, then) }} />
      {sendPoView && sendVendor ? (
        <SendContractDialog open onClose={() => setSendId(null)} title={sendPoView.state === 'awaiting' ? `Approve and send ${sendPoView.number}` : `Send ${sendPoView.number} to ${sendVendor.name}`}
                            subtitle={`${money2(sendPoView.totalMinor)}, paid ${termsLabel(sendPoView.terms, sendPoView.termsText).replace(/^Paid /, '').toLowerCase()}. It’s recorded as sent and WhatsApp opens with the message; ${sendVendor.contactName ? sendVendor.contactName.split(' ')[0] : 'the vendor'} accepts it on its link.`}
                            link={linkOf(sendPoView)} phoneLabel="Vendor’s mobile" nameLabel="Vendor’s name" messageLabel="Message to the vendor" copyDone="The PO’s link is copied" sendLabel={sendPoView.state === 'awaiting' ? 'Approve and send via WhatsApp' : 'Send via WhatsApp'}
                            defaults={{ name: sendVendor.contactName ?? sendVendor.name, phone: sendVendor.phone ?? '' }}
                            draft={() => poMessage({ vendor: sendVendor.name, contact: sendVendor.contactName, studio: h.studio, number: sendPoView.number, where: projectOf(sendPoView.projectId)?.address ?? projectOf(sendPoView.projectId)?.name ?? '', total: sendPoView.totalMinor, terms: termsLabel(sendPoView.terms, sendPoView.termsText), link: linkOf(sendPoView), again: !!sendPoView.sentAt && editable(sendPoView.state) })}
                            busy={busy === sendPoView.id}
                            onSend={(o) => (sendPoView.state === 'sent' || sendPoView.state === 'accepted' || sendPoView.state === 'part_paid'
                              ? (() => { window.open(`https://wa.me/65${o.phone}?text=${encodeURIComponent(o.message)}`, '_blank', 'noopener'); setSendId(null) })()
                              : sendNow(sendPoView, o))} />
      ) : null}
      <Dialog open={!!accepting} onClose={() => setAccepting(null)} title={`${accepting?.number ?? 'The PO'} — accepted`} size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setAccepting(null)} isDisabled={!!accepting && busy === accepting.id}>Cancel</Button><Button onPress={() => { if (accepting) void accept(accepting, acceptVia) }} isDisabled={!!accepting && busy === accepting.id} data-testid="po-accept-save">Mark as accepted</Button></>}>
        <div className={money.fields}>
          <span className={money.sub}>The vendor said yes off the link. How?</span>
          <Chips label="How the vendor said yes" options={ANSWER_VIA} value={acceptVia} onChange={setAcceptVia} testId="po-accept-via" />
        </div>
      </Dialog>
      <NoteDialog open={!!noting} busy={!!noting && busy === `note:${noting.id}`} required maxLength={300} onClose={() => setNoting(null)} onSubmit={(n) => { void noteDone(n) }}
                  title={noting?.kind === 'cancel' ? `Cancel ${noting.title}` : noting?.kind === 'close' ? `Close ${noting.title} short` : noting?.kind === 'reverse' ? 'Reverse the payment' : 'Send back'}
                  label={noting?.kind === 'cancel' ? 'Why is it cancelled?' : noting?.kind === 'close' ? 'Why isn’t the rest owed?' : noting?.kind === 'reverse' ? 'Why is it reversed?' : 'What should change?'}
                  action={noting?.kind === 'cancel' ? 'Cancel the PO' : noting?.kind === 'close' ? 'Close it' : noting?.kind === 'reverse' ? 'Reverse' : 'Send back'}
                  help={noting?.kind === 'cancel' ? 'The vendor reads it on the PO’s link.' : noting?.kind === 'close' ? 'What was paid stays; what is left is no longer owed.' : noting?.kind === 'reverse' ? 'It stays on the record and counts for nothing.' : 'Whoever made it reads it.'} />
      <BillDialog open={!!billDialog} initial={billDialog?.initial ?? null} forPo={billDialog?.poId ? { id: billDialog.poId, vendorId: h.summary.pos.find((p) => p.id === billDialog.poId)?.vendorId ?? '' } : null} fixedProject={h.fixed?.project ?? (billDialog?.poId ? projectOf(h.summary.pos.find((p) => p.id === billDialog.poId)?.projectId ?? null) : null)}
                  projects={h.projects.filter((p) => p.records)} overhead={h.viewer.runs} vendors={vendors} onVendorAdded={(v) => setAdded((a) => [...a, v])}
                  pos={h.summary.pos} trades={h.trades} bank={h.viewer.seesBank} busy={busy === 'bill'} onClose={() => setBillDialog(null)} onSave={(i) => { void saveBill(i) }} file={billDialog?.file ?? null} waitWords={billWaitHint(billDialog?.initial?.id ?? null)} />
      <ConfirmDialog open={!!dup} title="Record it anyway?" message={dup?.message} confirmLabel="Record anyway" tone="primary" nested onCancel={() => setDup(null)} onConfirm={() => { if (dup) void saveBill({ ...dup.input, force: true }) }} />
      <ExpenseDialog open={!!expenseDialog} initial={expenseDialog?.initial ?? null} fixedProject={h.fixed?.project ?? null} projects={h.projects.filter((p) => p.records)} vendors={vendors} people={h.people} categories={h.categories}
                     viewer={{ id: h.viewer.id, runs: h.viewer.runs }} waits={expenseWaits(h.viewer.role, h.rules)} gstRate={h.gstRate} busy={busy === 'expense'} onClose={() => setExpenseDialog(null)} onSave={(i) => { void saveExp(i) }}
                     entities={h.entities ?? []} />
      <ExternalPoDialog open={recording} fixedProject={h.fixed?.project ?? null} projects={h.projects.filter((p) => p.records && !p.locked)} vendors={vendors} onVendorAdded={(v) => setAdded((a) => [...a, v])}
                        trades={h.trades} bank={h.viewer.seesBank} gstRate={h.gstRate} busy={busy === 'external'} onClose={() => setRecording(false)} onSave={(i) => { void saveExternal(i) }} />
      <PayoutDialog open={!!paying} target={paying} busy={busy === 'pay'} onClose={() => setPaying(null)} onSave={(o) => { void pay(o) }} />
      {panelNode}
    </>
  )
  return {
    vendors, focus, setFocus, busy,
    /* (simplify round 2) `newBill(file)` — a bill dropped on the page opens the dialog reading it (R2-A's drop on Money); a press passes no File */
    newPo, newBill: (file?: File | null) => setBillDialog({ initial: null, file: typeof File !== 'undefined' && file instanceof File ? file : null }), newExpense: () => { if (expLock.locked) { expLock.open(); return } setExpenseDialog({ initial: null }) },
    /* (parity map, MO-038 · MO-094) Record a PO made elsewhere; Mark delivered and the vendor's WhatsApp about a late delivery (Needs you's row) */
    newExternalPo: () => setRecording(true), markDelivered: (p: PoView) => { void markDelivered(p) }, messageVendor, deliverable,
    openPo: (p: PoView) => setPanel({ kind: 'po', id: p.id }), openBill: (b: BillView) => setPanel({ kind: 'bill', id: b.id }), openExpense: (e: ExpenseView) => setPanel({ kind: 'expense', id: e.id }),
    requestOpen: setRequested,
    poNext, poMenu, billNext, billMenu, expenseNext, expenseMenu, payoutMenu, dialogs,
    /* (simplify S-10) To do's Pay rows open the same pay dialog the lists do — a PO's balance, a bill, a claim */
    payPo: (p: PoView) => setPaying(payTarget({ po: p })), payBill: (b: BillView) => setPaying(payTarget({ bill: b })), payClaim: (e: ExpenseView) => setPaying(payTarget({ expense: e })),
    canPrepare: (projectId: string) => prepares(projectId), vendorOf, personName, projectOf,
  }
}

/** A PO's history line, from its Activity line's detail — the words Activity prints, shorter. */
function historyWords(kind: string, d: Record<string, unknown>, actor: string): string {
  const s = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '')
  switch (kind) {
    case 'project_po_created': return s('from') ? `${actor} made it, copying ${s('from')}` : `${actor} made it — ${s('to')}`
    case 'project_po_edited': return `${actor} changed it${s('from') && s('from') !== s('to') ? ` — ${s('from')} → ${s('to')}` : ''}`
    case 'project_po_submitted': return `${actor} submitted it for approval`
    case 'project_po_withdrawn': return `${actor} took the submission back`
    case 'project_po_sent_back': return `${actor} sent it back — “${s('note')}”`
    case 'project_po_sent': return `${actor} ${d.again ? 'sent it again' : 'sent it'}${s('requester') ? `, approving ${s('requester')}’s submission` : ''}`
    case 'project_po_answered': return s('via') === 'link' ? `${s('vendor') || 'The vendor'} ${s('answer') === 'accepted' ? 'accepted it on the link' : s('answer') === 'changes' ? `asked for changes — “${s('note')}”` : `declined it — “${s('note')}”`}` : `${actor} marked it accepted ${viaWords(s('via'))}`
    case 'project_po_cancelled': return `${actor} cancelled it — “${s('reason')}”`
    case 'project_po_closed': return `${actor} closed it short — “${s('note')}”`
    case 'project_po_removed': return `${actor} removed the Draft`
    case 'parity_b_po_recorded': return `${actor} recorded it — made elsewhere, ${s('to')}`   // (parity map, MO-038)
    case 'parity_b_po_unrecorded': return `${actor} removed the record`
    case 'parity_b_po_delivered': return `${actor} marked it delivered`   // (parity map, MO-094)
    default: return `${actor} — ${kind.replace(/^project_po_/, '').replace(/_/g, ' ')}`
  }
}
