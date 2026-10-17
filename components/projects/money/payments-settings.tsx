'use client'

import { useEffect, useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setPaymentRules } from '@/app/projects/payment-actions'
import { askBankFeed, readCollectionRules, setPaymentMethod, withdrawBankFeedAsk } from '@/app/projects/paper-actions'
import { CONFIRMERS, PAYMENT_METHODS, type Confirmer, type PaymentRules } from '@/lib/projects/payments-model'
import { LAST_METHOD_RULE, METHOD_HELP, isLive, type CollectMethod, type CollectionRules } from '@/lib/projects/payment-methods'
import { displayDate } from '@/lib/format'
import type { ProjectNumbering } from '@/lib/projects/model'
import s from '@/app/settings/settings.module.css'
import u from '../updates/update-review-setting.module.css'
import p from './payments-settings.module.css'

export type PaymentSettingsData = { rules: PaymentRules; numbering: ProjectNumbering; numbers: string[]; team: { id: string; name: string; role: string; active: boolean }[] }

/**
 * (Projects round 6 — Q-48 · F-11 · F-13; 1.0's Payment Methods › Payment Confirmation and trust mode, M-255 · M-256) Settings › Projects ›
 * Payments, on the Invoices card's two grammars: who confirms a client's payment (the house Chips — Assigned designer · Studio owner · A member,
 * and the member's select) and *Trust the client's proof* on the house card table, both saved as they are pressed (a refusal puts them back);
 * then the receipt numbers on the Project numbers card's grammar (prefix, next number, digits, the year, the live example — Discard · Save).
 * How a client pays — the bank and PayNow — stays with the issuing entity (Company › Profile), the one store (F-15, M-267).
 * (simplify S-15, a deliberate change) The card moved from Settings › Projects to Settings › Finance › Money in; the receipt numbers went to
 * Finance's one *Document numbers* card (one Save for INV · RCT · CN · PO), so what is left here saves as it is pressed. `numbering` and
 * `numbers` stay on the data the page hands over — Document numbers reads them.
 * (parity map, FB-112) Then **How clients pay** (`CollectionMethods`, below): a switch per way and the bank-feed ask — it reads its rules from
 * the page (`collection`) or once from the server.
 */
export function PaymentSettings({ rules, team, canManage, collection }: Pick<PaymentSettingsData, 'rules' | 'team'> & { canManage: boolean
  /** (parity map, FB-112) how clients may pay, when the page has it — else the card reads it once */ collection?: CollectionRules | null }) {
  const snackbar = useSnackbar()
  const [r, setR] = useState<PaymentRules>(rules)
  const [busy, setBusy] = useState(false)
  const people = team.filter((m) => m.active)
  const memberName = r.memberId ? team.find((m) => m.id === r.memberId)?.name ?? '' : ''

  const write = async (next: Partial<PaymentRules>, done: string) => {
    if (busy) return
    const before = r
    setR({ ...r, ...next }); setBusy(true)
    try {
      const res = await setPaymentRules({ rules: next })
      if ('error' in res) { setR(before); snackbar({ message: couldnt('change the payment rules', refusalOf(res.error)) }); return }
      setR(res.rules); snackbar({ message: done })
    } catch (e) { setR(before); snackbar({ message: couldnt('change the payment rules', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const pickConfirmer = (c: Confirmer) => {
    if (c === 'member') {
      const first = people.find((m) => m.role === 'Admin') ?? people[0]
      if (!first) return
      void write({ confirmer: 'member', memberId: r.memberId ?? first.id }, `${team.find((m) => m.id === (r.memberId ?? first.id))?.name ?? first.name} confirms every client’s payment`)
      return
    }
    void write({ confirmer: c, memberId: null }, c === 'owner' ? 'The Owner confirms every client’s payment' : 'Each project’s designer confirms its client’s payments')
  }
  const trustLabel = 'Trust the client’s proof'
  return (
    <>
      <div className={s.setting} id="payment-settings" data-testid="payment-settings">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>Client payments</span>   {/* (one-home N-14) "Payments" also named Templates' payment schedules and Finance's Payments out */}
          <span className={s.settingHelp}>When a client says they have paid on their portal: who confirms it, and whether their proof counts before it is confirmed. A payment the studio records is confirmed as it is saved. Then the ways clients may pay.</span>
        </div>
        <div>
          <span className={s.reasonLabel}>Who confirms a client’s payment</span>
          <Chips label="Who confirms a client’s payment" options={CONFIRMERS.map((c) => ({ value: c.value, label: c.label }))} value={r.confirmer} onChange={(v) => pickConfirmer(v as Confirmer)} disabled={!canManage || busy} testId="payment-confirmer" />
          <span className={s.settingHelp}>{CONFIRMERS.find((c) => c.value === r.confirmer)?.help}. Owners and Admins can always confirm one.</span>
        </div>
        {r.confirmer === 'member' ? (
          <div className={s.numGrid}>
            <TextField label="Who confirms" mode="select" value={memberName} options={people.map((m) => m.name)} disabled={!canManage || busy}
                       onChange={(v: string) => { const m = people.find((x) => x.name === v); if (m) void write({ confirmer: 'member', memberId: m.id }, `${m.name} confirms every client’s payment`) }} />
          </div>
        ) : null}
        <div className={`${s.eventTable} ${u.table}`} role="table" aria-label="Payment proof" data-card-table="">
          <div className={s.eventHead} role="row">
            <span role="columnheader">Rule</span><span role="columnheader">Who checks</span><span role="columnheader" className={s.eventCol}>On</span>
          </div>
          <div className={s.eventRow} role="row" data-testid="payment-trust-row">
            <span role="cell" className={s.eventName}>
              <Icon name="verified" size={20} weight={300} />
              <span><span>{trustLabel}</span><span className={s.eventHelp}>On, a client’s proof counts toward the invoice at once and still waits to be checked; Not received takes it back. Off, nothing counts until it is confirmed — the safer choice.</span></span>
            </span>
            <span role="cell" className={s.eventWho} data-label="Who checks">{CONFIRMERS.find((c) => c.value === r.confirmer)?.label ?? 'Assigned designer'}</span>
            <span role="cell" className={s.eventCol} data-label="On">
              <Switch size="sm" isSelected={r.trust} isDisabled={!canManage || busy} onChange={(v: boolean) => { void write({ trust: v }, v ? 'A client’s proof now counts at once — it still waits to be checked' : 'A client’s proof now counts only once it is confirmed') }} aria-label={trustLabel} />
            </span>
          </div>
        </div>
        <CollectionMethods given={collection ?? null} canManage={canManage} />   {/* (parity map, FB-112) */}
      </div>
    </>
  )
}

/**
 * (parity map, FB-112 — 1.0's Payment Methods › Collection Methods) **How clients pay**, on the card table: Bank transfer · PayNow · Cheque ·
 * Cash, each with where the client meets it and who records it, and its switch — saved as it is pressed (a refusal puts it back and says why);
 * the last way on cannot go off (its switch says so in the row). Record a payment and the client's pay box offer the live ones. Then *Match
 * bank transfers automatically*: an honest ask — "Ask OpenMaison to set it up" records it, the row then reads "Asked on 10 Oct — we'll be in
 * touch" with *Withdraw the ask* (1.0's Cancel request). A stand-in: nothing reads a bank feed.
 */
function CollectionMethods({ given, canManage }: { given: CollectionRules | null; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [loaded, setLoaded] = useState<CollectionRules | null>(null)
  useEffect(() => {
    if (given) return
    let live = true
    readCollectionRules().then((x) => { if (live && !('error' in x)) setLoaded(x) }, () => {})   // (S45C) a role's refusal leaves the rules unread
    return () => { live = false }
  }, [given])
  const [mine, setMine] = useState<CollectionRules | null>(null)
  const c = mine ?? given ?? loaded
  const [busy, setBusy] = useState(false)
  const liveCount = c ? PAYMENT_METHODS.filter((m) => isLive(c, m.value)).length : 0
  const press = async (m: CollectMethod, on: boolean) => {
    if (!c || busy) return
    const before = c
    setMine({ ...c, off: on ? c.off.filter((x) => x !== m) : [...c.off, m] }); setBusy(true)
    const label = PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m
    try {
      const res = await setPaymentMethod({ method: m, on })
      if ('error' in res) { setMine(before); snackbar({ message: couldnt(on ? `switch ${label} on` : `switch ${label} off`, refusalOf(res.error)) }); return }
      setMine(res.rules)
      snackbar({ message: on ? `${label} is offered again — on invoices, the client’s page and Record a payment` : `${label} is no longer offered — invoices, the client’s page and Record a payment leave it out` })
    } catch (e) { setMine(before); snackbar({ message: couldnt('change how clients pay', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const ask = async (withdraw: boolean) => {
    if (!c || busy) return
    setBusy(true)
    try {
      const res = withdraw ? await withdrawBankFeedAsk() : await askBankFeed()
      if ('error' in res) { snackbar({ message: couldnt(withdraw ? 'withdraw the ask' : 'send the ask', refusalOf(res.error)) }); return }
      setMine(res.rules)
      if (withdraw) snackbar({ message: 'Ask withdrawn' })
      else snackbar({ message: 'Asked OpenMaison to match bank transfers — we’ll be in touch', actionLabel: 'Undo', onAction: () => { void withdrawBankFeedAsk().then((x) => { if (!('error' in x)) setMine(x.rules) }) } })
    } catch (e) { snackbar({ message: couldnt(withdraw ? 'withdraw the ask' : 'send the ask', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  const ICON: Record<CollectMethod, string> = { bank_transfer: 'account_balance', paynow: 'account_balance_wallet', cheque: 'receipt_long', cash: 'payments' }
  const WHO: Record<CollectMethod, string> = { bank_transfer: 'The client, or the studio', paynow: 'The client, or the studio', cheque: 'The studio', cash: 'The studio' }
  return (
    <div className={s.reasonGroup} data-testid="payment-methods">
      <span className={s.reasonLabel}>How clients pay</span>
      <div className={`${s.eventTable} ${u.table}`} role="table" aria-label="How clients pay" data-card-table="">
        <div className={s.eventHead} role="row">
          <span role="columnheader">Way to pay</span><span role="columnheader">Recorded by</span><span role="columnheader" className={s.eventCol}>Offered</span>
        </div>
        {PAYMENT_METHODS.map((m) => {
          const on = c ? isLive(c, m.value) : true
          const last = on && liveCount <= 1
          return (
            <div key={m.value} className={s.eventRow} role="row" data-testid="payment-method-row" data-method={m.value} data-on={on ? '' : undefined}>
              <span role="cell" className={s.eventName}>
                <Icon name={ICON[m.value]} size={20} weight={300} />
                <span><span>{m.label}</span><span className={s.eventHelp}>{last ? `${METHOD_HELP[m.value]}. ${LAST_METHOD_RULE}.` : METHOD_HELP[m.value]}</span></span>
              </span>
              <span role="cell" className={s.eventWho} data-label="Recorded by">{WHO[m.value]}</span>
              <span role="cell" className={s.eventCol} data-label="Offered">
                <Switch size="sm" isSelected={on} isDisabled={!canManage || !c || busy || last} onChange={(v: boolean) => { void press(m.value, v) }} aria-label={`Offer ${m.label}`} />
              </span>
            </div>
          )
        })}
      </div>
      {/* (parity map, FB-112) 1.0's Bank Feed: a request to the OpenMaison team, not a switch — a stand-in */}
      <div className={p.feed} data-testid="payment-bank-feed" data-asked={c?.bankFeed ? '' : undefined}>
        <span className={s.eventName}>
          <Icon name="link" size={20} weight={300} />
          <span><span>Match bank transfers automatically</span><span className={s.eventHelp}>{c?.bankFeed ? `Asked on ${displayDate(new Date(c.bankFeed.askedAt))}${c.bankFeed.askedByName ? ` by ${c.bankFeed.askedByName}` : ''} — we’ll be in touch to connect the studio’s bank.` : 'Each transfer that arrives is matched to its invoice by its reference, and recorded for you. The OpenMaison team connects the studio’s bank with you.'}</span></span>
        </span>
        <span className={p.feedAction}>
          {c?.bankFeed
            ? <Button appearance="text" variant="secondary" isDisabled={!canManage || busy} onPress={() => { void ask(true) }} data-testid="payment-bank-feed-withdraw">Withdraw the ask</Button>
            : <Button appearance="outlined" variant="secondary" isDisabled={!canManage || !c || busy} onPress={() => { void ask(false) }} data-testid="payment-bank-feed-ask">Ask OpenMaison to set it up</Button>}
        </span>
      </div>
    </div>
  )
}
