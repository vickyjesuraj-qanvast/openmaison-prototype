'use client'

import type { ReactNode } from 'react'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { ITEM_COLUMN_LABEL, type ItemsColumnKey } from '@/lib/templates/model'
import { type ClientView, AMOUNTS_LABEL } from '@/lib/templates/client-view'
import { setQuoteTextVisible } from '@/app/quotes/text-actions'
import { orThrow } from '@/lib/company/template-rules'   // (S44Z) an action's refusal into the caller's own failure line
import styles from './quote-preview.module.css'

const VIEW_ROWS: { key: keyof Omit<ClientView, 'columns' | 'hiddenItems' | 'amounts' | 'changesSince'>; label: string; help: string }[] = [
  { key: 'descriptions', label: 'Item descriptions', help: 'The lines under each item name' },
  { key: 'photos', label: 'Item photos', help: 'Thumbnails beside the items' },
  { key: 'optionalWorks', label: 'Optional works', help: 'Lines marked optional, in their own section' },
  { key: 'subtotalBreakdown', label: 'Subtotal and discounts', help: 'Off shows only the grand total' },
  { key: 'paymentSchedule', label: 'Payment schedule', help: '' },
  { key: 'terms', label: 'Terms and Conditions', help: '' },
  { key: 'notes', label: 'Additional notes', help: '' },
  { key: 'signature', label: 'Signature block', help: '' },
  { key: 'branding', label: '“Powered by OpenMaison”', help: 'The line at the foot of the last page' },
]

/**
 * What your client sees — the body and the foot the Preview's panel (≥1025) and its Drawer (≤1024) both draw: the quote's own switches over
 * the template's starting point. One component since Quotes on the move (K3): the two copies had already drifted in their padding.
 * (C-19) On a touch width the Columns group is one line of chips (# · Item · Total …) instead of a switch a row, and the rows stand 48
 * (quote-preview.module.css, under the touch queries) — the Amounts select was below the fold on a phone.
 */
export function ClientViewPanel({ quoteId, view, setView, baseView, changed, changesRows, chips = false }: {
  quoteId: string
  view: ClientView
  setView: (f: (x: ClientView) => ClientView) => void
  baseView: ClientView
  /** how many switches differ from the template's own view — Reset to template is inert at 0 */
  changed: number
  /** (REG-595 · S44F) the revision's "Show changes" rows, built by the page */
  changesRows: ReactNode
  /** (C-19) the Columns as chips — the touch widths */
  chips?: boolean
}) {
  const snackbar = useSnackbar()
  const columns = (Object.keys(view.columns) as ItemsColumnKey[]).filter((k) => baseView.columns[k] || view.columns[k])
  return (
    <>
      <div className={styles.panelBody}>
        <span className={styles.panelNote}>Applies to this quote only. The template decides the starting point.</span>
        <div className={styles.group}>
          <span className={styles.groupTitle}>Columns</span>
          {chips ? (
            <Chips multiple label="Columns" testId="client-view-columns" options={columns.map((k) => ({ value: k, label: ITEM_COLUMN_LABEL[k] }))} value={columns.filter((k) => view.columns[k])}
                   onChange={(on) => setView((x) => ({ ...x, columns: { ...x.columns, ...Object.fromEntries(columns.map((k) => [k, on.includes(k)])) } }))} />
          ) : columns.map((k) => (
            <label key={k} className={styles.row}><span>{ITEM_COLUMN_LABEL[k]}</span><Switch size="sm" isSelected={view.columns[k]} onChange={(v: boolean) => setView((x) => ({ ...x, columns: { ...x.columns, [k]: v } }))} aria-label={ITEM_COLUMN_LABEL[k]} /></label>
          ))}
        </div>
        <div className={styles.group}>
          <span className={styles.groupTitle}>Content</span>
          {VIEW_ROWS.map((r) => (
            <label key={r.key} className={styles.row}><span className={styles.rowText}><span>{r.label}</span>{r.help ? <span className={styles.rowHelp}>{r.help}</span> : null}</span><Switch size="sm" isSelected={view[r.key]} onChange={(v: boolean) => { setView((x) => ({ ...x, [r.key]: v })); if (r.key === 'terms' || r.key === 'notes') void orThrow(setQuoteTextVisible(quoteId, r.key, v)).catch(() => snackbar({ message: 'Couldn’t save the setting — please try again' })) }} aria-label={r.label} /></label>
          ))}
          {changesRows}
          <div className={styles.hidden}>
            <TextField label="Hidden items" mode="select" value={view.hiddenItems === 'no-price' ? 'Shown without a price' : 'Left out'} options={['Left out', 'Shown without a price']}
                       helper="Lines the editor hides from the client" onChange={(v) => setView((x) => ({ ...x, hiddenItems: v === 'Shown without a price' ? 'no-price' : 'omit' }))} />
          </div>
          <div className={styles.hidden}>
            {/* (REG-585) Amounts: every line · one per section (the lump sum) · the total only. */}
            <TextField label="Amounts" mode="select" value={AMOUNTS_LABEL[view.amounts]} options={Object.values(AMOUNTS_LABEL)} helper="What the client sees priced"
                       onChange={(v) => setView((x) => ({ ...x, amounts: (Object.keys(AMOUNTS_LABEL) as ClientView['amounts'][]).find((k) => AMOUNTS_LABEL[k] === v) ?? 'lines' }))} />
          </div>
        </div>
      </div>
      <div className={styles.panelFoot}><Button appearance="outlined" variant="secondary" isDisabled={!changed} onPress={() => setView(() => baseView)}>Reset to template</Button></div>
    </>
  )
}
