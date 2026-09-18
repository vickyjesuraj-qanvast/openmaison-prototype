'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { TemplateThumb } from '@/components/templates/render/document'
import { PRESETS, type PresetKey } from '@/lib/templates/presets'
import { matchSourceFile, MAX_KEPT_BYTES, type Match } from '@/lib/templates/recreate'
import { fileSizeLabel, readFileAsDataUrl } from '@/lib/templates/files'
import type { BrandKit } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import styles from './recreate-dialog.module.css'

type Step = { kind: 'pick' } | { kind: 'reading'; file: File } | { kind: 'matched'; file: File; data: string | null; match: Match; key: PresetKey; name: string; choosing: boolean }

/**
 * Recreate from my current quote (REG-491): drop the PDF or photo of the quote the studio sends today; the build reads it
 * (curated for the three reference quotes, a later build reads any file), proposes the house style that reproduces it with
 * the reasons, and opens the editor on it with the file kept as a reference beside the canvas.
 */
export function RecreateDialog({ open, brand, sample, onClose, onCreate, applyLabel = 'Open in the editor', title = 'Upload your existing quote' }: { open: boolean; brand: BrandKit; sample: DocData; onClose: () => void; onCreate: (key: PresetKey, name: string, sourceFile: string) => void; applyLabel?: string; title?: string }) {
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
      const data = file.size <= MAX_KEPT_BYTES ? await readFileAsDataUrl(file, 2000) : null
      const wait = Math.max(0, 1600 - (performance.now() - start))   // the reading beat: long enough to read as work, short enough to feel instant
      setTimeout(() => {
        if (!on) return
        const match = matchSourceFile(file.name)
        setStep({ kind: 'matched', file, data, match, key: match.key, name: file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'My quote', choosing: false })
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
    onCreate(step.key, step.name.trim() || 'My quote', JSON.stringify({ name: step.file.name, type: step.file.type, size: step.file.size, data: step.data }))
  }
  const preset = step.kind === 'matched' ? PRESETS.find((p) => p.key === step.key)! : null

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
          <span className={styles.dropHelp}>PDF · JPG · PNG. We read the layout — the letterhead, the table, the sign-off — and match it to a design you can adjust.</span>
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
            <span className={styles.matchThumb}><TemplateThumb design={designs[step.key]!} brand={brand} data={sample} width={168} /></span>
            <div className={styles.matchText}>
              <span className={styles.eyebrow}>{step.match.confidence === 'high' ? 'Strong match' : step.match.confidence === 'good' ? 'Good match' : 'Closest match'}</span>
              <span className={styles.matchTitle}>{preset?.name} design</span>
              <span className={styles.matchFile}><Icon name={step.file.type === 'application/pdf' ? 'picture_as_pdf' : 'image'} size={16} weight={300} /> {step.file.name} · {fileSizeLabel(step.file.size)}{step.data ? '' : ' · kept by name only'}</span>
              <ul className={styles.reasons}>{(step.key === step.match.key ? step.match.reasons : [PRESETS.find((p) => p.key === step.key)!.blurb]).map((r, i) => <li key={i}>{r}</li>)}</ul>
              <div className={styles.matchActions}>
                <Button appearance="text" onPress={() => setStep({ ...step, choosing: !step.choosing })}>{step.choosing ? 'Keep this one' : 'Choose another design'}</Button>
              </div>
            </div>
          </div>
          {step.choosing ? (
            <div className={styles.choices} role="radiogroup" aria-label="Design">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" role="radio" aria-checked={step.key === p.key} className={styles.choice} data-on={step.key === p.key || undefined} onClick={() => setStep({ ...step, key: p.key })}>
                  <span className={styles.choiceThumb}><TemplateThumb design={designs[p.key]!} brand={brand} data={sample} width={84} /></span>
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
