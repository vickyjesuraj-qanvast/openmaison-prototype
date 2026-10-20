'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ImportContractDialog, type KeptPdfFile } from '@/components/contracts/import-contract-dialog'
import { rememberContractPdf } from '@/components/contracts/editor/contract-route-ghost'
import { createContractDoc } from '@/app/contracts/actions'
import { inContractFolder } from '@/lib/contracts/file-signing'
import { folderPath, type FileRow } from '@/lib/leads/file-model'
import { withFrom } from '@/lib/nav'

/**
 * (S46D — D2, his "fix everything" 2026-10-19; finding D2 · raw P-1 · L-4) Files › ⋮ › *Send for signature* — the Files tab's and the file
 * viewer's one way into Contracts › Import a contract with the file already in it (no upload). Import makes the contract from the file
 * (`createContractDoc` `upload.fromFileId`: the very file when it sits in Files › Contract & VOs, else a copy kept there) and opens its editor,
 * where Send for digital signature goes out on WhatsApp — the quote's *Send for signature* lands in the same place (REG-538). The dialog stays,
 * reading "Importing…", until the editor takes the page (REG-659); a refusal keeps it open and says the rule. The editor's Back returns here.
 */
export function useSendForSignature({ leadId, files, here }: { leadId: string; files: FileRow[]; /** this page's address, for the editor's Back */ here: () => string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [kept, setKept] = useState<{ file: KeptPdfFile; open: boolean } | null>(null)   // the file stays while the dialog closes
  const open = (f: FileRow) => setKept({ file: { id: f.id, name: f.name, thumb: f.thumb ?? null, inPlace: inContractFolder(folderPath(files, f.parentId ?? null)) }, open: true })
  const close = () => setKept((k) => (k ? { ...k, open: false } : k))
  const dialog = (
    <ImportContractDialog open={!!kept?.open} onClose={close} kept={kept?.file ?? null}
      onImport={async (o) => {
        try {
          const r = await createContractDoc({ leadId, upload: { fileName: o.fileName, signed: o.signed, title: o.title, file: o.file ?? null, fromFileId: o.fromFileId ?? null } })
          if (typeof r !== 'string') { snackbar({ message: couldnt('import the contract', refusalOf(r.error)) }); return }   // the dialog stays to try again
          rememberContractPdf(r, true)   // (S42 B-17) the editor's loader draws its PDF
          snackbar({ message: o.signed ? 'Signed contract imported' : 'Contract imported' })
          router.push(withFrom(`/contracts/${r}`, here()))
        } catch (e) { snackbar({ message: couldnt('import the contract', refusalOf(e)) }); return }
        return new Promise<void>(() => {})   // "Importing…" holds until the editor takes the page (REG-659) — one contract per press
      }} />
  )
  return { open, dialog }
}
