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
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { LibraryEditorGhost } from './library-editor-ghost'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { savedLabel } from '@/lib/contracts/model'
import { DEFAULT_SPLIT_ID, splitWord, sumPct, type SplitRow } from '@/lib/quotes/payments'
import type { PaymentTemplateEditorData } from '@/lib/company/payment-templates'
import { deletePaymentTemplate, duplicatePaymentTemplate, savePaymentTemplate } from '@/app/company/payment-templates-actions'
import { LibraryHeader } from '../library-header'
import { isRefusal } from '@/lib/company/template-rules'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import page from '@/components/contracts/editor/contract-editor.module.css'
import styles from './library-editor.module.css'

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
  const comingSoon = useComingSoon()
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
    try { setUpdatedAt(await savePaymentTemplate(template.id, latest.current)) } catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
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

  return (
    <PageReveal skeleton={<LibraryEditorGhost kind="payments" />}>
      <div className={page.page} data-testid="payment-template-editor">
        <LibraryHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Payments', href: '/company/templates/payments' }]} title={name.trim() || 'Untitled split'}
                       chips={<><MetaChip>{splitWord(rows)}</MetaChip>{isDefault ? <MetaChip>Studio default</MetaChip> : null}{template.usedBy ? <MetaChip>Default on {template.usedBy} quote {template.usedBy === 1 ? 'template' : 'templates'}</MetaChip> : null}</>}
                       savedLabel={savedLabel(updatedAt, clock)} primary={{ label: 'Done', onPress: close }}
                       menu={<>
                         <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicatePaymentTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/payments/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem tone="danger" disabled={isDefault} help={isDefault ? 'The studio default cannot be deleted' : undefined} onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>   {/* (REG-728) the reason in the row */}
                       </>} onClose={close} />
        <div className={page.meta} data-testid="library-meta">
          <input className={page.titleInput} value={name} placeholder="Split name" aria-label="Split name" maxLength={80} onChange={(e) => { setName(e.target.value); queue() }} onBlur={() => { void flushRef.current() }} />
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
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
        <MaisonFab onPress={() => setAiOpen((o) => !o)} />
      </div>
    </PageReveal>
  )
}
