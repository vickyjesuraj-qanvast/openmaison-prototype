'use client'

import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { modalPanel, overlayFade } from '@/lib/motion'
import { Dropzone, FloatingField } from './fields'
import styles from './wizard.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'

/** Nested/compact dialog shell — second scrim layers over the wizard's. */
export function Dialog({
  open, onClose, title, subtitle, width = 400, children, footer, size = 'compact',
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: ReactNode
  width?: number; children: ReactNode; footer: ReactNode
  /** compact = delete-alert shell (779:24663); standard = 56px heading with divider, h3 title, 24px body (821:23969). */
  size?: 'compact' | 'standard'
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  // Layer policy (R3): Esc closes the topmost dialog.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.dialogOverlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div className={styles.dialog} style={{ width }} variants={modalPanel} data-size={size}
                      initial="initial" animate="animate" exit="exit"
                      role="dialog" aria-label={title}>
            <div className={styles.dialogHead}>
              <div className={styles.headText}>
                <span className={styles.title} style={size === 'compact' ? { font: 'var(--om-type-heading-h4)' } : undefined}>{title}</span>
                {subtitle}
              </div>
              <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                <Icon name="close" size={24} family="outlined" />
              </button>
            </div>
            <div className={styles.dialogBody}>{children}</div>
            <div className={styles.dialogFoot}>{footer}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function AutoFillDialog({ open, onClose, onUpload }: { open: boolean; onClose: () => void; onUpload: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Auto Fill" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={onUpload}>Upload</Button></>}>
      <Dropzone
        title={<>Drop in the conversation or <b>browse</b></>}
        helper="Upload a screenshot from any messaging app — we'll identify the channel, summarise the conversation, and suggest tasks."
        onPick={onUpload}
      />
    </Dialog>
  )
}

/**
 * Suggested tasks — F5 build resolution applied: trailing checkboxes and
 * "Cancel" (mock had leading boxes + "Close"); flagged in the plan.
 */
export function SuggestedTasksDialog({
  open, onClose, onSave, autoAdded, suggestions, picked, onToggle,
}: {
  open: boolean; onClose: () => void; onSave: () => void
  autoAdded: string; suggestions: string[]
  picked: Set<string>; onToggle: (s: string) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Suggested tasks" width={470}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={onSave}>Save</Button></>}>
      <span className={styles.groupLabel}>Auto added</span>
      <div className={styles.taskRow} data-auto="true">
        <span style={{ flex: 1 }}>{autoAdded}</span>
        <Checkbox isSelected isDisabled aria-label="Auto added task" />
      </div>
      <span className={styles.groupLabel}>Suggestions</span>
      {suggestions.map((s) => (
        <button key={s} type="button" className={styles.taskRow} onClick={() => onToggle(s)}>
          <span style={{ flex: 1 }}>{s}</span>
          <Checkbox isSelected={picked.has(s)} onChange={() => onToggle(s)} aria-label={s} />
        </button>
      ))}
    </Dialog>
  )
}

export function OnHoldDialog({
  open, onClose, onSave, reason, setReason, duration, setDuration, followUp,
}: {
  open: boolean; onClose: () => void; onSave: () => void
  reason: string; setReason: (v: string) => void
  duration: string; setDuration: (v: string) => void
  followUp: string
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Move stage" width={360}
            subtitle={<span className={styles.subtitle}>Moving to On Hold</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={onSave}>Save &amp; Move</Button></>}>
      <FloatingField label="Reason" value={reason} onChange={setReason}
                     options={['Property delay', 'Budget on hold', 'Travelling', 'Others']} />
      <FloatingField label="Duration" value={duration} onChange={setDuration}
                     options={['1 month', '3 months', '6 months']} />
      <span className={styles.helper}>Next follow up date will be {followUp}</span>
    </Dialog>
  )
}

export function LostDialog({
  open, onClose, onSave, reason, setReason,
}: {
  open: boolean; onClose: () => void; onSave: () => void
  reason: string; setReason: (v: string) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Move stage" width={360}
            subtitle={<span className={styles.subtitle}>Moving to Lost</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={onSave}>Save &amp; Move</Button></>}>
      <FloatingField label="Reason" value={reason} onChange={setReason}
                     options={['Property too far', 'Went with another firm', 'Budget mismatch', 'Unresponsive', 'Others']} />
    </Dialog>
  )
}

/** Destructive primary for confirmation dialogs (Delete / Delete Forever / Empty Trash). */
export function DangerButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={styles.dangerButton} onClick={onClick} disabled={disabled}>{children}</button>
  )
}
