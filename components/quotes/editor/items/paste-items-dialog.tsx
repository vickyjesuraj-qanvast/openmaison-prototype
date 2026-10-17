'use client'

import { useMemo, useState } from 'react'
import { Button, Checkbox, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog, FootStart } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Tooltip } from '@/components/om/tooltip'
import { BOOK_PASTE_FIELDS, PASTE_FIELDS, PASTE_FIELD_LABEL, QUOTE_PASTE_FIELDS, guessColumns, guessHeader, parseBlock, toLines, type PasteField, type PasteLine } from '@/lib/quotes/clipboard'
import styles from './paste-items-dialog.module.css'
import { nameKey } from '@/lib/finance/model'   // (one-home N-16)

const PREVIEW_ROWS = 6
const isBookTarget = (t: string) => t === 'book'
/** (REG-653, price book parity Q-13) An import writes at most this many rows — said before the rows are read, and again when a file has more. */
export const IMPORT_LIMIT = 500
/* (sweep S5 #29) Importing into My Items, a column takes the book's own names (the item dialog's) — the quote grid's words are the mock's. */
const BOOK_LABEL: Partial<Record<PasteField, string>> = { unitPrice: 'Unit price', vendor: 'Vendor', link: 'Website link' }
const fieldLabel = (f: PasteField, book: boolean) => (book ? BOOK_LABEL[f] ?? PASTE_FIELD_LABEL[f] : PASTE_FIELD_LABEL[f])
const labelToField = (label: string, book: boolean): PasteField => PASTE_FIELDS.find((f) => fieldLabel(f, book) === label) ?? 'skip'
const colLetter = (c: number) => String.fromCharCode(65 + (c % 26))
export type BookMatch = 'update' | 'new' | 'skip'
/** (S44I, B6 · B7 — the team's sections prototype) Where the new lines go, said at the footer's start: the house chips (Above · Below, Above ·
    At the top of the section) or, from a section's foot, the one place it has. Shared by Paste lines and the Price book modal. */
export type PlaceControl = { kind: 'chips'; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void } | { kind: 'fixed'; label: string }
export function PlaceFoot({ place }: { place: PlaceControl }) {
  return (
    <FootStart>
      {place.kind === 'fixed' ? <span className={styles.placeFixed} data-testid="place-fixed">{place.label}</span>
        : <Chips label="Where they go" options={place.options} value={place.value} onChange={place.onChange} testId="place-chips" />}
    </FootStart>
  )
}
const MATCH_OPTIONS: { value: BookMatch; label: string }[] = [{ value: 'update', label: 'Update the price' }, { value: 'new', label: 'Add as new' }, { value: 'skip', label: 'Skip' }]
/** The same item in the book: the same name from the same vendor, whatever the case — (one-home N-16) the vendor by the directory's rule
    (case, spaces and "Pte Ltd" aside, F1's `nameKey`), as the import on the server matches it. */
export const bookKey = (name: string, vendor: string | null | undefined) => `${name.trim().toLowerCase()}|${nameKey(vendor ?? '')}`

/**
 * Paste from a spreadsheet (REG-476, no mock — the Excel benchmark's phase 2): a block copied from Excel lands here first.
 * Each column of the block picks the field it becomes (the header row's names are read for a first guess; without one the
 * shapes of the values are), the first rows preview under the picks, and "Add n items" writes the lines in one go —
 * after the row the paste landed on, or at the end. The L 800 modal shell (REG-418), size "modal".
 * (REG-653, price book parity Q-13) As My Items' import (`target="book"`): the rows come from a file or a paste, only the book's
 * fields are offered (Kind among them), each row is matched to an item by name and vendor — the preview says which rows match,
 * repeat an earlier row, or bring a new trade — and one choice answers every match: Update the price · Add as new · Skip.
 */
export function PasteItemsDialog({ open, text, grid, source, anchor, onClose, onBack, onAdd, target = 'quote', book = [], trades = [], vendor = null, bookKind, costs = true, typed = false, place, units }: {
  open: boolean
  /** (S44I, B7) Paste lines… from a row or a foot: a box to type or paste the lines into, read as it is typed. */
  typed?: boolean
  /** (S44I, B7) where the lines go when a row or a foot asked; absent, the clipboard paste's own After “X” · At the end */
  place?: PlaceControl
  /** (S44I — M9) the studio's units — a pasted unit takes the studio's spelling */
  units?: readonly string[]
  /** (pending modules S41b-1) the member sees costs — else Cost and Markup aren't offered: a sheet's cost column is read as its price
      (a lone price sits in the cost, as any price-only paste lands) and a markup column is left out */
  costs?: boolean
  text: string
  /** (REG-653) Rows read from a file — they win over `text` — and the file's name for the caption. */
  grid?: string[][] | null
  source?: string | null
  /** The row the paste landed on (null = the Add Item field / nowhere in particular). */
  anchor: { id: string; name: string } | null
  onClose: () => void
  /** (sweep S5 #6) The import's first step: Back returns to it with the file; Cancel, ✕ and Esc close the import. */
  onBack?: () => void
  onAdd: (lines: PasteLine[], place: 'after' | 'end', match?: BookMatch) => void
  /** (REG-594) `book` = Company › Price book's Import from a spreadsheet: the same mapping, the lines become My Items. */
  target?: 'quote' | 'book'
  /** (REG-653) The book's items (to match rows against), the studio's trades, and the vendor typed for rows without one.
      (Dane UAT 3.12) `status` 'proposed' = an item waiting for approval: a row that matches it is skipped, never imported. */
  book?: { name: string; vendor: string | null; status?: string }[]
  trades?: string[]
  vendor?: string | null
  /** (UX audit S7) The book's import asks, where the columns are mapped, what Kind a row without one takes — its select sits where a quote's
      paste asks where the lines go. */
  bookKind?: { label: string; options: string[]; value: string; onChange: (v: string) => void }
}) {
  const [draft, setDraft] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft('') }   // every opening starts with an empty box (render-phase adjust)
  const rows = useMemo(() => (typed ? parseBlock(draft) : grid && grid.length ? grid.map((r) => r.map((c) => (c ?? '').toString().trim())) : parseBlock(text)), [grid, text, typed, draft])
  const fields = useMemo(() => (target === 'book' ? BOOK_PASTE_FIELDS : QUOTE_PASTE_FIELDS).filter((f) => costs || (f !== 'cost' && f !== 'markup')), [target, costs])
  const width = rows[0]?.length ?? 0
  /* (pending modules S41b-1) without costs a guessed Cost column is the price (unless a Unit Price column is there too) and a Markup column is skipped */
  const guess = useMemo(() => { const h = guessHeader(rows); const raw = h ?? guessColumns(rows, units); const priced = raw.includes('unitPrice'); const map = costs ? raw : raw.map((f) => (f === 'cost' ? (priced ? 'skip' : 'unitPrice') : f === 'markup' ? 'skip' : f)); return { header: h !== null, map: map.map((f) => ((fields as readonly string[]).includes(f) ? f : 'skip')) } }, [rows, fields, costs, units])
  const seenKey = `${source ?? ''}\u0000${grid ? grid.length : text}\u0000${typed ? width : ''}`
  const [seen, setSeen] = useState(seenKey)
  const [header, setHeader] = useState(guess.header)
  const [map, setMap] = useState<PasteField[]>(guess.map)
  const [placeKey, setPlace] = useState<'after' | 'end'>('after')
  const [match, setMatch] = useState<BookMatch>('update')
  // Render-phase adjust: a new block starts from its own guess (the dialog stays mounted between pastes).
  if (seen !== seenKey) { setSeen(seenKey); setHeader(guess.header); setMap(guess.map); setPlace('after'); setMatch('update') }
  const all = useMemo(() => toLines(rows, map, header, units), [rows, map, header, units])
  const named = map.includes('name')
  const body = rows.slice(header ? 1 : 0)
  const preview = body.slice(0, PREVIEW_ROWS)
  /* (S44I, B7) the clipboard paste's two places, as the house chips at the footer's start (the row's own place when a row asked) */
  const clipPlace: PlaceControl | undefined = !place && !isBookTarget(target) && anchor ? { kind: 'chips', options: [{ value: 'after', label: `After “${anchor.name}”` }, { value: 'end', label: 'At the end' }], value: placeKey, onChange: (v) => setPlace(v === 'end' ? 'end' : 'after') } : undefined

  /* (REG-653, Q-13) The book's reading of the rows: capped, each a new item, a match, or a repeat of an earlier row. */
  const isBook = target === 'book'
  const lines = isBook ? all.slice(0, IMPORT_LIMIT) : all
  const shelf = useMemo(() => new Set(book.filter((b) => b.status !== 'proposed').map((b) => bookKey(b.name, b.vendor))), [book])
  const waitingShelf = useMemo(() => new Set(book.filter((b) => b.status === 'proposed').map((b) => bookKey(b.name, b.vendor))), [book])
  const rowState = (l: PasteLine, seenKeys: Set<string>): 'new' | 'match' | 'repeat' | 'waiting' => { const k = bookKey(l.name, l.vendor || vendor); if (seenKeys.has(k)) return 'repeat'; seenKeys.add(k); return shelf.has(k) ? 'match' : waitingShelf.has(k) ? 'waiting' : 'new' }
  const states = useMemo(() => { const s = new Set<string>(); return lines.map((l) => rowState(l, s)) }, [lines, shelf, waitingShelf, vendor])   // eslint-disable-line react-hooks/exhaustive-deps
  const matches = states.filter((x) => x === 'match').length
  const repeats = states.filter((x) => x === 'repeat').length
  const waiting = states.filter((x) => x === 'waiting').length
  const newTrades = useMemo(() => [...new Map(lines.map((l) => l.category?.trim()).filter((c): c is string => !!c && !trades.some((t) => t.toLowerCase() === c.toLowerCase())).map((c) => [c.toLowerCase(), c] as const)).values()], [lines, trades])
  const writes = states.filter((x) => x === 'new').length + (match === 'skip' ? 0 : matches)
  /* (Dane UAT 3.12) Rows to read, and none would write: the import says so and its button closes it ("Import 0 rows" waited, disabled) */
  const nothingNew = isBook && named && lines.length > 0 && writes === 0
  /* the preview's own reading: a row's state, as the lines are counted (a blank row is no line) */
  const previewStates = useMemo(() => { const s = new Set<string>(); const out: ('new' | 'match' | 'repeat' | 'waiting' | null)[] = []; for (const r of body.slice(0, PREVIEW_ROWS)) { const l = toLines([r], map, false)[0]; out.push(l ? rowState(l, s) : null) } return out }, [body, map, shelf, waitingShelf, vendor])   // eslint-disable-line react-hooks/exhaustive-deps
  const STATE_WORD = { new: 'New', match: match === 'update' ? 'Updates its price' : match === 'new' ? 'Added again' : 'Skipped', repeat: 'Repeats — skipped', waiting: 'Waiting for approval — skipped' } as const

  const add = () => { if (named && lines.length && (!isBook || writes > 0)) onAdd(lines, anchor && placeKey === 'after' ? 'after' : 'end', isBook ? match : undefined) }

  return (
    <Dialog open={open} onClose={onClose} title={isBook ? 'Import into My Items' : typed ? 'Paste lines' : 'Paste from a spreadsheet'} width={800} size="modal"
            footer={<>
              {place ? <PlaceFoot place={place} /> : clipPlace ? <PlaceFoot place={clipPlace} /> : null}
              {onBack ? <><Button variant="secondary" appearance="outlined" iconStart={<Icon name="arrow_back" size={20} />} onPress={onBack}>Back</Button><span style={{ flex: 1 }} /></> : null}
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              {nothingNew ? <Button onPress={onClose} data-testid="import-done">Done</Button>
                : <Button onPress={add} isDisabled={!named || lines.length === 0 || (isBook && writes === 0)}>{isBook ? (writes === 1 ? 'Import 1 row' : `Import ${writes} rows`) : all.length === 1 ? 'Add 1 item' : `Add ${all.length} items`}</Button>}
            </>}>
      {typed ? (
        /* (S44I, B7 — the team's sections prototype) type the lines, or paste a list or a sheet's rows — each line becomes an item, read as it is typed */
        <div className={styles.typed} data-testid="paste-lines-box">
          <TextArea label="Lines: one item per line; columns from a spreadsheet keep their order" value={draft} onChange={(v: string) => setDraft(v.slice(0, 50_000))} autoFocus
                    placeholder={'Hacking of wall tiles\t1\tLot\t1200\nCement screeding\t40\tsqft\t3.5'} />
        </div>
      ) : null}
      {typed && !rows.length ? null : <>
      <div className={styles.top}>
        {/* (Dane UAT 3.12) the book's import counts its items — the rows under the header, not the header line */}
        <p className={styles.caption}>{isBook ? `${body.length} ${body.length === 1 ? 'item' : 'items'}` : `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`} · {width} {width === 1 ? 'column' : 'columns'} from {source ? `“${source}”` : typed ? 'the box' : 'the clipboard'}. Pick what each column becomes.</p>
        <label className={styles.header}><Checkbox isSelected={header} onChange={(on: boolean) => setHeader(on)} aria-label="First row is a header" /><span>First row is a header</span></label>
      </div>
      <div className={styles.sheet} role="table" aria-label={isBook ? 'Rows to import' : 'Pasted rows'}>
        <div className={styles.head} role="row">
          {/* (sweep S5 #8) what each row does to the book leads the row — last, it sat off-screen past seven columns */}
          {isBook ? <div className={`${styles.pick} ${styles.stateHead}`} role="columnheader">In My Items</div> : null}
          {map.map((f, c) => (
            <div key={c} className={styles.pick} role="columnheader">
              <TextField label={header ? rows[0]?.[c] || `Column ${colLetter(c)}` : `Column ${colLetter(c)}`} size="s" mode="select" options={fields.map((k) => fieldLabel(k, isBook))}
                         value={fieldLabel(f, isBook)} onChange={(v) => setMap((m) => m.map((x, i) => (i === c ? labelToField(v, isBook) : x)))} />
            </div>
          ))}
        </div>
        {preview.map((r, ri) => (
          <div key={ri} className={styles.row} role="row" data-testid="import-row">
            {/* (Dane UAT 3.12) a state cut by its column ("Waiting for approval — skipped") reads whole on hover — the house whenCut tooltip */}
            {isBook ? <Tooltip label={previewStates[ri] ? STATE_WORD[previewStates[ri]!] : '--'} whenCut><div className={`${styles.cell} ${styles.state}`} role="cell" data-state={previewStates[ri] ?? undefined}>{previewStates[ri] ? STATE_WORD[previewStates[ri]!] : '--'}</div></Tooltip> : null}
            {r.map((v, c) => <div key={c} className={styles.cell} role="cell" data-skip={map[c] === 'skip' || undefined} title={v}>{v || '--'}</div>)}   {/* (sweep S5 #33) "--", REG-228 */}
          </div>
        ))}
      </div>
      <div className={styles.foot}>
        <span className={styles.more}>{body.length > PREVIEW_ROWS ? `+ ${body.length - PREVIEW_ROWS} more ${body.length - PREVIEW_ROWS === 1 ? 'row' : 'rows'}` : named ? '' : `Map one column to Item to ${isBook ? 'import these rows' : 'add these lines'}.`}</span>
        {isBook && bookKind ? <div className={styles.place} data-testid="import-kind"><TextField label={bookKind.label} size="s" mode="select" options={bookKind.options} value={bookKind.value} onChange={bookKind.onChange} /></div> : null}
      </div>
      </>}
      {isBook && named ? (
        <div className={styles.notes} data-testid="import-notes">
          {matches ? (
            <div className={styles.note}>
              <span>{matches === 1 ? '1 row matches an item' : `${matches} rows match items`} already in My Items — the same name from the same vendor.</span>
              <Chips label="Rows that match" options={MATCH_OPTIONS} value={match} onChange={(v) => setMatch(v as BookMatch)} testId="import-match" />
            </div>
          ) : null}
          {repeats ? <span className={styles.note}>{repeats === 1 ? '1 row repeats' : `${repeats} rows repeat`} an item earlier in the file — only the first is imported.</span> : null}
          {waiting ? <span className={styles.note} data-testid="import-waiting">{waiting === 1 ? '1 row matches an item' : `${waiting} rows match items`} waiting for approval — skipped until an Owner or an Admin approves {waiting === 1 ? 'it' : 'them'}.</span> : null}
          {nothingNew ? <span className={styles.note} role="status" data-testid="import-nothing-new">Nothing new to import — every row is already in My Items or waiting for approval</span> : null}
          {newTrades.length ? <span className={styles.note}>New {newTrades.length === 1 ? 'trade' : 'trades'} for Settings › Quotes & pricing: {newTrades.join(', ')}.</span> : null}
          {all.length > IMPORT_LIMIT ? <span className={styles.note} data-tone="warn">Only the first {IMPORT_LIMIT} rows are imported — the file has {all.length}.</span> : null}
        </div>
      ) : null}
    </Dialog>
  )
}
