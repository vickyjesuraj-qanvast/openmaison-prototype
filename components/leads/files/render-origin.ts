import type { RenderOrigin } from '@/lib/visualizer/queries'
import type { FileRow } from '@/lib/leads/file-model'

/*
 * (audit 2026-09-26, F095 · F113) A render filed from the AI Visualizer knows where it came from: its menu opens that very version (the
 * room, the version selected — `?v=`, the key the bell uses too), never a new room made of the render. A site photo still opens as a room
 * of the lead's design. A render whose version was deleted since opens its room; one whose room went, the design.
 */

/**
 * (audit 2026-09-26, files-client 1) Whether the render's design was deleted for good. The file keeps its origin while the design's rows
 * go (`renderOrigins` reports `designLive`), and the origin's address would open Next's bare 404. Such a file is a plain picture again:
 * it opens as a room of the lead's design, and Information's From line is words, not a link.
 */
export const designGone = (o: RenderOrigin): boolean => !o.designLive
/** The origin while its design still exists, else null. */
export const liveOrigin = (o: RenderOrigin | null | undefined): RenderOrigin | null => (o && !designGone(o) ? o : null)

/** Where a filed render opens in the AI Visualizer (without `from`). */
export function renderHref(o: RenderOrigin): string {
  const base = `/visualizer/${o.designId}`
  if (o.live) return `${base}?room=${encodeURIComponent(o.roomId)}&v=${encodeURIComponent(o.versionKey)}`
  return o.roomLive ? `${base}?room=${encodeURIComponent(o.roomId)}` : base
}

/** The file menu's AI Visualizer item — null for a file that is not a picture. */
export function visualizeLabel(f: FileRow, renders: Record<string, RenderOrigin>): string | null {
  if (f.kind !== 'image') return null
  return liveOrigin(renders[f.id])?.live ? 'Open this version in AI Visualizer' : 'Open in AI Visualizer'
}

/** Information's "From" line for a filed render: the room when the origin names it, and the version. */
export function renderFromLine(o: RenderOrigin & { roomName?: string | null }): string {
  return `AI Visualizer · ${o.roomName ? `${o.roomName} · ` : ''}V${o.n}${o.live ? '' : designGone(o) ? ' · design deleted' : ' · no longer in the design'}`
}
