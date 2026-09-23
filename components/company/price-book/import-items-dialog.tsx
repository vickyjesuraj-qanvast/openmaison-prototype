'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { PasteItemsDialog } from '@/components/quotes/editor/items/paste-items-dialog'
import { isBlock } from '@/lib/quotes/clipboard'
import type { PasteLine } from '@/lib/quotes/clipboard'
import styles from './price-book.module.css'

/**
 * (REG-594) Import from a spreadsheet: the rows pasted here go through the quote editor's column mapping (REG-476) and land in
 * My Items — the header row names the columns when there is one. A vendor typed here applies to every imported item.
 */
export function ImportItemsDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (lines: PasteLine[], vendor: string | null) => void | Promise<void> }) {
  const [text, setText] = useState('')
  const [vendor, setVendor] = useState('')
  const [mapping, setMapping] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setText(''); setVendor(''); setMapping(false) } }
  const ready = text.trim().length > 0 && isBlock(text, 'add')
  return (
    <>
      <Dialog open={open && !mapping} onClose={onClose} title="Import from a spreadsheet" size="modal" width={600}
              subtitle="Copy the rows from Excel or Google Sheets and paste them here. A header row (Item · Unit · Cost…) names the columns for you."
              footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ready} onPress={() => setMapping(true)}>Next</Button></>}>
        <div className={styles.fields} data-testid="import-dialog">
          <div className={styles.pasteBox}>
            <TextArea label="Paste the rows here" value={text} onChange={(v: string) => setText(v)} description={text.trim() && !ready ? 'That looks like a single value — paste whole rows with tabs between the columns.' : undefined} />
          </div>
          <TextField label="Vendor (optional)" value={vendor} onChange={setVendor} maxLength={80} helper="Applies to every imported item" />
        </div>
      </Dialog>
      <PasteItemsDialog open={open && mapping} text={text} anchor={null} target="book" onClose={() => setMapping(false)}
                        onAdd={(lines) => { setMapping(false); void onImport(lines, vendor.trim() || null) }} />
    </>
  )
}
