import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchVisualizerEditor, renderOrigin, visualizerTitle } from '@/lib/visualizer/queries'
import { readFrom } from '@/lib/nav'
import { ORIGINAL } from '@/lib/visualizer/model'
import { VisualizerEditor } from '@/components/visualizer/editor/visualizer-editor'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ designId: string }> }): Promise<Metadata> {
  const { designId } = await params
  if (await refusesPath(`/visualizer/${designId}`)) return { title: 'AI Visualizer' }   // (S44Z) no record's name in a tab that is not theirs
  const title = await visualizerTitle(designId)
  return { title: title ? `${title} · AI Visualizer` : 'AI Visualizer' }
}

type Search = { room?: string; from?: string; file?: string; v?: string; version?: string; pin?: string; note?: string }
const one = (v: unknown) => (typeof v === 'string' && v ? v : null)

/**
 * A design in the AI Visualizer (REG-673, Q-02): the rail-less app frame of the `(editor)` group; `?from=` is where Back goes.
 * Arriving on a place in it (audit 2026-09-26):
 * - `?room=` opens a room; `?v=` (or `?version=`) the version on screen — its room with it (F095 · F098, the bell's link); `?v=original`
 *   the room's Original (a `from` made while the studio looked at it);
 * - `?pin=` a pin's thread, on its version (F098); (UX audit V1) `?note=` the client's notes on the version one was left on, open;
 * - `?file=` a lead's file: a render filed from here opens the version it was (F095 — never a new room made of the render); a photo
 *   opens its room on that photo — its Original, not its newest render (fresh-tablet 20) — else the editor adds it as one on arrival (Q-31).
 * What no longer exists lands on the room (or the first one) with a line that says so.
 */
export default async function VisualizerDesignPage({ params, searchParams }: { params: Promise<{ designId: string }>; searchParams: Promise<Search> }) {
  const { designId } = await params
  if (await refusesPath(`/visualizer/${designId}`)) return <AccessGate section="AI Visualizer" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const sp = await searchParams
  const data = await fetchVisualizerEditor(designId)
  if (!data) notFound()
  const roomOfKey = (key: string) => Object.entries(data.versions).find(([, vs]) => vs.some((v) => v.key === key))?.[0] ?? null
  const liveKey = (key: string) => Object.values(data.versions).some((vs) => vs.some((v) => v.key === key && !v.deleted))
  const hasRoom = (id: string | null) => !!id && data.rooms.some((r) => r.id === id)

  let room: string | null = hasRoom(one(sp.room)) ? one(sp.room) : null
  let version: string | null = null
  let pin: string | null = null
  let note: string | null = null
  let notice: string | null = null
  let file: { id: string; name: string; url: string } | null = null

  const fileId = one(sp.file)
  if (fileId) {
    const origin = await renderOrigin(fileId)
    if (origin && origin.designId === data.design.id) {
      if (origin.roomLive && hasRoom(origin.roomId)) {
        room = origin.roomId
        if (origin.live) version = origin.versionKey
        else notice = `V${origin.n} is no longer in the design`
      } else notice = 'That room is no longer in the design'
    } else if (!origin) {
      /* (Q-31) a lead's photo: its room if it has one, else the editor adds it on arrival */
      const made = data.rooms.find((r) => r.sourceFileId === fileId)?.id ?? null
      if (made) { room = made; version = ORIGINAL }
      else file = data.leadImages.find((f) => f.id === fileId) ?? null
    }
  }
  const vKey = one(sp.v) ?? one(sp.version)
  if (vKey === 'original') { if (room) version = ORIGINAL }
  else if (vKey) {
    const at = roomOfKey(vKey)
    if (at && hasRoom(at) && liveKey(vKey)) { room = at; version = vKey }
    else notice = 'That version is no longer in the design'
  }
  const pinId = one(sp.pin)
  if (pinId) {
    const p = data.pins.find((x) => x.id === pinId)
    const at = p ? roomOfKey(p.key) : null
    if (p && at && hasRoom(at) && liveKey(p.key)) { room = at; version = p.key; pin = p.id }
    else notice = 'That pin is no longer in the design'
  }
  const noteId = one(sp.note)
  if (noteId) {
    const n = data.shares.flatMap((s) => s.responses).find((r) => r.id === noteId && r.kind === 'note')
    const at = n?.versionKey ? roomOfKey(n.versionKey) : null
    if (n?.versionKey && at && hasRoom(at) && liveKey(n.versionKey)) { room = at; version = n.versionKey; note = n.versionKey }
    else notice = 'That version is no longer in the design'
  }
  return <VisualizerEditor data={data} from={readFrom(sp.from)} initialRoom={room} initialVersion={version} initialPin={pin} initialNote={note} initialNotice={notice} initialFile={file} />
}
