'use client'

import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Radio, RadioGroup, SearchBar, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { modalPanel, overlayFade } from '@/lib/motion'
import type { TemplateRow } from '@/lib/leads/tasks'
import styles from './template-dialogs.module.css'

/* Lead Details › Tasks › templates (902:29194): Choose Template 600×600 · Save as Template 400×495 (new / existing). */

/** Modal shell shared by both dialogs — the listing FiltersModal's heading 64 + footer 68 (the wizard Dialog has no 64px rule head nor a fixed height). */
function TemplateShell({
  open, kind, title, onClose, children, footer,
}: { open: boolean; kind: 'choose' | 'save'; title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  useScrollLock(open)   // the page never scrolls behind this surface
  /* (REG-287) `aria-modal` promised assistive tech the page behind is inert, but the shell only locked scrolling:
     Tab from Select / Save walked straight back out. The app's surface policy does all three — and both dialogs get
     it here, since both render through this shell (components/om/surface.ts, as in components/om/dialog.tsx):
     Esc closes the TOPMOST surface only (the "Choose template" select menu wins first), focus moves onto the panel
     on open — Save as Template's name field autofocuses, and the hook leaves focus alone when it is already inside —
     Tab cycles inside it, and focus returns to the opener on close. */
  const panel = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) tabIndex={-1} so the panel can hold focus; `outline: none` matches every other panel that takes
              focus on open (components/om/dialog.module.css, move-stage/wizard.module.css) — inline because this
              surface's stylesheet is outside this pass. The ring belongs to the panel's own controls. */}
          <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} data-kind={kind} variants={modalPanel}
                      role="dialog" aria-modal aria-label={title} tabIndex={-1}>
            <div className={styles.heading}>
              <span className={styles.title}>{title}</span>
              <Tooltip label="Close">
                <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>
            <div ref={scrollRef} className={styles.body}>{children}</div>
            <div className={styles.footer} data-shadow={bodyScrolls || undefined}>{footer}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** Choose Template (902:29198) — search · "My templates" · single-select rows · Manage Templates / Cancel / Select. */
export function ChooseTemplateDialog({
  open, templates, onSelect, onManage, onClose,
}: {
  open: boolean
  templates: TemplateRow[]
  onSelect: (id: string) => void
  onManage: () => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  // Render-phase adjust: every opening starts clean (no selection, empty search).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setPicked(null); setQ('') }
  }
  const needle = q.trim().toLowerCase()
  const shown = needle ? templates.filter((t) => t.name.toLowerCase().includes(needle)) : templates
  return (
    <TemplateShell open={open} kind="choose" title="Choose Template" onClose={onClose}
                   footer={<>
                     <span className={styles.footerStart}>
                       <Button variant="secondary" appearance="outlined" onPress={onManage}>Manage Templates</Button>
                     </span>
                     <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button isDisabled={!picked} onPress={() => { if (picked) onSelect(picked) }}>Select</Button>
                   </>}>
      <SearchBar size="md" appearance="filled" placeholder="Search" aria-label="Search templates" value={q} onChange={setQ} />
      <span className={styles.groupTitle}>My templates</span>
      {shown.map((t) => {
        const on = picked === t.id
        return (
          <button key={t.id} type="button" role="radio" aria-checked={on} className={styles.tplRow} data-selected={on || undefined}
                  onClick={() => setPicked(t.id)}>
            <span className={styles.tplText}>
              <span className={styles.tplName}>{t.name}</span>
              <span className={styles.tplCount}>Number of tasks: {t.tasks.length}</span>
            </span>
            {on
              ? <Icon name="radio_button_checked" size={24} weight={400} />
              : <Icon name="radio_button_unchecked" size={24} weight={300} />}
          </button>
        )
      })}
      {shown.length === 0 ? <span className={styles.noMatch}>No templates match “{q}”.</span> : null}
    </TemplateShell>
  )
}

export type SaveTemplateInput = { name?: string; templateId?: string; keepMembers: boolean; keepDescription: boolean }

/** Save as Template (902:29220 new · 902:29256 existing). */
export function SaveTemplateDialog({
  open, templates, onSave, onClose,
}: {
  open: boolean
  templates: TemplateRow[]
  onSave: (v: SaveTemplateInput) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [name, setName] = useState('')
  const [existing, setExisting] = useState('')     // template name (the select field holds display strings)
  const [keepMembers, setKeepMembers] = useState(true)
  const [keepDescription, setKeepDescription] = useState(true)
  const [banner, setBanner] = useState(true)
  const [wasOpen, setWasOpen] = useState(false)
  const [seeded, setSeeded] = useState<string | null>(null)   // the template the switches below were read from
  // Render-phase adjust: the dialog stays mounted between uses — never carry a draft over.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setMode('new'); setName(''); setExisting(''); setKeepMembers(true); setKeepDescription(true); setSeeded(null); setBanner(true) }
  }
  const target = templates.find((t) => t.name === existing)
  /* Render-phase adjust: an existing template's two switches belong to that record (keep_members / keep_description), so
     they open on its stored values — seeded true they showed "on" over a template saved with one off, and Save wrote the
     true straight back over it. New Template has no record yet and keeps the mock's both-on. */
  const seed = mode === 'existing' ? target ?? null : null
  if ((seed?.id ?? null) !== seeded) {
    setSeeded(seed?.id ?? null)
    setKeepMembers(seed ? seed.keepMembers : true)
    setKeepDescription(seed ? seed.keepDescription : true)
  }
  const canSave = mode === 'new' ? name.trim() !== '' : !!target
  const save = () => {
    if (!canSave) return
    onSave(mode === 'new'
      ? { name: name.trim(), keepMembers, keepDescription }
      : { templateId: target!.id, keepMembers, keepDescription })
  }
  return (
    <TemplateShell open={open} kind="save" title="Save as Template" onClose={onClose}
                   footer={<>
                     <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button isDisabled={!canSave} onPress={save}>Save</Button>
                   </>}>
      <RadioGroup aria-label="Template" className={styles.radioRow} value={mode} onChange={(v) => setMode(v as 'new' | 'existing')}>
        <Radio value="new">New Template</Radio>
        <Radio value="existing">Existing Template</Radio>
      </RadioGroup>
      {mode === 'new'
        ? <TextField label="Task template name" value={name} onChange={setName} autoFocus />
        : <TextField label="Choose template" value={existing} onChange={setExisting} mode="select" options={templates.map((t) => t.name)} />}
      {banner ? (
        <div className={styles.banner} role="note">
          <Icon name="info" size={20} />
          <span className={styles.bannerText}>Attachments, and comments will not be saved in the template.</span>
          <Tooltip label="Dismiss">
            <button type="button" className={styles.bannerClose} aria-label="Dismiss" onClick={() => setBanner(false)}>
              <Icon name="close" size={20} />
            </button>
          </Tooltip>
        </div>
      ) : null}
      <div className={styles.rule} />
      <div className={styles.keep}>
        <span className={styles.groupTitle}>Task details to keep in this template</span>
        <div className={styles.keepRow}>
          <span className={styles.keepLabel}>Team Members</span>
          <Switch size="md" isSelected={keepMembers} onChange={setKeepMembers} aria-label="Keep team members" />
        </div>
        <div className={styles.keepRow}>
          <span className={styles.keepLabel}>Task Description</span>
          <Switch size="md" isSelected={keepDescription} onChange={setKeepDescription} aria-label="Keep task description" />
        </div>
      </div>
    </TemplateShell>
  )
}
