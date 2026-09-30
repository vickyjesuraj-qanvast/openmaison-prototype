'use client'

import { useState, type PointerEvent } from 'react'
import { SignaturePad } from '@/components/om/signature-pad'
import { Button, Switch, Radio, RadioGroup } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useRun } from '@/components/leads/tasks/use-run'
import { saveMemberSignature, setClientSignatureRequired } from '@/app/quotes/signature-actions'
import { SectionCard } from '../section-card'
import styles from './signature-section.module.css'

export type Signature = { kind: 'draw' | 'type'; name: string; data: string | null } | null
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
  const [settings, setSettings] = useState<{ kind: 'draw' | 'type'; name: string; data: string } | null>(null)

  const toggleRequired = (v: boolean) => {
    setRequired(v)
    void run('save the setting', async () => { const r = await setClientSignatureRequired(seed.quoteId, v); onSaved(r.updatedAt) })
  }
  const openSettings = (kind: 'draw' | 'type') => setSettings({ kind, name: sig?.name || seed.memberName, data: sig?.kind === 'draw' && sig.data ? sig.data : '' })
  const save = () => {
    const s = settings
    if (!s || !s.name.trim() || (s.kind === 'draw' && !s.data)) return
    setSettings(null)
    void run('save the signature', async () => {
      const r = await saveMemberSignature({ kind: s.kind, name: s.name.trim(), data: s.kind === 'draw' ? s.data : null })
      setSig(r)
    }, 'Signature saved')
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
              </div>
            ) : sig.kind === 'type' ? (
              <span className={styles.typed}>{sig.name}</span>
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
      <SignatureSettings open={!!settings} value={settings} onChange={setSettings} onClose={() => setSettings(null)} onSave={save} />
    </SectionCard>
  )
}

/**
 * Signature Settings (1239:31250 type · 1239:31336 draw · 1239:31396 typed · 1239:31478 drawn): Designer Name* (48), "Show
 * signature as" Draw / Type (radio rows), the 752×140 preview — the name in the signature face, or a drawing surface with
 * Clear — and Cancel · Save. Drawing is pointer-driven (a finger works) and stored as an SVG path on the box's 752×140.
 */
export function SignatureSettings({ open, value, onChange, onClose, onSave }: {
  open: boolean
  value: { kind: 'draw' | 'type'; name: string; data: string } | null
  onChange: (v: { kind: 'draw' | 'type'; name: string; data: string } | null) => void
  onClose: () => void
  onSave: () => void
}) {
  const v = value ?? { kind: 'type' as const, name: '', data: '' }
  const canSave = !!v.name.trim() && (v.kind === 'type' || !!v.data)
  return (
    <Dialog open={open} onClose={onClose} title="Signature Settings" size="modal" width={800}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={onSave} isDisabled={!canSave}>Save</Button></>}>
      <div className={styles.settings}>
      <TextField label="Designer Name" required value={v.name} onChange={(name) => onChange({ ...v, name })} autoFocus />
      {/* (sweep S1) the DS radio group — arrow keys walk it, as every other radio pair in the app */}
      <div className={styles.modeRow}>
        <span className={styles.modeLabel} id="sig-mode-label">Show signature as</span>
        <RadioGroup aria-labelledby="sig-mode-label" orientation="horizontal" value={v.kind} onChange={(k) => onChange({ ...v, kind: k === 'type' ? 'type' : 'draw' })}>
          <span className={styles.modeRadios}><Radio value="draw">Draw</Radio><Radio value="type">Type</Radio></span>
        </RadioGroup>
      </div>
      {/* (REG-633) the draw box is the shared pad (components/om/signature-pad.tsx) — the client's signing page draws on the same one */}
      {v.kind === 'type' ? (
        <div className={styles.preview} data-kind="type"><span className={styles.typed}>{v.name.trim() || 'Your name'}</span></div>
      ) : <SignaturePad value={v.data} onChange={(data) => onChange({ ...v, data })} />}
      </div>
    </Dialog>
  )
}
