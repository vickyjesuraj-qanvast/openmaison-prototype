'use client'

import { useMemo, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { PASTE_FIELDS, PASTE_FIELD_LABEL, guessColumns, guessHeader, parseBlock, toLines, type PasteField, type PasteLine } from '@/lib/quotes/clipboard'
import styles from './paste-items-dialog.module.css'

const PREVIEW_ROWS = 6
const labelToField = (label: string): PasteField => PASTE_FIELDS.find((f) => PASTE_FIELD_LABEL[f] === label) ?? 'skip'
const colLetter = (c: number) => String.fromCharCode(65 + (c % 26))

/**
 * Paste from a spreadsheet (REG-476, no mock — the Excel benchmark's phase 2): a block copied from Excel lands here first.
 * Each column of the block picks the field it becomes (the header row's names are read for a first guess; without one the
 * shapes of the values are), the first rows preview under the picks, and "Add n items" writes the lines in one go —
 * after the row the paste landed on, or at the end. The L 800 modal shell (REG-418), size "modal".
 */
export function PasteItemsDialog({ open, text, anchor, onClose, onAdd }: {
  open: boolean
  text: string
  /** The row the paste landed on (null = the Add Item field / nowhere in particular). */
  anchor: { id: string; name: string } | null
  onClose: () => void
  onAdd: (lines: PasteLine[], place: 'after' | 'end') => void
}) {
  const rows = useMemo(() => parseBlock(text), [text])
  const width = rows[0]?.length ?? 0
  const guess = useMemo(() => { const h = guessHeader(rows); return { header: h !== null, map: h ?? guessColumns(rows) } }, [rows])
  const [seen, setSeen] = useState(text)
  const [header, setHeader] = useState(guess.header)
  const [map, setMap] = useState<PasteField[]>(guess.map)
  const [place, setPlace] = useState<'after' | 'end'>('after')
  // Render-phase adjust: a new block starts from its own guess (the dialog stays mounted between pastes).
  if (seen !== text) { setSeen(text); setHeader(guess.header); setMap(guess.map); setPlace('after') }
  const lines = useMemo(() => toLines(rows, map, header), [rows, map, header])
  const named = map.includes('name')
  const body = rows.slice(header ? 1 : 0)
  const preview = body.slice(0, PREVIEW_ROWS)
  const placeOptions = anchor ? [`After “${anchor.name}”`, 'At the end'] : ['At the end']
  const add = () => { if (named && lines.length) onAdd(lines, anchor && place === 'after' ? 'after' : 'end') }

  return (
    <Dialog open={open} onClose={onClose} title="Paste from a spreadsheet" width={800} size="modal"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={add} isDisabled={!named || lines.length === 0}>{lines.length === 1 ? 'Add 1 item' : `Add ${lines.length} items`}</Button>
            </>}>
      <div className={styles.top}>
        <p className={styles.caption}>{rows.length} {rows.length === 1 ? 'row' : 'rows'} · {width} {width === 1 ? 'column' : 'columns'} from the clipboard. Pick what each column becomes.</p>
        <label className={styles.header}><Checkbox isSelected={header} onChange={(on: boolean) => setHeader(on)} aria-label="First row is a header" /><span>First row is a header</span></label>
      </div>
      <div className={styles.sheet} role="table" aria-label="Pasted rows">
        <div className={styles.head} role="row">
          {map.map((f, c) => (
            <div key={c} className={styles.pick} role="columnheader">
              <TextField label={header ? rows[0]?.[c] || `Column ${colLetter(c)}` : `Column ${colLetter(c)}`} size="s" mode="select" options={PASTE_FIELDS.map((k) => PASTE_FIELD_LABEL[k])}
                         value={PASTE_FIELD_LABEL[f]} onChange={(v) => setMap((m) => m.map((x, i) => (i === c ? labelToField(v) : x)))} />
            </div>
          ))}
        </div>
        {preview.map((r, ri) => (
          <div key={ri} className={styles.row} role="row">
            {r.map((v, c) => <div key={c} className={styles.cell} role="cell" data-skip={map[c] === 'skip' || undefined} title={v}>{v || '–'}</div>)}
          </div>
        ))}
      </div>
      <div className={styles.foot}>
        <span className={styles.more}>{body.length > PREVIEW_ROWS ? `+ ${body.length - PREVIEW_ROWS} more ${body.length - PREVIEW_ROWS === 1 ? 'row' : 'rows'}` : named ? '' : 'Map one column to Item to add these lines.'}</span>
        <div className={styles.place}>
          <TextField label="Add" size="s" mode="select" options={placeOptions} value={anchor && place === 'after' ? placeOptions[0]! : 'At the end'}
                     onChange={(v) => setPlace(v === 'At the end' ? 'end' : 'after')} />
        </div>
      </div>
    </Dialog>
  )
}
