'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { PortalMenu } from '@/components/om/portal-menu'
import menuStyles from '@/components/leads/menus.module.css'
import { SOURCES, PROPERTY_TYPES } from '@/lib/leads/enums'
import { modalPanel, overlayFade, ease, duration } from '@/lib/motion'
import { EMAIL_RE, MSG, hasErrors, type FieldErrors } from '@/lib/forms'
import { parseInputDate, groupDigits } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'
import styles from './lead-form.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { Tooltip } from '@/components/om/tooltip'

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

type LeadFormErrors = FieldErrors<'name' | 'phone' | 'email' | 'budget' | 'startDate'>

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

/** Pure validation — required fields are exactly the mock's starred ones (Lead name*, Lead phone number*). */
export function validateLeadForm(data: LeadFormData): LeadFormErrors {
  const errors: LeadFormErrors = {}
  if (!data.name.trim()) errors.name = MSG.required
  if (data.phone.replace(/\D/g, '').length !== 8) errors.phone = MSG.phone
  if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) errors.email = MSG.email
  const budgetDigits = data.budget.replace(/,/g, '').trim()
  if (budgetDigits && !/^\d+$/.test(budgetDigits)) errors.budget = MSG.number
  if (data.startDate.trim() && !parseInputDate(data.startDate)) errors.startDate = MSG.date
  return errors
}

/* Phone field: "+65 | divider | digits" per 779:24644 — a TextField with a leading prefix. */
function PhoneField({ value, onChange, error, inputRef }: {
  value: string; onChange: (v: string) => void; error?: string; inputRef?: RefObject<HTMLInputElement | null>
}) {
  return (
    <TextField
      label="Lead phone number*" value={value} error={error} inputRef={inputRef}
      type="tel" inputMode="tel" numeric="digits" maxLength={8} trailingIcon={null}
      leading={<span className={styles.prefix}>+65<span className={styles.divider} /></span>}
      onChange={(v) => onChange(v.slice(0, 8))}
    />
  )
}

/* Area field: "digits | divider | unit select" per 780:82374 — a TextField with the unit switch as trailing. */
function AreaField({
  value, unit, onChange, onUnitChange,
}: { value: string; unit: string; onChange: (v: string) => void; onUnitChange: (u: string) => void }) {
  const [unitOpen, setUnitOpen] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)
  return (
    <>
      <TextField
        label="Area size" value={value} numeric="digits" maxLength={6} trailingIcon={null} boxRef={box}
        onChange={(v) => onChange(v.slice(0, 6))}
        trailing={
          <span className={styles.unitSlot}>
            <span className={styles.divider} />
            <button type="button" className={styles.unitBtn} data-open={unitOpen || undefined} aria-expanded={unitOpen}
                    onClick={() => setUnitOpen((o) => !o)}>
              {unit}
              <span data-chev><Icon name="expand_more" size={16} /></span>
            </button>
          </span>
        }
      />
      <PortalMenu open={unitOpen} anchor={box} onClose={() => setUnitOpen(false)} align="right" width={96}>
        {AREA_UNITS.map((u) => (
          <button key={u} type="button" role="option" aria-selected={u === unit} className={menuStyles.item}
                  onClick={() => { onUnitChange(u); setUnitOpen(false) }}>
            {u}
          </button>
        ))}
      </PortalMenu>
    </>
  )
}

export function LeadFormModal({
  form, onClose, onSubmit, now,
}: {
  form: { mode: 'create' } | { mode: 'edit'; lead: LeadRow } | null
  onClose: () => void
  /** Return false when the save failed (the modal stays open for retry). */
  onSubmit: (mode: 'create' | 'edit', data: LeadFormData, leadId?: string) => boolean | Promise<boolean>
  /** Host clock for the date picker's "today"; falls back to the clock at mount. */
  now?: number
}) {
  useScrollLock(!!form)   // the page never scrolls behind this surface
  const open = form !== null
  const [wasOpen, setWasOpen] = useState(false)
  const [data, setData] = useState<LeadFormData>(emptyForm)
  const [expanded, setExpanded] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const phoneRef = useRef<HTMLInputElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const budgetRef = useRef<HTMLInputElement | null>(null)
  const [mountedAt] = useState(() => Date.now())
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])

  // Render-phase adjust: seed the draft when the modal opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && form) {
      setData(form.mode === 'edit' ? fromLead(form.lead) : emptyForm())
      setExpanded(form.mode === 'edit')
      setSubmitted(false)
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

  // Errors are shown only after the first submit attempt, then re-computed live so each clears as it is fixed.
  const errors: LeadFormErrors = submitted ? validateLeadForm(data) : {}

  const submit = async () => {
    if (!form || submittingRef.current) return
    const errs = validateLeadForm(data)
    setSubmitted(true)
    if (hasErrors(errs)) {
      // A hidden error must become visible, or the button reads as a no-op.
      if (errs.email || errs.budget || errs.startDate) setExpanded(true)
      const first = errs.name ? nameRef : errs.phone ? phoneRef : errs.email ? emailRef : errs.budget ? budgetRef : null
      if (first === emailRef || first === budgetRef) requestAnimationFrame(() => first.current?.focus())   // the section may be expanding this very tick — focus once it has mounted
      else first?.current?.focus()
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
              <Tooltip label="Close">
                <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>

            <div className={styles.body}>
              <div className={styles.section}>
                <div className={styles.fieldWrap}>
                  <TextField label="Lead name*" value={data.name} onChange={set('name')} trailingIcon={null} error={errors.name} inputRef={nameRef} />
                </div>
                <div className={styles.fieldWrap}>
                  <PhoneField value={data.phone} onChange={set('phone')} error={errors.phone} inputRef={phoneRef} />
                </div>
                <div className={styles.fieldRow}>
                  <TextField label="Lead source" mode="select" value={data.source} options={SOURCES} onChange={set('source')} />
                  <TextField label="Property type" mode="select" value={data.propertyType} options={PROPERTY_TYPES} onChange={set('propertyType')} />
                </div>
                <div className={styles.fieldWrap}>
                  <TextField label="Property address" value={data.propertyAddress} onChange={set('propertyAddress')} trailingIcon={null} />
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
                        <TextField label="Lead email" value={data.email} onChange={set('email')} trailingIcon={null}
                                   type="email" inputMode="email" error={errors.email} inputRef={emailRef} />
                        <TextField label="Lead address" value={data.leadAddress} onChange={set('leadAddress')} trailingIcon={null} />
                        <div className={styles.fieldRow}>
                          <TextField label="Estimated budget (S$)" value={data.budget} numeric="amount"
                                     onChange={set('budget')} trailingIcon={null}
                                     error={errors.budget} inputRef={budgetRef} />
                          <div className={styles.fieldWrap}>
                            <DateField label="Estimated start date" value={data.startDate}
                                       onChange={set('startDate')} today={today} error={errors.startDate} />
                          </div>
                        </div>
                        <div className={styles.fieldRow}>
                          <TextField label="Style" mode="select" value={data.style} options={STYLE_OPTIONS} onChange={set('style')} />
                          <TextField label="Key collection" mode="select" value={data.keyCollection} options={KEY_COLLECTION_OPTIONS} onChange={set('keyCollection')} />
                        </div>
                        <div className={styles.fieldRow}>
                          <TextField label="Condition" mode="select" value={data.condition} options={CONDITION_OPTIONS} onChange={set('condition')} />
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
