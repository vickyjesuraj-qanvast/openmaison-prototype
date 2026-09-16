'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { TextField } from '@/components/om/text-field'
import { AssigneeField } from './assignee-field'
import { DateField } from '@/components/om/date-field'
import { PortalMenu } from '@/components/om/portal-menu'
import menuStyles from '@/components/leads/menus.module.css'
import { SOURCES, PROPERTY_TYPES } from '@/lib/leads/enums'
import { bottomSheet, modalPanel, overlayFade, ease, duration } from '@/lib/motion'
import { useSheetLayout } from '@/components/om/sheet'
import { EMAIL_RE, MSG, hasErrors, type FieldErrors } from '@/lib/forms'
import { parseInputDate, groupDigits, inputDate, phoneDigits, phoneTyped } from '@/lib/format'
import type { Member } from '@/lib/db/schema'
import type { LeadRow } from '@/lib/leads/queries'
import styles from './lead-form.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
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
  /** Member ids (REG-231). Many-to-many, like `lead_assignees` — never a single id. */
  assignees: string[]
}

type LeadFormErrors = FieldErrors<'name' | 'phone' | 'email' | 'budget' | 'startDate' | 'assignees'>

/** A field the modal can be opened ON — the info column's "Add" links name the row the user actually pressed. */
export type LeadFormField = keyof LeadFormData
/** What the host holds while the modal is open: which mode, and optionally the field it was opened on. */
export type LeadFormOpen = ({ mode: 'create' } | { mode: 'edit'; lead: LeadRow }) & { focus?: LeadFormField }
/** Fields that live behind "Additional info": opening on one of them has to expand that section first. */
const IN_MORE: ReadonlySet<LeadFormField> = new Set<LeadFormField>([
  'email', 'leadAddress', 'budget', 'startDate', 'style', 'keyCollection', 'condition', 'areaSize', 'areaUnit', 'notes',
])

const emptyForm = (): LeadFormData => ({
  name: '', phone: '', source: '', propertyType: '', propertyAddress: '',
  email: '', leadAddress: '', budget: '', startDate: '', style: '',
  keyCollection: '', condition: '', areaSize: '', areaUnit: 'sq ft', notes: '', assignees: [],
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
  // (REG-287) `inputDate` is the inverse of `parseInputDate` the field validates with — one d/m/yyyy formatter,
  // not this hand-rolled twin of it.
  startDate: lead.estimatedStartDate ? inputDate(lead.estimatedStartDate) : '',
  style: lead.style ?? '',
  keyCollection: lead.keyCollection ?? '',
  condition: lead.condition ?? '',
  areaSize: lead.areaSqft ? String(lead.areaSqft) : '',
  areaUnit: 'sq ft',
  notes: lead.notes ?? '',
  assignees: lead.assignees.map((m) => m.id),   // the only place edit mode learns the lead's current owners
})

/**
 * Pure validation — required fields are exactly the mock's starred ones (Lead name*, Lead phone number*).
 * `requireAssignee` closes the door REG-130 already guards elsewhere: past New a lead must keep an owner, which the
 * Assign popover enforces (`requireOne`). Without it the form would be a second way to clear the last one.
 */
export function validateLeadForm(data: LeadFormData, requireAssignee = false): LeadFormErrors {
  const errors: LeadFormErrors = {}
  if (requireAssignee && data.assignees.length === 0) errors.assignees = MSG.assignee
  if (!data.name.trim()) errors.name = MSG.required
  if (phoneDigits(data.phone).length !== 8) errors.phone = MSG.phone   // (REG-287) the one phone rule, not a local copy
  if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) errors.email = MSG.email
  const budgetDigits = data.budget.replace(/,/g, '').trim()
  if (budgetDigits && !/^\d+$/.test(budgetDigits)) errors.budget = MSG.number
  if (data.startDate.trim() && !parseInputDate(data.startDate)) errors.startDate = MSG.date
  return errors
}

/* Phone field: "+65 | divider | digits" per 779:24644 — a TextField with a leading prefix.
   (REG-287) The box holds the STORED 8-digit local number, so what a person pastes has to be reduced to it by the
   app's one phone rule: `digitsOnly(v).slice(0, 8)` turned a pasted "+65 9123 4567" into "65912345" — the country
   code ate the number. `maxLength` is gone with it: the browser truncated a paste to 8 raw characters ("+65 9123")
   before `phoneDigits` could ever see the country code. Typing is still capped at 8 by the slice below, so the
   value the field can hold is unchanged. The box SHOWS the digits grouped as they are typed — "9123 4", "9123 4567"
   (REG-456, user feedback 2026-09-16) — while `value` stays the bare digits the rule above produces. */
function PhoneField({ value, onChange, error, inputRef }: {
  value: string; onChange: (v: string) => void; error?: string; inputRef?: RefObject<HTMLInputElement | null>
}) {
  return (
    <TextField
      label="Lead phone number" required value={phoneTyped(value)} error={error} inputRef={inputRef}   /* (REG-456) shown "9123 4567", stored "91234567" */
      type="tel" inputMode="tel" numeric="digits" trailingIcon={null}
      leading={<span className={styles.prefix}>+65<span className={styles.divider} /></span>}
      onChange={(v) => onChange(phoneDigits(v).slice(0, 8))}
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
  form, team, onClose, onSubmit, now,
}: {
  /** The studio's members, for the Assign member field (REG-231). */
  team: Member[]
  /** `focus` opens the modal on that field — the user pressed "Add" on one row, not "Edit lead" (user 2026-08-31). */
  form: LeadFormOpen | null
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
  const assigneeRef = useRef<HTMLInputElement | null>(null)
  const [mountedAt] = useState(() => Date.now())
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])

  // Render-phase adjust: seed the draft when the modal opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && form) {
      setData(form.mode === 'edit' ? fromLead(form.lead) : emptyForm())
      setExpanded(form.mode === 'edit' || (form.focus ? IN_MORE.has(form.focus) : false))
      setSubmitted(false)
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (open) submittingRef.current = false
  }, [open])

  /*
   * Open ON a field. Pressing "Add" beside Property address means "let me fill that", not "here are fifteen fields,
   * find it" — so the modal scrolls that row into view and puts the caret in it. A new lead has no such target, so it
   * opens on its first field for the same reason (user 2026-08-31). Two frames: one for the modal's entrance, one for
   * "Additional info" to finish expanding when the target lives inside it.
   */
  const focusTarget: LeadFormField | null = form ? form.focus ?? (form.mode === 'create' ? 'name' : null) : null
  useEffect(() => {
    if (!open || !focusTarget) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const host = document.querySelector(`[role="dialog"] [data-field="${focusTarget}"]`)
        if (!host) return
        const el = host.querySelector<HTMLElement>('input:not([type="hidden"]), textarea')
        host.scrollIntoView({ block: 'center' })
        el?.focus()
      })
    })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [open, focusTarget])

  /* (REG-287) `aria-modal` promises the page behind is inert, so this panel owes the WAI-ARIA dialog contract:
     focus moves in on open, Tab and Shift+Tab cycle inside it instead of walking into the listing underneath, and
     focus returns to whatever opened it on close. Esc rides the shared layer policy — the source / property-type
     PortalMenu and the date picker each render after this panel and own Esc first, which is what the hand-rolled
     `!e.defaultPrevented` listener this replaces was reaching for. */
  const panel = useRef<HTMLDivElement>(null)
  /* (REG-353) ≤767 this modal is the canvas' bottom sheet: it rises off the bottom edge and wears the grabber. */
  const sheet = useSheetLayout()
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  const set = <K extends keyof LeadFormData>(k: K) => (v: LeadFormData[K]) =>
    setData((d) => ({ ...d, [k]: v }))

  // Errors are shown only after the first submit attempt, then re-computed live so each clears as it is fixed.
  // Past New, the lead must keep an owner — the same gate the Assign popover applies (REG-130).
  const requireAssignee = !!form && form.mode === 'edit' && form.lead.stage !== 'New'
  const errors: LeadFormErrors = submitted ? validateLeadForm(data, requireAssignee) : {}

  const submit = async () => {
    if (!form || submittingRef.current) return
    const errs = validateLeadForm(data, requireAssignee)
    setSubmitted(true)
    if (hasErrors(errs)) {
      // A hidden error must become visible, or the button reads as a no-op.
      if (errs.email || errs.budget || errs.startDate) setExpanded(true)
      const first = errs.name ? nameRef : errs.phone ? phoneRef : errs.assignees ? assigneeRef : errs.email ? emailRef : errs.budget ? budgetRef : null
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
          /* (REG-321, user 2026-09-02) No scrim dismiss here: the lead form holds the lead's own details, so only the X, Cancel
             or Escape close it — a stray click outside must never throw a half-filled form away. */
        >
          <motion.div ref={panel} className={styles.panel} variants={sheet ? bottomSheet : modalPanel} role="dialog" aria-modal tabIndex={-1}
                      /* focus lands on the panel on open; the ring belongs to its controls (om/dialog.module.css) */
                      style={{ outline: 'none' }}
                      aria-label={form.mode === 'create' ? 'Create New Lead' : 'Edit Lead'}>
            {sheet ? <span className={styles.grabber} aria-hidden /> : null}
            <div className={styles.heading}>
              <span className={styles.title}>{form.mode === 'create' ? 'Create New Lead' : 'Edit Lead'}</span>
              <Tooltip label="Close">
                <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>

            <div ref={scrollRef} className={styles.body}>
              <div className={styles.section}>
                <div className={styles.fieldWrap} data-field="name">
                  <TextField label="Lead name" required value={data.name} onChange={set('name')} trailingIcon={null} error={errors.name} inputRef={nameRef} />
                </div>
                <div className={styles.fieldWrap} data-field="phone">
                  <PhoneField value={data.phone} onChange={set('phone')} error={errors.phone} inputRef={phoneRef} />
                </div>
                <div className={styles.fieldRow} data-field="source">
                  <TextField label="Lead source" mode="select" value={data.source} options={SOURCES} onChange={set('source')} />
                  <TextField label="Property type" mode="select" value={data.propertyType} options={PROPERTY_TYPES} onChange={set('propertyType')} />
                </div>
                <div className={styles.fieldWrap} data-field="propertyAddress">
                  <TextField label="Property address" value={data.propertyAddress} onChange={set('propertyAddress')} trailingIcon={null} />
                  <span className={styles.helper}>Client project address.</span>
                </div>
                {/* Assign member (REG-231) — after Property address, per the request. Carries its own data-field. */}
                <AssigneeField team={team} value={data.assignees} onChange={set('assignees')}
                               error={errors.assignees} inputRef={assigneeRef} />
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
                        <div className={styles.fieldWrap} data-field="email"><TextField label="Lead email" value={data.email} onChange={set('email')} trailingIcon={null}
                                   type="email" inputMode="email" error={errors.email} inputRef={emailRef} /></div>
                        <div className={styles.fieldWrap} data-field="leadAddress"><TextField label="Lead address" value={data.leadAddress} onChange={set('leadAddress')} trailingIcon={null} /></div>
                        <div className={styles.fieldRow} data-field="budget">
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
                        <div className={styles.fieldWrap} data-field="notes">
                          {/* "Remarks" (user 2026-08-31): the mock types "Notes", which collided with the Notes tab —
                              a different record entirely (lead_notes). The DS TextArea at the mock's 96px
                              (page-checklist › Fields: never a raw input) — lead-form.module.css .notes.
                              The helper used to say these appear on the Notes page; they do not, and never did. */}
                          <TextArea aria-label="Remarks" placeholder="Remarks" value={data.notes}
                                    onChange={(v: string) => set('notes')(v)} className={styles.notes} />
                          <span className={styles.helper}>Shown under Other info on the lead’s Overview.</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div className={styles.footer} data-shadow={bodyScrolls || undefined}>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={submitting}>Cancel</Button>
              <Button onPress={() => { void submit() }} isDisabled={submitting}>{form.mode === 'create' ? 'Create' : 'Save'}</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
