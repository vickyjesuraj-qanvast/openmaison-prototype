'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { saveOptionToCatalogue } from '@/app/projects/choices-actions'
import { MSG } from '@/lib/forms'
import { OPTION_NAME_MAX, normPrice, type OptionView } from '@/lib/projects/choices-model'
import { UNITS } from '@/lib/quotes/items-model'
import { GENERIC_CATEGORIES } from '@/lib/visualizer/catalogue'
import { OptionSquare } from './choice-card'
import styles from './choices.module.css'

const NO_CATEGORY = 'No category'
/** A first guess at a material's kind from the option's and the choice's words — the studio changes it in the box. */
function guessKind(words: string): string {
  const w = words.toLowerCase()
  const hit: [RegExp, string][] = [[/paint|colour|color/, 'Paints'], [/counter|worktop|quartz|granite/, 'Countertops'], [/tile/, 'Tiles'], [/floor|vinyl|parquet|spc/, 'Flooring'],
    [/laminate|veneer/, 'Laminates'], [/wallpaper/, 'Wallpapers'], [/fabric|curtain|upholster/, 'Fabrics'], [/metal|steel|brass|handle/, 'Metals'], [/glass|mirror/, 'Glass'], [/stone|marble/, 'Stone']]
  return hit.find(([re]) => re.test(w))?.[1] ?? 'Paints'
}

/**
 * (gaps build D, item 11 — 1.0 F-140 · F-147) Save an option the studio made for a choice (an upload, a render) to **Company › Materials** or
 * **the Price book**, so the next project can pick it. A short form dialog (a bottom sheet on a phone): the option's square and its name,
 * then what the catalogue needs that the option doesn't carry — a material's kind; an item's category (the studio's trades), unit, cost and
 * markup (the option's price against the quote starts the cost). Its words, vendor and picture travel as they are. It closes only once the
 * save lands; the snackbar opens the new entry.
 */
export function SaveOptionDialog({ open, option, to, choiceTitle, trades, units = UNITS, onClose, onSaved, costs = true }: {
  /** (S44I — M9) the studio's units */ units?: readonly string[]
  /** (pending modules S41b-1) the member sees costs — else one Unit price box (the option's price to start) */
  costs?: boolean
  open: boolean
  option: OptionView | null
  to: 'materials' | 'price_book'
  choiceTitle: string
  trades: string[]
  onClose: () => void
  onSaved: (r: { id: string; to: 'materials' | 'price_book'; proposed: boolean; name: string }) => void
}) {
  const snack = useSnackbar()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('Paints')
  const [category, setCategory] = useState(NO_CATEGORY)
  const [unit, setUnit] = useState('Lot')
  const [cost, setCost] = useState('')
  const [markup, setMarkup] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const key = open && option ? `${option.id}:${to}` : null
  const [seen, setSeen] = useState<string | null>(null)
  if (key !== seen) {
    setSeen(key)
    if (key && option) {
      const p = normPrice(option.priceMinor)
      setName(option.name); setKind(guessKind(`${option.name} ${option.description ?? ''} ${choiceTitle}`)); setCategory(NO_CATEGORY); setUnit('Lot')
      setCost(p && p > 0 ? (p / 100).toFixed(2) : ''); setMarkup(''); setTried(false)
    }
  }
  const toMinor = (v: string) => { const n = Number(v.replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
  const nameError = tried && !name.trim() ? MSG.required : undefined
  const save = async () => {
    if (!option || busy) return
    if (!name.trim()) { setTried(true); return }
    setBusy(true)
    try {
      const r = await saveOptionToCatalogue(option.id, to === 'materials'
        ? { to, name, category: kind }
        : { to, name, category: category === NO_CATEGORY ? null : category, unit, costMinor: toMinor(cost), markupMinor: toMinor(markup) })
      if ('error' in r) { snack({ message: couldnt(to === 'materials' ? 'save it to Materials' : 'save it to the Price book', refusalOf(r.error)) }); return }
      onSaved({ ...r, name: name.trim() })
    } catch {
      snack({ message: couldnt(to === 'materials' ? 'save it to Materials' : 'save it to the Price book') })
    } finally { setBusy(false) }
  }
  const book = to === 'price_book'
  return (
    <Dialog open={open} onClose={onClose} closeOnScrim={false} size="form" width={600} title={book ? 'Save to the Price book' : 'Save to Materials'}
            subtitle={book ? 'It joins My Items: its words, vendor and picture as they are. The next quote can pick it.' : 'It joins Company › Materials with its picture — the next choice and the AI Visualizer can pick it.'}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { void save() }} isDisabled={busy} data-testid="save-option">{busy ? 'Saving…' : 'Save'}</Button>
            </>}>
      {option ? (
        <div className={styles.fields} data-testid="save-option-dialog">
          <div className={styles.picked}>
            <OptionSquare o={option} className={styles.pickedThumb} />
            <span className={styles.pickedText}>
              <span className={styles.pickedName}>{option.name}</span>
              <span className={styles.pickedLine}>{[option.description, option.vendor ? `From ${option.vendor}` : null].filter(Boolean).join(' · ') || `On “${choiceTitle}”`}</span>
            </span>
          </div>
          <TextField label="Name" required value={name} onChange={setName} maxLength={OPTION_NAME_MAX} error={nameError} autoFocus />
          {book ? (
            <>
              <div className={styles.row2}>
                <TextField label="Category" mode="select" options={[NO_CATEGORY, ...trades]} value={category} onChange={setCategory} helper="One of the studio’s trades" />
                <TextField label="Unit" mode="select" options={[...units]} value={unit} onChange={setUnit} searchable={units.length > 8} />
              </div>
              {costs ? (
                <div className={styles.row2}>
                  <TextField label="Cost (S$)" numeric="money" value={cost} onChange={setCost} trailingIcon={null} helper="What the studio pays — never printed" />
                  <TextField label="Markup (S$)" numeric="money" value={markup} onChange={setMarkup} trailingIcon={null} helper="The unit price is the two together" />
                </div>
              ) : (
                <div className={styles.row2}>
                  <TextField label="Unit price (S$)" numeric="money" value={cost} onChange={setCost} trailingIcon={null} helper="The option’s price to start — what a quote line starts at" />
                </div>
              )}
            </>
          ) : (
            <TextField label="Kind of material" mode="select" options={[...GENERIC_CATEGORIES]} value={kind} onChange={setKind} helper="Where it sits in Company › Materials" />
          )}
        </div>
      ) : null}
    </Dialog>
  )
}
