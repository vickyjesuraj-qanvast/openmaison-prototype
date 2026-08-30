'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { EXPORT_FORMATS, downloadLeads, type ExportFormat } from '@/lib/leads/export'
import type { LeadRow } from '@/lib/leads/queries'

/**
 * "Export all as…" — the one-field s-modal from 784:113420 / 902:29293 (Export Tasks). Leads by default; a tab passes its own
 * `title` and `download` (Export Tasks). Field label "Choose file format" as the mock types it.
 */
export function ExportDialog({ open, rows = [], now, onClose, onDone, title = 'Export Leads', download }: {
  open: boolean; rows?: LeadRow[]; now: number; onClose: () => void; onDone: (fileName: string, format: ExportFormat) => void
  title?: string
  /** Custom downloader (returns the file name); defaults to the leads export. */
  download?: (format: ExportFormat) => string
}) {
  const [format, setFormat] = useState<ExportFormat>('CSV')
  return (
    <Dialog open={open} onClose={onClose} title={title} width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={() => { const name = download ? download(format) : downloadLeads(rows, format, new Date(now)); onDone(name, format); onClose() }}>Export</Button></>}>
      <TextField label="Choose file format" value={format} mode="select" options={EXPORT_FORMATS} onChange={(v) => setFormat(v as ExportFormat)} />
    </Dialog>
  )
}
