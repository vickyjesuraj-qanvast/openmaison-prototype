'use client'

import { Button, Switch } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { TextField } from '@/components/om/text-field'
import { SIGN_FIELDS, signField, type SignKey } from '@/lib/contracts/tokens'
import { DEFAULT_ACCEPT_LABEL } from '@/lib/contracts/policy'
import styles from './contract-editor.module.css'

export type SigningGates = { requiresScroll: boolean; requiresAccept: boolean; acceptLabel: string | null }

/**
 * eSignatures (the reference's right panel, "Fillable Fields"): the four fields with Insert — each drops a signature box
 * into the document at the caret. On the signing page the studio's box prints your saved signature and the client's is
 * where they sign; initials print as small boxes. (REG-633, contracts parity Q-15) Then "Before the client signs": 1.0's per-document
 * gates — read to the end, tick your words (the words editable) — for this contract, or for every contract a template starts.
 */
export function ESignPanel({ open, onClose, onInsert, hasStudioSignature, gates, onGates, uploaded = false, locked = false }: {
  open: boolean; onClose: () => void; onInsert: (html: string) => void; hasStudioSignature: boolean
  gates?: SigningGates; onGates?: (patch: Partial<SigningGates>) => void
  /** An uploaded PDF can be accepted, not scrolled. */
  uploaded?: boolean
  /** Signed: the gates stay as they were. */
  locked?: boolean
}) {
  return (
    <Drawer open={open} onClose={onClose} title="eSignatures" label="eSignatures" width={400}>
      <div className={styles.signEyebrow}>Fillable fields</div>
      <div className={styles.signRows}>
        {SIGN_FIELDS.map((f) => (
          <div key={f.key} className={styles.signRow} data-testid="esign-field">
            <span className={styles.signText}>
              <span className={styles.signLabel}>{f.label}</span>
              <span className={styles.signHelp}>{f.key === 'studio-signature' && !hasStudioSignature ? 'Set your signature up in a quote’s Signature section first' : f.help}</span>
            </span>
            <Button variant="secondary" appearance="outlined" isDisabled={locked} onPress={() => onInsert(signField(f.key as SignKey))}>Insert</Button>
          </div>
        ))}
      </div>
      <p className={styles.signNote}>Place the fields where the parties sign. The client’s field is where they sign online once you send the link.</p>
      {gates && onGates ? (
        <div className={styles.gates} data-testid="esign-gates">
          <div className={styles.signEyebrow}>Before the client signs</div>
          <div className={styles.autoRow}>
            <span className={styles.autoText}><span className={styles.autoLabel}>Read to the end</span><span className={styles.autoHelp}>{uploaded ? 'A PDF can’t be scrolled on the signing page' : 'They reach the last line before they can go on'}</span></span>
            <Switch size="sm" isSelected={gates.requiresScroll && !uploaded} isDisabled={locked || uploaded} onChange={(v: boolean) => onGates({ requiresScroll: v })} aria-label="Read to the end" />
          </div>
          <div className={styles.autoRow}>
            <span className={styles.autoText}><span className={styles.autoLabel}>Tick to accept</span><span className={styles.autoHelp}>They tick your words before they can go on</span></span>
            <Switch size="sm" isSelected={gates.requiresAccept} isDisabled={locked} onChange={(v: boolean) => onGates({ requiresAccept: v })} aria-label="Tick to accept" />
          </div>
          {gates.requiresAccept ? (
            <div className={styles.gateLabel}>
              <TextField label="The words they tick" value={gates.acceptLabel ?? ''} placeholder={DEFAULT_ACCEPT_LABEL} maxLength={160} disabled={locked} onChange={(v) => onGates({ acceptLabel: v })} />
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}
