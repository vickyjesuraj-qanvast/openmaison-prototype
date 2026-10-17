'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { VendorNameField } from '@/components/finance/vendor-name-field'
import { useVendorDirectory } from '@/components/finance/use-vendor-directory'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { IMPORT_LIMIT, PasteItemsDialog, type BookMatch } from '@/components/quotes/editor/items/paste-items-dialog'
import { guessHeader, isBlock } from '@/lib/quotes/clipboard'
import type { PasteLine } from '@/lib/quotes/clipboard'
import { parseCsv } from '@/lib/csv'
import { parseXlsx } from '@/lib/xlsx'
import { ITEM_KINDS, ITEM_KIND_LABEL, type ItemKind } from '@/lib/quotes/items-model'
import styles from './price-book.module.css'

/**
 * (REG-594) Import from a spreadsheet: the rows pasted here go through the quote editor's column mapping (REG-476) and land in
 * My Items — the header row names the columns when there is one. A vendor typed here applies to every imported item.
 * (REG-653, price book parity Q-13) Or a file — a supplier's CSV or XLSX, or the book's own export — read in the browser as the leads
 * import reads one; the limit is said before anything is read; the mapping step matches each row to the book (`book`), says what is new,
 * what matches, what repeats and which trades are new, and the vendor typed here fills only the rows without one.
 * (pending modules S12 — card held:price-book, "the import's vendor are free text, not Finance › Vendors · revisit (one vendor list, N-16)") That
 * vendor picks from Company › Finance › Vendors (the item dialog's field); the server spells it, and every row's own, as the directory does.
 */
export function ImportItemsDialog({ open, onClose, onImport, book, trades, costs = true, units }: {
  /** (S44I — M9) the studio's units — a mapped unit takes the studio's spelling */
  units?: readonly string[]
  /** (pending modules S41b-1) the member sees costs — else the mapping offers no Cost or Markup column */
  costs?: boolean
  open: boolean; onClose: () => void; onImport: (lines: PasteLine[], vendor: string | null, match: BookMatch, kind: ItemKind) => void | Promise<void>
  book: { name: string; vendor: string | null; status?: string }[]; trades: string[]
}) {
  const snackbar = useSnackbar()
  const [text, setText] = useState('')
  const [file, setFile] = useState<{ name: string; rows: string[][] } | null>(null)
  const [vendor, setVendor] = useState('')
  /* (UX audit S7) The Kind a row without one takes — every such row became Purchase unasked */
  const [kind, setKind] = useState<ItemKind>('purchase')
  const [mapping, setMapping] = useState(false)
  const vendors = useVendorDirectory(open)   // (pending modules S12, one-home N-16)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setText(''); setFile(null); setVendor(''); setKind('purchase'); setMapping(false) } }
  const ready = !!file || (text.trim().length > 0 && isBlock(text, 'add'))
  const read = async (f?: File) => {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    try {
      let rows: string[][] = []
      if (ext === 'csv') rows = parseCsv(await f.text())
      else if (ext === 'xlsx') rows = await parseXlsx(await f.arrayBuffer())
      else if (ext === 'xls') { snackbar({ message: 'Save the sheet as XLSX or CSV first — the old .xls format is not read' }); return }
      else { snackbar({ message: 'Choose a CSV or an XLSX file' }); return }
      rows = rows.filter((r) => r.some((c) => (c ?? '').toString().trim() !== ''))
      if (rows.length === 0) { snackbar({ message: `Nothing to import in “${f.name}”` }); return }
      setFile({ name: f.name, rows }); setMapping(true)
    } catch { snackbar({ message: 'Couldn’t read that file — please try another export' }) }
  }
  return (
    <>
      <Dialog open={open && !mapping} onClose={onClose} title="Import from a spreadsheet" size="modal" width={600}
              subtitle={`A CSV or XLSX file, or rows copied from Excel or Google Sheets — up to ${IMPORT_LIMIT} rows at a time. A header row (Item · Unit · Cost…) names the columns for you.`}
              footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ready} onPress={() => setMapping(true)}>Next</Button></>}>
        <div className={styles.fields} data-testid="import-dialog">
          {/* (sweep S5 #6) Back from the mapping keeps the file: it shows here, Next maps it again, ✕ lets it go for pasted rows */}
          {file ? (
            /* (Dane UAT 3.12) the file's items — its header line is no item (the mapping's caption counts them the same way) */
            <div className={styles.fileRow} data-testid="import-file"><Icon name="table" size={20} weight={300} /><span className={styles.fileName}>{(() => { const n = file.rows.length - (guessHeader(file.rows) ? 1 : 0); return `${file.name} · ${n} ${n === 1 ? 'item' : 'items'}` })()}</span>
              <Tooltip label="Remove the file"><IconButton icon="close" label={`Remove ${file.name}`} size={24} variant="bare" iconSize={18} onClick={() => setFile(null)} /></Tooltip></div>
          ) : null}
          <Dropzone variant="compact" title={<>Drop a CSV or XLSX file, or <b>browse</b></>} helper="The book’s own export reads back in — the sheet carries no photos" accept=".csv,.xlsx,.xls,text/csv" onPick={(f) => { void read(f) }} />
          <div className={styles.pasteBox}>
            <TextArea label="Or paste the rows here" value={text} onChange={(v: string) => setText(v)} description={text.trim() && !ready ? 'That looks like a single value — paste whole rows with tabs between the columns.' : undefined} />
          </div>
          <VendorNameField label="Vendor (optional)" value={vendor} onChange={setVendor} directory={vendors.list} onAdd={vendors.add} maxLength={80} helper="For rows without a vendor of their own — from Company › Finance › Vendors" testId="import-vendor" />
        </div>
      </Dialog>
      <PasteItemsDialog open={open && mapping} text={text} grid={file?.rows ?? null} source={file?.name ?? null} anchor={null} target="book" book={book} trades={trades} vendor={vendor.trim() || null} costs={costs} units={units}
                        bookKind={{ label: 'Rows with no Kind', options: ITEM_KINDS.map((k) => ITEM_KIND_LABEL[k]), value: ITEM_KIND_LABEL[kind], onChange: (v) => setKind(ITEM_KINDS.find((k) => ITEM_KIND_LABEL[k] === v) ?? 'purchase') }}
                        onClose={onClose} onBack={() => setMapping(false)} onAdd={(lines, _place, match) => { setMapping(false); void onImport(lines, vendor.trim() || null, match ?? 'update', kind) }} />
    </>
  )
}
