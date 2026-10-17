'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal, GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { refusalOf } from '@/components/leads/tasks/use-run'
import { sayPaid } from '@/app/portal/payment-actions'
import { money2 } from '@/lib/quotes/math'
import { clientDay, clientStageName, portalPath } from '@/lib/portal/model'
import { dayLabel, dayOf } from '@/lib/projects/schedule-model'
import { stageWords as inSentence } from '@/lib/portal/schedule-model'
import type { PortalData } from '@/lib/portal/home'
import type { PortalMoneyHome, PortalPayStage } from '@/lib/projects/payments-portal'
import { ContactLine } from '../contact-line'
import { PortalFrame } from '../portal-frame'
import { couldntSay, usePortalSay } from '../use-portal-say'
import { PortalMoneyGhost } from './money-ghosts'
import { IHavePaidDialog } from './i-have-paid'
import { PayBox } from './pay-box'
import { clientMethodsFrom } from './i-have-paid'   // (parity map, FB-112)
import portal from '../portal.module.css'
import styles from './money.module.css'

const pctWords = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`
/** "Mid-project · 30%" — the stage as board 4 names it, in the client's one case (fix-F, F-32). */
const stageWords = (s: PortalPayStage) => (s.pct ? `${clientStageName(s.name)} · ${pctWords(s.pct)}` : s.name)   // (gaps build B) an invoice outside the stages is no share — its own name

/** Brings a payment stage into view and pulses it once — the one What needs you (`#pay-`) or the bell (`?open=`) opened. */
function pulse(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  el.removeAttribute('data-fresh'); void el.offsetWidth; el.setAttribute('data-fresh', '')
  window.setTimeout(() => el.removeAttribute('data-fresh'), 1500)
}

/**
 * (Projects round 6 — the Client Portal Proposal's board 4, F-15 · Q-48) The portal's **Money**: Paid so far (of the contract, with the bar),
 * then each payment stage — paid with its receipt; the one due as board 4's tinted block with how to pay (the studio's PayNow QR with the
 * amount and the invoice number as the reference, the account it goes to, the bank) and **I have paid** (amount, day, reference, the bank's
 * confirmation); a payment the client sent, "Received, waiting for {studio} to confirm"; one the studio couldn't find, with its reason, and
 * the button again; the stages planned, with their day from the schedule as last shared. "Open your signed quote" closes it. A studio's
 * preview shows it all and records nothing (the button is off). `#pay-<invoice>` (What needs you) and `?open=<invoice>` (the bell, fix-F
 * F-17) bring the stage into view and pulse it.
 */
export function PortalMoneyView({ data, homes, methods }: { data: PortalData; homes: PortalMoneyHome[]
  /** (parity map, FB-112) the ways the studio takes today (Settings › Finance › Client payments) — absent = every way */ methods?: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snack = useSnackbar()
  const say = usePortalSay(data.slug)
  const { visitor } = data
  const [paying, setPaying] = useState<{ home: PortalMoneyHome; stage: PortalPayStage } | null>(null)
  const [busy, setBusy] = useState(false)
  const many = homes.length > 1
  const open = params.get('open')
  useEffect(() => {
    const id = open ? `pay-${open}` : window.location.hash.replace(/^#/, '')
    if (!id) return
    const t = window.setTimeout(() => pulse(id), GHOST_MIN_MS + 150)
    if (open) router.replace(pathname, { scroll: false })   // as Choices does: the address goes back to the page's own
    return () => window.clearTimeout(t)
  }, [open, pathname, router])
  const send = async (o: Parameters<Parameters<typeof IHavePaidDialog>[0]['onSend']>[0]) => {
    const p = paying
    if (!p?.stage.invoiceId) return
    setBusy(true)
    try {
      const r = await sayPaid(data.slug, { invoiceId: p.stage.invoiceId, amountMinor: o.amountMinor, paidOn: o.paidOn, method: o.method, reference: o.reference, note: o.note, proof: { name: o.proof.name, dataUrl: o.proof.dataUrl } })
      if ('error' in r) {
        const why = refusalOf(r.error)
        say(couldntSay('send it', why, data.look.studio), r.error)
        return
      }
      setPaying(null)
      snack({ message: `Received — ${data.look.studio} will confirm it and send your receipt` })
      router.refresh()
    } catch { snack({ message: 'Couldn’t send it — please try again' }) } finally { setBusy(false) }
  }
  return (
    <PageReveal skeleton={<PortalMoneyGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="money" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={portal.hello}><h1 className={portal.h1}>Money</h1></div>
        {!homes.length ? (
          <EmptyState icon="payments" tone="plain" title="Nothing to pay yet" testId="portal-money-empty"
                      help={`Once your project with ${data.look.studio} begins, what you have paid and what is due show here, with how to pay.`} />
        ) : homes.map((h) => {
          const home = data.homes.find((x) => x.id === h.homeId)
          const quote = home?.documents.find((d) => d.key.startsWith('q:') && !/^Variation order/.test(d.title))
          return (
            <div key={h.homeId} className={styles.split} data-testid="portal-money">
              {many ? <h2 className={styles.homeHead}>{h.place ? `Your home at ${h.place}` : home?.title}</h2> : null}
              <div className={styles.main}>
                <section className={styles.list} aria-label="Payments" data-slot="payments" data-testid="portal-payments">
                  {h.stages.map((s) => <Stage key={s.key} s={s} home={h} studio={data.look.studio} slug={data.slug} preview={visitor.preview} now={data.now} methods={methods} onPay={() => setPaying({ home: h, stage: s })} />)}
                </section>
              </div>
              <div className={styles.side}>
                <section className={styles.paid} aria-label="Paid so far" data-slot="paid" data-testid="portal-paid">
                  <PaidSoFar h={h} />
                </section>
                {quote ? <a className={styles.quoteLink} data-slot="quote" {...(visitor.preview && quote.previewHref ? { href: quote.previewHref, target: '_blank', rel: 'noreferrer' } : { href: quote.href, target: '_blank', rel: 'noreferrer' })} data-testid="portal-signed-quote">Open your signed quote</a> : null}
                <ContactLine data={data} ask="A question about a payment?" about="about a payment" className={styles.contact} />
              </div>
            </div>
          )
        })}
        <IHavePaidDialog open={!!paying} stage={paying?.stage ?? null} studio={data.look.studio} busy={busy} today={new Date(data.now)} methods={methods} onClose={() => setPaying(null)} onSend={send} />
      </PortalFrame>
    </PageReveal>
  )
}

/** Paid so far: the figure of the contract, the bar, and — when changes were approved — what the contract is made of, to the cent (F-33).
    The Money tab and the home's Money card (board 7) draw this one block. */
export function PaidSoFar({ h }: { h: Pick<PortalMoneyHome, 'paidMinor' | 'contractMinor' | 'baseMinor' | 'variationsMinor' | 'variationsCount'> }) {
  return (
    <>
      <span className={styles.eyebrow}>Paid so far</span>
      <p className={styles.figure}>{money2(h.paidMinor)} <span className={styles.of}>of {money2(h.contractMinor)}</span></p>
      <div className={styles.bar} role="progressbar" aria-label="Paid so far" aria-valuemin={0} aria-valuemax={100} aria-valuenow={h.contractMinor ? Math.round((h.paidMinor / h.contractMinor) * 100) : 0}>
        <div className={styles.barFill} style={{ width: `${h.contractMinor ? Math.min(100, (h.paidMinor / h.contractMinor) * 100) : 0}%` }} />
      </div>
      {h.variationsMinor ? <p className={styles.fine} data-testid="portal-paid-parts">{`Your signed quote ${money2(h.baseMinor ?? 0)} ${h.variationsMinor < 0 ? '−' : '+'} ${h.variationsCount === 1 ? 'one change' : `${h.variationsCount} changes`} you approved ${money2(Math.abs(h.variationsMinor))}.`}</p> : null}
    </>
  )
}

/** (F-03) Who told the studio they paid, as the reader hears it: their own proofs as "You told…", someone else's from the household by name. */
function waitingLines(s: PortalPayStage, studio: string): string[] {
  const groups = new Map<string, PortalPayStage['waiting']>()
  for (const w of s.waiting) { const k = w.mine || !w.by ? '' : w.by; groups.set(k, [...(groups.get(k) ?? []), w]) }
  return [...groups].map(([by, list]) => {
    const sum = list.reduce((n, w) => n + w.amountMinor, 0)
    const last = list.at(-1)!
    const ref = last.reference ? ` (reference ${last.reference})` : ''
    return by ? `${by} told ${studio} about a payment of ${money2(sum)} on ${clientDay(last.paidOn, last.at)}${ref}. You get a receipt once they have confirmed it.`
      : `You told ${studio} you paid ${money2(sum)} on ${clientDay(last.paidOn, last.at)}${ref}. You get a receipt once they have confirmed it.`
  })
}

/** (F-34) A planned stage's line: its day as last shared — once that day has passed and it is still not invoiced, the stage it waits on instead. */
function plannedLine(s: PortalPayStage, now: number): string {
  const p = s.planned
  if (p?.day != null && p.day >= dayOf(new Date(now))) return `Planned for ${dayLabel(p.day)}`
  if (p?.words) return p.words
  if (p?.milestone) return `When ${inSentence(p.milestone)} is done`
  return 'Invoiced later'
}

/** (gaps build F2 — F2-Q9) A paid stage's credit notes, after its receipt: " · Credit note CN-2026-001" — each opens its paper. */
const creditLinks = (s: PortalPayStage, slug: string) => (s.credits ?? []).filter((c) => !c.voided).map((c) => (
  <span key={c.id}>{' · '}<Link className={styles.link} href={portalPath(slug, `money/credit/${c.id}`)} prefetch={false} data-testid="portal-credit-link">{c.overpayment ? `Your credit ${c.number}${c.leftMinor ? ` (${money2(c.leftMinor)} left)` : ''}` : `Credit note ${c.number}${c.backMinor ? ` (${money2(c.backMinor)} to come back to you)` : ''}`}</Link></span>   /* (pending modules S07) an overpayment kept as their credit · (S42 audit C-22) a credit note's money still owed back says so *(invented copy)* */
))

/** One payment stage, as board 4 draws it: a row once paid or planned; the tinted block while it is due or waits for the studio. */
function Stage({ s, home, studio, slug, preview, now, methods, onPay }: { s: PortalPayStage; home: PortalMoneyHome; studio: string; slug: string; preview: boolean; now: number; methods?: string[]; onPay: () => void }) {
  /* (parity map, FB-112) I have paid offers the live ones of its two (bank transfer · PayNow); with neither taken, the client pays in person and
     the studio records it — the press steps aside and says how */
  const clientWays = clientMethodsFrom(methods)
  const inPerson = (methods ?? []).filter((m) => m === 'cheque' || m === 'cash').map((m) => (m === 'cash' ? 'in cash' : 'by cheque'))
  const receiptHref = (id: string) => portalPath(slug, `money/receipt/${id}`)
  if (s.state === 'paid' || s.state === 'planned') {
    const receipt = s.receipts.filter((r) => !r.reversed).at(-1) ?? null
    return (
      <div className={styles.stage} id={s.invoiceId ? `pay-${s.invoiceId}` : undefined} data-testid="portal-pay-stage" data-state={s.state}>
        <span className={styles.stageText}>
          <span className={styles.stageName}>{stageWords(s)}</span>
          <span className={styles.stageLine}>
            {s.state === 'paid'
              ? <>{`Paid ${s.paidAt ? clientDay(s.paidAt, now) : ''}`}{receipt ? <>{' · '}<Link className={styles.link} href={receiptHref(receipt.paymentId)} prefetch={false} data-testid="portal-receipt-link">Receipt</Link></> : null}</>
              : plannedLine(s, now)}
            {creditLinks(s, slug)}
          </span>
        </span>
        <span className={styles.amount}>{money2(s.amountMinor)}</span>
      </div>
    )
  }
  const pay = home.pay
  /* (F-07) what already arrived on this stage — a part payment confirmed — keeps its line and its receipt (board 4: "Paid … · Receipt") */
  const confirmed = s.receipts.filter((r) => !r.reversed)
  return (
    <div className={styles.due} id={s.invoiceId ? `pay-${s.invoiceId}` : undefined} data-state={s.state} data-testid="portal-pay-due">
      <div className={styles.dueHead}>
        <span className={styles.stageText}>
          <span className={styles.dueName}>{stageWords(s)}</span>
          <span className={styles.dueWhen}>{s.state === 'to_confirm' ? `Received, waiting for ${studio} to confirm` : s.dueAt && s.dueAt > now ? `Due ${clientDay(s.dueAt, now)}` : 'Due now'}</span>
        </span>
        <span className={styles.dueAmount}>{money2(s.state === 'to_confirm' ? s.amountMinor - s.paidMinor : s.owedMinor)}</span>
      </div>
      {confirmed.map((r) => (
        <p key={r.paymentId} className={styles.paidLine} data-testid="portal-pay-part">
          {/* (pending modules S07 — D-14) a payment taken from the client's credit says so *(invented copy)* */}
          {r.fromCredit ? `${money2(r.amountMinor)} from your credit ${r.fromCredit}, ${clientDay(r.paidOn, now)}` : `Paid ${money2(r.amountMinor)} on ${clientDay(r.paidOn, now)}`}{' · '}
          <Link className={styles.link} href={receiptHref(r.paymentId)} prefetch={false} data-testid="portal-receipt-link">Receipt</Link>
        </p>
      ))}
      {(s.credits ?? []).filter((c) => !c.voided).map((c) => (
        <p key={c.id} className={styles.paidLine} data-testid="portal-credit-line">
          {/* (pending modules S07 — D-14) an overpayment: the client's money, kept as their credit *(invented copy)* */}
          {c.overpayment ? `You paid ${money2(c.amountMinor)} more — kept as your credit, ${c.number}${c.leftMinor ? ` (${money2(c.leftMinor)} left)` : ''}` : `Credit note ${c.number}: ${money2(c.amountMinor)} off${c.backMinor ? ` — ${money2(c.backMinor)} to come back to you` : ''}`}{' · '}
          <Link className={styles.link} href={portalPath(slug, `money/credit/${c.id}`)} prefetch={false} data-testid="portal-credit-link">See it</Link>
        </p>
      ))}
      {waitingLines(s, studio).map((line) => <p key={line} className={styles.waiting} data-testid="portal-pay-waiting">{line}</p>)}
      {s.state === 'due' ? (
        <>
          {s.refused ? <p className={styles.refused} data-testid="portal-pay-refused">{`${studio} couldn’t find your payment of ${money2(s.refused.amountMinor)} from ${clientDay(s.refused.paidOn, now)}: ${s.refused.reason}`}</p> : null}
          {pay ? <PayBox pay={pay} stage={s} /> : <p className={styles.fine}>{`${studio} sends how to pay with the invoice.`}</p>}
          {clientWays.length ? (
            <>
              <button type="button" className={styles.payGo} onClick={onPay} disabled={preview} data-testid="portal-i-have-paid">I have paid</button>
              <p className={styles.fine}>Add your bank&rsquo;s confirmation so the studio can match it. You get a receipt once they have.</p>
            </>
          ) : !pay ? <p className={styles.fine} data-testid="portal-pay-in-person">{`Pay ${studio} ${inPerson.length ? inPerson.join(' or ') : 'in person'} — they record it when it arrives, and you get a receipt.`}</p> : null}
        </>
      ) : null}
      {s.number ? <Link className={styles.link} href={portalPath(slug, `money/invoice/${s.invoiceId}`)} prefetch={false} data-testid="portal-invoice-link">{`See invoice ${s.number}`}</Link> : null}
    </div>
  )
}
