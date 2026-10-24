'use client'

import { useEffect, useRef, useState } from 'react'
import { MOBILE } from '@/lib/breakpoint'
import { useSnackbar } from '@/components/om/snackbar'
import { refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { fileGlyph, fileKindOf, mimeFor } from '@/lib/leads/file-model'
import { uploadPicked } from './upload-picture'
import { UploadToast, type UploadRow } from './upload-toast'

/** (Leads on the move, L4 — P-11 · C-09) A run of photos from the camera: where they land (the snackbar names it) and the camera again. */
export type PhotoRun = { where: string; again: () => void }

/** (T2) A toast row with the file behind it, so Retry sends the same file to the same folder. */
type Upload = UploadRow & { file: File; parentId: string | null }

/** (T2) The least a row reads "Uploading…" — a local upload lands in a blink, and a row that flashes past reads as nothing happening. */
const UPLOAD_MS = 400

/**
 * (pending modules S05 — the card's "Coming soon presses whose target now exists: the Overview FILES card's Create Folder / Upload (the Files
 * tab does both)") The lead's one upload, lifted out of the Files tab so every place that uploads into a lead's Files does it one way:
 * (UX audit 2026-09-30, T2) a pick or a drop takes several files — one toast row each, uploaded one after another into `parentId`, one
 * snackbar once they have all landed (with `view`, the snackbar's View opens where they landed); a refusal names what failed, and why when
 * one rule refused it (gaps build E); Retry sends the same file again. (F113) The toast shows each picked picture itself (object URLs,
 * released when the toast goes). `upload(files, parentId)` starts a run; `toast` is the toast to render.
 */
export function useFileUpload(leadId: string, o: { view?: () => void } = {}) {
  const snackbar = useSnackbar()
  const { fail } = useRun()
  const [toast, setToast] = useState<Upload[] | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const thumbUrls = useRef<string[]>([])
  const releaseThumbs = () => { for (const u of thumbUrls.current) URL.revokeObjectURL(u); thumbUrls.current = [] }
  useEffect(() => () => { for (const u of thumbUrls.current) URL.revokeObjectURL(u) }, [])
  const view = useRef(o.view)
  useEffect(() => { view.current = o.view })

  const setRow = (key: string, state: Upload['state']) => setToast((t) => (t ? t.map((r) => (r.key === key ? { ...r, state } : r)) : t))
  /** One file to the server — the shared upload (upload-picture.ts `uploadPicked`); true when it landed, else the rule that refused it
      (gaps build E: "… is over 8 MB — a smaller file fits"), or null for a failure with no words. */
  const send = async (row: Upload): Promise<true | { reason: string | null }> => {
    setRow(row.key, 'uploading')
    const [r] = await Promise.all([uploadPicked(leadId, row.file, row.parentId).catch(() => null), new Promise((ok) => setTimeout(ok, UPLOAD_MS))])
    const ok = !!r && !('error' in r)
    setRow(row.key, ok ? 'done' : 'failed')
    return ok ? true : { reason: r && 'error' in r ? refusalOf(r.error) : null }
  }
  const landed = (n: number, photos?: PhotoRun) => {
    /* (L4 — P-11) photos from the camera say where they are and offer the next one — several in a row, into the same folder */
    if (photos) { snackbar({ message: `${n === 1 ? 'Photo' : `${n} photos`} saved to ${photos.where}`, actionLabel: 'Take another', onAction: photos.again }); return }
    const message = n === 1 ? 'File uploaded' : `${n} files uploaded`
    snackbar(view.current ? { message, actionLabel: 'View', onAction: () => view.current?.() } : { message })
  }
  /** (L4 — C-09) On a phone the toast steps away once every file has landed — the snackbar says it — instead of covering the grid until closed. */
  const settle = () => { if (window.matchMedia(MOBILE).matches) { setToast(null); releaseThumbs() } }
  const upload = (list: File[], parentId: string | null, photos?: PhotoRun) => {
    if (!list.length) return
    const at = Date.now()
    const rows: Upload[] = list.map((file, i) => {
      let thumb: string | null = null
      /* (gaps build E, item 1) only a picture the browser shows is its own thumbnail (a drawing is typed image/vnd.dwg); anything else its glyph */
      if (/^image\/(jpeg|png|webp|gif|avif|bmp)$/.test(file.type)) { try { thumb = URL.createObjectURL(file); thumbUrls.current.push(thumb) } catch { thumb = null } }
      const kind = fileKindOf(file.name, file.type)
      return { key: `${at}-${i}`, name: file.name, state: 'uploading', thumb, glyph: thumb ? null : fileGlyph({ kind, mime: mimeFor(file.name, file.type), name: file.name }), file, parentId }
    })
    setToast((t) => [...rows, ...(t ?? []).filter((r) => r.state === 'uploading')])
    setCollapsed(false)
    void (async () => {
      let n = 0
      const reasons: (string | null)[] = []
      for (const row of rows) { const r = await send(row); if (r === true) n++; else reasons.push(r.reason) }
      const failed = rows.length - n
      /* one line for the whole pick — the rows say which; a failure names what failed, and why when one rule refused it (gaps build E) */
      if (!failed) { landed(n, photos); settle() }
      else fail(rows.length === 1 ? `upload ${rows[0]!.name}` : `upload ${failed} of ${rows.length} files`, failed === 1 ? reasons[0] ?? null : null)
    })()
  }
  const retry = (key: string) => {
    const row = toast?.find((r) => r.key === key)
    if (row) void send(row).then((r) => { if (r === true) landed(1); else fail(`upload ${row.name}`, r.reason) })
  }
  const element = (
    <UploadToast rows={toast} collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
      onClose={() => { setToast(null); releaseThumbs() }}
      onRetry={retry}
    />
  )
  return { upload, toast: element }
}
