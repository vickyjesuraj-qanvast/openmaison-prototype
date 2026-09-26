'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDate, isSgPhone, phoneDigits } from '@/lib/format'
import { SHARE_MAX_VERSIONS } from '@/lib/visualizer/policy'
import type { VersionView } from '@/lib/visualizer/model'
import { clientRoomNames, joinWords } from '@/lib/visualizer/outputs'
import type { ShareRow } from '@/lib/visualizer/queries'
import styles from './dialogs.module.css'

const ago = (ms: number, now: number) => { const d = Math.round((now - ms) / 86_400_000); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago` }
const DAY = 86_400_000
/** (critic 18) A link about to close says when, in hours — "closes in 5 h" — so Renew is pressed before the client meets a dead link. */
const closesIn = (ms: number) => { const h = Math.ceil(ms / 3_600_000); return h <= 1 ? 'closes within the hour' : `closes in ${h} h` }
/** (F107) How the link left the studio — never "sent" for a link nobody sent. */
const madeWords = (s: ShareRow, now: number) => (s.sentVia === 'whatsapp' ? `sent ${ago(s.createdAt, now)} on WhatsApp` : s.sentVia === 'copy' ? `copied ${ago(s.createdAt, now)}` : `made ${ago(s.createdAt, now)} · not sent yet`)
/** How long a copy button reads "… copied" before it goes back to its label. */
const COPIED_MS = 2000

/**
 * (wave E · E2) A copy made inside this dialog is confirmed inside it: the button that copied reads "Link copied" / "Message copied" with
 * a check for ~2 s — never a snackbar, which lands over the dialog's footer on a short window. `done` names what was copied last (a row's
 * id, 'link', 'message'); a failed copy still says so in the house snackbar, since nothing in the dialog changed.
 */
function useCopiedMark(open: boolean) {
  const snackbar = useSnackbar()
  const [done, setDone] = useState<{ what: string; run: number } | null>(null)
  const [was, setWas] = useState(open)
  if (open !== was) { setWas(open); setDone(null) }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runs = useRef(0)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const copy = (what: string, text: string, failed: string): Promise<boolean> => {
    const write = navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard'))
    return write.then(() => {
      const run = ++runs.current
      setDone({ what, run })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setDone((x) => (x && x.run === run ? null : x)), COPIED_MS)
      return true
    }, () => { snackbar({ message: failed }); return false })
  }
  return { copied: (what: string) => done?.what === what, copy }
}

/** Why a link that nobody stopped no longer opens (`ShareRow.ended`). */
const ENDED: Record<string, string> = { design: 'Ended — the design was deleted', lead: 'Ended — the lead was closed', versions: 'Ended — its versions were deleted' }

/**
 * Share with client (REG-675, Q-14; 1.0's Share + share dialog, A E-01…E-03, C-83, on Quote X-Ray's send dialog): pick up to six
 * versions from any room (the one on screen ticked), a note for the page; Create link freezes them on one link for seven days and saves
 * each to the lead's Files › Renders (Q-13). Then the WhatsApp draft — to the lead's number when it is a Singapore one — and Copy link.
 * Earlier links list what the client did (opened, a favourite, notes, a call back) with Renew and Stop sharing.
 * (audit 2026-09-26) A live link copies or opens again from its row; a link nobody sent says so; a stopped one wears link_off, one that
 * ended by itself says why; one closing within a day says when and offers Renew (F107 · critic 18). Before the link is made, the dialog
 * says each version shared is also saved to the lead's Files › Renders (F114).
 */
export function ShareDialog({ open, onClose, rooms, initial, lead, studio, sender, shares, now, onCreate, onSent, onStop, onRenew, onUnstop }: {
  open: boolean; onClose: () => void
  rooms: { id: string; name: string; versions: VersionView[] }[]
  initial: string[]
  lead: { name: string; phone: string | null } | null
  studio: string; sender: string
  shares: ShareRow[]; now: number
  onCreate: (keys: string[], message: string) => Promise<{ token: string; id: string } | { error: string }>
  onSent: (id: string, via: 'whatsapp' | 'copy') => void
  onStop: (id: string) => void; onRenew: (id: string) => void
  /** (verify round 1) Undo a Stop sharing from its own row — the snackbar would land over this dialog. */
  onUnstop?: (id: string) => void
}) {
  const [picked, setPicked] = useState<string[]>(initial)
  const [note, setNote] = useState('')
  const [made, setMade] = useState<{ id: string; url: string } | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stop, setStop] = useState<string | null>(null)
  /* the links stopped while this dialog is open — their row offers Undo */
  const [stopped, setStopped] = useState<string[]>([])
  const [was, setWas] = useState(open)
  if (open !== was) { setWas(open); if (open) { setPicked(initial.slice(0, SHARE_MAX_VERSIONS)); setNote(''); setMade(null); setText(''); setError(null); setStopped([]) } }
  const first = lead?.name.split(' ')[0] ?? 'there'
  /* (F102 · F103) the rooms in the design's order, as the client's page names them — "Kitchen sketch" is the kitchen, "Living room 2" the
     living room when it is the only one on the link — joined as a sentence ("living room, kitchen and bedroom") */
  const sharedRooms = rooms.filter((r) => r.versions.some((v) => picked.includes(v.key))).map((r) => r.name)
  /* (wave E · E13) with every room of the design, exactly as the client's page and the server name them — a lone "Living room 2" on the
     link is the client's living room when the design has a "Living room" */
  const plain = clientRoomNames(sharedRooms, rooms.map((r) => r.name))
  const said = (n: string) => (/^[A-Z][^A-Z]*$/.test(n) ? n.toLowerCase() : n)   // "Living room" → "living room"; "Sophia’s Room" stays
  const roomWords = joinWords([...new Set(sharedRooms.map((r) => said(plain.get(r) ?? r)))])
  const draft = (url: string) => `Hi ${first}, here ${picked.length === 1 ? 'is a design idea' : `are ${picked.length} design ideas`} for your ${roomWords || 'home'}: ${url}\n\n${picked.length === 1 ? 'Have a look, and pin a note on anything you’d change' : 'Tap the one you like best, or pin a note on anything you’d change'} — I’ll take it from there.\n\n${sender}, ${studio}`
  const { copied, copy } = useCopiedMark(open)
  const LINK_FAILED = 'Couldn’t copy the link — please try again'
  const digits = phoneDigits(lead?.phone).slice(-8)
  const wa = `https://wa.me/${isSgPhone(digits) ? `65${digits}` : ''}?text=${encodeURIComponent(text)}`
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length >= SHARE_MAX_VERSIONS ? p : [...p, k]))
  const create = async () => {
    setBusy(true); setError(null)
    const origin = window.location.origin
    const r = await onCreate(picked, note).catch(() => ({ error: 'Couldn’t make the link — please try again.' }))
    setBusy(false)
    if ('error' in r) { setError(r.error); return }
    const url = `${origin}/renders/${r.token}`
    setMade({ id: r.id, url }); setText(draft(url))
  }
  const linkOf = (s: ShareRow) => `${window.location.origin}/renders/${s.token}`
  /* (verify round 1) the studio's own look at the link is marked, so it never counts as the client opening it */
  const previewOf = (s: ShareRow) => `${linkOf(s)}?preview=1`
  const copyRow = (s: ShareRow) => { void copy(`row:${s.id}`, linkOf(s), LINK_FAILED).then((ok) => { if (ok && !s.sentVia) onSent(s.id, 'copy') }) }
  /* the button that copied says so, with a check, where the eye already is (E2) */
  const copyLabel = (what: string, label: string, done: string) => (copied(what) ? done : label)
  const copyIcon = (what: string, icon: string) => <Icon name={copied(what) ? 'check' : icon} size={20} />
  const live = shares.filter((s) => !s.revokedAt && !s.ended && s.expiresAt >= now)
  return (
    <>
      <Dialog open={open} onClose={onClose} title={made ? 'Send it to the client' : `Share with ${lead?.name ?? 'the client'}`} size="modal" width={800}
              subtitle={made ? `The link is ready${lead ? ` — and saved in ${lead.name}’s Files › Renders` : ''}. Send it on WhatsApp — edit the message so it sounds like you.` : `Pick up to ${SHARE_MAX_VERSIONS} versions. The client sees them side by side, with before and after, and can pick a favourite or pin a note.`}
              footer={made ? (
                <div className={styles.footRow}>
                  <Button appearance="outlined" variant="secondary" iconStart={copyIcon('message', 'content_copy')} onPress={() => { void copy('message', text, 'Couldn’t copy the message — please try again').then((ok) => { if (ok) onSent(made.id, 'copy') }) }}>{copyLabel('message', 'Copy message', 'Message copied')}</Button>
                  <Button iconStart={<Icon name="chat" size={20} />} onPress={() => { window.open(wa, '_blank', 'noopener'); onSent(made.id, 'whatsapp'); onClose() }} data-testid="viz-open-whatsapp">Open WhatsApp</Button>
                </div>
              ) : (
                <div className={styles.footRow}>
                  <span className={styles.footCount}>{picked.length ? `${picked.length} of ${SHARE_MAX_VERSIONS} picked` : 'Pick a version to share'}</span>
                  <Button appearance="outlined" variant="secondary" onPress={onClose}>Cancel</Button>
                  <Button isDisabled={!picked.length || busy} onPress={() => { void create() }} data-testid="viz-create-link">{busy ? 'Making the link…' : 'Create link'}</Button>
                </div>
              )}>
        {made ? (
          <div className={styles.stack}>
            <div className={styles.link}><Icon name="link" size={20} weight={300} /><span className={styles.linkUrl} data-testid="viz-share-url">{made.url}</span><Button appearance="text" iconStart={copied('link') ? <Icon name="check" size={18} /> : undefined} onPress={() => { void copy('link', made.url, LINK_FAILED).then((ok) => { if (ok) onSent(made.id, 'copy') }) }} data-testid="viz-copy-link">{copyLabel('link', 'Copy link', 'Link copied')}</Button></div>
            <div className={styles.box}><TextArea aria-label="Message to the client" value={text} onChange={(v: string) => setText(v)} /></div>
            <div className={styles.under}><Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} onPress={() => setText(draft(made.url))} isDisabled={text === draft(made.url)}>Reset to draft</Button><span className={styles.count}>{text.length} characters · the link lives 7 days</span></div>
          </div>
        ) : (
          <div className={styles.stack}>
            {rooms.filter((r) => r.versions.length).map((r) => (
              <div key={r.id} className={styles.section}>
                <span className={styles.head}><span>{r.name}</span></span>
                <div className={styles.tiles}>
                  {r.versions.map((v) => {
                    const on = picked.includes(v.key)
                    return (
                      <button key={v.key} type="button" className={styles.tile} data-on={on || undefined} aria-pressed={on} onClick={() => toggle(v.key)} disabled={!on && picked.length >= SHARE_MAX_VERSIONS} data-testid="viz-share-pick">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.imageUrl} alt="" loading="lazy" />
                        <span className={styles.tick} aria-hidden>{on ? <Icon name="done" size={16} /> : null}</span>
                        <span className={styles.tileName}>V{v.n}</span><span className={styles.tileSub}>{v.descriptor}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {!rooms.some((r) => r.versions.length) ? <span className={styles.hint}>Nothing to share yet — generate a version first.</span>
              : <>
                  {lead ? <span className={styles.hint}><Icon name="info" size={16} weight={300} /> Each version you share is also saved to {lead.name}’s Files › Renders.</span> : null}
                  {/* (D1) the team's pins never go out on the link — the client sees the notes they add, and the studio's replies in them */}
                  <span className={styles.hint} data-testid="viz-share-pins-private"><Icon name="lock" size={16} weight={300} /> Your team’s pins stay private — the client sees only their own notes.</span>
                </>}
            <TextArea label="A note on the page (optional)" placeholder="e.g. Two floor options for the living room — the walnut is my favourite." value={note} onChange={(v: string) => setNote(v)} />
            {error ? <span className={styles.hint} role="alert" style={{ color: 'var(--om-color-tertiary-red-default)' }}>{error}</span> : null}
            {shares.length ? (
              <div className={styles.section} data-testid="viz-shared-before">
                <span className={styles.head}><span>Shared before</span><span>{live.length} live</span></span>
                <div className={styles.shared}>
                  {shares.map((s) => {
                    const expired = s.expiresAt < now
                    const ended = s.ended && s.ended !== 'stopped' ? s.ended : null
                    const open = !s.revokedAt && !ended && !expired
                    const soon = open && s.expiresAt - now < DAY
                    const fav = [...s.responses].reverse().find((x) => x.kind === 'favourite')
                    const notes = s.responses.filter((x) => x.kind === 'note').length
                    const call = s.responses.some((x) => x.kind === 'call_back')
                    const state = s.revokedAt ? 'Stopped' : ended ? ENDED[ended] ?? 'Ended' : expired ? `Expired ${displayDate(new Date(s.expiresAt))}` : soon ? `Open — ${closesIn(s.expiresAt - now)}` : `Open until ${displayDate(new Date(s.expiresAt))}`
                    return (
                      <div key={s.id} className={styles.sharedRow} data-testid="viz-shared-row">
                        <Icon name={s.revokedAt || ended ? 'link_off' : expired || soon ? 'schedule' : 'send'} size={20} weight={300} />
                        <span className={styles.sharedText}>{s.keys.length} {s.keys.length === 1 ? 'version' : 'versions'} · {madeWords(s, now)}
                          <span>{state}{s.viewCount ? ` · opened ${s.viewCount}×` : ' · not opened yet'}{fav ? ' · a favourite picked' : ''}{notes ? ` · ${notes} ${notes === 1 ? 'note' : 'notes'}` : ''}{call ? ' · asked for a call back' : ''}</span></span>
                        <span className={styles.rowActions}>
                          {open ? <Button appearance="text" iconStart={copied(`row:${s.id}`) ? <Icon name="check" size={18} /> : undefined} onPress={() => copyRow(s)} data-testid="viz-copy-row">{copyLabel(`row:${s.id}`, 'Copy link', 'Link copied')}</Button> : null}
                          {s.revokedAt && onUnstop && stopped.includes(s.id) ? <Button appearance="text" onPress={() => { setStopped((x) => x.filter((y) => y !== s.id)); onUnstop(s.id) }}>Undo</Button>
                            : (s.revokedAt || expired || soon) && !ended ? <Button appearance="text" onPress={() => onRenew(s.id)}>Renew</Button> : null}
                          {open && !soon ? <Tooltip label="Open the link"><IconButton icon="open_in_new" label="Open the link" size={36} variant="bare" iconSize={20} onClick={() => window.open(previewOf(s), '_blank', 'noopener')} /></Tooltip> : null}
                          {open ? <Tooltip label="Stop sharing"><IconButton icon="link_off" label="Stop sharing this link" size={36} variant="bare" iconSize={20} onClick={() => setStop(s.id)} /></Tooltip> : null}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!stop} nested title="Stop sharing this link?" message="The client sees that the link has ended. You can renew it later." confirmLabel="Stop sharing"
                     onCancel={() => setStop(null)} onConfirm={() => { const id = stop; setStop(null); if (id) { setStopped((x) => [...x, id]); onStop(id) } }} />
    </>
  )
}
