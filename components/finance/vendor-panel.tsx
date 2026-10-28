'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Dialog, DialogMessage } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { displayDate, phoneLocal } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { PO_STATE_LABEL, BILL_STATE_LABEL, EXPENSE_STATE_LABEL, methodLabel, type VendorRecord } from '@/lib/finance/model'
import type { CostSummary } from '@/lib/finance/costs'
import { mergeVendors, previewMerge, setVendorActive, undoMerge, updateVendor, type MergePreview, type VendorInput } from '@/app/finance/vendor-actions'
import { CostPanel } from './cost-panel'
import { tagOf, type RowAction } from './cost-tables'
import { VendorDialog } from './vendor-dialog'
import money from '@/components/projects/money/money.module.css'
import fin from './finance.module.css'
import link from '@/components/om/text-link.module.css'
import { withFrom } from '@/lib/nav'
import type { CrewBoardData } from '@/lib/projects/contractors'
import { CREW_STATUS_LABEL, jobOf, lineOf, windowWords } from '@/lib/projects/contractors-model'
import { dayOf, plural } from '@/lib/projects/schedule-model'

/*
 * (gaps build F1 — F1-Q4) A vendor in the house side panel: its details, how the studio pays it (Owners and Admins), its POs, bills, (parity map,
 * MO-074) the expenses that name it, and payments —
 * the transaction history 1.0 kept in a drawer — and, for Owners and Admins, its balance, Edit, Deactivate (Undo) and Merge into another (the
 * duplicate's records move, the one kept takes the details it lacks; the move is said before it happens; Undo).
 */
export function useVendorPanel({ vendors, summary, trades, viewer, projectName, initial = null, crew = null }: {
  vendors: VendorRecord[]; summary: CostSummary; trades: string[]; viewer: { changesVendor: boolean; seesBank: boolean; seesFigures: boolean }; projectName: (id: string | null) => string
  /** `?open=<vendor>` (the search) — the panel opens on it */ initial?: string | null
  /** (S45B · H-UHD-2) the contractors' records — a contractor's panel lists the sites they are on, the Workload view's words */ crew?: CrewBoardData | null
}) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [openId, setOpenId] = useState<string | null>(initial)
  const [editing, setEditing] = useState<VendorRecord | null>(null)
  const [merging, setMerging] = useState<VendorRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const v = vendors.find((x) => x.id === openId) ?? null

  const toggle = async (x: VendorRecord) => {
    const r = await setVendorActive(x.id, !x.isActive).catch((e: unknown) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { snackbar({ message: couldnt(x.isActive ? 'deactivate the vendor' : 'reactivate the vendor', refusalOf(r.error)) }); return }
    snackbar({ message: x.isActive ? `${x.name} is deactivated — it leaves every picker; its records stay` : `${x.name} is active again`, actionLabel: 'Undo', onAction: () => { void run('undo it', () => setVendorActive(x.id, x.isActive), x.isActive ? `${x.name} is active again` : `${x.name} is deactivated`) } })
  }
  const save = async (i: VendorInput) => {
    if (!editing) return
    setBusy(true)
    try {
      const r = await updateVendor(editing.id, i)
      if ('error' in r) { snackbar({ message: couldnt('save the vendor', refusalOf(r.error)) }); return }
      setEditing(null); snackbar({ message: `${r.vendor.name} saved` })
    } catch (e) { snackbar({ message: couldnt('save the vendor', refusalOf(e)) }) } finally { setBusy(false) }
  }
  const menu = (x: VendorRecord): RowAction[] => {
    const out: RowAction[] = [{ label: 'Open', run: () => setOpenId(x.id) }]
    if (viewer.changesVendor && !x.mergedInto) {
      out.push({ label: 'Edit', run: () => setEditing(x) })
      out.push({ label: 'Merge into another…', run: () => setMerging(x), help: 'A duplicate — its POs, bills and expenses move' })
      out.push({ label: x.isActive ? 'Deactivate' : 'Reactivate', run: () => { void toggle(x) }, tone: x.isActive ? 'danger' : undefined, help: x.isActive ? 'It leaves every picker; its records stay' : undefined })
    }
    return out
  }
  const pos = v ? summary.pos.filter((p) => p.vendorId === v.id) : []
  const bills = v ? summary.bills.filter((b) => b.vendorId === v.id) : []
  const pays = v ? summary.payouts.filter((p) => p.vendorId === v.id && p.kind !== 'claim') : []
  /* (parity map, MO-074 — 1.0's transaction history kept the expenses that name the vendor) */
  const spent = v ? summary.expenses.filter((e) => e.vendorId === v.id).sort((a, b) => b.spentOn - a.spentOn) : []
  const bal = v ? summary.byVendor.find((b) => b.vendorId === v.id) : null
  /* (S45B) a contractor's places on projects, newest work first, and how they stand this week — the Workload view's own words */
  const today = crew ? dayOf(new Date(crew.now)) : 0
  const sitesById = new Map((crew?.sites ?? []).map((x) => [x.id, x]))
  const jobs = v && crew ? crew.crew.filter((r) => r.vendorId === v.id).map((r) => jobOf(r, sitesById, today)).sort((a, b) => (b.start ?? 0) - (a.start ?? 0)) : []
  const asContractor = v && crew ? crew.contractors.find((x) => x.id === v.id) ?? null : null
  const standing = asContractor && crew ? lineOf(asContractor, crew.crew.map((r) => jobOf(r, sitesById, today)), today) : null
  const here = v ? `/company/finance/vendors?open=${encodeURIComponent(v.id)}` : '/company/finance/vendors'
  const node = (
    <>
      {v ? (
        <CostPanel open title={v.name} testId="vendor-panel" onClose={() => setOpenId(null)}
                   status={<>{v.mergedInto ? tagOf(`Merged into ${vendors.find((x) => x.id === v.mergedInto)?.name ?? 'another'}`, 'default') : v.isActive ? tagOf('Active', 'green') : tagOf('Inactive', 'default')}{v.trade ? <span className={money.sub}>{v.trade}</span> : null}</>}
                   note={v.notes ? { text: v.notes } : null}
                   facts={[
                     ...(v.contactName ? [{ label: 'Contact', value: v.contactName }] : []),
                     ...(v.phone ? [{ label: 'Mobile', value: phoneLocal(v.phone) }] : []),
                     ...(v.email ? [{ label: 'Email', value: v.email }] : []),
                     ...(v.uen ? [{ label: 'UEN', value: v.uen }] : []),
                     { label: 'GST', value: v.chargesGst ? 'Charges GST — its POs add it' : 'Doesn’t charge GST' },
                     /* (S45B) works on site: the trades, how many sites at once, the studio's code — and how they stand this week */
                     ...(v.contractor ? [{ label: 'On site', value: `${v.contractor.trades.join(', ') || 'No trade set'} · ${plural(v.contractor.capacity, 'site')} at once${v.contractor.code ? ` · ${v.contractor.code}` : ''}` }] : []),
                     ...(standing && v.isActive ? [{ label: 'This week', value: `${standing.words} · ${standing.detail}` }] : []),
                     ...(v.bank ? [{ label: 'Bank', value: [v.bank.bankName, v.bank.accountName, v.bank.accountNo].filter(Boolean).join(' · ') || 'Not given' }, ...(v.bank.payNow ? [{ label: 'PayNow', value: v.bank.payNow }] : [])] : []),
                     /* (the calm UI build 2026-10-27, W-303) "To pay" — the Vendors list's word for what the studio still owes */
                     ...(viewer.seesFigures && bal ? [{ label: 'Committed', value: money2(bal.committedMinor) }, { label: 'Paid', value: money2(bal.paidMinor) }, { label: 'To pay', value: `${money2(bal.owedMinor)}${bal.overdueMinor ? ` — ${money2(bal.overdueMinor)} overdue` : ''}` }] : []),
                     /* (pending modules S24) a vendor that is a Marketplace brand opens its page — its deals, products and contacts — and comes back here */
                     ...(v.marketplaceBrandId ? [{ label: 'Marketplace', value: <Link className={link.link} href={withFrom(`/marketplace/${v.marketplaceBrandId}`, `/company/finance/vendors?open=${encodeURIComponent(v.id)}`)} data-testid="vendor-marketplace">See it on the Marketplace</Link> }] : []),
                   ]}
                   extra={(
                     <>
                       <section className={fin.section}>
                         <h3 className={fin.sectionTitle}>Purchase orders</h3>
                         {pos.length ? <ul className={fin.panelLines}>{pos.map((p) => <li key={p.id} className={fin.panelLine}><span>{p.number} · {PO_STATE_LABEL[p.state]}<span className={money.sub}> · {projectName(p.projectId)}</span></span><span className={money.num}>{money2(p.totalMinor)}</span></li>)}</ul> : <span className={money.sub}>None yet.</span>}
                       </section>
                       <section className={fin.section}>
                         <h3 className={fin.sectionTitle}>Bills</h3>
                         {bills.length ? <ul className={fin.panelLines}>{bills.map((b) => <li key={b.id} className={fin.panelLine}><span>{b.reference} · {BILL_STATE_LABEL[b.state]}<span className={money.sub}> · {projectName(b.projectId)}</span></span><span className={money.num}>{money2(b.totalMinor)}</span></li>)}</ul> : <span className={money.sub}>None yet.</span>}
                       </section>
                       {crew && (v.contractor || jobs.length) ? (
                         <section className={fin.section} data-testid="vendor-panel-sites">
                           <h3 className={fin.sectionTitle}>Sites</h3>
                           {jobs.length ? <ul className={fin.panelLines}>{jobs.map((j) => (
                             <li key={j.id} className={fin.panelLine}>
                               <span>{j.site?.visible ? <Link className={link.link} href={withFrom(`/projects/${j.projectId}/schedule?crew=1`, here)}>{j.site.name}</Link> : 'Another project'}<span className={money.sub}> · {j.trade} · {j.milestone ? `${j.milestone.title}, ` : ''}{windowWords(j)}</span></span>
                               <span className={money.sub}>{j.site && j.site.stage === 'completed' ? 'Handed over' : j.site?.onHold ? 'On hold' : j.late ? 'Running late' : CREW_STATUS_LABEL[j.state]}</span>
                             </li>
                           ))}</ul> : <span className={money.sub}>On no project yet — put them on a milestone from a project’s Schedule.</span>}
                         </section>
                       ) : null}
                       <section className={fin.section} data-testid="vendor-panel-expenses">
                         <h3 className={fin.sectionTitle}>Expenses</h3>
                         {spent.length ? <ul className={fin.panelLines}>{spent.map((e) => <li key={e.id} className={fin.panelLine}><span>{e.description} · {EXPENSE_STATE_LABEL[e.state]}<span className={money.sub}> · {displayDate(new Date(e.spentOn))} · {projectName(e.projectId)}</span></span><span className={money.num}>{money2(e.amountMinor)}</span></li>)}</ul> : <span className={money.sub}>None yet.</span>}
                       </section>
                     </>
                   )}
                   payments={pays.map((p) => ({ id: p.id, text: <>{displayDate(new Date(p.paidOn))} · {methodLabel(p.method)}{p.reference ? ` · ${p.reference}` : ''}</>, amount: p.amountMinor, reversed: p.reversedAt ? p.reverseReason ?? '' : null }))}
                   actions={viewer.changesVendor && !v.mergedInto ? [{ label: 'Edit', run: () => setEditing(v), primary: true, testId: 'vendor-edit' }] : []}
                   menu={menu(v).filter((a) => a.label !== 'Open' && a.label !== 'Edit')} />
      ) : null}
      <VendorDialog open={!!editing} initial={editing} trades={trades} bank={viewer.seesBank} busy={busy} onClose={() => setEditing(null)} onSave={(i) => { void save(i) }} />
      <MergeDialog from={merging} vendors={vendors} onClose={() => setMerging(null)} onMerged={() => { setMerging(null); setOpenId(null) }} />
    </>
  )
  return { open: (x: VendorRecord) => setOpenId(x.id), edit: (x: VendorRecord) => setEditing(x), menu, node }
}

/** (F1-Q4) Merge a duplicate into the vendor that stays — what moves is said before it moves (1.0's preview), one sentence after, with Undo. */
function MergeDialog({ from, vendors, onClose, onMerged }: { from: VendorRecord | null; vendors: VendorRecord[]; onClose: () => void; onMerged: () => void }) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [into, setInto] = useState<string | null>(null)
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [wasFor, setWasFor] = useState<string | null>(null)
  if ((from?.id ?? null) !== wasFor) { setWasFor(from?.id ?? null); setInto(null); setPreview(null) }
  const others = vendors.filter((v) => v.isActive && !v.mergedInto && v.id !== from?.id)
  const pick = async (id: string) => {
    setInto(id); setPreview(null)
    if (!from) return
    const r = await previewMerge(from.id, id).catch(() => null)
    if (r && !('error' in r)) setPreview(r)
  }
  const merge = async () => {
    if (!from || !into) return
    setBusy(true)
    try {
      const r = await mergeVendors(from.id, into)
      if ('error' in r) { snackbar({ message: couldnt('merge the vendors', refusalOf(r.error)) }); return }
      onMerged()
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the merge', () => undoMerge(r.undo), `${from.name} is its own vendor again`) } })
    } catch (e) { snackbar({ message: couldnt('merge the vendors', refusalOf(e)) }) } finally { setBusy(false) }
  }
  const keep = others.find((v) => v.id === into) ?? null
  const words = (n: number, one: string) => (n ? `${n} ${one}${n === 1 ? '' : 's'}` : '')
  return (
    <Dialog open={!!from} onClose={onClose} title={`Merge ${from?.name ?? 'the vendor'}`} size="form" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void merge() }} isDisabled={busy || !into || !preview} data-testid="merge-save">{busy ? 'Merging…' : 'Merge'}</Button></>}>
      <div className={money.fields} data-testid="merge-dialog">
        <DialogMessage>{from?.name} is a duplicate — pick the vendor that stays. Its records move there, and it is kept as merged.</DialogMessage>
        <TextField label="Keep" mode="select" searchable options={others.map((v) => v.name)} value={keep?.name ?? ''} onChange={(n) => { const v = others.find((x) => x.name === n); if (v) void pick(v.id) }} required />
        {keep && preview ? (
          <p className={money.differs} data-testid="merge-preview"><span>
            {[words(preview.pos, 'PO'), words(preview.bills, 'bill'), words(preview.expenses, 'expense'), words(preview.payments, 'payment'), preview.crew ? `${preview.crew} ${preview.crew === 1 ? 'place on a project' : 'places on projects'}` : ''].filter(Boolean).join(', ') || 'Nothing'} {preview.pos + preview.bills + preview.expenses + preview.payments + (preview.crew ?? 0) === 1 ? 'moves' : 'move'} to {keep.name}
            {preview.book || preview.quoteLines ? `; ${[words(preview.book, 'price book item'), words(preview.quoteLines, 'quote line')].filter(Boolean).join(' and ')} take its name` : ''}.
            {preview.fills.length ? ` ${keep.name} takes the ${preview.fills.join(', ')} it lacks.` : ''}
          </span></p>
        ) : null}
      </div>
    </Dialog>
  )
}
