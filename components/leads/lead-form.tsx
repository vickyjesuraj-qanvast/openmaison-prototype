'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { AssigneeField } from './assignee-field'
import { Dialog, SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { Dropzone, FileTile, LinkButton, SectionRow } from './move-stage/fields'
import { findDuplicateLead } from '@/app/leads/actions'
import { displayCustomValue, validateCustomValue, type CustomFieldDef, type CustomValues } from '@/lib/leads/custom-fields-model'
import { DateField } from '@/components/om/date-field'
import { PortalMenu } from '@/components/om/portal-menu'
import menuStyles from '@/components/leads/menus.module.css'
import { SOURCES, PROPERTY_TYPES, DISTRICTS, STYLE_OPTIONS, KEY_COLLECTION_OPTIONS, CONDITION_OPTIONS } from '@/lib/leads/enums'
import { bottomSheet, modalPanel, overlayFade, ease, duration } from '@/lib/motion'
import { useSheetLayout } from '@/components/om/sheet'
import { BUDGET_MAX, BUDGET_MIN, EMAIL_RE, MSG, hasErrors, type FieldErrors } from '@/lib/forms'
import { parseInputDate, groupDigits, inputDate, isNric, isSgPhone, phoneDigits, phoneTyped } from '@/lib/format'
import type { Member } from '@/lib/db/schema'
import type { LeadRow } from '@/lib/leads/queries'
import styles from './lead-form.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'

/* The three option lists live in lib/leads/enums.ts since the parity round (REG-607): only 'Contemporary' / 'Collected' / 'New'
   are mock-visible; the rest came from the testers (REG-549) and from 1.0's Singapore lists. */
export const AREA_UNITS = ['sq ft', 'sq m'] as const

/* (REG-609, parity Q-28) The scripted stand-in for 1.0's AI read of a document (Auto Fill's pattern, REG-319): fixed values into the
   fields still empty, and the "document" joins the attached files. Demo values, invented for the fill. */
const DOCUMENT_FILE = 'Enquiry - Nurul Hassan.pdf'
const DOCUMENT_FILL: Partial<Record<Exclude<keyof LeadFormData, 'assignees'>, string>> = {
  name: 'Nurul Hassan', phone: '91234589', email: 'nurul.hassan@gmail.com', source: 'Website', propertyType: 'Condo 3-bedder',
  propertyAddress: 'Parc Esta, Sims Avenue', district: 'East', budget: '85,000', style: 'Scandinavian', keyCollection: 'in 3 months',
  condition: 'New', areaSize: '1100', notes: 'Website enquiry: full renovation of a 3-bedder before moving in — keys in about 3 months, likes a Scandinavian look.',
}
type Dup = NonNullable<Awaited<ReturnType<typeof findDuplicateLead>>>

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
  /** (REG-607) 1.0's Area / District, the client's IC / NRIC and the studio's customer reference. */
  district: string
  nric: string
  customerId: string
  /** Member ids (REG-231). Many-to-many, like `lead_assignees` — never a single id. */
  assignees: string[]
}

type LeadFormErrors = FieldErrors<'name' | 'phone' | 'email' | 'budget' | 'startDate' | 'assignees' | 'nric'>

/** A field the modal can be opened ON — the info column's "Add" links name the row the user actually pressed. */
export type LeadFormField = keyof LeadFormData
/** What the host holds while the modal is open: which mode, and optionally the field it was opened on. */
/** `prefill` (UX audit L11): a new lead that starts with what the host already knows — the listing's "Add lead with 9123 4599". */
export type LeadFormOpen = ({ mode: 'create'; prefill?: Partial<Pick<LeadFormData, 'phone' | 'name'>> } | { mode: 'edit'; lead: LeadRow }) & { focus?: LeadFormField }
/** Fields that live behind "Additional info": opening on one of them has to expand that section first. */
const IN_MORE: ReadonlySet<LeadFormField> = new Set<LeadFormField>([
  'email', 'leadAddress', 'budget', 'startDate', 'style', 'keyCollection', 'condition', 'areaSize', 'areaUnit', 'notes', 'nric', 'customerId',
])

const emptyForm = (): LeadFormData => ({
  name: '', phone: '', source: '', propertyType: '', propertyAddress: '',
  email: '', leadAddress: '', budget: '', startDate: '', style: '',
  keyCollection: '', condition: '', areaSize: '', areaUnit: 'sq ft', notes: '', district: '', nric: '', customerId: '', assignees: [],
})

const fromLead = (lead: LeadRow): LeadFormData => ({
  name: lead.name,
  phone: lead.phone,
  source: lead.source,
  propertyType: lead.propertyType,
  propertyAddress: lead.propertyAddress ?? '',
  email: lead.email ?? '',
  leadAddress: lead.leadAddress ?? '',
  budget: lead.budgetMinor > 0 ? groupDigits(String(Math.round(lead.budgetMinor / 100))) : '',   // (UX audit 2026-09-30, L8) an unknown budget edits as empty, never "0"
  // (REG-287) `inputDate` is the inverse of `parseInputDate` the field validates with — one d/m/yyyy formatter,
  // not this hand-rolled twin of it.
  startDate: lead.estimatedStartDate ? inputDate(lead.estimatedStartDate) : '',
  style: lead.style ?? '',
  keyCollection: lead.keyCollection ?? '',
  condition: lead.condition ?? '',
  areaSize: lead.areaSqft ? String(lead.areaSqft) : '',
  areaUnit: 'sq ft',
  notes: lead.notes ?? '',
  district: lead.area ?? '',
  nric: lead.icNumber ?? '',
  customerId: lead.customerId ?? '',
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
  if (!isSgPhone(phoneDigits(data.phone))) errors.phone = MSG.phone   // (REG-287 / REG-547) the one phone rule, not a local copy
  if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) errors.email = MSG.email
  const budgetDigits = data.budget.replace(/,/g, '').trim()
  if (budgetDigits && !/^\d+$/.test(budgetDigits)) errors.budget = MSG.number
  else if (budgetDigits && (Number(budgetDigits) < BUDGET_MIN || Number(budgetDigits) > BUDGET_MAX)) errors.budget = MSG.budgetRange   // (REG-607, parity Q-14) 1.0's bounds
  if (data.startDate.trim() && !parseInputDate(data.startDate)) errors.startDate = MSG.date
  if (data.nric.trim() && !isNric(data.nric)) errors.nric = MSG.nric   // (REG-607, parity Q-35)
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
      {/* (REG-728) A field's list takes its field's width (the menu scale; it was a lone 96), and the current unit wears the Selected
          fill, as TextField's own option rows do. */}
      <PortalMenu open={unitOpen} anchor={box} onClose={() => setUnitOpen(false)} align="right">
        {AREA_UNITS.map((u) => (
          <button key={u} type="button" role="option" aria-selected={u === unit} className={menuStyles.item}
                  data-selected={u === unit || undefined}
                  onClick={() => { onUnitChange(u); setUnitOpen(false) }}>
            {u}
          </button>
        ))}
      </PortalMenu>
    </>
  )
}

export function LeadFormModal({
  form, team, onClose, onSubmit, now, sources = SOURCES, assignable = null, selfAssign = null, onOpenExisting, customFields = [], customValues,
}: {
  /** (REG-612, parity Q-25) The studio's active custom fields, rendered in Additional info; `customValues` seeds an edit. */
  customFields?: CustomFieldDef[]
  customValues?: CustomValues
  /** (REG-609, parity C-07) A Designer creating a lead: pre-ticked and locked to them. */
  selfAssign?: { id: string } | null
  /** (REG-609, parity Q-18) The duplicate dialog's "Open existing lead" — the host closes the form and navigates. */
  onOpenExisting?: (leadId: string) => void
  /** (REG-601) The members this viewer may assign — the Assign member field offers these; null = everyone. */
  assignable?: string[] | null
  /** (REG-599) The studio's live lead sources (Settings › Leads), the lead's own retired one kept first; the enum when the caller has none. */
  sources?: readonly string[]
  /** The studio's members, for the Assign member field (REG-231). */
  team: Member[]
  /** `focus` opens the modal on that field — the user pressed "Add" on one row, not "Edit lead" (user 2026-08-31). */
  form: LeadFormOpen | null
  onClose: () => void
  /** Return false when the save failed (the modal stays open for retry). */
  /** `extras.files` (REG-609, parity C-08): the documents attached on creation, by name. */
  onSubmit: (mode: 'create' | 'edit', data: LeadFormData, leadId?: string, extras?: { files: string[]; customValues: CustomValues }) => boolean | Promise<boolean>
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
  /* (REG-609) Round 3 of the parity programme: the attached documents, the scripted document fill, the duplicate dialog. */
  const [files, setFiles] = useState<string[]>([])
  const [fillOpen, setFillOpen] = useState(false)
  const [dup, setDup] = useState<Dup | null>(null)
  const [custom, setCustom] = useState<CustomValues>({})   /* (REG-612) the custom fields' values */
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [mountedAt] = useState(() => Date.now())
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])

  // Render-phase adjust: seed the draft when the modal opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && form) {
      setData(form.mode === 'edit' ? fromLead(form.lead) : { ...emptyForm(), ...(selfAssign ? { assignees: [selfAssign.id] } : {}), ...(form.prefill ?? {}) })   // (REG-609) a Designer's lead is theirs · (UX audit L11) the host's prefill
      setFiles([]); setFillOpen(false); setDup(null)
      setCustom(form.mode === 'edit' ? { ...(customValues ?? {}) } : {})
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
    /* (REG-612) A required custom field is a field like any other: the section opens on it and the save waits. */
    if (customFields.some((f) => validateCustomValue(f, custom[f.id]))) { setExpanded(true); if (!hasErrors(errs)) return }
    if (hasErrors(errs)) {
      // A hidden error must become visible, or the button reads as a no-op.
      if (errs.email || errs.budget || errs.startDate) setExpanded(true)
      const first = errs.name ? nameRef : errs.phone ? phoneRef : errs.assignees ? assigneeRef : errs.email ? emailRef : errs.budget ? budgetRef : null
      if (first === emailRef || first === budgetRef) requestAnimationFrame(() => first.current?.focus())   // the section may be expanding this very tick — focus once it has mounted
      else first?.current?.focus()
      return
    }
    /* (REG-609, parity Q-18) The duplicate pre-check — 1.0's dup-check before save, fail-open: a live lead with this phone or
       email stops the save with a choice (Open existing lead · Create anyway). An edit never checks. */
    if (form.mode === 'create') {
      submittingRef.current = true; setSubmitting(true)
      const hit = await findDuplicateLead({ phone: data.phone, email: data.email }).catch(() => null)
      submittingRef.current = false; setSubmitting(false)
      if (hit) { setDup(hit); return }
    }
    await persist()
  }
  const persist = async () => {
    if (!form) return
    submittingRef.current = true
    setSubmitting(true)
    const ok = await onSubmit(form.mode, data, form.mode === 'edit' ? form.lead.id : undefined, { files, customValues: custom })
    setSubmitting(false)
    // On success the modal is closing: keep the ref set so clicks landing on
    // the exiting tree can't re-submit; it resets when the modal next opens.
    if (ok === false) submittingRef.current = false
  }
  /* (REG-609, parity Q-28) Fill from a document: the fixed values land only where the field is still empty (1.0's rule), the
     "document" is attached, and Additional info opens so the filled fields are in view. */
  const fillFromDocument = () => {
    setFillOpen(false)
    setData((d) => {
      const next: Record<string, unknown> = { ...d }
      for (const [k, v] of Object.entries(DOCUMENT_FILL)) if (!String(next[k] ?? '').trim()) next[k] = v
      return next as LeadFormData
    })
    setFiles((fs) => (fs.includes(DOCUMENT_FILE) ? fs : [...fs, DOCUMENT_FILE]))
    setExpanded(true)
  }
  const dialogs = (
    <>
      <Dialog open={fillOpen} onClose={() => setFillOpen(false)} title="Fill from a document" width={400} size="compact" nested portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setFillOpen(false)}>Cancel</Button>
                       <Button onPress={fillFromDocument}>Upload</Button></>}>
        <Dropzone title={<>Drop in the document or <b>browse</b></>}
                  helper="An enquiry email, a PDF or a screenshot — the details fill the empty fields, and the file is attached to the lead."
                  onPick={() => fillFromDocument()} accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx" />
      </Dialog>
      <Dialog open={!!dup} onClose={() => setDup(null)} title={dup?.matchedOn === 'email' ? 'A lead with this email already exists' : 'A lead with this phone already exists'} width={400} size="form" alert nested portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => { const id = dup?.id; setDup(null); if (id) onOpenExisting?.(id) }}>Open existing lead</Button>
                       <Button onPress={() => { setDup(null); void persist() }}>Create anyway</Button></>}>
        {dup ? <p className={styles.dupText} data-testid="duplicate-lead"><b>{dup.name}</b> · {phoneTyped(dup.phone)}{dup.email ? ` · ${dup.email}` : ''} · {dup.stage}</p> : null}
        <span className={styles.helper}>Open it to work the existing lead, or create this one anyway.</span>
      </Dialog>
    </>
  )

  return (
    <>
    <AnimatePresence>
      {open && form ? (
        <motion.div
          className={styles.overlay}
          variants={overlayFade} initial="initial" animate="animate" exit="exit"
          /* (REG-321, user 2026-09-02) No scrim dismiss here: the lead form holds the lead's own details, so only the X, Cancel
             or Escape close it — a stray click outside must never throw a half-filled form away. */
        >
          <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel} role="dialog" aria-modal tabIndex={-1}
                      aria-label={form.mode === 'create' ? 'Create New Lead' : 'Edit Lead'}>
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            {/* (REG-725) the house head and foot (components/om/dialog.tsx), on the house panel */}
            <SurfaceHead title={form.mode === 'create' ? 'Create New Lead' : 'Edit Lead'} onClose={onClose} className={styles.heading} />

            <div ref={scrollRef} className={styles.body}>
              <div className={styles.section}>
                {form.mode === 'create' ? (
                  /* (REG-609, parity Q-28) The scripted stand-in for 1.0's document read — Auto Fill's sparkle and words. */
                  <div className={styles.fillRow}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <LinkButton leading={<img src="/figma-assets/brief-sparkle.svg" alt="" />} onClick={() => setFillOpen(true)}>Fill from a document</LinkButton>
                  </div>
                ) : null}
                <div className={styles.fieldWrap} data-field="name">
                  <TextField label="Lead name" required value={data.name} onChange={set('name')} trailingIcon={null} error={errors.name} inputRef={nameRef} />
                </div>
                <div className={styles.fieldWrap} data-field="phone">
                  <PhoneField value={data.phone} onChange={set('phone')} error={errors.phone} inputRef={phoneRef} />
                </div>
                <div className={styles.fieldRow} data-field="source">
                  <TextField label="Lead source" mode="select" value={data.source} options={data.source && !sources.includes(data.source) ? [data.source, ...sources] : sources} onChange={set('source')} />   {/* (REG-599) */}
                  <TextField label="Property type" mode="select" value={data.propertyType} options={PROPERTY_TYPES} onChange={set('propertyType')} />
                </div>
                <div className={styles.fieldWrap} data-field="propertyAddress">
                  <TextField label="Property address" value={data.propertyAddress} onChange={set('propertyAddress')} trailingIcon={null} />
                  <span className={styles.helper}>Client project address.</span>
                </div>
                {/* (REG-607, parity Q-12) 1.0's Area / District — Singapore's five regions; it also feeds the members' lead preferences. */}
                <div className={styles.fieldWrap} data-field="district">
                  <TextField label="District" mode="select" value={data.district} options={DISTRICTS} onChange={set('district')} />
                </div>
                {/* Assign member (REG-231) — after Property address, per the request. Carries its own data-field. */}
                <AssigneeField team={assignable ? team.filter((m) => assignable.includes(m.id) || data.assignees.includes(m.id)) : team} value={data.assignees} onChange={set('assignees')}
                               error={errors.assignees} inputRef={assigneeRef}
                               locked={selfAssign && form.mode === 'create' ? 'This lead will be assigned to you. Your manager routes leads to teammates.' : undefined} />   {/* (REG-609, parity C-07) 1.0's lock note */}
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
                        {/* (REG-607, parity Q-35) 1.0 keeps the client's IC and the studio's own reference on the lead; every new quote starts with them. */}
                        <div className={styles.fieldRow} data-field="nric">
                          <TextField label="NRIC / FIN" value={data.nric} onChange={(v) => set('nric')(v.toUpperCase())} maxLength={12} trailingIcon={null} error={errors.nric} />
                          <TextField label="Customer ID" value={data.customerId} onChange={set('customerId')} maxLength={60} trailingIcon={null} />
                        </div>
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
                              The helper used to say these appear on the Notes page; they do not, and never did.
                              (REG-729) The field names itself, as every field in this form: "Remarks" is its label — resting where the
                              placeholder sat while empty, on the border once filled — not a placeholder with a hidden name. */}
                          <TextArea label="Remarks" value={data.notes}
                                    onChange={(v: string) => set('notes')(v)} className={styles.notes} />
                          <span className={styles.helper}>Shown under Other info on the lead’s Overview.</span>
                        </div>
                        {customFields.length ? (
                          /* (REG-612, parity Q-25) The studio's own fields, each on the DS field its type asks for. */
                          <div className={styles.fieldWrap} data-field="customFields">
                            <span className={styles.customTitle}>Custom fields</span>
                            <div className={styles.customList}>
                              {customFields.map((f) => (
                                <CustomFieldInput key={f.id} def={f} value={custom[f.id]} today={today} error={submitted ? validateCustomValue(f, custom[f.id]) : undefined}
                                                  onChange={(v) => setCustom((c) => ({ ...c, [f.id]: v }))} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {form.mode === 'create' ? (
                          /* (REG-609, parity C-08) Documents at creation — the Move stage window's Attach row; each file lands in the Files tab with the lead. */
                          <div className={styles.fieldWrap} data-field="files">
                            <SectionRow label="Attach files (optional)" action={<LinkButton icon="attach_file" onClick={() => fileInput.current?.click()}>Attach</LinkButton>} />
                            <input ref={fileInput} type="file" multiple hidden aria-hidden tabIndex={-1}
                                   onChange={(e) => { const names = Array.from(e.target.files ?? []).map((f) => f.name); e.target.value = ''; if (names.length) setFiles((fs) => [...fs, ...names.filter((n) => !fs.includes(n))]) }} />
                            {files.length ? (
                              <div className={styles.tiles} data-testid="attached-files">
                                {files.map((f) => <FileTile key={f} name={f} kind={/\.pdf$/i.test(f) ? 'pdf' : 'image'} onDelete={() => setFiles((fs) => fs.filter((x) => x !== f))} />)}
                              </div>
                            ) : null}
                            <span className={styles.helper}>They appear in the lead’s Files tab.</span>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={submitting}>Cancel</Button>
              <Button onPress={() => { void submit() }} isDisabled={submitting}>{form.mode === 'create' ? 'Create' : 'Save'}</Button>
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    {dialogs}
    </>
  )
}

/** (REG-612) One custom field on the DS field its type asks for: text · number (digits) · date (the picker) · dropdown (a select) · multi select (chips). */
function CustomFieldInput({ def, value, onChange, error, today }: { def: CustomFieldDef; value: string | string[] | undefined; onChange: (v: string | string[]) => void; error?: string; today: Date }) {
  const str = Array.isArray(value) ? '' : (value ?? '')
  const list = Array.isArray(value) ? value : []
  const label = def.label
  switch (def.fieldType) {
    case 'number': return <div data-field={`custom-${def.id}`}><TextField label={label} required={def.isRequired} value={str} numeric="digits" maxLength={12} trailingIcon={null} error={error} onChange={onChange} /></div>
    case 'date': return <div data-field={`custom-${def.id}`}><DateField label={label} required={def.isRequired} value={str} today={today} error={error} onChange={onChange} /></div>
    case 'dropdown': return <div data-field={`custom-${def.id}`}><TextField label={label} required={def.isRequired} mode="select" options={def.options} value={str} error={error} onChange={onChange} /></div>
    case 'multi_select': return (
      <div data-field={`custom-${def.id}`} className={styles.customChips}>
        <span className={styles.customLabel}>{label}{def.isRequired ? '*' : ''}</span>
        <Chips multiple label={label} options={def.options} value={list} onChange={onChange} />   {/* (REG-614) the house chips */}
        {error ? <span className={styles.chipError} role="alert">{error}</span> : <span className={styles.helper}>{displayCustomValue(def, list) === '—' ? 'Pick any that apply.' : displayCustomValue(def, list)}</span>}
      </div>
    )
    default: return <div data-field={`custom-${def.id}`}><TextField label={label} required={def.isRequired} value={str} maxLength={300} trailingIcon={null} error={error} onChange={onChange} /></div>
  }
}
