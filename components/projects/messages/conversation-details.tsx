'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Drawer, DrawerRule } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { Line } from '@/components/shell/ghost-kit'
import { AssigneeField } from '@/components/leads/assignee-field'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { addToGroupChat, conversationShared, leaveGroupChat, removeFromGroupChat, renameGroupChat, undoRemoveFromGroupChat, undoRenameGroupChat, type Shared, type SharedItem } from '@/app/chat/actions'
import { GROUP_NAME_MAX } from '@/lib/projects/messages-model'
import { withFrom } from '@/lib/nav'
import { copyText } from '@/lib/clipboard'
import { phoneDigits, phoneDisplay, phoneLocal } from '@/lib/format'
import type { ConversationData } from '@/lib/projects/messages'
import styles from './messages.module.css'

/**
 * (pending modules S26 — her "build all of them" 2026-10-11; cards studio:team-chats · api:messages-free-chats) A conversation's Details — 1.0's
 * context panel (src/components/inbox/context-panel.tsx) on the house Drawer: who is in it, and what it has shared as 1.0 grouped it, Docs ·
 * Media · Links. A group's people are kept here by hand (Add people · Take out · Leave the group — every remove with its Undo; 1.0's rule:
 * a Designer never takes an Owner or an Admin out) and its name (Rename). Two people's conversation offers a group with them; the studio's
 * room is everyone; a lead's or a project's Team conversation is its team (changed on the lead, its one home); a client's says who reads it on
 * their page. The rows are the Client access panel's (one section · box · row grammar). *(invented copy: every heading and line)*
 */
export function ConversationDetails({ open, onClose, data, onChanged, onLeft, onStartGroup, here }: {
  open: boolean; onClose: () => void; data: ConversationData
  /** re-read the conversation (its people, its name) after a change here */
  onChanged: () => void
  /** a group this member just left — the page closes it and offers Undo */
  onLeft?: (o: { id: string; lineId: string; title: string }) => void
  /** two people's conversation → New group with them */
  onStartGroup?: (memberIds: string[]) => void
  /** where a door opened from here comes back to */
  here: string
}) {
  const snackbar = useSnackbar()
  const [shared, setShared] = useState<Shared | null>(null)
  const [tab, setTab] = useState<'docs' | 'media' | 'links'>('media')
  const [was, setWas] = useState<{ open: boolean; key: string }>({ open, key: data.key })
  if (was.open !== open || was.key !== data.key) { setWas({ open, key: data.key }); if (open) setShared(null) }   // render-phase adjust: each opening reads afresh
  useEffect(() => {
    if (!open) return
    let alive = true
    void conversationShared(data.key).then((r) => { if (alive) setShared('error' in r ? { docs: [], media: [], links: [], filesHref: null } : r) }, () => { if (alive) setShared({ docs: [], media: [], links: [], filesHref: null }) })
    return () => { alive = false }
  }, [open, data.key])
  /* the tab that holds something, on first read */
  const [pickedFor, setPickedFor] = useState<string | null>(null)
  if (shared && pickedFor !== data.key) { setPickedFor(data.key); setTab(shared.media.length ? 'media' : shared.docs.length ? 'docs' : shared.links.length ? 'links' : 'media') }

  const chat = data.chat
  const group = chat?.type === 'group'
  const [renaming, setRenaming] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const takeOut = async (id: string, name: string) => {
    setBusy(true)
    try {
      const r = await removeFromGroupChat(data.key, id)
      if ('error' in r) { snackbar({ message: couldnt(`take ${name} out`, refusalOf(r.error)) }); return }   // (S42 audit C-13) a member as stored
      onChanged()
      snackbar({ message: `${r.name} taken out of the group`, actionLabel: 'Undo', onAction: () => { void undoRemoveFromGroupChat(data.key, r.undo).then((u) => { if ('error' in u) snackbar({ message: couldnt('put them back', refusalOf(u.error)) }); else onChanged() }) } })
    } catch { snackbar({ message: couldnt('take them out') }) } finally { setBusy(false) }
  }
  const leave = async () => {
    setBusy(true)
    try {
      const r = await leaveGroupChat(data.key)
      if ('error' in r) { snackbar({ message: couldnt('leave the group', refusalOf(r.error)) }); return }
      onClose()
      onLeft?.({ id: r.id, lineId: r.undo.lineId, title: data.title })
    } catch { snackbar({ message: couldnt('leave the group') }) } finally { setBusy(false) }
  }

  const list = shared ? shared[tab] : []
  const people = chat ? chat.people : null
  /* (pending modules S46B — her "fix everything" 2026-10-19 after the findability audit, H3; 1.0's chat header had the client's number) the
     client's number in their row, in the info column's grammar: Call — on a touch screen it dials; at a desk the number is copied and the
     snackbar says to call from a phone (REG-1566's Call {client}) — and Copy (REG-287's one copy format) */
  const phone = (data.kind === 'client' || data.kind === 'lead') && phoneDigits(data.people.phone) ? data.people.phone : null
  const clientFirst = data.people.client.split(/\s+/)[0] || data.people.client
  const call = () => {
    if (!phone) return
    if (window.matchMedia('(hover: none)').matches) { window.location.assign(`tel:+65${phoneDigits(phone)}`); return }
    const number = phoneDisplay(phone)
    void copyText(number).then(() => snackbar({ message: `${clientFirst}’s number, ${number}, is copied — call from your phone` }), () => snackbar({ message: `Call ${clientFirst} on ${number}` }))
  }
  const copyPhone = () => { if (phone) void copyText(phoneDisplay(phone)).then(() => snackbar({ message: 'Copied to clipboard' }), () => snackbar({ message: 'Couldn’t copy — please try again' })) }
  const first = (n: string) => n.trim()   // (S42 audit C-13) a member as the studio stored them
  return (
    <>
      <Drawer open={open} onClose={onClose} title="Details" label={`Details · ${data.title}`} width="standard">
        <section className={styles.dSection} data-testid="details-people">
          <div className={styles.dHead}>
            <h3 className={styles.dTitle}>{group ? data.title : chat?.type === 'studio' ? 'Everyone at the studio' : 'People'}</h3>
            {group && chat?.mayRename ? <button type="button" className={styles.dLink} onClick={() => setRenaming(true)} data-testid="details-rename">Rename</button> : null}
          </div>
          <p className={styles.dFoot}>{peopleLine(data)}</p>
          <div className={styles.dBox}>
            {people ? people.map((p) => (
              <div key={p.id} className={styles.dRow} data-testid="details-person" data-member={p.id}>
                <Avatar name={p.name} color={p.color} size={36} tooltip={false} />
                {/* (S42 audit C-17) a person this member may not take out says why in the row (1.0's rule: only an Owner or an Admin takes out an Owner
                    or an Admin) *(invented copy)* */}
                <span className={styles.dText}><span className={styles.dName}>{p.id === data.me.id ? `${p.name} (you)` : p.name}</span><span className={styles.dMeta} data-testid="details-person-meta">{!p.active ? 'No longer in the studio' : group && p.id !== data.me.id && !chat?.mayRemove.includes(p.id) ? `${p.role} · only an Owner or an Admin takes them out` : p.role}</span></span>
                {group && chat?.mayRemove.includes(p.id) ? <button type="button" className={styles.dLink} disabled={busy} onClick={() => { void takeOut(p.id, p.name) }} data-testid="details-take-out">Take out</button> : null}
              </div>
            )) : (<>
              {data.kind === 'client' || data.kind === 'lead' ? [data.people.client, ...data.people.household].map((n, i) => (
                <div key={`c-${n}-${i}`} className={styles.dRow} data-testid="details-person"><Avatar name={n} color="var(--om-color-on-surface-secondary)" size={36} tooltip={false} />
                  <span className={styles.dText}><span className={styles.dName}>{n}</span><span className={styles.dMeta} data-testid={i === 0 ? 'details-client-meta' : undefined}>{i === 0 && phone ? `Client · ${phoneLocal(phone)}` : i === 0 ? 'Client' : 'Household'}</span></span>
                  {i === 0 && phone ? (<>
                    <Tooltip label={`Call ${clientFirst}`}><IconButton icon="call" label={`Call ${clientFirst}`} variant="bare" onClick={call} data-testid="details-call" /></Tooltip>
                    <Tooltip label="Copy phone number"><IconButton icon="content_copy" label="Copy phone number" variant="bare" onClick={copyPhone} data-testid="details-copy-phone" /></Tooltip>
                  </>) : null}
                </div>
              )) : null}
              {data.people.team.map((t) => (
                <div key={t.id} className={styles.dRow} data-testid="details-person" data-member={t.id}><Avatar name={t.name} color={t.color} size={36} tooltip={false} />
                  <span className={styles.dText}><span className={styles.dName}>{t.id === data.me.id ? `${t.name} (you)` : t.name}</span><span className={styles.dMeta}>Member</span></span></div>
              ))}
              {!data.people.team.length && data.kind !== 'client' && data.kind !== 'lead' ? <p className={styles.dEmpty}>Nobody is on it yet — assign a member on the lead.</p> : null}
            </>)}
          </div>
          {group ? (
            <div className={styles.dActions}>
              {/* (S42 audit C-26) beside the text button, the house's outlined primary (EmptyState's grammar) — the neutral one read as disabled */}
              {chat?.mayAdd && chat.others.length ? <Button variant="primary" appearance="outlined" iconStart={<Icon name="person_add" size={20} />} onPress={() => setAdding(true)} data-testid="details-add">Add people</Button> : null}
              {chat?.mayLeave ? <Button appearance="text" onPress={() => { void leave() }} isDisabled={busy} data-testid="details-leave">Leave the group</Button> : null}
            </div>
          ) : chat?.type === 'direct' && chat.other?.active && onStartGroup ? (
            <div className={styles.dActions}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="group" size={20} />} onPress={() => { onClose(); onStartGroup([chat.other!.id]) }} data-testid="details-start-group">{`Start a group with ${first(chat.other.name)}`}</Button></div>
          ) : data.lead && (data.kind === 'team' || data.kind === 'lead-team') ? (
            <div className={styles.dActions}><Link className={styles.dLink} href={withFrom(data.project ? `/projects/${data.project.id}` : `/leads/${data.lead.id}`, here)} data-testid="details-team-door">{data.project ? 'Change who is on the project' : 'Change who is on the lead'}</Link></div>
          ) : null}
        </section>
        <DrawerRule />
        <section className={styles.dSection} data-testid="details-shared">
          <h3 className={styles.dTitle}>Shared in this conversation</h3>
          {!shared ? (
            <div className={styles.dLoading} aria-busy aria-label="Loading what was shared"><Line w={220} lh={32} h={24} /><Line w="100%" lh={56} h={48} /><Line w="100%" lh={56} h={48} /></div>
          ) : (<>
            <Chips label="What was shared" value={tab} onChange={(v) => setTab(v as typeof tab)} testId="details-shared-tabs"
                   options={[{ value: 'media', label: `Media · ${shared.media.length}` }, { value: 'docs', label: `Docs · ${shared.docs.length}` }, { value: 'links', label: `Links · ${shared.links.length}` }]} />
            {list.length ? (
              <div className={styles.dBox} data-testid="details-shared-list">
                {list.map((x) => <SharedRow key={x.id} x={x} now={data.now} />)}
              </div>
            ) : <p className={styles.dEmpty} data-testid="details-shared-empty">{tab === 'media' ? 'No photos, videos or voice notes yet.' : tab === 'docs' ? 'No documents yet — a PDF, a sheet or a drawing sent here lands in this list.' : 'No links yet — a web address in a message lands in this list.'}</p>}
            {shared.filesHref ? <Link className={styles.dLink} href={withFrom(shared.filesHref, here)} data-testid="details-files">All in Files › Messages</Link> : null}
          </>)}
        </section>
      </Drawer>
      {group ? <RenameDialog open={renaming} name={chat?.name ?? data.title} onClose={() => setRenaming(false)} onSave={async (name) => {
        const r = await renameGroupChat(data.key, { name }).catch(() => ({ error: 'please try again' }))
        if ('error' in r) { snackbar({ message: couldnt('rename the group', refusalOf(r.error)) }); return false }
        onChanged()
        snackbar({ message: `Renamed “${r.name}”`, actionLabel: 'Undo', onAction: () => { void undoRenameGroupChat(data.key, r.undo).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the old name back', refusalOf(u.error)) }); else onChanged() }) } })
        return true
      }} /> : null}
      {group && chat ? <AddPeopleDialog open={adding} team={chat.others} onClose={() => setAdding(false)} onSave={async (ids) => {
        const r = await addToGroupChat(data.key, { memberIds: ids }).catch(() => ({ error: 'please try again' }))
        if ('error' in r) { snackbar({ message: couldnt('add them', refusalOf(r.error)) }); return false }
        onChanged()
        snackbar({ message: `${listWords(r.names.map(first))} added to the group` })
        return true
      }} /> : null}
    </>
  )
}

const listWords = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n[0] ?? '')
/** Who reads it, in one line. */
function peopleLine(d: ConversationData): string {
  const c = d.chat
  if (c?.type === 'studio') return `Every member who opens Messages reads it — ${c.people.length} ${c.people.length === 1 ? 'person' : 'people'}.`
  if (c?.type === 'direct') return c.other && !c.other.active ? `${c.other.name} is no longer in the studio — the messages stay.` : 'Only the two of you read it.'
  if (c) return `Only the people in it read it — ${c.people.length} ${c.people.length === 1 ? 'person' : 'people'}.`
  if (d.kind === 'team' || d.kind === 'lead-team') return `The team’s own — ${d.lead?.client ?? 'the client'} never sees it. Whoever sees the ${d.project ? 'project' : 'lead'} reads it; its members, their Managers, Owners and Admins write in it.`
  const names = [d.people.client, ...d.people.household]
  return d.people.invited ? `${listWords(names)} ${names.length > 1 ? 'read' : 'reads'} it on their page.` : `${d.people.client} hasn’t been invited to their page yet — the messages wait there for them.`
}

function SharedRow({ x, now }: { x: SharedItem; now: number }) {
  const icon = x.kind === 'doc' ? 'description' : x.kind === 'video' ? 'photo_camera' : x.kind === 'voice' ? 'mic' : x.kind === 'place' ? 'home' : 'link'
  const when = new Date(x.at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', ...(new Date(x.at).getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}) })
  return (
    <a className={styles.dRowLink} href={x.href} target="_blank" rel="noopener noreferrer" data-testid="details-shared-row" data-kind={x.kind}>
      {/* the house thumbnail: a photo fills the square, anything else its glyph (REG-820) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <span className={styles.dThumb} aria-hidden>{x.thumb ? <img src={x.thumb} alt="" loading="lazy" /> : <Icon name={icon} size={20} weight={300} />}</span>
      <span className={styles.dText}><span className={styles.dName}>{x.name}</span><span className={styles.dMeta}>{`${x.by} · ${when}`}</span></span>
      <Icon name="arrow_outward" size={16} weight={300} className={styles.dGo} />
    </a>
  )
}

function RenameDialog({ open, name, onClose, onSave }: { open: boolean; name: string; onClose: () => void; onSave: (name: string) => Promise<boolean> }) {
  const [v, setV] = useState(name)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(open)
  if (was !== open) { setWas(open); if (open) { setV(name); setTried(false) } }
  const save = async () => {
    setTried(true)
    if (!v.trim() || busy) return
    setBusy(true)
    try { if (await onSave(v.trim())) onClose() } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Rename the group" size="form" width={400} nested
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="rename-save">{busy ? 'Saving…' : 'Save'}</Button></>}>
      <TextField label="Group name" value={v} onChange={setV} maxLength={GROUP_NAME_MAX} error={tried && !v.trim() ? 'Name the group' : undefined} autoFocus
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }} />
    </Dialog>
  )
}

function AddPeopleDialog({ open, team, onClose, onSave }: { open: boolean; team: { id: string; name: string; role: string; color: string }[]; onClose: () => void; onSave: (ids: string[]) => Promise<boolean> }) {
  const [ids, setIds] = useState<string[]>([])
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(open)
  if (was !== open) { setWas(open); if (open) { setIds([]); setTried(false) } }
  const save = async () => {
    setTried(true)
    if (!ids.length || busy) return
    setBusy(true)
    try { if (await onSave(ids)) onClose() } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Add people" size="form" width={480} nested
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="add-people-save">{busy ? 'Adding…' : 'Add'}</Button></>}>
      <AssigneeField label="People" team={team} value={ids} onChange={setIds} error={tried && !ids.length ? 'Pick someone to add' : undefined} />
      <p className={styles.dFoot}>They read the whole conversation, from its first message.</p>
    </Dialog>
  )
}
