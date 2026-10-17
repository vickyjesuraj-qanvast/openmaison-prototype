'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompanyShell } from '@/components/company/company-shell'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { Tooltip } from '@/components/om/tooltip'
import { ClientAccessPanel, useOrigin } from '@/components/portal/client-access-panel'
import { inviteClient, undoWithdraw, withdrawAccess } from '@/app/portal/studio-actions'
import { inviteHouseholdMember, undoHouseholdWithdraw, withdrawHouseholdMember } from '@/app/portal/household-actions'
import type { HouseholdRow } from '@/lib/portal/household'
import { CLIENT_PORTAL_TABS } from '@/lib/company/sections'
import { phoneLocal } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import { accessChip, agoText, firstName, inviteMessage, portalPath, shortDay, waLink } from '@/lib/portal/model'
import type { PortalClientRow, PortalSetup } from '@/lib/portal/queries'
import { PortalClientsGhost } from './portal-ghosts'
import styles from './portal-setup.module.css'

/** (Projects round 9) A row of the table: a client, or someone from their household under them. */
type Row = { c: PortalClientRow; p: HouseholdRow | null }

const DEFS = [
  { key: 'client', label: 'Client', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'home', label: 'Home', track: 'minmax(260px, 260fr)' },
  { key: 'access', label: 'Access', track: 'minmax(190px, 190fr)' },
  { key: 'invited', label: 'Invited', track: 'minmax(120px, 120fr)' },
  { key: 'opened', label: 'Last opened', track: 'minmax(140px, 140fr)' },
  { key: 'actions', label: 'Actions', track: 'minmax(96px, 96fr)' },
] as const

/**
 * (Projects r4a, Q-46 · board 9) Company › Client portal › Clients: everyone with access, invited or not — every project's client and every
 * lead the studio invited — on the listing's table model (cards on a phone): the client, their home, the access's state (Not invited ·
 * Invited, not opened · Opened {when} · Withdrawn), when they were invited and last opened; Invite · Resend · Withdraw from the row's menu
 * (the same records as each lead's Client access panel, which the name opens), and a search. Owners and Admins act; everyone else reads.
 */
export function PortalClientsView({ data, from }: { data: PortalSetup; from?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const origin = useOrigin()
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const [accessFor, setAccessFor] = useState<string | null>(null)
  /* (Projects round 9, Q-42) each client, then someone else from their household under them — a search finds either, and keeps the pair together */
  const rows = useMemo(() => {
    const all: Row[] = data.clients.flatMap((c) => [{ c, p: null }, ...(data.household[c.leadId] ?? []).map((p) => ({ c, p }))])
    const hits = new Set(filterByQuery(all, query, (r) => (r.p
      ? { fields: [r.p.name, r.p.relationship ?? '', r.c.client, r.c.home, accessChip(r.p.stamps, data.now).label], phones: [r.p.phone] }
      : { fields: [r.c.client, r.c.home, accessChip(r.c.stamps, data.now).label], phones: [r.c.phone] })))
    /* (fix-G, G-32) a household row that matches keeps its client's row above it — never an indented row under nobody */
    const keep = new Set(all.filter((r) => r.p && hits.has(r)).map((r) => r.c.leadId))
    return all.filter((r) => hits.has(r) || (!r.p && keep.has(r.c.leadId)))
  }, [data.clients, data.household, query, data.now])
  const url = `${origin ?? ''}${portalPath(data.slug)}`
  const mayRun = data.mayRun

  /* (fix-G, G-34) a send while the portal is paused asks first; the send runs on that press */
  const [asking, setAsking] = useState<(() => void) | null>(null)
  const ask = (run: () => void) => { if (data.settings.paused) setAsking(() => run); else run() }
  const invite = (c: PortalClientRow) => { setMenu(null); ask(() => void sendInvite(c)) }
  const sendInvite = async (c: PortalClientRow) => {
    window.open(waLink(c.phone, inviteMessage({ client: c.client, studio: data.look.studio, url, again: c.state === 'invited' || c.state === 'opened' })), '_blank', 'noopener')
    try {
      const r = await inviteClient(c.leadId)
      if ('error' in r) { snackbar({ message: couldnt('record the invite', refusalOf(r.error)) }); return }
      snackbar({ message: c.state === 'withdrawn' ? `${firstName(c.client)} can open the portal again — WhatsApp opened with the link` : r.again ? 'WhatsApp opened with the link again' : 'WhatsApp opened with the invite' })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t record the invite — please try again' }) }
  }
  const withdraw = async (c: PortalClientRow) => {
    setMenu(null)
    try {
      const r = await withdrawAccess(c.leadId)
      if ('error' in r) { snackbar({ message: couldnt('withdraw access', refusalOf(r.error)) }); return }
      /* (fix-G, G-20) Undo answers as the panel's does — what it did, or what failed */
      snackbar({ message: `${firstName(c.client)} can no longer open the portal`, actionLabel: 'Undo', onAction: () => { void undoWithdraw(c.leadId, r.eventId).then((u) => { if ('error' in u) snackbar({ message: couldnt('give access back', refusalOf(u.error)) }); else { snackbar({ message: `${firstName(c.client)} can open the portal again` }); router.refresh() } }, () => snackbar({ message: 'Couldn’t give access back — please try again' })) } })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t withdraw access — please try again' }) }
  }

  const cell = (r: Row, key: string) => {
    if (r.p) return householdCell(r.c, r.p, key)
    const c = r.c
    const chip = accessChip(c.stamps, data.now)
    switch (key) {
      case 'client': return (
        <span className={styles.client}>
          <button type="button" className={styles.clientName} onClick={() => setAccessFor(c.leadId)} data-testid="portal-client-open">{c.client}</button>
          <span className={styles.sub}>{phoneLocal(c.phone)}</span>
        </span>
      )
      case 'home': return <span className={styles.oneLine}>{c.home || '--'}</span>
      case 'access': return <span data-testid="portal-client-state" data-state={chip.state}><MetaChip color={chip.tone}>{chip.label}</MetaChip></span>
      case 'invited': return <span className={c.stamps?.invitedAt ? undefined : styles.m}>{c.stamps?.invitedAt ? shortDay(c.stamps.invitedAt) : '--'}</span>
      case 'opened': return <span className={c.stamps?.lastOpenedAt ? undefined : styles.m}>{c.stamps?.lastOpenedAt ? agoText(c.stamps.lastOpenedAt, data.now) : '--'}</span>
      /* (fix-G, G-19) the row's menu follows the Client access rule (whoever works on the client), as the panel its name opens does */
      case 'actions': return c.mayAct ? (
        <span>
          <Tooltip label="More options" disabled={menu === c.leadId}>
            <IconButton icon="more_vert" label={`More for ${c.client}`} variant="bare" aria-haspopup="menu" aria-expanded={menu === c.leadId} data-testid="portal-client-menu"
                        onClick={(e) => { anchor.current = e.currentTarget; setMenu((m) => (m === c.leadId ? null : c.leadId)) }} />
          </Tooltip>
          <PortalMenu open={menu === c.leadId} anchor={anchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={c.client}>
            <DropdownItem onSelect={() => void invite(c)}>{c.state === 'withdrawn' ? 'Give access again' : c.state === 'none' ? 'Invite on WhatsApp' : 'Send the link on WhatsApp'}</DropdownItem>
            {c.state !== 'withdrawn' ? <DropdownItem onSelect={() => { setMenu(null); window.open(`${portalPath(data.slug, 'preview')}?client=${encodeURIComponent(c.leadId)}`, '_blank') }}>{`See it as ${firstName(c.client)}`}</DropdownItem> : null}
            <DropdownItem onSelect={() => { setMenu(null); setAccessFor(c.leadId) }}>Invite to Portal…</DropdownItem>
            {c.state === 'invited' || c.state === 'opened' ? <><DropdownDivider /><DropdownItem tone="danger" onSelect={() => void withdraw(c)}>{`Withdraw ${firstName(c.client)}’s access`}</DropdownItem></> : null}
          </PortalMenu>
        </span>
      ) : null
      default: return null
    }
  }

  /* (Projects round 9) someone from the household: their own access and menu — the same records as the client's Client access panel */
  const inviteOne = (c: PortalClientRow, p: HouseholdRow) => { setMenu(null); ask(() => void sendOne(c, p)) }
  const sendOne = async (c: PortalClientRow, p: HouseholdRow) => {
    const state = accessChip(p.stamps.invitedAt || p.stamps.withdrawnAt ? p.stamps : null, data.now).state
    window.open(waLink(p.phone, inviteMessage({ client: p.name, studio: data.look.studio, url, again: state === 'invited' || state === 'opened' })), '_blank', 'noopener')
    try {
      const r = await inviteHouseholdMember(p.id)
      if ('error' in r) { snackbar({ message: couldnt('record the invite', refusalOf(r.error)) }); return }
      snackbar({ message: state === 'withdrawn' ? `${p.first} can open the portal again — WhatsApp opened with the link` : r.again ? 'WhatsApp opened with the link again' : `WhatsApp opened with ${p.first}’s invite` })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t record the invite — please try again' }) }
  }
  const withdrawOne = async (p: HouseholdRow) => {
    setMenu(null)
    try {
      const r = await withdrawHouseholdMember(p.id)
      if ('error' in r) { snackbar({ message: couldnt('withdraw access', refusalOf(r.error)) }); return }
      snackbar({ message: `${p.first} can no longer open the portal`, actionLabel: 'Undo', onAction: () => { void undoHouseholdWithdraw(p.id, r.eventId).then((u) => { if ('error' in u) snackbar({ message: couldnt('give access back', refusalOf(u.error)) }); else { snackbar({ message: `${p.first} can open the portal again` }); router.refresh() } }, () => snackbar({ message: 'Couldn’t give access back — please try again' })) } })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t withdraw access — please try again' }) }
  }
  const householdCell = (c: PortalClientRow, p: HouseholdRow, key: string) => {
    const chip = accessChip(p.stamps.invitedAt || p.stamps.withdrawnAt ? p.stamps : null, data.now)
    switch (key) {
      case 'client': return (
        <span className={`${styles.client} ${styles.household}`}>
          <button type="button" className={styles.clientName} onClick={() => setAccessFor(c.leadId)} data-testid="portal-household-open">{p.name}</button>
          {/* (fix-G, G-32 · G-46) whose household it is, on the row itself — a search or a phone card shows it without its client above */}
          <span className={styles.sub}>{[`${c.client}’s household`, p.relationship, phoneLocal(p.phone)].filter(Boolean).join(' · ')}</span>
        </span>
      )
      case 'home': return <span className={`${styles.oneLine} ${styles.m}`}>{c.home || '--'}</span>
      case 'access': return <span data-testid="portal-household-state" data-state={chip.state}><MetaChip color={chip.tone}>{chip.label}</MetaChip></span>
      case 'invited': return <span className={p.stamps.invitedAt ? undefined : styles.m}>{p.stamps.invitedAt ? shortDay(p.stamps.invitedAt) : '--'}</span>
      case 'opened': return <span className={p.stamps.lastOpenedAt ? undefined : styles.m}>{p.stamps.lastOpenedAt ? agoText(p.stamps.lastOpenedAt, data.now) : '--'}</span>
      case 'actions': return c.mayAct ? (
        <span>
          <Tooltip label="More options" disabled={menu === p.id}>
            <IconButton icon="more_vert" label={`More for ${p.name}`} variant="bare" aria-haspopup="menu" aria-expanded={menu === p.id} data-testid="portal-household-menu"
                        onClick={(e) => { anchor.current = e.currentTarget; setMenu((m) => (m === p.id ? null : p.id)) }} />
          </Tooltip>
          <PortalMenu open={menu === p.id} anchor={anchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={p.name}>
            <DropdownItem onSelect={() => void inviteOne(c, p)}>{chip.state === 'withdrawn' ? 'Give access again' : chip.state === 'none' ? 'Invite on WhatsApp' : 'Send the link on WhatsApp'}</DropdownItem>
            {chip.state !== 'withdrawn' ? <DropdownItem onSelect={() => { setMenu(null); window.open(`${portalPath(data.slug, 'preview')}?client=${encodeURIComponent(c.leadId)}&person=${encodeURIComponent(p.id)}`, '_blank') }}>{`See it as ${p.first}`}</DropdownItem> : null}
            <DropdownItem onSelect={() => { setMenu(null); setAccessFor(c.leadId) }}>Invite to Portal…</DropdownItem>
            {chip.state === 'invited' || chip.state === 'opened' ? <><DropdownDivider /><DropdownItem tone="danger" onSelect={() => void withdrawOne(p)}>{`Withdraw ${p.first}’s access`}</DropdownItem></> : null}
          </PortalMenu>
        </span>
      ) : null
      default: return null
    }
  }

  return (
    <CompanyShell title="Client portal" tabs={[...CLIENT_PORTAL_TABS]} from={from} skeleton={<PortalClientsGhost />}>
      <div className={styles.page} data-testid="portal-clients">
        {/* (fix-G, G-19) what stays the Owners' and Admins' is the set-up — access is the client's team's, as each row's menu shows */}
        {mayRun ? null : <ReadOnlyNote text="Only Owners and Admins change the portal’s set-up. A client’s team invites them and withdraws their access." />}
        <CreditsTable table="portal-clients" title="Clients" testId="portal-clients-table" defs={DEFS} rows={rows} rowKey={(r) => r.p?.id ?? r.c.leadId} cell={cell}
                      rowAttrs={(r) => ({ 'data-lead': r.c.leadId, 'data-household': r.p ? r.p.id : undefined })}
                      help="Every project’s client, and every lead you have invited — who can open the portal, and when they last did"
                      actions={<ToolbarSearch query={query} onQuery={setQuery} placeholder="Search clients" label="Search clients" />}
                      empty="No clients yet — a project’s client appears here, and anyone you invite."
                      noResults={query.trim() ? <TabSearchEmpty noun="clients" searching onClearAll={() => setQuery('')} /> : undefined} />
      </div>
      <ClientAccessPanel open={!!accessFor} leadId={accessFor} onClose={() => setAccessFor(null)} />
      <ConfirmDialog open={!!asking} tone="primary" title="The portal is paused" message="They will see a notice instead of their page until it’s live again. Send anyway?"
                     confirmLabel="Send anyway" onCancel={() => setAsking(null)} onConfirm={() => { const r = asking; setAsking(null); r?.() }} />
    </CompanyShell>
  )
}
