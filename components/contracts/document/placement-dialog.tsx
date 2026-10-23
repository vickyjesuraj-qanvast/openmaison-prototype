'use client'

import { useState } from 'react'
import { Button, Radio, RadioGroup } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { placeWords, SIGN_FIELDS, signFieldsIn, signPlaces, type SignKey, type SignPlaceRow } from '@/lib/contracts/tokens'
import doc from './document.module.css'

const firstNotPlaced = (placed: SignKey[]): SignKey => (SIGN_FIELDS.find((f) => !placed.includes(f.key))?.key ?? 'client-signature')
const suggestedOf = (places: SignPlaceRow[]) => String((places.find((p) => p.suggested) ?? places[places.length - 1]!).place)

/**
 * Add a signature field (P-04, B-04 · B-05): on touch a field is placed by choosing WHICH (the four fields as chips, a placed one says so)
 * then WHERE — the document's clauses from the Outline ("After 11. Governing law and disputes" · "Under Signatures", picked for you when a
 * Signatures heading exists · "At the end") — and it lands as its own block after that clause, never at a thumb's caret. A bottom sheet on a
 * phone, a 400 dialog on a tablet (the house form size); the foot's one filled button is named after the pick: "Add under Signatures".
 */
export function PlacementDialog({ open, onClose, html, initialKey, hasStudioSignature, locked = false, nested = false, onAdd }: {
  open: boolean; onClose: () => void
  /** The paper as it stands — the places come from its headings, the "placed" marks from its fields. */
  html: string
  initialKey?: SignKey
  hasStudioSignature: boolean
  locked?: boolean
  /** Opened over an open sheet or drawer (the eSignatures panel): the lighter scrim, stacked above it. */
  nested?: boolean
  onAdd: (key: SignKey, place: SignPlaceRow) => void
}) {
  const placed = signFieldsIn(html)
  const places = signPlaces(html)
  const [key, setKey] = useState<SignKey>(initialKey ?? firstNotPlaced(placed))
  const [place, setPlace] = useState<string>(() => suggestedOf(places))
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // the render-phase adjust: each opening starts on the field that is missing and the place picked for you
    setWasOpen(open)
    if (open) { setKey(initialKey ?? firstNotPlaced(placed)); setPlace(suggestedOf(places)) }
  }
  const row = places.find((p) => String(p.place) === place) ?? places[places.length - 1]!
  const field = SIGN_FIELDS.find((f) => f.key === key) ?? SIGN_FIELDS[1]!
  const help = key === 'studio-signature' && !hasStudioSignature ? 'Set your signature up in a quote’s Signature section first — the box prints blank until then' : field.help
  return (
    <Dialog open={open} onClose={onClose} title="Add a signature field" size="form" width={400} portal nested={nested}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={() => onAdd(key, row)} isDisabled={locked} data-testid="place-add">{`Add ${placeWords(row)}`}</Button>
            </>}>
      <div className={doc.which}>
        <Chips label="Which field" value={key} onChange={(v) => setKey(v as SignKey)} testId="place-which"
               options={SIGN_FIELDS.map((f) => ({ value: f.key, label: placed.includes(f.key) ? `${f.label} · placed` : f.label }))} />
        <p className={doc.whichHelp}>{help}</p>
      </div>
      <div className={doc.whereHead} id="place-where">Where should it go?</div>
      <RadioGroup aria-labelledby="place-where" className={doc.places} value={place} onChange={setPlace}>
        {places.map((p) => (
          <Radio key={String(p.place)} value={String(p.place)} className={doc.place} data-testid="place-row">
            <span className={doc.placeName}>{p.label}</span>
            {p.suggested ? <span className={doc.placeMeta}>Suggested</span> : null}
          </Radio>
        ))}
      </RadioGroup>
    </Dialog>
  )
}
