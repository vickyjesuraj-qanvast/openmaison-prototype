'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { EXPORT_FORMATS, downloadLeads, type ExportFormat } from '@/lib/leads/export'
import type { LeadRow } from '@/lib/leads/queries'

/** "Export all as…" — the one-field s-modal from 784:113420 (Export Tasks), for leads. */
export function ExportDialog({ open, rows, now, onClose, onDone }: { open: boolean; rows: LeadRow[]; now: number; onClose: () => void; onDone: (fileName: string, format: ExportFormat) => void }) {
  const [format, setFormat] = useState<ExportFormat>('CSV')
  return (
    <Dialog open={open} onClose={onClose} title="Export Leads" width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={() => { const name = downloadLeads(rows, format, new Date(now)); onDone(name, format); onClose() }}>Export</Button></>}>
      <TextField label="Format" value={format} mode="select" options={EXPORT_FORMATS} onChange={(v) => setFormat(v as ExportFormat)} />
    </Dialog>
  )
}
