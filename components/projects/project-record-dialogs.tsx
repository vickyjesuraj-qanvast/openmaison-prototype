'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { MSG } from '@/lib/forms'
import { displayDate, inputDate, parseInputDate } from '@/lib/format'
import { HOLD_PRESETS, HOLD_PRESET_DAYS, HOLD_REASON_MAX, type Hold } from '@/lib/projects/hold'
import type { ProjectContracts } from '@/app/projects/actions'
import { readClientTell, type ClientTell } from '@/app/projects/tell-actions'   // (simplify P2 §6.8) the client's number and page, read only
import { pendingWindow } from '@/components/portal/wa-window'
import { tellClientText, waLink } from '@/lib/projects/tell-client'
import styles from './project-record-dialogs.module.css'
import mo from './schedule/moment.module.css'

/*
 * (gaps build, package A — the owner's "build everything", 2026-10-07) The project record's own forms, each the house Dialog with the house
 * fields, closing only once its save lands (`onSave` resolves true): On hold (M-01) and the Contract step (item 6). Shared by the project page;
 * the listing's row menu opened On hold too. (parity P-09) The client and the property, the type and the scope are the lead form's now.
 */

const useFocusOnOpen = (open: boolean) => {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (!open) return; const r = requestAnimationFrame(() => requestAnimationFrame(() => ref.current?.focus())); return () => cancelAnimationFrame(r) }, [open])
  return ref
}
const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/* ── On hold (M-01) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const NO_DATE = 'No date yet'
const CUSTOM = 'Custom'
/**
 * Put on hold (or change the hold): the reason — the client reads it on their schedule — and when it resumes: the lead's On Hold presets
 * (REG-453: 1 · 3 · 6 months, Custom alone reveals the date) and "No date yet", since a client who pauses doesn't always say till when.
 */
export function HoldProjectDialog({ open, name, client, hold, today, onClose, onSave, projectId }: {
  open: boolean; name: string; client: string
  /** The hold as it stands — the dialog changes it. */
  hold: Hold | null
  today: Date
  onClose: () => void
  onSave: (v: { reason: string; until: string | null }) => Promise<boolean>
  /** (simplify P2 §6.8) the project — its client's number for ☑ Tell {client} on WhatsApp; read from the page's address (/projects/<id>/…)
      when not given (the listing's row menu passes it) */
  projectId?: string
}) {
  const pathname = usePathname()
  const params = useParams<{ id?: string | string[] }>()
  const pid = projectId ?? (pathname?.startsWith('/projects/') && typeof params?.id === 'string' ? params.id : null)
  /* (simplify P2 §6.8, the owner's "build everything", 2026-10-09) ☑ Tell {client} on WhatsApp: a draft with the reason and the day it picks up,
     opened on the press once the hold is saved — on for a new hold, off for a change to one */
  const [tell, setTell] = useState<ClientTell | null>(null)
  const [telling, setTelling] = useState(true)
  useEffect(() => {
    if (!open || !pid) return
    let live = true
    void readClientTell(pid).then((r) => { if (live) setTell('error' in r ? null : r) }, () => { if (live) setTell(null) })
    return () => { live = false }
  }, [open, pid])
  const [reason, setReason] = useState('')
  const [preset, setPreset] = useState<string>(NO_DATE)
  const [when, setWhen] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) {
    setWas(open)
    if (open) { setReason(hold?.reason ?? ''); setPreset(hold?.until ? CUSTOM : NO_DATE); setWhen(hold?.until ? inputDate(new Date(hold.until)) : ''); setTried(false); setBusy(false); setTelling(!hold) }
  }
  const ref = useFocusOnOpen(open && !hold)   // Put on hold opens on the reason; Change the hold is an edit — it opens unfocused (REG-224)
  const pick = (v: string) => {
    setPreset(v)
    const days = HOLD_PRESET_DAYS[v as (typeof HOLD_PRESETS)[number]]
    if (days) setWhen(inputDate(new Date(today.getTime() + days * 86_400_000)))
    else if (v === NO_DATE) setWhen('')
  }
  const picked = when ? parseInputDate(when) : null
  const errors = {
    reason: !reason.trim() ? MSG.required : undefined,
    when: preset === CUSTOM ? (!when ? MSG.required : !picked ? MSG.date : startOf(picked) <= startOf(today) ? MSG.future : undefined) : undefined,
  }
  const save = async () => {
    setTried(true)
    if (errors.reason || errors.when || busy) return
    setBusy(true)
    const until = preset === NO_DATE || !picked ? null : picked
    const t = telling && tell ? tell : null
    const w = t ? pendingWindow() : null   // WhatsApp opens on the press (REG-534); it is pointed at the draft once the hold is saved
    const ok = await onSave({ reason: reason.trim(), until: until ? until.toISOString() : null })
    setBusy(false)
    if (w && t) { if (ok) w.go(waLink(t.phone, tellClientText('hold', { client: t.client, studio: t.studio, url: t.path ? `${window.location.origin}${t.path}` : null, reason: reason.trim(), until: until ? until.getTime() : null }))); else w.cancel() }
    if (ok) onClose()
  }
  const first = client.split(/\s+/)[0] ?? client
  return (
    <Dialog open={open} onClose={onClose} title={hold ? 'Change the hold' : 'Put on hold'} subtitle={name} width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="hold-save">{busy ? 'Saving…' : hold ? 'Save' : 'Put on hold'}</Button></>}>
      <div className={styles.fields} data-testid="hold-dialog">
        <p className={styles.help}>The work pauses: its reminders and what needs attention rest until you resume it. Nothing is lost.</p>
        <TextField label="Why is it on hold?" required value={reason} onChange={setReason} maxLength={HOLD_REASON_MAX} error={tried ? errors.reason : undefined} inputRef={ref} trailingIcon={null}
                   helper={`${first} reads this on their schedule`} name="hold-reason" />
        <div className={styles.chipGroup}>
          <span className={styles.chipLabel}>Resumes</span>
          <Chips label="Resumes" options={[NO_DATE, ...HOLD_PRESETS, CUSTOM]} value={preset} onChange={pick} testId="hold-resume" />
        </div>
        {preset === CUSTOM ? <DateField label="Resume on" required value={when} onChange={setWhen} today={today} error={tried ? errors.when : undefined} /> : null}
        <span className={styles.help}>{picked && preset !== NO_DATE ? `It resumes ${displayDate(picked)} — the team is reminded that day.` : 'No resume date — resume it when the client is ready.'}</span>
        {tell ? (
          <div className={mo.tick}>
            <Checkbox isSelected={telling} onChange={setTelling} data-testid="hold-tell">{`Tell ${first} on WhatsApp`}</Checkbox>
            <span className={mo.help}>WhatsApp opens with the reason and when the works pick up — you send it.</span>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

/* ── (parity P-09, the owner's pick 2026-10-08) The client and the property · the project type · the scope ─────────────────────────────────
   The project's Edit details is the lead form now (components/leads/lead-form.tsx `project`): the lead's field block — NRIC / FIN, Customer ID,
   Area size and its unit, the studio's custom fields — with the project's own section after it. The dialog that stood here is gone. */

/* ── Getting started › Contract (item 6) ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The signed agreement on the project — 1.0's "Contract uploaded": link the client's signed contract (it opens from Key documents), or upload
 * the signed copy, which is filed in the project's contract folder (Files › Contract & VOs, by its own name). Loads on open (`read`); every
 * press answers through the page's run.
 */
export function ProjectContractDialog({ open, name, read, onClose, onLink, onUpload, onOpenFile }: {
  open: boolean; name: string
  read: () => Promise<ProjectContracts | { error: string }>
  onClose: () => void
  onLink: (contractId: string) => Promise<boolean>
  /** The file chosen — it is uploaded to Files › Contract. */
  onUpload: (file: File) => Promise<boolean>
  onOpenFile: (fileId: string) => void
}) {
  const [data, setData] = useState<ProjectContracts | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const [was, setWas] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  if (open !== was) { setWas(open); if (open) { setData(null); setFailed(null); setBusy(false) } }
  useEffect(() => {
    if (!open) return
    let live = true
    void read().then((r) => { if (!live) return; if ('error' in r) setFailed(r.error); else setData(r) }, () => { if (live) setFailed('') })
    return () => { live = false }
  }, [open, read, tick])
  const link = async (id: string) => { if (busy) return; setBusy(true); const ok = await onLink(id); setBusy(false); if (ok) onClose() }
  /* (simplify S-25 (2)) the folder's own name, as the server found it (`readProjectContracts`) — "Files" alone until it loads */
  const folder = data?.folderName ?? null
  const upload = async (f: File) => { setBusy(true); const ok = await onUpload(f); setBusy(false); if (ok) onClose() }
  return (
    <Dialog open={open} onClose={onClose} title="Contract" subtitle={name} width={600} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>
                     <Button iconStart={<Icon name="upload_file" size={20} />} onPress={() => input.current?.click()} isDisabled={busy || !data} data-testid="contract-upload">{busy ? 'Saving…' : 'Upload the signed copy'}</Button></>}>
      <div className={styles.fields} data-testid="contract-dialog">
        <input ref={input} type="file" hidden aria-hidden tabIndex={-1} accept=".pdf,.png,.jpg,.jpeg,.webp"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }} />
        {/* (simplify S-25 (2)) the folder it really files into, by its own name ("Contract & VOs"), read from the record — never a word typed here */}
        <p className={styles.help} data-testid="contract-folder-line">{`The signed agreement for this project: link the client’s signed contract, or upload the signed copy — it is filed in Files${folder ? ` › ${folder}` : ''}.`}</p>
        {failed !== null ? <p className={styles.help} role="status">{failed || 'Couldn’t load the contracts'} — <button type="button" className={styles.link} onClick={() => { setFailed(null); setTick((t) => t + 1) }}>try again</button></p>
          : !data ? <p className={styles.help} role="status">Loading…</p> : (
          <div className={styles.table} role="table" aria-label="Contracts" data-card-table="">
            <div className={styles.head} role="row"><span role="columnheader">The client’s contracts</span><span role="columnheader" className={styles.actionsHead}><span className={styles.srOnly}>Action</span></span></div>
            {data.contracts.length || data.files.length ? null : <div className={styles.tableRow} role="row"><span role="cell" className={styles.item}>No contract yet</span><span role="cell" /></div>}
            {data.contracts.map((x) => (
              <div key={x.id} className={styles.tableRow} role="row" data-testid="contract-row">
                <span role="cell" className={styles.item}><Icon name="contract" size={20} weight={300} /><span><span>{x.title}</span><span className={styles.why}>{x.status === 'Signed' && x.signedAt ? `Signed ${displayDate(new Date(x.signedAt))}` : x.status}</span></span></span>
                <span role="cell" className={styles.actions}>
                  {data.linkedId === x.id ? <span className={styles.why}>Linked</span>
                    : x.status === 'Signed' ? <Button appearance="text" onPress={() => { void link(x.id) }} isDisabled={busy} data-testid="contract-link">Link</Button>
                    : <span className={styles.why}>Not signed yet</span>}
                </span>
              </div>
            ))}
            {data.files.map((f) => (
              <div key={f.id} className={styles.tableRow} role="row" data-testid="contract-file">
                <span role="cell" className={styles.item}><Icon name="picture_as_pdf" size={20} weight={300} /><span><span>{f.name}</span><span className={styles.why}>{folder ? `In Files › ${folder}` : 'In Files'}</span></span></span>
                <span role="cell" className={styles.actions}><Button appearance="text" onPress={() => onOpenFile(f.id)}>Open</Button></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
