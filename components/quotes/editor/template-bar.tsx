'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { TemplateThumb } from '@/components/templates/render/document'
import type { PickerTemplate } from '@/lib/templates/picker'
import type { QuoteTemplateState } from '@/lib/templates/queries'
import styles from './template-bar.module.css'
import { ProTag } from '@/components/credits/pro-tag'

/**
 * (REG-489 → REG-496) The quote's template, inside General Info, as a card: the template's first page and the one line it prints with.
 * (The calm UI build 2026-10-27, the UI audit's 4-10 · 4-02 · W-131 · W-167 · W-352) One line — "Prints with Default Quote PDF (v1)" — and one
 * text button, Change; Edit template and Save as template are the header ⋮'s rows (and the Quote screen's ⋮ on the move, B-24). The shorthand of
 * the template's defaults (By trade › room · 10/30/30/30 · Valid 30 days · GST · signs online · Starts with …) left the card: those settings were
 * applied when the quote was made and each shows where it lives (Payment schedule, Valid until, Signature, the sections); they stay on the
 * template's own Quote settings tab. When the template files the lines by trade (or room / print group), the card says so once — the note that
 * stood above the Items table. A signed quote's card keeps no actions (`signed`). No template = the studio default prints.
 */
export function TemplateCard({ state, busy, onChange, locked = false, printsBy = null, signed = false }: { state: QuoteTemplateState; busy: boolean; onChange: () => void
  /** (kept for the callers; the card no longer draws these two — the header ⋮ does) */
  onEdit?: () => void; onSaveAs?: () => void
  /** (pending modules S19) the template editor is Pro: on Free the card wears the Pro tag and its presses open the lock card */
  locked?: boolean
  /** (4-02) how the template files the lines when it is not by the quote's own sections — said once, here */
  printsBy?: { view: 'category' | 'room' | 'section'; sections: boolean } | null
  /** (4-10) a signed quote's card reads only */
  signed?: boolean }) {
  const cur = state.current
  const pick: PickerTemplate | null = cur ? state.picker.templates.find((t) => t.id === cur.id) ?? null : null
  const by = printsBy ? (printsBy.view === 'category' ? 'trade' : printsBy.view === 'room' ? 'room' : 'print group') : null
  return (
    <div className={styles.card} data-testid="template-card">
      <span className={styles.cardThumb}>
        {cur ? <TemplateThumb design={cur.design} brand={state.picker.brand} data={state.picker.sample} width={72} /> : <span className={styles.cardNone}><Icon name="style" size={24} weight={300} /></span>}
      </span>
      <div className={styles.cardText}>
        <span className={styles.cardName}>
          {cur ? `Prints with ${cur.name} (v${cur.pinned})` : 'Prints with the studio default'}
          {locked ? <ProTag /> : null}
        </span>
        {cur && (cur.deleted || cur.latest > cur.pinned || pick?.isDefault) ? (
          <span className={styles.cardMeta}>{[cur.deleted ? 'The template was deleted — this version still prints' : null, !cur.deleted && cur.latest > cur.pinned ? `v${cur.latest} is published` : null, pick?.isDefault ? 'The studio’s default' : null].filter(Boolean).join(' · ')}</span>
        ) : null}
        {by && printsBy?.sections ? <span className={styles.cardMeta} data-testid="print-note">Prints by {by} — your sections are for you.</span> : null}
        {!cur ? <span className={styles.cardMeta}>Pick one to start from its sections.</span> : null}
        {signed ? null : (
          <span className={styles.actions}>
            <Button appearance="text" onPress={onChange} isDisabled={busy}>{cur ? 'Change' : 'Choose a template'}</Button>
          </span>
        )}
      </div>
    </div>
  )
}

/** (REG-489) Under the tab strip when the template moved on: one click moves the quote to the latest version; Keep dismisses. */
export function TemplateUpdateBanner({ current, busy, onUpdate, onKeep }: { current: NonNullable<QuoteTemplateState['current']>; busy: boolean; onUpdate: () => void; onKeep: () => void }) {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.bannerIcon}><Icon name="info" size={20} weight={300} /></span>
      <span className={styles.bannerText}><b>{current.name}</b> was updated to v{current.latest}{current.note ? ` — ${current.note}` : ''}. This quote still prints with v{current.pinned}.</span>
      <span className={styles.bannerActions}>
        <Button appearance="text" onPress={onKeep} isDisabled={busy}>Keep v{current.pinned}</Button>
        <Button appearance="outlined" variant="secondary" onPress={onUpdate} isDisabled={busy}>Update to v{current.latest}</Button>
      </span>
    </div>
  )
}

/** ⋯ › Save as template (REG-489): a Draft template from this quote's settings, opened in the editor on request. */
export function SaveAsTemplateDialog({ open, defaultName, busy, onClose, onSave }: { open: boolean; defaultName: string; busy: boolean; onClose: () => void; onSave: (name: string, opts: { includeText: boolean; includeSections: boolean }) => void }) {
  const [name, setName] = useState(defaultName)
  const [includeText, setIncludeText] = useState(true)   /* (REG-538) the quote's Terms and Notes ride along as text templates */
  const [includeSections, setIncludeSections] = useState(true)   /* (REG-582) its top-level sections become the starter sections */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setName(defaultName) }
  return (
    <Dialog open={open} onClose={onClose} title="Save as template" size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => onSave(name, { includeText, includeSections })} isDisabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save template'}</Button></>}>
      <TextField label="Template name" required value={name} onChange={setName} autoFocus helper="Saved as a draft under Company › Templates › Quotes, with this quote’s payment split, validity, GST and signature settings as its defaults." onKeyDown={(e) => { if (e.key === 'Enter' && name.trim() && !busy) { e.preventDefault(); onSave(name, { includeText, includeSections }) } }} />
      <label className={styles.saveRow}>Also save its Terms and Notes as text templates <Switch size="sm" isSelected={includeText} onChange={setIncludeText} aria-label="Also save its Terms and Notes as text templates" /></label>
      <label className={styles.saveRow}>Also use its sections as the starter sections <Switch size="sm" isSelected={includeSections} onChange={setIncludeSections} aria-label="Also use its sections as the starter sections" /></label>
    </Dialog>
  )
}
