'use client'

import { Switch, TextArea } from '@/components/ds'
import { DEFAULT_ACCEPT_LABEL } from '@/lib/contracts/policy'
import styles from '../editor/contract-editor.module.css'
import doc from './document.module.css'

export type SigningGates = { requiresScroll: boolean; requiresAccept: boolean; acceptLabel: string | null }

/**
 * Before the client signs (REG-633, contracts parity Q-15): 1.0's per-document gates — read to the end, tick your words (the words editable)
 * — for this contract, or for every contract a template starts. (Dane UAT 8.05) The words are written in the box, never a placeholder that
 * shows only once it is focused: switching Tick to accept on fills them with the default the signing page prints, and a document with none
 * says that default too; a two-line box, 160 at most, as the server keeps.
 * (contracts on the move, C-13) Each row is a `label`, as the Import dialog's switch row is: the whole row toggles, not the 36×20 track
 * alone — the desk to the pixel, and at ≤1024 the row stands 56 with the label 16 over its help 14. The eSignatures drawer and the Contract
 * screen's fold both draw this one piece.
 */
export function BeforeSigningPanel({ gates, onGates, uploaded = false, locked = false, bare = false }: {
  gates: SigningGates; onGates: (patch: Partial<SigningGates>) => void
  /** An uploaded PDF can be accepted, not scrolled. */
  uploaded?: boolean
  /** Signed: the gates stay as they were. */
  locked?: boolean
  /** (Contracts on the move, C4) On a screen whose bar already names it (the contract's and the template's "Before the client signs"
      screens): no eyebrow and no top rule — the rows on the screen's card (`doc.panelCard`). */
  bare?: boolean
}) {
  return (
    <div className={bare ? `${styles.gates} ${doc.gatesBare}` : styles.gates} data-testid="esign-gates">
      {bare ? null : <div className={styles.signEyebrow}>Before the client signs</div>}
      <label className={`${styles.autoRow} ${doc.gateRow}`} data-testid="gate-row">
        <span className={styles.autoText}><span className={`${styles.autoLabel} ${doc.gateLabel}`}>Read to the end</span><span className={`${styles.autoHelp} ${doc.gateHelp}`}>{uploaded ? 'A PDF can’t be scrolled on the signing page' : 'They reach the last line before they can go on'}</span></span>
        <Switch size="sm" isSelected={gates.requiresScroll && !uploaded} isDisabled={locked || uploaded} onChange={(v: boolean) => onGates({ requiresScroll: v })} aria-label="Read to the end" />
      </label>
      <label className={`${styles.autoRow} ${doc.gateRow}`} data-testid="gate-row">
        <span className={styles.autoText}><span className={`${styles.autoLabel} ${doc.gateLabel}`}>Tick to accept</span><span className={`${styles.autoHelp} ${doc.gateHelp}`}>They tick your words before they can go on</span></span>
        <Switch size="sm" isSelected={gates.requiresAccept} isDisabled={locked} aria-label="Tick to accept"
                onChange={(v: boolean) => onGates(v && !gates.acceptLabel?.trim() ? { requiresAccept: v, acceptLabel: DEFAULT_ACCEPT_LABEL } : { requiresAccept: v })} />
      </label>
      {gates.requiresAccept ? (
        <div className={styles.gateLabel} data-testid="esign-accept-words">
          <TextArea className={styles.gateWords} label="The words they tick" value={gates.acceptLabel ?? DEFAULT_ACCEPT_LABEL} maxLength={160} isDisabled={locked} onChange={(v: string) => onGates({ acceptLabel: v })} />
        </div>
      ) : null}
    </div>
  )
}
