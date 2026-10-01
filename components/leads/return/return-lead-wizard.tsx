'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Link, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useOverflow } from '@/components/om/use-overflow'
import { Tooltip } from '@/components/om/tooltip'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { DateTimeField } from '@/components/om/date-field'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { duration, ease, modalPanel, overlayFade } from '@/lib/motion'
import { MSG, type FieldErrors } from '@/lib/forms'
import { displayDate, parseInputDateTime } from '@/lib/format'
import type { ReturnInput } from '@/app/leads/return-actions'
import { REASON_LABELS, REFUSED_SUB_REASONS, RETURN_RULES, RETURN_RULES_TEXT, WRONG_FIELDS, asks, reasonByLabel, returnWindow } from '@/lib/leads/return-model'
import { uploadFile } from '@/app/leads/files-actions'
import { renderLinksLine, useLiveRenderLinks } from '@/components/leads/use-render-links'
import type { LeadFile } from '@/lib/db/schema'
import styles from './return-lead-wizard.module.css'

/*
 * Return Lead wizard (931:48813 step 1 · 931:48882 reason form · 931:48930 filled · 931:49009 terms): the 800-wide l-modal.
 * Spec: design-source/context/lead-return/01-wizard-details.txt; contract: 00-build-plan.md.
 * Shell = components/leads/tasks/tasks-filters-modal.tsx (overlay, panel, Escape / scrim close, useScrollLock); the head
 * and the foot are the house's (REG-725, SurfaceHead with its subtitle · SurfaceFoot); tiles =
 * components/leads/notes/attachments-column.tsx; "Attach Files" opens the tasks' AttachFilesModal.
 */

/* (REG-609, parity D-39) The reasons are 1.0's seven, with the fields each one asks for — lib/leads/return-model.ts. The mock's one
   reason (REG-192, "Lead not contactable") keeps its form; the other six take theirs on the same components. */
/** "1" · "2" · "3" · "4" · "+5" — value 5 means "+5". */
const ATTEMPTS: { value: number; label: string }[] = [
  { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '+5' },
]
const TIPS = [
  'Contact within 2 hours',
  'Send an introductory message indicating your name and the firm you are representing.',
  'Showcase past portfolios via social media or company website',
  'Be open to request for a Zoom meeting or phone call first for brief taking',
]
const TERMS = 'Qanvast reserves the right of final decision on the return of leads and return of credits. By clicking “Confirm”, you agree to our lead return terms.'
const COMMENTS_MAX = 500

type Step = 'reason' | 'terms'
type Field = 'reason' | 'outreach' | 'attempts' | 'subReasons' | 'wrongField' | 'comments'
const STEP_INDEX: Record<Step, number> = { reason: 0, terms: 1 }
/** Step change: the body slides ±16px in the direction of travel (REG-25; the Move stage wizard's timings — modal in, 0.15 standard out). */
const stepSlide = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 16 }),
  animate: { opacity: 1, x: 0, transition: { duration: duration.modal, ease: ease.decelerate } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -16, transition: { duration: 0.15, ease: ease.standard } }),
}

/** The tile's kind glyph: "picture_as_pdf" for a PDF, "image" otherwise — attachments-column.tsx kindIcon. */
const kindIcon = (f: LeadFile) => (f.kind === 'pdf' || f.mime === 'application/pdf' ? 'picture_as_pdf' : 'image')

export function ReturnLeadWizard({
  open, lead, files, now, onClose, onConfirm, returnsCount = 0,
}: {
  open: boolean
  lead: { id: string; name: string; createdAt: Date }
  /** (REG-609, parity Q-44) Returns already filed on the lead — Qanvast's two-return cap reads it. */
  returnsCount?: number
  /** The lead's file library — what "Attach Files" lists. */
  files: LeadFile[]
  /** Host clock (the loader's `now`) for the picker's "today" — components/leads/lead-form.tsx precedent. */
  now: number
  onClose: () => void
  /** Step 2 › Confirm: awaited, then the wizard closes itself. */
  onConfirm: (input: ReturnInput) => Promise<void>
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const [step, setStep] = useState<Step>('reason')
  const [dir, setDir] = useState(1)   // +1 forward (Next), −1 back — drives the step slide
  const [reason, setReason] = useState('')
  const [outreach, setOutreach] = useState('')
  const [attempts, setAttempts] = useState<number | null>(null)
  const [comments, setComments] = useState('')
  /* (REG-609) the seven reasons' own fields */
  const [subReasons, setSubReasons] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [project, setProject] = useState('')
  const [wrongField, setWrongField] = useState('')
  const [tiles, setTiles] = useState<LeadFile[]>([])
  const [attachOpen, setAttachOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [pressed, setPressed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  /** Day-granular "today" for the picker's ring, derived from the host clock (never Date.now() in render). */
  const today = useMemo(() => new Date(now), [now])
  /** The last file picked in the attach modal, so a simulated upload's tile can carry its name (read in handlers only). */
  const lastPicked = useRef<string | null>(null)
  /* (REG-287) `aria-modal` promises the page behind is inert, so the panel owes the WAI-ARIA dialog contract:
     focus moves in on open, Tab stays inside it, and focus returns to the opener on close. Esc rides the shared
     layer policy — the reason select's menu, the date-time picker, a tile's Dropdown and the stacked Attach files
     modal each sit above this panel and own Esc first (components/om/surface.ts), which is exactly what the
     hand-rolled `!e.defaultPrevented` window listener this replaces was after. */
  const panelRef = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panelRef, onClose)
  useDialogFocus(open, panelRef)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  // Render-phase adjust: every opening starts fresh on step 1.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep('reason'); setReason(''); setOutreach(''); setAttempts(null); setComments(''); setTiles([])
      setSubReasons([]); setSearch(''); setProject(''); setWrongField('')
      setAttachOpen(false); setMenu(null); setPressed(false); setBusy(false)
    }
  }

  // Validation (lib/forms MSG): what the chosen reason asks for is mandatory (comments only for "Others"); messages show after
  // the first press and clear live.
  const r = reasonByLabel(reason)
  const errors: FieldErrors<Field> = {
    reason: reason ? undefined : MSG.choose,
    outreach: !asks(r, 'outreach') ? undefined : !outreach ? MSG.required : parseInputDateTime(outreach) ? undefined : MSG.dateTime,
    attempts: asks(r, 'attempts') && attempts == null ? MSG.choose : undefined,
    subReasons: asks(r, 'subReasons') && subReasons.length === 0 ? MSG.choose : undefined,
    wrongField: asks(r, 'wrongField') && !wrongField ? MSG.choose : undefined,
    comments: r?.commentsRequired && !comments.trim() ? MSG.required : undefined,
  }
  const shown: FieldErrors<Field> = pressed ? errors : {}
  const valid = !Object.values(errors).some(Boolean)
  /* (REG-609, parity Q-44) Where the lead stands against Qanvast's rules — shown, never enforced. */
  const win = returnWindow(lead.createdAt, returnsCount, now)
  /* (wave E, E8 · files-8) A returned lead's client render links close with it, as a deleted lead's do — the Terms step says so. */
  const renderLine = renderLinksLine(useLiveRenderLinks(open ? [lead.id] : null))

  const goTo = (s: Step) => { setDir(STEP_INDEX[s] > STEP_INDEX[step] ? 1 : -1); setStep(s) }
  const next = () => {
    setPressed(true)
    if (valid) goTo('terms')
  }
  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      // A tile the attach modal "uploaded" (REG-149, `local-*` id) has no lead_files row yet: it joins the lead's library here
      // (files-actions uploadFile — the plan's upload path) so return_attachments only ever links real files. Cancel leaves no orphan.
      const fileIds = await Promise.all(tiles.map((f) => (f.id.startsWith('local-') ? uploadFile(lead.id, { name: f.name }) : f.id)))
      await onConfirm({ reason, subReasons, detail: asks(r, 'search') ? search : asks(r, 'project') ? project : asks(r, 'wrongField') ? wrongField : '', firstOutreach: asks(r, 'outreach') ? outreach : '', attempts: asks(r, 'attempts') ? attempts : null, comments, fileIds })
      onClose()
    } catch {
      // `returnLead` refused (lib/leads/stage-policy.ts canReturnLead) or failed — the listing's "Couldn’t … — please try again"
      // snackbar pattern (app/leads/workspace.tsx); no mock covers this state.
      snackbar({ message: 'Couldn’t return the lead — please try again' })
    } finally {
      setBusy(false)
    }
  }

  // AttachFilesModal hands back only the NEW picks; a file the modal uploaded itself (REG-149, local id) is not in `files`,
  // so it gets the modal's stand-in tile (the picked name, and the mock's thumbnail when it is an image) — the same mock file
  // the modal listed.
  // Its `local-*` id is swapped for a real lead_files row on Confirm (see `confirm`).
  const attach = (fileIds: string[]) => {
    setAttachOpen(false)
    const at = new Date()
    const picked = fileIds
      .filter((id) => !tiles.some((t) => t.id === id))
      .map((id) => {
        const name = lastPicked.current ?? 'filename.jpg'
        // The stand-in's kind follows the picked name — the dropzone also takes PDFs ("Supports: JPEG, PNG, PDF"), and a PDF
        // has no thumbnail, so it takes the .tileBox + picture_as_pdf branch below instead of wearing the mock's photograph.
        const pdf = /\.pdf$/i.test(name)
        return files.find((f) => f.id === id) ?? {
          id, leadId: lead.id, kind: pdf ? 'pdf' : 'image', name, thumb: pdf ? null : '/figma-assets/file-thumb-1.png',
          createdAt: at, parentId: null, ownerId: null, sizeBytes: 728064,
          mime: pdf ? 'application/pdf' : 'image/jpeg', updatedAt: at, deletedAt: null,
        } satisfies LeadFile
      })
    if (picked.length) setTiles((t) => [...t, ...picked])
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            {/* (REG-287) tabIndex={-1} so the panel can hold focus; the house panel (surfaceClasses.panel) carries the
                `outline: none` every panel that takes focus on open wears. The ring belongs to the panel's own controls. */}
            <motion.div ref={panelRef} className={`${surfaceClasses.panel} ${styles.panel}`} variants={modalPanel}
                        role="dialog" aria-modal aria-label="Return Lead" tabIndex={-1}
                        data-testid="return-wizard" data-step={step}>
              {/* (REG-725) the house head and foot. Heading 84: "Return Lead" 20/Bold · "<name> · Received on <date>" 12 secondary ·
                  info 24 (coming soon) · close 24 */}
              <SurfaceHead title="Return Lead" subtitle={`${lead.name} · Received on ${displayDate(lead.createdAt)}`} className={styles.head} onClose={onClose}
                           actions={
                             <Tooltip label="Information">
                               <IconButton icon="info" label="Information" size={24} variant="bare" iconSize={24} className={styles.info} onClick={comingSoon} />
                             </Tooltip>
                           } />

              <div className={styles.steps}>
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              {step === 'reason' ? (
                <motion.div key="reason" ref={scrollRef} className={styles.body} custom={dir} variants={stepSlide} initial="initial" animate="animate" exit="exit">
                  <div className={styles.columns}>
                    <div className={styles.form}>
                      {/* (REG-609, parity Q-44) Qanvast's return rules, display only: this lead's standing and its returns so far. */}
                      <div className={styles.rules} data-testid="return-window" data-state={win.state}>
                        <Icon name="info" size={20} className={styles.rulesIcon} />
                        <span>{win.text}{win.state === 'capped' ? '' : ` · ${win.used} of ${RETURN_RULES.maxReturns} returns used`}</span>
                        <Tooltip label={RETURN_RULES_TEXT}><Link variant="primary">Rules</Link></Tooltip>   {/* (REG-614) the DS Link, not a hand-rolled one */}
                      </div>
                      {/* Text Field 48 select "Select a reason" (expand_more) — 1.0's seven reasons (REG-609) */}
                      <TextField label="Select a reason" required mode="select" options={REASON_LABELS} value={reason} onChange={(v) => { setReason(v); setSubReasons([]); setWrongField('') }} error={shown.reason} />
                      {reason ? (
                        <>
                          {r?.help ? <span className={styles.reasonHelp}>{r.help}</span> : null}
                          {/* (REG-609) "Lead refused to meet up" › the specific reasons — the quick filters' rows on the DS Checkbox */}
                          {asks(r, 'subReasons') ? (
                            <div className={styles.group} role="group" aria-label="Select specific reason(s)">
                              <span className={styles.groupLabel}>Select specific reason(s)*</span>
                              <div className={styles.subList}>
                                {REFUSED_SUB_REASONS.map((sr) => {
                                  const on = subReasons.includes(sr)
                                  const toggle = () => setSubReasons((l) => (on ? l.filter((x) => x !== sr) : [...l, sr]))
                                  return (
                                    <div key={sr} className={styles.subRow} role="button" tabIndex={0} data-testid="sub-reason" onClick={toggle}
                                         onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle() } }}>
                                      <span>{sr}</span>
                                      <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}><Checkbox isSelected={on} onChange={toggle} aria-label={sr} /></span>
                                    </div>
                                  )
                                })}
                              </div>
                              {shown.subReasons ? <span className={styles.error} role="alert">{shown.subReasons}</span> : null}
                            </div>
                          ) : null}
                          {asks(r, 'search') ? <TextField label="Search for duplicate lead" placeholder="Search by name or phone..." value={search} onChange={setSearch} trailingIcon={null} /> : null}
                          {asks(r, 'project') ? <TextField label="Existing project reference" placeholder="Enter project name or ID..." value={project} onChange={setProject} trailingIcon={null} /> : null}
                          {asks(r, 'wrongField') ? <TextField label="What’s incorrect?" required mode="select" options={WRONG_FIELDS} value={wrongField} onChange={setWrongField} error={shown.wrongField} /> : null}

                          {/* Text Field 48 "Date and time of first outreach" (trailing event → date-time picker) */}
                          {asks(r, 'outreach') ? <DateTimeField label="Date and time of first outreach" required value={outreach} today={today} onChange={setOutreach} error={shown.outreach} /> : null}

                          {/* [V g10] "Number of attempts made" · row H g10 of five Buttons 86×48 */}
                          {asks(r, 'attempts') ? <div className={styles.group} role="group" aria-label="Number of attempts made">
                            <span className={styles.groupLabel}>Number of attempts made*</span>
                            <div className={styles.attemptsWrap}>
                              <div className={styles.attempts}>
                                {ATTEMPTS.map((a) => (
                                  <button key={a.value} type="button" className={styles.attempt} aria-pressed={attempts === a.value}
                                          data-selected={attempts === a.value || undefined} onClick={() => setAttempts(a.value)}>
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                              {shown.attempts ? <span className={styles.error} role="alert">{shown.attempts}</span> : null}
                            </div>
                          </div> : null}

                          {/* [V g10] "Attach images/screenshots of all your attempts" · tiles · "Attach Files" primary outlined, full width.
                              (REG-904, Dane UAT 9.10) Optional, as 1.0 had it (the parity rule) — and now it says so, as Comments does. */}
                          <div className={styles.group}>
                            <span className={styles.groupLabel}>Attach images/screenshots of all your attempts (optional)</span>
                            {tiles.length ? (
                              <div className={styles.tiles}>
                                {tiles.map((f) => {
                                  const menuOpen = menu === f.id
                                  return (
                                    <div key={f.id} className={styles.tile} data-testid="return-attachment">
                                      <div className={styles.tileMain}>
                                        {f.thumb ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={f.thumb} alt="" className={styles.tileImg} width={142} height={108} />
                                        ) : (
                                          /* No thumbnail (a PDF): the files grid's surface-variant box with the kind's glyph (spec silent). */
                                          <span className={styles.tileBox}><Icon name={kindIcon(f)} size={24} className={styles.tileBoxIcon} /></span>
                                        )}
                                        <span className={styles.caption}>
                                          <Icon name={kindIcon(f)} size={20} className={styles.kindIcon} />
                                          <span className={styles.tileName}>{f.name}</span>
                                        </span>
                                      </div>
                                      <span className={styles.tileMenuWrap}>
                                        <Tooltip label="Attachment actions" disabled={menuOpen}>
                                          <button type="button" className={styles.kebab} aria-label={`Actions for ${f.name}`}
                                                  aria-haspopup="menu" aria-expanded={menuOpen}
                                                  onClick={() => setMenu((m) => (m === f.id ? null : f.id))}>
                                            <Icon name="more_vert" size={24} weight={300} />
                                          </button>
                                        </Tooltip>
                                        {/* Not mocked: one item, at the Notes menus' 140 width (attachments-column.tsx). */}
                                        <Dropdown open={menuOpen} onClose={() => setMenu(null)} align="right" width={140} sheetTitle="Attachment">
                                          <DropdownItem onSelect={() => { setMenu(null); setTiles((t) => t.filter((x) => x.id !== f.id)) }}>Remove</DropdownItem>
                                        </Dropdown>
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : null}
                            <Button className={styles.fullWidth} variant="primary" appearance="outlined"
                                    iconStart={<Icon name="attach_file" size={20} />} onPress={() => setAttachOpen(true)}>
                              Attach Files
                            </Button>
                          </div>

                          {/* [V g4] Text Area 96 "Comments (optional)" placeholder "Any notes goes here..." · "0/500" counter */}
                          <div className={styles.comments}>
                            {/* "notes" → "remarks" (REG-267): the field vocabulary everywhere outside the Notes tab. */}
                            <TextArea label={r?.commentsRequired ? 'Comments (required)' : 'Comments (optional)'} placeholder={r?.commentsRequired ? 'Provide additional details...' : 'Any remarks goes here...'} value={comments}
                                      onChange={setComments} maxLength={COMMENTS_MAX} className={styles.textArea} />
                            <span className={styles.counter} aria-live="polite">{comments.length}/{COMMENTS_MAX}</span>
                            {shown.comments ? <span className={styles.error} role="alert">{shown.comments}</span> : null}
                          </div>
                        </>
                      ) : null}
                    </div>

                    {/* tips-section 260: "Tips to improve conversion" · four tips · Link "View all" (coming soon) */}
                    <aside className={styles.tips} aria-label="Tips to improve conversion">
                      <span className={styles.tipsTitle}>Tips to improve conversion</span>
                      <ul className={styles.tipsList}>
                        {TIPS.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                      <Link variant="primary" className={styles.tipsLink} onPress={comingSoon}>View all</Link>
                    </aside>
                  </div>
                </motion.div>
              ) : (
                /* Step 2 (207): the Terms card 752×380 — "Term of service" 20/Semi Bold + the sentence 14 centred */
                <motion.div key="terms" ref={scrollRef} className={styles.body} custom={dir} variants={stepSlide} initial="initial" animate="animate" exit="exit">
                  <div className={styles.terms}>
                    <div className={styles.termsInner}>
                      <span className={styles.termsTitle}>Term of service</span>
                      <p className={styles.termsText}>{TERMS}</p>
                      {renderLine ? <p className={styles.termsNote} role="alert" data-testid="live-render-links">{renderLine}</p> : null}
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
              </div>

              {/* Footer 68: Cancel · Submit (reads Next once a reason is chosen) — step 2: Back · Confirm. (REG-725) the house foot:
                  its shadow while the step's body scrolls. */}
              <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
                {step === 'reason' ? (
                  <>
                    <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                    <Button className={styles.wide} onPress={next}>{reason ? 'Next' : 'Submit'}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" appearance="outlined" onPress={() => goTo('reason')} isDisabled={busy}>Back</Button>
                    <Button className={styles.wide} onPress={() => { void confirm() }} isDisabled={busy}>Confirm</Button>
                  </>
                )}
              </SurfaceFoot>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* "Attach Files" → the tasks' Attach files modal (902:28220), stacked over the wizard; already attached tiles open pre-checked. */}
      <AttachFilesModal
        open={attachOpen}
        files={files}
        attached={tiles.map((f) => f.id)}
        onClose={() => setAttachOpen(false)}
        onAttach={attach}
        onUploadPicked={(file) => { lastPicked.current = file?.name ?? null /* REG-149: the picked file becomes the mock's file — the modal shows the upload toast and lists it in "Your files" */ }}
      />
    </>
  )
}
