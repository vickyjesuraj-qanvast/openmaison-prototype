'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SAMPLE_ROOMS } from '@/lib/visualizer/samples'
import { fallbackDetection, sampleDetection, type Detection } from '@/lib/visualizer/model'
import { fallbackDots } from '@/lib/visualizer/engine/fallback'
import { loadImg } from '@/lib/visualizer/engine/run'
import type { Img } from '@/lib/visualizer/engine/pixels'
import { depthOf, type DepthMap } from '@/lib/visualizer/spatial/depth'

/*
 * (pending modules S41) The room the bench's photo views share (Depth · Look around · Orbit clip · Extend): one of the AI Visualizer's three
 * sample rooms (their curated readings) or a photo of the developer's own (read as Walls · Floor · Ceiling by rule, as the Visualizer reads
 * one). Its depth is worked out once per room — a second or two on the page's own thread, said while it runs — and kept while the bench is
 * open. Nothing is saved anywhere.
 */

export type RoomKey = 'living-room' | 'kitchen' | 'bedroom' | 'upload'
export type BenchRoom = { key: RoomKey; name: string; url: string; reading: Detection | null }
export type RoomRead = { status: 'reading' | 'done' | 'error'; photo?: Img; depth?: DepthMap; ms?: number; error?: string }

export const SAMPLE_KEYS = SAMPLE_ROOMS.map((s) => s.key) as RoomKey[]
const sampleRoom = (key: RoomKey): BenchRoom | null => {
  const s = SAMPLE_ROOMS.find((x) => x.key === key)
  return s ? { key, name: s.name, url: s.original, reading: sampleDetection(s) } : null
}
export const ROOM_OPTIONS = [...SAMPLE_ROOMS.map((s) => ({ value: s.key, label: s.name })), { value: 'upload', label: 'Your photo' }]
export const PHOTO_TYPES = 'image/jpeg,image/png,image/webp'

/** `active`: a photo view is open — the room is read only then (the map and the seams never wait on it). */
export function useBenchRoom(active: boolean) {
  const [room, setRoom] = useState<BenchRoom>(() => sampleRoom('living-room')!)
  const [reads, setReads] = useState<Record<string, RoomRead>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const busy = useRef(new Set<string>())
  const read = reads[`${room.key}|${room.url}`] ?? null

  const readRoom = useCallback((r: BenchRoom) => {
    const k = `${r.key}|${r.url}`
    if (busy.current.has(k)) return
    busy.current.add(k)
    /* the wait line first, then a frame so it paints before the page's thread is busy */
    window.setTimeout(() => setReads((m) => ({ ...m, [k]: { status: 'reading' } })), 0)
    window.setTimeout(async () => {
      const t0 = performance.now()
      try {
        const photo = await loadImg(r.url)
        const reading = r.reading ?? fallbackDetection(fallbackDots(photo))
        const depth = depthOf(photo, r.url, reading)
        setReads((m) => ({ ...m, [k]: { status: 'done', photo, depth, ms: Math.round(performance.now() - t0) } }))
        if (!r.reading) setRoom((cur) => (cur.url === r.url ? { ...cur, reading } : cur))
      } catch (e) {
        setReads((m) => ({ ...m, [k]: { status: 'error', error: e instanceof Error ? e.message : 'The photo couldn’t be read.' } }))
      } finally { busy.current.delete(k) }
    }, 60)
  }, [])

  /* the open room is read the first time it is shown */
  useEffect(() => { if (active && !reads[`${room.key}|${room.url}`]) readRoom(room) }, [active, room, reads, readRoom])

  const pick = (key: string) => {
    setUploadError(null)
    const s = sampleRoom(key as RoomKey)
    if (s) setRoom(s)
  }
  const takePhoto = (file: File) => {
    if (!PHOTO_TYPES.split(',').includes(file.type)) { setUploadError('Pick a JPG, PNG or WebP photo.'); return }
    if (file.size > 12 * 1024 * 1024) { setUploadError('That photo is over 12 MB — pick a smaller one.'); return }
    setUploadError(null)
    const fr = new FileReader()
    fr.onload = () => { if (typeof fr.result === 'string') setRoom({ key: 'upload', name: file.name || 'Your photo', url: fr.result, reading: null }) }
    fr.onerror = () => setUploadError('That photo couldn’t be read.')
    fr.readAsDataURL(file)
  }
  return { room, read, pick, takePhoto, uploadError }
}
