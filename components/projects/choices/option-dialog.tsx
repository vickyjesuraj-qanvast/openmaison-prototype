'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog, FootStart } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { uploadablePicture } from '@/components/leads/files/upload-picture'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { addChoiceOption, editChoiceOption, loadChoiceSources } from '@/app/projects/choices-actions'
import { MSG } from '@/lib/forms'
import { filterByQuery } from '@/lib/search'
import {
  CHOICE_SOURCES, OPTION_DESC_MAX, OPTION_NAME_MAX, VENDOR_MAX, contractLine, normPrice, priceText,
  type ChoiceSource, type ChoiceSources, type ChoiceView, type OptionView, type SourceItem,
} from '@/lib/projects/choices-model'
import { OptionSquare } from './choice-card'
import styles from './choices.module.css'

type Sign = 'none' | 'add' | 'save'
const SIGNS: { value: Sign; label: string }[] = [{ value: 'none', label: 'No change' }, { value: 'add', label: 'Adds' }, { value: 'save', label: 'Saves' }]
const PICTURES = 'image/jpeg,image/png,image/webp,image/gif'

/**
 * (Projects round 8) Add an option to a choice — or change one. Adding starts where the option comes from (the card's Add an option ▾):
 * **From Materials** (Company › Materials' swatches), **From the Price book** (what this member may pick; an item with no photo shows the
 * material it is quoted as), **From a render** (the client's own design first, then the studio's), each a list with a search — one press
 * picks; **Upload a picture** is the house dropzone (sized to land, as the Files tab's uploads). Then the option itself: its picture beside
 * where it came from, its name and a line (taken from the source, changeable), and its price against the quote — No change · Adds · Saves
 * and the amount. The picture is kept in the lead's Files › Choices. The dialog closes only once its save lands.
 */
export function OptionDialog({ open, projectId, choice, source, editing, gstPct, onClose, onSaved }: {
  open: boolean
  projectId: string
  /** (REG-1068) The GST a pick's variation order adds on top of the price (0 = none) — the price is entered as a quote line's is. */
  gstPct: number
  choice: ChoiceView | null
  /** Adding: where it comes from. */
  source: ChoiceSource | null
  /** Editing: the option. */
  editing: OptionView | null
  onClose: () => void
  onSaved: (name: string, isNew: boolean) => void
}) {
  const snack = useSnackbar()
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  /* one read of the lists while the tab is open — Materials, the Price book and the renders change rarely meanwhile */
  const [loaded, setLoaded] = useState<{ projectId: string; data: ChoiceSources } | null>(null)
  const sources = loaded?.projectId === projectId ? loaded.data : null
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<SourceItem | null>(null)
  const [upload, setUpload] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [vendor, setVendor] = useState('')   // (gaps build D, item 11 — 1.0 F-139) who supplies it
  const [sign, setSign] = useState<Sign>('none')
  const [amount, setAmount] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  /* each opening starts afresh: an edit on its form, an add on its source's list (the render-phase adjust pattern) */
  const key = open ? (editing ? `edit:${editing.id}` : `add:${choice?.id}:${source}`) : null
  const [seen, setSeen] = useState<string | null>(null)
  if (key !== seen) {
    setSeen(key)
    if (key) {
      setQuery(''); setPicked(null); setUpload(null); setTried(false); setReading(false)
      const p = normPrice(editing?.priceMinor ?? null)
      setName(editing?.name ?? ''); setDesc(editing?.description ?? ''); setVendor(editing?.vendor ?? '')
      setSign(p == null ? 'none' : p > 0 ? 'add' : 'save'); setAmount(p == null ? '' : (Math.abs(p) / 100).toFixed(2))
      setStep(editing ? 'form' : 'pick')
    }
  }
  /* the lists, read when an add opens on a listed source */
  const listed = open && !editing && source && source !== 'upload'
  const have = !!sources
  useEffect(() => {
    if (!listed || have) return
    let live = true
    void loadChoiceSources(projectId).then((r) => {
      if (!live) return
      if ('error' in r) { snack({ message: couldnt('read the list', refusalOf(r.error)) }); return }
      setLoaded({ projectId, data: r })
    }).catch(() => { if (live) snack({ message: couldnt('read the list') }) })
    return () => { live = false }
  }, [listed, have, projectId, snack])

  const list = useMemo(() => (source && source !== 'upload' && sources ? sources[source] : []), [source, sources])
  const found = filterByQuery(list, query, (x) => ({ fields: [x.name, x.line ?? '', x.group ?? ''] }))
  const choose = (x: SourceItem) => {
    setPicked(x); setName(x.name.slice(0, OPTION_NAME_MAX)); setDesc(source === 'price_book' ? '' : (x.line ?? '').slice(0, OPTION_DESC_MAX)); setVendor((x.vendor ?? '').slice(0, VENDOR_MAX)); setStep('form')
  }
  const pickFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { snack({ message: 'Pick a picture — a JPEG, PNG or WebP' }); return }
    setReading(true)
    try {
      const img = await uploadablePicture(file)
      if (!img) { snack({ message: 'This picture didn’t read — pick it again' }); return }
      setUpload(img); setName(file.name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').slice(0, OPTION_NAME_MAX)); setStep('form')
    } finally { setReading(false) }
  }

  const minor = (() => { const n = Number(amount.replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : NaN })()
  const nameError = tried && !name.trim() ? MSG.required : undefined
  const amountError = tried && sign !== 'none' && !(minor > 0) ? MSG.amount : undefined
  const save = async () => {
    if (busy || !choice) return
    if (!name.trim() || (sign !== 'none' && !(minor > 0))) { setTried(true); return }
    const priceMinor = sign === 'none' ? null : sign === 'add' ? minor : -minor
    setBusy(true)
    try {
      const r = editing
        ? await editChoiceOption(editing.id, { name, description: desc, priceMinor, vendor })
        : await addChoiceOption(choice.id, { name, description: desc, priceMinor, source: source ?? 'upload', ref: picked?.key ?? null, picture: source === 'upload' ? upload : null, vendor })
      if ('error' in r) { snack({ message: couldnt(editing ? 'save the option' : 'add the option', refusalOf(r.error)) }); return }
      onSaved(name.trim(), !editing)
    } catch {
      snack({ message: couldnt(editing ? 'save the option' : 'add the option') })
    } finally {
      setBusy(false)
    }
  }

  const label = CHOICE_SOURCES.find((s) => s.key === source)?.label ?? 'Add an option'
  const square = editing ? editing : { src: source === 'upload' ? upload : picked?.src ?? null, hex: picked?.hex ?? null, source: source ?? 'upload' }
  const groups = source === 'render' ? [...new Set(found.map((x) => x.group ?? ''))] : ['']
  const title = editing ? 'Edit option' : step === 'pick' ? label : 'Add an option'
  const subtitle = choice ? (editing ? `On “${choice.title}”` : `To “${choice.title}”`) : undefined

  return (
    <Dialog open={open} onClose={onClose} closeOnScrim={false} size="form" width={600} title={title} subtitle={subtitle}
            footer={step === 'pick' ? <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button> : <>
              {editing ? null : <FootStart><Button appearance="text" iconStart={<Icon name="arrow_back" size={20} />} onPress={() => setStep('pick')} isDisabled={busy}>Back</Button></FootStart>}
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { void save() }} isDisabled={busy} data-testid="option-save">{busy ? 'Saving…' : editing ? 'Save changes' : 'Add option'}</Button>
            </>}>
      {step === 'pick' ? (
        source === 'upload' ? (
          <div className={styles.fields} data-testid="option-upload">
            <Dropzone title={<>Drop a picture here or <b>browse</b></>} helper="A JPEG, PNG or WebP — a photo of the sample, the supplier’s picture" accept={PICTURES} label="Upload a picture" onPick={(f) => { void pickFile(f) }} uploading={reading} />
          </div>
        ) : (
          <div className={styles.fields} data-testid="option-source-list">
            <TextField label={source === 'material' ? 'Search materials' : source === 'price_book' ? 'Search the Price book' : 'Search rooms and versions'} type="search" value={query} onChange={setQuery} trailingIcon="search" autoFocus />
            <div className={styles.sourceList} role="radiogroup" aria-label={label}>
              {!sources ? <div className={styles.sourceEmpty}>Loading…</div>
                : !list.length ? <div className={styles.sourceEmpty}>{source === 'material' ? 'Company › Materials has no materials yet.' : source === 'price_book' ? 'The Price book has no items yet.' : 'No renders yet — make one in the AI Visualizer, then pick it here.'}</div>
                : !found.length ? <div className={styles.sourceEmpty}>{`Nothing matches “${query.trim()}”.`}</div>
                : groups.map((g) => (
                  <div key={g || 'all'} role="presentation">
                    {g ? <div className={styles.sourceGroup}>{g}</div> : null}
                    {found.filter((x) => (x.group ?? '') === g).map((x) => (
                      <button key={x.key} type="button" role="radio" aria-checked={picked?.key === x.key} className={styles.sourceRow} onClick={() => choose(x)} data-testid="option-source-row">
                        <OptionSquare o={{ src: x.src, hex: x.hex, source: source ?? 'upload' }} className={styles.sourceThumb} />
                        <span className={styles.sourceText}><span className={styles.sourceName}>{x.name}</span>{x.line ? <span className={styles.sourceLine}>{x.line}</span> : null}</span>
                        <Icon name="chevron_right" size={20} />
                      </button>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        )
      ) : (
        <div className={styles.fields} data-testid="option-form">
          <div className={styles.picked}>
            <OptionSquare o={square} className={styles.pickedThumb} />
            <span className={styles.pickedText}>
              <span className={styles.pickedName}>{editing ? editing.name : picked?.name ?? 'Your picture'}</span>
              <span className={styles.pickedLine}>{editing ? `From ${CHOICE_SOURCES.find((s) => s.key === editing.source)?.label.replace(/^From |^Upload a picture$/, '') || 'an upload'}` : picked?.bookPrice ?? picked?.line ?? (source === 'upload' ? 'Kept in the lead’s Files › Choices' : null)}</span>
            </span>
          </div>
          <TextField label="Name" required value={name} onChange={setName} maxLength={OPTION_NAME_MAX} error={nameError} autoFocus helper="What the client reads under the picture" />
          <TextField label="A line about it" value={desc} onChange={setDesc} maxLength={OPTION_DESC_MAX} helper="Optional — the finish, the size" />
          <TextField label="Vendor" value={vendor} onChange={setVendor} maxLength={VENDOR_MAX} helper="Optional — who supplies it; it prints on the selection receipt" />
          <div className={styles.group2}>
            <span className={styles.eyebrow}>Price against the quote</span>
            <Chips label="Price against the quote" options={SIGNS} value={sign} onChange={(v) => setSign(v as Sign)} testId="option-sign" />
            {sign !== 'none' ? (
              <TextField label={sign === 'add' ? 'It adds (S$)' : 'It saves (S$)'} required numeric="money" value={amount} onChange={setAmount} error={amountError} trailingIcon={null}
                         helper={picked?.bookPrice ?? (gstPct > 0 ? 'Before GST, as a line on the quote' : 'As a line on the quote')} />
            ) : <p className={styles.help}>{`The client reads “Included in your quote”.${picked?.bookPrice ? ` ${picked.bookPrice}.` : ''}`}</p>}
            {sign !== 'none' && minor > 0 ? <p className={styles.help} data-testid="option-contract">{`The card shows ${priceText(sign === 'add' ? minor : -minor)}; a pick of it moves the contract by ${(contractLine(sign === 'add' ? minor : -minor, gstPct) ?? '').replace(/ (on|off) the contract/, '')}.`}</p> : null}
          </div>
        </div>
      )}
    </Dialog>
  )
}
