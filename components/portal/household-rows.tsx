'use client'

import { useRef, useState } from 'react'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { addHouseholdMember, inviteHouseholdMember, removeHouseholdMember, undoHouseholdRemove, undoHouseholdWithdraw, withdrawHouseholdMember } from '@/app/portal/household-actions'
import { phoneLocal } from '@/lib/format'
import { firstName, inviteMessage, portalPath, shortDay, waLink } from '@/lib/portal/model'
import type { ClientAccessData } from '@/lib/portal/access'
import { HouseholdDialog } from './household-dialog'
import { pendingWindow } from './wa-window'
import panel from './client-access-panel.module.css'
import styles from './household.module.css'

type Person = ClientAccessData['household'][number]
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')

/** "Wife · 9876 5432 · Invited 8 Aug by Germaine · sent again 6 Oct" — the person's line, with who they are to the client (fix-G, G-08: the
    first invite stays; a later send is its own words). */
function personLine(p: Person): string {
  const s = p.stamps
  const bits = [p.relationship, phoneLocal(p.phone)].filter((x): x is string => !!x)
  if (p.chip.state === 'withdrawn' && s.withdrawnAt) bits.push(`Withdrawn ${shortDay(s.withdrawnAt)}${p.withdrawnBy ? ` by ${p.withdrawnBy}` : ''}`)
  else if (s.invitedAt) bits.push(`Invited ${shortDay(s.invitedAt)}${p.invitedBy ? ` by ${p.invitedBy}` : ''}${p.resent ? ` · sent again ${shortDay(p.resent.at)}` : ''}`)
  else bits.push('Not invited yet')
  return bits.join(' · ')
}

/**
 * (Projects round 9 — Q-42; board 8) The household under the client in Client access's "Who can open this project": each person with their
 * own chip (Not invited · Invited, not opened · Opened {when} · Withdrawn) and a menu — Send the link on WhatsApp (wa.me opens on the press)
 * · See it as them · Withdraw access (Undo) · Remove (Undo, for one never invited or withdrawn) — then board 8's "Add someone else from the
 * household". The rows sit inside the panel's own bordered list, on its row and initials. `ask` puts a send through the panel's paused
 * question first (fix-G, G-34).
 */
export function HouseholdRows({ d, url, busy, onChanged, ask }: { d: ClientAccessData; url: string; busy: boolean; onChanged: () => void; ask: (run: () => void, cancel?: () => void) => void }) {
  const snackbar = useSnackbar()
  const [menu, setMenu] = useState<string | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const [adding, setAdding] = useState(false)
  const [prefill, setPrefill] = useState<{ name: string; phone: string; relationship: string } | null>(null)   // (pending modules S05) the lead's second client
  /* (fix-G, G-06) a number that is another client's: the add waits for the studio's yes */
  const [other, setOther] = useState<{ name: string; v: { name: string; phone: string; relationship: string } } | null>(null)
  const run = async <T,>(what: string, call: () => Promise<{ error: string } | T>): Promise<T | null> => {
    try {
      const r = await call()
      if (r && typeof r === 'object' && 'error' in (r as object)) { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return null }
      return r as T
    } catch { snackbar({ message: `Couldn’t ${what} — please try again` }); return null }
  }
  const invite = (p: Person) => {
    setMenu(null)
    ask(() => void (async () => {
      const again = p.chip.state === 'invited' || p.chip.state === 'opened'
      window.open(waLink(p.phone, inviteMessage({ client: p.name, studio: d.studio, url, again })), '_blank', 'noopener')   // on the press
      const r = await run('record the invite', () => inviteHouseholdMember(p.id))
      if (!r) return
      snackbar({ message: p.chip.state === 'withdrawn' ? `${p.first} can open the portal again — WhatsApp opened with the link` : again ? 'WhatsApp opened with the link again' : `WhatsApp opened with ${p.first}’s invite` })
      onChanged()
    })())
  }
  const withdraw = async (p: Person) => {
    setMenu(null)
    const r = await run('withdraw access', () => withdrawHouseholdMember(p.id))
    if (!r) return
    snackbar({ message: `${p.first} can no longer open the portal`, actionLabel: 'Undo', onAction: () => { void run('give access back', () => undoHouseholdWithdraw(p.id, r.eventId)).then((u) => { if (u) { snackbar({ message: `${p.first} can open the portal again` }); onChanged() } }) } })
    onChanged()
  }
  const remove = async (p: Person) => {
    setMenu(null)
    const r = await run(`take ${p.first} off`, () => removeHouseholdMember(p.id))
    if (!r) return
    /* (fix-G, G-20) Undo answers as every Undo does */
    snackbar({ message: `${p.first} is off the list`, actionLabel: 'Undo', onAction: () => { void run(`put ${p.first} back`, () => undoHouseholdRemove(p.id, r.eventId)).then((u) => { if (u) { snackbar({ message: `${p.first} is back on the list` }); onChanged() } }) } })
    onChanged()
  }
  /* (fix-G, G-06) the tab opens on the press, and WhatsApp only once the add has landed — a refusal or a question closes it unsent */
  const submit = async (v: { name: string; phone: string; relationship: string }, otherClient = false): Promise<string | null> => {
    const wa = pendingWindow()
    let r: Awaited<ReturnType<typeof addHouseholdMember>>
    try { r = await addHouseholdMember(d.leadId, { ...v, invite: true, otherClient }) } catch { wa.cancel(); throw new Error('add failed') }
    if ('error' in r) { wa.cancel(); return r.error }
    if ('confirm' in r) { wa.cancel(); setOther({ name: r.name, v }); return null }
    wa.go(waLink(v.phone, inviteMessage({ client: r.name, studio: d.studio, url })))
    setAdding(false)
    setOther(null)
    snackbar({ message: `${firstName(r.name)} is on ${d.client.first}’s household — WhatsApp opened with their link` })
    onChanged()
    return null
  }
  const add = (v: { name: string; phone: string; relationship: string }): Promise<string | null> => (d.paused
    ? new Promise((done) => ask(() => { void submit(v).then(done, () => done('Couldn’t add them — please try again')) }, () => done(null)))
    : submit(v))

  return (
    <>
      {d.household.map((p) => {
        const live = p.chip.state === 'invited' || p.chip.state === 'opened'
        return (
          <div key={p.id} className={panel.row} data-testid="household-row" data-state={p.chip.state} data-person={p.id}>
            <span className={panel.initials} aria-hidden>{initialsOf(p.name)}</span>
            <span className={panel.text}>
              <span className={panel.name}>{p.name}</span>
              <span className={panel.meta}>{personLine(p)}</span>
            </span>
            <span className={panel.chip} data-testid="household-chip"><MetaChip color={p.chip.tone}>{p.chip.label}</MetaChip></span>
            {d.mayAct ? (
              <span className={styles.more}>
                <Tooltip label="More options" disabled={menu === p.id}>
                  <IconButton icon="more_vert" label={`More for ${p.name}`} variant="bare" aria-haspopup="menu" aria-expanded={menu === p.id} data-testid="household-menu" disabled={busy}
                              onClick={(e) => { anchor.current = e.currentTarget; setMenu((m) => (m === p.id ? null : p.id)) }} />
                </Tooltip>
                <PortalMenu open={menu === p.id} anchor={anchor} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={p.name}>
                  <DropdownItem onSelect={() => invite(p)}>{p.chip.state === 'withdrawn' ? 'Give access again' : live ? 'Send the link on WhatsApp' : 'Invite on WhatsApp'}</DropdownItem>
                  {p.chip.state !== 'withdrawn' ? <DropdownItem onSelect={() => { setMenu(null); window.open(`${portalPath(d.slug, 'preview')}?client=${encodeURIComponent(d.leadId)}&person=${encodeURIComponent(p.id)}`, '_blank') }}>{`See it as ${p.first}`}</DropdownItem> : null}
                  {live ? <><DropdownDivider /><DropdownItem tone="danger" onSelect={() => void withdraw(p)}>{`Withdraw ${p.first}’s access`}</DropdownItem></>
                    : <><DropdownDivider /><DropdownItem tone="danger" onSelect={() => void remove(p)}>Take off the list</DropdownItem></>}
                </PortalMenu>
              </span>
            ) : null}
          </div>
        )
      })}
      {/* (pending modules S05 — testers' L-4) the lead's second client, not on the household yet: one press opens the add with them */}
      {d.mayAct && d.coOwner ? (
        <div className={panel.row} data-testid="household-co-owner">
          <span className={panel.initials} aria-hidden>{initialsOf(d.coOwner.name)}</span>
          <span className={panel.text}>
            <span className={panel.name}>{d.coOwner.name}</span>
            <span className={panel.meta}>{`Second client on the lead · ${phoneLocal(d.coOwner.phone)}`}</span>
          </span>
          <button type="button" className={panel.link} onClick={() => { setPrefill({ name: d.coOwner!.name, phone: d.coOwner!.phone, relationship: 'Co-owner' }); setAdding(true) }} data-testid="household-add-co-owner">{`Add ${firstName(d.coOwner.name)}`}</button>
        </div>
      ) : null}
      {d.mayAct ? (
        <div className={panel.row}>
          <button type="button" className={panel.link} onClick={() => { setPrefill(null); setAdding(true) }} data-testid="household-open-add">Add someone else from the household</button>
        </div>
      ) : null}
      <HouseholdDialog open={adding} client={d.client.first} onClose={() => setAdding(false)} onAdd={add} prefill={prefill}
                       taken={[{ phone: d.client.phone.replace(/\D/g, '').slice(-8), who: d.client.first }, ...d.household.map((p) => ({ phone: p.phone, who: p.first }))]} />
      {/* (fix-G, G-06) the number is another client's: say whose, and add them under their own name only on a yes */}
      <ConfirmDialog open={!!other} nested tone="primary" title={other ? `${phoneLocal(other.v.phone)} is ${other.name}’s number` : ''}
                     message={other ? `${other.name} is a client of yours. Add ${firstName(other.name)} to ${d.client.first}’s household? They sign in with this number and see ${d.client.first}’s home under their own name — ${other.name}, not “${other.v.name}”.` : undefined}
                     confirmLabel={other ? `Add ${firstName(other.name)}` : 'Add'} onCancel={() => setOther(null)}
                     onConfirm={() => { if (other) void submit(other.v, true).then((e) => { if (e) { setOther(null); snackbar({ message: couldnt('add them', refusalOf(e)) }) } }, () => { setOther(null); snackbar({ message: 'Couldn’t add them — please try again' }) }) }} />
    </>
  )
}
