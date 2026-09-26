'use client'

import { useMemo, useRef, useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { ReadOnlyScope } from '@/components/om/read-only'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { hexOf, hexTyped } from '@/lib/format'
import { GENERIC_CATEGORIES } from '@/lib/visualizer/catalogue'
import { PHOTO_ACCEPT } from '@/lib/visualizer/policy'
import { dominantColour } from '@/lib/visualizer/engine/palette'
import { loadImg } from '@/lib/visualizer/engine/run'
import type { MaterialRow } from '@/lib/visualizer/queries'
import type { MaterialInput } from '@/app/company/materials-actions'
import { bookLabels, type BookItem } from './book-labels'
import styles from './materials.module.css'

const FINISHES = [{ value: 'matte', label: 'Matte' }, { value: 'satin', label: 'Satin' }, { value: 'gloss', label: 'Gloss' }, { value: 'textured', label: 'Textured' }, { value: 'natural', label: 'Natural grain' }]
const NOT_LINKED = 'Not linked'
/** (F122) The server's limit, shown while typing rather than cut on save. */
const NAME_MAX = 60
const designs = (n: number) => `${n} ${n === 1 ? 'design' : 'designs'}`
/** (wave E, gallery-1) Where the studio's designs already carry it — said while editing, not only once someone starts to delete it; what a
    change reaches (renders keep it as they were made; a waiting pick takes the change at its Generate). */
function usedLine(m: MaterialRow, readOnly: boolean): string | undefined {
  const r = m.renderedIn, w = m.waitingIn
  if (!r && !w) return undefined
  const where = r ? `Used in ${designs(r)}${w ? `, and picked in ${w} more` : ''}.` : `Picked in ${designs(w)}, not rendered yet.`
  if (readOnly) return where
  return `${where} ${r ? 'Renders already made keep it as it was; a change here reaches the next Generate.' : 'A change here reaches its first render.'}`
}
/**
 * A studio material (REG-677, Q-18; 1.0's CustomMaterialUploadDialog, B-65, now with the library's own page): the swatch photo — its
 * colour read from it, as the render uses it (Q-20) — or a colour alone; name, category, finish; a line for the team; and the Price book
 * item it is quoted as (Add to quote, Q-17). Read-only for a member who didn't add it (the line says why).
 */
export function MaterialDialog({ open, material, onClose, onSave, bookItems, readOnly }: {
  open: boolean; material: MaterialRow | null; onClose: () => void
  onSave: (input: MaterialInput) => Promise<boolean>
  bookItems: BookItem[]
  readOnly: string | null
}) {
  const snack = useSnackbar()
  const file = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [cat, setCat] = useState('Paints')
  const [finish, setFinish] = useState('matte')
  const [hex, setHex] = useState('#BFBFBF')
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const [hexLeft, setHexLeft] = useState(false)   // the colour's error waits for the blur or a save, then clears live
  const [photo, setPhoto] = useState<string | null | undefined>(undefined)   // undefined = as it is · null = removed · a data URL = new
  const [desc, setDesc] = useState('')
  const [book, setBook] = useState(NOT_LINKED)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const labels = useMemo(() => bookLabels(bookItems), [bookItems])
  const [was, setWas] = useState<{ open: boolean; id: string | null }>({ open, id: material?.id ?? null })
  if (open !== was.open || (material?.id ?? null) !== was.id) {
    setWas({ open, id: material?.id ?? null })
    if (open) {
      setName(material?.name ?? ''); setCat(material?.category ?? 'Paints'); setFinish(material?.finish ?? 'matte'); setHex(material?.hex ?? '#BFBFBF'); setHexDraft(null); setHexLeft(false)
      setPhoto(undefined); setDesc(material?.description ?? ''); setTried(false); setBusy(false)
      setBook((material?.priceBookItemId ? labels.toLabel.get(material.priceBookItemId) : null) ?? NOT_LINKED)
    }
  }
  const shown = photo === undefined ? material?.imageUrl ?? null : photo
  const pick = async (f: File) => {
    if (!PHOTO_ACCEPT.split(',').includes(f.type)) { snack({ message: 'We can read JPG, PNG and WebP photos' }); return }
    try { const url = await readFileAsDataUrl(f, 512); setPhoto(url); setHex(dominantColour(await loadImg(url))); setHexDraft(null); if (!name.trim()) setName(f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 40)) }
    catch { snack({ message: 'Couldn’t read that photo — please try another' }) }
  }
  /* (F121) the colour as typed: six digits commit at once; three (#9DB) wait for the blur so the swatch doesn't jump mid-word; an
     unfinished value stays in the field with its error — never quietly put back — and Save waits for it */
  const typeHex = (v: string) => { const t = hexTyped(v); const h = hexOf(t); if (h && t.replace('#', '').length === 6) { setHex(h); setHexDraft(null) } else setHexDraft(t) }
  const blurHex = () => { setHexLeft(true); if (hexDraft === null) return; const h = hexOf(hexDraft); if (h) { setHex(h); setHexDraft(null) } else if (!hexDraft.replace('#', '')) setHexDraft(null) }
  const hexBad = hexDraft !== null && !hexOf(hexDraft)
  const save = async () => {
    setTried(true)
    if (!name.trim() || hexBad) return
    setBusy(true)
    const colour = hexDraft !== null ? hexOf(hexDraft) ?? hex : hex
    const ok = await onSave({ name: name.trim(), category: cat, hex: colour, finish, imageUrl: photo, description: desc.trim() || null, priceBookItemId: labels.toId.get(book) ?? null })
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={material ? (readOnly ? material.name : 'Edit material') : 'New material'} size="modal" width={600}
            subtitle={material ? usedLine(material, !!readOnly) : 'A finish the whole team can pick in the AI Visualizer — a swatch photo, or just its colour.'}
            footer={readOnly ? <Button onPress={onClose}>Done</Button> : <><Button appearance="outlined" variant="secondary" onPress={onClose}>Cancel</Button><Button isDisabled={busy} onPress={() => { void save() }} data-testid="material-save">{busy ? 'Saving…' : material ? 'Save' : 'Add material'}</Button></>}>
      {readOnly ? <ReadOnlyNote text={readOnly} /> : null}
      <ReadOnlyScope readOnly={!!readOnly}>
        <div className={styles.form}>
          <div className={styles.well}>
            <span className={styles.wellPic} style={{ background: shown ? `center / cover no-repeat url("${shown}")` : hex }} aria-hidden />
            <div className={styles.wellText}>
              <span className={styles.wellTitle}>{shown ? 'Swatch photo' : 'Colour only'}</span>
              {/* (F132) read-only shows the swatch as it is — no invitation to upload, no buttons that look live */}
              {shown || !readOnly ? <span className={styles.wellHelp}>{shown ? 'The render paints the surface in the colour the photo reads as.' : 'Add a photo of the sample so the team knows it on sight.'}</span> : null}
              {readOnly ? null : (
                <span className={styles.wellActions}>
                  <Button appearance="outlined" variant="secondary" iconStart={<Icon name="add_photo_alternate" size={20} weight={300} />} onPress={() => file.current?.click()}>{shown ? 'Replace photo' : 'Upload a photo'}</Button>
                  {shown ? <Button appearance="text" onPress={() => setPhoto(null)}>Remove photo</Button> : null}
                </span>
              )}
            </div>
            <input ref={file} type="file" accept={PHOTO_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f) }} />
          </div>
          <TextField label="Name" required value={name} maxLength={NAME_MAX} onChange={setName} error={tried && !name.trim() ? 'Give the material a name' : undefined} placeholder="e.g. Nippon Sage Whisper" />
          <div className={styles.pair}>
            <TextField label="Category" mode="select" value={cat} options={GENERIC_CATEGORIES} onChange={setCat} />
            <div className={styles.colour}>
              <label className={styles.swatch} style={{ background: hex }}><input type="color" value={hex} aria-label="Pick the colour" onChange={(e) => { setHex(e.target.value.toUpperCase()); setHexDraft(null) }} /></label>
              <div className={styles.colourField}>
                <TextField label="Colour" value={hexDraft ?? hex} maxLength={7} error={hexBad && (hexLeft || tried) ? 'Six hex digits, like #9DB0A0' : undefined} onChange={typeHex} onBlur={blurHex} />
              </div>
            </div>
          </div>
          <div className={styles.field}><span className={styles.head}>Finish</span><Chips label="Finish" options={FINISHES} value={finish} onChange={setFinish} /></div>
          <TextField label="Price book item" mode="select" value={book} options={[NOT_LINKED, ...bookItems.map((b) => labels.toLabel.get(b.id) ?? b.name)]} onChange={setBook} helper="Add to quote prices this finish from it." />
          <TextArea label="Note for the team (optional)" isDisabled={!!readOnly} placeholder="e.g. Supplier code NP-2231 · 2 coats on skim" value={desc} onChange={(v: string) => setDesc(v)} />
        </div>
      </ReadOnlyScope>
    </Dialog>
  )
}
