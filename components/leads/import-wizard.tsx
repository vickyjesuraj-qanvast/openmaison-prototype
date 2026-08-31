'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { PortalMenu } from '@/components/leads/move-stage/fields'
import menuStyles from '@/components/leads/menus.module.css'
import { modalPanel, overlayFade, duration, ease } from '@/lib/motion'
import { parseCsv } from '@/lib/csv'
import { IMPORT_FIELDS, IGNORE, PREVIEW_COLUMNS, autoMap, toRecord, type ImportField, type Mapping } from '@/lib/leads/import-fields'
import styles from './import-wizard.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { ChoiceCard } from '@/components/om/choice-card'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { Tooltip } from '@/components/om/tooltip'

export const TEMPLATE_HREF = '/templates/leads-import-template.csv'

export type ImportDestination = 'listing' | 'review'
export type ImportPayload = { fileName: string; headers: string[]; mapping: Mapping; rows: string[][]; destination: ImportDestination }
export type ImportResult = { importId: string; total: number; imported: number; skipped: number; duplicates: number; destination: ImportDestination; approved: number; flagged: number }

type Parsed = { name: string; headers: string[]; rows: string[][] }

function FieldSelect({
  value, error, onChange, used,
}: { value: Mapping[number]; error?: boolean; onChange: (v: Mapping[number]) => void; used: Set<string> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} style={{ display: 'inline-flex' }}>
      <button type="button" className={styles.select} data-open={open || undefined} data-error={error || undefined} onClick={() => setOpen((o) => !o)}>
        <span>{value ?? 'Select Field'}</span>
        <span className={styles.chev}><Icon name="expand_more" size={16} /></span>
      </button>
      <PortalMenu open={open} anchor={ref} onClose={() => setOpen(false)}>
        {[IGNORE, ...IMPORT_FIELDS].map((o) => (
          <button key={o} type="button" role="option" aria-selected={o === value} className={menuStyles.item}
                  style={o !== IGNORE && used.has(o) && o !== value ? { color: 'var(--om-color-on-surface-secondary)' } : undefined}
                  onClick={() => { onChange(o); setOpen(false) }}>
            {o}
          </button>
        ))}
      </PortalMenu>
    </div>
  )
}

export function ImportWizard({
  open, onClose, onImport, onDone,
}: {
  open: boolean
  onClose: () => void
  onImport: (payload: ImportPayload) => Promise<ImportResult | null>
  onDone: (result: ImportResult) => void
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const router = useRouter()
  const snackbar = useSnackbar()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [toast, setToast] = useState<{ name: string; state: 'uploading' | 'done' } | null>(null)
  const [toastCollapsed, setToastCollapsed] = useState(false)
  const [over, setOver] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [destOpen, setDestOpen] = useState(false)
  const [destination, setDestination] = useState<ImportDestination | null>(null)   // no default — the user chooses (821:23969)
  const [mapping, setMapping] = useState<Mapping>([])
  const [autoMapped, setAutoMapped] = useState<Mapping>([])   // what auto-match proposed, to label rows
  const [autoCount, setAutoCount] = useState(0)
  const [errorRow, setErrorRow] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep(1); setParsed(null); setToast(null); setToastCollapsed(false); setOver(false)
      setConfirmClose(false); setDestOpen(false); setDestination(null); setMapping([]); setAutoMapped([]); setAutoCount(0); setErrorRow(null); setBusy(false); setResult(null)
    }
  }
  // Reset the in-flight guard on open; kill a pending upload timer on close.
  useEffect(() => {
    if (open) { busyRef.current = false; return }
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }, [open])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // A file dropped outside the dashed zone must never navigate the tab to the CSV.
  useEffect(() => {
    if (!open) return
    const swallow = (e: DragEvent) => { e.preventDefault() }
    window.addEventListener('dragover', swallow)
    window.addEventListener('drop', swallow)
    return () => { window.removeEventListener('dragover', swallow); window.removeEventListener('drop', swallow) }
  }, [open])

  // Closing is gated while an import is in flight (Esc, scrim, ×); once the
  // import has happened (step 4) any dismissal behaves like Done.
  const close = () => {
    if (busyRef.current) return
    if (step === 4 && result) onDone(result)
    else if (step === 2 || step === 3) setConfirmClose(true)   // mid-flow: confirm before losing the mapping (user 2026-08-28)
    else onClose()
  }
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close })   // keep the Esc handler on the latest closure

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const acceptFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv') {
      snackbar({ message: 'XLS/XLSX import — coming in the next build. Please upload a CSV.' })
      return
    }
    const text = await file.text()
    const grid = parseCsv(text)
    if (grid.length < 2) {
      snackbar({ message: 'That file has no lead rows to import' })
      return
    }
    const headers = grid[0]!.map((h) => h.trim())
    const rows = grid.slice(1)
    setToast({ name: file.name, state: 'uploading' })
    setToastCollapsed(false)
    setParsed(null)
    setErrorRow(null)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      setToast({ name: file.name, state: 'done' })
      setParsed({ name: file.name, headers, rows })
      const m = autoMap(headers)
      setMapping(m)
      setAutoMapped(m)
      setAutoCount(m.filter(Boolean).length)
    }, 900)
  }

  const goNextFromMap = () => {
    const hasName = mapping.some((f) => f === 'Lead Name')
    if (!hasName) {
      const idx = mapping.findIndex((f) => f === null)
      setErrorRow(idx === -1 ? 0 : idx)
      return
    }
    setErrorRow(null)
    setStep(3)
  }

  const runImport = async () => {
    if (!parsed || busyRef.current || !destination) return
    busyRef.current = true
    setDestOpen(false)
    setBusy(true)
    const r = await onImport({ fileName: parsed.name, headers: parsed.headers, mapping, rows: parsed.rows, destination })
    setBusy(false)
    busyRef.current = false
    if (r) { setResult(r); setStep(4) }
  }

  const setField = (i: number, v: Mapping[number]) => {
    setMapping((m) => m.map((cur, j) => {
      if (j === i) return v
      // a target can be used by one column only — selecting it elsewhere releases it
      if (v && v !== IGNORE && cur === v) return null
      return cur
    }))
  }

  const used = new Set(mapping.filter((f): f is ImportField => !!f && f !== IGNORE))
  // The preview shows the columns the user just mapped, not every OpenMaison field: PREVIEW_COLUMNS is
  // the label/width/order lookup, the mapping decides which of them appear. The shipped template maps
  // all 14, so 779:26144 still draws 120/171/124/…/200; a file that maps 7 no longer scrolls past 7 blanks.
  const previewCols = PREVIEW_COLUMNS.filter((c) => used.has(c.field))
  const nameMissing = !mapping.some((f) => f === 'Lead Name')
  const previewValue = (row: string[], field: ImportField) => {
    const rec = toRecord(parsed?.headers ?? [], mapping, row)
    const v = rec[field] ?? ''
    if (field === 'Estimated Budget (S$)' && /^\d+$/.test(v)) return Number(v).toLocaleString('en-SG')
    return v
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
          <motion.div className={styles.panel} variants={modalPanel} role="dialog" aria-modal aria-label="Import Leads">
            <div className={styles.heading}>
              <span className={styles.title}>Import Leads</span>
              <span className={styles.step}>Step {step} of 4</span>
              <Tooltip label="Close" disabled={busy}>
                <button type="button" className={styles.close} aria-label="Close" onClick={close} disabled={busy}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>

            <div className={styles.body}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: duration.step, ease: ease.standard }}>
                  {step === 1 ? (
                    <div className={styles.step1}>
                      <div className={styles.tips}>
                        <div className={styles.tipBlock}>
                          <span className={styles.tipTitle}>Tips on Importing</span>
                          <ul className={styles.tipList}>
                            <li>Easily import your leads into OpenMaison using <a className={styles.inlineLink} href={TEMPLATE_HREF} download>this template</a></li>
                          </ul>
                        </div>
                        <div className={styles.tipBlock}>
                          <span className={styles.tipTitle}>Important Reminders</span>
                          <ul className={styles.tipList}>
                            <li>List only one lead per row</li>
                            <li>Every lead must have a lead Name</li>
                            <li>Avoid duplicate entries</li>
                          </ul>
                        </div>
                        <div className={styles.rule} />
                        <div className={styles.linkCol}>
                          <a className={styles.link} href={TEMPLATE_HREF} download>
                            <Icon name="download" size={20} />Download Leads Import Template
                          </a>
                          <button type="button" className={styles.link} onClick={() => { onClose(); router.push('/leads/imports') }}>
                            <Icon name="history" size={20} />Lead Import History
                          </button>
                        </div>
                      </div>
                      <div className={styles.uploadCol}>
                        <span className={styles.uploadTitle}>Upload local file</span>
                        <input ref={fileRef} type="file" accept=".csv" className={styles.hiddenInput}
                               onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = '' }} />
                        {parsed ? (
                          <div className={styles.dropSuccess}>
                            <div className={styles.successGroup}>
                              <span className={styles.successCheck}><Icon name="check_circle" size={20} fill weight={300} /></span>
                              <span className={styles.successTitle}>Success!</span>
                              <span className={styles.successSub}>
                                Detected {parsed.rows.length} line(s). Click “Next” to start mapping your files’s column headers to our fields in OpenMaison.
                              </span>
                            </div>
                            <div className={styles.successGroup}>
                              <Icon name="draft" size={20} fill weight={300} />
                              <span className={styles.fileName}>{parsed.name}</span>
                              <button type="button" className={styles.reupload} onClick={() => fileRef.current?.click()}>Re-upload File</button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.dropzone} data-over={over || undefined} role="button" tabIndex={0}
                               onClick={() => fileRef.current?.click()}
                               onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click() }}
                               onDragOver={(e) => { e.preventDefault(); setOver(true) }}
                               onDragLeave={() => setOver(false)}
                               onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) void acceptFile(f) }}>
                            <span className={styles.dropMain}>Drop your file or <u>browse</u></span>
                            <span className={styles.dropSub}>Supports: CSV, XLS, XLSX</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : step === 2 && parsed ? (
                    <div className={styles.stepBody}>
                      <div>
                        <div className={styles.stepTitle}>Map your columns to OpenMaison Fields</div>
                        <div className={styles.stepDesc}>
                          Ensure your columns align with the correct OpenMaison fields, especially assigning one to “Lead Name”. Only columns matched to a OpenMaison field name will be imported.
                        </div>
                        {autoCount > 0 ? (
                          <div className={styles.autoNote}><Icon name="check_circle" size={16} fill />{autoCount} column{autoCount === 1 ? '' : 's'} auto-matched</div>
                        ) : null}
                      </div>
                      <div className={styles.mapTable} onScroll={(e) => { e.currentTarget.dataset.scrolled = String(e.currentTarget.scrollTop > 0) }}>
                        <div className={styles.mapHead}>
                          <div className={`${styles.mapCell} ${styles.colName} ${styles.hLabel}`}>Column Name</div>
                          <div className={`${styles.mapCell} ${styles.colReview} ${styles.hLabel}`}>Content Review</div>
                          <div className={`${styles.mapCell} ${styles.colSelect} ${styles.hLabel}`}>Select OpenMaison Field Name</div>
                        </div>
                        {parsed.headers.map((h, i) => {
                          const samples = parsed.rows.map((r) => r[i] ?? '').filter((v) => v.trim()).slice(0, 3)
                          return (
                            <div key={`${h}-${i}`} className={styles.mapRow}>
                              <div className={`${styles.mapCell} ${styles.colName}`}>
                                <span className={styles.colNameText}>{h || `Column ${i + 1}`}</span>
                                {/* Row status (user 2026-08-28): auto-matched / mapped / not mapped / ignored */}
                                {(() => {
                                  const v = mapping[i] ?? null
                                  if (v === IGNORE) return <Tag appearance="outlined">Ignored</Tag>
                                  if (!v) return <Tag color="yellow" appearance="outlined">Not mapped</Tag>
                                  return <Tag color="green" appearance="outlined">{autoMapped[i] === v ? 'Auto-matched' : 'Mapped'}</Tag>
                                })()}
                              </div>
                              <div className={`${styles.mapCell} ${styles.colReview}`}>
                                <div className={styles.reviewList}>{samples.map((s, k) => <span key={k}>{s}</span>)}</div>
                              </div>
                              <div className={`${styles.mapCell} ${styles.colSelect}`}>
                                <FieldSelect value={mapping[i] ?? null} used={used} error={errorRow === i && nameMissing} onChange={(v) => setField(i, v)} />
                                {errorRow === i && nameMissing ? <span className={styles.required}>Required</span> : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : step === 3 && parsed ? (
                    <div className={styles.stepBody}>
                      <div>
                        <div className={styles.stepTitle}>Review your columns to OpenMaison Fields</div>
                        <div className={styles.stepDesc}>
                          Ensure your columns align with the correct OpenMaison fields, especially assigning one to “Lead Name”. Only columns matched to a OpenMaison field name will be imported.
                        </div>
                      </div>
                      <div className={styles.previewWrap} onScroll={(e) => { e.currentTarget.dataset.scrolled = String(e.currentTarget.scrollTop > 0) }}>
                        {/* A grid, not fixed-width cells: every value shows in full (mock widths are minimums; the
                            column grows to its longest value and the wrap scrolls sideways) — user 2026-08-28. */}
                        <div className={styles.preview} role="table" aria-label="Import preview"
                             style={{ gridTemplateColumns: ['76px', ...previewCols.map((c) => `minmax(${c.width}px, auto)`)].join(' ') }}>
                          <div className={`${styles.pRow} ${styles.pHead}`} role="row">
                            <div className={styles.pCell} role="columnheader"><span>SL No</span></div>
                            {previewCols.map((c) => (
                              <div key={c.field} className={styles.pCell} role="columnheader"><span>{c.label}</span></div>
                            ))}
                          </div>
                          {parsed.rows.map((r, i) => (
                            <div key={i} className={styles.pRow} role="row">
                              <div className={styles.pCell} role="cell"><span>{i + 1}</span></div>
                              {previewCols.map((c) => (
                                <div key={c.field} className={styles.pCell} role="cell"><span>{previewValue(r, c.field)}</span></div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : step === 4 && result ? (
                    <div className={styles.done}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/figma-assets/import-done.svg" alt="" className={styles.doneArt} />
                      <span className={styles.doneTitle}>{result.imported} of {result.total} records imported successfully</span>
                      <span className={styles.doneSub}>
                        {result.destination === 'listing'
                          ? (result.approved === 0 && result.duplicates + result.flagged > 0
                              ? `All ${result.duplicates + result.flagged} look like duplicates of existing leads — sent to Review imported leads`
                              : `${result.approved} lead${result.approved === 1 ? '' : 's'} added to your listing${result.duplicates + result.flagged > 0 ? ` · ${result.duplicates + result.flagged} possible duplicate${result.duplicates + result.flagged === 1 ? '' : 's'} sent to review` : ''}`)
                          : `${result.imported} lead${result.imported === 1 ? '' : 's'} waiting in Review imported leads`}
                      </span>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {toast && step === 1 ? (
                  <motion.div className={styles.toast} data-collapsed={toastCollapsed || undefined} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                              transition={{ duration: duration.snackbar, ease: ease.decelerate }} role="status">
                    <div className={styles.toastHead}>
                      <span className={styles.toastTitle}>Uploading 1 file</span>
                      <Tooltip label={toastCollapsed ? 'Expand' : 'Collapse'} side="top">
                        <button type="button" className={styles.toastBtn} aria-label={toastCollapsed ? 'Expand' : 'Collapse'} aria-expanded={!toastCollapsed}
                                onClick={() => setToastCollapsed((c) => !c)}>
                          <Icon name={toastCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={24} />
                        </button>
                      </Tooltip>
                      <Tooltip label="Dismiss upload status" side="top">
                        <button type="button" className={styles.toastBtn} aria-label="Dismiss upload status" onClick={() => setToast(null)}><Icon name="close" size={24} /></button>
                      </Tooltip>
                    </div>
                    {toastCollapsed ? null : (
                    <div className={styles.toastRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/figma-assets/file-csv.svg" alt="" width={40} height={40} />
                      <span className={styles.toastFile}>{toast.name}</span>
                      {toast.state === 'uploading' ? <span className={styles.toastStatus}>Uploading...</span> : null}
                      <span className={`${styles.toastIcon} ${toast.state === 'uploading' ? styles.spin : ''}`}>
                        <Icon name={toast.state === 'uploading' ? 'progress_activity' : 'check_circle'} size={20} fill={toast.state === 'done'} />
                      </span>
                    </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Lead routing (821:23969 / 821:24010): question + two option cards with the radio on the right; no default. */}
            <Dialog open={destOpen} onClose={() => setDestOpen(false)} title="Lead routing" width={400} size="standard"
                    footer={<>
                      <Button variant="secondary" appearance="outlined" onPress={() => setDestOpen(false)}>Cancel</Button>
                      <Button onPress={() => { void runImport() }} isDisabled={busy || destination === null}>Import</Button>
                    </>}>
              {/* Count = rows in the file about to be imported (821:23969 shows "these 320 leads"). */}
              <span className={styles.destQuestion}>Where should {parsed ? `${parsed.rows.length === 1 ? 'this' : 'these'} ${parsed.rows.length} lead${parsed.rows.length === 1 ? '' : 's'}` : 'these leads'} go?</span>
              <div className={styles.destList} role="radiogroup" aria-label="Where should these leads go?">
                {([
                  { key: 'listing', title: 'Add to my lead listing', help: 'Leads are added to your listing right away as New. Anything that looks like a duplicate of an existing lead still goes to Review imported leads.' },
                  { key: 'review', title: 'Review and approve manually', help: 'Nothing is added yet. Check each lead in Review imported leads first, then approve, reject or merge it.' },
                ] as const).map((o) => (
                  <ChoiceCard key={o.key} title={o.title} help={o.help} selected={destination === o.key} onSelect={() => setDestination(o.key)} />
                ))}
              </div>
            </Dialog>
            <ConfirmDialog open={confirmClose} title="Are you sure you want to close?" message="Your file and column mapping won't be saved."
                           confirmLabel="Close window" onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); onClose() }} />
            <div className={styles.footer}>
              {step === 1 ? (
                <>
                  <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                  <Button onPress={() => setStep(2)} isDisabled={!parsed}>Next</Button>
                </>
              ) : step === 2 ? (
                <>
                  <Button variant="secondary" appearance="outlined" onPress={() => setStep(1)}>Previous</Button>
                  <Button onPress={goNextFromMap}>Next</Button>
                </>
              ) : step === 3 ? (
                <>
                  <Button variant="secondary" appearance="outlined" onPress={() => setStep(2)} isDisabled={busy}>Previous</Button>
                  <Button onPress={() => setDestOpen(true)} isDisabled={busy}>Import</Button>
                </>
              ) : (
                <Button onPress={() => { if (result) onDone(result) }}>Done</Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
