'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { AssigneeField } from '@/components/leads/assignee-field'
import { PhoneField } from '@/components/leads/lead-form'
import { findDuplicateLead } from '@/app/leads/actions'
import { DISTRICTS, PROPERTY_TYPES, STYLE_OPTIONS } from '@/lib/leads/enums'
import { suggestMember, type MemberStats } from '@/lib/leads/suggest'
import { EMAIL_RE, MSG, hasErrors, type FieldErrors } from '@/lib/forms'
import { isSgPhone, phoneTyped, titleCaseName } from '@/lib/format'
import { splitWord } from '@/lib/quotes/payments'
import { DUPLICATE_NAME, NAME_MAX, PROJECT_TYPES, ROOMS, STAGE_LABEL, TEAM_NEEDED, defaultProjectName } from '@/lib/projects/model'
import type { Member } from '@/lib/db/schema'
import type { NewProjectInput } from '@/app/projects/actions'
import styles from './new-project-dialog.module.css'

type Dup = NonNullable<Awaited<ReturnType<typeof findDuplicateLead>>>
type Split = { id: string; name: string; rows: { name: string; pct: number }[] }
const empty = (split: string | null, self: string | null): NewProjectInput => ({
  client: '', phone: '', email: '', propertyType: '', propertyAddress: '', district: '', projectType: PROJECT_TYPES[0], value: '', splitId: split, team: self ? [self] : [],
  name: '', areaSqft: '', style: '', scope: [], note: '',   // (gaps build, package A)
})
/* (S42F) `picksTeam`: the creator isn't a Designer (a Designer's project is theirs), so the team field asks for one — a project needs a member,
   as a lead past New does (REG-334 · the lead form's MSG.assignee) */
const validate = (d: NewProjectInput, picksTeam: boolean): FieldErrors<'client' | 'phone' | 'email' | 'propertyType' | 'value' | 'team'> => ({
  client: d.client.trim() ? undefined : MSG.required,
  phone: !d.phone ? MSG.required : isSgPhone(d.phone) ? undefined : MSG.phone,
  email: d.email.trim() && !EMAIL_RE.test(d.email.trim()) ? MSG.email : undefined,
  propertyType: d.propertyType ? undefined : MSG.choose,
  value: Number(d.value.replace(/,/g, '')) > 0 ? undefined : MSG.amount,
  team: picksTeam && !d.team.length ? MSG.assignee : undefined,
})

/**
 * (REG-927, Q-04 — the owner: "it can exist on it's own. Because Studios might get direct projects as well.") New project: one form on the
 * house Dialog (a bottom sheet on a phone) that asks for the client, the property, the project type and the agreed value — and the payment
 * split (Company › Templates › Payments) and the team. The house fields: the +65 phone (`isSgPhone`), the money box, selects. Errors show after
 * the first Create and clear as they are fixed (MSG). A phone or email already on a lead or project stops it with the lead form's question
 * (REG-609): open what exists, or create anyway. Opens with the caret in the client's name; closes only once the project exists.
 * (simplify Q-16, the owner's "build everything", 2026-10-09; P2 §6.2) Its fifteen fields stay: the client, the property type, the project type,
 * the agreed value and its split (and the team, when the creator isn't a Designer) on top; District · Address · Floor area · Style · Rooms ·
 * First note under *More details ▾*. Create opens the new project (the listing's landing).
 */
export function NewProjectDialog({ open, onClose, splits, team, assignable, selfId, onCreate, onOpenExisting, memberLoad = {}, memberStats = {}, initial }: {
  open: boolean
  /** (parity map, PR-059 — 1.0's mAIson made a project) Fields filled when it opens — Maison AI's "Start a new project for …" (the client, their
      mobile, the property type read from the question); every field stays the form's to change. */
  initial?: Partial<Pick<NewProjectInput, 'client' | 'phone' | 'propertyType'>> | null
  onClose: () => void
  splits: Split[]
  team: Member[]
  /** Who this member may put on the team (the leads' reach). */
  assignable: string[]
  /** A Designer's project is theirs (the lead form's rule, REG-609): the team field shows them, locked. */
  selfId: string | null
  /** Resolves true once the project exists — the dialog closes then, and only then. (gaps build, package A — 10) A name another project has
      comes back as `{ error }` and is said on the name field. */
  onCreate: (input: NewProjectInput) => Promise<boolean | { error: string }>
  /** (gaps build, package A — 9) each member's running projects, and the stats the Assign popover suggests from (REG-612) */
  memberLoad?: Record<string, number>
  memberStats?: MemberStats
  /** (fix-A, A-21) Open existing: the form closes and the page goes to what exists — the lead form's `onOpenExisting` (REG-609). */
  onOpenExisting?: (href: string) => void
}) {
  const defaultSplit = splits.find((s) => s.id === 'default')?.id ?? splits[0]?.id ?? null
  const [d, setD] = useState<NewProjectInput>(() => empty(defaultSplit, selfId))
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dup, setDup] = useState<Dup | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  /* (gaps build, package A — 10) the name follows "{property type} — {client}" (Q-05) until it is typed; a taken one is said on the field */
  const [nameTyped, setNameTyped] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  /* (simplify Q-16, P2 §6.2) the required fields first; District · Address · Floor area · Style · Rooms · First note under More details ▾ */
  const [more, setMore] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setD({ ...empty(defaultSplit, selfId), ...(initial?.client ? { client: initial.client } : {}), ...(initial?.phone ? { phone: initial.phone } : {}), ...(initial?.propertyType && PROPERTY_TYPES.includes(initial.propertyType) ? { propertyType: initial.propertyType } : {}) }); setSubmitted(false); setBusy(false); setDup(null); setNameTyped(false); setNameError(null); setMore(false) } }
  const autoName = d.client.trim() ? defaultProjectName(d.propertyType, titleCaseName(d.client.trim())) : ''
  const shownName = nameTyped ? d.name ?? '' : autoName
  const projectNameRef = useRef<HTMLInputElement>(null)
  /* (gaps build, package A — 9) the Assign popover's suggestion, from what this form knows of the job: its property type, value, style, district */
  const suggestion = useMemo(() => {
    if (selfId) return null
    const pool = team.filter((m) => assignable.includes(m.id))
    const budget = Math.round(Number(d.value.replace(/,/g, '')) * 100) || 0
    return d.propertyType ? suggestMember({ propertyType: d.propertyType, budgetMinor: budget, style: d.style || null, area: d.district || null }, pool, memberStats) : null
  }, [selfId, team, assignable, d.value, d.propertyType, d.style, d.district, memberStats])
  const load = (n: number) => (n === 0 ? 'no projects running' : `${n} ${n === 1 ? 'project' : 'projects'} running`)
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (!open) return; const r = requestAnimationFrame(() => requestAnimationFrame(() => nameRef.current?.focus())); return () => cancelAnimationFrame(r) }, [open])
  const errors = submitted ? validate(d, !selfId) : {}
  const set = <K extends keyof NewProjectInput>(k: K) => (v: NewProjectInput[K]) => setD((x) => ({ ...x, [k]: v }))
  /* (REG-1053) a template whose name already says its split ("Default: 10/30/30/30", "20/40/40") isn't followed by it again */
  const splitLabel = (s: Split) => (s.name.includes(splitWord(s.rows)) ? s.name : `${s.name} · ${splitWord(s.rows)}`)
  const create = async (skipDup = false) => {
    if (busy) return
    setSubmitted(true)
    /* (S42F) a hidden error must show, or Create reads as a no-op: the first field that needs something takes the focus (the lead form's rule) */
    if (hasErrors(validate(d, !selfId))) { requestAnimationFrame(() => focusFirstError()); return }
    setBusy(true)
    if (!skipDup) {
      const hit = await findDuplicateLead({ phone: d.phone, email: d.email }).catch(() => null)
      if (hit) { setBusy(false); setDup(hit); return }
    }
    const res = await onCreate({ ...d, name: nameTyped ? (d.name ?? '').trim() : '' })
    setBusy(false)
    if (res === true) onClose()
    else if (res && typeof res === 'object' && res.error === DUPLICATE_NAME) { setNameError(DUPLICATE_NAME); requestAnimationFrame(() => { projectNameRef.current?.scrollIntoView({ block: 'center' }); projectNameRef.current?.focus() }) }
    /* (S42F) the server's own check — a member picked here who left this member's reach meanwhile: said on the team field */
    else if (res && typeof res === 'object' && res.error === TEAM_NEEDED) { setD((x) => ({ ...x, team: [] })); requestAnimationFrame(() => focusFirstError()) }
  }
  const formRef = useRef<HTMLDivElement>(null)
  const focusFirstError = () => {
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.focus()
  }
  const assignee = (
    <AssigneeField team={team.filter((m) => assignable.includes(m.id) || d.team.includes(m.id))} value={d.team} onChange={set('team')}
                   rowMeta={(m) => [m.specialty, load(memberLoad[m.id] ?? 0)].filter(Boolean).join(' · ')} suggestion={suggestion} error={errors.team}
                   locked={selfId ? `This project will be yours. ${team.find((m) => m.id === selfId)?.managerId ? 'Your manager adds teammates.' : 'An Owner or an Admin adds teammates.'}` : undefined} />   /* (fix-A, A-40) who really adds them */
  )
  return (
    <>
      <Dialog open={open} onClose={onClose} title="New project" width={600} size="form" closeOnScrim={false}
              footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void create() }} isDisabled={busy}>{busy ? 'Creating…' : 'Create project'}</Button></>}>
        <div className={styles.form} data-testid="new-project-form" ref={formRef}>
          <p className={styles.intro}>For a client who came to you directly — they won’t appear in Leads.</p>   {/* (the calm UI build 2026-10-27, W-194) */}
          <span className={styles.group}>Client</span>
          <TextField label="Client name" required value={d.client} onChange={set('client')} error={errors.client} inputRef={nameRef} trailingIcon={null} />
          <div className={styles.row}>
            <PhoneField label="Client’s phone number" value={d.phone} onChange={set('phone')} error={errors.phone} />
            <TextField label="Email" value={d.email} onChange={set('email')} error={errors.email} type="email" trailingIcon={null} />
          </div>
          {/* (simplify Q-16, the owner's "build everything", 2026-10-09; P2 §6.2) what a project can't start without, on top: the property
              type, the project type, the agreed value and its split, and the team when the creator isn't a Designer */}
          <span className={styles.group}>Project</span>
          <div className={styles.row}>
            <TextField label="Property type" required mode="select" value={d.propertyType} options={[...PROPERTY_TYPES]} onChange={set('propertyType')} error={errors.propertyType} />
            <TextField label="Project type" required mode="select" value={d.projectType} options={[...PROJECT_TYPES]} onChange={set('projectType')} />
          </div>
          <TextField label="Project name" required value={shownName} maxLength={NAME_MAX} inputRef={projectNameRef} trailingIcon={null} error={nameError ?? undefined}
                     onChange={(v) => { setNameTyped(true); setNameError(null); set('name')(v) }} helper={nameError ? undefined : 'Named after the property and the client until you change it'} />
          <div className={styles.row}>
            <TextField label="Agreed value (S$)" required numeric="money" value={d.value} onChange={set('value')} error={errors.value} trailingIcon={null} helper="What the client agreed to pay, GST included" />
            <TextField label="Payment split" mode="select" value={splits.find((s) => s.id === d.splitId) ? splitLabel(splits.find((s) => s.id === d.splitId)!) : ''}
                       options={splits.map(splitLabel)} onChange={(v) => set('splitId')(splits.find((s) => splitLabel(s) === v)?.id ?? null)} />   {/* (the calm UI build 2026-10-27, W-524 · T-05) the split names itself */}
          </div>
          {selfId ? null : assignee}
          <span>
            <Button appearance="text" iconEnd={<Icon name={more ? 'keyboard_arrow_up' : 'expand_more'} size={20} />} onPress={() => setMore((x) => !x)} aria-expanded={more} data-testid="new-project-more">More details</Button>
          </span>
          {more ? (
            <>
              <div className={styles.row}>
                <TextField label="District" mode="select" value={d.district} options={[...DISTRICTS]} onChange={set('district')} />
                <TextField label="Property address" value={d.propertyAddress} onChange={set('propertyAddress')} trailingIcon={null} />
              </div>
              {/* (gaps build, package A — 7; 1.0 B-65) the floor area and the style live on the client's record, as a lead's do */}
              <div className={styles.row}>
                <TextField label="Floor area (sq ft)" numeric="amount" value={d.areaSqft ?? ''} onChange={(v) => set('areaSqft')(v.slice(0, 7))} trailingIcon={null} />
                <TextField label="Style" mode="select" value={d.style ?? ''} options={[...STYLE_OPTIONS]} onChange={set('style')} />
              </div>
              {/* (gaps build, package A — 7; 1.0 B-67) the rooms in the scope — the project's own */}
              <div className={styles.chipGroup}>
                <span className={styles.chipLabel}>Rooms in the scope</span>
                <Chips multiple label="Rooms in the scope" options={ROOMS} value={d.scope ?? []} onChange={(v) => set('scope')(ROOMS.filter((r) => v.includes(r)))} testId="new-scope" />
              </div>
              {/* (gaps build, package A — M-02; 1.0 B-84) the first line of the project's Notes & Logs */}
              <TextField label="A first note (optional)" value={d.note ?? ''} onChange={set('note')} multiline={3} maxLength={2000} trailingIcon={null} helper="It starts the project’s Notes & Logs" />
              {/* a Designer's project is theirs — the locked team field says who adds teammates */}
              {selfId ? assignee : null}
            </>
          ) : null}
        </div>
      </Dialog>
      <Dialog open={!!dup} onClose={() => setDup(null)} title={dup?.matchedOn === 'email' ? 'A client with this email already exists' : 'A client with this phone already exists'} width={400} size="form" alert nested portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => { const hit = dup; setDup(null); if (!hit) return; onClose(); const to = hit.project ? `/projects/${hit.project.id}` : `/leads/${hit.id}`; if (onOpenExisting) onOpenExisting(to); else window.location.assign(to) }}>Open existing</Button>
                       <Button onPress={() => { setDup(null); void create(true) }}>Create anyway</Button></>}>
        {/* (fix-A, A-21) what exists, named as it is: a project by its number and stage, else the lead's stage */}
        {dup ? <p className={styles.dupText} data-testid="duplicate-client"><b>{dup.name}</b> · {phoneTyped(dup.phone)}{dup.email ? ` · ${dup.email}` : ''} · {dup.project ? `Project ${dup.project.number} · ${STAGE_LABEL[dup.project.stage]}` : dup.stage}</p> : null}
        <span className={styles.help}>Open it to carry on there, or create this project anyway.</span>
      </Dialog>
    </>
  )
}
