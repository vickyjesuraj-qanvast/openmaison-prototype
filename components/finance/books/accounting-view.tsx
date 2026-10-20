'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { StatTile } from '@/components/om/stat-tile'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import type { TableColumnDef } from '@/components/om/table-columns'
import { displayDateTimeDot } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { TAX_KEYS, XERO_ACCOUNTS, XERO_KIND_LABEL, XERO_TAXES, unmapped, type XeroKind } from '@/lib/finance/xero'
import type { BooksData } from '@/lib/finance/books'
import type { XeroData } from '@/lib/finance/xero-server'
import {
  autoMapXero, connectXero, restoreXeroMapping, retryXero, setXeroAuto, setXeroMapping, setXeroOrganisation, syncXero,
} from '@/app/finance/xero-actions'
import { HelpLink } from '@/components/company/help-link'
import { tagOf } from '../cost-tables'
import int from '@/components/company/integrations-view.module.css'
import money from '@/components/projects/money/money.module.css'
import b from './books.module.css'

/**
 * (gaps build F2 — F2-Q13, Q-35; 1.0 `src/lib/accounting/**`) Finance › Accounting — Xero, simulated the way Integrations' Gmail is: the
 * organisation per issuing entity, the accounts and tax codes (Auto-map, a change per row), Push automatically, Sync now, what waits to push (a
 * failed one says why, with Retry) and the sync log. Unapproved money is never pushed. Owners and Admins only.
 * (one-home N-09) The connection itself — Connect and Disconnect — is Company › Integrations' Xero card; this card says its state and links there.
 * (simplify S-11, his "build everything" 2026-10-09 — F1 §6.6) The tab is named **Xero** (it was Accounting; its address stays). Before Xero is
 * connected the card connects it in place — the Integrations card's own Connect Xero and its action — and the mapping appears here at once; the
 * connection's home is still Integrations (Disconnect lives there), as the card says.
 */
const MAP_DEFS: readonly TableColumnDef[] = [
  { key: 'what', label: 'In OpenMaison', track: 'minmax(260px, 260fr)', locked: true },
  { key: 'to', label: 'In Xero', track: 'minmax(260px, 260fr)' },
]
const DUE_DEFS: readonly TableColumnDef[] = [
  { key: 'record', label: 'Record', track: 'minmax(240px, 240fr)', locked: true },
  { key: 'kind', label: 'Goes as', track: 'minmax(150px, 150fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
  { key: 'org', label: 'Organisation', track: 'minmax(200px, 200fr)' },
  { key: 'status', label: 'Status', track: 'minmax(220px, 220fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(110px, 110fr)' },
]
const LOG_DEFS: readonly TableColumnDef[] = [
  { key: 'at', label: 'When', track: 'minmax(170px, 170fr)', locked: true },
  { key: 'record', label: 'Record', track: 'minmax(240px, 240fr)' },
  { key: 'kind', label: 'As', track: 'minmax(140px, 140fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(120px, 120fr)' },
  { key: 'outcome', label: 'Outcome', track: 'minmax(260px, 260fr)' },
]
const PLURAL: Partial<Record<XeroKind, string>> = { invoice: 'Invoices', credit_note: 'Credit notes', payment: 'Client payments', bill: 'Supplier bills', expense: 'Expenses', payout: 'Payments out' }
type MapRow = { kind: 'account' | 'tax'; key: string; label: string; side: string }
const accountLabel = (code: string) => { const a = XERO_ACCOUNTS.find((x) => x.code === code); return a ? `${a.code} · ${a.name}` : code }

export function AccountingView({ books, xero }: { books: BooksData; xero: XeroData }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const s = xero.settings
  const [busy, setBusy] = useState<string | null>(null)
  const [org, setOrg] = useState<{ entity: string; name: string } | null>(null)
  const person = (id: string | null) => books.people.find((m) => m.id === id)?.name ?? 'Someone'
  const step = async (key: string, what: string, fn: () => Promise<object>, done: (r: never) => { message: string; actionLabel?: string; onAction?: () => void } | string, after?: () => void) => {
    setBusy(key)
    try {
      const r = await fn()
      if ('error' in r) { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return }
      after?.()
      const d = done(r as never)
      snackbar(typeof d === 'string' ? { message: d } : d)
      router.refresh()
    } catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }) } finally { setBusy(null) }
  }
  const pushed = (r: { created: number; updated: number; failed: number }) => r.created + r.updated + r.failed === 0 ? 'Xero is up to date — nothing new to push'
    : `${[r.created ? `${r.created} created` : '', r.updated ? `${r.updated} updated` : '', r.failed ? `${r.failed} failed — see why below` : ''].filter(Boolean).join(' · ')} in Xero`
  const missing = unmapped(s, xero.accountKeys)
  const rows: MapRow[] = [...xero.accountKeys.map((k) => ({ kind: 'account' as const, key: k.key, label: k.label, side: k.side })), ...TAX_KEYS.map((k) => ({ kind: 'tax' as const, key: k.key, label: k.label, side: k.side }))]
  const optionsFor = (r: MapRow) => (r.kind === 'account'
    ? XERO_ACCOUNTS.filter((a) => (r.side === 'bank' ? a.type === 'bank' : r.side === 'sales' ? a.type === 'revenue' : a.type === 'direct_costs' || a.type === 'expense')).map((a) => accountLabel(a.code))
    : XERO_TAXES.filter((t) => t.side === r.side).map((t) => t.name))
  const valueOf = (r: MapRow) => { const c = r.kind === 'account' ? s.accounts[r.key] : s.taxes[r.key]; return c ? (r.kind === 'account' ? accountLabel(c) : XERO_TAXES.find((t) => t.code === c)?.name ?? '') : '' }
  const codeOf = (r: MapRow, label: string) => (r.kind === 'account' ? XERO_ACCOUNTS.find((a) => accountLabel(a.code) === label)?.code : XERO_TAXES.find((t) => t.name === label)?.code) ?? null
  const mapCell = (r: MapRow, key: string): ReactNode => {
    if (key === 'what') return <span className={b.stack}><span>{r.label}</span><span className={b.sub}>{r.kind === 'account' ? 'Account' : 'Tax code'}</span></span>
    return <TextField label={r.kind === 'account' ? 'Account' : 'Tax code'} size="s" mode="select" options={optionsFor(r)} value={valueOf(r)} disabled={!s.connected || busy !== null}
                      onChange={(label) => { void step(`map-${r.key}`, 'change the mapping', () => setXeroMapping({ kind: r.kind, key: r.key, code: codeOf(r, label) }), () => `${r.label} → ${label}`) }} />
  }
  const dueCell = (d: XeroData['due'][number], key: string): ReactNode => {
    if (key === 'record') return <span>{d.label}</span>
    if (key === 'kind') return <span>{XERO_KIND_LABEL[d.kind]}</span>
    if (key === 'amount') return d.amountMinor === null ? <span className={b.none}>--</span> : <span className={b.num}>{money2(d.amountMinor)}</span>
    if (key === 'org') return <span>{d.organisation}</span>
    if (key === 'status') return d.failed ? <span className={b.stack}>{tagOf('Failed', 'red')}<span className={b.sub} data-tone="alert">{d.failed}</span></span> : tagOf('Waiting to push', 'default')
    if (key === 'next') return d.failed ? <span className={b.rowActions}><Button appearance="text" onPress={() => { void step(`retry-${d.id}`, 'retry the push', () => retryXero({ kind: d.kind, id: d.id }), pushed) }} isDisabled={busy !== null} data-testid="xero-retry">Retry</Button></span> : null
    return null
  }
  const logCell = (l: XeroData['log'][number], key: string): ReactNode => {
    if (key === 'at') return <span className={b.stack}><span className={b.num}>{displayDateTimeDot(new Date(l.at))}</span><span className={b.sub}>{person(l.by)}</span></span>
    if (key === 'record') return <span>{l.label}</span>
    if (key === 'kind') return <span>{XERO_KIND_LABEL[l.kind]}</span>
    if (key === 'amount') return l.amountMinor === null ? <span className={b.none}>--</span> : <span className={b.num}>{money2(l.amountMinor)}</span>
    if (key === 'outcome') return <span className={b.stack}>{tagOf(l.outcome === 'created' ? 'Created' : l.outcome === 'updated' ? 'Updated' : 'Failed', l.outcome === 'failed' ? 'red' : 'green')}{l.message ? <span className={b.sub}>{l.message}</span> : null}</span>
    return null
  }
  const kinds: XeroKind[] = ['invoice', 'credit_note', 'payment', 'bill', 'expense', 'payout']
  return (
    <>
      <section className={int.card} aria-labelledby="xero-title" data-testid="xero-card">
        <div className={int.cardHead}>
          <div className={int.titleRow}><h2 id="xero-title" className={int.cardTitle}>Xero</h2>{s.connected ? <MetaChip color="green">Connected</MetaChip> : <MetaChip>Not connected</MetaChip>}</div>
          <p className={int.cardHelp}>The studio’s books pushed to Xero — clients and vendors as contacts, invoices sent, credit notes, the payments that count, supplier bills, approved expenses and payments out. Unapproved money is never pushed. Its connection is kept in <HelpLink href="/company/integrations#xero" testId="xero-integrations-link">Company › Integrations</HelpLink>.</p>
        </div>
        {s.connected ? (
          <>
            <div className={int.row}><span className={int.hint} data-testid="xero-connected-line">Connected {s.connectedAt ? displayDateTimeDot(new Date(s.connectedAt)) : ''} by {person(s.connectedBy)} · {s.lastSyncAt ? `Last sync: ${displayDateTimeDot(new Date(s.lastSyncAt))}` : 'Not yet synced'}</span></div>
            <label className={b.cardRow}><Switch size="sm" isSelected={s.auto} isDisabled={busy !== null} onChange={(v: boolean) => { void step('auto', 'change it', () => setXeroAuto(v), () => (v ? 'Each money step now pushes to Xero' : 'Pushes now wait for Sync now')) }} aria-label="Push automatically" /><span>Push automatically <span className={int.hint}>· after each invoice, credit note, payment, bill or expense</span></span></label>
            <div className={int.row} data-testid="xero-sync-row">
              <Button iconStart={<Icon name="refresh" size={20} />} isDisabled={busy !== null} onPress={() => { void step('sync', 'sync with Xero', () => syncXero(), pushed) }} data-testid="xero-sync">{busy === 'sync' ? 'Syncing…' : `Sync now${xero.due.length ? ` · ${xero.due.length}` : ''}`}</Button>
            </div>
          </>
        ) : (
          <div className={int.row}>
            <div className={int.emptyMail}><span className={int.emptyTitle}>Xero is not connected</span><span className={int.hint}>Connect it and pick the organisation for each issuing entity; the accounts and tax codes are mapped for you.</span></div>
            {/* (simplify S-11) the Integrations card's Connect Xero, acting in place — the same action, the same words */}
            <Button iconStart={<Icon name="link" size={20} />} isDisabled={busy !== null} onPress={() => { void step('connect', 'connect Xero', () => connectXero(), () => 'Xero connected — accounts and tax codes mapped') }} data-testid="xero-connect">{busy === 'connect' ? 'Connecting…' : 'Connect Xero'}</Button>
          </div>
        )}
      </section>
      {s.connected ? (
        <>
          <div className={b.tiles3} data-testid="xero-tiles">
            {kinds.map((k) => <StatTile key={k} label={PLURAL[k] ?? k} value={xero.synced[k]} help="In Xero" />)}
          </div>
          <CreditsTable table="books-xero-orgs" title="Organisations" testId="xero-orgs" defs={[{ key: 'entity', label: 'Issuing entity', track: 'minmax(220px, 220fr)', locked: true }, { key: 'org', label: 'Xero organisation', track: 'minmax(260px, 260fr)' }, { key: 'next', label: '', track: 'minmax(110px, 110fr)' }]}
                        rows={xero.entities} rowKey={(e) => e.entity}
                        cell={(e, key) => key === 'entity' ? <span>{e.entity}</span> : key === 'org' ? <span>{s.organisations.find((o) => o.entity === e.entity)?.name ?? <span className={b.none}>Not picked</span>}</span>
                          : <span className={b.rowActions}><Button appearance="text" onPress={() => setOrg({ entity: e.entity, name: s.organisations.find((o) => o.entity === e.entity)?.name ?? e.proposed })}>Change</Button></span>}
                        help="One Xero organisation per issuing entity — each invoice goes to its entity’s books." empty="No issuing entities." />
          <CreditsTable table="books-xero-map" title="Accounts and tax codes" testId="xero-map" defs={MAP_DEFS} rows={rows} rowKey={(r) => `${r.kind}:${r.key}`} cell={mapCell}
                        actions={<Button variant="secondary" appearance="outlined" isDisabled={busy !== null} onPress={() => { void step('automap', 'auto-map', () => autoMapXero(), (r: { before: Parameters<typeof restoreXeroMapping>[0] }) => ({ message: 'Every row mapped again — by rate, then by side', actionLabel: 'Undo', onAction: () => { void step('restore', 'put the mapping back', () => restoreXeroMapping(r.before), () => 'The mapping is as it was') } })) }} data-testid="xero-automap">Auto-map</Button>}
                        help={missing.length ? `${missing.length} not mapped — a push that needs one fails until it is set.` : 'Every row is mapped.'} empty="Nothing to map." />
          <CreditsTable table="books-xero-due" title="Waiting to push" testId="xero-due" defs={DUE_DEFS} rows={xero.due} rowKey={(d) => `${d.kind}:${d.id}`} cell={dueCell}
                        help="New, changed or failed — each goes once, and again when it changes." empty="Xero has everything." />
        </>
      ) : null}
      <CreditsTable table="books-xero-log" title="Sync log" testId="xero-log" defs={LOG_DEFS} rows={xero.log} rowKey={(l) => l.id} cell={logCell}
                    help="Every push, newest first. Disconnecting keeps it." empty="Nothing pushed yet." />
      <OrgDialog org={org} busy={busy === 'org'} onClose={() => setOrg(null)}
                 onSave={(name) => { const o = org; if (!o) return; void step('org', 'change the organisation', () => setXeroOrganisation({ entity: o.entity, name }), () => `${o.entity} now goes to ${name}`, () => setOrg(null)) }} />
    </>
  )
}

function OrgDialog({ org, busy, onClose, onSave }: { org: { entity: string; name: string } | null; busy: boolean; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('')
  const [was, setWas] = useState<string | null>(null)
  if ((org?.entity ?? null) !== was) { setWas(org?.entity ?? null); if (org) setName(org.name) }
  const why = !name.trim() ? 'Enter the organisation’s name as Xero shows it' : undefined
  return (
    <Dialog open={!!org} onClose={onClose} title="Xero organisation" subtitle={org ? `Where ${org.entity}’s books go.` : undefined} size="form" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { if (!why) onSave(name.trim()) }} isDisabled={busy || !!why}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className={money.fields}><TextField label="Organisation" value={name} onChange={setName} maxLength={80} required autoFocus error={why} /></div>
    </Dialog>
  )
}
