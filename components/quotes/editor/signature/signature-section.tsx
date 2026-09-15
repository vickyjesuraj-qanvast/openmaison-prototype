'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent, type PointerEvent } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
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
    <label className={styles.switchRow}>Client Signature Required <Switch size="sm" isSelected={required} onChange={toggleRequired} aria-label="Client Signature Required" /></label>
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
            <span className={styles.clientTitle}>Client signs online</span>
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
function SignatureSettings({ open, value, onChange, onClose, onSave }: {
  open: boolean
  value: { kind: 'draw' | 'type'; name: string; data: string } | null
  onChange: (v: { kind: 'draw' | 'type'; name: string; data: string } | null) => void
  onClose: () => void
  onSave: () => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const drawing = useRef(false)
  const v = value ?? { kind: 'type' as const, name: '', data: '' }
  const canSave = !!v.name.trim() && (v.kind === 'type' || !!v.data)
  const point = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 752, y = ((e.clientY - r.top) / r.height) * 140
    return `${Math.max(0, Math.min(752, x)).toFixed(1)} ${Math.max(0, Math.min(140, y)).toFixed(1)}`
  }
  const down = (e: ReactPointerEvent<SVGSVGElement>) => { drawing.current = true; svg.current?.setPointerCapture(e.pointerId); onChange({ ...v, data: `${v.data}${v.data ? ' ' : ''}M ${point(e)}` }) }
  const move = (e: ReactPointerEvent<SVGSVGElement>) => { if (!drawing.current) return; onChange({ ...v, data: `${v.data} L ${point(e)}` }) }
  const up = () => { drawing.current = false }
  return (
    <Dialog open={open} onClose={onClose} title="Signature Settings" size="modal" width={800}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={onSave} isDisabled={!canSave}>Save</Button></>}>
      <div className={styles.settings}>
      <TextField label="Designer Name" required value={v.name} onChange={(name) => onChange({ ...v, name })} autoFocus />
      <div className={styles.modeRow} role="radiogroup" aria-label="Show signature as">
        <span className={styles.modeLabel}>Show signature as</span>
        {(['draw', 'type'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={v.kind === k} className={styles.radio} onClick={() => onChange({ ...v, kind: k })}>
            <span className={styles.radioIcon} data-on={v.kind === k || undefined}><Icon name={v.kind === k ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} family="outlined" /></span>{k === 'draw' ? 'Draw' : 'Type'}
          </button>
        ))}
      </div>
      <div className={styles.preview} data-kind={v.kind}>
        {v.kind === 'type' ? (
          <span className={styles.typed}>{v.name.trim() || 'Your name'}</span>
        ) : (
          <>
            <svg ref={svg} className={styles.canvas} viewBox="0 0 752 140" preserveAspectRatio="none" role="img" aria-label="Draw your signature"
                 onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
              {v.data ? <path d={v.data} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </svg>
            <button type="button" className={styles.clear} onClick={() => onChange({ ...v, data: '' })} disabled={!v.data}>Clear</button>
          </>
        )}
      </div>
      </div>
    </Dialog>
  )
}
