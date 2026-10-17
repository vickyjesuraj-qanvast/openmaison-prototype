'use client'

import { FILE_PIECE, MESSAGE_FILE_MAX, sizeWords } from '@/lib/projects/messages-model'

/**
 * (parity map 2026-10-10, UC-066 · UC-067) A file for a message, sent in pieces — a server action's body stops at 12 MB (next.config.ts), so a
 * 25 MB video travels as base64 pieces of `FILE_PIECE` characters, in order, each its own call (`put`, the caller's action: the studio's
 * `uploadMessageFile`, the client's `uploadClientMessageFile`); the last piece files it in Files › Messages and answers its id. `onProgress`
 * hears 0…1 as the pieces land. A refusal comes back as `{ error }` in the house words.
 */
export type Landed = { fileId: string; name: string; size: number; mime: string }
export type PieceAnswer = { more: true } | Landed | { error: string }

const readAsDataUrl = (f: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result ?? ''))
  r.onerror = () => reject(r.error ?? new Error('read'))
  r.readAsDataURL(f)
})

export async function sendInPieces(file: File, put: (p: { upload: string; index: number; total: number; name: string; mime: string; size: number; piece: string }) => Promise<PieceAnswer>, onProgress?: (share: number) => void): Promise<Landed | { error: string }> {
  if (file.size > MESSAGE_FILE_MAX) return { error: `${file.name} is over ${sizeWords(MESSAGE_FILE_MAX)} — a smaller file fits` }
  if (file.size <= 0) return { error: `${file.name} is empty — pick another` }
  let url: string
  try { url = await readAsDataUrl(file) } catch { return { error: `${file.name} didn’t read — pick it again` } }
  const body = url.slice(url.indexOf(',') + 1)
  const mime = file.type || 'application/octet-stream'
  const total = Math.max(1, Math.ceil(body.length / FILE_PIECE))
  const upload = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  for (let index = 0; index < total; index++) {
    const piece = body.slice(index * FILE_PIECE, (index + 1) * FILE_PIECE)
    let r: PieceAnswer
    try { r = await put({ upload, index, total, name: file.name, mime, size: file.size, piece }) } catch { return { error: `${file.name} didn’t send — please try again` } }
    if ('error' in r) return r
    onProgress?.((index + 1) / total)
    if ('fileId' in r) return r
  }
  return { error: `${file.name} didn’t send — please try again` }
}
