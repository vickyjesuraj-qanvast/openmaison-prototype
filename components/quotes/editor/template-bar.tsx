'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { TemplateThumb } from '@/components/templates/render/document'
import { presetLabel } from '@/lib/quotes/payments'
import { startsWith, type PickerTemplate } from '@/lib/templates/picker'
import type { QuoteTemplateState } from '@/lib/templates/queries'
import styles from './template-bar.module.css'

/**
 * (REG-489 → REG-496) The quote's template, inside General Info, as a card: the template's first page, its name and pinned
 * version, what it started the quote with, and three actions — Change (the picker), Edit template (the template editor in
 * this tab, with this quote as its origin) and Save as new template. No template = the studio default prints.
 */
export function TemplateCard({ state, busy, onChange, onEdit, onSaveAs }: { state: QuoteTemplateState; busy: boolean; onChange: () => void; onEdit: () => void; onSaveAs: () => void }) {
  const cur = state.current
  const pick: PickerTemplate | null = cur ? state.picker.templates.find((t) => t.id === cur.id) ?? null : null
  const words = cur ? startsWith({ id: cur.id, name: cur.name, version: cur.pinned, isDefault: pick?.isDefault ?? false, paper: pick?.paper ?? 'A4', lastUsedAt: null, design: cur.design, defaults: cur.defaults, folderId: pick?.folderId ?? null }, (k) => presetLabel(k ?? 'default')) : null
  return (
    <div className={styles.card} data-testid="template-card">
      <span className={styles.cardThumb}>
        {cur ? <TemplateThumb design={cur.design} brand={state.picker.brand} data={state.picker.sample} width={72} /> : <span className={styles.cardNone}><Icon name="style" size={24} weight={300} /></span>}
      </span>
      <div className={styles.cardText}>
        <span className={styles.cardEyebrow}>Template</span>
        <span className={styles.cardName}>{cur ? cur.name : 'Studio default'}{cur ? <MetaChip>{cur.deleted ? `Deleted · v${cur.pinned} still prints` : `v${cur.pinned}${cur.latest > cur.pinned ? ` · v${cur.latest} published` : ''}`}</MetaChip> : null}{pick?.isDefault ? <MetaChip>Default</MetaChip> : null}</span>
        <span className={styles.cardMeta}>{words ? `${words.grouping} · ${words.payments} · ${words.validity}` : 'Prints through the studio’s default template and started with its settings. Pick one to start from its sections.'}</span>   {/* (REG-580) */}
        {words && words.sections !== 'No starter sections' ? <span className={styles.cardMeta}>Starts with {words.sections}</span> : null}
        <span className={styles.actions}>
          <Button appearance="text" onPress={onChange} isDisabled={busy}>{cur ? 'Change' : 'Choose a template'}</Button>
          {cur && !cur.deleted ? <Button appearance="text" iconEnd={<Icon name="edit" size={18} />} onPress={onEdit} isDisabled={busy}>Edit template</Button> : null}
          <Button appearance="text" onPress={onSaveAs} isDisabled={busy}>Save as new template</Button>
        </span>
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

/** ⋯ › Save as Template (REG-489): a Draft template from this quote's settings, opened in the editor on request. */
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
