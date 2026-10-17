'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { Line } from '@/components/shell/ghost-kit'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { inviteClient, readClientAccess, undoWithdraw, withdrawAccess } from '@/app/portal/studio-actions'
import { copyText } from '@/lib/clipboard'
import { isSgMobile, phoneDigits, phoneLocal } from '@/lib/format'
import { PORTAL_ACCESS_RULE, agoText, inviteMessage, portalPath, remindMessage, shortDay, waLink } from '@/lib/portal/model'
import { recordReminder } from '@/app/portal/remind-actions'
import { HouseholdRows } from './household-rows'
import type { ClientAccessData } from '@/lib/portal/access'
import styles from './client-access-panel.module.css'
import more from './household.module.css'

/** The page's origin once in the browser (the address a client is sent); null while rendering on the server. */
const noop = () => () => {}
export const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => null)
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')

/**
 * (Projects round 4a, board 8 · Q-41 · Q-46) The studio's Client access panel — on the project page (its menu, Getting started's Invite the
 * client) and on the lead page in place of the bare Invite dialog. Who can open it and how that access stands (Not invited · Invited, not
 * opened · Opened {when} · Withdrawn); Invite / Resend as a WhatsApp message drafted in one press — wa.me opens on the press, as the
 * signing link's does — with the portal's address; See it as the client (the real pages in a new tab, read-only, nothing recorded as
 * theirs); what they can see; what waits on them, with Remind; Withdraw access with Undo. It reads its own data when it opens, so any host
 * mounts it with a lead's id.
 * (fix-G) The client's row carries the household's ⋮ (Send the link · See it as · Withdraw {name}'s access — G-22 · G-23); the title follows
 * the record, not the door (G-24); a send while the portal is paused asks first (G-34); Remind links the item itself (G-27).
 */
export function ClientAccessPanel({ open, leadId, onClose }: { open: boolean; leadId: string | null; onClose: () => void; /** @deprecated the title reads the record (fix-G, G-24) */ project?: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const origin = useOrigin()
  const [data, setData] = useState<ClientAccessData | null>(null)
  const [rev, setRev] = useState(0)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const anchor = useRef<HTMLElement | null>(null)
  /* (fix-G, G-34) a send while the portal is paused: the question first, the send on its press (WhatsApp still opens on a press) */
  const [asking, setAsking] = useState<{ run: () => void; cancel?: () => void } | null>(null)
  /* the host's close, kept current without making every render of the host a new read */
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })
  useEffect(() => {
    if (!open || !leadId) return
    let live = true
    readClientAccess(leadId).then((r) => {
      if (!live) return
      if ('error' in r) { snackbar({ message: couldnt('open Invite to Portal', refusalOf(r.error)) }); close.current(); return }   // (one-home N-15) the panel's one name
      setData(r)
    }, () => { if (live) { snackbar({ message: 'Couldn’t open Invite to Portal — please try again' }); close.current() } })
    return () => { live = false }
  }, [open, leadId, rev, snackbar])
  const d = data && data.leadId === leadId ? data : null
  const reload = () => { setRev((n) => n + 1); router.refresh() }
  const url = d ? `${origin ?? ''}${portalPath(d.slug)}` : ''
  const state = d?.chip.state ?? 'none'
  const ask = (run: () => void, cancel?: () => void) => { if (d?.paused || d?.closed) setAsking({ run, cancel }); else run() }   // (parity map, CP-148) closed asks first too

  const invite = () => {
    if (!d || busy) return
    setMenu(false)
    /* (fix-G, G-05) the portal's code goes by SMS: a landline is said before WhatsApp opens, never after */
    if (!isSgMobile(phoneDigits(d.client.phone))) { snackbar({ message: `Couldn’t send the link — ${d.client.first}’s number isn’t a mobile number. Fix it on the lead first` }); return }
    ask(() => void (async () => {
      /* WhatsApp opens on the press (the signing link's rule); the record follows */
      window.open(waLink(d.client.phone, inviteMessage({ client: d.client.name, studio: studioOf(d), url, again: state === 'invited' || state === 'opened' })), '_blank', 'noopener')
      setBusy(true)
      try {
        const r = await inviteClient(d.leadId)
        if ('error' in r) { snackbar({ message: couldnt('record the invite', refusalOf(r.error)) }); return }
        snackbar({ message: state === 'withdrawn' ? `${d.client.first} can open the portal again — WhatsApp opened with the link` : r.again ? 'WhatsApp opened with the link again' : 'WhatsApp opened with the invite' })
        reload()
      } catch { snackbar({ message: 'Couldn’t record the invite — please try again' }) } finally { setBusy(false) }
    })())
  }
  const withdraw = async () => {
    if (!d || busy) return
    setMenu(false)
    setBusy(true)
    try {
      const r = await withdrawAccess(d.leadId)
      if ('error' in r) { snackbar({ message: couldnt('withdraw access', refusalOf(r.error)) }); return }
      snackbar({
        message: `${d.client.first} can no longer open the portal`, actionLabel: 'Undo',
        onAction: () => { void undoWithdraw(d.leadId, r.eventId).then((u) => { if ('error' in u) snackbar({ message: couldnt('give access back', refusalOf(u.error)) }); else { snackbar({ message: `${d.client.first} can open the portal again` }); reload() } }, () => snackbar({ message: 'Couldn’t give access back — please try again' })) },
      })
      reload()
    } catch { snackbar({ message: 'Couldn’t withdraw access — please try again' }) } finally { setBusy(false) }
  }
  const seeAs = () => { if (!d) return; setMenu(false); window.open(`${portalPath(d.slug, 'preview')}?client=${encodeURIComponent(d.leadId)}`, '_blank') }
  const copy = () => { void copyText(url).then(() => snackbar({ message: 'Address copied' }), () => snackbar({ message: 'Couldn’t copy the address — please try again' })) }
  /* (Projects round 9, Q-41) Remind on WhatsApp: the message drafted and wa.me open on the press; the reminder is then recorded — the row's
     "reminded just now" and a line in Activity — and put back if the server refuses. (fix-G, G-27) The message links the item itself. */
  const [sent, setSent] = useState<Record<string, number>>({})
  const reminded = { ...(d?.reminded ?? {}), ...sent }
  const remind = (w: { key: string; title: string; href: string }) => {
    if (!d) return
    ask(() => {
      const itemUrl = /^https?:\/\//.test(w.href) ? w.href : `${origin ?? ''}${w.href}`
      window.open(waLink(d.client.phone, remindMessage({ client: d.client.name, studio: studioOf(d), what: w.title, url: itemUrl })), '_blank', 'noopener')
      setSent((m) => ({ ...m, [w.key]: Date.now() }))
      void recordReminder(d.leadId, { key: w.key, title: w.title }).then((r) => {
        if ('error' in r) { setSent((m) => { const n = { ...m }; delete n[w.key]; return n }); snackbar({ message: couldnt('record the reminder', refusalOf(r.error)) }) }
      }, () => { setSent((m) => { const n = { ...m }; delete n[w.key]; return n }); snackbar({ message: 'Couldn’t record the reminder — please try again' }) })
    })
  }

  const live = state === 'invited' || state === 'opened'
  return (
    /* (one-home N-15) one name for this panel wherever it opens — "Invite to Portal", the lead ⋮'s (mock 931:49039) — not "Client access" */
    <Drawer open={open && !!leadId} title="Invite to Portal" onClose={onClose} width="widest"
            footer={d ? <Button variant="secondary" appearance="outlined" onPress={onClose}>Done</Button> : undefined}>
      {!d ? (
        <div className={styles.loading} aria-busy aria-label="Loading Invite to Portal"><Line w={180} /><Line w="100%" lh={60} h={60} /><Line w={220} /><Line w="100%" lh={120} h={120} /></div>
      ) : (
        <>
          <section className={styles.section} data-testid="client-access" data-state={state}>
            {/* (fix-G, G-24) one wording per client, whichever door opened it: a client with a project → "this project" */}
            <h3 className={styles.title}>{d.projectId ? 'Who can open this project' : 'Who can open their page'}</h3>
            <div className={styles.box}>
              <div className={styles.row} data-person="client">
                <span className={styles.initials} aria-hidden>{initialsOf(d.client.name)}</span>
                <span className={styles.text}>
                  <span className={styles.name}>{d.client.name}</span>
                  <span className={styles.meta}>{personLine(d)}</span>
                </span>
                <span className={styles.chip} data-testid="access-chip"><MetaChip color={d.chip.tone}>{d.chip.label}</MetaChip></span>
                {d.mayAct ? (
                  <span className={more.more}>
                    <Tooltip label="More options" disabled={menu}>
                      <IconButton icon="more_vert" label={`More for ${d.client.name}`} variant="bare" aria-haspopup="menu" aria-expanded={menu} data-testid="access-client-menu" disabled={busy}
                                  onClick={(e) => { anchor.current = e.currentTarget; setMenu((m) => !m) }} />
                    </Tooltip>
                    <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={d.client.name}>
                      <DropdownItem onSelect={invite}>{state === 'withdrawn' ? 'Give access again' : live ? 'Send the link on WhatsApp' : 'Invite on WhatsApp'}</DropdownItem>
                      {state !== 'withdrawn' ? <DropdownItem onSelect={seeAs}>{`See it as ${d.client.first}`}</DropdownItem> : null}
                      {live ? <><DropdownDivider /><DropdownItem tone="danger" onSelect={() => void withdraw()}>{`Withdraw ${d.client.first}’s access`}</DropdownItem></> : null}
                    </PortalMenu>
                  </span>
                ) : null}
              </div>
              {/* (Projects round 9, Q-42) someone else from the household, each with their own access — and board 8's "Add someone else" */}
              <HouseholdRows d={d} url={url} busy={busy} onChanged={reload} ask={ask} />
            </div>
            {/* (parity map, CP-148) closed by OpenMaison outranks the studio's own pause: whom to ask, not a switch the studio has */}
            {d.closed ? <p className={styles.note} role="note" data-testid="access-closed-note"><Icon name="lock" size={20} weight={300} /><span>{`OpenMaison has closed the portal for now — ${d.client.first} sees a notice until it’s open again. Contact OpenMaison to open it.`}</span></p>
              : d.paused ? <p className={styles.note} role="note"><Icon name="schedule" size={20} weight={300} /><span>{`The portal is paused — ${d.client.first} sees a notice until it’s live again. Company › Client portal turns it back on.`}</span></p> : null}
            <div className={styles.address}>
              <span>Their page</span><span className={styles.addressText} data-testid="access-address">{url.replace(/^https?:\/\//, '')}</span>
              <button type="button" className={styles.link} onClick={copy}>Copy</button>
            </div>
            {d.mayAct ? (
              <div className={styles.actions}>
                <Button onPress={invite} isDisabled={busy} iconStart={<Icon name="send" size={20} />} data-testid="access-invite">
                  {state === 'withdrawn' ? 'Give access again' : live ? 'Send the link on WhatsApp' : 'Invite on WhatsApp'}
                </Button>
                {state !== 'withdrawn' ? (
                  <Button variant="primary" appearance="outlined" iconStart={<Icon name="visibility" size={20} />} data-testid="access-see-as" onPress={seeAs}>{`See it as ${d.client.first}`}</Button>
                ) : null}
              </div>
            ) : <ReadOnlyNote text={`${d.projectId ? PORTAL_ACCESS_RULE.replace('the client’s team', 'the project’s team') : PORTAL_ACCESS_RULE}.`} />}   {/* (fix-A, A-41) on a project, the project's words */}
          </section>

          <section className={styles.section}>
            <h3 className={styles.title}>{`What ${d.client.first} can see`}</h3>
            <div className={styles.box} data-testid="access-sections">
              {d.sections.map((s) => (
                <a key={s.key} className={styles.row} href={s.href} data-testid="access-section" data-key={s.key} data-off={d.sectionsOff.includes(s.key) || undefined}>
                  <span className={styles.text}><span className={styles.name}>{s.name}</span></span>
                  <span className={styles.state}>{s.state}<Icon name="chevron_right" size={16} /></span>
                </a>
              ))}
            </div>
            <p className={styles.foot}>{`Nothing reaches ${d.client.first} until you share it. Notes for the team, costs and unpublished changes never show.`}</p>
          </section>

          {live ? (
            <section className={styles.section}>
              <h3 className={styles.title}>{`Waiting on ${d.client.first}`}</h3>
              <div className={styles.box} data-testid="access-waiting">
                {d.waiting.length ? d.waiting.map((w) => (
                  <div key={w.key} className={styles.row} data-testid="access-waiting-row" data-key={w.key}>
                    <span className={styles.text}><span className={styles.name}>{w.title}</span><span className={styles.meta}>{w.line}{reminded[w.key] ? ` · reminded ${agoText(reminded[w.key]!, d.now)}` : ''}</span></span>
                    {d.mayAct ? <button type="button" className={styles.link} onClick={() => remind(w)} data-testid="access-remind">Remind</button> : null}
                  </div>
                )) : <p className={styles.empty}>{`Nothing is waiting on ${d.client.first}.`}</p>}
              </div>
            </section>
          ) : null}
        </>
      )}
      {/* (fix-G, G-34) the portal is paused: the client opens a notice — say so before anything is sent */}
      <ConfirmDialog open={!!asking} nested tone="primary" title={d?.closed ? 'The portal is closed' : 'The portal is paused'}
                     message={d ? `${d.client.first} will see a notice instead of their page until it’s ${d.closed ? 'open' : 'live'} again. Send anyway?` : undefined}
                     confirmLabel="Send anyway" onCancel={() => { asking?.cancel?.(); setAsking(null) }}
                     onConfirm={() => { const r = asking?.run; setAsking(null); r?.() }} />
    </Drawer>
  )
}

/** "9123 4567 · Invited 8 Aug by Germaine · sent again 6 Oct" — the board's second line, with who did what (fix-G, G-08: the first invite
    stays; a later send is its own words). */
function personLine(d: ClientAccessData): string {
  const s = d.stamps
  const bits = [phoneLocal(d.client.phone)]
  if (d.chip.state === 'withdrawn' && s?.withdrawnAt) bits.push(`Withdrawn ${shortDay(s.withdrawnAt)}${d.withdrawnBy ? ` by ${d.withdrawnBy}` : ''}`)
  else if (s?.invitedAt) bits.push(`Invited ${shortDay(s.invitedAt)}${d.invitedBy ? ` by ${d.invitedBy}` : ''}${d.resent ? ` · sent again ${shortDay(d.resent.at)}` : ''}`)
  else bits.push('Not invited yet')
  return bits.join(' · ')
}
/** The studio's name as the WhatsApp drafts say it — the portal's own words, never "OpenMaison". */
const studioOf = (d: ClientAccessData) => d.studio
