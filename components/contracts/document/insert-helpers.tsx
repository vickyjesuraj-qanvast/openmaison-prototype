'use client'

import { useId, useState, type ReactNode, type RefObject } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import type { DocEditorHandle } from '../editor/doc-editor'

const MAX_IMAGE = 1_500_000

/**
 * The Image tool's picker, shared by the desk's formatting bar and the touch row (one piece, never two copies): a hidden file input found by
 * id (a ref read inside a tool helper reads as a render-time ref access to the compiler), the file checked and read as a data URL.
 */
export function useImagePick(editor: RefObject<DocEditorHandle | null>): { open: () => void; input: ReactNode } {
  const snackbar = useSnackbar()
  const fileId = useId()
  const pick = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { snackbar({ message: 'Pick an image file' }); return }
    if (file.size > MAX_IMAGE) { snackbar({ message: 'Images up to 1.5 MB' }); return }
    const r = new FileReader()
    r.onload = () => { if (typeof r.result === 'string') editor.current?.insertHtml(`<img src="${r.result}" alt="">`) }
    r.readAsDataURL(file)
  }
  return {
    open: () => document.getElementById(fileId)?.click(),
    input: <input id={fileId} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.currentTarget.value = '' }} />,
  }
}

/** The Link dialog (Add link · Link URL · Cancel / Add), the desk bar's and the touch row's. Its box starts empty each time it opens. */
export function LinkDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (url: string) => void }) {
  const [url, setUrl] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setUrl('') }   // the render-phase adjust: a fresh box on every open
  const add = () => { if (!url.trim()) return; onClose(); onAdd(url.trim()) }
  return (
    <Dialog open={open} onClose={onClose} title="Add link" size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={add} isDisabled={!url.trim()}>Add</Button></>}>
      <TextField label="Link URL" required value={url} onChange={setUrl} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) { e.preventDefault(); add() } }} />
    </Dialog>
  )
}
