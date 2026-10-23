'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { fieldPlaceWords, SIGN_FIELDS, signFieldsIn, type SignKey, type SignPlaceRow } from '@/lib/contracts/tokens'
import { PlacementDialog } from './placement-dialog'
import doc from './document.module.css'

/**
 * Signature fields (P-04 · B-12): the eSignatures sheet's first fold on touch — the four fields as rows, each "Placed under Signatures" or
 * "Not placed", and Add, which asks where (PlacementDialog). Data in, a choice out: the host applies the placement to its paper (the editor's
 * `insertSignFieldAt` when the paper is mounted; `insertSignFieldAfter` on its own state when it is not — the Contract screen's section
 * screen). The desk's drawer keeps its Insert-at-the-caret rows.
 */
export function SignatureFieldsPanel({ html, hasStudioSignature, locked = false, nested = false, onPlace }: {
  html: string
  hasStudioSignature: boolean
  locked?: boolean
  /** Inside an open sheet or drawer: the placement dialog stacks above it. */
  nested?: boolean
  onPlace: (key: SignKey, place: SignPlaceRow) => void
}) {
  const [adding, setAdding] = useState<SignKey | null>(null)
  const placed = signFieldsIn(html)
  return (
    <>
      <div className={doc.fields} data-testid="signature-fields">
        {SIGN_FIELDS.map((f) => {
          const on = placed.includes(f.key)
          const where = on ? fieldPlaceWords(html, f.key) : null
          const meta = on ? `Placed${where ? ` ${where}` : ''}` : f.key === 'studio-signature' && !hasStudioSignature ? 'Not placed · set your signature up in a quote’s Signature section first' : 'Not placed'
          return (
            <div key={f.key} className={doc.fieldRow} data-testid="esign-field" data-placed={on || undefined}>
              <span className={doc.fieldText}>
                <span className={doc.fieldLabel}>{f.label}</span>
                <span className={doc.fieldMeta} data-placed={on || undefined}>{on ? <Icon name="check" size={16} /> : null}{meta}</span>
              </span>
              <Button variant="secondary" appearance={on ? 'text' : 'outlined'} isDisabled={locked} onPress={() => setAdding(f.key)} data-testid="esign-add">{on ? 'Add another' : 'Add'}</Button>
            </div>
          )
        })}
      </div>
      <PlacementDialog open={adding !== null} onClose={() => setAdding(null)} html={html} initialKey={adding ?? undefined} hasStudioSignature={hasStudioSignature} locked={locked} nested={nested}
                       onAdd={(key, place) => { setAdding(null); onPlace(key, place) }} />
    </>
  )
}
