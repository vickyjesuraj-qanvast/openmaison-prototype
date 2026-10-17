import { resolveMaterial, type LibraryMaterial } from '@/lib/visualizer/materials'
import { catalogueItem } from './catalogue'
import type { Piece, Room } from './model'

/*
 * (gaps build J, J-Q10) What a room's floor, its walls and a piece look like — the AI Visualizer's materials (the catalogue, and
 * Company › Materials as `lib:<id>`) resolved to a colour, a name and (for a studio material with a photo) the photo the 3D view lays.
 * Pure and client-safe. A material that no longer resolves (deleted from Materials) falls back to the template's colour.
 */

export type Look = { hex: string; name: string | null; image: string | null; finish: string }
const mat = (id: string | null, library: LibraryMaterial[]) => (id ? resolveMaterial(id, library, []) : null)

export function floorLook(r: Pick<Room, 'floor' | 'floorHex'>, library: LibraryMaterial[] = []): Look {
  const m = mat(r.floor, library)
  return m ? { hex: m.hex, name: m.name, image: m.imageUrl, finish: m.finish } : { hex: r.floorHex, name: null, image: null, finish: 'matte' }
}
export function wallLook(r: Pick<Room, 'wall' | 'wallHex'>, library: LibraryMaterial[] = []): Look {
  const m = mat(r.wall, library)
  return m ? { hex: m.hex, name: m.name, image: m.imageUrl, finish: m.finish } : { hex: r.wallHex, name: null, image: null, finish: 'matte' }
}
export function pieceLook(p: Pick<Piece, 'key' | 'color' | 'finish'>, library: LibraryMaterial[] = []): Look {
  const m = mat(p.finish, library)
  if (m) return { hex: m.hex, name: m.name, image: m.imageUrl, finish: m.finish }
  return { hex: p.color ?? catalogueItem(p.key)?.color ?? '#C9B79C', name: null, image: null, finish: 'matte' }
}
/** "Floor · Oak, natural" for the room schedule; null when it keeps the template's colour. */
export const materialName = (id: string | null, library: LibraryMaterial[] = []) => mat(id, library)?.name ?? null

/** A colour's lightness 0…1 — the drawing writes dark words on a light floor and light ones on a dark floor. */
export function lightness(hex: string): number {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
