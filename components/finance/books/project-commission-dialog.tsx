'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Checkbox, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { displayDate } from '@/lib/format'
import { COMMISSION_BASES, MAX_RATE_BP, pctWords, ruleWords, stagesWords, validRule, type CommissionBasis, type RuleStage } from '@/lib/finance/commission'
import { readProjectCommission, setProjectCommission, undoProjectCommission, type ProjectCommissionData } from '@/app/finance/commission-actions'
import { askCommissionRate, withdrawCommissionAsk } from '@/app/finance/books-actions'
import { RuleDialog } from './commission-dialogs'
import { payShareWord } from '@/lib/projects/schedule-model'   // (S44O — row 297)
import money from '@/components/projects/money/money.module.css'
import b from './books.module.css'

/**
 * (parity map, FB-042 · FB-043 — her "build everything that's in 1.0" 2026-10-10; 1.0's New Project › Commission Structure and the payment
 * stage's *Trigger commission*) **A project's commission, in one dialog** — opened from the project's ⋮ › Commission… (P-E's door), the
 * completed project's "Set commission for …" task's bell row (`?commission=1`, FB-055) and its Activity lines (FB-057):
 * - **Owners and Admins** pick one of three — *The studio's rule* (the default; its rate shown) · *A rate for this project* · *No commission* —
 *   and, on a % rate, *Pay on chosen payment stages*: a tick per stage of the Payment Schedule, each with an optional rate of its own
 *   (`commission_rules.stages_json`; blank = the rule's). A change applies from today, earlier payments keep what they earned; Save answers with
 *   Undo. A member's own rate on the project (Finance › Commission) is named under it, never hidden.
 * - **A Designer** reads the rule that applies to them here and **Ask for a different rate** (today's ask, F2-Q7) — or what they asked and its
 *   answer, with *Take it back* while it is open.
 * Settings › Finance › Commission keeps its list (every rate, the studio's rule). Mount it once in the project's frame with its `projectId`;
 * `openProjectCommission(projectId)` opens it from anywhere on the page. Invented copy.
 */

type Listener = (projectId: string) => void
const listeners = new Set<Listener>()
/** Open the dialog for a project — the frame's mounted `ProjectCommissionDialog` hears it (a no-op when none is mounted). */
export function openProjectCommission(projectId: string): void { listeners.forEach((l) => l(projectId)) }

type Mode = 'studio' | 'rate' | 'none'
const MODES: { value: Mode; label: string }[] = [
  { value: 'studio', label: 'The studio’s rule' },
  { value: 'rate', label: 'A rate for this project' },
  { value: 'none', label: 'No commission' },
]
const pctText = (bp: number) => (bp ? String(bp / 100) : '')
const toBp = (s: string) => { const n = Math.round(Number(s.replace(/,/g, '')) * 100); return Number.isFinite(n) ? n : 0 }
const toMinor = (s: string) => { const n = Math.round(Number(s.replace(/,/g, '')) * 100); return Number.isFinite(n) ? n : 0 }

/** `?commission=1` on the project's page (the completed project's task bell row, an Activity line): opens the dialog once. Its own piece, in
    a Suspense boundary, so a page that mounts the dialog without a project never reads the address. */
function OpenFromAddress({ projectId }: { projectId: string }) {
  const params = useSearchParams()
  const asked = params?.get('commission') === '1'
  useEffect(() => {
    if (!asked) return
    /* after the dialog's own listener is in (a child's effect runs before its parent's) */
    const t = window.setTimeout(() => {
      openProjectCommission(projectId)
      try { const u = new URL(window.location.href); u.searchParams.delete('commission'); window.history.replaceState(null, '', u.toString()) } catch { /* the address is a convenience */ }
    }, 0)
    return () => window.clearTimeout(t)
  }, [asked, projectId])
  return null
}

export function ProjectCommissionDialog({ projectId }: { projectId?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [openId, setOpenId] = useState<string | null>(null)
  const current = openId
  const [data, setData] = useState<ProjectCommissionData | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  /* the form */
  const [mode, setMode] = useState<Mode>('studio')
  const [basis, setBasis] = useState<CommissionBasis>('payments')
  const [rate, setRate] = useState('')
  const [fixed, setFixed] = useState('')
  const [staged, setStaged] = useState(false)
  const [ticks, setTicks] = useState<Record<string, string | null>>({})   // ref → its own rate typed ('' = the rule's); absent = not ticked
  const [tried, setTried] = useState(false)
  const [seeded, setSeeded] = useState<ProjectCommissionData | null>(null)

  useEffect(() => { const l: Listener = (id) => { setOpenId(id); setLoadedFor(null) }; listeners.add(l); return () => { listeners.delete(l) } }, [])
  useEffect(() => {
    if (!current || loadedFor === current) return
    let live = true
    readProjectCommission(current).then((r) => {
      if (!live) return
      if ('error' in r) { setFailed(r.error); setData(null) } else { setFailed(null); setData(r) }
      setLoadedFor(current)
    }).catch((e: unknown) => { if (live) { setFailed(refusalOf(e)); setLoadedFor(current) } })
    return () => { live = false }
  }, [current, loadedFor])
  /* seed the form from what is in force (render-phase adjust) */
  if (data && data !== seeded) {
    setSeeded(data)
    const own = data.own
    setMode(!own ? 'studio' : own.basis === 'none' ? 'none' : 'rate')
    setBasis(own && own.basis !== 'none' ? own.basis : 'payments')
    setRate(own ? pctText(own.rateBp) : '')
    setFixed(own && own.fixedMinor ? (own.fixedMinor / 100).toFixed(2) : '')
    setStaged(!!own?.stages?.length)
    setTicks(Object.fromEntries((own?.stages ?? []).map((x) => [x.ref, x.rateBp ? pctText(x.rateBp) : ''])))
    setTried(false)
  }

  const close = () => { setOpenId(null); setData(null); setLoadedFor(null); setFailed(null); setSeeded(null) }
  const reload = () => { setLoadedFor(null); setSeeded(null) }

  const open = !!current && !asking
  const runs = !!data?.viewer.runs
  const rateBp = toBp(rate), fixedMinor = toMinor(fixed)
  const ruleWhy = mode === 'rate' ? validRule({ basis, rateBp, fixedMinor }) : null
  const stagesOffered = mode === 'rate' && (basis === 'payments' || basis === 'profit') && (data?.stages.length ?? 0) > 1
  const chosen: RuleStage[] = stagesOffered && staged ? (data?.stages ?? []).filter((s) => ticks[s.ref] !== undefined).map((s) => ({ ref: s.ref, rateBp: ticks[s.ref] ? toBp(ticks[s.ref]!) : null })) : []
  const stageWhy = stagesOffered && staged ? (!chosen.length ? 'Tick at least one stage — or turn this off to pay on every payment'
    : chosen.some((x) => x.rateBp !== null && !(x.rateBp > 0 && x.rateBp <= MAX_RATE_BP)) ? `Each stage’s rate is between 0.01% and ${MAX_RATE_BP / 100}%, or blank` : null) : null
  const draftWords = mode === 'studio' ? data?.studio.words ?? '' : mode === 'none' ? 'No commission' : ruleWords({ basis, rateBp, fixedMinor, stages: chosen.length ? chosen : null })
  const changed = (() => {
    const own = data?.own ?? null
    if (mode === 'studio') return !!own
    if (!own) return true
    if (mode === 'none') return own.basis !== 'none'
    const was = JSON.stringify((own.stages ?? []).map((x) => [x.ref, x.rateBp]))
    const now = JSON.stringify(chosen.map((x) => [x.ref, x.rateBp]))
    return own.basis !== basis || (basis === 'fixed' ? own.fixedMinor !== fixedMinor : own.rateBp !== rateBp) || was !== now
  })()

  const save = async () => {
    setTried(true)
    if (!data || ruleWhy || stageWhy) return
    if (!changed) { close(); return }
    setBusy(true)
    try {
      const r = await setProjectCommission(data.project.id, { mode, basis, rateBp, fixedMinor, stages: chosen.length ? chosen : null })
      if ('error' in r) { snackbar({ message: couldnt('save the commission', refusalOf(r.error)) }); return }
      close()
      router.refresh()
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => {
        void undoProjectCommission(r.undo).then((x) => { snackbar({ message: 'error' in x ? couldnt('put it back', refusalOf(x.error)) : 'The commission is as it was' }); router.refresh() })
          .catch((e: unknown) => snackbar({ message: couldnt('put it back', refusalOf(e)) }))
      } })
    } catch (e) { snackbar({ message: couldnt('save the commission', refusalOf(e)) }) } finally { setBusy(false) }
  }
  const takeBack = async (id: string) => {
    setBusy(true)
    try {
      const r = await withdrawCommissionAsk(id)
      if ('error' in r) { snackbar({ message: couldnt('take the ask back', refusalOf(r.error)) }); return }
      snackbar({ message: 'Ask taken back' }); reload(); router.refresh()
    } catch (e) { snackbar({ message: couldnt('take the ask back', refusalOf(e)) }) } finally { setBusy(false) }
  }

  const p = data?.project
  const openAsk = data?.ask?.status === 'open' ? data.ask : null
  const canAsk = !!data && !runs && data.viewer.onTeam && !openAsk
  const footer = runs ? (
    <><Button variant="secondary" appearance="outlined" onPress={close} isDisabled={busy}>Cancel</Button>
      <Button onPress={() => { void save() }} isDisabled={busy || !data} data-testid="project-commission-save">{busy ? 'Saving…' : 'Save'}</Button></>
  ) : (
    <>{canAsk ? <Button variant="secondary" appearance="outlined" onPress={() => setAsking(true)} isDisabled={busy} data-testid="project-commission-ask">Ask for a different rate</Button> : null}
      <Button onPress={close} isDisabled={busy} data-testid="project-commission-close">Close</Button></>
  )
  let body: React.ReactNode
  if (failed) body = <p className={b.calm} data-testid="project-commission-refused">{failed}</p>
  else if (!data) body = <p className={b.calm} aria-busy="true">Reading the project’s commission…</p>
  else if (runs) body = (
    <>
      <div>
        <span className={money.fieldLabel}>On this project</span>
        <Chips label="On this project" options={MODES} value={mode} onChange={(v) => setMode(v as Mode)} testId="project-commission-mode" />
      </div>
      {mode === 'studio' ? <p className={b.calm} data-testid="project-commission-studio">{data.studio.words} — the studio’s rule, as on every project without a rate of its own.</p> : null}
      {mode === 'none' ? <p className={b.calm}>Nobody earns commission on this project from today — what earlier payments earned stays.</p> : null}
      {mode === 'rate' ? (
        <>
          <div>
            <span className={money.fieldLabel}>How it is worked out</span>
            <Chips label="How it is worked out" options={COMMISSION_BASES.filter((x) => x.value !== 'none').map((x) => ({ value: x.value, label: x.label }))} value={basis} onChange={(v) => setBasis(v as CommissionBasis)} testId="project-commission-basis" />
            <span className={money.sub}>{COMMISSION_BASES.find((x) => x.value === basis)?.help}</span>
          </div>
          {basis === 'fixed'
            ? <TextField label="Amount for the project (S$)" value={fixed} numeric="money" onChange={setFixed} required error={tried ? ruleWhy ?? undefined : undefined} helper="Earned once, with the project’s first payment" />
            : <TextField label="Rate (%)" value={rate} numeric="decimal" onChange={setRate} required error={tried ? ruleWhy ?? undefined : undefined} helper={`Up to ${MAX_RATE_BP / 100}% — before GST`} />}
          {stagesOffered ? (
            <div className={b.stagePick} data-testid="project-commission-stages">
              <Switch size="sm" isSelected={staged} onChange={setStaged} data-testid="project-commission-staged">Pay on chosen payment stages</Switch>
              {staged ? (
                <>
                  <ul className={b.stageList}>
                    {data.stages.map((s) => {
                      const on = ticks[s.ref] !== undefined
                      return (
                        <li key={s.ref} className={b.stageRow} data-testid="project-commission-stage">
                          <Checkbox isSelected={on} onChange={(v: boolean) => setTicks((t) => { const n = { ...t }; if (v) n[s.ref] = n[s.ref] ?? ''; else delete n[s.ref]; return n })}>{`${s.name} · ${payShareWord(s)}`}</Checkbox>   {/* (S44O — row 297) a fixed fee says its amount, never 0% */}
                          {on ? <TextField label="Its rate (%)" value={ticks[s.ref] ?? ''} numeric="decimal" onChange={(v) => setTicks((t) => ({ ...t, [s.ref]: v }))} helper={rateBp ? `Blank = ${pctWords(rateBp)}` : 'Blank = the rate above'} /> : null}
                        </li>
                      )
                    })}
                  </ul>
                  {tried && stageWhy ? <span className={money.sub} data-tone="alert">{stageWhy}</span> : null}
                </>
              ) : <span className={money.sub}>Off — every payment the client makes on the contract earns it.</span>}
            </div>
          ) : null}
        </>
      ) : null}
      {data.others.length ? (
        <p className={b.calm} data-testid="project-commission-others">Also on this project: {data.others.map((o) => `${o.name} — ${o.words}`).join(' · ')}. A member’s own rate here comes first; change it in Finance › Commission.</p>
      ) : null}
      {mode !== 'studio' && !ruleWhy && !stageWhy && draftWords ? <span className={b.calm}>{mode === 'rate' && chosen.length ? `${draftWords} — ${stagesWords(chosen, data.stages)}` : draftWords} from today; earlier payments keep what they earned.</span> : null}
    </>
  )
  else body = (
    <>
      <div data-testid="project-commission-yours">
        <span className={money.fieldLabel}>{data.yours ? 'Your commission here' : 'On this project'}</span>
        <span className={b.stack}>
          <span>{data.yours ? data.yours.words : data.own ? data.own.words : data.studio.words}</span>
          <span className={money.sub}>{data.yours ? data.yours.scope : data.own ? 'This project’s rate' : 'The studio’s rule'}</span>
        </span>
      </div>
      {data.own?.stages?.length ? <p className={b.calm}>Paid on {stagesWords(data.own.stages, data.stages)}.</p> : null}
      {data.ask ? (
        <div className={b.askLine} data-testid="project-commission-asked">
          <span className={b.calm}>
            {data.ask.status === 'open' ? `You asked for ${data.ask.words} on ${displayDate(new Date(data.ask.createdAt))} — an Owner or an Admin answers it.`
              : data.ask.status === 'approved' ? `You asked for ${data.ask.words} — approved${data.ask.answeredAt ? ` on ${displayDate(new Date(data.ask.answeredAt))}` : ''}.`
                : `You asked for ${data.ask.words} — declined${data.ask.note ? `: “${data.ask.note}”` : ''}.`}
          </span>
          {openAsk ? <Button appearance="text" onPress={() => { void takeBack(openAsk.id) }} isDisabled={busy}>Take it back</Button> : null}
        </div>
      ) : null}
    </>
  )
  return (
    <>
      {projectId ? <Suspense fallback={null}><OpenFromAddress projectId={projectId} /></Suspense> : null}
      <Dialog open={open} onClose={close} title="Commission" subtitle={p ? `${p.name} · ${p.number}` : undefined} size="form" width={600} footer={footer}>
        <div className={money.fields} data-testid="project-commission-dialog">{body}</div>
      </Dialog>
      <RuleDialog open={asking} title="Ask for a different rate" subtitle={p ? `${p.name} — an Owner or an Admin answers it.` : undefined} initial={null} allowNone={false} ask busy={busy} saveLabel="Send the ask" testId="commission-ask-dialog"
                  onClose={() => setAsking(false)}
                  onSave={(o) => {
                    if (!p) return
                    setBusy(true)
                    askCommissionRate({ projectId: p.id, basis: o.basis, rateBp: o.rateBp, fixedMinor: o.fixedMinor, reason: o.reason })
                      .then((r) => { if ('error' in r) { snackbar({ message: couldnt('send the ask', refusalOf(r.error)) }); return } setAsking(false); snackbar({ message: r.sentence }); reload(); router.refresh() })
                      .catch((e: unknown) => snackbar({ message: couldnt('send the ask', refusalOf(e)) }))
                      .finally(() => setBusy(false))
                  }} />
    </>
  )
}
