'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { keepFilePicture } from '@/app/leads/files-actions'
import type { FileRow } from '@/lib/leads/file-model'
import { pdfFirstPage } from './file-pictures'

/** Files asked for once per page load — a failure is not asked again until the next one. */
const asked = new Set<string>()

/**
 * (gaps build E, item 1) A PDF whose bytes were kept before its first page was drawn — an update's document, a client's PDF proof, a file kept
 * by an older build — gets its picture the first time Files lists it: the browser draws the first page from the file's own bytes and the
 * server keeps it (`keepFilePicture`), so the tile shows the page from then on. Quiet: a page that can't be drawn keeps its glyph.
 */
export function usePdfPictures(files: Pick<FileRow, 'id' | 'kind' | 'mime' | 'thumb' | 'bytes' | 'deletedAt'>[]) {
  const router = useRouter()
  const todo = files.filter((f) => (f.kind === 'pdf' || f.mime === 'application/pdf') && f.bytes && !f.thumb && !f.deletedAt && !asked.has(f.id)).map((f) => f.id)
  const key = todo.join(',')
  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (!ids.length) return
    let live = true
    void (async () => {
      let drawn = 0
      for (const id of ids) {
        if (!live || asked.has(id)) continue
        asked.add(id)
        try {
          const res = await fetch(`/files/raw/${id}`)
          if (!res.ok) continue
          const image = await pdfFirstPage(await res.arrayBuffer())
          if (!image) continue
          const r = await keepFilePicture(id, { image })
          if (!('error' in r)) drawn++
        } catch { /* keeps its glyph */ }
      }
      if (live && drawn) router.refresh()
    })()
    return () => { live = false }
  }, [key, router])
}
