'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { LibraryEditorGhost } from './library-editor-ghost'
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { savedLabel } from '@/lib/contracts/model'
import { DEFAULT_SPLIT_ID, splitWord, sumPct, type SplitRow } from '@/lib/quotes/payments'
import type { PaymentTemplateEditorData } from '@/lib/company/payment-templates'
import { deletePaymentTemplate, duplicatePaymentTemplate, savePaymentTemplate } from '@/app/company/payment-templates-actions'
import { LibraryHeader } from '../library-header'
import { isRefusal } from '@/lib/company/template-rules'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import page from '@/components/contracts/editor/contract-editor.module.css'
import { TitleInput } from '@/components/contracts/editor/title-input'   // (Dane UAT 3.18) the editors' one title, with its pencil
import styles from './library-editor.module.css'
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

const AUTOSAVE_MS = 600
const fmtPct = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

/**
 * The payment template editor (REG-538): the split's milestones — name · description · share · when it falls due (the first is
 * due on approval, the rest are estimated across the renovation, as the Payment Schedule does) — with a total row that says
 * when the shares stop adding up to 100. Header: "Company / Templates / Payments" · Done · kebab (Duplicate · Delete).
 */
export function PaymentTemplateEditor({ data, from }: { data: PaymentTemplateEditorData; from?: string }) {
  const { template, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const isDefault = template.id === DEFAULT_SPLIT_ID
  const [name, setName] = useState(template.name)
  const [rows, setRows] = useState<SplitRow[]>(template.rows.length ? template.rows : [{ name: 'Deposit', description: 'Upon signing', pct: 50 }, { name: 'Completion', description: 'Handover', pct: 50 }])
  const [draftPct, setDraftPct] = useState<{ i: number; text: string } | null>(null)
  const [updatedAt, setUpdatedAt] = useState(template.updatedAt.getTime())
  const [clock, setClock] = useState(now)
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const dirty = useRef(false)
  const latest = useRef({ name, rows }); useEffect(() => { latest.current = { name, rows } })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (!dirty.current) return
    dirty.current = false
    try { setUpdatedAt(await orThrow(savePaymentTemplate(template.id, latest.current))) } catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback(() => { dirty.current = true; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS) }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  const patch = (i: number, p: Partial<SplitRow>) => { setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r))); queue() }
  const remove = (i: number) => { setRows((rs) => rs.filter((_, k) => k !== i)); queue() }
  const add = () => { setRows((rs) => [...rs, { name: 'New payment', description: null, pct: 0 }]); queue() }
  const total = sumPct(rows)
  const over = total > 100.005, under = total < 99.995
  const backHref = from ?? '/company/templates/payments'
  const close = () => { void flushRef.current(); router.push(backHref) }

  /* (pending modules S10 — card held:maison-ai, "eight editors open an empty Maison AI sheet") The split's Maison AI, by rule from the page:
     whether the shares add up — and, when they don't, the fix shown first with one button (the last milestone takes the difference; Undo puts
     it back) —, what a S$100,000 quote asks at each step, and where the split is a default. *(invented copy: the answers' titles and lines)* */
  const aiFabRef = useRef<HTMLSpanElement>(null)
  const EXAMPLE = 100_000
  const shareRows = rows.map((r, i) => ({ id: `m-${i}`, label: `${r.name || `Milestone ${i + 1}`} · ${fmtPct(r.pct)}%`, meta: i === 0 ? 'On approval' : r.description ?? 'Estimated', share: Math.max(0, Math.min(1, r.pct / 100)) }))
  const last = rows[rows.length - 1]
  const diff = Math.round((100 - total) * 100) / 100
  const maison: MaisonSuggestion[] = [
    over || under
      ? { label: 'Does the split add up?', propose: () => Promise.resolve(!last || last.pct + diff < 0
          ? { title: `It comes to ${fmtPct(total)}%`, text: `${over ? 'Over' : 'Short of'} 100% by ${fmtPct(Math.abs(diff))}% — change the shares so they add up to the quote.`, rows: shareRows }
          : { title: `It comes to ${fmtPct(total)}%`, text: `${over ? `${fmtPct(-diff)}% over` : `${fmtPct(diff)}% short`} — ${last.name || 'the last milestone'} can take the difference, so the schedule closes the quote exactly.`,
              lines: [`${last.name || 'The last milestone'}: ${fmtPct(last.pct)}% → ${fmtPct(last.pct + diff)}%`, 'Undo puts it back'], confirm: `Make it ${fmtPct(last.pct + diff)}%`,
              run: async () => {
                const was = rows
                setRows((rs) => rs.map((r, k) => (k === rs.length - 1 ? { ...r, pct: Math.round((r.pct + diff) * 100) / 100 } : r))); queue()
                snackbar({ message: `${last.name || 'The last milestone'} is ${fmtPct(last.pct + diff)}% — the split adds up to 100%`, actionLabel: 'Undo', onAction: () => { setRows(was); queue() } })
                return true
              } }) }
      : { label: 'Does the split add up?', answer: { title: 'It adds up to 100%', text: 'The schedule closes the quote exactly.', rows: shareRows } },
    { label: 'What a S$100,000 quote asks at each step', answer: { title: 'On a S$100,000 quote', text: 'Each milestone’s share of the total — the first on approval, the rest across the renovation.',
      rows: rows.map((r, i) => ({ id: `x-${i}`, label: `${r.name || `Milestone ${i + 1}`} · S$${Math.round(EXAMPLE * r.pct / 100).toLocaleString('en-SG')}`, meta: `${fmtPct(r.pct)}% · ${i === 0 ? 'on approval' : (r.description ?? 'estimated').toLowerCase()}`, share: Math.max(0, Math.min(1, r.pct / 100)) })) } },
    { label: 'Where is it used?', answer: { title: isDefault ? 'The studio’s default split' : template.usedBy ? `The default on ${template.usedBy === 1 ? '1 quote template' : `${template.usedBy} quote templates`}` : 'Not a default yet',
      text: isDefault ? 'A quote whose template names no split starts with this one.' : template.usedBy ? 'New quotes from them start with this split. Quotes already on it keep their schedule when you change it.' : 'Pick it on a quote template’s New quotes tab and new quotes from it start with this split.' } },
  ]

  return (
    <PageReveal skeleton={<LibraryEditorGhost kind="payments" />}>
      <div className={page.page} data-testid="payment-template-editor">
        <LibraryHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Payment schedules', href: '/company/templates/payments' }]} title={name.trim() || 'Untitled split'}
                       chips={<><MetaChip>{splitWord(rows)}</MetaChip>{isDefault ? <MetaChip>Studio default</MetaChip> : null}{template.usedBy ? <MetaChip>Default on {template.usedBy} quote {template.usedBy === 1 ? 'template' : 'templates'}</MetaChip> : null}</>}
                       savedLabel={savedLabel(updatedAt, clock)} primary={{ label: 'Done', onPress: close }}
                       menu={<>
                         <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicatePaymentTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/payments/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem tone="danger" disabled={isDefault} help={isDefault ? 'The studio default cannot be deleted' : undefined} onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>   {/* (REG-728) the reason in the row */}
                       </>} onClose={close} />
        <div className={page.meta} data-testid="library-meta">
          <TitleInput value={name} placeholder="Split name" aria-label="Split name" maxLength={80} onChange={(e) => { setName(e.target.value); queue() }} onBlur={() => { void flushRef.current() }} />
          <div className={page.metaEnd}><span className={styles.note}>{rows.length} {rows.length === 1 ? 'milestone' : 'milestones'} · {splitWord(rows)}</span></div>
        </div>
        <div className={styles.body}>
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>Milestones</span><span className={styles.cardHelp}>Shares of the quote’s total. The first is due on approval; the rest are estimated across the renovation.</span></div>
            <div className={styles.cardBody}>
              <span className={styles.bar} aria-hidden>{rows.map((r, i) => <span key={i} className={styles.seg} style={{ flex: `${Math.max(r.pct, 1)} 0 0` }} />)}</span>
              <div className={styles.milestones} role="table" aria-label="Milestones">
                <span className={styles.mHead} /><span className={styles.mHead}>Milestone</span><span className={styles.mHead}>Description</span><span className={styles.mHead}>Share</span><span className={styles.mHead}>Due</span><span className={styles.mHead} />
                {rows.map((r, i) => (
                  <div key={i} className={styles.mRow} role="row" data-testid="milestone-row">
                    <span className={styles.stepNo}>{i + 1}</span>
                    <TextField label="Milestone" size="s" value={r.name} onChange={(v) => patch(i, { name: v })} />
                    <TextField label="Description" size="s" value={r.description ?? ''} onChange={(v) => patch(i, { description: v || null })} />
                    <TextField label="Share (%)" size="s" numeric="amount" maxLength={6} value={draftPct?.i === i ? draftPct.text : fmtPct(r.pct)}
                               onChange={(v) => { setDraftPct({ i, text: v }); const n = Number(v); if (v.trim() !== '' && Number.isFinite(n)) patch(i, { pct: Math.max(0, Math.min(100, n)) }) }}
                               onBlur={() => setDraftPct(null)} />
                    <span className={styles.mDue}>{i === 0 ? 'On approval' : 'Estimated'}</span>
                    <Tooltip label="Remove"><IconButton icon="delete" label={`Remove ${r.name}`} onClick={() => remove(i)} /></Tooltip>
                  </div>
                ))}
                <span /><span className={styles.mTotal}>Total</span><span className={styles.mTotalPct} data-over={over || undefined} data-under={under || undefined}>{fmtPct(total)}%</span>
                <span className={styles.mTotalNote} data-over={over || undefined}>{over ? `${fmtPct(total - 100)}% over — the schedule would ask for more than the quote` : under ? `${fmtPct(100 - total)}% short — the last payment will not close the quote` : 'Adds up to the quote'}</span>
              </div>
              <Button variant="secondary" appearance="outlined" className={styles.addRow} iconStart={<Icon name="add" size={20} />} onPress={add}>Add a milestone</Button>
            </div>
          </div>
        </div>
        <ConfirmDialog open={deleteOpen} title={`Delete ${name.trim() || 'this split'}?`} confirmLabel="Delete" tone="danger"
                       message={template.usedBy ? `${template.usedBy} quote ${template.usedBy === 1 ? 'template names' : 'templates name'} it — new quotes from them fall back to the studio default. Quotes already on this split keep their schedule.` : 'Quotes already on this split keep their schedule. You can restore it from Deleted Templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deletePaymentTemplate(template.id).then((r) => { if (isRefusal(r)) { snackbar({ message: couldnt('delete the template', refusalOf(r.error)) }); return } snackbar({ message: 'Template deleted' }); router.push('/company/templates/payments') }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        <MaisonAiSheet open={aiOpen} suggestions={maison} onClose={() => setAiOpen(false)} anchorRef={aiFabRef} />   {/* (pending modules S10) the shell's one sheet; the FAB's own press toggles it (REG-153) */}
        <span ref={aiFabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}
