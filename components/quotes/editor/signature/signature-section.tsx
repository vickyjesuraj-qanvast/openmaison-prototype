'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { SignaturePad } from '@/components/om/signature-pad'
import { Button, Switch, Radio, RadioGroup } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useRun } from '@/components/leads/tasks/use-run'
import { saveMemberSignature, setClientSignatureRequired } from '@/app/quotes/signature-actions'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { isSignatureKind, signatureFileProblem, SIGNATURE_IMAGE_ACCEPT, SIGNATURE_UPLOAD_HELP, SIGNATURE_WRONG_TYPE, type MemberSignature, type SignatureKind } from '@/lib/quotes/signature'
import { SectionCard } from '../section-card'
import styles from './signature-section.module.css'

export type Signature = MemberSignature | null
/** What Signature Settings edits: the kind, the name, and the drawing's path or (Dane UAT 6.23) the picture's data URL ('' = none yet). */
export type SignatureDraft = { kind: SignatureKind; name: string; data: string }
export type SignatureSeed = {
  quoteId: string
  required: boolean
  /** The signed-in member — whose signature the left pane shows (owner 2026-09-11: saved per member). */
  memberName: string
  signature: Signature
  studioName: string
  clientName: string
  /** General Info's NRIC, as typed there (REG-403). */
  nric: string | null
}

/** The drawing, as stored (an SVG path on a 752×140 canvas), scaled into whatever box shows it. */
function Drawing({ d, className }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 752 140" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Signature (1263:35910 empty · 1263:35975 typed · 1263:36042 drawn; settings 1239:31250…; REG-421). The section-top
 * carries "Client Signature Required"; the body is two panes — the designer's signature (Draw / Type open Signature
 * Settings; then the name in the signature face or the drawing; under it the member's name · Edit · the studio) and the
 * client's dashed block ("Client signs online · Requested when you send · signed on approval"; the lead's name; NRIC from
 * General Info or "Requested when you send"). The switch off never hides the client block (owner: "default: don't hide").
 */
export function SignatureCard({ seed, open, onToggle, onHandlePointerDown, onSaved, nric }: {
  seed: SignatureSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onSaved: (updatedAt: number) => void
  /** Live from General Info. */
  nric: string
}) {
  const { run } = useRun()
  const [required, setRequired] = useState(seed.required)
  const [sig, setSig] = useState<Signature>(seed.signature)
  const [settings, setSettings] = useState<SignatureDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleRequired = (v: boolean) => {
    setRequired(v)
    void run('save the setting', async () => { const r = await setClientSignatureRequired(seed.quoteId, v); onSaved(r.updatedAt) })
  }
  const openSettings = (kind: SignatureKind) => setSettings({ kind, name: sig?.name || seed.memberName, data: sig && sig.kind === kind && sig.data ? sig.data : '' })
  /* (Dane UAT 6.23) The dialog closes once the save lands — a picture the server refuses keeps it open with the rule said. */
  const save = () => {
    const s = settings
    if (!s || !s.name.trim() || (s.kind !== 'type' && !s.data)) return
    setSaving(true)
    void run('save the signature', async () => {
      const r = await saveMemberSignature({ kind: s.kind, name: s.name.trim(), data: s.kind === 'type' ? null : s.data })
      if ('error' in r) return r
      setSig(r); setSettings(null)
    }, 'Signature saved').finally(() => setSaving(false))
  }

  const actions = (
    <label className={styles.switchRow}>Client signs online <Switch size="sm" isSelected={required} onChange={toggleRequired} aria-label="Client signs online" /></label>   /* (REG-578) the template's words: off = the client signs the printed quote */
  )
  const nricShown = (nric || seed.nric || '').trim()

  return (
    <SectionCard id="section-signature" title="Signature" open={open} onToggle={onToggle} actions={actions} onHandlePointerDown={onHandlePointerDown}>
      <div className={styles.panes}>
        <div className={styles.pane}>
          <div className={styles.box} data-kind={sig?.kind ?? 'none'} aria-label="Your signature">
            {!sig ? (
              <div className={styles.choose}>
                <Button variant="secondary" appearance="outlined" onPress={() => openSettings('draw')}>Draw</Button>
                <Button variant="secondary" appearance="outlined" onPress={() => openSettings('type')}>Type</Button>
                <Button variant="secondary" appearance="outlined" onPress={() => openSettings('image')}>Upload</Button>   {/* (Dane UAT 6.23) */}
              </div>
            ) : sig.kind === 'type' ? (
              <span className={styles.typed}>{sig.name}</span>
            ) : sig.kind === 'image' && sig.data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.picture} src={sig.data} alt={`${sig.name}’s signature`} data-testid="signature-picture" />
            ) : (
              <Drawing d={sig.data ?? ''} className={styles.drawing} />
            )}
          </div>
          <div className={styles.who}>
            <div className={styles.whoRow}>
              <span className={styles.name}>{sig?.name || seed.memberName}</span>
              <button type="button" className={styles.link} onClick={() => openSettings(sig?.kind ?? 'type')}>Edit</button>
            </div>
            <span className={styles.meta}>{seed.studioName}</span>
          </div>
        </div>
        <div className={styles.pane}>
          <div className={styles.clientBox} data-required={required || undefined}>
            <span className={styles.clientTitle}>{required ? 'Client signs online' : 'Client signs on paper'}</span>   {/* (sweep S1) the title follows the switch */}
            <span className={styles.clientMeta}>{required ? 'Requested when you send · signed on approval' : 'Not requested — the client signs on paper'}</span>
          </div>
          <div className={styles.who}>
            <span className={styles.name}>{seed.clientName}</span>
            <span className={styles.meta}><span className={styles.metaLabel}>NRIC:</span> {nricShown ? nricShown : <em className={styles.pending}>Requested when you send</em>}</span>
          </div>
        </div>
      </div>
      <SignatureSettings open={!!settings} value={settings} busy={saving} onChange={setSettings} onClose={() => setSettings(null)} onSave={save} />
    </SectionCard>
  )
}

/**
 * Signature Settings (1239:31250 type · 1239:31336 draw · 1239:31396 typed · 1239:31478 drawn): Designer Name* (48), "Show
 * signature as" Draw / Type (radio rows), the 752×140 preview — the name in the signature face, or a drawing surface with
 * Clear — and Cancel · Save. Drawing is pointer-driven (a finger works) and stored as an SVG path on the box's 752×140.
 * (Dane UAT 6.23, g-signature) A third choice, Upload: a picture of the hand-signed mark — PNG, or a JPG on white, up to 1 MB (1.0's
 * rule) — picked with the house file chooser and shown in the same box; a file over the cap or of another kind is refused under the box.
 */
export function SignatureSettings({ open, value, onChange, onClose, onSave, busy = false }: {
  open: boolean
  value: SignatureDraft | null
  onChange: (v: SignatureDraft | null) => void
  onClose: () => void
  onSave: () => void
  busy?: boolean
}) {
  const v = value ?? { kind: 'type' as const, name: '', data: '' }
  const canSave = !!v.name.trim() && (v.kind === 'type' || !!v.data) && !busy
  const file = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setProblem(null) }   // every opening starts without an old refusal (render-phase adjust)
  /* Checked before it is read: a file over 1 MB or not a PNG / JPG never leaves the browser. A picture larger than the page needs is drawn
     down to 1600px on its long side, keeping its format (lib/templates/files.ts). */
  const pick = async (f: File) => {
    const why = signatureFileProblem(f)
    if (why) { setProblem(why); return }
    try { const url = await readFileAsDataUrl(f, 1600); setProblem(null); onChange({ ...v, kind: 'image', data: url }) }
    catch { setProblem(SIGNATURE_WRONG_TYPE) }
  }
  const choose = () => file.current?.click()
  return (
    <Dialog open={open} onClose={onClose} title="Signature Settings" size="modal" width={800}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={onSave} isDisabled={!canSave}>Save</Button></>}>
      <div className={styles.settings}>
      <TextField label="Designer Name" required value={v.name} onChange={(name) => onChange({ ...v, name })} autoFocus />
      {/* (sweep S1) the DS radio group — arrow keys walk it, as every other radio pair in the app */}
      <div className={styles.modeRow}>
        <span className={styles.modeLabel} id="sig-mode-label">Show signature as</span>
        {/* a switch of kind keeps each kind's own work apart: the drawing stays a path, the picture a data URL — never one read as the other */}
        <RadioGroup aria-labelledby="sig-mode-label" orientation="horizontal" value={v.kind} onChange={(k) => { if (isSignatureKind(k) && k !== v.kind) { setProblem(null); onChange({ ...v, kind: k, data: '' }) } }}>
          <span className={styles.modeRadios}><Radio value="draw">Draw</Radio><Radio value="type">Type</Radio><Radio value="image">Upload</Radio></span>
        </RadioGroup>
      </div>
      {/* (REG-633) the draw box is the shared pad (components/om/signature-pad.tsx) — the client's signing page draws on the same one */}
      {v.kind === 'type' ? (
        <div className={styles.preview} data-kind="type"><span className={styles.typed}>{v.name.trim() || 'Your name'}</span></div>
      ) : v.kind === 'image' ? (
        <div className={styles.upload}>
          <div className={styles.preview} data-kind="image" data-testid="signature-upload">
            {v.data ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.picture} src={v.data} alt="Your signature" />
                <button type="button" className={styles.clear} onClick={choose}>Replace</button>
              </>
            ) : (
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} onPress={choose}>Choose a picture</Button>
            )}
          </div>
          <span className={styles.uploadNote} data-error={problem ? '' : undefined} role={problem ? 'alert' : undefined} data-testid="signature-upload-note">{problem ?? SIGNATURE_UPLOAD_HELP}</span>
          <input ref={file} type="file" accept={SIGNATURE_IMAGE_ACCEPT} hidden data-testid="signature-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f) }} />
        </div>
      ) : <SignaturePad value={v.data} onChange={(data) => onChange({ ...v, data })} />}
      </div>
    </Dialog>
  )
}
