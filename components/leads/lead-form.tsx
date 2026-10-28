'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
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
import { SOURCES, PROPERTY_TYPES, DISTRICTS, STYLE_OPTIONS, KEY_COLLECTION_OPTIONS, CONDITION_OPTIONS, isCommercialType } from '@/lib/leads/enums'
import { bottomSheet, modalPanel, overlayFade, ease, duration } from '@/lib/motion'
import { usePhoneLayout } from '@/components/leads/log/use-move-layout'
import { MSG, hasErrors } from '@/lib/forms'
import { groupDigits, inputDate, phoneDigits, phoneTyped } from '@/lib/format'
import type { Member } from '@/lib/db/schema'
import type { LeadRow } from '@/lib/leads/queries'
import { NAME_MAX, PROJECT_TYPES, ROOMS } from '@/lib/projects/model'
import styles from './lead-form.module.css'
import { validateLeadForm, type LeadFormData, type LeadFormErrors } from '@/lib/leads/lead-input'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { CORE_FIELDS, DOCUMENT_ACCEPT, FILL_FIELDS, fieldList, readLeadDocument, unreadWords, type DocumentRead, type FillField } from '@/lib/leads/document-fill'
import { readLeadMessage } from '@/lib/leads/message-fill'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { IconButton } from '@/components/om/icon-button'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'

/* The three option lists live in lib/leads/enums.ts since the parity round (REG-607): only 'Contemporary' / 'Collected' / 'New'
   are mock-visible; the rest came from the testers (REG-549) and from 1.0's Singapore lists. */
export const AREA_UNITS = ['sq ft', 'sq m'] as const
/* (pending modules S41b-3) the form's details and its validation live in lib/leads/lead-input.ts (the trial's server checks them too) — named here as before */
export { validateLeadForm }
export type { LeadFormData }

/* (REG-609, parity Q-28) Fill from a document — (S42F) now the picked file's OWN words, read by rule in the browser (lib/leads/document-fill.ts):
   what it plainly names lands in the fields still empty (1.0's rule), the file joins the attached files, and one line says what filled and
   what wasn't found. It used to fill one fixed sample lead whatever file was picked (the audit's E-05 family). */
type Dup = NonNullable<Awaited<ReturnType<typeof findDuplicateLead>>>


/** A field the modal can be opened ON — the info column's "Add" links name the row the user actually pressed. */
export type LeadFormField = keyof LeadFormData
/** (parity P-09) A project's Edit details: the lead form's field block as it is, then the project's own section — its name, type and rooms. */
export type ProjectFormValues = { name: string; projectType: string; scope: string[] }
export type ProjectFormField = 'projectName' | 'projectType' | 'scope'
/** What the host holds while the modal is open: which mode, and optionally the field it was opened on. */
/** `prefill` (UX audit L11): a new lead that starts with what the host already knows — the listing's "Add lead with 9123 4599". */
/** (pending modules S05) …and Maison AI's "Add a lead for Mrs Chua, 9123 4567, HDB 4-Room, budget 80k, from Instagram": the form opens filled in. */
export type LeadFormOpen = ({ mode: 'create'; prefill?: Partial<Pick<LeadFormData, 'phone' | 'name' | 'propertyType' | 'budget' | 'source' | 'email'>> } | { mode: 'edit'; lead: LeadRow }) & { focus?: LeadFormField | ProjectFormField }
/** Fields that live behind "Additional info": opening on one of them has to expand that section first. */
const IN_MORE: ReadonlySet<LeadFormField> = new Set<LeadFormField>([
  'email', 'leadAddress', 'budget', 'startDate', 'style', 'keyCollection', 'condition', 'areaSize', 'areaUnit', 'notes', 'nric', 'customerId',
  'client2Name', 'client2Nric', 'client2Phone',   // (pending modules S05)
])

/** (Leads on the move, L3 — P-08 · B-21) Edit details on a phone or a tablet is a short list — each row one screen of the form. */
type FormSection = 'contact' | 'property' | 'budget' | 'people' | 'custom' | 'project'
const SECTION_LABEL: Record<FormSection, string> = { contact: 'Contact', property: 'Property', budget: 'Budget & source', people: 'Members', custom: 'Custom fields', project: 'Project' }   // (the calm UI build — T-01) Members, never People
const SECTION_OF: Record<string, FormSection> = {
  name: 'contact', phone: 'contact', email: 'contact', leadAddress: 'contact', nric: 'contact', customerId: 'contact', companyName: 'contact', companyUen: 'contact', client2Name: 'contact', client2Nric: 'contact', client2Phone: 'contact',
  propertyType: 'property', propertyAddress: 'property', district: 'property', style: 'property', keyCollection: 'property', condition: 'property', areaSize: 'property', areaUnit: 'property',
  source: 'budget', budget: 'budget', startDate: 'budget', notes: 'budget',
  assignees: 'people', customFields: 'custom', projectName: 'project', projectType: 'project', scope: 'project',
}
/** The section a field lives in on the short list (a custom field's own key lands in Custom fields). */
const sectionOf = (field: string): FormSection => SECTION_OF[field] ?? (field.startsWith('custom') ? 'custom' : 'contact')
/** The order a submit looks for the first error in — the form's own order. */
const ERROR_ORDER = ['name', 'phone', 'companyUen', 'email', 'nric', 'client2Name', 'client2Nric', 'client2Phone', 'budget', 'startDate', 'assignees'] as const
/** (P-08) On a phone's new lead these fold under More details too (the desk shows them under the phone). */
const PHONE_MORE: ReadonlySet<string> = new Set(['source', 'propertyType', 'propertyAddress', 'district', 'companyName', 'companyUen'])

const emptyForm = (): LeadFormData => ({
  name: '', phone: '', source: '', propertyType: '', propertyAddress: '',
  email: '', leadAddress: '', budget: '', startDate: '', style: '',
  keyCollection: '', condition: '', areaSize: '', areaUnit: 'sq ft', notes: '', district: '', nric: '', customerId: '',
  companyName: '', companyUen: '', client2Name: '', client2Nric: '', client2Phone: '', assignees: [],
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
  companyName: lead.companyName ?? '', companyUen: lead.companyUen ?? '',   // (pending modules S05)
  client2Name: lead.client2Name ?? '', client2Nric: lead.client2Nric ?? '', client2Phone: lead.client2Phone ?? '',
  assignees: lead.assignees.map((m) => m.id),   // the only place edit mode learns the lead's current owners
})


/* Phone field: "+65 | divider | digits" per 779:24644 — a TextField with a leading prefix.
   (REG-287) The box holds the STORED 8-digit local number, so what a person pastes has to be reduced to it by the
   app's one phone rule: `digitsOnly(v).slice(0, 8)` turned a pasted "+65 9123 4567" into "65912345" — the country
   code ate the number. `maxLength` is gone with it: the browser truncated a paste to 8 raw characters ("+65 9123")
   before `phoneDigits` could ever see the country code. Typing is still capped at 8 by the slice below, so the
   value the field can hold is unchanged. The box SHOWS the digits grouped as they are typed — "9123 4", "9123 4567"
   (REG-456, user feedback 2026-09-16) — while `value` stays the bare digits the rule above produces. */
export function PhoneField({ value, onChange, error, inputRef, label = 'Mobile number', required = true, autoComplete = 'tel' }: {
  value: string; onChange: (v: string) => void; error?: string; inputRef?: RefObject<HTMLInputElement | null>
  /** (Leads on the move, A-18) the browser's autofill hint — a phone's own number; "off" where the number is someone else's to type */
  autoComplete?: string
  /** (REG-927) New project's "Client's phone number" — the same field. */
  label?: string
  /** (pending modules S05) the second client's mobile is optional */
  required?: boolean
}) {
  return (
    <TextField
      label={label} required={required} value={phoneTyped(value)} error={error} inputRef={inputRef}   /* (REG-456) shown "9123 4567", stored "91234567" */
      type="tel" inputMode="tel" numeric="digits" trailingIcon={null} autoComplete={autoComplete}   /* (leads on the move, A-18) the phone's own number pad and autofill */
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

/** (REG-902, Dane UAT 4.03) "Open existing lead" opens it in a new browser tab — on the press itself, so no popup blocker eats it — and the
    form stays open with what was typed, for the next lead in a run of manual adds. Supersedes REG-609's "closes the form and opens it". */
const openInNewTab = (leadId: string) => { window.open(`/leads/${leadId}`, '_blank', 'noopener') }

export function LeadFormModal({
  form, team, onClose, onSubmit, now, sources = SOURCES, assignable = null, selfAssign = null, customFields = [], customValues, project, trial = false, suggest,
}: {
  /** (Leads on the move, L3 — P-08) The member the studio's rules suggest for this new lead (REG-612's scorer, `suggestMember`) — the Assign
   *  field's card, and on a phone a line under it. Absent, no suggestion. */
  suggest?: (d: LeadFormData) => { id: string; name: string; reason: string } | null
  /** (pending modules S41b-3) The website's no-account trial: the same form for someone with no studio — no Assign member (no team), no
   *  duplicate check (it would read a studio's leads), no Fill from a document or Attach files (nothing to keep a file in until they sign up). */
  trial?: boolean
  /** (parity P-09 · D-08, the owner's pick 2026-10-08) A project's Edit details: the same form on the project's lead — titled "Edit details",
   *  with the project's own section (name · type · rooms) after Additional info, handed back as `extras.project`. Absent, the lead's form is
   *  exactly as before. */
  project?: { name: string; projectType: string | null; scope: readonly string[] }
  /** (REG-612, parity Q-25) The studio's active custom fields, rendered in Additional info; `customValues` seeds an edit. */
  customFields?: CustomFieldDef[]
  customValues?: CustomValues
  /** (REG-609, parity C-07) A Designer creating a lead: pre-ticked and locked to them. */
  selfAssign?: { id: string } | null
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
  onSubmit: (mode: 'create' | 'edit', data: LeadFormData, leadId?: string, extras?: { files: string[]; customValues: CustomValues; /** (gaps build E, item 1) the picked files themselves, so the host uploads their bytes once the lead exists */ picked?: File[]; /** (parity P-09) a project's own fields */ project?: ProjectFormValues }) => boolean | Promise<boolean>
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
  /* (REG-609) Round 3 of the parity programme: the attached documents, Fill from a document (S42F: it reads the picked file by rule —
     lib/leads/document-fill.ts), the duplicate dialog. (S43D, F2-03) */
  const [files, setFiles] = useState<string[]>([])
  const [picked, setPicked] = useState<File[]>([])   // (gaps build E, item 1) the files behind the names, uploaded with their bytes
  const [fillOpen, setFillOpen] = useState(false)
  const [fillBusy, setFillBusy] = useState<string | null>(null)   // (S42F) the file being read
  const [fillError, setFillError] = useState<string | null>(null)   // (S42F) why it filled nothing — the dialog stays open
  const [fillNote, setFillNote] = useState<string | null>(null)   // (S42F) what the read filled, under the link
  const docInput = useRef<HTMLInputElement | null>(null)
  const [dup, setDup] = useState<Dup | null>(null)
  const [custom, setCustom] = useState<CustomValues>({})   /* (REG-612) the custom fields' values */
  const [proj, setProj] = useState<ProjectFormValues>({ name: '', projectType: PROJECT_TYPES[0], scope: [] })   /* (parity P-09) */
  const [second, setSecond] = useState(false)   /* (pending modules S05 — testers' L-4) the second client's fields, shown once added (or filled) */
  /* (Leads on the move, L3 — P-08 · A-17 · A-19 · B-21) ≤1024: a pasted message fills the form, Edit details is a short list; at every width ✕
     asks before it throws typed words away. */
  const touch = useMediaQuery(TABLET_DOWN)
  const [seedKey, setSeedKey] = useState('')
  const [askDiscard, setAskDiscard] = useState(false)
  const [section, setSection] = useState<FormSection | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteBusy, setPasteBusy] = useState(false)
  const projectNameRef = useRef<HTMLInputElement | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [mountedAt] = useState(() => Date.now())
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])

  // Render-phase adjust: seed the draft when the modal opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && form) {
      const seed = form.mode === 'edit' ? fromLead(form.lead) : { ...emptyForm(), ...(selfAssign ? { assignees: [selfAssign.id] } : {}), ...(form.prefill ?? {}) }
      setData(seed)   // (REG-609) a Designer's lead is theirs · (UX audit L11) the host's prefill
      setSecond(!!(seed.client2Name || seed.client2Nric || seed.client2Phone) || form.focus === 'client2Name')   // (pending modules S05)
      setFiles([]); setPicked([]); setFillOpen(false); setDup(null); setFillBusy(null); setFillError(null); setFillNote(null)
      const customSeed = form.mode === 'edit' ? { ...(customValues ?? {}) } : {}
      setCustom(customSeed)
      const projSeed = project ? { name: project.name, projectType: project.projectType ?? PROJECT_TYPES[0], scope: [...project.scope] } : proj
      if (project) setProj(projSeed)   // (parity P-09)
      /* (leads on the move, A-17) what the form opened with — ✕ asks only once something differs */
      setSeedKey(JSON.stringify({ d: seed, c: customSeed, p: project ? projSeed : null }))
      setAskDiscard(false); setPasteOpen(false); setPasteText(''); setPasteBusy(false)
      setSection(form.mode === 'edit' && touch && form.focus ? sectionOf(form.focus) : null)   // (B-21) opened on a field: its section's screen
      setExpanded(form.mode === 'edit' || (form.focus ? (IN_MORE as ReadonlySet<string>).has(form.focus) : false))
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
  const focusTarget: LeadFormField | ProjectFormField | null = form ? form.focus ?? (form.mode === 'create' ? 'name' : null) : null
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
  /* (REG-353) ≤767 this modal is the canvas' bottom sheet: it rises off the bottom edge and wears the grabber. (held calls 2026-10-24, K-9) A phone
     held sideways is a phone: the same sheet and the phone's short new lead there (lead-form.module.css carries the same two queries). */
  const sheet = usePhoneLayout()
  /* (Leads on the move, L3 — A-17) ✕, Cancel and Esc ask before typed words go: "Discard this lead?" — the import wizard's own care (user
     2026-08-28). Nothing typed, nothing asked. A save in flight is never cut short. */
  const dirty = open && seedKey !== '' && (files.length > 0 || JSON.stringify({ d: data, c: custom, p: project ? proj : null }) !== seedKey)
  const requestClose = () => { if (submittingRef.current) return; if (dirty) setAskDiscard(true); else onClose() }
  useEscapeLayer(open, panel, requestClose)
  /** (Leads on the move, P-08) ≤767 a new lead is a name and a mobile, the rest folded under More details; (B-21) ≤1024 Edit is a short list. */
  const phoneCreate = sheet && form?.mode === 'create' && !trial
  const touchEdit = touch && form?.mode === 'edit'
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  const set = <K extends keyof LeadFormData>(k: K) => (v: LeadFormData[K]) =>
    setData((d) => ({ ...d, [k]: v }))
  const commercial = isCommercialType(data.propertyType)   // (pending modules S05 — testers' L-3)

  // Errors are shown only after the first submit attempt, then re-computed live so each clears as it is fixed.
  // Past New, the lead must keep an owner — the same gate the Assign popover applies (REG-130).
  const requireAssignee = !!form && form.mode === 'edit' && form.lead.stage !== 'New'
  const errors: LeadFormErrors = submitted ? validateLeadForm(data, requireAssignee) : {}
  /* (parity P-09) the project's name is required, as Rename's was; its type always holds one of the three */
  const projectNameError = submitted && project && !proj.name.trim() ? MSG.required : undefined

  const submit = async () => {
    if (!form || submittingRef.current) return
    const errs = validateLeadForm(data, requireAssignee)
    setSubmitted(true)
    /* (REG-612) A required custom field is a field like any other: the section opens on it and the save waits. */
    if (customFields.some((f) => validateCustomValue(f, custom[f.id]))) { setExpanded(true); if (touchEdit && !hasErrors(errs)) setSection('custom'); if (!hasErrors(errs)) return }
    if (project && !proj.name.trim() && !hasErrors(errs)) { if (touchEdit) { setSection('project'); requestAnimationFrame(() => requestAnimationFrame(() => projectNameRef.current?.focus())); return } projectNameRef.current?.focus(); return }   // (parity P-09)
    if (hasErrors(errs) && touchEdit) {
      /* (leads on the move, B-21) the short list: the first error's own screen opens, its field focused */
      const first = ERROR_ORDER.find((k) => (errs as Record<string, unknown>)[k])
      if (first) { setSection(sectionOf(first)); requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus())) }
      return
    }
    if (hasErrors(errs)) {
      // A hidden error must become visible, or the button reads as a no-op.
      if (errs.email || errs.budget || errs.startDate || errs.nric || errs.client2Name || errs.client2Nric || errs.client2Phone || (phoneCreate && errs.companyUen)) setExpanded(true)   // (leads on the move, P-08) a phone folds the UEN too
      const first = errs.name ? nameRef : errs.phone ? phoneRef : errs.assignees ? assigneeRef : errs.email ? emailRef : errs.budget ? budgetRef : null
      if (first === emailRef || first === budgetRef) requestAnimationFrame(() => first.current?.focus())   // the section may be expanding this very tick — focus once it has mounted
      else if (first) first.current?.focus()
      else if (errs.client2Name || errs.client2Nric || errs.client2Phone) requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [data-field="client2Name"] [aria-invalid="true"]')?.focus())   // (pending modules S05) the second client's first error
      else if (errs.companyUen) requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [data-field="companyName"] [aria-invalid="true"]')?.focus())   // (S42 B-06) the UEN
      return
    }
    /* (REG-609, parity Q-18) The duplicate pre-check — 1.0's dup-check before save, fail-open: a live lead with this phone or
       email stops the save with a choice (Open existing lead · Create anyway). An edit never checks. */
    if (form.mode === 'create' && !trial) {
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
    const ok = await onSubmit(form.mode, data, form.mode === 'edit' ? form.lead.id : undefined, { files, customValues: custom, picked: picked.filter((p) => files.includes(p.name)), ...(project ? { project: { ...proj, name: proj.name.trim().replace(/\s+/g, ' ') } } : {}) })
    setSubmitting(false)
    // On success the modal is closing: keep the ref set so clicks landing on
    // the exiting tree can't re-submit; it resets when the modal next opens.
    if (ok === false) submittingRef.current = false
  }
  /* (REG-609, parity Q-28) Fill from a document — (S42F) the picked file is read by rule: what it names lands only where the field is still
     empty (1.0's rule; what was typed is kept and said so), the file is attached (its bytes upload with the lead), Additional info opens when a
     filled field lives there, and the line under the link says what filled and what wasn't found. Nothing read: the dialog stays open and
     says why under the drop zone — no field changes, nothing is attached. */
  const fillCtx = () => ({ sources, ownEmails: team.map((m) => m.email ?? '').filter(Boolean), ownPhones: team.map((m) => phoneDigits(m.phone ?? '')).filter(Boolean) })
  const fillFromDocument = async (file?: File) => {
    if (!file || fillBusy) return
    setFillBusy(file.name); setFillError(null)
    const r = await readLeadDocument(file, fillCtx())
    setFillBusy(null)
    if (!r.ok) { setFillError(unreadWords(r, file.name)); return }
    applyFill(r, file.name, file)
    setFillOpen(false)
  }
  /* (Leads on the move, L3 — P-08 · A-19) "Paste the WhatsApp message to fill the rest": a lead arrives as a forwarded message; its words are read
     by the same rule a document's are (lib/leads/document-fill.ts — one Singapore number, one email, a name signing it, a home named with its
     size), the empty fields fill and the line says which. The clipboard is read on the press where the browser allows it; otherwise (or with
     nothing on it) a box opens to paste into. Nothing leaves the browser. */
  const fillFromText = (text: string) => {
    const t = text.trim()
    if (!t) return false
    const r = readLeadMessage(t, { ...fillCtx(), memberNames: team.map((m) => m.name) })   // a message's own words first (lib/leads/message-fill.ts)
    if (!r.ok) { setFillNote(r.reason === 'many' ? `The message holds ${r.count ?? 'several'} leads — bring them in with Import leads.` : 'Nothing in the message looks like a client’s details — type them in.'); return true }
    applyFill(r, 'the message')
    setPasteOpen(false); setPasteText('')
    return true
  }
  const pasteMessage = async () => {
    if (pasteBusy) return
    setPasteBusy(true)
    let text = ''
    try { text = (await navigator.clipboard?.readText?.()) ?? '' } catch { text = '' }
    setPasteBusy(false)
    if (!fillFromText(text)) setPasteOpen(true)   // nothing to read, or the browser said no: a box to paste into
  }
  function applyFill(r: Extract<DocumentRead, { ok: true }>, from: string, file?: File) {
    const now = data as unknown as Record<string, string>
    const filled: FillField[] = [], kept: FillField[] = []
    for (const k of FILL_FIELDS) {
      const v = r.fill[k]
      if (!v) continue
      const had = String(now[k] ?? '').trim()
      if (!had) filled.push(k)
      else if ((k === 'phone' ? phoneDigits(had) : had.toLowerCase()) !== (k === 'phone' ? v : v.toLowerCase())) kept.push(k)
    }
    const missing = CORE_FIELDS.filter((k) => !r.fill[k])
    setData((d) => { const next = { ...d } as unknown as Record<string, string>; for (const k of filled) next[k] = r.fill[k]!; return next as unknown as LeadFormData })
    if (file) {
      setFiles((fs) => (fs.includes(file.name) ? fs : [...fs, file.name]))
      setPicked((ps) => [...ps.filter((p) => p.name !== file.name), file])
    }
    if (filled.some((k) => (IN_MORE as ReadonlySet<string>).has(k) || (phoneCreate && PHONE_MORE.has(k)))) setExpanded(true)
    setFillNote([
      filled.length ? `Filled from ${from}: ${fieldList(filled)}.` : `Read ${from} — nothing new to fill.`,
      kept.length ? `Kept what you typed for ${fieldList(kept)}.` : null,
      missing.length ? `Not found: ${fieldList(missing)}.` : null,
    ].filter(Boolean).join(' '))
  }
  const dialogs = (
    <>
      <Dialog open={fillOpen} onClose={() => setFillOpen(false)} title="Fill from a document" width={400} size="compact" nested portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setFillOpen(false)}>Cancel</Button>
                       <Button onPress={() => docInput.current?.click()} isDisabled={!!fillBusy}>{fillBusy ? 'Reading…' : 'Upload'}</Button></>}>
        <Dropzone title={fillBusy ? <>Reading <b>{fillBusy}</b>…</> : <>Drop in the document or <b>browse</b></>}
                  helper="An enquiry as a PDF, a spreadsheet or a text file — the client’s details it names fill the empty fields, and the file is attached to the lead."
                  onBrowse={() => { if (!fillBusy) docInput.current?.click() }} onPick={(f) => { void fillFromDocument(f) }} label="Choose the document" />
        {fillError ? <span className={styles.fillError} role="alert" data-testid="fill-document-error">{fillError}</span> : null}
      </Dialog>
      {/* (Leads on the move, L3 — P-08 · A-20) The safe answer is the filled one: Open existing lead. "Create anyway" steps back to the outlined
          button — the one-thumb default used to make the duplicate. */}
      <Dialog open={!!dup} onClose={() => setDup(null)} title="Already in your leads" width={400} size="form" alert nested portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => { setDup(null); void persist() }} data-testid="duplicate-create-anyway">Create anyway</Button>
                       <Button onPress={() => { const id = dup?.id; setDup(null); if (id) openInNewTab(id) }} data-testid="duplicate-open-existing">Open existing lead</Button></>}>
        {dup ? <p className={styles.dupText} data-testid="duplicate-lead"><b>{dup.name}</b> · {phoneTyped(dup.phone)}{dup.email ? ` · ${dup.email}` : ''} · {dup.stage}</p> : null}
        <span className={styles.helper}>Open it to work the existing lead, or create this one anyway.</span>
      </Dialog>
      {/* (Leads on the move, L3 — A-17) ✕ with typed words: one question, the house confirm over the form */}
      <ConfirmDialog open={askDiscard} nested
                     title={form?.mode === 'create' ? 'Discard this lead?' : 'Discard your changes?'}
                     message={form?.mode === 'create' ? 'What you typed won’t be saved.' : `Your changes to ${form?.mode === 'edit' ? form.lead.name : 'this lead'} won’t be saved.`}
                     confirmLabel="Discard" cancelLabel="Keep editing"
                     onCancel={() => setAskDiscard(false)} onConfirm={() => { setAskDiscard(false); onClose() }} />
    </>
  )
  /* The document input lives outside the Fill dialog now, so a phone's "Fill from a document" row opens the file chooser in one press. */
  const docPicker = (
    <input ref={docInput} type="file" accept={DOCUMENT_ACCEPT} hidden aria-hidden tabIndex={-1} data-testid="fill-document-input"
           onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void fillFromDocument(f) }} />
  )

  /* ── The form's fields, each written once (Leads on the move, L3): the desk composes them as the mock draws (779:24634 · 780:82282); a phone's
     new lead and a touch screen's Edit details compose the same pieces differently. ── */
  const nameField = (
    <div className={styles.fieldWrap} data-field="name">
      <TextField label="Name" required value={data.name} onChange={set('name')} trailingIcon={null} error={errors.name} inputRef={nameRef}
                 autoComplete="name" inputProps={{ autoCapitalize: 'words' }} />   {/* (leads on the move, A-18) */}
    </div>
  )
  const phoneField = (
    <div className={styles.fieldWrap} data-field="phone">
      <PhoneField value={data.phone} onChange={set('phone')} error={errors.phone} inputRef={phoneRef} />
    </div>
  )
  const sourceSelect = <TextField label="Source" mode="select" value={data.source} options={data.source && !sources.includes(data.source) ? [data.source, ...sources] : sources} onChange={set('source')} />   /* (REG-599) */
  const typeSelect = <TextField label="Property type" mode="select" value={data.propertyType} options={PROPERTY_TYPES} onChange={set('propertyType')} />
  const sourceRow = (
    <div className={styles.fieldRow} data-field="source">
      {sourceSelect}
      {typeSelect}
    </div>
  )
  /* (pending modules S05 — testers' L-3) An office or a shop: the company the lead works for and its UEN — the lead's name is the
     contact person; the NRIC / FIN under Additional info steps back. Shown only for a commercial property type. */
  const companyField = commercial ? (
    <div className={styles.fieldWrap} data-field="companyName" data-testid="lead-company">
      <div className={styles.fieldRow}>
        <TextField label="Company name" value={data.companyName} onChange={set('companyName')} maxLength={120} trailingIcon={null} />
        <TextField label="UEN" value={data.companyUen} onChange={(v) => set('companyUen')(v.toUpperCase())} maxLength={12} trailingIcon={null} error={errors.companyUen} />   {/* (S42 B-06) */}
      </div>
      <span className={styles.helper}>The lead’s name is the contact person at the company.</span>
    </div>
  ) : null
  const addressField = (
    <div className={styles.fieldWrap} data-field="propertyAddress">
      <TextField label="Property address" value={data.propertyAddress} onChange={set('propertyAddress')} trailingIcon={null} />   {/* (the calm UI build — W-592) the label says it; its helper named it a third way */}
    </div>
  )
  /* (REG-607, parity Q-12) 1.0's Area / District — Singapore's five regions; it also feeds the members' lead preferences. */
  const districtField = (
    <div className={styles.fieldWrap} data-field="district">
      <TextField label="District" mode="select" value={data.district} options={DISTRICTS} onChange={set('district')} />
    </div>
  )
  const suggestion = form?.mode === 'create' && suggest ? suggest(data) : null
  /* Assign member (REG-231) — after Property address, per the request. Carries its own data-field. (S41b-3) none in the trial. */
  const assignField = trial || !form ? null : (
    <AssigneeField team={assignable ? team.filter((m) => assignable.includes(m.id) || data.assignees.includes(m.id)) : team} value={data.assignees} onChange={set('assignees')}
                   error={errors.assignees} inputRef={assigneeRef} suggestion={touch ? suggestion : null}   /* (leads on the move, P-08) a finger's form offers the suggested member; the desk keeps the mock's field */
                   locked={selfAssign && form.mode === 'create' ? 'This lead will be assigned to you. Your manager routes leads to teammates.' : undefined} />   /* (REG-609, parity C-07) 1.0's lock note */
  )
  const emailField = <div className={styles.fieldWrap} data-field="email"><TextField label="Email" value={data.email} onChange={set('email')} trailingIcon={null}
                                 type="email" inputMode="email" error={errors.email} inputRef={emailRef} autoComplete={form?.mode === 'create' ? 'email' : 'off'} /></div>
  const leadAddressField = <div className={styles.fieldWrap} data-field="leadAddress"><TextField label="Client address" value={data.leadAddress} onChange={set('leadAddress')} trailingIcon={null} /></div>
  /* (REG-607, parity Q-35) 1.0 keeps the client's IC and the studio's own reference on the lead; every new quote starts with them. */
  const nricRow = (
    <div className={styles.fieldRow} data-field="nric">
      {/* (pending modules S05 — testers' L-3) a company has a UEN, not an NRIC — one already typed stays, never lost */}
      {commercial && !data.nric ? null : <TextField label="NRIC / FIN" value={data.nric} onChange={(v) => set('nric')(v.toUpperCase())} maxLength={12} trailingIcon={null} error={errors.nric} />}
      <TextField label="Customer ID" value={data.customerId} onChange={set('customerId')} maxLength={60} trailingIcon={null} />
    </div>
  )
  /* (pending modules S05 — testers' L-4) A second client — co-owners: every new quote starts with them as its own second
     client (REG-588's words: "Second client" · "NRIC (second client)"), and Client access offers them as someone from the household. */
  const secondField = second ? (
    <div className={styles.fieldWrap} data-field="client2Name" data-testid="lead-second-client">
      <div className={styles.secondList}>
        <div className={styles.fieldRow}>
          <TextField label="Second client" value={data.client2Name} onChange={set('client2Name')} maxLength={120} trailingIcon={null} error={errors.client2Name} />
          <TextField label="NRIC / FIN (second client)" value={data.client2Nric} onChange={(v) => set('client2Nric')(v.toUpperCase())} maxLength={12} trailingIcon={null} error={errors.client2Nric} />
        </div>
        <PhoneField label="Mobile (second client)" required={false} value={data.client2Phone} onChange={set('client2Phone')} error={errors.client2Phone} autoComplete="off" />
      </div>
      <span className={styles.helper}>A co-owner. New quotes name them beside {data.name.trim() ? data.name.trim().split(/\s+/)[0] : 'the client'}.</span>
      <span className={styles.secondRemove}>
        <Button appearance="text" onPress={() => { setData((d) => ({ ...d, client2Name: '', client2Nric: '', client2Phone: '' })); setSecond(false) }}>Remove the second client</Button>
      </span>
    </div>
  ) : (
    <div className={styles.fieldWrap} data-field="client2Name">
      <span className={styles.secondRemove}><Button appearance="text" onPress={() => setSecond(true)}>Add a second client</Button></span>
    </div>
  )
  const budgetRow = (
    <div className={styles.fieldRow} data-field="budget">
      <TextField label="Estimated budget (S$)" value={data.budget} numeric="amount"
                 onChange={set('budget')} trailingIcon={null}
                 error={errors.budget} inputRef={budgetRef} />
      <div className={styles.fieldWrap}>
        <DateField label="Estimated start date" value={data.startDate}
                   onChange={set('startDate')} today={today} error={errors.startDate} />
      </div>
    </div>
  )
  const styleRow = (
    <div className={styles.fieldRow}>
      <TextField label="Style" mode="select" value={data.style} options={STYLE_OPTIONS} onChange={set('style')} />
      <TextField label="Key collection" mode="select" value={data.keyCollection} options={KEY_COLLECTION_OPTIONS} onChange={set('keyCollection')} />
    </div>
  )
  const conditionRow = (
    <div className={styles.fieldRow}>
      <TextField label="Condition" mode="select" value={data.condition} options={CONDITION_OPTIONS} onChange={set('condition')} />
      <AreaField value={data.areaSize} unit={data.areaUnit} onChange={set('areaSize')} onUnitChange={set('areaUnit')} />
    </div>
  )
  const notesField = (
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
  )
  const customList = (
    <div className={styles.customList}>
      {customFields.map((f) => (
        <CustomFieldInput key={f.id} def={f} value={custom[f.id]} today={today} error={submitted ? validateCustomValue(f, custom[f.id]) : undefined}
                          onChange={(v) => setCustom((c) => ({ ...c, [f.id]: v }))} />
      ))}
    </div>
  )
  const customBlock = customFields.length ? (
    /* (REG-612, parity Q-25) The studio's own fields, each on the DS field its type asks for. */
    <div className={styles.fieldWrap} data-field="customFields">
      <span className={styles.customTitle}>Custom fields</span>
      {customList}
    </div>
  ) : null
  const filesBlock = form?.mode === 'create' && !trial ? (
    /* (REG-609, parity C-08) Documents at creation — the Move stage window's Attach row; each file lands in the Files tab with the lead. */
    <div className={styles.fieldWrap} data-field="files">
      <SectionRow label="Attach files (optional)" action={<LinkButton icon="attach_file" onClick={() => fileInput.current?.click()}>Attach</LinkButton>} />
      <input ref={fileInput} type="file" multiple hidden aria-hidden tabIndex={-1}
             onChange={(e) => { const list = Array.from(e.target.files ?? []); const names = list.map((f) => f.name); e.target.value = ''; if (names.length) { setFiles((fs) => [...fs, ...names.filter((n) => !fs.includes(n))]); setPicked((ps) => [...ps.filter((p) => !names.includes(p.name)), ...list]) } }} />
      {files.length ? (
        <div className={styles.tiles} data-testid="attached-files">
          {files.map((f) => <FileTile key={f} name={f} kind={/\.pdf$/i.test(f) ? 'pdf' : 'image'} onDelete={() => setFiles((fs) => fs.filter((x) => x !== f))} />)}
        </div>
      ) : null}
      <span className={styles.helper}>They appear in the lead’s Files tab.</span>
    </div>
  ) : null
  const moreInner = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--om-spacing-6)', width: '100%' }}>
      {emailField}
      {leadAddressField}
      {nricRow}
      {secondField}
      {budgetRow}
      {styleRow}
      {conditionRow}
      {notesField}
      {customBlock}
      {filesBlock}
    </div>
  )
  /** The fold: "Additional info" on the desk (780:82282); on a phone's new lead "More details" holds the source, the home and these. */
  const fold = (label: string, children: ReactNode) => (
    <div className={styles.section}>
      <button type="button" className={styles.moreToggle} aria-expanded={expanded}
              onClick={() => setExpanded((e) => !e)}>
        {label}
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
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
  const projectSection = project ? (
    /* (parity P-09 · D-08) The project's own section after the lead's block — the Custom fields block's look (a titled group of the
       house fields): its name (Rename's field, REG-925 — the ⋮ no longer renames), its type and the rooms in its scope (the
       project details dialog's fields, gaps build A — 7). */
    <div className={styles.section} data-testid="project-details-section">
      <div className={styles.fieldWrap} data-field="projectName">
        {touchEdit ? null : <span className={styles.customTitle}>Project</span>}   {/* (leads on the move, B-21) on its own screen the head names it */}
        <TextField label="Project name" required value={proj.name} maxLength={NAME_MAX} onChange={(v) => setProj((x) => ({ ...x, name: v }))} trailingIcon={null}
                   error={projectNameError} inputRef={projectNameRef} />
      </div>
      <div className={styles.fieldWrap} data-field="projectType">
        <TextField label="Project type" required mode="select" value={proj.projectType} options={[...PROJECT_TYPES]} onChange={(v) => setProj((x) => ({ ...x, projectType: v }))} />
      </div>
      <div className={styles.customChips} data-field="scope">
        <span className={styles.customLabel}>Rooms in the scope</span>
        <Chips multiple label="Rooms in the scope" options={ROOMS} value={proj.scope} onChange={(v) => setProj((x) => ({ ...x, scope: ROOMS.filter((r) => v.includes(r)) }))} testId="scope-chips" />
      </div>
    </div>
  ) : null

  /* (Leads on the move, L3 — P-08 · A-19) The two ways to fill a new lead from what arrived: a pasted message (≤1024) and a document. A phone
     draws them as two rows under the name and the mobile; a tablet adds the message beside the desk's link; the desk keeps its one link. */
  const pasteBox = pasteOpen ? (
    <div className={styles.pasteBox} data-testid="paste-message-box">
      <TextArea label="Paste the message here" value={pasteText} onChange={(v: string) => setPasteText(v)} className={styles.pasteArea} />
      <span className={styles.pasteFoot}>
        <Button variant="secondary" appearance="outlined" onPress={() => { setPasteOpen(false); setPasteText('') }}>Cancel</Button>
        <Button onPress={() => { fillFromText(pasteText) }} isDisabled={!pasteText.trim()} data-testid="paste-message-fill">Fill the form</Button>
      </span>
    </div>
  ) : null
  const fillNoteLine = fillNote ? <span className={styles.fillNote} role="status" data-testid="fill-document-note">{fillNote}</span> : null
  /* eslint-disable-next-line @next/next/no-img-element */
  const sparkle = <img src="/figma-assets/brief-sparkle.svg" alt="" />
  const fillRow = form?.mode === 'create' && !trial ? (
    /* (REG-609, parity Q-28) Fill from a document, 1.0's document read in Auto Fill's sparkle and words — (S42F) it reads the picked
       file by rule (lib/leads/document-fill.ts), no model and no sample. (S43D, F2-03) */
    <div className={styles.fillRow}>
      {touch ? (
        <span className={styles.fillLinks}>
          <LinkButton leading={sparkle} onClick={() => { void pasteMessage() }}>Paste a message</LinkButton>
          <LinkButton leading={sparkle} onClick={() => { setFillError(null); setFillOpen(true) }}>Fill from a document</LinkButton>
        </span>
      ) : (
        <LinkButton leading={sparkle} onClick={() => { setFillError(null); setFillOpen(true) }}>Fill from a document</LinkButton>
      )}
      {/* (S42F) what the read filled and what it didn't find — the file's own words, never a sample */}
      {fillNoteLine}
      {pasteBox}
    </div>
  ) : null

  /* ── Edit details on a touch screen (B-21): the short list, each row one screen ── */
  const names = team.filter((m) => data.assignees.includes(m.id)).map((m) => m.name)
  const customFilled = customFields.filter((f) => { const v = custom[f.id]; return Array.isArray(v) ? v.length > 0 : !!(v ?? '').toString().trim() }).length
  const sections: { key: FormSection; summary: string }[] = touchEdit ? [
    { key: 'contact', summary: [data.name.trim() || 'No name', data.phone ? phoneTyped(data.phone) : null, data.email || null].filter(Boolean).join(' · ') },
    { key: 'property', summary: [data.propertyType || null, data.propertyAddress || data.district || null].filter(Boolean).join(' · ') || 'Not set yet' },
    { key: 'budget', summary: [data.budget ? `S$${data.budget}` : null, data.source || null].filter(Boolean).join(' · ') || 'Not set yet' },
    { key: 'people', summary: names.length ? names.join(', ') : 'Nobody yet' },
    ...(customFields.length ? [{ key: 'custom' as const, summary: `${customFilled} of ${customFields.length} filled` }] : []),
    ...(project ? [{ key: 'project' as const, summary: [proj.name.trim() || 'No name', proj.projectType].filter(Boolean).join(' · ') }] : []),
  ] : []
  const sectionErrors = (k: FormSection) => ERROR_ORDER.some((e) => sectionOf(e) === k && (errors as Record<string, unknown>)[e]) || (k === 'custom' && submitted && customFields.some((f) => validateCustomValue(f, custom[f.id]))) || (k === 'project' && !!projectNameError)
  const sectionBody = (k: FormSection) => (
    <div className={styles.section} data-testid={`edit-section-${k}`}>
      {k === 'contact' ? <>{nameField}{phoneField}{emailField}{leadAddressField}{nricRow}{companyField}{secondField}</>
        : k === 'property' ? <>{typeSelect}{addressField}{districtField}{styleRow}{conditionRow}</>
        : k === 'budget' ? <>{sourceSelect}{budgetRow}{notesField}</>
        : k === 'people' ? assignField
        : k === 'custom' ? <div className={styles.fieldWrap} data-field="customFields">{customList}</div>   /* the screen's head names it */
        : null}
    </div>
  )

  /* (the calm UI build 2026-10-27 — audit 2-49 · 2-13, W-031 · W-539) "New lead" — the dialog says it is a lead, so its fields drop the word */
  const title = form?.mode === 'create' ? 'New lead' : project ? 'Edit details' : 'Edit lead'

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
                      aria-label={form.mode === 'create' ? 'New lead' : project ? 'Edit details' : 'Edit lead'}
                      data-short-list={touchEdit || undefined} data-phone-create={phoneCreate || undefined}>
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            {/* (REG-725) the house head and foot (components/om/dialog.tsx), on the house panel — (leads on the move, B-21) a section's screen
                leads with the way back to the list and names the section */}
            {touchEdit && section ? (
              <SurfaceHead title={section === 'project' ? 'Project' : SECTION_LABEL[section]} eyebrow={title} onClose={requestClose} className={styles.heading}
                           leading={<IconButton icon="arrow_back" label="Back to the details" size={24} variant="bare" iconSize={24} onClick={() => setSection(null)} data-testid="edit-section-back" />} />
            ) : (
              <SurfaceHead title={title} onClose={requestClose} className={styles.heading} />   /* (parity P-09) one title grammar on a project */
            )}

            <div ref={scrollRef} className={styles.body}>
              {touchEdit ? (
                section ? (
                  section === 'project' ? projectSection : sectionBody(section)
                ) : (
                  /* (Leads on the move, L3 — P-08 · B-21) Edit details as a short list: Contact · Property · Budget & source · People (· Custom fields
                     · Project), each row what it holds; a row opens its screen. One Save keeps everything. */
                  <div className={styles.shortList} role="list" aria-label="Details" data-testid="edit-short-list">
                    {sections.map((r) => (
                      <button key={r.key} type="button" role="listitem" className={styles.shortRow} data-section={r.key} data-error={sectionErrors(r.key) || undefined}
                              onClick={() => setSection(r.key)}>
                        <span className={styles.shortText}>
                          <span className={styles.shortLabel}>{SECTION_LABEL[r.key]}</span>
                          <span className={styles.shortSummary}>{sectionErrors(r.key) ? 'Needs a fix' : r.summary}</span>
                        </span>
                        <Icon name="chevron_right" size={24} />
                      </button>
                    ))}
                  </div>
                )
              ) : phoneCreate ? (
                <>
                  {/* (Leads on the move, L3 — P-08) A new lead on a phone: the name and the mobile, the two ways to fill the rest from what
                      arrived, then More details (the source, the home and the rest) and Assign with its suggestion; one Add lead. */}
                  <div className={styles.section}>
                    {nameField}
                    {phoneField}
                    <div className={styles.fillRows}>
                      <button type="button" className={styles.fillAction} onClick={() => { void pasteMessage() }} data-testid="paste-message">
                        {sparkle}<span>Paste the WhatsApp message to fill the rest</span>
                      </button>
                      <button type="button" className={styles.fillAction} onClick={() => { setFillError(null); docInput.current?.click() }} data-testid="fill-document">
                        {sparkle}<span>{fillBusy ? `Reading ${fillBusy}…` : 'Fill from a document'}</span>
                      </button>
                      {fillError ? <span className={styles.fillError} role="alert" data-testid="fill-document-error">{fillError}</span> : null}
                      {fillNoteLine}
                      {pasteBox}
                    </div>
                  </div>
                  {fold('More details', (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--om-spacing-6)', width: '100%' }}>
                      {sourceRow}
                      {companyField}
                      {addressField}
                      {districtField}
                      {moreInner}
                    </div>
                  ))}
                  {assignField ? (
                    <div className={styles.section}>
                      {assignField}
                      {suggestion && data.assignees.length === 0 && !selfAssign ? (
                        <span className={styles.suggestLine} data-testid="lead-form-suggestion">
                          <span>Suggested: <b>{suggestion.name}</b></span>
                          <Button appearance="text" onPress={() => set('assignees')([suggestion.id])}>Assign {suggestion.name.split(/\s+/)[0]}</Button>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className={styles.section}>
                    {fillRow}
                    {nameField}
                    {phoneField}
                    {sourceRow}
                    {companyField}
                    {addressField}
                    {districtField}
                    {assignField}
                  </div>
                  {fold('Additional info', moreInner)}
                  {projectSection}
                </>
              )}
            </div>

            <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
              {phoneCreate ? (
                /* (P-08) one filled button: Add lead — ✕ in the head is the way out, and it asks before anything typed goes */
                <Button onPress={() => { void submit() }} isDisabled={submitting} className={styles.addLead} data-testid="add-lead">Add lead</Button>
              ) : (
                <>
                  <Button variant="secondary" appearance="outlined" onPress={requestClose} isDisabled={submitting}>Cancel</Button>
                  <Button onPress={() => { void submit() }} isDisabled={submitting} data-testid={project ? 'details-save' : undefined}>{form.mode === 'create' ? 'Add lead' : 'Save'}</Button>
                </>
              )}
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    {dialogs}
    {open ? docPicker : null}
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
