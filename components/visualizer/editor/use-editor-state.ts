'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Detection, Pending, VersionView } from '@/lib/visualizer/model'
import type { EditorRoom, VisualizerEditorData } from '@/lib/visualizer/queries'
import { saveRoomState } from '@/app/visualizer/actions'

/* The AI Visualizer editor's state (REG-673 · Q-07 · Q-11): each room keeps its reading and the picks waiting for Generate, with its own
   undo history (⌘Z / ⇧⌘Z — a slider's drag or a word typed folds into one step, as the template editor's history does), autosaved 900 ms
   after the last change. A refresh from the server (after an action) re-seeds the rooms and the versions but never a room's local work.
   (audit 2026-09-26)
   - F031: a history step is the picks AND the reading — taking a surface off the list, adding, drawing or redrawing one is one ⌘Z.
   - F041 · F073 · F201: `flush()` saves every room now — the timer, Back, leaving the page (pagehide / hidden) and the unmount call it;
     saves run one at a time (no double save), a failed one retries every 3 s, `dirty` shows "Saving…" from the moment a pick lands.
   - two tabs: each save hands back the revision it was made on; a room changed elsewhere answers `conflict` and stops autosaving until
     the page is reloaded (the editor says so), instead of overwriting the other tab's work.
   - F200: a reference or piece photo sent as a picture comes back as an address; the room's picks adopt it quietly.
   - D9 (F041 · F073 · F201, round 2): a page going away can't wait for a server action (the unload aborts it), so the tab hidden or the
     page hiding sends what waits with `fetch(keepalive)` to POST /visualizer/state — the same save — and leaves a draft in
     sessionStorage (`om.viz.draft.<roomId>`). A reload that read the room before that save landed (the draft's revision is the one
     loaded, and it is under two minutes old) takes the draft as the room's picks and saves them as usual; an older draft is dropped. */

type Snap = { pending: Pending; detection: Detection }
type Room = Snap & { past: Snap[]; future: Snap[]; rev: number; base0: number }
const LIMIT = 80, COALESCE_MS = 900, RETRY_MS = 3000
/** (D9) A room's picks left behind by a page that went away — read back once by the next load. */
const DRAFT = 'om.viz.draft.', DRAFT_MS = 2 * 60_000, KEEPALIVE_MAX = 60_000
type Draft = { baseRev: number; pending: Pending; detection: Detection; at: number }
const readDraft = (roomId: string): Draft | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT + roomId); if (!raw) return null
    const d = JSON.parse(raw) as Partial<Draft>
    return typeof d.baseRev === 'number' && typeof d.at === 'number' && d.pending && d.detection ? (d as Draft) : null
  } catch { return null }
}
const dropDraft = (roomId: string) => { try { sessionStorage.removeItem(DRAFT + roomId) } catch { /* private window */ } }
/** (D9) A room's save as a request that outlives the page — POST /visualizer/state runs saveRoomState's own logic (keepalive: ≤ 64 KB). */
function beacon(roomId: string, r: Snap, baseRev: number): { size: number; send: () => Promise<SaveReply> } {
  const body = JSON.stringify({ roomId, pending: r.pending, detection: r.detection, baseRev })
  const size = new TextEncoder().encode(body).length
  return {
    size,
    send: () => fetch('/visualizer/state', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body })
      .then(async (res) => ((await res.json().catch(() => null)) as SaveReply | null) ?? { error: `The save answered ${res.status}` }),
  }
}
type SaveReply = { savedAt: number; stateRev: number; addresses?: Addresses } | { conflict: true; stateRev: number } | { error: string }
const fresh = (r: EditorRoom): Room => ({ pending: r.pending, detection: r.detection, past: [], future: [], rev: 0, base0: r.stateRev ?? 0 })
const snap = (r: Room): Snap => ({ pending: r.pending, detection: r.detection })
type Addresses = { refs: Record<string, string>; pieces: Record<string, string> }
/** A data URL the server has stored → its address (only while the pick still holds that picture). */
function adoptIn(p: Pending, a: Addresses): Pending {
  let changed = false
  const refs = p.transfer.refs.map((r) => { const u = a.refs[r.id]; if (u && r.url.startsWith('data:')) { changed = true; return { ...r, url: u } } return r })
  const furniture = { ...p.furniture }
  for (const [id, u] of Object.entries(a.pieces)) { const f = furniture[id]; if (f?.refImage?.startsWith('data:')) { furniture[id] = { ...f, refImage: u }; changed = true } }
  return changed ? { ...p, transfer: { ...p.transfer, refs }, furniture } : p
}

export type SaveState = { saving: boolean; at: number | null; error: boolean }

export function useEditorState(data: VisualizerEditorData) {
  const [seed, setSeed] = useState(data)
  const [rooms, setRooms] = useState<EditorRoom[]>(data.rooms)
  const [versions, setVersions] = useState<Record<string, VersionView[]>>(data.versions)
  const [st, setSt] = useState<Record<string, Room>>(() => Object.fromEntries(data.rooms.map((r) => [r.id, fresh(r)])))
  const [save, setSave] = useState<SaveState>({ saving: false, at: null, error: false })
  /** The revision each room last saved (a mirror of `savedRef` the render may read). */
  const [savedRevs, setSavedRevs] = useState<Record<string, number>>({})
  /** Rooms another tab (or teammate) changed since this one loaded them — they wait for a reload. */
  const [conflicts, setConflicts] = useState<Record<string, true>>({})
  if (data !== seed) {
    setSeed(data); setRooms(data.rooms); setVersions(data.versions)
    setSt((prev) => Object.fromEntries(data.rooms.map((r) => [r.id, prev[r.id] ?? fresh(r)])))
  }
  const last = useRef<{ key: string; at: number } | null>(null)

  const push = (cur: Room, next: Snap, keep: boolean): Room => ({
    ...cur, ...next,
    past: keep ? cur.past : [...cur.past.slice(-(LIMIT - 1)), snap(cur)], future: keep ? cur.future : [], rev: cur.rev + 1,
  })
  const setPending = useCallback((roomId: string, fn: (p: Pending) => Pending, opts: { coalesce?: string; history?: boolean } = {}) => {
    const t = performance.now()
    const fold = !!opts.coalesce && last.current?.key === `${roomId}:${opts.coalesce}` && t - last.current.at < COALESCE_MS
    last.current = opts.coalesce ? { key: `${roomId}:${opts.coalesce}`, at: t } : null
    setSt((prev) => {
      const cur = prev[roomId]; if (!cur) return prev
      const next = fn(cur.pending); if (next === cur.pending) return prev
      return { ...prev, [roomId]: push(cur, { pending: next, detection: cur.detection }, opts.history === false || fold) }
    })
  }, [])
  const setDetection = useCallback((roomId: string, fn: (d: Detection) => Detection, opts: { history?: boolean } = {}) => {
    last.current = null
    setSt((prev) => {
      const cur = prev[roomId]; if (!cur) return prev
      const d = fn(cur.detection); if (d === cur.detection) return prev
      return { ...prev, [roomId]: push(cur, { pending: cur.pending, detection: d }, opts.history === false) }
    })
  }, [])
  /** One step that changes both (a surface taken off the list drops its picks too). */
  const edit = useCallback((roomId: string, fns: { pending?: (p: Pending) => Pending; detection?: (d: Detection) => Detection }) => {
    last.current = null
    setSt((prev) => {
      const cur = prev[roomId]; if (!cur) return prev
      const pending = fns.pending ? fns.pending(cur.pending) : cur.pending, detection = fns.detection ? fns.detection(cur.detection) : cur.detection
      if (pending === cur.pending && detection === cur.detection) return prev
      return { ...prev, [roomId]: push(cur, { pending, detection }, false) }
    })
  }, [])
  const undo = useCallback((roomId: string) => {
    last.current = null
    setSt((prev) => { const cur = prev[roomId]; const p = cur?.past[cur.past.length - 1]; if (!cur || !p) return prev; return { ...prev, [roomId]: { ...cur, ...p, past: cur.past.slice(0, -1), future: [snap(cur), ...cur.future], rev: cur.rev + 1 } } })
  }, [])
  const redo = useCallback((roomId: string) => {
    last.current = null
    setSt((prev) => { const cur = prev[roomId]; const f = cur?.future[0]; if (!cur || !f) return prev; return { ...prev, [roomId]: { ...cur, ...f, past: [...cur.past, snap(cur)], future: cur.future.slice(1), rev: cur.rev + 1 } } })
  }, [])

  /* ── autosave ── */
  const stRef = useRef(st); useEffect(() => { stRef.current = st })
  const savedRef = useRef<Record<string, number>>({})
  const baseRef = useRef<Record<string, number>>({})
  const conflictRef = useRef<Record<string, true>>({})
  const inflight = useRef<Promise<boolean> | null>(null)
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alive = useRef(true)
  const flushRef = useRef<(via?: 'action' | 'keepalive') => Promise<boolean>>(() => Promise.resolve(true))
  /** (D9) The revision each room has on its way in a keepalive request — the page going away doesn't send it twice. */
  const sending = useRef<Record<string, number>>({})
  /** (D9) Sends a room's picks as a request that outlives the page (and its size); null when it is over `budget` — too big to go that
      way, the server action takes it. */
  const sendKept = (id: string, r: Room, budget = KEEPALIVE_MAX): { size: number; reply: Promise<SaveReply> } | null => {
    const b = beacon(id, r, baseRef.current[id] ?? r.base0)
    if (b.size > budget) return null
    sending.current[id] = r.rev
    return { size: b.size, reply: b.send().finally(() => { if (sending.current[id] === r.rev) delete sending.current[id] }) }
  }
  const dirtyIds = () => Object.keys(stRef.current).filter((id) => !conflictRef.current[id] && (stRef.current[id]?.rev ?? 0) > (savedRef.current[id] ?? 0))
  /** What a save's answer means for the room — the server action's and the keepalive route's are the same JSON. */
  const land = useCallback((id: string, rev: number, res: SaveReply): boolean => {
    if ('conflict' in res) { conflictRef.current[id] = true; setConflicts((c) => ({ ...c, [id]: true })); return true }
    if ('error' in res) {
      if (res.error === 'That room is gone.') { savedRef.current[id] = Math.max(savedRef.current[id] ?? 0, rev); dropDraft(id); return true }   // deleted elsewhere — nothing to keep
      return false
    }
    /* a save that lands late (a keepalive, a retry) never walks a room's revision back */
    baseRef.current[id] = Math.max(baseRef.current[id] ?? 0, res.stateRev)
    savedRef.current[id] = Math.max(savedRef.current[id] ?? 0, rev)
    dropDraft(id)
    if (res.addresses) {
      const a = res.addresses
      setSt((prev) => {
        const cur = prev[id]; if (!cur) return prev
        const pending = adoptIn(cur.pending, a); if (pending === cur.pending) return prev
        return { ...prev, [id]: { ...cur, pending, past: cur.past.map((s) => ({ ...s, pending: adoptIn(s.pending, a) })), future: cur.future.map((s) => ({ ...s, pending: adoptIn(s.pending, a) })) } }
      })
    }
    return true
  }, [])
  const run = useCallback(async (via: 'action' | 'keepalive' = 'action'): Promise<boolean> => {
    if (retry.current) { clearTimeout(retry.current); retry.current = null }
    if (!dirtyIds().length) return true
    setSave((s) => ({ ...s, saving: true }))
    let ok = true
    for (let pass = 0; pass < 4 && ok; pass++) {   // changes made while a save ran go in the next pass
      const ids = dirtyIds(); if (!ids.length) break
      for (const id of ids) {
        const r = stRef.current[id]; if (!r) continue
        const rev = r.rev
        if (via === 'keepalive' && sending.current[id] === rev) continue   // already on its way (the page went away first)
        try {
          const kept = via === 'keepalive' ? sendKept(id, r) : null
          const res: SaveReply = kept ? await kept.reply
            : await saveRoomState(id, { pending: r.pending, detection: r.detection, baseRev: baseRef.current[id] ?? r.base0 })
          if (!land(id, rev, res)) ok = false
        } catch { ok = false }
      }
    }
    setSavedRevs({ ...savedRef.current })
    setSave({ saving: false, at: ok ? Date.now() : null, error: !ok })
    if (!ok && alive.current) retry.current = setTimeout(() => { void flushRef.current() }, RETRY_MS)
    return ok
  }, [land])
  /** Save every room with unsaved work now — one save at a time; resolves false when a save failed (it retries on its own). */
  const flush = useCallback((via: 'action' | 'keepalive' = 'action'): Promise<boolean> => {
    const prev = inflight.current ?? Promise.resolve(true)
    const go = () => run(via)
    const next = prev.then(go, go)
    inflight.current = next
    void next.finally(() => { if (inflight.current === next) inflight.current = null })
    return next
  }, [run])
  useEffect(() => { flushRef.current = flush })
  const revs = Object.entries(st).map(([id, r]) => `${id}:${r.rev}`).join(',')
  useEffect(() => {
    if (!dirtyIds().length) return
    const t = setTimeout(() => { void flushRef.current() }, COALESCE_MS)
    return () => clearTimeout(t)
  }, [revs])
  /* leaving: the tab hidden, the page going away, the editor unmounting (Back, a link) — what waits is saved at once.
     (D9) Hidden: the next save in line goes as a keepalive request, and a draft is left in the tab. Going away (a reload, a closed tab):
     every waiting room is sent at once as a keepalive request (nothing after the unload runs), with its draft. Unmounting (the page stays
     alive): the usual save. */
  const drafts = () => {
    const at = Date.now()
    for (const id of dirtyIds()) {
      const r = stRef.current[id]; if (!r) continue
      const d: Draft = { baseRev: baseRef.current[id] ?? r.base0, pending: r.pending, detection: r.detection, at }
      try { sessionStorage.setItem(DRAFT + id, JSON.stringify(d)) } catch { /* private window, or full — the keepalive still goes */ }
    }
  }
  const leaveRef = useRef({ hidden: () => {}, gone: () => {} })
  useEffect(() => {
    leaveRef.current = {
      hidden: () => { drafts(); void flushRef.current('keepalive') },
      /* every waiting room at once (nothing after the unload runs) — but not one already on its way from `hidden` */
      gone: () => {
        drafts()
        let budget = KEEPALIVE_MAX   // the browser's allowance for keepalive bodies in flight, all rooms together
        for (const id of dirtyIds()) {
          const r = stRef.current[id]; if (!r || sending.current[id] === r.rev) continue
          const rev = r.rev, kept = sendKept(id, r, budget); if (!kept) continue
          budget -= kept.size
          void kept.reply.then((res) => { land(id, rev, res) }).catch(() => {})
        }
      },
    }
  })
  useEffect(() => {
    alive.current = true
    const gone = () => leaveRef.current.gone()
    const hidden = () => { if (document.visibilityState === 'hidden') leaveRef.current.hidden() }
    window.addEventListener('pagehide', gone)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', gone)
      document.removeEventListener('visibilitychange', hidden)
      alive.current = false
      if (retry.current) clearTimeout(retry.current)
      void flushRef.current()
    }
  }, [])
  /* (D9) A load that read a room before the last page's save landed: that page's draft (its revision is the one loaded, and it is fresh)
     is the room's picks — saved as usual. Any other draft is spent. Read once, after the first paint (sessionStorage is the browser's). */
  const [firstRooms] = useState(data.rooms)
  useEffect(() => {
    const t = setTimeout(() => {
      const now = Date.now()
      for (const room of firstRooms) {
        const d = readDraft(room.id); if (!d) continue
        dropDraft(room.id)
        if (now - d.at > DRAFT_MS || d.baseRev !== (room.stateRev ?? 0)) continue
        if (JSON.stringify(d.pending) === JSON.stringify(room.pending) && JSON.stringify(d.detection) === JSON.stringify(room.detection)) continue
        setSt((prev) => { const cur = prev[room.id]; if (!cur || cur.rev > 0) return prev; return { ...prev, [room.id]: { ...cur, pending: d.pending, detection: d.detection, rev: cur.rev + 1 } } })
      }
    }, 0)
    return () => clearTimeout(t)
  }, [firstRooms])

  /** A room the server just changed on its own (a new photo, its Undo): take its state as it is now — no history, nothing to save. */
  const reset = useCallback((roomId: string, next: Snap, stateRev: number) => {
    last.current = null
    baseRef.current[roomId] = stateRev
    setSt((prev) => {
      const cur = prev[roomId]; if (!cur) return prev
      const rev = cur.rev + 1
      savedRef.current[roomId] = rev
      return { ...prev, [roomId]: { ...cur, ...next, past: [], future: [], rev } }
    })
  }, [])

  const pendingOf = (id: string | null) => (id ? st[id]?.pending ?? null : null)
  const detectionOf = (id: string | null) => (id ? st[id]?.detection ?? null : null)
  const dirty = Object.entries(st).some(([id, r]) => !conflicts[id] && r.rev > (savedRevs[id] ?? 0))
  /** (F031) How deep a room's history is right now — read in a handler before a step, so its snackbar can take back exactly that step. */
  const stepNow = useCallback((id: string) => stRef.current[id]?.past.length ?? 0, [])
  /** A snackbar's Undo: takes the step back only while it is still the latest (a newer pick or a ⌘Z since leaves things as they are). */
  const undoStep = useCallback((roomId: string, before: number): boolean => {
    last.current = null
    const want = Math.min(LIMIT, before + 1)
    /* (round 2) whether the step is still the latest — the snackbar says so when it isn't, instead of doing nothing */
    const now = stRef.current[roomId]
    if (!now || now.past.length !== want) return false
    setSt((prev) => { const cur = prev[roomId]; const p = cur?.past[cur.past.length - 1]; if (!cur || !p || cur.past.length !== want) return prev; return { ...prev, [roomId]: { ...cur, ...p, past: cur.past.slice(0, -1), future: [snap(cur), ...cur.future], rev: cur.rev + 1 } } })
    return true
  }, [])
  return {
    rooms, setRooms, versions, setVersions, pendingOf, detectionOf, setPending, setDetection, edit, undo, redo, reset, flush, stepNow, undoStep,
    canUndo: (id: string | null) => !!id && (st[id]?.past.length ?? 0) > 0, canRedo: (id: string | null) => !!id && (st[id]?.future.length ?? 0) > 0,
    save, dirty, conflict: (id: string | null) => !!id && !!conflicts[id], anyConflict: Object.keys(conflicts).length > 0,
  }
}
