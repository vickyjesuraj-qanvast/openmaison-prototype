'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { MetaChip } from '@/components/om/meta-chip'
import { templateKind } from '@/lib/company/sections'
import { DEFAULT_SPLIT_ID, splitWord, sumPct } from '@/lib/quotes/payments'
import type { PaymentTemplateRow, PaymentTemplatesData } from '@/lib/company/payment-templates'
import { createPaymentTemplate, deletePaymentTemplate, deletePaymentTemplatesForever, duplicatePaymentTemplate, emptyPaymentTemplateTrash, renamePaymentTemplate, restorePaymentTemplates } from '@/app/company/payment-templates-actions'
import { LibraryGallery, newIdOf, reasonOf, type LibraryItem } from './library-gallery'
import styles from './library-gallery.module.css'
import { templateChangeBlock, templatePurgeBlock, templateRestoreBlock } from '@/lib/company/template-rules'
import { folderBlock, type Folder } from '@/lib/company/folder-libraries'
import { useHere } from '@/components/om/use-here'

type Row = PaymentTemplateRow & LibraryItem
const toRow = (t: PaymentTemplateRow): Row => ({ ...t, title: t.name })

/**
 * Company › Templates › Payments (REG-538): the milestone splits as a library — the four presets seeded, the studio's own
 * beside them (from the Payment Schedule's "Save this split as a template", or New template ▾ here). A card draws the split
 * as one bar; the editor sets names, shares and due rules. The studio default (10/30/30/30) cannot be deleted: every fallback lands on it.
 */
export function PaymentTemplatesGallery({ data, from, folders = [] }: { data: PaymentTemplatesData; from?: string; folders?: Folder[] }) {
  const { templates, deleted, now } = data
  const router = useRouter()
  const { fail } = useRun()
  const kind = templateKind('payments')!
  const here = useHere('/company/templates/payments')   // (round 3) the open folder and search ride along
  const open = useCallback((id: string) => router.push(`/templates/payments/${id}?from=${encodeURIComponent(here)}`), [router, here])
  /* (wave E, E7) a refusal answers { error: the rule } — said after "Couldn’t …", never an editor opened on "[object Object]" */
  const create = async (fn: () => Promise<unknown>, what: string) => { try { open(await newIdOf(fn())) } catch (e) { fail(what, reasonOf(e)) } }
  const balanced = (t: PaymentTemplateRow) => Math.abs(sumPct(t.rows) - 100) < 0.005

  return (
    <LibraryGallery<Row> kind={kind} from={from} folders={{ library: 'payments', list: folders, block: folderBlock(data.viewer) }} items={templates.map(toRow)} deleted={deleted.map(toRow)} now={now} ariaLabel="Payment templates" mayChange={(t) => templateChangeBlock(data.viewer, t.createdBy)} tableKey="payment-templates"
      newMenu={(close) => (<>
        <DropdownItem onSelect={() => { close(); void create(() => createPaymentTemplate({ source: { kind: 'blank' } }), 'create the template') }}>Blank split</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={() => { close(); void create(() => createPaymentTemplate({ source: { kind: 'copy', id: DEFAULT_SPLIT_ID } }), 'create the template') }}>Start from Default 10/30/30/30</DropdownItem>
      </>)}
      filters={[{ key: 'preset', label: 'Studio presets', test: (t) => t.isPreset }, { key: 'own', label: 'Your own', test: (t) => !t.isPreset }]}
      searchText={(t) => t.rows.map((r) => r.name).join(' ')}
      thumb={(t) => (
        <span className={styles.split}>
          <span className={styles.splitBar}>{t.rows.map((r, i) => <span key={i} className={styles.splitSeg} style={{ flex: `${Math.max(r.pct, 1)} 0 0` }} />)}</span>
          <span className={styles.splitRows}>{t.rows.slice(0, 4).map((r, i) => <span key={i} className={styles.splitRow}><span>{r.name}</span><span>{Number.isInteger(r.pct) ? r.pct : r.pct.toFixed(1)}%</span></span>)}{t.rows.length > 4 ? <span className={styles.checkMore}>+{t.rows.length - 4} more</span> : null}</span>
        </span>
      )}
      glyph={(t) => <span className={styles.glyphSplit}>{t.rows.map((r, i) => <span key={i} style={{ flex: `${Math.max(r.pct, 1)} 0 0` }} />)}</span>}
      meta={(t) => `${t.rows.length} ${t.rows.length === 1 ? 'milestone' : 'milestones'} · ${splitWord(t.rows)}${balanced(t) ? '' : ` · adds up to ${sumPct(t.rows)}%`}`}
      usage={(t) => (t.usedBy === 0 ? 'Not a default anywhere' : `Default on ${t.usedBy} quote ${t.usedBy === 1 ? 'template' : 'templates'}`)}
      usageWord={(t) => (t.usedBy === 0 ? '--' : `${t.usedBy} quote template${t.usedBy === 1 ? '' : 's'}`)}
      chips={(t) => <>{t.id === DEFAULT_SPLIT_ID ? <MetaChip>Studio default</MetaChip> : null}{!balanced(t) ? <MetaChip>Not 100%</MetaChip> : null}</>}
      columns={[
        { key: 'split', label: 'Split', track: '200px', cell: (t) => <span className={styles.oneLine}>{splitWord(t.rows)}</span> },
        { key: 'milestones', label: 'Milestones', track: '120px', sortable: (t) => t.rows.length, cell: (t) => <span>{t.rows.length}</span> },
        { key: 'used', label: 'Default on', track: '160px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} quote template{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>—</span>) },
      ]}
      onOpen={(t) => open(t.id)}
      onDuplicate={(t) => create(() => duplicatePaymentTemplate(t.id), 'duplicate the template')}
      onRename={(t, name) => renamePaymentTemplate(t.id, name)}
      onDelete={(t) => { if (t.id === DEFAULT_SPLIT_ID) throw new Error('default'); return deletePaymentTemplate(t.id) }}
      deleteMessage={(t) => (t.id === DEFAULT_SPLIT_ID ? 'The studio default cannot be deleted — every quote that names no split falls back to it.' : t.usedBy ? `${t.usedBy} quote ${t.usedBy === 1 ? 'template names' : 'templates name'} it — new quotes from them fall back to the studio default until you pick another. Quotes already on this split keep their schedule.` : 'Quotes already on this split keep their schedule. You can restore it from Deleted Templates.')}
      onRestore={(ids) => restorePaymentTemplates(ids)} onDeleteForever={(ids) => deletePaymentTemplatesForever(ids)} onEmptyTrash={() => emptyPaymentTemplateTrash()}
      /* (verify round 3) the Deleted sheet offers only what the server allows — Restore and Delete Forever on a split the viewer made (or any,
         for an Owner or an Admin), the rule said in the row with its author's name — a preset, which no one wrote, an Owner's or an Admin's */
      restoreBlock={(t) => templateRestoreBlock(data.viewer, t.createdBy, t.author)} purgeRule={(t) => templatePurgeBlock(data.viewer, t.createdBy, t.author)}
      keepReason={(t) => (t.usedBy > 0 ? `${t.usedBy} quote ${t.usedBy === 1 ? 'template names' : 'templates name'} it — restore it instead` : null)}
      deletedMeta={{ label: 'Split', value: (t) => splitWord(t.rows) }}
      empty={{ title: 'No payment templates yet', help: 'Save a quote’s schedule as a template from its Payment Schedule, or start a split here.',
        /* (REG-735) the first run carries New ▾'s rows: the studio's default split first */
        start: () => ({ primary: { label: 'Start from Default 10/30/30/30', onPress: () => { void create(() => createPaymentTemplate({ source: { kind: 'copy', id: DEFAULT_SPLIT_ID } }), 'create the template') } },
          secondary: { label: 'Blank split', onPress: () => { void create(() => createPaymentTemplate({ source: { kind: 'blank' } }), 'create the template') } } }) }} />
  )
}
