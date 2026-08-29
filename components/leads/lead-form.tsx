'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { FloatingField, PortalMenu } from '@/components/leads/move-stage/fields'
import menuStyles from '@/components/leads/menus.module.css'
import { SOURCES, PROPERTY_TYPES } from '@/lib/leads/enums'
import { modalPanel, overlayFade, ease, duration } from '@/lib/motion'
import type { LeadRow } from '@/lib/leads/queries'
import fieldStyles from '@/components/leads/move-stage/fields.module.css'
import styles from './lead-form.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'

/* Only 'Contemporary' / 'Collected' / 'New' are mock-visible; the rest are
   invented so a one-option select doesn't look broken (REG — needs design sign-off). */
export const STYLE_OPTIONS = ['Contemporary', 'Modern', 'Minimalist', 'Scandinavian', 'Industrial'] as const
export const KEY_COLLECTION_OPTIONS = ['Collected', 'Not yet collected'] as const
export const CONDITION_OPTIONS = ['New', 'Resale', 'Renovated'] as const
export const AREA_UNITS = ['sq ft', 'sq m'] as const

export type LeadFormData = {
  name: string
  phone: string
  source: string
  propertyType: string
  propertyAddress: string
  email: string
  leadAddress: string
  budget: string        // grouped digits, e.g. "70,000"
  startDate: string     // d/m/yyyy
  style: string
  keyCollection: string
  condition: string
  areaSize: string
  areaUnit: string
  notes: string
}

const groupDigits = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  return d ? Number(d).toLocaleString('en-SG') : ''
}

const emptyForm = (): LeadFormData => ({
  name: '', phone: '', source: '', propertyType: '', propertyAddress: '',
  email: '', leadAddress: '', budget: '', startDate: '', style: '',
  keyCollection: '', condition: '', areaSize: '', areaUnit: 'sq ft', notes: '',
})

const fromLead = (lead: LeadRow): LeadFormData => ({
  name: lead.name,
  phone: lead.phone,
  source: lead.source,
  propertyType: lead.propertyType,
  propertyAddress: lead.propertyAddress ?? '',
  email: lead.email ?? '',
  leadAddress: lead.leadAddress ?? '',
  budget: groupDigits(String(Math.round(lead.budgetMinor / 100))),
  startDate: lead.estimatedStartDate
    ? `${lead.estimatedStartDate.getDate()}/${lead.estimatedStartDate.getMonth() + 1}/${lead.estimatedStartDate.getFullYear()}`
    : '',
  style: lead.style ?? '',
  keyCollection: lead.keyCollection ?? '',
  condition: lead.condition ?? '',
  areaSize: lead.areaSqft ? String(lead.areaSqft) : '',
  areaUnit: 'sq ft',
  notes: lead.notes ?? '',
})

/* Phone field: "+65 | divider | digits" per 779:24644. Shares the FloatingField box. */
function PhoneField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  return (
    <div className={`${fieldStyles.field} ${fieldStyles.select}`}>
      <div className={fieldStyles.box} data-error={error || undefined}>
        <span className={fieldStyles.label}>Lead phone number*</span>
        <span className={styles.prefix}>+65</span>
        <span className={styles.divider} />
        <input
          className={fieldStyles.value}
          value={value}
          inputMode="numeric"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
      </div>
    </div>
  )
}

/* Area field: "digits | divider | unit select" per 780:82374. */
function AreaField({
  value, unit, onChange, onUnitChange,
}: { value: string; unit: string; onChange: (v: string) => void; onUnitChange: (u: string) => void }) {
  const [unitOpen, setUnitOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className={`${fieldStyles.field} ${fieldStyles.select}`} ref={ref}>
      <div className={fieldStyles.box}>
        <span className={fieldStyles.label}>Area size</span>
        <input
          className={fieldStyles.value}
          value={value}
          inputMode="numeric"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <span className={styles.divider} />
        <button type="button" className={styles.unitBtn} data-open={unitOpen || undefined} aria-expanded={unitOpen} onClick={() => setUnitOpen((o) => !o)}>
          {unit}
          <span data-chev><Icon name="expand_more" size={16} /></span>
        </button>
      </div>
      <PortalMenu open={unitOpen} anchor={ref} onClose={() => setUnitOpen(false)} align="right" width={96}>
        {AREA_UNITS.map((u) => (
          <button key={u} type="button" role="option" aria-selected={u === unit} className={menuStyles.item}
                  onClick={() => { onUnitChange(u); setUnitOpen(false) }}>
            {u}
          </button>
        ))}
      </PortalMenu>
    </div>
  )
}

export function LeadFormModal({
  form, onClose, onSubmit,
}: {
  form: { mode: 'create' } | { mode: 'edit'; lead: LeadRow } | null
  onClose: () => void
  /** Return false when the save failed (the modal stays open for retry). */
  onSubmit: (mode: 'create' | 'edit', data: LeadFormData, leadId?: string) => boolean | Promise<boolean>
}) {
  useScrollLock(!!form)   // the page never scrolls behind this surface
  const open = form !== null
  const [wasOpen, setWasOpen] = useState(false)
  const [data, setData] = useState<LeadFormData>(emptyForm)
  const [expanded, setExpanded] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; phone?: boolean; startDate?: boolean }>({})
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  // Render-phase adjust: seed the draft when the modal opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && form) {
      setData(form.mode === 'edit' ? fromLead(form.lead) : emptyForm())
      setExpanded(form.mode === 'edit')
      setErrors({})
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (open) submittingRef.current = false
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const set = <K extends keyof LeadFormData>(k: K) => (v: LeadFormData[K]) =>
    setData((d) => ({ ...d, [k]: v }))

  const validDate = (s: string) => {
    if (!s.trim()) return true
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim())
    if (!m) return false
    const [, d, mo, y] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d))
    return dt.getDate() === Number(d) && dt.getMonth() === Number(mo) - 1
  }

  const submit = async () => {
    if (!form || submittingRef.current) return
    const errs = {
      name: !data.name.trim(),
      phone: data.phone.replace(/\D/g, '').length !== 8,
      startDate: !validDate(data.startDate),
    }
    setErrors(errs)
    if (errs.name || errs.phone || errs.startDate) {
      // A hidden error must become visible, or the button reads as a no-op.
      if (errs.startDate) setExpanded(true)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    const ok = await onSubmit(form.mode, data, form.mode === 'edit' ? form.lead.id : undefined)
    setSubmitting(false)
    // On success the modal is closing: keep the ref set so clicks landing on
    // the exiting tree can't re-submit; it resets when the modal next opens.
    if (ok === false) submittingRef.current = false
  }

  return (
    <AnimatePresence>
      {open && form ? (
        <motion.div
          className={styles.overlay}
          variants={overlayFade} initial="initial" animate="animate" exit="exit"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div className={styles.panel} variants={modalPanel} role="dialog" aria-modal
                      aria-label={form.mode === 'create' ? 'Create New Lead' : 'Edit Lead'}>
            <div className={styles.heading}>
              <span className={styles.title}>{form.mode === 'create' ? 'Create New Lead' : 'Edit Lead'}</span>
              <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                <Icon name="close" size={24} family="outlined" />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.section}>
                <div className={styles.fieldWrap}>
                  <FloatingField label="Lead name*" value={data.name} onChange={set('name')} trailingIcon={null} error={errors.name} />
                  {errors.name ? <span className={styles.helperError}>Required</span> : null}
                </div>
                <div className={styles.fieldWrap}>
                  <PhoneField value={data.phone} onChange={set('phone')} error={errors.phone} />
                  {errors.phone ? <span className={styles.helperError}>Enter an 8-digit phone number</span> : null}
                </div>
                <div className={styles.fieldRow}>
                  <FloatingField label="Lead source" value={data.source} options={[...SOURCES]} onChange={set('source')} />
                  <FloatingField label="Property type" value={data.propertyType} options={[...PROPERTY_TYPES]} onChange={set('propertyType')} />
                </div>
                <div className={styles.fieldWrap}>
                  <FloatingField label="Property address" value={data.propertyAddress} onChange={set('propertyAddress')} trailingIcon={null} />
                  <span className={styles.helper}>Client project address.</span>
                </div>
              </div>

              <div className={styles.section}>
                <button type="button" className={styles.moreToggle} aria-expanded={expanded}
                        onClick={() => setExpanded((e) => !e)}>
                  Additional info
                  <span data-chev><Icon name={expanded ? 'keyboard_arrow_up' : 'expand_more'} size={20} /></span>
                </button>
                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="more"
                      initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                      exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      transition={{ duration: duration.step, ease: ease.standard }}
                      style={{ width: '100%' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--om-spacing-6)', width: '100%' }}>
                        <FloatingField label="Lead email" value={data.email} onChange={set('email')} trailingIcon={null} />
                        <FloatingField label="Lead address" value={data.leadAddress} onChange={set('leadAddress')} trailingIcon={null} />
                        <div className={styles.fieldRow}>
                          <FloatingField label="Estimated budget (S$)" value={data.budget}
                                         onChange={(v) => set('budget')(groupDigits(v))} trailingIcon={null} />
                          <div className={styles.fieldWrap}>
                            <FloatingField label="Estimated start date" value={data.startDate}
                                           onChange={set('startDate')} trailingIcon="calendar_month" error={errors.startDate} />
                            {errors.startDate ? <span className={styles.helperError}>Use d/m/yyyy</span> : null}
                          </div>
                        </div>
                        <div className={styles.fieldRow}>
                          <FloatingField label="Style" value={data.style} options={[...STYLE_OPTIONS]} onChange={set('style')} />
                          <FloatingField label="Key collection" value={data.keyCollection} options={[...KEY_COLLECTION_OPTIONS]} onChange={set('keyCollection')} />
                        </div>
                        <div className={styles.fieldRow}>
                          <FloatingField label="Condition" value={data.condition} options={[...CONDITION_OPTIONS]} onChange={set('condition')} />
                          <AreaField value={data.areaSize} unit={data.areaUnit} onChange={set('areaSize')} onUnitChange={set('areaUnit')} />
                        </div>
                        <div className={styles.fieldWrap}>
                          <textarea className={styles.notes} placeholder="Notes" value={data.notes}
                                    onChange={(e) => set('notes')(e.target.value)} />
                          <span className={styles.helper}>You can view these notes under the Notes page in Leads Detail.</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div className={styles.footer} data-shadow={expanded || undefined}>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={submitting}>Cancel</Button>
              <Button onPress={() => { void submit() }} isDisabled={submitting}>{form.mode === 'create' ? 'Create' : 'Save'}</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
