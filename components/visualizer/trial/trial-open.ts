import { fallbackDetection, newId, sampleDetection } from '@/lib/visualizer/model'
import { roomNameFromFile } from '@/lib/visualizer/room-name'
import { sampleByKey } from '@/lib/visualizer/samples'
import { fallbackDots } from '@/lib/visualizer/engine/fallback'
import { loadImg } from '@/lib/visualizer/engine/run'
import type { TrialRoom } from './trial-editor'

/*
 * (pending modules S36) Opening a room for the trial — the studio editor's own ways (an upload's walls, floor and ceiling marked by the engine,
 * F180; a sample's curated reading). Its own module, loaded with the editor when the visitor opens a room (or once the start is idle), so the
 * website's page carries none of the engine until it is wanted.
 */

/** The visitor's photo (a JPEG data URL the browser read): its reading, its name from the file. */
export async function uploadRoom(url: string, fileName: string): Promise<TrialRoom> {
  const detection = fallbackDetection(fallbackDots(await loadImg(url)))
  return { id: newId('t'), name: roomNameFromFile(fileName) ?? 'Your room', imageUrl: url, sampleKey: null, detection, upload: true }
}

/** A sample room (or its sketch), its picture warmed before the editor opens on it — null when it isn't one. */
export async function sampleRoom(key: string, asSketch: boolean): Promise<TrialRoom | null> {
  const s = sampleByKey(key)
  const src = s ? (asSketch ? s.sketch : s.original) : null
  if (!s || !src) return null
  await loadImg(src)
  return { id: newId('t'), name: asSketch ? `${s.name} sketch` : s.name, imageUrl: src, sampleKey: s.key, detection: sampleDetection(s, asSketch), upload: false }
}
