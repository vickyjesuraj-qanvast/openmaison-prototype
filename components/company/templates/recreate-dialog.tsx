'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { TemplateThumb } from '@/components/templates/render/document'
import { PRESETS, type PresetKey } from '@/lib/templates/presets'
import { applyReading, MAX_KEPT_BYTES, type Match, type Reading } from '@/lib/templates/recreate'
import { DEFAULT_DEFAULTS } from '@/lib/templates/model'
import { readQuoteFile } from '@/lib/templates/read-quote-file'
import { titleCaseName } from '@/lib/format'   // (S42 B-22)
import { fileSizeLabel, readFileAsDataUrl } from '@/lib/templates/files'
import type { BrandKit } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import styles from './recreate-dialog.module.css'

type Step = { kind: 'pick' } | { kind: 'reading'; file: File } | { kind: 'matched'; file: File; data: string | null; match: Match; key: PresetKey; name: string; choosing: boolean }

/** (S42 B-22) The template's name from the file's: its stem, words apart, in title case when it came all lower case ("cove interior quotation"
    → "Cove Interior Quotation"); a name the studio cased itself is kept as it is. */
function nameFromFile(file: string): string {
  const stem = file.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stem) return 'My quote'
  return stem === stem.toLowerCase() ? titleCaseName(stem) : stem
}

/**
 * Recreate from my current quote (REG-491): drop the PDF or photo of the quote the studio sends today; the build reads it, proposes the
 * house style that reproduces it with the reasons, and opens the editor on it with the file kept as a reference beside the canvas.
 * (pending modules S11 — card held:quote-templates) A PDF is read for its words by rule (`readQuoteFile`): its paper, its table's columns,
 * its grouping, its validity and its grand total's words ride to the new template (`reading`); (S43B · F1-02) a photo is never matched — it
 * says it can't be read and opens the designs to pick from.
 */
export function RecreateDialog({ open, brand, sample, onClose, onCreate, applyLabel = 'Open in the editor', title = 'Upload your existing quote' }: { open: boolean; brand: BrandKit; sample: DocData; onClose: () => void; onCreate: (key: PresetKey, name: string, sourceFile: string, reading?: Reading) => void; applyLabel?: string; title?: string }) {
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const designs = useMemo(() => Object.fromEntries(PRESETS.map((p) => [p.key, p.design()])), [])
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setStep({ kind: 'pick' }) }   // every opening starts at the dropzone (render-phase adjust)

  useEffect(() => {
    if (step.kind !== 'reading') return
    const file = step.file
    let on = true
    const start = performance.now()
    void (async () => {
      const [data, match] = await Promise.all([file.size <= MAX_KEPT_BYTES ? readFileAsDataUrl(file, 2000) : Promise.resolve(null), readQuoteFile(file)])
      const wait = Math.max(0, 900 - (performance.now() - start))   // (pending modules S11) the reading is real now; a short floor keeps the step from flashing
      setTimeout(() => {
        if (!on) return
        setStep({ kind: 'matched', file, data, match, key: match.key, name: nameFromFile(file.name), choosing: match.by === 'picture' })   // (S43B · F1-02) nothing read: the designs open to pick from
      }, wait)
    })()
    return () => { on = false }
  }, [step])

  const take = (files: FileList | File[] | null) => {
    const f = Array.from(files ?? [])[0]
    if (!f) return
    setStep({ kind: 'reading', file: f })
  }
  const create = () => {
    if (step.kind !== 'matched') return
    onCreate(step.key, step.name.trim() || 'My quote', JSON.stringify({ name: step.file.name, type: step.file.type, size: step.file.size, data: step.data }), step.match.reading)   // what the reading found rides along whichever design is picked
  }
  const preset = step.kind === 'matched' ? PRESETS.find((p) => p.key === step.key)! : null
  /* (pending modules S11) the small pages show each design as it will open — with what the reading found laid on (paper, columns, totals) */
  const reading = step.kind === 'matched' ? step.match.reading : undefined
  const shown = useMemo(() => (reading ? Object.fromEntries(Object.entries(designs).map(([k, d]) => [k, applyReading(d, DEFAULT_DEFAULTS, reading).design])) : designs), [designs, reading])

  return (
    <Dialog open={open} onClose={onClose} title={title} size="modal" width={800}
            subtitle="The quote you send today, as a PDF, photo or scan — we match its layout and rebuild it."
            footer={step.kind === 'matched' ? <><Button variant="secondary" appearance="outlined" onPress={() => setStep({ kind: 'pick' })}>Start over</Button><Button onPress={create}>{applyLabel}</Button></> : <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>}>
      {step.kind === 'pick' ? (
        <div className={styles.drop} data-drag={drag || undefined} role="button" tabIndex={0} aria-label="Upload your current quote"
             onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click() } }}
             onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files) }}>
          <span className={styles.dropGlyph}><Icon name="cloud_upload" size={40} weight={300} /></span>
          <span className={styles.dropTitle}>Drop your quote here, or browse</span>
          <span className={styles.dropHelp}>PDF · JPG · PNG. From a PDF we read its words — the table’s columns, the paper, the sign-off — and match it to a design you can adjust. A photo can’t be read yet: you pick the design that looks closest.</span>
          <input ref={input} type="file" accept=".pdf,image/*,application/pdf" hidden data-testid="recreate-file" onChange={(e) => { take(e.target.files); e.target.value = '' }} />
        </div>
      ) : step.kind === 'reading' ? (
        <div className={styles.reading} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden />
          <span className={styles.readingTitle}>Reading {step.file.name}…</span>
          <span className={styles.readingHelp}>Looking at the letterhead, the item table, the totals and the sign-off.</span>
        </div>
      ) : (
        <div className={styles.result}>
          <div className={styles.match}>
            <span className={styles.matchThumb}><TemplateThumb design={shown[step.key]!} brand={brand} data={sample} width={168} /></span>
            <div className={styles.matchText}>
              <span className={styles.eyebrow} data-testid="recreate-confidence" data-read={step.match.by === 'picture' ? 'no' : undefined}>{step.match.by === 'picture' ? 'Not read' : step.match.confidence === 'high' ? 'Strong match' : step.match.confidence === 'good' ? 'Good match' : 'Closest match'}</span>   {/* (S43B · F1-02) a picture is never called a match */}
              <span className={styles.matchTitle}>{preset?.name} design</span>
              <span className={styles.matchFile}><Icon name={step.file.type === 'application/pdf' ? 'picture_as_pdf' : 'image'} size={16} weight={300} /> {step.file.name} · {fileSizeLabel(step.file.size)}{step.data ? '' : ' · kept by name only'}</span>
              <ul className={styles.reasons} data-testid="recreate-reasons">{(step.key === step.match.key ? step.match.reasons : [PRESETS.find((p) => p.key === step.key)!.blurb, ...readFacts(step.match)]).map((r, i) => <li key={i}>{r}</li>)}</ul>
              <div className={styles.matchActions}>
                <Button appearance="text" onPress={() => setStep({ ...step, choosing: !step.choosing })}>{step.choosing ? 'Keep this one' : 'Choose another design'}</Button>
              </div>
            </div>
          </div>
          {step.choosing ? (
            <div className={styles.choices} role="radiogroup" aria-label="Design">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" role="radio" aria-checked={step.key === p.key} className={styles.choice} data-on={step.key === p.key || undefined} onClick={() => setStep({ ...step, key: p.key })}>
                  <span className={styles.choiceThumb}><TemplateThumb design={shown[p.key]!} brand={brand} data={sample} width={84} /></span>
                  <span className={styles.choiceName}>{p.name}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.nameField}><TextField label="Template name" value={step.name} onChange={(v) => setStep({ ...step, name: v })} /></div>
          <p className={styles.note}>The editor opens with your file beside the canvas, so you can match it line by line. Nothing is sent anywhere.</p>
        </div>
      )}
    </Dialog>
  )
}

/** (pending modules S11) What the reading found that rides to whichever design is picked — the match's reasons less its style line. */
const readFacts = (m: Match) => (m.by === 'words' && m.reading ? m.reasons.slice(1) : [])
